# Day 1 — Variables & Data Types

## ⓪ What a variable actually is, underneath the syntax

In JS, `let x = 5;` creates a named box that holds a value, and you already have solid intuition for this. Python's version, `x = 5`, looks almost identical but works on a subtly different model underneath — and that difference explains several things that'll otherwise look like arbitrary rules later (why `None` behaves the way it does, why two variables can "share" a list unexpectedly, why there's no `let`/`const`/`var` distinction at all).

**In JS:** a variable is a labeled storage slot. `let x = 5; x = "hello";` reuses the same slot, now holding a different kind of value.

**In Python:** a variable is a **name that points at an object sitting elsewhere in memory** — Python calls this "binding a name to an object." `x = 5` doesn't put `5` inside a box named `x`; it creates the integer object `5` somewhere, and makes the name `x` point to it. `x = "hello"` doesn't overwrite anything in place — it creates a brand new string object `"hello"` and re-points `x` to that instead, leaving the old `5` object to be garbage-collected if nothing else points to it.

```
JS mental model:              Python mental model:

  x  ┌───────┐                  x ──────► [ 5 ]   (an object living
     │   5   │                              in memory, name x
     └───────┘                              points to it)

  x = "hello"                   x = "hello"
     ┌───────┐
  x  │"hello"│                  x ──────► ["hello"]   (a NEW object;
     └───────┘                              the old 5 object is now
  (same box,                                unreferenced, eventually
   new content)                             cleaned up)
```

This "name points to an object" model is why Python has **no `let`, `const`, or `var` keyword at all** — you never declare a variable's existence separately from giving it a value. `x = 5` both creates the name and points it, in one step, always.

**A precise note on scope, since it's easy to overstate:** Python does still have scope — just not the *block* scope JS's `let`/`const` introduced. An `if`/`for`/`while` body in Python does **not** create a new scope the way a JS `{ }` with `let`/`const` does:

```python
if True:
    x = 5
print(x)   # 5 — works. A name assigned inside if/for/while leaks out to
           #     the surrounding function or script — no block scope.
```

```javascript
if (true) {
  let x = 5;
}
console.log(x);   // ReferenceError — JS's let/const ARE block-scoped
```

What Python *does* have is **function scope** (matching JS's `var` behavior, and full depth comes in Day 3, Functions): a name assigned inside a `def` is invisible outside that function, same as JS. So the accurate rule is: a name assigned anywhere at the top level of a script (including inside its `if`/`for`/`while` blocks) is visible for the rest of that script; a name assigned inside a function is visible only inside that function — never "block" in the JS `let`/`const` sense.

---

## ① Every value has a type, and Python tells you with `type()`

Just like JS distinguishes `number`, `string`, `boolean`, etc., Python distinguishes types too — but the actual type *names* differ, and there are more built-in numeric distinctions than JS has. Python's core built-in types for Day 1:

| Category | Python type | Example | JS equivalent |
|---|---|---|---|
| Whole numbers | `int` | `x = 5` | `number` (JS has ONE numeric type for everything) |
| Decimal numbers | `float` | `x = 5.0` | `number` (same type as above in JS) |
| Text | `str` | `x = "hello"` | `string` |
| True/false | `bool` | `x = True` | `boolean` |
| "Nothing"/absence | `None` | `x = None` | `null` (closest match — Python has no separate `undefined`; an unassigned name simply doesn't exist and raises `NameError`) |

You can always ask Python what type a value currently is with the built-in `type()` function:

```python
x = 5
print(type(x))        # <class 'int'>
x = "hello"
print(type(x))        # <class 'str'>
```

This is Python's version of JS's `typeof x` — same purpose (ask the runtime what kind of value this is right now), different function name and different output format (`type()` returns the actual type object, `typeof` returns a string like `"number"`).

---

## ② `int` vs `float` — a real split that doesn't exist in JS

This is the biggest concrete difference in Day 1's material. **JS has exactly one numeric type**, `number`, for both `5` and `5.5` — no distinction at the language level. **Python has two separate, distinct types**: `int` (whole numbers, no decimal point, unlimited size — Python `int`s don't overflow the way many languages' fixed-size integers do) and `float` (decimal numbers, using the same IEEE 754 floating-point representation JS uses under the hood for all its numbers).

```python
x = 5        # int   — no decimal point anywhere in the literal
y = 5.0      # float — decimal point present, even though the value is "whole"
z = 5 / 2    # 2.5   — float — division (/) ALWAYS produces a float in Python 3
w = 5 // 2   # 2     — int   — // is FLOOR DIVISION, a separate operator, rounds down
```

**Why this matters concretely, and where it trips people up coming from JS:** in JS, `5 / 2` gives you `2.5` and that's the only division operator you have. Python has **two division operators**: `/` (true division, always returns a `float`, e.g. `5 / 2` → `2.5`) and `//` (floor division, returns the largest whole number ≤ the result, e.g. `5 // 2` → `2`, and `-5 // 2` → `-3`, not `-2` — it rounds *down* toward negative infinity, not toward zero). There is no `//` in JS at all; you'd have had to write `Math.floor(5 / 2)` to get the same effect.

Mixing an `int` and a `float` in one expression (e.g. `5 + 2.0`) automatically produces a `float` — Python "promotes" the result to whichever type can represent both values without losing information, same general idea as JS's automatic numeric coercion, just constrained to two numeric types instead of one.

---

## ③ `None` vs JS's `null` *and* `undefined` — Python collapses two concepts into one

JS has two distinct "nothing" values: `null` (deliberately set to "no value" by code) and `undefined` (a variable that was declared but never assigned, or a missing object property). Python has exactly **one**: `None`.

```python
x = None       # explicitly "no value" — the ONLY way to represent absence
print(type(x)) # <class 'NoneType'>
```

There is no Python equivalent of "a variable exists but was never given a value" the way `undefined` describes that state in JS — in Python, a name simply **does not exist at all** until you assign it something (referencing it before that raises a `NameError`, not a special "undefined" value). So the JS three-way distinction (`null` vs `undefined` vs "exists and has a real value") becomes a two-way distinction in Python (`None` vs "exists and has a real value") — one less state to track, and `None` is the single, deliberate way to represent "nothing here."

`None` is falsy in boolean contexts (`if x:` treats `None` the same as `False`), matching how both `null` and `undefined` are falsy in JS's `if` checks.

---

## ④ `bool` — mostly identical to JS, one capitalization difference to burn into memory

Python's boolean type is `bool`, with exactly two values: `True` and `False` — **capitalized**, unlike JS's lowercase `true`/`false`. This trips up almost everyone coming from JS at least once; Python will raise a `NameError` if you write lowercase `true`, because at that point Python thinks you're referring to an undefined variable named `true`, not the boolean literal.

```python
x = True        # correct
y = true        # NameError: name 'true' is not defined
```

Comparison operators (`==`, `!=`, `<`, `>`, `<=`, `>=`) all work the same as JS and produce a `bool`. One real difference: **Python has no `===` (strict equality) at all** — just one `==`. This isn't a gap, it's because Python doesn't have JS's implicit type-coercion problem that `===` exists to avoid: `==` in Python compares value AND type together already, in the one operator (`5 == "5"` is `False` in Python — a number is never automatically compared-equal to a string the way loose `==` sometimes coerces in JS). So Python never needed a second, "stricter" operator — the single `==` already behaves the way you'd reach for `===` in JS.

---

## ⑤ `str` — declared with either quote style, and one real formatting difference from JS template literals

Python strings (`str`) can use single quotes or double quotes completely interchangeably — `'hello'` and `"hello"` are identical, no semantic difference (unlike some other languages). Pick whichever avoids escaping the string's own contents (e.g. use double quotes if the string itself contains an apostrophe).

**JS's template literals (`` `Hello, ${name}!` ``)** have a direct Python equivalent, called an **f-string** (formatted string literal) — prefix the string with `f` and use single curly braces (not `${}`, just `{}`):

```python
name = "Varun"
age = 30

# f-string — Python's version of a JS template literal
greeting = f"Hello, {name}! You are {age} years old."
print(greeting)   # Hello, Varun! You are 30 years old.
```

f-strings are the modern standard (Python 3.6+) — older Python code sometimes uses `.format()` or `%`-style formatting instead, but you don't need those for Day 1; f-strings are the direct, idiomatic replacement for what you already know as template literals.

---

## ⑥ Type checking — Python is dynamically typed, same as JS, with one real difference: no implicit coercion in arithmetic/concatenation

Both JS and Python are **dynamically typed** — a variable's type isn't fixed at declaration, and it can be reassigned to hold a completely different type later:

```python
x = 5          # x is currently an int
x = "hello"    # now x is a str — completely legal, same as JS's `let x = 5; x = "hello";`
```

Where Python diverges sharply from JS: **Python does not implicitly coerce types in most operations** — this is the single biggest "gotcha" difference for Day 1. JS will happily do `"5" + 3` and give you `"53"` (coercing the number into a string). Python raises a hard error instead:

```python
print("5" + 3)      # TypeError: can only concatenate str (not "int") to str
```

You must explicitly convert first, using Python's built-in conversion functions — `str()`, `int()`, `float()`, `bool()`:

```python
print("5" + str(3))     # "53"   — explicit conversion, now it's valid
print(int("5") + 3)     # 8      — converted the other direction instead
```

This is a deliberate Python design philosophy, often summarized as "explicit is better than implicit" (it's literally a line from `The Zen of Python`, a built-in set of design principles you can read by typing `import this` into a Python prompt) — Python's designers considered JS-style silent coercion (`"5" + 3` silently becoming `"53"`) a common source of hard-to-spot bugs, and chose to force you to state your intent explicitly instead.

---

## Summary

```
⓪ Variable = a NAME bound to an object elsewhere in memory, not a
   labeled box holding a value in place. No let/const/var — assignment
   both creates and points the name, always, in one step.

① Every value has a type; type() is Python's typeof. Core Day 1
   types: int, float, str, bool, None.

② int vs float is a REAL split (unlike JS's one `number` type).
   / always returns float (true division); // is floor division
   (rounds toward negative infinity) — JS has no // at all.

③ None collapses JS's null AND undefined into one concept — Python
   has no "declared but unassigned" state; an unassigned name simply
   doesn't exist yet (NameError if referenced).

④ bool = True/False, CAPITALIZED (lowercase true/false → NameError).
   No === in Python — plain == already compares value AND type, so
   there was never a need for a stricter second operator.

⑤ str: single or double quotes, interchangeable. f"{name}" is
   Python's direct equivalent of a JS template literal `${name}`.

⑥ Dynamically typed, same as JS — BUT no implicit coercion in
   arithmetic/concatenation ("5" + 3 is a TypeError, not "53").
   Convert explicitly with str()/int()/float()/bool().
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 2 (Data Structures, Slicing & Indexing, Comprehensions).*
