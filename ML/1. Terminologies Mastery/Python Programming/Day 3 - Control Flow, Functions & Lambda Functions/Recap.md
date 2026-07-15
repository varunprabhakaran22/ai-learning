# Day 3 Recap — Control Flow, Functions & Lambda Functions

## Control flow
- `if`/`elif`/`else` — same logic as JS, colon+indent instead of `{ }`.
- `for item in iterable` — Python's only `for` form, no C-style counter loop. Use `enumerate(seq)` to get `(index, item)` pairs when the index is needed.
- `while` — identical to JS. No `++`/`--` in Python — use `+= 1` / `-= 1`.
- `for`/`while` can have a trailing `else:` that runs only if the loop finished without a `break` — rare, no JS equivalent, but real.

## Functions (`def`)
- `def name(params): ... return value` — no `return` means the function implicitly returns `None` (not `undefined`).
- Positional params match by position, same as JS. Default values (`def f(x=5)`) also match JS.
- **Keyword arguments have no JS equivalent** — any function can be called as `f(age=25, name="Raj")`, matched by name, any order. Real ML library calls (e.g. `RandomForestClassifier(n_estimators=100, ...)`) rely on this constantly for readability.
- Positional args must come before keyword args in a call — the reverse is a `SyntaxError`.

## `*args` / `**kwargs`
- `*args` gathers extra positional arguments into a **tuple**. `**kwargs` gathers extra named arguments into a **dict** — always these two container types, never a choice.
- The names `args`/`kwargs` are just convention — the `*`/`**` is what actually does the gathering.
- The *contents* inside can be anything (any type, any count) — that unpredictability is the entire reason this mechanism exists; you never need to know the types in advance to write the function.

## Function scope — completes Day 1's scope rule
- Only `def` creates a new scope (confirmed, matches Day 1).
- **Critical: assigning to a name ANYWHERE inside a function body makes Python treat it as local for the WHOLE function** — including lines before that assignment. Reading it before the assignment raises `UnboundLocalError`, not the outer/global value.
- **From our discussion — the trap isn't obvious from the rule alone:** `counter += 1` inside a function is secretly `counter = counter + 1` — an assignment. So even though it looks like "just updating the global," Python sees the assignment, decides `counter` is local to this function, and then fails trying to read the local `counter` before it has a value — `UnboundLocalError`, not silent success and not "no access to the global."
- Fix: `global counter` inside the function, declared before using it, tells Python explicitly "modify the actual global, don't create a local." Without it, any assignment to a same-named variable inside a function always shadows the global — unlike JS, which lets a function reassign an outer-scope variable with no special keyword at all.
- Reading an outer/global variable with no assignment anywhere in the function works fine, no keyword needed — the trap only triggers when the same name is also assigned somewhere in that function.

## `lambda`
- `lambda params: expression` — Python's one-line arrow function equivalent. Exactly one expression, no statements, no `return` keyword (illegal inside a `lambda`), no multi-line body.
- Can use a ternary-style expression: `lambda n: "even" if n % 2 == 0 else "odd"` — still one expression, just a conditional one.
- Real use: throwaway functions passed inline where a function is expected but doesn't need a name — most commonly `sorted(seq, key=lambda x: ...)`.
- The moment logic needs more than one expression/branch/statement, stop trying to force it into a `lambda` — write a named `def` instead.

## Still need to cover
- `example.py` and `playground.py` for Day 3 — hands-on practice not yet done.
- `sorted(..., key=...)` in full depth (previewed on Day 2, touched again here with `lambda`, but not yet a dedicated task).
