# Day 7 — Modules & Packages, Virtual Environments, Git & GitHub

---

## ⓪ A shift in kind — from language rules to project tooling

Days 1-6 covered the Python *language itself* — syntax and mechanics true of any single `.py` file, in isolation. Day 7 is different in kind: it's about **organizing multiple files into a project**, **managing which external code your project depends on**, and **tracking how your code changes over time**. None of this is Python syntax — it's the surrounding tooling every real Python project (and every real JS project, via its own equivalents) actually needs. Each of the three topics below is independent of the other two; they're grouped into one day because together they form "how a project is actually set up and maintained," not because they mechanically depend on each other.

---

## ① Modules — one `.py` file, reusable from another

**The problem:** so far, every example has lived in a single file, run top to bottom. Real programs split code across multiple files for organization — and need a way for one file to *use* code defined in another. A **module** is simply any single `.py` file, considered from the point of view of "something another file can import from."

```python
# math_utils.py
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

PI = 3.14159
```

```python
# main.py — a DIFFERENT file, in the same folder
import math_utils

print(math_utils.add(2, 3))         # 5
print(math_utils.PI)                  # 3.14159
```

`import math_utils` loads `math_utils.py` and makes everything defined in it accessible through `math_utils.<name>` — matching JS's `import * as mathUtils from './mathUtils.js'`, though Python's plain `import module_name` (no path, no file extension) is the default, everyday form.

**Two other import styles, both real and commonly seen:**
```python
from math_utils import add, PI      # pull SPECIFIC names directly into this file's scope
print(add(2, 3))                      # 5 — no math_utils. prefix needed now
print(PI)

from math_utils import add as sum_two_numbers    # import AND rename, same idea as JS's `as`
print(sum_two_numbers(2, 3))                        # 5
```

```
JS:                                              Python:

import mathUtils from './mathUtils.js';         import math_utils
import { add, PI } from './mathUtils.js';       from math_utils import add, PI
import { add as sumTwo } from './mathUtils.js'; from math_utils import add as sum_two_numbers
```

**The `if __name__ == "__main__":` pattern — a real, common piece of syntax you'll see in nearly every serious Python file, worth explaining precisely rather than just recognizing by shape.** Every Python file has a built-in variable, `__name__`, automatically set by Python itself: if the file is being **run directly** (`python3 math_utils.py`), `__name__` equals the string `"__main__"`. If the file is instead being **imported** by another file (`import math_utils`), `__name__` equals `"math_utils"` (the module's own name) instead.

```python
# math_utils.py
def add(a, b):
    return a + b

if __name__ == "__main__":
    print("Running math_utils.py directly — testing add():", add(2, 3))
```

Running `python3 math_utils.py` directly prints the test line — but `import math_utils` from `main.py` does **not** print it, since `__name__` is `"math_utils"`, not `"__main__"`, in that context. This lets a file serve double duty: usable as an importable module by other files, while also being independently runnable/testable on its own — a pattern you'll see constantly once reading real ML scripts and libraries.

---

## ② Packages — a folder of modules, organized together

**The problem:** once a project has many modules (many `.py` files), a flat folder of files becomes unwieldy. A **package** is a folder containing multiple related modules, importable as a group — Python's version of organizing files into subfolders the way a JS project organizes files into directories under `src/`.

```
my_project/
├── main.py
└── utils/                  <- this folder is a PACKAGE
    ├── __init__.py            <- (often empty) marks this folder as a package
    ├── math_utils.py
    └── string_utils.py
```

```python
# main.py
from utils import math_utils
from utils.string_utils import capitalize_all

print(math_utils.add(2, 3))
print(capitalize_all("hello"))
```

**`__init__.py`** is a special, often-empty file whose mere presence tells Python "treat this folder as an importable package, not just an ordinary folder." (Modern Python versions have relaxed this requirement somewhat, but you will see `__init__.py` in essentially every real package you read — including inside libraries like NumPy/Pandas themselves — so recognizing its purpose matters even if you rarely need to write meaningful code inside it yourself at this stage.)

**Installing someone else's package — `pip`.** Everything above covers packages *you* write. The vast majority of real Python code relies on packages *other people* published — NumPy, Pandas, and everything else this track's later days use. **`pip`** is Python's package installer, matching npm/`npm install` in the JS world:

```bash
pip install numpy              # installs the numpy package, matches: npm install numpy-equivalent
pip install numpy==1.26.0      # install a SPECIFIC version, matches package.json's version pinning
pip freeze                      # list all currently installed packages + versions, matches package-lock.json's role
pip freeze > requirements.txt   # save that list to a file — Python's package.json/lockfile equivalent
pip install -r requirements.txt # install everything listed in requirements.txt, matches `npm install` reading package.json
```

`requirements.txt` is a plain text file, one package (optionally with a version) per line — the direct, if less structured, equivalent of `package.json`'s dependency list.

---

## ③ Virtual environments — why every project needs its own isolated install

**The problem, made concrete:** suppose Project A needs `numpy==1.20`, and Project B (on the same computer) needs `numpy==1.26`. If `pip install` always installed packages *globally* (one shared location for the entire machine, the same for every project), the two projects would conflict — installing one version for Project B would silently break Project A's assumptions. JS avoids this automatically, because `npm install` already installs packages **per-project**, into that project's own local `node_modules/` folder, by default. **Python's `pip install`, by contrast, installs globally by default** — this is a real, structural difference, not just a style choice, and it's exactly the gap virtual environments exist to close.

A **virtual environment** is an isolated, self-contained copy of Python plus its own separate package installation location, created per-project — so each project can have its own independent set of package versions, matching what `node_modules/` gives you automatically in JS, except in Python you must explicitly create and activate it yourself.

```bash
python3 -m venv venv          # create a virtual environment, in a folder named "venv"
source venv/bin/activate       # ACTIVATE it (Mac/Linux) — your terminal now uses THIS environment
# (venv) now appears in your terminal prompt, confirming it's active

pip install numpy               # installs into THIS venv only — not globally, not affecting other projects
deactivate                       # exit the virtual environment, back to your normal system Python
```

```
JS:                                    Python:

npm install numpy-equivalent           python3 -m venv venv
  → installs into ./node_modules/        source venv/bin/activate
  → automatic, no activation step        pip install numpy
    needed, scoped by folder               → installs into ./venv/, but
    structure alone                          requires explicit activation
                                              first — not automatic by
                                              folder location alone
```

**Why this matters concretely, and why you'll see it in essentially every real Python project's setup instructions:** without a virtual environment, every `pip install` on your machine goes to one shared, global Python installation — meaning two unrelated projects on the same computer can silently fight over which version of a package is installed, and upgrading one project's dependencies can quietly break a completely different project that happens to share your system's Python. Activating a project-specific `venv` before running `pip install` is the standard, expected practice — almost every README for a Python project you'll ever clone will start with "create a virtual environment, activate it, then `pip install -r requirements.txt`."

---

## ④ Git — version control, same tool as JS projects use

Git itself is **not Python-specific at all** — it's the same version control system used across virtually all software projects, JS included. Nothing here differs by language; this section exists because file/project organization (②③) and tracking a project's history (Git) belong together as "how a real project is actually run," and because it hasn't been formally covered yet in this track.

**The core mental model:** Git tracks changes to your files over time as a series of **commits** — named snapshots you create deliberately, each one capturing "the state of these files, at this point, with this message describing why."

```
Working directory  →  Staging area  →  Repository (committed history)
   (your files,          (git add)        (git commit — a permanent
    as you edit them)                      snapshot, with a message)
```

**The everyday commands:**
```bash
git init                          # start tracking a NEW project with git (once, per project)
git status                        # see what's changed since the last commit
git add file.py                   # stage a specific file — mark it to be included in the NEXT commit
git add .                         # stage ALL changed files (use carefully — see below)
git commit -m "Add math_utils"    # take a snapshot of everything staged, with a message
git log                            # view the history of commits
```

**Why `git add` is a separate step from `git commit` at all — the "staging area" is a real, deliberate feature, not needless ceremony:** it lets you choose *exactly* which changed files go into the next snapshot, even if you've changed many files at once. E.g. if you fixed a bug in `math_utils.py` AND separately started an unrelated, half-finished change in `string_utils.py`, you can `git add math_utils.py` alone and commit *just* that fix, leaving the unfinished file unstaged and out of this commit — JS/Node projects using Git work identically, since this is Git's own behavior, not a Python-specific wrapper around it.

**Branches** — a way to work on a change in isolation, without affecting the main, working version of the code, until you're ready to merge it back in:
```bash
git branch new-feature            # create a new branch
git checkout new-feature           # switch to it (or: git checkout -b new-feature, does both at once)
# ... make commits on this branch, isolated from main ...
git checkout main                  # switch back
git merge new-feature               # bring new-feature's commits into main
```

---

## ⑤ GitHub — a remote host for Git repositories, plus collaboration features

**Git** (④) works entirely on your own computer — it doesn't require the internet at all. **GitHub** is a separate, cloud-hosted service that stores a copy of your Git repository remotely, enabling backup, sharing, and collaboration — the relationship is roughly "Git is the tool, GitHub is one particular place you can additionally send your Git history to" (GitLab and Bitbucket are direct competitors offering the same kind of hosting).

```bash
git remote add origin https://github.com/username/my-project.git   # link your LOCAL repo to a GitHub repo
git push origin main               # upload your local commits TO GitHub
git pull origin main                # download and merge any new commits FROM GitHub
git clone https://github.com/username/my-project.git   # copy an EXISTING GitHub repo onto your computer
```

`origin` is simply the conventional name for "the remote repository this project is linked to" — not a keyword with special meaning beyond being the default name Git suggests.

**Pull requests (PRs)** — a GitHub-specific (not Git-specific) feature: propose merging one branch's commits into another (commonly a feature branch into `main`), giving others a chance to review the actual code changes, comment on specific lines, and approve before the merge happens. This is a collaboration/review workflow layered on top of Git's branching, not a Git command itself — it lives entirely on GitHub's side (or GitLab's/Bitbucket's own equivalent feature).

---

## Summary

```
⓪ Day 7 = project tooling, not language syntax: how files organize
   into modules/packages, how dependencies get installed and
   isolated per-project, and how project history gets tracked.

① A module = one .py file, importable by another via `import module`,
   `from module import name`, or `from module import name as alias`.
   if __name__ == "__main__": runs only when the file is executed
   directly, NOT when it's imported — lets one file serve as both an
   importable module and a standalone script.

② A package = a folder of modules, marked importable by __init__.py.
   pip = Python's package installer (matches npm). requirements.txt =
   Python's package.json equivalent (pip freeze > requirements.txt to
   create it, pip install -r requirements.txt to install from it).

③ pip installs GLOBALLY by default — a real structural difference
   from npm, which scopes to node_modules/ per-project automatically.
   A virtual environment (python3 -m venv venv + source venv/bin/
   activate) creates an isolated, per-project install location,
   closing that gap — but unlike npm, it must be explicitly created
   AND activated, it doesn't happen automatically by folder location.

④ Git = version control (not Python-specific). Commits are
   deliberate snapshots: git add (stage specific files) -> git commit
   -m "message" (snapshot exactly what's staged). Staging is a real
   feature — lets you commit only some of your changed files, not
   all-or-nothing. Branches (git branch/checkout) isolate in-progress
   work from main until merged (git merge).

⑤ GitHub = a remote HOST for git repos (Git itself needs no
   internet) — enables backup/sharing/collaboration. git push/pull
   sync local <-> GitHub. git clone copies an existing GitHub repo
   locally. Pull requests are a GitHub-specific (not Git-specific)
   review/collaboration feature layered on top of branches.
```

---

*Next: `example.py` — a small runnable script/project structure exercising every rule above, then Day 8 (NumPy).*
