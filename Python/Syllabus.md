# 🐍 Python Fundamentals for AI/ML

Standalone track, independent pace from the JS `Week_N` syllabus (`Syllabus/AI.md`). Goal: get comfortable *reading and writing* core Python — not app-building — so that NumPy, Pandas, and ML library code stop looking foreign later. No web frameworks, no GUIs, no networking. NumPy/Pandas themselves are deferred to a future folder once these fundamentals are solid.

Each day: `Theory.md` (mental model) → `Recap.md` (your own summary) → `example.py` (small runnable script, AI/ML-flavored — text/number crunching, not todo apps).

---

## Day 1 — Syntax, Variables, Types & the Interpreter Model
- **Theory:** How Python actually runs (interpreter, no compile step you see). Indentation as syntax (not style). Dynamic typing vs JS's dynamic typing — what's actually different. Core types: `int`, `float`, `str`, `bool`, `None`.
- **Example:** basic variable/type exploration, `input()`/`print()`, simple arithmetic.

## Day 2 — Data Structures: Lists, Tuples, Dicts, Sets
- **Theory:** The four core containers, mutability differences, when to use each. List/dict comprehensions — the syntax that shows up everywhere in real Python code (including NumPy/Pandas-adjacent code later).
- **Example:** build and transform a small dataset (e.g. list of word counts) using comprehensions.

## Day 3 — Control Flow & Functions
- **Theory:** `for`/`while`/`if` in Python's syntax. Functions, default args, keyword args, `*args`/`**kwargs`, lambdas.
- **Example:** small text-processing functions (e.g. a word-frequency counter) using these constructs.

## Day 4 — Strings & Working with Data
- **Theory:** String methods, f-strings, splitting/joining, basic parsing of delimited text (foreshadows reading CSVs before Pandas exists in this track).
- **Example:** parse a small block of delimited text into structured data by hand.

## Day 5 — Error Handling & File I/O
- **Theory:** `try`/`except`/`else`/`finally`, raising exceptions, context managers (`with`), reading/writing files.
- **Example:** read a text file, handle a missing-file error gracefully, write processed output back out.

## Day 6 — OOP Basics
- **Theory:** Classes, `__init__`, instance methods, and enough dunder methods (`__str__`, `__len__`) to *read* library source comfortably later. (This is about reading Python OOP in the wild — it doesn't conflict with the JS track's "no classes in examples" rule, which is scoped to the JS `Day N/` folders only.)
- **Example:** a small class modeling something data-shaped (e.g. a `Dataset` wrapper around a list of records).

## Day 7 — Modules, Packages & the Ecosystem
- **Theory:** `import`, modules vs packages, virtual environments, `pip` — how the Python ecosystem is structured. Needed groundwork before NumPy/Pandas get introduced in a future folder.
- **Example:** split code across two files/modules and import between them.

---

## Still ahead (future folder, not this one)
- NumPy — arrays, vectorized ops, broadcasting
- Pandas — DataFrames, data wrangling
- Matplotlib — basic plotting

Only Day 1 is fully written so far. Days 2–7 fill in as you progress, same as the JS track's day-by-day pattern.
