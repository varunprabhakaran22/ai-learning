# Day 1 Theory — Syntax, Variables, Types & the Interpreter Model

## ⓪ The problem this solves
You already know how to program (JS). This day isn't teaching you "how to code" — it's teaching you Python's specific *rules of the road*, so you stop mistranslating JS habits into broken or misleading Python. Most Day-1 mistakes for JS developers aren't "I don't understand loops" — they're "I assumed Python works like JS in a place where it quietly doesn't."

## ① How Python actually runs
When you run `python3 script.py`, there's no separate compile step you invoke yourself (no `tsc`, no bundler). The Python interpreter reads your file top to bottom and executes each statement immediately as it reaches it — this is why a syntax error later in a file can still let earlier `print()` statements run in some tools, but in a plain script, Python actually parses the *whole file* into bytecode first, then executes — so a syntax error anywhere in the file prevents any of it from running. (Contrast: a runtime error, like dividing by zero, only stops execution when that line is actually reached — everything before it has already run and printed.)

There is a compiled artifact — Python compiles your `.py` file to bytecode (`.pyc`, cached in a `__pycache__` folder) and the bytecode is what actually runs on the Python Virtual Machine (PVM). You never invoke this step; it happens automatically and transparently.

## ② Indentation is syntax, not style
In JS, `{ }` marks a block; whitespace is cosmetic. In Python, **indentation itself is the block delimiter** — there are no braces. This line:
```python
if x > 0:
    print("positive")
```
The colon `:` opens a block, and the indented lines under it (by convention, 4 spaces) *are* the block — remove the indentation and it's a different program, not just ugly formatting. Mixing tabs and spaces, or indenting inconsistently within the same block, is a `IndentationError` — Python refuses to guess what you meant.

## ③ Variables: names, not typed boxes
`x = 5` doesn't create "a box called x that holds integers." It creates the integer object `5` somewhere in memory, and makes the name `x` point to it. `x = "hello"` afterward doesn't convert anything — it just repoints `x` to a different object (a string). This is why Python is called **dynamically typed**: a variable name has no fixed type, only whatever object it currently points to has a type.

This part is actually the *same* mental model as JS (`let x = 5; x = "hello"` works too — JS is also dynamically typed). The real difference from JS is elsewhere: Python has **no `var`/`let`/`const`** — you never declare a variable before assigning it, and there's no block-scoping keyword. Assigning `x = 5` inside an `if` block makes `x` visible *after* the block too, in the same function — Python's scoping is function-level, not block-level like JS's `let`.

## ④ Core built-in types
| Type | Example | Notes |
|---|---|---|
| `int` | `5`, `-3` | No separate "integer overflow" — Python ints grow arbitrarily large automatically |
| `float` | `3.14` | Same IEEE-754 double-precision float as JS numbers |
| `str` | `"hi"` or `'hi'` | Both quote styles are equivalent — no functional difference |
| `bool` | `True`, `False` | Capitalized — not `true`/`false` like JS |
| `NoneType` | `None` | Python's `null`/`undefined` equivalent — there is only one "nothing" value, not two |

Check a value's actual type at any time with `type(x)` — this returns the type object itself (e.g. `<class 'int'>`), which is how you'd confirm at runtime what a variable currently points to, since the name itself carries no type information.

## ⑤ Operators that differ from JS
- `**` is exponentiation (`2 ** 3` is `8`) — JS uses the same `**`, so this one matches.
- `//` is **floor division** — `7 // 2` is `3`, not `3.5`. Regular `/` always returns a `float` in Python 3, even `4 / 2` gives `2.0`.
- `%` is modulo, same as JS.
- `==` compares value equality (like JS's `==`, not `===`) — but Python has no separate strict-equality operator, because Python doesn't do JS-style implicit type coercion during comparison. `1 == "1"` is `False` in Python (JS's `==` would coerce and say `True`).
- Boolean operators are spelled out as words: `and`, `or`, `not` — not `&&`, `||`, `!`.

## ⑥ `print()` and `input()`
`print()` is a function call (always with parentheses) — Python 2 had `print` as a statement without parentheses, but that's dead; every version you'll use is Python 3. `input("prompt: ")` pauses execution, shows the prompt, and returns **whatever the user typed, always as a `str`** — even if they type `5`, you get the string `"5"`, not the int `5`. Converting it (`int(input(...))`) is a separate, explicit step — Python never auto-detects "this looks like a number" for you.
