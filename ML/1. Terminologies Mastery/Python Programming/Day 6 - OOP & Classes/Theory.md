# Day 6 — OOP & Classes

---

## ⓪ The problem classes solve — bundling data and behavior together

Across Days 1-5, data and the functions that act on it have been kept separate: a `dict` describing a person (Day 2), and standalone functions that might operate on it. As programs grow, this separation becomes awkward — imagine dozens of "person" dicts floating around, and functions like `describe(person_dict)`, `birthday(person_dict)`, `rename(person_dict, new_name)`, all needing to independently agree on what keys that dict is expected to have, with nothing enforcing that agreement.

A **class** is a way to define a **custom type** (Day 1's `type()` concept — but now you can create your own types, not just use `int`/`str`/`list`) that bundles data (called **attributes**) and the functions that act on that data (called **methods**) into one single definition. An **object** (or **instance**) is one concrete "thing" built from that class — same relationship as `5` is *an instance of* the `int` type, or `"hello"` is *an instance of* `str`.

```
JS:                                    Python:

class Person {                        class Person:
  constructor(name, age) {                 def __init__(self, name, age):
    this.name = name;                          self.name = name
    this.age = age;                            self.age = age
  }
  describe() {                             def describe(self):
    return `${this.name}, ${this.age}`;         return f"{self.name}, {self.age}"
  }
}                                      
```

This should look structurally familiar — JS classes and Python classes solve the exact same problem, with different keywords and one significant difference: Python requires every method to explicitly declare `self` as its first parameter, where JS's `this` is implicit.

---

## ① Defining a class and creating instances

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

varun = Person("Varun", 30)     # creates an INSTANCE of Person
priya = Person("Priya", 25)      # a SEPARATE instance — independent data

print(varun.name, varun.age)     # Varun 30
print(priya.name, priya.age)     # Priya 25
```

**`class Person:`** declares a new type named `Person` — matching `class Person { }` in JS, colon+indentation instead of `{ }` (the same pattern from every block structure so far).

**`__init__`** is a special method Python calls automatically the moment you create a new instance (`Person("Varun", 30)`) — this is Python's exact equivalent of JS's `constructor`. The double-underscore naming (`__init__`) marks it as one of Python's "magic methods" — special methods Python itself calls automatically in specific situations, rather than you calling them directly. (`__init__` is the first one covered; a few more appear later, e.g. Day 5's `with` statement quietly relies on two more, `__enter__`/`__exit__`, deferred to Day 13.)

**`self.name = name`** stores `name` onto *this specific instance*, as an attribute — matching JS's `this.name = name`. Once set, `varun.name` and `priya.name` are completely independent values, each attached to their own object, exactly the way `varun` and `priya` above hold separate `name`/`age` values despite coming from the same class.

---

## ② `self` — the parameter JS hides, that Python makes explicit

This is the single biggest syntactic difference from JS, worth isolating clearly: **every method in a Python class must explicitly take `self` as its first parameter** — JS's `this` is implicit (available automatically inside any method, never declared as a parameter); Python's `self` is not implicit at all, it's a real parameter you must write, every time.

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def have_birthday(self):          # self MUST be declared here — Python does not add it automatically
        self.age += 1
        print(f"{self.name} is now {self.age}")

varun = Person("Varun", 30)
varun.have_birthday()      # "Varun is now 31"
```

**What actually happens when you call `varun.have_birthday()`:** Python automatically passes `varun` itself in as the first argument — `self` — behind the scenes. `varun.have_birthday()` is really shorthand for `Person.have_birthday(varun)` — you're never expected to write `self` in when *calling* a method, only when *defining* one. This is exactly why every method needs `self` explicitly listed as its first parameter in the `def` line — that slot is reserved for whichever specific instance the method was called on.

```
varun.have_birthday()
        │
        ▼
Python translates this to:
Person.have_birthday(varun)
                       │
                       ▼
            def have_birthday(self):   <- varun lands in `self` here
                self.age += 1           <- so this modifies varun.age specifically
```

**The name `self` is a strong convention, not a hard requirement** — you could technically name it anything, and Python wouldn't complain — but every Python developer, every library, every piece of code you'll ever read uses `self`, so deviating from it would only confuse readers (including future you) for zero benefit. Treat it as if it were mandatory.

**A method with more parameters simply adds them after `self`:**
```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def rename(self, new_name):        # self first, then any real parameters after
        self.name = new_name

varun = Person("Varun", 30)
varun.rename("V")
print(varun.name)     # "V"
```

---

## ③ Instance attributes vs. class attributes

Everything in ① and ② used **instance attributes** — data that belongs to one specific object (`self.name`), independent across every instance. There's a second kind: a **class attribute**, defined directly inside the class body (not inside `__init__`, not attached to `self`), shared by *every* instance of that class:

```python
class Person:
    species = "Homo sapiens"     # CLASS attribute — same for every instance, no `self.`

    def __init__(self, name, age):
        self.name = name          # INSTANCE attribute — unique per object
        self.age = age

varun = Person("Varun", 30)
priya = Person("Priya", 25)

print(varun.species, priya.species)   # Homo sapiens Homo sapiens — SAME value, shared
print(varun.name, priya.name)          # Varun Priya — DIFFERENT values, independent
```

**A real trap worth naming precisely:** reading a class attribute through an instance (`varun.species`) works fine and gives the shared value — but *assigning* to it through an instance (`varun.species = "changed"`) does **not** change the shared class attribute at all. It secretly creates a brand-new **instance** attribute on `varun` specifically, shadowing the class attribute just for that one object, leaving every other instance (and the class itself) untouched:

```python
varun.species = "Something else"     # this creates an INSTANCE attribute on varun only
print(varun.species)                  # "Something else"  — varun's own, new instance attribute
print(priya.species)                  # "Homo sapiens"    — UNCHANGED, still reading the class attribute
```

This is the same underlying mechanism as Day 3's function-scope assignment rule (assigning to a name inside a function always creates a new local binding rather than modifying an outer variable of the same name) — just applied to attributes instead of local variables. To actually change the *shared* class attribute for everyone, you must assign to it through the class name itself: `Person.species = "changed"`.

---

## ④ Inheritance — building a new class from an existing one

**The problem:** imagine you need a `Student` type that's almost identical to `Person` (same `name`, `age`, `have_birthday()`), but with one extra attribute (`school`) and one extra method. Rewriting all of `Person`'s code again inside `Student` would duplicate everything unnecessarily. **Inheritance** lets a new class reuse an existing class's attributes and methods, adding or overriding only what's different.

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def describe(self):
        return f"{self.name}, {self.age} years old"

class Student(Person):              # Student INHERITS from Person
    def __init__(self, name, age, school):
        super().__init__(name, age)   # calls Person's __init__ to set up name/age
        self.school = school            # then adds the NEW attribute Student needs

    def describe(self):                # OVERRIDES Person's describe()
        base = super().describe()        # calls Person's ORIGINAL describe(), reuses its result
        return f"{base}, studying at {self.school}"

s = Student("Priya", 20, "MIT")
print(s.describe())     # "Priya, 20 years old, studying at MIT"
print(s.name)             # "Priya"  — inherited straight from Person, no need to redefine it
```

```
JS:                                       Python:

class Student extends Person {            class Student(Person):
  constructor(name, age, school) {            def __init__(self, name, age, school):
    super(name, age);                             super().__init__(name, age)
    this.school = school;                         self.school = school
  }
}
```

**`class Student(Person):`** — the parent class goes in parentheses after the class name, matching JS's `extends Person`. **`super()`** gives you access to the parent class's own version of a method, before you add anything of your own — `super().__init__(name, age)` runs `Person`'s original setup logic first (so `self.name`/`self.age` get set exactly the way `Person` already knows how to do it), and only then does `Student.__init__` add its own extra step (`self.school = school`). Skipping `super().__init__(...)` entirely would mean `Student` never actually sets up `name`/`age` at all — those lines live in `Person`, not automatically inherited into existence unless you explicitly call them.

**Overriding a method** (`describe`, above) means defining a method with the *same name* in the child class — Python uses the child's version whenever it's called on a `Student` instance, instead of the parent's. Calling `super().describe()` inside the override lets you *reuse* the parent's original logic and build on top of it, rather than rewriting it from scratch — exactly what happened above (`base = super().describe()` reused `Person`'s full sentence, then added the school info onto it).

**Checking what something actually is:** `isinstance(s, Student)` and `isinstance(s, Person)` are **both** `True` — a `Student` instance is simultaneously a `Student` and a `Person`, since `Student` inherited from it. This is the same relationship as JS's `instanceof` across an `extends` chain.

---

## ⑤ Custom exceptions — a concrete, practical use of inheritance (closing Day 5's deferred gap)

Day 5 deferred custom exception classes (noting only that raising a built-in type with a clear message was enough for the time being) until `class`/inheritance were covered — here's the complete mechanism, and it's a direct, small application of inheritance:

```python
class InsufficientFundsError(Exception):    # inherits from the built-in Exception type
    pass                                       # no extra behavior needed — just a new, distinct TYPE

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFundsError("Not enough money in the account")
    return balance - amount

try:
    withdraw(100, 500)
except InsufficientFundsError as e:
    print(f"Custom error caught: {e}")
```

`class InsufficientFundsError(Exception): pass` creates a brand-new exception type that behaves exactly like any built-in one (`ValueError`, `TypeError`) for `raise`/`except` purposes, but with a name specific to your own program's meaning — letting `except InsufficientFundsError:` catch *only* this specific kind of failure, distinct from an unrelated `ValueError` elsewhere in the same `try` block. `pass` is a Python keyword meaning "do nothing here" — used when a block is syntactically required (a `class`/`def`/`if` body can't be left completely empty) but there's genuinely no additional code to add; inheriting from `Exception` alone is already enough behavior for a basic custom exception.

---

## Summary

```
⓪ A class bundles DATA (attributes) and BEHAVIOR (methods) into one
   custom type — same idea as a JS class, defining a blueprint that
   OBJECTS/INSTANCES get created from.

① class Name: ... __init__(self, ...): self.x = x — __init__ is
   Python's constructor, called automatically on Name(...). self.x
   sets an attribute on THAT specific instance.

② self must be EXPLICITLY declared as every method's first
   parameter — Python does NOT hide it like JS's implicit `this`.
   instance.method() secretly becomes Class.method(instance) —
   self IS that instance, passed in automatically at call time.

③ Class attributes (defined in the class body, no self.) are SHARED
   across every instance. Instance attributes (self.x in __init__)
   are independent per object. Assigning through an instance
   (instance.shared = X) does NOT change the shared value — it
   creates a new, shadowing INSTANCE attribute on that object only.

④ class Child(Parent): inherits Parent's attributes/methods.
   super().__init__(...) calls the parent's constructor — required
   if Child needs the parent's setup logic to actually run.
   Overriding = defining a same-named method in Child; super().method()
   inside it reuses the parent's original version. isinstance() is
   True for BOTH the child and every parent type in the chain.

⑤ Custom exceptions (Day 5's deferred gap): class MyError(Exception):
   pass creates a new, distinct exception TYPE — a small, direct
   application of inheritance, letting except MyError: catch only
   that specific kind of failure.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 7 (Modules & Packages, Virtual Environments, Git & GitHub).*
