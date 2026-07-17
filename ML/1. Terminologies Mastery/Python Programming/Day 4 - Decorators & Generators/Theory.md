# Day 4 — Decorators & Generators

---

## ⓪ Functions are values — the foundation both topics stand on

Before decorators or generators make sense, one fact from Day 3 needs to be made explicit, because both of today's topics lean on it hard: **in Python, a function is just a value, like a number or a string.** You already brushed against this when passing `len` (with no parentheses) into `sorted(key=len)` — that worked precisely because `len` itself, unparenthesized, is a value you can hand to something else.

```python
def greet():
    return "hello"

x = greet        # NO parentheses — x now holds the FUNCTION ITSELF, not its result
print(x)          # <function greet at 0x...>  — it's a function object
print(x())        # "hello"  — NOW you're calling it

y = greet()       # WITH parentheses — y holds the RESULT of calling it
print(y)          # "hello"
```

Since functions are values, they can also be:
- **passed as arguments into other functions** (you already did this: `sorted(words, key=len)`)
- **returned from other functions** (new today — this is the mechanism decorators use)
- **defined inside other functions** (also new — a function can contain a `def` for another function)

```python
def outer():
    def inner():
        return "I'm defined inside outer"
    return inner       # returning the FUNCTION itself, not calling it (no parentheses)

my_func = outer()      # my_func now holds `inner`, the function object
print(my_func())        # "I'm defined inside outer"  — call it separately, afterward
```

This pattern — a function defined inside another function, then returned — has no common name of its own yet at this point, but it's the exact mechanism decorators are built from. Hold onto this example; the next section reuses this exact "function returns a function" pattern to build the decorator mechanism.

---

## ① Decorators — a function that wraps another function

**The problem decorators solve:** imagine you want to log every time several different functions are called, or time how long they take, or check a user is logged in before letting a function run — without rewriting that same logging/timing/checking code inside every single function. A **decorator** is a function that takes another function as input, and returns a *new* function that adds behavior around the original, without modifying the original function's own code at all.

**Building it up from the earlier `outer`/`inner` pattern — a function defined inside another function and then returned — one small step at a time:**

```python
def my_decorator(func):          # takes a FUNCTION as its argument (a function is just a value, like a number or string, that can be passed around)
    def wrapper():                 # a new function, defined INSIDE my_decorator
        print("Before the function runs")
        func()                     # call the ORIGINAL function, passed in as `func`
        print("After the function runs")
    return wrapper                 # return the new function itself (not calling it)

def say_hello():
    print("Hello!")

decorated = my_decorator(say_hello)   # manually wrap say_hello
decorated()
# Before the function runs
# Hello!
# After the function runs
```

Walk through what actually happened: `my_decorator(say_hello)` passed the `say_hello` function object in as `func`. Inside, a brand-new function `wrapper` was defined, which calls `func()` (the original) sandwiched between two `print()` statements. `my_decorator` then returned `wrapper` itself — so `decorated` now holds this new wrapping function, not the original `say_hello`. Calling `decorated()` runs the wrapper's full body: print, then the original function, then print again.

**The `@` syntax is just shorthand for exactly the manual wrapping above** — Python calls this "decorator syntax," and it's purely sugar for the `decorated = my_decorator(say_hello)` line:

```python
@my_decorator
def say_hello():
    print("Hello!")

say_hello()
# Before the function runs
# Hello!
# After the function runs
```

```
@my_decorator
def say_hello():           is EXACTLY equivalent to:      def say_hello():
    print("Hello!")                                            print("Hello!")
                                                            say_hello = my_decorator(say_hello)
```

The name `say_hello` now points at the wrapper, permanently — every future call to `say_hello()` runs the decorated version. This is a real, common trap worth naming explicitly: **after decoration, the original undecorated function is gone (unreachable) unless you saved a separate reference to it** — `say_hello` has been reassigned to the wrapper, same as any other name reassignment — in Python, assignment just re-points a name to a different object, it doesn't overwrite anything in place.

**Decorating a function that takes arguments** — the wrapper needs to accept and forward them, which is exactly what `*args`/`**kwargs` are for: `*args` gathers any number of extra positional arguments into a tuple, and `**kwargs` gathers any number of extra keyword arguments into a dict.

```python
def my_decorator(func):
    def wrapper(*args, **kwargs):      # accept ANYTHING the original function might need
        print(f"Calling {func.__name__} with {args}, {kwargs}")
        result = func(*args, **kwargs)  # forward everything through to the original
        print(f"{func.__name__} returned {result}")
        return result                    # don't swallow the original return value
    return wrapper

@my_decorator
def add(a, b):
    return a + b

print(add(3, 4))
# Calling add with (3, 4), {}
# add returned 7
# 7
```

`func.__name__` is a built-in attribute every function object has, holding its own name as a string — useful here for a generic logging message that works no matter which function gets decorated. `func(*args, **kwargs)` unpacks the tuple/dict back out into individual positional/keyword arguments when calling the original — the mirror image of how `*args`/`**kwargs` gathered them in Day 3.

**A named real-world use case, so this isn't abstract:** Python's standard library ships a decorator, `functools.lru_cache`, that automatically remembers a function's past results and skips recomputing them for repeated inputs — genuinely useful for expensive functions (e.g. a slow database call, or a recursive computation) called repeatedly with the same arguments:

```python
from functools import lru_cache

@lru_cache
def slow_square(n):
    print(f"computing square of {n}")
    return n * n

print(slow_square(4))   # computing square of 4  → 16
print(slow_square(4))   # (nothing printed — cached!) → 16
```

The second call didn't print "computing," because `lru_cache`'s wrapper checked its internal cache first and returned the stored result instead of calling the real `slow_square` body again — exactly the "add behavior around a function without changing its code" idea from the top of this section, just written for you already in the standard library.

---

## ② Generators — a function that pauses instead of finishing

**The problem generators solve:** imagine a function that needs to produce a long sequence of values — say, the first million square numbers. Building the whole list upfront (`[n**2 for n in range(1_000_000)]`, Day 2's list comprehension) computes and stores *all* million values in memory immediately, even if the caller only ever needs the first three before deciding to stop. A **generator** is a function that produces values **one at a time, on demand**, pausing itself in between — this is precisely the mechanism behind the generator *expressions* `(x for x in ...)` you already used with `any()`/`all()` on Day 2; a generator *function* is the same idea, written as a full function instead of one compact expression.

**The keyword that makes a function a generator: `yield`, instead of `return`.**

```python
def count_up_to(n):
    i = 1
    while i <= n:
        yield i        # PAUSE here, hand back i, remember exactly where we stopped
        i += 1

gen = count_up_to(3)
print(gen)              # <generator object count_up_to at 0x...>  — NOT the values yet
```

Calling `count_up_to(3)` does **not** run the function body at all yet — it immediately returns a generator object, a paused, not-yet-started version of the function. This matches exactly what you saw with generator expressions on Day 2 (`print(result)` showed `<generator object ...>`, not values) — same underlying mechanism, now written as a full function.

**Pulling values out — each call to `next()` resumes the function from exactly where it last paused:**

```python
gen = count_up_to(3)
print(next(gen))     # 1  — runs until the FIRST yield, pauses there
print(next(gen))     # 2  — RESUMES right after that yield, runs to the SECOND yield, pauses
print(next(gen))     # 3  — resumes again, hits the third yield, pauses
print(next(gen))     # StopIteration error — the while loop condition is now False, function actually ends
```

```
count_up_to(3) called
        │
        ▼
  i = 1 (runs once, at the very start)
        │
        ▼
  while i <= n:  ──── i=1: True ──► yield i (=1) ──► PAUSE, return 1 to caller
        │                                                    │
        │                                            next(gen) called again
        │                                                    ▼
        │                                          RESUME here: i += 1  (i=2)
        │                                                    │
        ▼                                                    ▼
  while i <= n:  ──── i=2: True ──► yield i (=2) ──► PAUSE, return 2 to caller
        │                                                    │
       ... (repeats) ...
        │
  while i <= n:  ──── i=4: False ──► loop ends, function
                                       actually finishes
                                     ──► StopIteration raised
```

**This is the core mechanical difference from `return`:** a normal function's local variables (`i`, in this case) are destroyed the instant it hits `return` or finishes — the function's state is gone. A generator function, when it hits `yield`, **freezes its entire local state in place** (every local variable, exactly where execution stopped) and hands control back to whoever called `next()` — then, on the *next* call to `next()`, resumes from that exact frozen point, with `i` still holding whatever value it had. Nothing is recomputed from scratch; the function truly picks up mid-execution.

**In practice, you almost never call `next()` manually — a `for` loop does it automatically, and knows to stop cleanly on `StopIteration` without raising an error to you:**

```python
for value in count_up_to(3):
    print(value)
# 1
# 2
# 3
```

This is exactly the same relationship a `for` loop already has with `range()`, `list`, `dict`, and every other iterable you've used since Day 2 — `for` always works by repeatedly asking "give me the next value" until it's told there are no more, and a generator is simply a function-shaped way of defining that "next value" logic yourself. (The full formal mechanism behind *how* `for` does this asking — the general iterator protocol, `__iter__`/`__next__` — is deliberately deferred to Day 13, per this track's Day 0/13 split; everything above is the complete, correct mechanism for generators specifically, just without yet naming the underlying protocol every iterable shares.)

**The concrete payoff — memory, made tangible:**

```python
# Eager (Day 2 list comprehension) — ALL million values computed and stored NOW
squares_list = [n**2 for n in range(1_000_000)]

# Lazy (generator function) — NOTHING computed until asked, one value at a time
def squares_gen(limit):
    n = 0
    while n < limit:
        yield n**2
        n += 1

squares = squares_gen(1_000_000)
print(next(squares))    # 0 — computed just this ONE value, nothing else yet
print(next(squares))    # 1 — computed just this next one
```

If you only ever need the first few values (e.g. checking a condition and stopping early, same idea as `any()`/`all()` short-circuiting on Day 2), the generator version never does the wasted work of computing the remaining 999,998 values — the list comprehension version already did all million before you got to look at even one.

**A generator, like a generator expression, can only be walked through once.** Once a `for` loop or repeated `next()` calls have exhausted it (reached the point where the function body actually finishes), asking for another value raises `StopIteration` every time — there's no reset. If you need the values again, you must call the generator function again to get a brand-new generator object.

---

## Summary

```
⓪ Functions are VALUES in Python — assignable, passable, returnable,
   definable-inside-other-functions, all without calling them (no
   parentheses = the function itself; with parentheses = its result).
   Both decorators and generators are built directly on this fact.

① A decorator = a function that takes a function in, defines a new
   wrapper function around it (often accepting *args/**kwargs to
   forward any arguments), and returns that wrapper. @my_decorator
   above a def is pure syntax sugar for
   `name = my_decorator(name)` — the original function name now
   points at the wrapper permanently. func.__name__ gives a
   function's own name as a string. functools.lru_cache is a
   real standard-library decorator that auto-caches results.

② A generator = a function using `yield` instead of `return`.
   Calling it does NOT run the body — it returns a paused generator
   object immediately. Each next(gen) call resumes execution from
   exactly where it last paused, with all local variables intact,
   runs until the next yield (or the function actually ends, which
   raises StopIteration). A for loop calls next() automatically and
   stops cleanly on StopIteration. Payoff: values are computed ONE
   AT A TIME, on demand — never build/store a huge sequence upfront
   the way a list comprehension does. Like a generator expression
   (Day 2), a generator can only be consumed once.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 5 (Exception Handling, File I/O & JSON).*
