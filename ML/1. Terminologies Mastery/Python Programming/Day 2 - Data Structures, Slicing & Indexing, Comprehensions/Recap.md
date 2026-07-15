# Day 2 Recap — Data Structures, Slicing & Indexing, Comprehensions

## list
- Mutable, ordered. `.append()`, `.insert(i, x)`, `.remove(value)` (by value, not index), `.pop()`/`.pop(i)` (removes AND returns).
- **Critical: `b = a` does NOT copy a list** — `b` points at the same object as `a`, so mutating `b` mutates `a` too. Use `b = a.copy()` or `b = a[:]` for a real copy.

## tuple
- Like a list but immutable — no `.append()`, no `t[0] = x` (raises `TypeError`).
- **Why it exists despite doing less:** it's hashable (a list is not), so a tuple can be a dict key or set member — a list can't.

## Indexing & slicing
- Negative index counts from the end: `arr[-1]` = last item.
- Slice = `seq[start:stop:step]`. **`start` is a real inclusive index. `stop` is NOT an index of an included item — it's an exclusive cutoff** (half-open range), so `len(seq[a:b]) == b - a`.
- `step` = how many positions to jump each time, always adding the same fixed amount to the previous index (not a growing jump). Negative step walks backward — `[::-1]` reverses.
- Strings slice identically to lists/tuples, and are immutable like tuples (`name[0] = "x"` → `TypeError`).
- Slicing a tuple returns a tuple; slicing a list returns a list — output type matches the container sliced.
- **From our discussion:** access syntax is always `[ ]` regardless of whether the container was declared with `[ ]` (list) or `( )` (tuple) — `( )` after a variable means "call this as a function," never indexing.

## dict
- `dct[key]` raises `KeyError` on a missing key (no silent `undefined` like JS). `.get(key, default)` returns `default` (or `None`) instead of crashing.
- Add/update a key: `dct[key] = value` — same syntax does both, no separate "add" method.
- Delete: `del dct[key]` (no return value, raises `KeyError` if missing) or `.pop(key)` (removes AND returns the value, also takes an optional default).
- `.items()` unpacks each pair directly into `key, value` in a loop — no need to re-index with `dct[key]` inside the loop.
- **Critical (from our discussion): unquoted keys are NOT auto-stringified like JS.** `{name: "Varun"}` does NOT make the key the literal word `"name"` — Python evaluates `name` as a variable/expression first. If `name` holds `"varun prabhakaran"`, that's the actual key. Always quote keys explicitly: `{"name": "Varun"}`.

## set
- Unordered, no duplicates. Fast membership (`in`) and set math: `&` (intersection), `|` (union), `-` (difference).
- **`-` is directional** — `a - b` ("in a, not b") and `b - a` ("in b, not a") give different results, unlike `&`/`|` which are symmetric either way.
- `{}` is always an empty **dict**, never an empty set — `dict` claimed the `{}` literal historically. Use `set()` explicitly for an empty set.
- Two ways to get a set: literal (`{"a", "b"}`, typing values directly) vs. constructor (`set(existing_list)`, converting something that already exists — the more common real-world case, e.g. deduplicating an existing list).

## Comprehensions
- Template: `[expression for item in iterable if condition]` — expression and the for-loop are **always required**; `if condition` is the only **optional** piece.
- The expression slot answers "what value actually goes into the new collection for each item" — even keeping the item unchanged (`n`) is an explicit choice, not a default.
- `{k: v for item in iterable}` = dict comprehension (has `:`). `{expr for item in iterable}` = set comprehension (no `:`).
- Skip the comprehension and write a plain loop when the body needs more than one expression — multiple branches, multiple statements, or side effects (like `print()`) with nothing being collected into a new list.

## Generator expressions — `any()` / `all()`
- `(expr for item in iterable)` — same shape as a comprehension but with `( )`. Unlike `[ ]`/`{ }`, it computes **nothing upfront** — produces one value at a time, only when asked.
- **Critical (from our discussion): a generator can only be consumed once.** After looping through it fully, it's exhausted — looping again produces nothing (no error, just no output), because it only remembers where it left off, it never stored the values.
- `any(cond for item in seq)` = at least one True (JS `.some()`). `all(cond for item in seq)` = every one True (JS `.every()`). Both stop early the instant the answer is known.
- **Critical trap (from our discussion): put the actual condition as the EXPRESSION, never as an `if` filter.** `all(n for n in words if len(n) > 10)` filters down to only long words first, then checks if those survivors are truthy (non-empty strings always are) — this gives a misleading `True` almost every time. The correct form is `all(len(n) > 10 for n in words)`, with no `if` at all — every item gets checked against the real condition.

## Still need to cover
- `lambda` and `def` functions (previewed briefly when discussing multi-line comprehension logic, but this is Day 3's actual material — not yet learned in depth).
- `sorted(iterable, key=...)` — briefly previewed (key= takes a function, built-in or user-defined, and sorts based on that function's output per item, not the raw items) — revisit once functions (Day 3) are covered properly.
