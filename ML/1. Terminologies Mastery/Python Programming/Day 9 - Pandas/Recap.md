# Day 9 Recap — Pandas

## Why it exists
- NumPy arrays have no column names/row labels — only numeric position. Pandas adds labels + mixed data types + real file-loading on top of NumPy.
```python
import pandas as pd

ages = pd.Series([25, 30, 45], index=["Varun", "Priya", "Raj"])   # labeled 1D
ages["Varun"]     # 25 — access by LABEL, not just position
```
- **From our discussion:** Pandas doesn't add capability plain dicts/lists fundamentally lack — everything could theoretically be hand-written with loops. What it adds is not having to re-solve filtering (without manual index-syncing across parallel lists), real CSV parsing, and ready-made aggregation/grouping/merging — all vectorized, same as NumPy.

## Core mechanics
```python
data = {
    "name": ["Varun", "Priya", "Raj"],
    "age": [30, 25, 45],
    "salary": [70000, 62000, 85000],
}
df = pd.DataFrame(data)     # dict keys -> column names, lists -> column values, matched by position
```
- `df["col"]` (single name) → a `Series`. `df[["col1","col2"]]` (a LIST of names) → a `DataFrame`.
```python
df["age"]              # Series: 0->30, 1->25, 2->45
type(df["age"])          # <class 'pandas.core.series.Series'>

df[["name", "salary"]]   # DataFrame with just those 2 columns
```
- Adding a column — same as adding a dict key, vectorized:
```python
df["bonus"] = df["salary"] * 0.1     # no loop needed (Day 8 vectorization)
```
- Filtering — same boolean-mask mechanism as Day 8, since a `Series` IS a labeled NumPy array underneath:
```python
df[df["age"] > 25]                                  # one condition
df[(df["age"] > 25) & (df["salary"] > 65000)]        # combined — still needs & / (), not and/or
```

## `.loc` vs `.iloc` — the real trap
- `.iloc[n]` = position ("whatever is physically in slot n right now"). `.loc[label]` = the actual index label. Identical with the default `0,1,2...` index — diverge the moment you filter/reorder.
```python
df.loc[1]      # row LABELED 1   -> Priya (same as iloc here, labels == positions right now)
df.iloc[1]      # row at POSITION 1 -> Priya
```
- **Critical (from our discussion): filtering keeps each row's ORIGINAL label, but positions shift.**
```python
filtered = df[df["age"] > 25]     # drops Priya (label 1); Varun (label 0) and Raj (label 2) survive
#     name  age  salary
# 0  Varun   30   70000
# 2    Raj   45   85000

filtered.iloc[1]     # Raj — position 1 in the NEW, smaller table
filtered.loc[1]       # KeyError — label 1 (Priya) doesn't exist in filtered anymore
filtered.loc[2]       # Raj — label 2 still exists, unaffected by the position shift
```
- A single index defaults to a whole row (every column included). Add a comma for row+column:
```python
df.loc[1]              # Series: name='Priya', age=25          — WHOLE row
df.loc[1, "age"]        # 25                                     — just that one value
df.iloc[1, 1]            # 25                                     — position-based equivalent
df.loc[:, "age"]         # whole "age" COLUMN, every row — ':' = "all", same as Day 8's NumPy slicing
```

## Files & missing data
```python
df = pd.read_csv("employees.csv")   # realistic starting point — not a hand-typed dict
df.head()                             # preview first 5 rows — never print a huge DataFrame whole
df.shape                              # (n_rows, n_columns)
df.columns                            # column names
df.dtypes                              # each column's data type

df.to_csv("output.csv", index=False)  # index=False avoids writing row-labels as a real column

df.isna().sum()      # count missing values PER COLUMN
df.dropna()            # remove any row with at least one missing value
df.fillna(0)            # replace every missing value with 0
```

## NumPy vs. Pandas — when to use which
| | NumPy | Pandas |
|---|---|---|
| Best for | pure numeric arrays, math-heavy computation | labeled, mixed-type, tabular data (real datasets) |
| Structure | `ndarray` — no names, position only | `Series`/`DataFrame` — named columns, labeled rows |
| Typical source | computed/generated in-code | loaded from a file (`read_csv`) |
| Selecting data | `array[row, col]` (position only) | `df["col"]`, `.loc` (label) / `.iloc` (position) |
| Relationship | — | a DataFrame IS built on NumPy arrays underneath; `.values` converts back to a raw NumPy array |
| Use when | clean numbers already, need speed, no names needed | loading/exploring/cleaning real-world data with named fields |

```python
arr = df["age"].values      # Series -> plain NumPy array, if you need raw NumPy operations
```

## Must-know functions/methods
| Function/method | What it does |
|---|---|
| `pd.DataFrame(dict)` | build a DataFrame from a dict of lists |
| `pd.read_csv(path)` | load a CSV file |
| `df.to_csv(path, index=False)` | save to a CSV file |
| `df.head()` | preview first 5 rows |
| `df.shape` / `.columns` / `.dtypes` | dimensions / column names / column types |
| `df["col"]` | select one column (→ Series) |
| `df[["a","b"]]` | select multiple columns (→ DataFrame) |
| `df.loc[label]` / `df.loc[label, "col"]` | select by label (row / row+column) |
| `df.iloc[pos]` / `df.iloc[pos, pos]` | select by position (row / row+column) |
| `df[df["col"] > x]` | filter rows by condition |
| `df.isna().sum()` | count missing values per column |
| `df.dropna()` / `df.fillna(value)` | remove / fill missing values |
