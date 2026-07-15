# Day 10 — Matplotlib & Seaborn, Jupyter Notebook, API Requests

---

## ⓪ Three independent topics, grouped as "everyday surrounding tools"

Like Day 7, today's three topics don't mechanically depend on each other — they're grouped because together they round out the everyday toolkit for working with data: **visualizing it** (Matplotlib/Seaborn), **the environment you'll typically do that work in** (Jupyter Notebook), and **getting data from the outside world in the first place** (API requests). Days 8-9 gave you NumPy arrays and Pandas DataFrames to hold and manipulate data — today covers seeing it, working with it interactively, and fetching it.

---

## ① Matplotlib — the foundational plotting library

**The problem:** a table of numbers (a NumPy array, a Pandas column) is hard to spot patterns in by eye. A chart makes trends, outliers, and relationships immediately visible. **Matplotlib** is Python's foundational plotting library — older, lower-level, and the base that most other Python plotting tools (including Seaborn, ②) are built on top of.

```python
import matplotlib.pyplot as plt

ages = [25, 30, 35, 40, 45]
salaries = [40000, 55000, 62000, 70000, 85000]

plt.plot(ages, salaries)     # a line plot
plt.xlabel("Age")
plt.ylabel("Salary")
plt.title("Age vs Salary")
plt.show()                     # actually DISPLAYS the chart — nothing appears without this
```

`import matplotlib.pyplot as plt` is the near-universal import convention, same idea as `np`/`pd`. **`plt.show()` is not optional decoration — without it, no window/output appears at all**, since everything before it (`plt.plot`, `plt.xlabel`, etc.) only *builds up* the chart internally; `.show()` is the command that actually renders it.

**The most common chart types, and when each fits:**
```python
plt.plot(x, y)          # LINE plot — good for showing a trend over a continuous sequence (e.g. time)
plt.scatter(x, y)        # SCATTER plot — good for showing the relationship between two variables, point by point
plt.bar(categories, values)   # BAR chart — good for comparing distinct categories against each other
plt.hist(data)             # HISTOGRAM — good for showing the DISTRIBUTION of a single variable (how spread out/skewed it is)
```

**Working directly with a Pandas column (Day 9) — the realistic, everyday case:**
```python
import pandas as pd

df = pd.DataFrame({"age": [25, 30, 35, 40], "salary": [40000, 55000, 62000, 70000]})
plt.scatter(df["age"], df["salary"])
plt.show()
```
A Pandas `Series` (a column) works directly as `plt`'s `x`/`y` input — no manual conversion needed, since a `Series` behaves like an array wherever one is expected (Day 9, ⓪).

---

## ② Seaborn — built on Matplotlib, for statistical charts with less code

**The problem Seaborn solves:** Matplotlib is powerful but low-level — building a well-styled statistical chart (e.g. one that shows a trend line, confidence interval, and color-coded categories together) takes many manual `plt` calls. **Seaborn** is a separate library, built directly on top of Matplotlib (it uses Matplotlib internally to actually render), that provides higher-level functions producing polished statistical charts in far less code — and it's built to work directly with Pandas DataFrames, using column *names* as arguments rather than raw arrays.

```python
import seaborn as sns

df = pd.DataFrame({
    "age": [25, 30, 35, 40, 45, 28, 33],
    "salary": [40000, 55000, 62000, 70000, 85000, 48000, 58000],
    "department": ["Eng", "Eng", "Sales", "Sales", "Eng", "Sales", "Eng"],
})

sns.scatterplot(data=df, x="age", y="salary", hue="department")
plt.show()     # Seaborn still relies on plt.show() to actually render — it's built ON Matplotlib
```

Notice the calling convention is different from raw Matplotlib: `data=df` names the DataFrame once, then `x`/`y` refer to **column names as strings**, not raw arrays — Seaborn reads the actual values out of the DataFrame internally. `hue="department"` automatically color-codes points by that column's categories — a single extra argument, versus manually splitting the data and calling `plt.scatter()` three separate times (once per department) to achieve the same effect in raw Matplotlib.

**A few Seaborn chart types worth recognizing on sight**, since you'll see these constantly once reaching the ML/statistics-heavy days ahead:
```python
sns.histplot(data=df, x="salary")               # distribution of one column, styled automatically
sns.boxplot(data=df, x="department", y="salary")  # compare a numeric column ACROSS categories — shows
                                                      # median, quartiles, and outliers all at once
sns.heatmap(df.corr(numeric_only=True))            # a grid of colors showing correlation BETWEEN every
                                                      # pair of numeric columns — extremely common for
                                                      # a first look at a new dataset
```
Full depth on interpreting these specific chart types (what a boxplot's whiskers mean, what a correlation heatmap's colors indicate) belongs to the Machine Learning track's later days on evaluation/statistics — here, the goal is recognizing that these functions exist and roughly what each is for, not yet full statistical interpretation.

**When to reach for which:** Matplotlib, when you need precise, custom control over every element of a chart, or a simple one-off plot. Seaborn, when the data is already in a DataFrame and you want a polished statistical chart (especially anything involving categories/`hue`, distributions, or comparing groups) with minimal code. Real data-science work uses both routinely, often together (Seaborn for the chart, occasional raw `plt.` calls layered on top for a small custom tweak).

---

## ③ Jupyter Notebook — an interactive, cell-based way to run Python

**The problem with a plain `.py` script for data work specifically:** every script you've written so far runs top to bottom, once, printing output to a terminal, then exits. For exploring data — trying an operation, looking at the result, adjusting, trying again — re-running an entire file from scratch every time (re-loading a large CSV, re-computing everything before the one line you actually changed) is slow and wasteful. **Jupyter Notebook** is an interactive, browser-based environment for running Python in small, independent, re-runnable chunks called **cells**, with each cell's output (including charts, ①②) displayed directly beneath it, inline.

```
A notebook file (.ipynb) is a SEQUENCE of cells:

┌─────────────────────────────────────┐
│ [1]  import pandas as pd            │   <- a CODE cell — run it, see its output
│      df = pd.read_csv("data.csv")   │      directly below, without re-running
├─────────────────────────────────────┤      anything else
│ [2]  df.head()                       │
│      (output: a table, shown         │   <- output appears INLINE, right here —
│       right here, below the cell)    │      no separate terminal window
├─────────────────────────────────────┤
│ [3]  df["age"].mean()                │   <- can run/re-run THIS cell alone,
│      (output: 34.5)                  │      reusing df already loaded in [1]
└─────────────────────────────────────┘
```

**The core mechanic worth understanding precisely: all cells in a notebook share one single running Python session underneath (called the "kernel").** Running cell `[1]` (loading `df`) means `df` now exists in memory for every *other* cell too — you can run cell `[3]` alone, referencing `df`, without re-running cell `[1]` again, as long as it already ran at some point in this session. This is the entire point of the format: load/compute something expensive once, then freely experiment on it across many small, fast, independent re-runs — as opposed to a `.py` script, where changing one line means re-running the entire file top to bottom again.

**The numbers in `[1]`, `[2]`, `[3]`** show the *order cells were actually executed in* — not necessarily their order on the page. This is a real, practical trap: you can run cells out of order (e.g. edit and re-run cell `[1]` *after* already running cell `[3]`), and the notebook will not automatically re-run anything downstream for you — leading to a notebook whose visible code doesn't necessarily match what's actually in memory anymore, unless you re-run cells deliberately in the correct order. "Restart kernel and run all" (a real, standard menu option) exists specifically to reset this and confirm the notebook runs correctly top-to-bottom from a clean state — a common, necessary sanity check before trusting or sharing a notebook's results.

**Practical setup:** `pip install notebook`, then `jupyter notebook` from the terminal launches it in your browser. (Jupyter notebooks are also directly supported inside VS Code itself, without needing the separate browser-based launcher — same `.ipynb` format either way.)

---

## ④ API requests — fetching data from outside your program

**The problem:** so far, all data has come from code you typed (Day 2's lists/dicts) or a local file (Day 9's CSV). Real-world data frequently lives on a remote server instead — a weather service, a stock price feed, an ML model hosted elsewhere. An **API** (Application Programming Interface) is, concretely, a defined way one program can ask another program (usually running on a different, remote computer) for data or to perform an action — most commonly over HTTP, the same protocol your browser uses to load web pages.

**Python's `requests` library** (installed via `pip install requests`) is the standard, idiomatic way to make these HTTP calls — matching JS's `fetch()`:

```python
import requests

response = requests.get("https://api.example.com/weather?city=Bangalore")
print(response.status_code)     # 200 = success (same HTTP status codes as any web request)
print(response.json())            # parses the response body as JSON directly into a Python dict/list
                                    # (this IS Day 5's json.loads(), done for you automatically)
```

```
JS:                                              Python:

const response = await fetch(url);               response = requests.get(url)
const data = await response.json();              data = response.json()
```

**`.status_code`** — the same HTTP status codes used across the entire web: `200` (success), `404` (not found), `401`/`403` (authentication/permission failure), `500` (server-side error). Checking this before trusting `.json()`'s contents is standard practice — a failed request often still returns *some* body, but it won't be the data you expected.

**`.json()`** does exactly what Day 5's `json.loads()` does — converts a JSON-formatted response body directly into Python `dict`/`list` structures — `requests` just calls that conversion for you as a convenience method, so you don't need to call `json.loads(response.text)` yourself manually (though that's literally what's happening underneath).

**A realistic full pattern, combining this with Day 5's exception handling:**
```python
try:
    response = requests.get("https://api.example.com/weather?city=Bangalore", timeout=5)
    response.raise_for_status()      # raises an exception automatically if status_code indicates failure
    data = response.json()
    print(data["temperature"])
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
```
`timeout=5` caps how many seconds to wait before giving up on a slow/unresponsive server — without it, a hung network request could block your program indefinitely. `.raise_for_status()` is a convenience method that turns a bad HTTP status code (`404`, `500`, etc.) into an actual Python exception, so you can catch it with the same `try`/`except` pattern from Day 5, rather than manually checking `.status_code` yourself every time.

**Sending data, not just requesting it — `POST`, briefly**: `requests.get(...)` retrieves data; `requests.post(url, json={...})` sends data to a server (e.g. submitting a form, or sending a prompt to an AI model's API) — the `json=` argument automatically converts your Python dict into a JSON request body, mirroring `.json()`'s automatic conversion on the way back. Full depth on building/consuming APIs is out of scope for this track (it belongs to backend/web-specific material), but recognizing `requests.get`/`.post`/`.json()`/`.status_code` on sight is the practical bar for this day, since you'll see this exact pattern used to call real ML APIs later in this syllabus (the Agentic AI / GenAI track).

---

## Summary

```
⓪ Three independent tools grouped as "everyday surrounding
   tooling": visualizing data, an interactive environment to work
   in, and fetching data from outside your program.

① Matplotlib (import matplotlib.pyplot as plt) — foundational,
   lower-level plotting. plt.plot/scatter/bar/hist for line/scatter/
   bar/histogram charts. plt.show() is REQUIRED to actually render
   anything — everything before it just builds the chart internally.
   Works directly with Pandas Series/NumPy arrays as x/y input.

② Seaborn (import seaborn as sns) — built ON TOP of Matplotlib
   (still needs plt.show()), for polished statistical charts in less
   code. Takes data=df + column NAMES (x="col", y="col") rather than
   raw arrays. hue="col" auto-color-codes by category. sns.histplot/
   boxplot/heatmap are common; full statistical interpretation
   deferred to the ML track's evaluation/statistics days.

③ Jupyter Notebook — interactive, browser-based, CELL-based
   execution (.ipynb files) instead of running a whole .py script
   top to bottom each time. ALL cells share ONE running Python
   session (the "kernel") — run a cell once, its variables stay
   available to every other cell without re-running it. Cell run
   order (shown as [1],[2],[3]...) reflects EXECUTION order, not
   page position — running cells out of order can desync what's
   visible from what's actually in memory; "Restart kernel and run
   all" resets to a clean, verified top-to-bottom state.

④ APIs — a defined way one program asks another (usually remote)
   for data/action, typically over HTTP. requests.get(url) = Python's
   fetch(). .status_code = HTTP status (200 success, 404/500 etc.
   failure). .json() = automatic JSON-string-to-dict conversion
   (literally Day 5's json.loads(), done for you). .raise_for_status()
   turns a bad status code into a real exception, catchable with
   Day 5's try/except. requests.post(url, json={...}) sends data,
   auto-converting a dict to a JSON request body.
```

---

*Next: `example.py` — a small runnable script exercising every rule above, then Day 11 (Type Hints & the `typing` Module).*
