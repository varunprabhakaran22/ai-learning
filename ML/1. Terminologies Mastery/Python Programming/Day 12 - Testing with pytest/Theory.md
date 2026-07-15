# Day 12 — Testing with `pytest`

---

## ⓪ The problem automated tests solve

Every time you've verified a function works so far, you've done it manually — running a script, reading printed output, eyeballing whether it looks right (exactly what Day 1-10's `example.py` files were for). This doesn't scale: once a codebase has dozens of functions, manually re-checking all of them after every change becomes impractical, and it's easy to accidentally break something you weren't even thinking about while fixing something else.

**An automated test is code that checks other code, automatically, and reports pass/fail** — instead of you reading printed output and judging it yourself, the test itself states the expected result and Python checks it. `pytest` is the standard, most widely-used testing tool in the Python ecosystem (installed via `pip install pytest`) — roughly Python's equivalent of JS's Jest.

```
JS (Jest):                                    Python (pytest):

test("adds 2 + 3", () => {                    def test_add():
  expect(add(2, 3)).toBe(5);                      assert add(2, 3) == 5
});
```

---

## ① Writing your first test — `assert`, and pytest's naming conventions

**`assert`** is a Python keyword (new here, not seen before) that checks a condition — if the condition is `True`, nothing happens, execution just continues; if it's `False`, Python immediately raises `AssertionError` and stops.

```python
assert 2 + 2 == 4        # True — nothing happens, silent
assert 2 + 2 == 5        # False — raises: AssertionError
```

You can also attach a custom message, shown if the assertion fails:
```python
assert 2 + 2 == 5, "math is broken"     # AssertionError: math is broken
```

**A pytest test is just a plain function, using `assert`, that pytest discovers and runs automatically — following two naming rules pytest relies on to find them:**

```python
# math_utils.py
def add(a, b):
    return a + b
```

```python
# test_math_utils.py
from math_utils import add

def test_add():                    # function name MUST start with "test_"
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
```

**The two conventions pytest depends on, stated explicitly since nothing else in this track has relied on file/function naming to trigger automatic behavior before:** the **file** must be named `test_*.py` or `*_test.py`, and each **test function** inside it must start with `test_`. Pytest scans your project for files/functions matching these patterns and runs them automatically — there's no manual registration step, no importing a test runner and calling `.run()` yourself; naming alone is what makes a function discoverable as a test.

**Running the tests:**
```bash
pytest                    # run from your project's root — auto-discovers every test_*.py file
pytest test_math_utils.py  # run just this one file
```
```
test_math_utils.py .                                                     [100%]
======================== 1 passed in 0.01s ========================
```
Each `.` represents one passing test function; a failure shows `F` instead, along with the exact assertion that failed and the actual vs. expected values — pytest's output is specifically designed to make a failed assertion's cause immediately visible, without you needing to add your own print statements to investigate.

---

## ② Testing exceptions — confirming code fails the way it's supposed to

Sometimes the correct behavior *is* raising an exception (Day 5) — e.g. a function should raise `ValueError` on invalid input. Testing "did this correctly raise an error" needs its own mechanism, since a plain `assert` can't catch an exception that stops execution before the assertion even runs:

```python
import pytest

def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("Insufficient funds")
    return balance - amount

def test_withdraw_raises_on_insufficient_funds():
    with pytest.raises(ValueError):     # asserts that the block INSIDE raises this exact exception type
        withdraw(100, 500)
```

`pytest.raises(ValueError)` is a **context manager** (Day 5's `with` mechanism, reused here for a new purpose) — it wraps a block of code and asserts that running it raises the named exception type. If `withdraw(100, 500)` raises `ValueError` as expected, the test **passes** (the exception was caught by `pytest.raises` itself, not left to crash the test). If it raises a *different* exception, or no exception at all, the test **fails** — either way, this is the correct, idiomatic way to test "this should fail," rather than wrapping the call in your own `try`/`except` and manually checking.

---

## ③ Fixtures — reusable setup shared across multiple tests

**The problem:** many tests need the same setup data before they run (e.g. several tests all need a sample `Person` object, or a sample list of data). Repeating that setup in every single test function is real, avoidable duplication. A **fixture** is a function, marked with a special decorator (Day 4's decorator mechanism, reused here for a new purpose), that provides shared setup — pytest automatically runs it and hands the result to any test that asks for it.

```python
import pytest

@pytest.fixture
def sample_person():
    return {"name": "Varun", "age": 30}

def test_person_has_name(sample_person):      # pytest sees this PARAMETER NAME matches
    assert sample_person["name"] == "Varun"     # the fixture above, and calls it automatically

def test_person_has_age(sample_person):         # SAME fixture, reused in a completely different test
    assert sample_person["age"] == 30
```

**The mechanism, stated precisely:** pytest inspects each test function's **parameter names**. If a parameter's name matches a function decorated with `@pytest.fixture`, pytest calls that fixture function itself, and passes its return value in as that argument — automatically, with no manual wiring on your part. `sample_person` isn't a global variable being read; each test that requests it gets a **fresh call** to the fixture function, so tests don't accidentally share or corrupt state between each other.

---

## ④ Why this matters concretely — and where it fits in a real project

**A concrete before/after, tying directly to Day 6's `class`/inheritance material, to show what a real test suite guards against:**
```python
class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        return self.balance

# test_bank_account.py
def test_withdraw_reduces_balance():
    account = BankAccount(100)
    assert account.withdraw(30) == 70

def test_withdraw_raises_when_insufficient():
    account = BankAccount(50)
    with pytest.raises(ValueError):
        account.withdraw(100)
```
If someone later "improves" `withdraw` and accidentally breaks the insufficient-funds check, `pytest` (run as part of the project's normal workflow, or automatically in CI — a server that runs your tests on every change, common in real teams) immediately reports a failing test, catching the regression before it reaches production — instead of relying on someone noticing the bug by hand, or worse, a user hitting it live.

**Where this fits into the Day 7 workflow already covered:** a real project's `requirements.txt` typically includes `pytest` as a dependency, tests live in their own files (often a `tests/` folder, or `test_*.py` files alongside the code they test), and running `pytest` before committing/pushing (Day 7 ④'s `git commit`) is standard practice — catching breakage locally, before it's shared with anyone else via GitHub (Day 7 ⑤).

---

## Summary

```
⓪ Automated tests = code that checks other code automatically,
   instead of manually reading printed output and judging it
   yourself. pytest = Python's standard testing tool (like JS's
   Jest). pip install pytest.

① assert CONDITION checks a condition — silent if True, raises
   AssertionError if False (assert x, "message" attaches a custom
   message). A pytest test = a plain function using assert, DISCOVERED
   automatically by naming convention: file must be test_*.py or
   *_test.py, function must start with test_ — no manual registration
   needed. Run with `pytest` from the project root.

② pytest.raises(ExceptionType): is a context manager (Day 5's `with`,
   reused) that asserts a block of code raises that exact exception
   type — the correct way to test "this should fail," since a plain
   assert can't catch an exception that stops execution first.

③ @pytest.fixture marks a function as reusable setup (Day 4's
   decorator mechanism, reused). A test function that takes a
   PARAMETER NAME matching a fixture's name automatically receives
   that fixture's return value — pytest wires this up by name
   matching, no manual passing. Each test gets a FRESH call to the
   fixture — no shared/corrupted state between tests.

④ Real-world fit: tests catch regressions automatically (someone
   breaking existing behavior while changing something else) — run
   locally before committing (Day 7's git workflow), or automatically
   in CI on every push. pytest is a normal requirements.txt dependency
   in real projects, tests commonly live in their own test_*.py files
   or a tests/ folder.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 13 (Iterators, Context Managers & Lint/Format Tooling).*
