# Day 3 — Control Flow, Functions & Lambda Functions

---

## ⓪ Control flow you already mostly know — the real differences from JS

You've already used `if`/`elif`/`else` and `for` loops in Day 1-2 without a formal introduction, since Day 1's scope discussion needed them. This section closes that gap properly and covers what's actually different from JS, rather than re-teaching what you already do correctly.

**`if` / `elif` / `else`** — same logic as JS's `if`/`else if`/`else`, different keyword for the middle case (`elif`, not `else if`) and colon+indentation instead of `{ }` (recall from Day 1 that an `if`/`for`/`while` body doesn't create its own scope in Python, unlike JS's block-scoped `{ }`):

```python
age = 20
if age < 13:
    print("child")
elif age < 20:
    print("teen")
else:
    print("adult")
```

**`for` loops — a real difference from JS.** JS's classic `for (let i = 0; i < arr.length; i++)` has no direct Python equivalent at all — Python's `for` **always** iterates over an iterable (a list, string, `range()`, dict, etc.) directly, never over a manually-incremented counter:

```python
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)          # apple, banana, cherry — no index anywhere
```

If you need the index too (JS's `arr.forEach((item, i) => ...)`), use `enumerate()`, a built-in that pairs each item with its position:

```python
for i, fruit in enumerate(fruits):
    print(i, fruit)        # 0 apple, 1 banana, 2 cherry
```

`enumerate(fruits)` produces `(0, "apple")`, `(1, "banana")`, `(2, "cherry")` — tuples, unpacked directly into `i, fruit` the same way `.items()` unpacked `key, value` in Day 2.

**`while` loops** — identical concept to JS, same keyword:

```python
count = 0
while count < 3:
    print(count)
    count += 1
```

Note: Python has no `count++` or `count--` at all — no increment/decrement operators exist in Python. You must write `count += 1` (which Python does have, identical to JS's `+=`).

**`break` / `continue`** — identical to JS, same keywords, same meaning (`break` exits the loop entirely, `continue` skips to the next iteration).

**One Python-only control-flow feature, with no JS equivalent: `for`/`while` can have an `else` clause**, which runs only if the loop finished naturally (no `break` occurred):

```python
for n in [2, 4, 6, 8]:
    if n % 2 != 0:
        print("found an odd number")
        break
else:
    print("all numbers were even")     # runs because break never fired
```

This is a genuinely unusual feature (frequently confuses even experienced Python developers) — it's covered here because it exists and you'll see it in real code, but it's rare in practice; don't feel obligated to use it yourself.

---

## ① The problem functions solve, and Python's `def` syntax

You've already used functions without formal introduction (`example_function()` in Day 1's scope task, `.append()`/`.get()` as *methods*, which are functions attached to an object). This section makes the syntax and mechanics explicit.

A function is a **named, reusable block of code** that can accept inputs (parameters) and produce an output (a return value) — same purpose as a JS `function`. Python's syntax:

```python
def greet(name):
    return f"Hello, {name}!"

message = greet("Varun")
print(message)      # Hello, Varun!
```

```
JS:                                    Python:

function greet(name) {                def greet(name):
  return `Hello, ${name}!`;               return f"Hello, {name}!"
}
```

**`return` behaves identically to JS** — it immediately exits the function and hands back a value to whoever called it. **If a Python function has no `return` statement at all, it implicitly returns `None`** (not `undefined` like a JS function without a `return` — `None` is Python's single, deliberate "nothing" value, collapsing what JS splits into `null` and `undefined`, and it applies here too):

```python
def no_return():
    print("doing something")
    # no return statement

result = no_return()
print(result)        # None
```

---

## ② Parameters — positional, default values, and keyword arguments

**Positional parameters** work exactly like JS — arguments are matched to parameters left-to-right, by position:

```python
def describe(name, age):
    print(f"{name} is {age} years old")

describe("Varun", 30)     # matched by position: name="Varun", age=30
```

**Default parameter values** — same concept as JS's default parameters (`function f(x = 5)`), same syntax shape:

```python
def describe(name, age=18):
    print(f"{name} is {age} years old")

describe("Varun", 30)     # age=30, overriding the default
describe("Priya")          # age=18, default used since none was passed
```

**Keyword arguments — a real difference from JS, no direct equivalent.** JS has no built-in way to call a function by naming which parameter you're supplying (without wrapping arguments in an object first). Python lets you call *any* function using the parameter's name directly, in any order:

```python
describe(age=25, name="Raj")     # order doesn't matter — matched by NAME, not position
```

This matters concretely once a function has many parameters — keyword arguments make the call self-documenting (`describe(age=25, name="Raj")` reads clearly without needing to remember parameter order), and this is exactly why you'll see it constantly in real ML code, e.g. `RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)` — nobody remembers the positional order of a function with 20 parameters, so real-world code almost always calls library functions using keyword arguments.

You can mix both, but **positional arguments must come before keyword arguments** in a call:
```python
describe("Varun", age=30)    # fine — positional first, then keyword
describe(age=30, "Varun")    # SyntaxError — positional after keyword is illegal
```

---

## ③ `*args` and `**kwargs` — accepting an unknown number of arguments

Sometimes you don't know in advance how many arguments a function needs to accept — JS handles this with `...rest` parameters and by spreading objects. Python has two separate mechanisms, one for each case.

**`*args` — collect any number of extra positional arguments into a tuple** (matches JS's `...rest` for positional args):

```python
def total(*args):
    print(args, type(args))     # a TUPLE of whatever was passed
    return sum(args)

print(total(1, 2, 3))       # (1, 2, 3) <class 'tuple'>  → 6
print(total(10, 20))         # (10, 20) <class 'tuple'>  → 30
```

The name `args` is just a convention (you could call it anything), but **the `*` is what actually matters** — it tells Python "gather any number of remaining positional arguments into a tuple named `args`."

**`**kwargs` — collect any number of extra keyword arguments into a dict** (matches JS's object-spread pattern for named options):

```python
def describe_person(**kwargs):
    print(kwargs, type(kwargs))    # a DICT of whatever named args were passed

describe_person(name="Varun", age=30, city="Bangalore")
# {'name': 'Varun', 'age': 30, 'city': 'Bangalore'} <class 'dict'>
```

Same rule: `kwargs` is just a conventional name, `**` is what matters — it gathers any number of remaining *named* arguments into a dict.

**Why this matters concretely for reading real ML code:** you will see `*args, **kwargs` constantly in library source code (e.g. a model wrapper class that passes through arbitrary arguments to an underlying library) — it means "accept anything, positional or named, and I'll forward it onward without needing to know in advance what it is." Recognizing this pattern is the actual point of learning it now, even before you write your own.

You can combine regular parameters with both:
```python
def example(required, *args, **kwargs):
    print(required, args, kwargs)

example("must-have", 1, 2, extra="value")
# must-have (1, 2) {'extra': 'value'}
```

---

## ④ Function scope — completing Day 1's scope discussion

Day 1 established that only `def` creates a new scope, unlike `if`/`for`/`while`. Here's the precise mechanic, now that you can actually write functions to test it against.

```python
x = 10          # module-level (global) scope

def my_function():
    x = 20       # a NEW local variable, NOT the same x as outside
    print(x)     # 20

my_function()
print(x)         # 10 — completely unaffected by what happened inside the function
```

**Why:** assigning to a name *inside* a function, by default, always creates a local variable scoped to that function — even if a global variable with the same name exists. Python decides this at the point a name is *assigned to* anywhere in the function body, not by checking whether the name already exists outside.

**Reading an outer variable (no assignment) works fine without any special keyword:**
```python
y = 100
def show_y():
    print(y)     # 100 — reading an outer variable is always allowed

show_y()
```

**But this is a real trap — reading THEN assigning in the same function fails:**
```python
z = 5
def broken():
    print(z)     # UnboundLocalError, NOT 5
    z = 10

broken()
```
This raises `UnboundLocalError: local variable 'z' referenced before assignment`. The reason: Python scans the *entire function body* first and sees `z = 10` anywhere inside it — that alone is enough for Python to treat `z` as local to this function for its whole body, including the `print(z)` line *before* the assignment even runs. So the earlier `print(z)` isn't reading the global `z = 5` — it's trying to read the *local* `z`, which doesn't have a value yet at that point.

**To deliberately modify a global variable from inside a function, use the `global` keyword** (matching JS's ability to just reassign an outer-scope variable freely — Python needs an explicit keyword because of the auto-local-on-assignment rule above):
```python
counter = 0
def increment():
    global counter
    counter += 1

increment()
increment()
print(counter)     # 2
```

---

## ⑤ `lambda` — Python's single-expression anonymous function

A `lambda` is Python's equivalent of a JS single-line arrow function — an anonymous (unnamed) function limited to exactly **one expression**, with no `return` keyword needed (the expression's value is automatically what gets returned).

```python
double = lambda x: x * 2
print(double(5))     # 10
```

```
JS:                              Python:

const double = x => x * 2;       double = lambda x: x * 2
```

**Syntax breakdown:** `lambda` (the keyword, replacing `def` and the function name) → `x` (the parameter, same as any function parameter — can have multiple, comma-separated) → `:` (replaces the `def line:` colon) → `x * 2` (the single expression — this is both the function body AND the return value, in one).

```python
add = lambda a, b: a + b
print(add(3, 4))     # 7
```

**The hard restriction: exactly one expression, no statements.** A `lambda` cannot contain `if`/`else` as *statements*, cannot have multiple lines, cannot have a loop inside it, and cannot use the `return` keyword at all (using `return` inside a `lambda` is a `SyntaxError`). It CAN use a conditional *expression* (Python's ternary, one line):

```python
classify = lambda n: "even" if n % 2 == 0 else "odd"
print(classify(4))     # even
print(classify(7))     # odd
```

This works because `"even" if n % 2 == 0 else "odd"` is a single **expression** that evaluates to one of two values — it's not an `if` *statement* with a colon and indented block, just a compact expression form. This is Python's direct equivalent of JS's ternary `cond ? a : b`, just reordered: `value_if_true if condition else value_if_false`.

**When you'd actually reach for a `lambda` instead of `def` — the real, practical case:** almost always as a throwaway function passed directly into another function that expects one, without needing a name of its own. The most common real example is `sorted()`'s `key=` argument (previewed briefly on Day 2):

```python
words = ["cat", "elephant", "dog", "ant"]
print(sorted(words, key=lambda w: len(w)))     # sort by length
print(sorted(words, key=lambda w: w[-1]))       # sort by last letter
```

Here, defining a full `def last_letter(w): return w[-1]` just to use it once, immediately, and never again, would be unnecessary ceremony — a `lambda` lets you write the sorting rule inline, right where it's used.

**When `lambda` is the wrong choice (this is the judgment call, same as Day 2's comprehension judgment call):** the moment your logic needs more than one expression — multiple statements, real branching with actual `if`/`elif`/`else` blocks (not just a one-line ternary), a loop, or intermediate variables — stop trying to fit it into a `lambda` and write a proper named `def` function instead:

```python
# BAD — do not try to force multi-statement logic into a lambda (this isn't even valid syntax)
# classify = lambda n: (print("checking"); "even" if n % 2 == 0 else "odd")   # SyntaxError

# GOOD — use def once real logic is needed
def classify(n):
    print("checking")
    if n % 2 == 0:
        return "even"
    return "odd"
```

---

## Summary

```
⓪ if/elif/else — same as JS, colon+indent instead of { }. for ITEM in
   ITERABLE always (no C-style counter loop) — use enumerate(seq) for
   index+item pairs. while — identical to JS. No ++/-- in Python, use
   += /-=. for/while can have an else: clause (runs if no break fired)
   — rare but real, no JS equivalent.

① def NAME(params): ... return VALUE — same purpose as JS function.
   No return statement -> implicitly returns None (not undefined).

② Positional params match by position (like JS). Default values:
   def f(x=5) — same as JS. Keyword arguments (f(age=25, name="Raj"))
   have NO JS equivalent — call by name, any order. Real ML code uses
   keyword args constantly for readability with many parameters.

③ *args -> gathers extra positional args into a TUPLE (like JS
   ...rest). **kwargs -> gathers extra named args into a DICT (like
   JS object-spread for named options). The * / ** is what matters,
   not the names "args"/"kwargs" (convention only).

④ Only def creates a new scope (Day 1 recap). Assigning to a name
   ANYWHERE inside a function makes it local for the WHOLE function
   body, including lines before the assignment -> UnboundLocalError
   if you read it before that assignment. Use `global name` to
   deliberately modify an outer/global variable from inside a
   function.

⑤ lambda params: expression = Python's one-line arrow function.
   Exactly ONE expression, no statements, no `return` keyword (illegal
   inside lambda), no multi-line body. CAN use a ternary expression
   ("a if cond else b"). Real use: throwaway functions passed inline,
   e.g. sorted(seq, key=lambda x: ...). The moment logic needs more
   than one expression/branch/statement, use a named def instead.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 4 (Decorators & Generators).*
