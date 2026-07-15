# Day 8 — NumPy

---

## ⓪ The problem NumPy solves — why plain Python lists aren't enough for numeric work

Day 2 covered `list` as Python's general-purpose ordered container. For ML/data work specifically — large amounts of numbers, matrix/vector math, applying one operation to millions of values at once — plain lists have two real, concrete problems.

**Problem 1 — plain Python has no way to do math "elementwise" on a whole list at once.** JS has this exact same gap; neither language's built-in array type supports direct arithmetic:

```python
prices = [10, 20, 30]
discounted = prices * 0.9        # TypeError: can't multiply sequence by non-int of type 'float'
```

To apply `* 0.9` to every element, plain Python forces you into a loop or comprehension (Day 2, ⑥):
```python
discounted = [p * 0.9 for p in prices]     # works, but this is YOU writing the loop yourself
```

**Problem 2 — plain Python lists are slow at large scale, for a real, mechanical reason.** A Python `list` stores **pointers to separate Python objects** scattered in memory (each number is a full Python `int`/`float` object, with its own type info and overhead) — not the raw numbers packed together. Looping over a million-item list in pure Python means a million individual object lookups, each with Python-level overhead. This is a genuine performance bottleneck once your data is real-world sized (thousands to millions of values), not a hypothetical concern.

**NumPy (Numerical Python)** solves both: it provides a new container type, the **array** (`ndarray`), which stores raw numbers packed contiguously in memory (like a typed array in a lower-level language) and supports **elementwise operations directly**, no loop needed — and because the actual looping happens in highly optimized C code under the hood instead of the Python interpreter, it's dramatically faster at scale. NumPy is not part of core Python — it's a package you install (`pip install numpy`, Day 7 ②) and import, universally aliased as `np` by convention:

```python
import numpy as np
```

---

## ① Creating arrays, and the first real difference from `list`

```python
import numpy as np

prices = np.array([10, 20, 30])
print(prices)              # [10 20 30]
print(type(prices))         # <class 'numpy.ndarray'>
```

`np.array(...)` converts a Python list (or nested list) into a NumPy array. Visually similar to a list when printed, but it's a genuinely different type (`ndarray`, not `list`) — Day 1's `type()` habit still applies here, and it's worth actually checking, since the two look deceptively alike printed side by side.

**Now the elementwise math from ⓪ works directly, no loop:**
```python
discounted = prices * 0.9
print(discounted)     # [ 9. 18. 27.]
```

`prices * 0.9` multiplies **every element** by `0.9` in one operation — this is called a **vectorized operation** (the operation applies across the whole "vector"/array at once), and it's the single most important practical difference from a plain list. Every arithmetic operator works this way on arrays:
```python
print(prices + 5)     # [15 25 35]  — add 5 to every element
print(prices - 5)     # [ 5 15 25]
print(prices / 2)     # [ 5. 10. 15.]
print(prices ** 2)    # [100 400 900]  — square every element
```

**Two arrays of the same size can be combined elementwise directly too** — position 0 with position 0, position 1 with position 1, and so on:
```python
a = np.array([1, 2, 3])
b = np.array([10, 20, 30])
print(a + b)     # [11 22 33]
print(a * b)     # [10 40 90]
```

This is a real, deliberate difference from plain Python lists, where `+` on two lists means **concatenation**, not elementwise addition:
```python
print([1, 2, 3] + [10, 20, 30])       # [1, 2, 3, 10, 20, 30]  — plain list: CONCATENATES
print(np.array([1,2,3]) + np.array([10,20,30]))  # [11 22 33]  — NumPy array: ELEMENTWISE adds
```

---

## ② Shape and dimensions — arrays beyond a single row

Everything in ① used a **1D array** (a single row of numbers — think of Day 1's `[3, 7]` point-in-space idea, generalized). NumPy arrays can also be **2D** (a grid/matrix — rows and columns, like a spreadsheet) or higher, which matters immediately once you're working with real datasets (a table of data is naturally 2D: rows = records, columns = features).

```python
matrix = np.array([[1, 2, 3],
                    [4, 5, 6]])
print(matrix)
# [[1 2 3]
#  [4 5 6]]
```

```
Row 0:  [ 1  2  3 ]
Row 1:  [ 4  5  6 ]
         │  │  │
      col0 col1 col2

2 rows, 3 columns — this shape is written as (2, 3)
```

**`.shape`** tells you the array's dimensions directly, as a tuple (Day 2's tuple type, here holding "how many rows, how many columns"):
```python
print(matrix.shape)     # (2, 3)  — 2 rows, 3 columns
print(prices.shape)      # (3,)    — a 1D array of 3 elements (note the trailing comma — it's a 1-item tuple)
```

**`.ndim`** tells you how many dimensions/axes the array has:
```python
print(matrix.ndim)      # 2
print(prices.ndim)       # 1
```

**Indexing a 2D array** uses `array[row, col]` — a single set of brackets with a comma inside, not two separate bracket pairs like nested lists would need:
```python
print(matrix[0, 1])      # 2   — row 0, column 1
print(matrix[1, 2])      # 6   — row 1, column 2

# compare to a NESTED plain list, which needs separate brackets per level:
nested_list = [[1, 2, 3], [4, 5, 6]]
print(nested_list[1][2])   # 6 — same value, but TWO bracket pairs, not one comma-separated pair
```

**Slicing works too, extending Day 2's slicing rules across two dimensions at once:**
```python
print(matrix[:, 0])      # [1 4]   — ':' for ALL rows, column 0 only  → the whole first COLUMN
print(matrix[0, :])       # [1 2 3] — row 0, ':' for ALL columns       → the whole first ROW
print(matrix[:, 1:])      # [[2 3] [5 6]]  — all rows, columns from index 1 onward
```

---

## ③ Aggregation functions — summarizing an array's data

NumPy provides built-in functions for the calculations you'd otherwise have to write loops for — this is where "ML/data toy example" code actually starts looking like real ML/data code:

```python
scores = np.array([85, 90, 78, 92, 88])

print(np.sum(scores))       # 433   — total
print(np.mean(scores))      # 86.6  — average
print(np.max(scores))        # 92
print(np.min(scores))        # 78
print(np.std(scores))        # standard deviation — how spread out the values are
```

Each of these can also be called as a **method directly on the array** (equivalent result, just different syntax — both forms are common in real code):
```python
print(scores.sum())    # 433
print(scores.mean())    # 86.6
```

**On a 2D array, aggregations default to the WHOLE array, but accept an `axis` argument to aggregate along just rows or just columns** — this is a genuinely important, easy-to-get-backwards mechanic:

```python
grid = np.array([[1, 2, 3],
                  [4, 5, 6]])

print(np.sum(grid))            # 21  — sums EVERYTHING, whole array
print(np.sum(grid, axis=0))    # [5 7 9]   — sums DOWN each column (axis 0 = rows collapse)
print(np.sum(grid, axis=1))    # [6 15]     — sums ACROSS each row  (axis 1 = columns collapse)
```

```
axis=0 (collapse ROWS, sum DOWN each column):
[[1 2 3]              [1+4, 2+5, 3+6]
 [4 5 6]]      ---->     = [5, 7, 9]

axis=1 (collapse COLUMNS, sum ACROSS each row):
[[1 2 3]              [1+2+3]     [6]
 [4 5 6]]      ---->  [4+5+6]  =  [15]
```

**The rule to memorize precisely, since "axis 0 = rows" sounds backwards at first:** `axis=0` means "collapse along the row direction" — i.e., combine values that are stacked vertically, in the same column, producing one result *per column*. `axis=1` means "collapse along the column direction" — combine values sitting side by side, in the same row, producing one result *per row*. This exact `axis` mechanic reappears constantly in Pandas (Day 9) and applies identically there.

---

## ④ Boolean masking — filtering an array by condition, without a loop

**The problem:** Day 2's list comprehension `[x for x in lst if cond]` is how you'd filter a plain list. NumPy has its own, different-looking mechanism that accomplishes the same filtering, but works by first building an array of `True`/`False` values, then using that to select elements — this two-step shape is worth understanding precisely, since it looks unusual the first time.

```python
scores = np.array([85, 90, 78, 92, 65])

mask = scores > 80
print(mask)      # [ True  True False  True False]
```

**Step 1 — `scores > 80` is itself a vectorized operation** (①'s mechanism), just using a comparison operator instead of arithmetic — it checks the condition against *every element* and returns a new array of the same shape, filled with `True`/`False` results. `mask` is a real NumPy array of booleans, nothing hidden or magic about it.

**Step 2 — using that boolean array to index the original array** selects only the positions where `mask` is `True`:
```python
print(scores[mask])          # [85 90 92]  — only the elements where mask was True

# more commonly written as one combined line, skipping the intermediate variable:
print(scores[scores > 80])   # [85 90 92]  — same result, condition written directly inside the brackets
```

```
scores:  [ 85   90   78   92   65 ]
mask:    [True True False True False]
                  │
                  ▼  (keep only positions where mask is True)
result:  [ 85   90        92      ]
```

This is NumPy's idiomatic replacement for a list comprehension's `if` filter — you'll see `array[array > value]`-shaped code constantly in real ML/data work (e.g. filtering rows above a threshold, selecting outliers, masking invalid values).

**Combining conditions requires `&` (and) / `|` (or) — NOT Python's `and`/`or` keywords**, which is a real, easy-to-hit trap worth naming explicitly. Plain Python's `and`/`or` only work correctly on single `True`/`False` values, not on whole arrays at once — using them on a NumPy boolean array raises an error (`ValueError: The truth value of an array with more than one element is ambiguous`), because Python has no way to reduce an entire array down to one single `True`/`False` for `and`/`or` to work with:
```python
print(scores[(scores > 70) & (scores < 90)])   # [85 78]  — CORRECT: & and |, with each condition in ( )
# print(scores[(scores > 70) and (scores < 90)])  # ValueError — 'and'/'or' do NOT work on arrays
```
The parentheses around each condition are required too — without them, Python's operator precedence would try to apply `&` before the comparisons even finish, producing a different (usually broken) result.

---

## Summary

```
⓪ Plain Python lists have no direct elementwise math (list * 0.9
   fails) and are slow at real-world scale (scattered Python objects
   in memory, not packed raw numbers). NumPy's array (ndarray) fixes
   both — install via pip (Day 7), always `import numpy as np`.

① np.array([...]) creates an array from a list. Arithmetic operators
   (+, -, *, /, **) apply ELEMENTWISE across the whole array
   automatically — no loop needed ("vectorized"). Two same-size
   arrays combine position-by-position. Real trap: plain list `+`
   CONCATENATES; NumPy array `+` ELEMENTWISE ADDS — same operator,
   different meaning depending on the type.

② .shape = dimensions as a tuple, e.g. (2, 3) = 2 rows, 3 columns.
   .ndim = number of dimensions. 2D indexing: array[row, col] — ONE
   bracket pair with a comma, not nested brackets like a plain nested
   list needs. Slicing extends across both dimensions: array[:, 0] =
   whole column 0, array[0, :] = whole row 0.

③ np.sum/mean/max/min/std (also callable as array.sum() etc.)
   summarize array data instead of manual loops. On 2D arrays, axis=0
   collapses ROWS (result per COLUMN, values combined DOWN), axis=1
   collapses COLUMNS (result per ROW, values combined ACROSS). Same
   axis mechanic reused identically in Pandas (Day 9).

④ Boolean masking: `array > value` is itself vectorized, producing a
   True/False array (the mask). `array[mask]` or `array[array > value]`
   selects only the True positions — NumPy's replacement for a list
   comprehension's `if` filter. MUST use & / | (with each condition
   in parentheses) for combining conditions on arrays — plain and/or
   raise an error, since they can't collapse a whole array to one
   True/False.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 9 (Pandas).*
