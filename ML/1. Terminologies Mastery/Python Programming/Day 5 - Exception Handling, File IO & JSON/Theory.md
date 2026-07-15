# Day 5 — Exception Handling, File I/O & JSON

---

## ⓪ You've already been living this — making it formal

Across Days 1-2 you've directly triggered and read several real Python errors: `TypeError: unsupported operand type(s)`, `KeyError`, `TypeError: 'tuple' object does not support item assignment`. Each time, the program **stopped immediately** at that line. This section formalizes what those actually are, and gives you the tools to keep a program running *through* an expected failure, instead of crashing.

**An exception is Python's mechanism for signaling "something went wrong, and normal execution cannot continue as written."** `TypeError`, `KeyError`, `NameError`, `IndexError` — these are all specific *types* of exception (matching Day 1's "everything has a type" idea — exceptions are objects too, with their own type). JS's equivalent is `throw`ing an `Error` — same core idea (something goes wrong, execution jumps away from normal flow), different keyword and mechanics, covered precisely in ①.

---

## ① `try` / `except` — catching an exception instead of crashing

```python
print(5 / 0)
```
raises `ZeroDivisionError: division by zero`, and without handling, the program stops right there — same as every uncaught exception you've seen so far. To keep running instead, wrap the risky code in a `try` block, and handle the failure in an `except` block:

```python
try:
    result = 5 / 0
    print(result)          # never reached — the line above already raised
except ZeroDivisionError:
    print("Can't divide by zero!")

print("Program continues")   # this DOES run — the exception was caught, not fatal anymore
```

```
JS:                                   Python:

try {                                 try:
  riskyCode();                            risky_code()
} catch (err) {                       except SomeErrorType:
  console.log(err.message);               print("handled")
}
```

**You must name the exception type you're catching** (`ZeroDivisionError` above) — this is a real, deliberate difference from JS's `catch (err)`, which catches absolutely anything by default. In Python, `except ZeroDivisionError:` only catches *that* specific type — a `TypeError` occurring in the same `try` block would NOT be caught by it, and would still crash the program:

```python
try:
    print("5" + 3)          # this raises TypeError, not ZeroDivisionError
except ZeroDivisionError:
    print("Can't divide by zero!")
# TypeError: can only concatenate str (not "int") to str  -- still crashes! Wrong except type.
```

**To catch multiple specific exception types**, list them in a tuple:
```python
try:
    value = int(input("Enter a number: "))
    print(10 / value)
except (ValueError, ZeroDivisionError):
    print("Enter a valid, non-zero number")
```

**To catch anything, regardless of type** (matching JS's default `catch` behavior), use bare `except Exception:` — but this is considered bad practice to reach for by default, because it silently swallows errors you didn't anticipate, hiding real bugs instead of surfacing them. Only use a broad catch when you deliberately want to handle *any* failure the same way (e.g. logging and continuing in a long-running service), and even then, prefer catching `Exception` (which excludes low-level system-exit signals) over a completely bare `except:`.

```python
try:
    risky_code()
except Exception as e:        # `as e` captures the actual exception OBJECT
    print(f"Something went wrong: {e}")
```

**`as e`** binds the actual exception object to a name, so you can inspect it — you already used this exact pattern in Day 1/2's `example.py` (`except TypeError as e: print("Got the expected error:", e)`). `e` holds the exception instance; printing it shows its message (e.g. `division by zero`).

---

## ② `else` and `finally` — the two extra, optional clauses

**`else`** — runs only if the `try` block completed with **no exception at all**. Distinct from putting the same code just after the `try`/`except` block, because code in `else` is *not* covered by the `except` — if something in the `else` block itself fails, it won't be caught by the preceding `except`:

```python
try:
    result = 10 / 2
except ZeroDivisionError:
    print("division failed")
else:
    print(f"Success: {result}")     # runs because no exception occurred
```

**`finally`** — runs **always**, whether an exception occurred or not, whether it was caught or not — even if the `try` block used `return` to exit a function early. This is the standard place to put cleanup code that absolutely must run no matter what (closing a file, releasing a resource):

```python
try:
    print(5 / 0)
except ZeroDivisionError:
    print("caught it")
finally:
    print("this always runs")      # runs in EVERY case — success, caught failure, even uncaught failure
```

JS has the identical `finally` keyword with identical behavior — this is one of the few places Python and JS use the exact same word for the exact same guarantee.

---

## ③ Raising your own exceptions — `raise`

Sometimes *you* want to signal that something is wrong, in code you're writing yourself — not wait for Python to hit an error naturally. `raise` does this, matching JS's `throw`:

```python
def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("Insufficient funds")
    return balance - amount

withdraw(100, 500)
# ValueError: Insufficient funds   -- immediately stops, same as any built-in exception
```

```
JS:                                          Python:

throw new Error("Insufficient funds");       raise ValueError("Insufficient funds")
```

You can raise any built-in exception type that fits the situation (`ValueError` for a bad value, `TypeError` for a wrong type, etc.), or define your own custom exception type by creating a class that inherits from `Exception` — that mechanism (`class`, inheritance) is Day 6's topic, so full depth on custom exception classes is deferred there; for now, raising a built-in type with a clear message is enough to express "this specific thing is wrong."

A `raise` inside a `try` block can still be caught by a matching `except`, exactly like any other exception:
```python
try:
    withdraw(100, 500)
except ValueError as e:
    print(f"Transaction failed: {e}")     # Transaction failed: Insufficient funds
```

---

## ④ File I/O — reading and writing files, and why `with` matters

**Opening a file** uses the built-in `open()` function, given a path and a **mode** string describing what you intend to do:

| Mode | Meaning |
|---|---|
| `"r"` | read (default — file must already exist, error if it doesn't) |
| `"w"` | write (creates the file if missing, **erases existing contents** if it exists) |
| `"a"` | append (creates the file if missing, adds to the end without erasing) |

**The classic way** (works, but has a real problem):
```python
f = open("notes.txt", "w")
f.write("Hello, file!")
f.close()          # you must remember to close it yourself
```

**The problem:** if an exception occurs between `open()` and `f.close()`, the file never gets closed — the program crashes before reaching the cleanup line. An open file left uncleaned can lock the file from other programs, or lose buffered writes that were never flushed to disk. This is precisely the kind of "must run no matter what" situation `finally` (②) exists for — and indeed, the manual, correct version wraps it exactly that way:

```python
f = open("notes.txt", "w")
try:
    f.write("Hello, file!")
finally:
    f.close()        # guaranteed to run even if .write() raised an exception
```

**The idiomatic way — a context manager, using `with`:**
```python
with open("notes.txt", "w") as f:
    f.write("Hello, file!")
# f.close() is called AUTOMATICALLY here, even if an exception occurred inside the block
```

`with` is Python syntax specifically for "run this setup, guarantee this cleanup runs afterward, no matter what" — `open()` returns an object that knows how to clean itself up (close the file), and `with` guarantees that cleanup happens the instant the indented block ends, for any reason, success or exception. This is exactly the `try`/`finally` pattern above, just handled automatically by the file object itself instead of you writing the `try`/`finally` by hand. **You'll see `with open(...) as f:` constantly in real Python code — it's the standard, expected way to work with files**, not an optional style preference. (The general mechanism any object uses to support `with` — the `__enter__`/`__exit__` methods — is deferred to Day 13, alongside the full iterator protocol; for files specifically, all you need to know now is: `with open(...) as f:` always closes the file for you, safely.)

**Reading a file's contents:**
```python
with open("notes.txt", "r") as f:
    contents = f.read()      # reads the ENTIRE file as one string
    print(contents)
```

**Reading line by line** (a file object is itself iterable — a `for` loop over it yields one line at a time, matching the "for always iterates over an iterable" rule from Day 3):
```python
with open("notes.txt", "r") as f:
    for line in f:
        print(line.strip())    # .strip() removes the trailing newline character each line ends with
```

---

## ⑤ JSON — the standard format for structured data on disk or over a network

**The problem:** a Python `dict` only exists in your running program's memory — the moment the program ends, it's gone. To save structured data to a file (or send it to another program, e.g. an API), you need a standard text format both sides agree on. **JSON (JavaScript Object Notation)** is that standard — and despite the name, it's used universally, not just from/to JS. You've likely already seen its shape, since it looks almost identical to a Python `dict`/JS object literal.

```json
{"name": "Varun", "age": 30, "is_learning": true, "tags": ["python", "ml"]}
```

**The core operations, via Python's built-in `json` module:**

```python
import json

person = {"name": "Varun", "age": 30, "is_learning": True}

# dict -> JSON STRING (this is called "serializing" / "dumping")
json_string = json.dumps(person)
print(json_string)          # '{"name": "Varun", "age": 30, "is_learning": true}'
print(type(json_string))    # <class 'str'>  — it's just a string now, not a dict anymore

# JSON STRING -> dict (this is called "parsing" / "loading")
back_to_dict = json.loads(json_string)
print(back_to_dict["name"])  # "Varun"
print(type(back_to_dict))     # <class 'dict'>
```

**`dumps`/`loads`** (with an `s`, for **s**tring) convert to/from a JSON string in memory. **`dump`/`load`** (no `s`) do the same conversion directly to/from an open file, combining ④'s file handling with JSON conversion in one call:

```python
# WRITE a dict directly to a JSON file
with open("person.json", "w") as f:
    json.dump(person, f)

# READ a dict directly back FROM a JSON file
with open("person.json", "r") as f:
    loaded_person = json.load(f)
print(loaded_person)    # {'name': 'Varun', 'age': 30, 'is_learning': True}
```

**One naming trap worth being precise about, since it's easy to mix up:** `dump`/`dumps` always go **dict → JSON**; `load`/`loads` always go **JSON → dict**. The `s` suffix only tells you *string vs. file* — it never tells you the direction.

**A real, concrete type mismatch to know about:** JSON's `true`/`false`/`null` become Python's `True`/`False`/`None` automatically during `loads`/`load` — and the reverse happens during `dumps`/`dump`. This conversion is automatic and correct for these cases, but **not every Python type has a JSON equivalent** — a `tuple`, for instance, gets silently converted to a JSON array (indistinguishable from a Python `list`) when dumped, and comes back as a `list`, not a `tuple`, when loaded again:
```python
data = {"coordinates": (12.9, 77.6)}   # tuple, Day 2
json_str = json.dumps(data)
restored = json.loads(json_str)
print(type(restored["coordinates"]))    # <class 'list'>  — NOT tuple! Silently changed type.
```
This matters concretely any time you round-trip data through JSON and expect to get back exactly what you put in — you won't, for types JSON has no concept of (tuples, sets — a `set` can't be JSON-serialized at all, and raises `TypeError: Object of type set is not JSON serializable` if you try).

**Combining ① and ⑤ — the realistic pattern you'll actually use:** reading a JSON file that might not exist, or might contain malformed JSON, wrapped in exception handling:
```python
try:
    with open("config.json", "r") as f:
        config = json.load(f)
except FileNotFoundError:
    print("Config file doesn't exist yet, using defaults")
    config = {}
except json.JSONDecodeError:
    print("Config file is corrupted/invalid JSON")
    config = {}
```
`FileNotFoundError` is raised by `open()` itself if the path doesn't exist; `json.JSONDecodeError` is raised by `json.load()` if the file's contents aren't valid JSON — two distinct, specific exception types, each caught separately, exactly matching ①'s "name the specific exception type" rule.

---

## Summary

```
⓪ An exception = an object representing "something went wrong,
   normal execution can't continue." Every error you've already
   seen (TypeError, KeyError, etc.) is a specific exception TYPE.

① try/except catches a NAMED exception type — except ZeroDivisionError:
   only catches that type, NOT any other. Multiple types: except
   (TypeError, ValueError):. `as e` binds the exception object itself
   so you can inspect/print it. Bare `except Exception:` catches
   anything but is bad practice by default — it hides unanticipated
   bugs.

② else: runs only if try succeeded with NO exception (not covered by
   except). finally: ALWAYS runs — success, caught failure, or
   uncaught failure alike. Standard place for required cleanup.

③ raise ExceptionType("message") = Python's `throw` — signal your
   OWN error. Can raise any built-in type (ValueError, TypeError...);
   custom exception classes deferred to Day 6 (needs class/inheritance
   first).

④ open(path, mode): "r" read, "w" write (ERASES existing content!),
   "a" append. ALWAYS prefer `with open(...) as f:` over manual
   open()/close() — it guarantees the file closes even if an
   exception occurs inside the block (same guarantee as try/finally,
   automated). A file object is itself iterable — for line in f:
   reads one line at a time.

⑤ JSON = the standard text format for structured data outside your
   program's memory. dumps/loads = dict <-> JSON STRING (in memory).
   dump/load = dict <-> JSON FILE directly (no "s" = file version).
   dict->JSON is "dump(s)", JSON->dict is "load(s)" — the s only
   means string-vs-file, never direction. Not every Python type
   survives a round-trip: tuple -> JSON array -> comes back as list,
   not tuple; set can't be JSON-serialized at all (TypeError).
   FileNotFoundError (bad path) and json.JSONDecodeError (bad JSON
   content) are two separate, specific exceptions worth catching
   separately when loading a JSON file that might not be safe yet.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 6 (OOP & Classes).*
