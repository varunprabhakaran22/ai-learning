# Day 10 Recap — Matplotlib & Seaborn, Jupyter Notebook, API Requests

## Matplotlib
- Foundational, lower-level plotting library. `plt.show()` is required to actually render anything — everything before it just builds the chart internally.
```python
import matplotlib.pyplot as plt

ages = [25, 30, 35, 40, 45]
salaries = [40000, 55000, 62000, 70000, 85000]

plt.plot(ages, salaries)
plt.xlabel("Age")
plt.ylabel("Salary")
plt.title("Age vs Salary")
plt.show()          # opens a native OS window when run from a plain .py script
```
- **From our discussion:** running this via `python3 script.py` (not a notebook) opens a separate native GUI window, not something rendered inside the terminal — the script actually pauses at `plt.show()` until that window is closed.
- Chart types: `plt.plot` (trend over a sequence), `plt.scatter` (relationship between two variables), `plt.bar` (comparing categories), `plt.hist` (distribution of one variable).

## Seaborn
- Built ON TOP of Matplotlib (still needs `plt.show()`), for polished statistical charts in less code — takes `data=df` + column **names** as strings, not raw arrays.
```python
import seaborn as sns   # note: plt must ALSO be imported if used standalone (caught this gap ourselves)

sns.scatterplot(data=df, x="age", y="salary", hue="department")   # hue = auto color-code by category
plt.show()
```
- **From our discussion:** a Theory.md code block assumed `plt` was already imported from an earlier section — a real completeness gap when copying just one snippet out on its own. Always check a snippet has every import it uses before running it standalone.
- `sns.histplot`/`boxplot`/`heatmap` are common; full statistical interpretation deferred to the ML track's evaluation days.

## Jupyter Notebook
- Interactive, cell-based execution (`.ipynb`) instead of running a whole `.py` script top to bottom each time. All cells share ONE running Python session (the "kernel").
- **From our hands-on (`playground.ipynb`):**
  - A cell's output (a table, a chart) renders **inline**, directly below it — no separate terminal, no popup window (unlike running the same `plt.show()` from a plain `.py` script, which DOES open a native window).
  - Running one cell makes its variables available to every OTHER cell too, without re-running anything — e.g. `df` loaded in cell 1 is usable directly in cell 3.
  - **Critical trap:** the `[1]`, `[2]`, `[3]` numbers next to each cell show *execution order*, not page position. Editing and re-running an earlier cell after a later one already ran can leave the notebook's visible code out of sync with what's actually in memory. "Restart Kernel and Run All Cells" resets to a clean, verified top-to-bottom state — the real fix, not just a convenience.
- **From our discussion — creating a notebook properly:** use the editor's actual "Create: New Jupyter Notebook" command (or Jupyter's own "New → Notebook" button) — a plain empty text file saved with a `.ipynb` extension is NOT a valid notebook (0 bytes, no cells, nothing to click into). VS Code then prompts to select a kernel (the Python environment to run cells with) and may ask to install `ipykernel` — a one-time setup package distinct from the `notebook` package (which runs the browser-based Jupyter server).
- **From our discussion — real-world usage:** notebooks dominate exploration/experimentation and shareable analysis (Kaggle, tutorials, one-off reporting), but production code (model-serving, pipelines, anything tested/version-controlled properly) is written as plain `.py` modules instead — notebooks are genuinely hard to diff/review/test at scale. The realistic pattern: prototype in a notebook, then extract stable logic into proper `.py` files.

## API requests
- `requests.get(url)` = Python's `fetch()`. `.status_code` = HTTP status (200 success, 404/500 failure). `.json()` = automatic JSON-string-to-dict conversion (literally Day 5's `json.loads()`, done for you).
```python
import requests

try:
    response = requests.get("https://api.example.com/weather?city=Bangalore", timeout=5)
    response.raise_for_status()      # turns a bad status code into a real exception
    data = response.json()
    print(data["temperature"])
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
```
- `requests.post(url, json={...})` sends data, auto-converting a dict into a JSON request body.

## Hands-on setup (from this session)
- Installed a shared venv at `Python Programming/venv/` (one level up from individual day folders) rather than per-day — `pip install matplotlib` pulled in NumPy automatically as a dependency.
- **`source venv/bin/activate` is per-terminal-session, not per-command** — activate once, then `cd` freely between day folders and run scripts without reactivating. Confirmed by the `(venv)` prefix staying in the prompt. A new terminal tab needs its own activation.
- `pip list` / `pip freeze` show installed packages (Day 7's `package.json`-equivalent check). `pip install -r requirements.txt` is Pandas/Python's version of `yarn install` — but unlike yarn, there's no automatic default file lookup; `-r requirements.txt` must always be stated explicitly.

## Still need to cover
- `example.py` for Day 10 — not yet written (playground.py and playground.ipynb exist and were used hands-on).
