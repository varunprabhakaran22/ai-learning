# Day 8 Recap — NumPy

## Why it exists

- Plain Python lists can't do direct elementwise math and are slow at scale — list items are scattered Python objects in memory, not packed raw numbers. NumPy's `ndarray` fixes both.

```python
prices = [10, 20, 30]
prices * 0.9          # TypeError — plain list has no elementwise math

import numpy as np
prices = np.array([10, 20, 30])
prices * 0.9            # array([ 9. 18. 27.])  — works, no loop needed
```

- **From our discussion:** shape/dimensions, aggregations, and masking are all consequences of this same root cause (vectorization + packed memory), not separate independent features.

## Core mechanics

```python
arr = np.array([1, 2, 3])
arr + 5          # array([6, 7, 8])       — elementwise, every item + 5
arr * 2          # array([2, 4, 6])
```

- **Critical trap:** plain list `+` concatenates; NumPy array `+` elementwise adds — same operator, different meaning by type.

```python
[1, 2, 3] + [10, 20, 30]                    # [1, 2, 3, 10, 20, 30]        — CONCATENATES
np.array([1,2,3]) + np.array([10,20,30])    # array([11, 22, 33])          — ELEMENTWISE ADDS
```

- **Critical (from our discussion): elementwise operators return a NEW array; original untouched.** Only in-place methods/operators mutate.

```python
a = np.array([1, 2, 3])
b = a * 10        # NEW array — a is untouched
print(a)            # [1 2 3]

a = np.array([1, 2, 3])
b = a               # SAME object as a (Day 2's reference trap, applies to arrays too)
b += 10              # in-place operator — mutates the shared object
print(a)              # [11 12 13]  — a changed too!
```

- `.shape` / `.ndim`, and 2D indexing with one bracket pair:

```python
matrix = np.array([[1, 2, 3], [4, 5, 6]])
matrix.shape        # (2, 3)
matrix.ndim          # 2
matrix[1, 2]          # 6  — ONE bracket pair, comma-separated

nested = [[1, 2, 3], [4, 5, 6]]
nested[1][2]           # 6  — plain list needs TWO separate bracket pairs
```

- **From our discussion:** a single index drops the dimension (1D result); a slice keeps it (still 2D, just narrower).

```python
matrix[:, 1]      # array([2, 5])            — single index -> 1D, shape (2,)
matrix[:, 1:]     # array([[2, 3], [5, 6]])  — slice -> still 2D, shape (2, 2)
```

## Aggregation

```python
scores = np.array([85, 90, 78, 92, 88])
np.sum(scores)      # 433
np.mean(scores)      # 86.6
np.std(scores)        # ~5.28 — spread around the mean
scores.sum()           # 433  — same thing, callable as a method too
```

- `axis=0` collapses ROWS (one result per COLUMN, combined DOWN). `axis=1` collapses COLUMNS (one result per ROW, combined ACROSS).

```python
grid = np.array([[1, 2, 3], [4, 5, 6]])
np.sum(grid)              # 21          — everything
np.sum(grid, axis=0)      # [5 7 9]     — down each column
np.sum(grid, axis=1)      # [6 15]      — across each row
```

- **From our discussion — strings and aggregation:** `axis=` only controls direction; whether the function applies to strings at all is a separate question. `sum`/`mean`/`std` don't apply to text; `max`/`min` do, but compare alphabetically.

```python
names = pd.Series(["Varun", "Priya", "Raj"])
names.max()     # 'Varun'   — alphabetical comparison, not numeric
names.min()      # 'Priya'
```

- `**std` mechanism (from our discussion):** small std = values cluster tight around the mean; large std = values scattered wide, even with the *same* mean.

```python
tight = np.array([85, 86, 87, 86, 86])     # mean = 86
wide = np.array([40, 90, 130, 60, 110])     # mean = 86, same mean!
np.std(tight)    # ~0.7   — small spread
np.std(wide)      # ~33    — large spread
```

## Boolean masking

```python
scores = np.array([85, 90, 78, 92, 65])
mask = scores > 80          # array([ True,  True, False,  True, False])
scores[mask]                  # array([85, 90, 92])
scores[scores > 80]           # array([85, 90, 92])  — same thing, one line
```

- **Critical trap:** combining conditions needs `&`/`|` with parentheses — plain `and`/`or` raise `ValueError` on arrays (they only work on single booleans, in any language, JS included).

```python
scores[(scores > 70) & (scores < 90)]     # array([85, 78])   — CORRECT
scores[(scores > 70) and (scores < 90)]   # ValueError — and/or can't collapse a whole array
```

## Where NumPy is actually used (real-world relevance)

- The default shape for classical ML data: 2D `(n_samples, n_features)` — matches scikit-learn's expected input shape everywhere.

```python
X = np.array([[25, 50000, 1], [30, 62000, 0], [45, 80000, 1]])   # 2D — features
y = np.array([1, 0, 1])                                            # 1D — labels
```

- 3D/4D arrays appear once reaching image data `(height, width, channels)` or batched deep learning inputs — not needed for classical ML, standard once reaching DL/NLP tracks.

## Must-know functions/methods


| Function/method                 | What it does                                      |
| ------------------------------- | ------------------------------------------------- |
| `np.array(list)`                | build an array                                    |
| `.shape` / `.ndim`              | dimensions tuple / number of axes                 |
| `array[row, col]`               | 2D indexing, one bracket pair                     |
| `array[:, i]` vs `array[:, i:]` | single index drops dimension; slice keeps it      |
| `np.sum`/`.sum()`               | total                                             |
| `np.mean`/`.mean()`             | average                                           |
| `np.std`/`.std()`               | spread around the mean                            |
| `np.max`/`np.min`               | largest/smallest value (alphabetical for strings) |
| `axis=0` / `axis=1`             | sum down rows / across column                     |
| `array[array > x]`              | boolean-mask filtering                            |
| `&` / `|`                       | combine array conditions (NOT `and`/`or`)         |


