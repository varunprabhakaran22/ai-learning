# Day 0 — Runtime Model: Interpreter vs Compiler, Bytecode, Sync vs Async

## ⓪ Why this day exists, before Day 1 even starts

Every day from here on will show you Python syntax and ask you to run it. Before that's useful, one thing needs to be nailed down: **what actually happens when you type `python3 example.py` and hit enter** — what program is doing the work, why it needs to exist at all, and what "running" even means for this language. This isn't one of the syllabus's 80 terms — it's the ground everything else stands on, the same role Day 1 of `RAG & Knowledge Systems` played for that syllabus (state the real problem before naming any jargon).

You already know JavaScript. The fastest way to build a correct Python mental model is to build it as a set of precise contrasts against what you already know — not by treating Python as something alien.

---

## ① Nothing runs on your CPU except machine code — everything else is translation

Your Mac's CPU (Apple Silicon = ARM architecture) only understands one thing: **machine code** — raw binary instructions, specific to that exact processor family. Every programming language that has ever existed — Python, JavaScript, C, Rust, all of them — is a human-readable format that has to get turned into machine code *somehow* before your CPU can do anything with it. No language "just runs" on hardware directly; that translation step always exists, it's just hidden from you at different points depending on the language.

There are two fundamentally different strategies for doing that translation, and the strategy a language picks determines almost everything else about how you interact with it day to day.

---

## ② Strategy 1 — Compiled languages (C, Rust, Go): translate once, ahead of time, then throw the translator away

A **compiler** is a program that reads your *entire* source file, translates all of it into machine code in one pass, and writes out a standalone binary/executable file. That binary is a finished artifact — you can copy it to another machine, run it a thousand times, and the compiler itself doesn't need to be present at all for any of those runs. It already did its job once, ahead of time.

```
source code (.c file)
        │
        ▼
  ┌───────────┐
  │ COMPILER  │   runs ONCE, ahead of time
  └───────────┘
        │
        ▼
  machine-code binary (.exe / a.out)
        │
        ▼
  run this binary as many times as you want —
  the compiler is no longer involved, or even present
```

**The consequence that matters most:** if the compiler finds an error anywhere in your file, it typically refuses to produce *any* binary at all. Compilation is an all-or-nothing pass that happens *before* execution ever begins — so a single mistake means literally nothing runs, not even the parts that were fine.

---

## ③ Strategy 2 — Interpreted languages (Python, JavaScript): translate and run, line by line, live, every single time

An **interpreter** is a program that reads your source code and executes it piece by piece, *on the spot*, in real time — there's no separate finished binary produced. This has a direct, concrete consequence: **the interpreter must be installed and present every single time you run your code**, because it isn't a one-time translator, it IS the thing doing the work, live, on every run.

This is exactly what you already have on your machine. When you ran `python3 --version` and got `Python 3.11.5` from `/opt/homebrew/bin/python3`, that `python3` file is not a stand-in or a launcher — it *is* the interpreter itself, a real program whose entire job is: read Python source, translate, execute, one statement at a time.

```
source code (example.py)
        │
        ▼
  ┌─────────────┐
  │ INTERPRETER │   ("python3") — reads AND executes,
  │  (python3)  │    live, every time you run this file
  └─────────────┘
        │
        ▼
  runs immediately — no separate binary is ever produced,
  and python3 must be present again for the NEXT run too
```

**Why you need it installed at all — the direct answer to "why do we need a Python interpreter":** a `.py` file is inert text, exactly the same way an `.html` file's `<script src="app.js">` is inert without some JS engine present to execute it. Text on disk does nothing by itself. `python3` is the program that turns that text into actual running behavior, and without it being installed on your machine, `example.py` is just a document nobody can act on.

---

## ④ The hidden middle step: bytecode — why Python isn't a *pure* line-by-line interpreter either

The honest picture is slightly more layered than "interpreter reads raw text and executes it directly," and this matters because the same nuance is true of JavaScript, which is the bridge to ⑤.

When you run a `.py` file, `python3` doesn't execute your literal source text character-by-character. It first does a **quick compile step internally**: it translates your source into **bytecode** — a simplified, lower-level instruction set that is *still not* raw CPU machine code, but is much faster for the next stage to work through than raw text would be. Then a component inside the same `python3` program, the **Python Virtual Machine (PVM)**, executes that bytecode, instruction by instruction, live.

```
example.py (source text)
        │
        ▼
┌──────────────────────┐
│ 1. Parse + compile to │   fast, internal, automatic —
│    BYTECODE           │   you don't invoke this yourself
└──────────────────────┘
        │
        ▼
   bytecode gets CACHED on disk, e.g. inside a
   __pycache__/ folder as a .pyc file — so if you
   run the same file again unchanged, this step is
   skipped and the cached bytecode is reused
        │
        ▼
┌──────────────────────┐
│ 2. Python Virtual     │   executes the bytecode,
│    Machine (PVM)      │   instruction by instruction, live
└──────────────────────┘
        │
        ▼
   your program's actual behavior (prints, calculations,
   file writes, etc.)
```

If you ever see a `__pycache__` folder appear next to your `.py` files with `.pyc` files inside — that's this cached bytecode, exactly what was just described, not a mysterious side effect.

**So which label is correct — compiled or interpreted?** Python is correctly classified as an **interpreted language**, because there is still no standalone, portable, machine-code binary produced that could run on its own without `python3` present — the bytecode is not runnable by the CPU directly and not portable the way a compiled C binary is; it only means anything when read by the PVM inside `python3`. But it is not a *naively pure* interpreter either — there's a real, if lightweight, compile-to-bytecode step hidden inside the same process. "Interpreted, with an internal bytecode-compilation step" is the precise answer.

---

## ⑤ JavaScript works the same way — and this is why you already have the right intuition

This exact two-stage shape (parse/compile to an intermediate form → then execute that form) is *also* how JavaScript engines work, whether that's V8 (Chrome, and Node.js) or another engine. V8 parses your JS into bytecode, then executes it — and additionally does further real-time optimization by compiling "hot" (frequently run) code paths into actual machine code mid-execution, a technique called JIT (Just-In-Time) compilation. Python's PVM does not JIT-compile by default the way V8 does (that's a real performance difference, not relevant to Day 0, but worth knowing the label for later), but the *core* shape — no separate ahead-of-time binary, an internal intermediate-bytecode stage, live execution — is the same category of runtime as Python's, not a different one. You already had the right mental model; it just had different names attached (V8, JIT) in the JS world.

---

## ⑥ Why an uncaught error halts execution *at that line* instead of undoing everything before it

This follows directly from ③ and ④, and it's the same behavior in both Python and JS, for the same underlying reason.

```python
print("this runs")      # executes, prints, done — this already happened
print(1 / 0)             # ZeroDivisionError — interpreter halts HERE
print("this never runs") # never reached
```

Because execution is happening live, statement by statement (③), whatever ran *before* the error already had its real-world effects — text already printed to your terminal, a variable already assigned, a file already written — and those effects are not undone when a later line fails. The interpreter simply stops progressing at the point of the uncaught error. This is a direct consequence of there being no separate all-or-nothing compilation pass: contrast this with ②'s compiled languages, where an error found during compilation means the compiler refuses to produce a binary at all, so *nothing* runs, not even the parts that were fine — because in that world, translation is a separate step that fully completes or fully fails *before* any execution begins.

This is exactly the same reason a `console.log("before")` followed by an uncaught `throw` in a synchronous JS script still shows "before" in your DevTools console — the error doesn't retroactively un-print anything that already ran.

---

## ⑦ Synchronous vs asynchronous — Python's default is *not* what JS trained you to expect

This is the part worth being precise about, because JS's behavior is actually the unusual one here, not Python's.

**JavaScript is single-threaded** — only one line of your JS executes at a time, same as Python; it is not "parallel" in the way people sometimes assume. What makes JS *feel* async-native is the **event loop**, a piece of machinery provided by whatever is hosting the JS engine — the browser, or Node.js — not by the JavaScript language itself. `fetch`, `axios`, `Promise`, `setTimeout` all work by handing a task off to something *outside* your single JS thread (the browser's networking stack, an OS timer), letting your JS thread keep running other code in the meantime, and then the event loop slots the callback/`.then()`/resumed `await` back onto the thread once that outside thing finishes. JS got this behavior because it was built to solve one specific, constant problem from day one: **a web page must never freeze while waiting on a network request** — so the entire runtime around the language was designed for non-blocking I/O from the start, with `async`/`await` added later (ES2017) as cleaner syntax over the same Promise mechanism.

**A plain Python script has no event loop by default.** Execution is synchronous and blocking, top to bottom:

```python
import time
print("start")
time.sleep(3)     # BLOCKS — the entire program freezes here for 3 full seconds;
                  # nothing else can happen during this wait, there is no
                  # background event loop quietly servicing anything else
print("end")
```

This is actually the more traditional default across most non-browser languages (C, Java's basic model, Ruby, plain Python) — it's JavaScript's browser-driven design that's the outlier for having async wired in from the beginning, because a slow terminal script was historically an acceptable trade-off in a way an unresponsive web page never was.

**Python does have an async system — it's opt-in, via the `asyncio` module, not automatic:**

```python
import asyncio

async def fetch_data():
    print("start")
    await asyncio.sleep(3)      # non-blocking — an event loop CAN run other
                                 # things during this wait, but only because
                                 # asyncio's event loop is running at all
    print("end")
    return "data"

async def main():
    result = await fetch_data()
    print(result)

asyncio.run(main())              # <- YOU must explicitly start the event loop;
                                  #    it does not exist until this call
```

Side by side with what you already know from JS:

| Concept | JavaScript | Python |
|---|---|---|
| Declare an async function | `async function fetchData() {}` | `async def fetch_data():` |
| Pause until something resolves | `await somePromise` | `await some_coroutine()` |
| The underlying "pending thing" | `Promise` | `Coroutine` object (from `asyncio`) |
| Who starts the event loop | Browser/Node — always running, automatically | **You**, explicitly, via `asyncio.run(main())` — nothing async happens until this line executes |
| Calling an async function directly (no `await`) | Returns a `Promise` immediately | Returns a coroutine **object** that has done nothing yet — a very common beginner mistake is calling `fetch_data()` alone and being confused why "start"/"end" never printed |
| Default HTTP request library | `axios` / `fetch` — async-native | `requests` — **synchronous/blocking** by default; `httpx`/`aiohttp` exist specifically for when you need async HTTP |

**The one-sentence version to keep permanently:** JS is async-by-default because the browser's event loop is always present whether you use it or not; Python is sync-by-default — a plain script never has a background event loop unless you explicitly `import asyncio` and call `asyncio.run(...)` yourself, at which point `async`/`await` behave almost identically to their JS counterparts.

**Where this fits going forward:** virtually all of `Terminologies Mastery`, `Machine Learning`, `Deep Learning`, and classical `NLP` ahead is synchronous, top-to-bottom code — train a model, wait, get a result — so `asyncio` will not come up again for a long stretch. It becomes directly relevant later at Day 14 (full `asyncio` depth) and again whenever backend/API/agent work resembling `Applied AI Syllabus` territory comes up.

---

## Summary

```
①  Nothing runs on the CPU except machine code — every language needs
   some translator to get there.

②  Compiled languages (C, Rust): a compiler translates the WHOLE file
   to machine code ONCE, ahead of time, producing a standalone binary.
   Compiler errors block ALL execution before anything runs.

③  Interpreted languages (Python, JS): translate AND execute live,
   piece by piece, on every run. The interpreter/engine must be
   present every single time — it's not a one-time step.

④  Python's interpreter (python3) internally compiles your source to
   BYTECODE first (cached in __pycache__/*.pyc), then the Python
   Virtual Machine executes that bytecode live. Still "interpreted"
   overall — no portable standalone binary is ever produced.

⑤  JS engines (V8) do the same shape — parse/compile to bytecode,
   then execute, plus further JIT-compiling hot paths to real machine
   code. Same category of runtime as Python, different specific
   optimizations.

⑥  An uncaught error halts execution AT THAT LINE, not retroactively —
   because execution already happened live, statement by statement,
   for everything before it. True in both Python and JS, for the
   same underlying reason (③).

⑦  JS is async-by-default only because the browser/Node ALWAYS runs
   an event loop underneath it. Python is sync/blocking by default —
   async requires explicitly importing `asyncio` and calling
   `asyncio.run(...)` yourself; once you do, `async`/`await` work
   almost identically to their JS counterparts.
```

---

*Next: Day 1 — Variables & Data Types.*
