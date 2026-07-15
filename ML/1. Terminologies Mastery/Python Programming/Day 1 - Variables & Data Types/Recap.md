# Day 1 Recap — Variables & Data Types

- Types seen: `int`, `float`, `str`, `None` (`NoneType`).
- `/` always gives float (true division), `//` gives floor division.
- `str + int` fails directly; fix with `str(int_var)`.
- Critical: only `def` (functions) create their own scope. `if`/`for`/`while`/`try`/`with` do NOT — variables assigned inside them leak into the enclosing (module or function) scope.
- Python blocks use `:` + indentation, not `{ }`. Inconsistent indentation → `IndentationError`.

Still need to cover: `5 == "5"` (Task 6, not yet run).