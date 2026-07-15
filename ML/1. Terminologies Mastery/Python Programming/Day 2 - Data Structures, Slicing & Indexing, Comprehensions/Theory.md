# Day 2 — Data Structures, Slicing & Indexing, Comprehensions

---

## ⓪ Why Python needs four different container types, not just one

In JS you reach for two containers for almost everything: `Array` (ordered, indexed) and `Object`/`Map` (key-value). Python splits this into **four** built-in types, because it separates two properties JS blurs together: *"can this be changed after creation?"* (mutability) and *"can this contain duplicate/unordered items?"*. That split is the whole reason Day 2 has four types instead of one, so it's worth seeing the matrix before any syntax:


|                                         | Orderstried, allows duplicates | Unordered, no duplicates                 |
| --------------------------------------- | ------------------------------ | ---------------------------------------- |
| **Mutable** (changeable after creation) | `list`                         | `set`                                    |
| **Immutable** (locked after creation)   | `tuple`                        | *(frozenset exists, rarely used — skip)* |


Key-value pairs get their own fifth type, `dict` (Python's version of a JS `Object`/`Map`), covered at the end of this section too.

---

## ① `list` — Python's `Array`, mutable and ordered

A `list` is the direct equivalent of a JS array — ordered, indexed from 0, and mutable (you can change its contents after creation).

```python
fruits = ["apple", "banana", "cherry"]
fruits.append("date")        # ["apple", "banana", "cherry", "date"]  — same as JS .push()
fruits[0] = "avocado"         # mutated in place — allowed, same as JS
print(fruits)                 # ['avocado', 'banana', 'cherry', 'date']
```

Common operations, matched against their JS equivalents:


| Python                    | JS equivalent                          | Effect                                                     |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `fruits.append(x)`        | `arr.push(x)`                          | add to the end                                             |
| `fruits.pop()`            | `arr.pop()`                            | remove and return the last item                            |
| `fruits.insert(1, x)`     | `arr.splice(1, 0, x)`                  | insert at a specific index                                 |
| `fruits.remove("banana")` | `arr.splice(arr.indexOf("banana"), 1)` | remove by *value*, not index                               |
| `len(fruits)`             | `arr.length`                           | count of items — a function call in Python, not a property |
| `"banana" in fruits`      | `arr.includes("banana")`               | membership check, returns `bool`                           |


**One real Python-specific trap: lists can hold mixed types in the same list** (`[1, "two", 3.0, True]` is completely legal), same as JS arrays — no surprise there. The surprise is on the *assignment* model, not the list itself: because Python names are bindings to objects (Day 1, ⓪), two variables can point at the **same** list object:

```python
a = [1, 2, 3]
b = a              # b is NOT a copy — it points at the SAME list object as a
b.append(4)
print(a)           # [1, 2, 3, 4]  — a changed too! Same object, two names.
```

This matches JS's array/object reference-assignment behavior exactly (`let b = a` in JS has the identical trap) — it's not new to Python, just worth confirming it carries over. To actually copy a list, use `b = a.copy()` or `b = a[:]` (a full slice — explained in ③).

---

## ② `tuple` — like a `list`, but locked after creation

A `tuple` holds ordered items exactly like a `list`, written with parentheses instead of square brackets, but **cannot be changed after creation** — no `.append()`, no reassigning an index.

```python
point = (3, 7)
print(point[0])        # 3 — indexing works exactly like a list

point[0] = 5            # TypeError: 'tuple' object does not support item assignment
point.append(9)         # AttributeError: 'tuple' object has no attribute 'append'
```

JS has no direct built-in equivalent — the closest comparison is `Object.freeze([3, 7])`, which similarly locks an array against mutation, but Python's `tuple` is a genuinely separate type (not a frozen version of `list`), and it's used far more idiomatically in everyday Python than `Object.freeze` is in JS.

**Why use a tuple instead of a list at all, if it does less?** Two real reasons: (1) it signals intent — "this collection of values is fixed and shouldn't change," e.g. `coordinates = (12.9, 77.6)` for a lat/long pair that should never be mutated by accident; (2) tuples are **hashable** (because they can't change, Python can safely compute a fixed hash value for one) — which means a tuple can be used as a `dict` key or stored in a `set`, while a `list` cannot:

```python
locations = {(12.9, 77.6): "Bangalore"}   # tuple as a dict key — works
locations = {[12.9, 77.6]: "Bangalore"}   # TypeError: unhashable type: 'list'
```

---

## ③ Indexing & Slicing — pulling out one item, or a range of items

**Indexing** (one item) works identically to JS arrays and strings: `fruits[0]` is the first item, and Python additionally supports **negative indices** to count from the end — `fruits[-1]` is the last item, `fruits[-2]` the second-to-last. JS has no negative-index shorthand at all (`arr[-1]` in JS silently returns `undefined`, since JS treats it as a nonexistent property key, not "count from the end").

```python
fruits = ["apple", "banana", "cherry", "date"]
print(fruits[0])     # 'apple'
print(fruits[-1])    # 'date'   — JS equivalent would be arr[arr.length - 1]
```

**Slicing** (a *range* of items) is Python-specific syntax with no direct JS equivalent (closest is `arr.slice(start, end)`, but Python's version is denser and more powerful). The syntax is `sequence[start:stop:step]` — all three parts optional:

```python
fruits[1:3]      # ['banana', 'cherry']  — index 1 up to (NOT including) index 3
fruits[:2]       # ['apple', 'banana']   — omit start = "from the beginning"
fruits[2:]       # ['cherry', 'date']    — omit stop  = "to the end"
fruits[:]        # a full COPY of the list — this is the a[:] copy trick from ①
fruits[::2]      # ['apple', 'cherry']   — step of 2: every other item
fruits[::-1]     # ['date', 'cherry', 'banana', 'apple']  — step -1: REVERSED
```

```
Index:        0        1        2        3
           ┌────────┬────────┬────────┬────────┐
fruits =   │ apple  │ banana │ cherry │  date  │
           └────────┴────────┴────────┴────────┘
Neg index:    -4       -3       -2       -1

fruits[1:3]   → start at index 1, STOP before index 3 → banana, cherry
```

**Why "stop is excluded" specifically:** this is called a **half-open range**, and it's a deliberate design choice (not an off-by-one accident) — it makes `len(fruits[a:b])` always equal exactly `b - a`, and makes consecutive slices compose cleanly (`fruits[:2] + fruits[2:]` always reconstructs the original list exactly, with no overlap and no gap). JS's `.slice(start, end)` uses the exact same half-open convention, for the same reason — this part isn't new.

**Slicing works on strings too**, since a Python `str` is just an ordered sequence of characters (same as indexing already implied):

```python
name = "Varun"
print(name[1:4])     # 'aru'
print(name[::-1])    # 'nuraV'  — common idiom for reversing a string
```

One string-specific consequence worth flagging now: strings are **immutable** in Python (like `tuple`, unlike `list`) — `name[0] = "B"` raises the same `TypeError` a tuple would. To "change" a string you must build a new one (`"B" + name[1:]`), same underlying immutability JS strings already have.

---

## ④ `dict` — Python's key-value type, matching JS's `Object`/`Map`

A `dict` stores key-value pairs, written with `{ }` and `key: value` — functionally closest to a JS `Map` (insertion order is preserved, keys can be almost any hashable type, not just strings) rather than a plain JS `Object` (which technically coerces non-string keys to strings).

```python
person = {"name": "Varun", "age": 30}
print(person["name"])          # 'Varun'  — bracket access, same as JS obj["name"]
person["city"] = "Bangalore"   # add a new key — same as JS obj.city = "..."
print(person.get("email"))     # None — .get() returns None instead of KeyError if missing
print(person["email"])         # KeyError: 'email'  — bracket access raises if key is missing
```

The `.get()` vs `[]` distinction matters concretely: JS's `obj.email` silently returns `undefined` for a missing key — Python's bracket access does **not** silently return `None`, it raises `KeyError` instead (consistent with Day 1's "no implicit leniency" theme — explicit is better than implicit). When a key might legitimately be missing, you'll see two forms in real code — both do the same job, but the second is what you'll actually see in most ML/data code:

```python
# classic (works, but verbose — explicit exception handling)
try:
    email = person["email"]
except KeyError:
    email = "not provided"

# idiomatic (what you'll actually see in real ML/data code — e.g. reading
# a config dict, a row of a dataset, or model kwargs with optional fields)
email = person.get("email", "not provided")
```

```python
person.keys()      # dict_keys(['name', 'age', 'city'])    — like Object.keys(obj)
person.values()    # dict_values(['Varun', 30, 'Bangalore']) — like Object.values(obj)
person.items()     # dict_items([('name','Varun'), ('age',30), ('city','Bangalore')])
                    # — like Object.entries(obj), pairs come back as tuples (②)
```

**Looping over a dict's pairs** — another spot with a classic vs. idiomatic split you'll see constantly in real code (e.g. iterating a model's hyperparameter dict, a dataset's column stats):

```python
# classic — index into the dict manually inside the loop
for key in person.keys():
    print(key, person[key])

# idiomatic — .items() unpacks each pair directly into two names via
# tuple unpacking (the "two variables at once" pattern from ②'s tuples)
for key, value in person.items():
    print(key, value)
```

---

## ⑤ `set` — unordered, no duplicates, and why that's useful

A `set` stores items with **no duplicates and no guaranteed order** — JS has a direct equivalent, `Set`, that works almost identically.

```python
tags = {"python", "ml", "python"}    # duplicate "python" is silently dropped
print(tags)                           # {'python', 'ml'}  — order not guaranteed

tags.add("ai")
print("ml" in tags)                   # True — membership check, O(1) fast (hash-based)
```

**Why this matters beyond "no duplicates":** sets support fast mathematical set operations that would otherwise take manual loop-and-check logic on a list:

```python
a = {1, 2, 3}
b = {2, 3, 4}
print(a & b)     # {2, 3}       — intersection
print(a | b)     # {1, 2, 3, 4} — union
print(a - b)     # {1}          — difference (in a, not in b)
```

An empty `{}` is a **dict**, not a set (dict came first historically and claimed the `{}` literal) — write `set()` explicitly for an empty set. This is a real, easy-to-hit trap: `x = {}` always creates an empty dict, never an empty set, even though `{1, 2, 3}` (non-empty, no colons) does create a set.

**Two different ways to end up with a set — writing one directly vs. converting something that already exists:**

```python
# (a) SET LITERAL — you're typing the values yourself, right here, right now
tags = {"python", "ml", "python"}     # { } with bare values, no colons -> a set
print(tags)                            # {'python', 'ml'}

# (b) SET CONSTRUCTOR — you already have a list (or any iterable) and want
#     to convert it into a set, e.g. to drop its duplicates
existing_list = ["python", "ml", "python", "ai", "ml"]
tags_from_list = set(existing_list)    # set(...) is a FUNCTION CALL, not { } syntax
print(tags_from_list)                  # {'python', 'ml', 'ai'}
```

`set(existing_list)` is the one to reach for whenever your data already exists as a list/tuple and you want a deduplicated, unordered version of it — this is the far more common real-world case (e.g. "I have a list of tags with repeats, give me the unique ones") than typing a set out by hand with `{ }`.

---

## ⑥ Comprehensions — Python's dense one-line loop-and-build syntax

A **comprehension** builds a new list/dict/set by looping over an existing sequence and (optionally) filtering, all in one expression — no direct single-line JS equivalent, though it's conceptually similar to chaining `.map()`/`.filter()`.

**List comprehension**, built up piece by piece from an equivalent plain loop:

```python
# The plain loop version — build a new list of squares
squares = []
for n in range(5):
    squares.append(n ** 2)
print(squares)     # [0, 1, 4, 9, 16]

# The exact same thing as a list comprehension:
squares = [n ** 2 for n in range(5)]
print(squares)     # [0, 1, 4, 9, 16]
```

```
[  n ** 2         for n in range(5)  ]
   ^expression       ^loop, read left-to-right as:
   (what to keep      "for each n in range(5)"
    for each item)
```

JS's nearest equivalent is `Array.from({length: 5}, (_, n) => n ** 2)` or `[...Array(5).keys()].map(n => n ** 2)` — noticeably more verbose for the same result, which is exactly why Python's comprehension syntax exists as a first-class feature rather than a method chain.

**Adding a filter condition** (Python's equivalent of chaining `.filter()` before `.map()`):

```python
evens_squared = [n ** 2 for n in range(10) if n % 2 == 0]
print(evens_squared)     # [0, 4, 16, 36, 64]
```

```
[  n ** 2   for n in range(10)   if n % 2 == 0  ]
   ^keep       ^loop over this      ^only if this is True
```

**Dict comprehension** — same idea, producing key-value pairs:

```python
squares_map = {n: n ** 2 for n in range(5)}
print(squares_map)     # {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
```

**Set comprehension** — identical syntax, curly braces without a colon:

```python
unique_lengths = {len(word) for word in ["cat", "dog", "lion", "ant"]}
print(unique_lengths)     # {3, 4}  — duplicate length 3 (cat, ant) collapses to one
```

**When NOT to reach for a comprehension:** if the loop body needs more than one simple expression (e.g. multiple statements, complex branching, or side effects like printing on each iteration), write a plain `for` loop instead — a comprehension crammed with nested conditions or multiple `if`/`else` branches becomes harder to read than the loop it was meant to shorten. Comprehensions are a readability tool for *simple* transform-and-optionally-filter cases, not a mandate to eliminate every loop.

---

## ⑦ `any()` / `all()` — Python's `.some()` / `.every()`, using generator expressions

JS's `arr.some(fn)` (true if *at least one* item matches) and `arr.every(fn)` (true only if *every* item matches) have direct Python equivalents: the built-in functions `any()` and `all()`.

```python
words = ["cat", "elephant", "dog", "hippopotamus", "ant"]

any(len(word) > 10 for word in words)    # True  — "hippopotamus" qualifies
all(len(word) > 10 for word in words)    # False — most words don't qualify
```

**The argument passed in — `len(word) > 10 for word in words` — is called a generator expression.** It's the exact same `for`/`if` shape as a list comprehension (⑥), but written with `( )` instead of `[ ]`, and critically, it does **not** build an actual list in memory first. Instead, it produces items one at a time, on demand, as `any()`/`all()` ask for the next one — and both functions **stop early** the moment they already know the answer:

```
any(...) stops the INSTANT it finds one True  → doesn't check the rest
all(...) stops the INSTANT it finds one False → doesn't check the rest
```

This matters concretely at scale: `any(is_prime(n) for n in range(10_000_000))` can return after checking just the first few numbers if an early one qualifies — it never generates or holds all 10 million results in memory the way `any([is_prime(n) for n in range(10_000_000)])` (with `[ ]`) would be forced to.

**When you'd use `( )` vs `[ ]` here specifically:** if you're feeding the comprehension straight into a single function call like `any()`, `all()`, `sum()`, `sorted()`, or `max()`/`min()`, use the generator form `( )` — there's no reason to materialize the intermediate list. You only need `[ ]` (an actual list comprehension) when you need the resulting list itself for something else afterward (printing it, looping over it again, passing it to multiple places).

```python
sum(len(word) for word in words)          # 30 — generator form, no intermediate list needed
sorted(words, key=len)                     # sorted by length — key= takes a function per item
```

---

## Summary

```
⓪ Four containers, split by two properties: mutable-or-not, ordered-
   with-duplicates-or-not-and-unique. list=mutable+ordered, tuple=
   immutable+ordered, set=mutable+unique/unordered, dict=key-value.

① list: mutable, ordered, like a JS Array. .append/.pop/.insert/
   .remove. Assignment (b = a) copies the REFERENCE, not the list —
   same trap as JS arrays. Use .copy() or [:] for a real copy.

② tuple: like list but immutable (no .append, no item reassignment).
   Used to signal "this shouldn't change" and because it's HASHABLE
   (can be a dict key / set member) — a list cannot.

③ Indexing: fruits[-1] = last item (negative index = from the end,
   no JS equivalent). Slicing: seq[start:stop:step], stop EXCLUDED
   (half-open range) so len(slice) == stop - start always. [::-1]
   reverses. Strings slice the same way AND are immutable like tuples.

④ dict: key-value, like JS Map/Object. Bracket access RAISES
   KeyError on a missing key (no silent undefined like JS) — use
   .get(key, default) when a miss is expected. .keys()/.values()/
   .items() (items → tuples) match Object.keys/values/entries.

⑤ set: unique, unordered, like JS Set. Fast membership (`in`) and
   set math (&, |, -). Empty {} is a DICT, not a set — use set().

⑥ Comprehensions: [expr for item in seq if cond] builds a list in
   one line — same idea as .filter().map() chained, denser syntax.
   {..} without colon = set comprehension, {k: v ...} = dict
   comprehension. Skip it if the loop body needs more than one
   simple expression — readability over cleverness.

⑦ any()/all() = JS's .some()/.every(). Take a GENERATOR expression
   (cond for item in seq) — same shape as a comprehension but with
   ( ) instead of [ ], no intermediate list built, and both stop
   early the moment the answer is known. Use ( ) when feeding
   straight into one function (any/all/sum/sorted); use [ ] only
   when you need the actual list afterward.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 3 (Control Flow, Functions & Lambda Functions).*