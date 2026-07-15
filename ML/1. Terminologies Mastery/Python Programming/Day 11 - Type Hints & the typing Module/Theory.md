# Day 11 — Type Hints & the `typing` Module

---

## ⓪ The problem type hints solve — and the one thing they do NOT do

Every function you've written since Day 3 has looked like this:
```python
def greet(name, age):
    return f"{name} is {age} years old"
```
Nothing here tells a reader (or an editor/IDE) what `name` and `age` are actually supposed to be — a string and an int, presumably, but that's an assumption, not something Python checks or enforces. Call `greet(30, "Varun")` (arguments swapped) and Python runs it anyway, producing `"30 is Varun years old"` — wrong, but not an error.

**Type hints let you annotate what type a parameter/return value is *intended* to be:**
```python
def greet(name: str, age: int) -> str:
    return f"{name} is {age} years old"
```

```
JS/TS comparison:                              Python:

function greet(name: string, age: number): string {   def greet(name: str, age: int) -> str:
  return `${name} is ${age} years old`;                    return f"{name} is {age} years old"
}
```

**The single most important fact about Python type hints, stated as precisely as possible: they are not enforced at runtime, at all.** This is a genuine, sharp difference from TypeScript, which this comparison is worth making explicit against, since TS is the nearest thing you already know:

```python
def greet(name: str, age: int) -> str:
    return f"{name} is {age} years old"

print(greet(30, "Varun"))     # runs FINE — no error, no warning, nothing
                                # prints: "30 is Varun years old"  (still wrong, silently)
```

TypeScript's compiler refuses to even *compile* code that violates its type annotations. Python's interpreter does not check type hints at all while running your code — `age: int` is purely **documentation and a hint to external tools**, never a runtime guarantee. This single fact reframes everything else in this file: type hints exist entirely for **humans reading the code** and **external tools** (IDEs, linters) — not for Python itself to enforce anything.

---

## ① Basic syntax — annotating parameters and return values

```python
def add(a: int, b: int) -> int:
    return a + b
```

`a: int` and `b: int` annotate each **parameter's** expected type. `-> int` (arrow, before the colon) annotates the **return value's** expected type. Both are optional, and you can mix — annotate only some parameters, skip the return type, etc.:
```python
def describe(name: str, age):     # age has NO annotation — perfectly legal, just less documented
    print(f"{name}, {age}")
```

**Variables can be annotated too**, not just function signatures — same "hint, not enforcement" rule applies:
```python
score: int = 95
name: str = "Varun"

age: int = "thirty"     # runs FINE, no error — the annotation says int, the value is a str, Python doesn't care
```

---

## ② Why bother, if nothing is enforced — where the real value comes from

Given ⓪'s hard fact, the natural question is: what's actually gained? Two concrete, real benefits, neither of which is "runtime safety":

**1. Your editor/IDE reads type hints and gives you real, working autocomplete and inline error warnings** — this is the single biggest practical payoff, and it's not hypothetical; you'll feel it directly:
```python
def get_user(user_id: int) -> dict:
    return {"id": user_id, "name": "Varun"}

result = get_user("5")    # your editor UNDERLINES this — "5" doesn't match the int hint
                            # Python itself would still run it fine, but VS Code/Pylance flags it AS YOU TYPE
```
This is exactly what Day 0's runtime-model foundation and `python.analysis.diagnosticMode` settings (mentioned earlier in this track's setup) are built to surface — Pylance (VS Code's Python language server) reads type hints specifically to power this real-time feedback, entirely separate from whether Python itself would error.

**2. A separate, optional tool called `mypy` (Day 13's "lint/format tooling" briefly previews this; full usage there) can be run deliberately, as a check-before-you-run step, to scan your whole codebase and report every place where hinted types don't match actual usage** — catching the `greet(30, "Varun")` mistake *before* running the program, without Python's runtime needing to change at all:
```bash
mypy my_script.py
# my_script.py:5: error: Argument 1 to "greet" has incompatible type "int"; expected "str"
```
This is the closest Python gets to TypeScript's compile-time checking — but it's a deliberate, separate, optional step you run yourself, never automatic, and never something the Python interpreter does on its own when you type `python3 my_script.py`.

**Practical takeaway:** type hints are worth writing not because Python will stop you from misusing a function, but because your editor will warn you as you type, and because a team/project can optionally run `mypy` as a real quality gate (e.g. in CI) — both genuinely valuable, just fundamentally different from runtime enforcement.

---

## ③ Collection types — annotating a `list`, `dict`, etc., and what's *inside* them

Annotating a bare `list` or `dict` (`items: list`) only tells you it's *a* list — not what's inside it. Modern Python (3.9+) lets you specify the inner type directly using square brackets, matching TS's generic syntax closely:

```python
def total_scores(scores: list[int]) -> int:      # a list, where every item is an int
    return sum(scores)

def get_config() -> dict[str, str]:                # a dict, string keys, string values
    return {"env": "production", "region": "us-east"}
```

```
TS:                                        Python:

function total(scores: number[]): number   def total_scores(scores: list[int]) -> int:
```

**For a `tuple`, you specify each position's type individually** (since a tuple's items can each be a genuinely different type, and its length is fixed — Day 2's tuple recap):
```python
def get_point() -> tuple[float, float]:      # exactly 2 floats, in this order
    return (12.9, 77.6)
```

**Older Python (before 3.9) required importing capitalized versions from the `typing` module instead** (`List[int]`, `Dict[str, str]`) — you'll still see this form constantly in real, existing codebases (including many current ML libraries) that support older Python versions, so recognizing it matters even though the lowercase built-in form (`list[int]`) is now preferred going forward:
```python
from typing import List, Dict     # the OLDER way — still extremely common in real code you'll read

def total_scores(scores: List[int]) -> int:
    return sum(scores)
```

---

## ④ `Optional` and `Union` — a value that might be `None`, or might be one of several types

**The problem:** Day 1 established `None` as Python's single "nothing" value. A function that sometimes returns a real value and sometimes returns `None` needs a way to say that in its type hint — a bare `-> str` would be misleading if `None` is a genuinely possible return.

```python
from typing import Optional

def find_user(user_id: int) -> Optional[str]:     # returns EITHER a str, OR None
    if user_id == 1:
        return "Varun"
    return None
```

`Optional[str]` means **"a `str`, or `None` — nothing else."** It's explicitly documenting the exact same gap Day 5's `.get()` discussion surfaced (a lookup that might legitimately come back empty) — now expressed in a function's own signature, so a caller reading just the signature already knows to handle the `None` case.

**`Union`** generalizes this to "any one of several specific types," not just "a type or `None`":
```python
from typing import Union

def process_id(user_id: Union[int, str]) -> str:     # accepts EITHER an int OR a str
    return str(user_id)
```

**Modern Python (3.10+) has shorter, built-in syntax for both**, using `|` (matching the same symbol Day 8 used for NumPy's elementwise "or" — different meaning here, but same character, worth noting so you don't confuse the two contexts):
```python
def find_user(user_id: int) -> str | None:        # same meaning as Optional[str], newer syntax
    ...

def process_id(user_id: int | str) -> str:          # same meaning as Union[int, str], newer syntax
    ...
```

`Optional[str]` and `str | None` mean exactly the same thing — the `|` form is simply newer, shorter syntax for the same concept; both are common in real code, since not every project has moved to the newest Python version yet.

---

## ⑤ Type aliases and a preview of custom types — keeping complex hints readable

Once a hint gets complex and reused across multiple functions, repeating it everywhere becomes noisy. A **type alias** just gives a name to a type expression, for reuse:

```python
UserRecord = dict[str, str | int]     # a type alias — just a NAME for this specific shape

def get_user() -> UserRecord:
    return {"name": "Varun", "age": 30}

def update_user(user: UserRecord) -> UserRecord:
    ...
```

`UserRecord` here isn't a new type Python actually creates or checks — it's purely a readability shortcut, a name standing in for `dict[str, str | int]` everywhere it's used, exactly like a `const` in JS holding a repeated value, just applied to a type expression instead of a runtime value.

**A brief, practical note tying back to Day 6:** a `class` you define yourself (Day 6) can *also* be used directly as a type hint — this is extremely common in real code and worth recognizing on sight, even though full depth on structuring larger type hints around custom classes belongs to more advanced material beyond this day's scope:
```python
class User:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

def greet_user(user: User) -> str:      # User, your own class from Day 6, used as a type hint directly
    return f"Hello, {user.name}"
```

---

## Summary

```
⓪ Type hints ANNOTATE expected types (param: Type, -> ReturnType) but
   are NEVER enforced by Python at runtime — a real, sharp difference
   from TypeScript, which refuses to compile a mismatch. Python runs
   mismatched code with zero errors or warnings of its own.

① def f(x: int, y: str) -> bool: — parameters and return type both
   optional to annotate, can mix annotated/unannotated. Variables can
   be annotated too (x: int = 5) — same "hint only" rule applies.

② The real value: (1) your editor/IDE (e.g. Pylance) reads hints to
   give real-time autocomplete + inline warnings AS YOU TYPE: (2) mypy
   is a SEPARATE, optional, deliberately-run tool that scans a whole
   codebase for type mismatches BEFORE running — the closest Python
   gets to TS's compile-time checking, but always a manual, extra step.

③ Collections: list[int], dict[str, str], tuple[float, float] (each
   position typed individually, since tuples are fixed-length/mixed-
   type). Older code uses typing.List[int]/Dict[str,str] (capitalized,
   imported) instead of the modern lowercase built-in form — both
   still commonly seen in real code.

④ Optional[str] (or newer: str | None) = "this type, OR None" —
   documents the same "might legitimately be empty" gap as Day 5's
   .get(). Union[int, str] (or newer: int | str) = "any ONE of these
   types." | here is unrelated to Day 8's NumPy `|` (elementwise or)
   — same character, different meaning, different context.

⑤ A type alias (UserRecord = dict[str, str | int]) just NAMES a
   reusable type expression — no new type is created, purely a
   readability shortcut. A custom class (Day 6) can be used directly
   as a type hint, e.g. def f(user: User) -> str:.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 12 (Testing with `pytest`).*
