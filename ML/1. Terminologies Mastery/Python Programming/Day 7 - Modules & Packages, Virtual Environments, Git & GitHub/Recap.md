# Day 7 Recap — Modules & Packages, Virtual Environments, Git & GitHub

## Modules
- A module = one `.py` file, importable by another. `import module_name` brings in the whole module (access via `module_name.thing`). `from module_name import thing` pulls specific names directly into scope (no prefix needed). `as` renames either form.
- **Critical (from our discussion): Python has no `export` keyword at all.** Every top-level name in a module is automatically importable — the opposite of JS, where nothing is importable unless explicitly exported. The closest Python convention for "not meant to be used externally" is a leading underscore (`_helper`), but it's not enforced, just a signal.
- **From our discussion — the real trade-off between the two import forms:** `import module_name` keeps every call site traceable to its source (`np.array(...)`) but requires the prefix everywhere. `from module import x, y` is shorter but only brings in exactly what's listed (nothing else from that module is available), and risks silent name collisions if two different modules define something with the same name.
- **`if __name__ == "__main__":`** — from our discussion: this is NOT about "the main file" of a project. Every `.py` file gets a `__name__` variable set by Python: `"__main__"` if that file was the one directly run (`python3 file.py`), or the module's own name (e.g. `"math_utils"`) if it was loaded via someone else's `import`. Same file, different value, depending purely on how it was triggered to run *this time* — lets one file serve as both an importable module and a standalone/testable script.

## Packages
- A package = a folder of modules, marked importable by `__init__.py` (often empty, but its presence is what matters).
- `pip` = Python's package installer (matches npm). `requirements.txt` = Python's `package.json`-equivalent dependency list (`pip freeze > requirements.txt` to create it, `pip install -r requirements.txt` to install from it).

## Virtual environments
- **Critical: `pip install` installs globally by default** — a real structural difference from npm, which automatically scopes to `node_modules/` per project. This is exactly the gap a venv closes.
- `python3 -m venv venv` just creates the isolated folder on disk — it does NOT change what the terminal currently uses.
- **From our discussion — why activation is a separate, necessary step:** the terminal's `PATH` decides which `python3`/`pip` running those commands actually resolves to; by default that's the global install. `source venv/bin/activate` is what rewrites the current terminal session's `PATH` to point at the venv's own copies instead — without this step, `pip install` would silently install globally even with the venv folder sitting right there, unused.
- Activation is scoped to the **current terminal session only** — closing the terminal or opening a new tab reverts to the global Python by default; each session needs its own `source venv/bin/activate`.
- **Multiple venvs (from our discussion):** one venv folder per project, never shared. Switching projects means `deactivate` then `cd` + `source .../activate` into the other. Only one venv can be active per terminal session at a time — but separate terminal tabs/sessions can each have a different project's venv active simultaneously with zero interference, since activation state is per-session, not machine-wide.

## Git
- Not Python-specific — same tool used across all of software, JS included.
- Commits are deliberate snapshots: `git add` (stage specific files) → `git commit -m "message"` (snapshot exactly what's staged).
- The staging area is a real, deliberate feature — lets you commit only some changed files, not all-or-nothing, e.g. committing a finished fix while leaving an unrelated half-done change unstaged.
- Branches (`git branch`/`checkout`) isolate in-progress work from `main` until merged (`git merge`).

## GitHub
- A separate, cloud-hosted service that stores a remote copy of a Git repo — Git itself needs no internet at all.
- `git push`/`git pull` sync local ↔ GitHub. `git clone` copies an existing GitHub repo locally. `origin` is just the conventional name for "the linked remote," not a special keyword.
- Pull requests are a GitHub-specific (not Git-specific) review/collaboration feature layered on top of branches.

## Still need to cover
- `example.py` and `playground.py` for Day 7 — hands-on practice not yet done (same as Days 3, 4, 6).
