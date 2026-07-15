# Day 5 Recap — Exception Handling, File I/O & JSON

## Exceptions — `try`/`except`
- An exception is an object representing "something went wrong" — every error already seen (`TypeError`, `KeyError`, etc.) is a specific exception type.
- `except SomeType:` must name a real exception type to catch only that type — a different exception type in the same `try` block is NOT caught and still crashes.
- Multiple types: `except (TypeError, ValueError):`. `as e` binds the actual exception object so it can be inspected/printed.
- Bare `except:` (no type at all) catches everything, including things you almost never want silently swallowed (e.g. `KeyboardInterrupt`) — avoid by default.

## `else` / `finally`
- `else:` runs only if the `try` block succeeded with zero exceptions — NOT covered by the paired `except`.
- `finally:` always runs — success, caught failure, or even an uncaught failure. Standard place for required cleanup.

## `raise`
- `raise ValueError("message")` = Python's `throw` — signal your own error using a built-in exception type. Custom exception classes need `class`/inheritance — deferred to Day 6.

## File I/O — `with`
- `open(path, mode)`: `"r"` read, `"w"` write (**erases existing content**), `"a"` append.
- **From our discussion — the actual bug `with` prevents:** manually calling `open()` then `f.close()` on separate lines fails if an exception happens in between — `close()` never runs, since the crash happens first. The correct manual fix is `try: ... finally: f.close()`, guaranteeing the close always runs.
- `with open(path, mode) as f:` is exactly that `try`/`finally` pattern, automated — the file is guaranteed to close the instant the block ends, exception or not. `as f` just names the value `open()` returns (same job as a normal `=` assignment), so it can be referred to inside the block.
- A file object is itself iterable — `for line in f:` reads one line at a time.

## JSON
- JSON is the standard text format for structured data outside a program's memory (not JS-specific despite the name) — matches JS's `JSON.stringify`/`JSON.parse`, but Python splits it into 4 functions instead of 2.
- `dumps`/`loads` (with `s`) = convert to/from a JSON **string**, in memory. `dump`/`load` (no `s`) = convert directly to/from a JSON **file**.
- **Critical: the `s` only ever means string-vs-file — it never indicates direction.** Direction is carried entirely by the word `dump` (dict → JSON) vs `load` (JSON → dict), independent of the `s`.
- **Critical (from our discussion): not every Python type survives a JSON round-trip.** JSON has no concept of `tuple` — only arrays — so a tuple silently becomes a `list` after `dumps` → `loads`. A `set` can't be JSON-serialized at all (`TypeError`). No automatic fix exists — the only solution is manually converting back (`tuple(restored_list)`) after loading, for every field you know needs to be a tuple/set, since JSON itself has no way to preserve that information.
- `FileNotFoundError` (bad path) and `json.JSONDecodeError` (malformed JSON content) are two separate, specific exceptions worth catching separately when loading a JSON file that might not be safe yet.

## Still need to cover
- `example.py` and `playground.py` for Day 5 — hands-on practice not yet done (same as Day 3/4).
- Custom exception classes (needs `class`/inheritance — Day 6).
- The general `__enter__`/`__exit__` mechanism behind `with` (deferred to Day 13, alongside the full iterator protocol).
