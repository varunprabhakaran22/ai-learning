# Day 13 — Iterators, Context Managers & Lint/Format Tooling

---

## ⓪ Two deliberately deferred gaps, finally closed

Two earlier days named a mechanism, explained enough to use it correctly, and explicitly deferred the full explanation to this day: **Day 4 (Generators)** noted that `for` repeatedly asking "give me the next value" is the general iterator protocol, without naming how that protocol actually works underneath a generator specifically. **Day 5 (File I/O)** noted that `with` relies on a general mechanism (`__enter__`/`__exit__`) that any object can implement, without showing what that mechanism actually looks like. Both gaps close here, plus a third, independent topic (lint/format tooling) grouped in for the same "everyday surrounding tooling" reason Days 7 and 10 grouped multiple topics together.

---

## ① The iterator protocol — what `for` is actually doing, every single time

Every `for item in x:` you've ever written — over a `list`, a `dict`, a `range()`, a file object (Day 5), a generator (Day 4) — works because of exactly **one shared mechanism** underneath, regardless of which of those types `x` is. This section names it precisely.

**Two separate concepts, easy to conflate, worth pulling apart first:**
- **Iterable** — anything you're *allowed* to write `for item in x:` over at all (a `list`, `dict`, `range`, file object, generator — all iterable).
- **Iterator** — the actual object doing the work of producing "the next value, then the next, then the next," one at a time, tracking its own position internally.

**An iterable is not itself the iterator — it *produces* one, via a built-in function, `iter()`:**
```python
numbers = [10, 20, 30]      # numbers is an ITERABLE — you can loop over it
it = iter(numbers)            # iter() asks it to PRODUCE an ITERATOR — a separate object
print(it)                      # <list_iterator object at 0x...>  — a genuinely different object from `numbers`
```

**The iterator itself is driven by a second built-in function, `next()`** (you already used this exact function directly on generators, Day 4, ②) **— calling it repeatedly is the entire mechanism a `for` loop is built on:**
```python
print(next(it))     # 10
print(next(it))     # 20
print(next(it))     # 30
print(next(it))     # StopIteration — no more items, raises the SAME exception generators raised in Day 4
```

**This is exactly what `for item in numbers:` does automatically, behind the scenes, every single time:**
```
for item in numbers:              is EXACTLY equivalent to:
    print(item)

                                   it = iter(numbers)
                                   while True:
                                       try:
                                           item = next(it)
                                       except StopIteration:
                                           break
                                       print(item)
```

**Why a generator (Day 4) "just works" with `for`, without you ever calling `iter()` on it yourself:** calling a generator function immediately returns an object that already **is** an iterator (it already knows how to respond to `next()` calls, pausing/resuming exactly as Day 4 described) — so `iter()` on a generator just hands back the generator itself, unchanged. This is the precise mechanical answer to Day 4's deferred question: a generator function is simply the most convenient way to *write* an iterator, without manually building the two special methods below yourself.

**The actual two methods any object needs to define, to be iterable/an iterator itself — the real mechanism `iter()`/`next()` are calling under the hood:**
```python
class CountUpTo:
    def __init__(self, limit):
        self.limit = limit
        self.current = 0

    def __iter__(self):        # called by iter(obj) — must return AN ITERATOR (often just `self`)
        return self

    def __next__(self):         # called by next(obj) — produce the NEXT value, or raise StopIteration
        if self.current >= self.limit:
            raise StopIteration
        self.current += 1
        return self.current

counter = CountUpTo(3)
for n in counter:
    print(n)     # 1, 2, 3
```

`__iter__` and `__next__` are **magic methods** (Day 6's naming for double-underscore methods Python calls automatically — `__init__` was the first one you met) — defining both on a class is what makes `iter()`/`next()`/`for` all work on instances of it, exactly the same contract every built-in iterable (`list`, `dict`, `range`, a file object) already satisfies internally. A Day 4 generator function is a shortcut that writes an equivalent `__iter__`/`__next__` pair *for you*, automatically, just by using `yield` — this class-based version is the same mechanism, written out explicitly and manually instead.

---

## ② Context managers — what `with` is actually doing, `__enter__`/`__exit__`

Day 5 ④ established that `with open(...) as f:` guarantees the file closes, exception or not, and named `__enter__`/`__exit__` without showing them. Here's the actual mechanism, directly parallel to ①'s structure — two magic methods define the contract, and `with` is just automated calling of them.

```python
class Timer:
    def __enter__(self):                 # called at the START of the `with` block
        print("Starting timer")
        return self                        # this return value becomes whatever `as x` binds to

    def __exit__(self, exc_type, exc_value, traceback):    # called at the END, ALWAYS
        print("Stopping timer")
        return False                        # False = don't suppress any exception that occurred

with Timer() as t:
    print("Doing work")
# Starting timer
# Doing work
# Stopping timer
```

```
with Timer() as t:              is EXACTLY equivalent to:
    print("Doing work")

                                 t = Timer()
                                 t.__enter__()
                                 try:
                                     print("Doing work")
                                 finally:               <- Day 5's finally, automated
                                     t.__exit__(...)
```

**This is precisely what makes Day 5's file-closing guarantee true, now made explicit:** a file object's `__exit__` method calls `.close()` internally — and since `with` always calls `__exit__` inside an implicit `finally` (per the diagram above), the file closes no matter what happens inside the block, exception or not. Nothing magical was happening in Day 5 — it was always this exact `__enter__`/`try`/`finally`/`__exit__` pattern, just hidden behind `with`'s syntax.

**The three parameters `__exit__` always receives** (`exc_type`, `exc_value`, `traceback`) describe whatever exception occurred inside the `with` block, if any — all three are `None` if the block finished with no exception at all. Returning `True` from `__exit__` tells Python "I've handled this exception, don't propagate it further" (suppressing it); returning `False` (or nothing, which defaults to `None`/falsy) lets any exception continue on normally after cleanup runs — the file example above returns `False`, meaning a `with open(...) as f:` block that hits an exception still closes the file, but the exception itself still surfaces to you afterward, exactly as Day 5 described.

**A shortcut worth knowing exists, without needing full depth here:** the standard library's `contextlib.contextmanager` decorator (Day 4's decorator mechanism, reused again) lets you write a context manager as a single generator function (using `yield` once, Day 4's ②) instead of a full class with two magic methods — the same "there's a class-based way and a simpler generator/decorator-based shortcut" relationship ①'s generators had to manually-written `__iter__`/`__next__`.

---

## ③ Lint and format tooling — automated code-quality checks, alongside Day 7's Git workflow

**The problem:** style inconsistencies (mixed quote styles, inconsistent spacing, unused imports left behind) and a class of real bugs (a variable used before assignment, an unreachable branch) are both things a human reviewer *could* catch by reading carefully — but automated tools catch them faster, more consistently, and before a human ever needs to look. Three distinct, commonly-paired tools, each with a different job:

**`black` — a formatter.** It doesn't check your style, it **rewrites your code** to match one fixed, opinionated style automatically — matching JS's Prettier almost exactly in philosophy (no configuration debates; one standard, uniformly applied):
```bash
black my_script.py
```
Running this actually edits the file in place, fixing spacing/quote-style/line-length inconsistencies — you don't fix these by hand, you let `black` do it, every time.

**`ruff` (or the older `flake8`) — a linter.** It scans your code and **reports problems without changing anything** — unused imports, undefined variables, unreachable code, style violations you'd want a human to consciously decide on rather than have auto-rewritten:
```bash
ruff check my_script.py
# my_script.py:3:8: F401 'os' imported but unused
```
`ruff` is the modern, much faster choice (written in Rust) that's rapidly become the standard replacement for the older `flake8` in real projects — worth recognizing both names, since you'll encounter either in existing codebases.

**`mypy` — the type checker previewed in Day 11, ②.** Scans your code against its type hints and reports mismatches — a third, independent category of check (types), separate from both formatting and general linting.

**How these fit together in a real project, tying directly to Day 7's Git workflow:** it's standard practice to run `black`/`ruff`/`mypy` **before** committing (Day 7 ④), often automated via a **pre-commit hook** — a script Git runs automatically right before a commit is finalized, which can block the commit entirely if linting/formatting fails. This is the concrete mechanism that keeps an entire team's codebase consistently styled and free of a whole category of careless mistakes, without relying on every single person remembering to run these tools manually every time.

---

## Summary

```
⓪ Two gaps deliberately deferred from earlier days, closed here:
   Day 4's "for calls next() automatically" and Day 5's "with relies
   on a general mechanism" both get their full mechanism explained.
   Lint/format tooling is a third, independent topic grouped in.

① Iterable (can be looped over) vs iterator (the object actually
   producing values one at a time) are different things — iter(x)
   turns an iterable into an iterator; next(it) pulls one value,
   raising StopIteration when exhausted. `for` is EXACTLY this loop,
   automated: iter() once, next() repeatedly, catch StopIteration to
   stop. Any class becomes iterable/an iterator by defining __iter__
   (returns an iterator, often self) and __next__ (returns the next
   value or raises StopIteration) — a Day 4 generator function is a
   shortcut that writes this exact pair for you automatically, via
   yield, instead of you writing the two magic methods by hand.

② with OBJ as x: calls OBJ.__enter__() at the start (its return
   value becomes x), and is ALWAYS guaranteed to call OBJ.__exit__()
   at the end — success or exception — because `with` wraps the block
   in an implicit try/finally (Day 5's finally, automated). This is
   precisely why with open(...) as f: always closes the file: its
   __exit__ calls .close() internally. __exit__ returning True
   suppresses an exception; False/None lets it propagate normally.
   contextlib.contextmanager offers a generator-based shortcut,
   parallel to how Day 4's yield shortcuts manual __iter__/__next__.

③ black = a FORMATTER — rewrites code to one fixed style automatically
   (like Prettier). ruff (modern) / flake8 (older) = a LINTER —
   reports problems (unused imports, undefined names) without
   changing code. mypy (Day 11) = type-mismatch checking. Real
   projects run these before committing (Day 7), often via a
   pre-commit hook that can block a commit if checks fail.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 14 (`asyncio` / async-await in Depth).*
