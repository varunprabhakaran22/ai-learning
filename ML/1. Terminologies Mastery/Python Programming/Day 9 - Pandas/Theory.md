# Day 9 — Pandas

---

## ⓪ The problem Pandas solves — NumPy arrays have no labels

Day 8 established the 2D array as the standard shape for ML data: rows = samples, columns = features. NumPy arrays handle the *numbers* in that grid excellently — but they have one real gap: **a NumPy array has no concept of column names or row labels at all.** Every position is addressed purely by numeric index (`matrix[0, 1]`) — there's no way to ask for "the age column" by name; you'd have to remember "age is column 1" yourself, and that memory burden gets untenable the moment a real dataset has 20+ columns loaded from a CSV file with actual header names.

**Pandas** is a library (like NumPy, installed via `pip install pandas`, imported by convention as `pd`) built specifically to add labels, mixed data types, and file-loading convenience on top of NumPy's underlying array machinery. Its two core types map directly onto Day 8's array shapes:

| Pandas type | Shape | NumPy equivalent |
|---|---|---|
| `Series` | 1D, labeled | a labeled 1D array |
| `DataFrame` | 2D, labeled (rows AND columns) | a labeled 2D array — this is the one you'll use constantly |

```python
import pandas as pd
```

---

## ① `Series` — a labeled 1D array

```python
ages = pd.Series([25, 30, 45], index=["Varun", "Priya", "Raj"])
print(ages)
# Varun    25
# Priya    30
# Raj      45
# dtype: int64
```

A `Series` is a 1D array (Day 8, ①) with an explicit **label** attached to each position — called the **index** — instead of only a bare numeric position. Access by label works alongside plain positional access:
```python
print(ages["Varun"])     # 25 — access by LABEL
print(ages.iloc[0])        # 25 — access by POSITION (0 = first), same value here since Varun is first
```

**`.iloc`** (integer-location) is how you deliberately ask for "position N," when you want positional access regardless of what the label happens to be — distinguishing this from plain `[ ]`, which looks up by *label* first on a `Series`. This distinction matters more once rows get reordered/filtered and position no longer matches the original label — covered concretely in ③.

If you don't supply an `index`, Pandas defaults to plain `0, 1, 2, ...` — behaving just like a NumPy 1D array with automatic labels:
```python
scores = pd.Series([85, 90, 78])
print(scores[0])    # 85 — default integer index, same as NumPy positional indexing
```

---

## ② `DataFrame` — a labeled 2D array, and the type you'll use constantly

```python
data = {
    "name": ["Varun", "Priya", "Raj"],
    "age": [30, 25, 45],
    "salary": [70000, 62000, 85000],
}
df = pd.DataFrame(data)
print(df)
#     name  age  salary
# 0  Varun   30   70000
# 1  Priya   25   62000
# 2    Raj   45   85000
```

A `DataFrame` is Day 8's 2D array (`(n_samples, n_features)`), except **every column has a name** (from the dict's keys, here) and **every row has a label** (defaulting to `0, 1, 2, ...`, shown on the left edge — this is the DataFrame's own index, same concept as a `Series`' index). This is precisely why a `dict` of equal-length lists (Day 2) is the most natural way to build one from scratch — each key becomes a column name, each list becomes that column's values.

**Selecting a single column returns a `Series`** — this is the core relationship between the two types, worth stating explicitly:
```python
print(df["age"])
# 0    30
# 1    25
# 2    45
# Name: age, dtype: int64

print(type(df["age"]))    # <class 'pandas.core.series.Series'>
```
A `DataFrame` is, structurally, a collection of `Series` objects (its columns) lined up side by side, sharing one common row index.

**Selecting multiple columns** — pass a *list* of column names, not just bare names, which returns a `DataFrame` (not a `Series`, since it's more than one column):
```python
print(df[["name", "salary"]])
#     name  salary
# 0  Varun   70000
# 1  Priya   62000
# 2    Raj   85000
```

**Adding a new column** works like adding a dict key (Day 2, ④) — assign directly:
```python
df["bonus"] = df["salary"] * 0.1     # vectorized, Day 8 ① — no loop needed
print(df["bonus"])    # 7000.0, 6200.0, 8500.0
```

---

## ③ Selecting rows — `.loc` and `.iloc`, and why both exist

**`.iloc[position]`** — select by pure numeric position, ignoring whatever the index labels actually are:
```python
print(df.iloc[0])       # the FIRST row (position 0), regardless of its label
# name      Varun
# age          30
# salary    70000
# Name: 0, dtype: object
```

**`.loc[label]`** — select by the actual index **label**, not position. With the default `0, 1, 2, ...` index, this looks identical to `.iloc` — but the distinction becomes real and necessary the moment the index is no longer plain sequential integers (e.g. after filtering rows, or explicitly setting a meaningful index like names):
```python
named_df = df.set_index("name")     # use the "name" column AS the index instead of 0,1,2
print(named_df.loc["Priya"])          # select by the LABEL "Priya" — .iloc[1] would NOT work here by name
# age          25
# salary    62000
```

**Why this distinction is more than a style choice — a concrete trap:** filtering a DataFrame (④) keeps each surviving row's *original* label, but their *positions* shift:
```python
filtered = df[df["age"] > 25]     # keeps rows for Varun (label 0) and Raj (label 2); Priya (label 1) is dropped
print(filtered)
#     name  age  salary
# 0  Varun   30   70000
# 2    Raj   45   85000

print(filtered.iloc[1])   # Raj's row — position 1 in the FILTERED result (Varun=pos 0, Raj=pos 1 now)
print(filtered.loc[1])     # Priya's row?? NO — raises KeyError, since label 1 (Priya) no longer EXISTS in filtered
```
This is the exact scenario `.iloc` vs `.loc` exists to distinguish: after filtering, the row originally labeled `1` (Priya) is gone entirely, but the row labeled `2` (Raj) still carries its original label `2`, even though it's now sitting at *position* 1. `.iloc[1]` asks "whatever is physically in slot 1 right now" (Raj); `.loc[1]` asks "give me whatever is labeled 1" (which no longer exists after filtering, hence the error). Conflating the two is a common, real source of bugs once you start filtering/reordering real data.

---

## ④ Filtering — boolean masking, identical mechanism to Day 8's NumPy masking

```python
print(df[df["age"] > 25])
#     name  age  salary
# 0  Varun   30   70000
# 2    Raj   45   85000
```

`df["age"] > 25` produces a `Series` of `True`/`False` (a boolean mask, exactly Day 8 ④'s NumPy mechanism — a `Series` IS a labeled NumPy array underneath), and `df[mask]` keeps only the rows where that mask is `True`. **The same `&`/`|`-not-`and`/`or` rule from Day 8 applies identically here, for the identical reason** (a `Series` of many booleans can't collapse to one for Python's `and`/`or` to use):

```python
print(df[(df["age"] > 25) & (df["salary"] > 65000)])
#     name  age  salary
# 0  Varun   30   70000
```

---

## ⑤ Reading and writing files — the everyday entry/exit point

**The realistic starting point for almost any Pandas work: loading data from a file, not building a `DataFrame` from a hand-typed dict.** The most common format is CSV (comma-separated values — a plain-text spreadsheet, one line per row, commas separating columns):

```python
df = pd.read_csv("employees.csv")     # loads a CSV file directly into a DataFrame
print(df.head())                       # preview the FIRST 5 rows — standard first command after loading anything
print(df.shape)                         # (n_rows, n_columns) — same .shape concept as Day 8's NumPy arrays
print(df.columns)                       # the column names, as an Index object
print(df.dtypes)                         # the data TYPE of each column (int64, float64, object/string, etc.)
```

`.head()` is worth calling out specifically — real datasets can have thousands to millions of rows, so printing the whole `DataFrame` is impractical; `.head()` (first 5 rows by default, or `.head(10)` for a custom count) is the standard way to sanity-check what you just loaded.

**Saving back to a file** — `to_csv`, the mirror of `read_csv`:
```python
df.to_csv("output.csv", index=False)     # index=False avoids writing the row-label column into the file
```
`index=False` is worth understanding precisely: without it, Pandas writes the DataFrame's row index (the `0, 1, 2, ...` labels) as its own extra column in the saved file — usually not wanted, since that index was just an internal label, not real data you meant to persist.

**Handling missing data** — a genuinely common, real-world problem the moment you load actual data (a spreadsheet with some blank cells): Pandas represents a missing value as `NaN` ("Not a Number," a special float value), and provides dedicated methods for it:
```python
print(df.isna().sum())        # count of missing values, PER COLUMN (Day 8's axis mechanic underneath)
df_clean = df.dropna()          # remove any ROW that has at least one missing value
df_filled = df.fillna(0)         # replace every missing value with 0 (or any other chosen default)
```

---

## Summary

```
⓪ NumPy arrays (Day 8) have no column names/row labels — just
   numeric position. Pandas adds labels + mixed types + file-loading
   on top of NumPy. Series = labeled 1D array. DataFrame = labeled
   2D array (rows AND columns both labeled) — the type you'll use
   constantly. pip install pandas, import pandas as pd.

① Series: pd.Series([...], index=[...]) — access by label (series
   ["label"]) or position (series.iloc[0]). No index given -> default
   0,1,2,... labels, behaves like a plain NumPy 1D array.

② DataFrame: pd.DataFrame(dict_of_equal_length_lists) — dict keys
   become column names. df["col"] selects ONE column -> returns a
   Series. df[["col1","col2"]] (a LIST of names) selects MULTIPLE
   columns -> returns a DataFrame. Add a column like a dict key:
   df["new"] = ... (vectorized, Day 8 style, no loop).

③ .iloc[n] = select by PURE POSITION, ignoring labels. .loc[label] =
   select by the ACTUAL index label. Identical with the default 0,1,2
   index — but filtering/reordering makes original labels and current
   positions diverge, so .iloc[1] and .loc[1] can give DIFFERENT rows
   (or .loc can raise KeyError if that label no longer exists) after
   filtering. This divergence is the real reason both exist.

④ df[df["col"] > value] filters rows — SAME boolean-masking mechanism
   as Day 8's NumPy arrays (a Series IS a labeled NumPy array
   underneath). Combining conditions still needs & / | with each
   condition in parentheses — plain and/or still fail, same reason
   as Day 8.

⑤ pd.read_csv(path) loads a file into a DataFrame — the realistic
   starting point for real work. .head() previews first 5 rows
   (never print a huge DataFrame whole). .shape/.columns/.dtypes
   inspect structure. df.to_csv(path, index=False) saves back
   (index=False avoids writing the row-label column as real data).
   Missing values show as NaN — df.isna().sum() counts them per
   column, df.dropna()/df.fillna(value) are the two standard fixes.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 10 (Matplotlib & Seaborn, Jupyter Notebook, API Requests).*
