# Day 14 — `asyncio` / async-await in Depth

---

## ⓪ Picking up exactly where Day 0 ⑦ left off

Day 0 established the one-sentence version: **Python is synchronous/blocking by default — a plain script never has a background event loop unless you explicitly `import asyncio` and call `asyncio.run(...)` yourself.** It also showed the basic shape (`async def`, `await`, `asyncio.sleep`, `asyncio.run(main())`) and one concrete trap (calling an async function without `await` just returns an unstarted coroutine object). This day goes to full depth on top of that foundation — nothing here contradicts Day 0; everything here explains the mechanism underneath what Day 0 already showed working.

**Why this matters for you specifically, restated from Day 0:** classical ML/DL/NLP work (the rest of this `Terminologies Mastery` syllabus) is synchronous top-to-bottom — train, wait, get a result. `asyncio` becomes directly relevant once you're building anything that waits on many independent, slow, external things at once — an API-calling agent, a backend serving multiple users, a tool making several web requests in parallel (`Applied AI Syllabus`/`Agentic AI GenAI Program` territory later in this syllabus).

---

## ① The actual problem async solves — waiting, not computing

**The precise distinction that matters, stated first because everything else depends on it:** `asyncio` helps with tasks that spend most of their time **waiting** on something external (a network response, a file finishing disk I/O, a timer) — not tasks that spend their time **computing**. This is the single most important thing to get right before touching any syntax.

```
CPU-bound work (asyncio does NOT help):        I/O-bound work (asyncio DOES help):

training a model, running a big loop,          waiting for an API response,
number-crunching — the CPU is BUSY the         waiting for a database query,
entire time, no waiting involved                waiting for a file to download
```

**Why the distinction matters mechanically:** Day 0 already established Python (like JS) is single-threaded — only one line of code runs at any instant. If a task is CPU-bound (constantly computing), there's no "waiting" moment for anything else to sneak in during — the CPU is the bottleneck, and `asyncio` cannot make one CPU compute two things simultaneously. But if a task is I/O-bound (mostly waiting on something external to respond), that waiting time is otherwise completely wasted — your program does nothing useful while a network request is in flight. `asyncio` lets your program **use that idle waiting time to make progress on other tasks**, instead of sitting frozen.

**The concrete payoff, made real with numbers:** imagine fetching data from 5 different APIs, each taking 2 seconds to respond.
```python
import requests
import time

start = time.time()
for url in urls:
    requests.get(url)     # BLOCKS for the full 2 seconds, one request at a time
print(time.time() - start)   # ~10 seconds total (5 x 2s, one after another)
```
```python
import asyncio
import httpx

async def fetch_all(urls):
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        return await asyncio.gather(*tasks)     # ③ explains gather precisely

start = time.time()
asyncio.run(fetch_all(urls))
print(time.time() - start)      # ~2 seconds total — all 5 requests were WAITING simultaneously
```
The second version isn't computing anything faster — it's overlapping the *waiting* time across all 5 requests, since none of them need the CPU while waiting for their response to arrive.

---

## ② Coroutines, `await`, and what actually happens at the moment of an `await`

Day 0 named the "coroutine object" briefly (`fetch_data()` alone returns one, does nothing until awaited/run). Here's the precise mechanism.

```python
async def fetch_data():
    print("start")
    await asyncio.sleep(3)
    print("end")
    return "data"
```

**`async def` marks a function as a coroutine function** — calling it does not run its body at all (matching Day 0's exact trap); it immediately returns a **coroutine object**, a paused-before-even-starting task description, structurally similar to Day 4's generator object (calling `count_up_to(3)` didn't run the body either — same underlying "returns a pausable thing" idea, different mechanism specialized for async work instead of manual `next()` calls).

**`await` is the point where control can be handed back to the event loop.** This is the single mechanical fact everything else in this day depends on: `await something` means "pause THIS coroutine right here, hand control back to whatever's running the event loop, and let it go do other work — resume me exactly here once `something` is actually ready." This is conceptually identical to Day 4's `yield` pausing a generator mid-function and preserving its exact local state — `await` is doing the same pause-and-preserve-state trick, but specifically wired into the event loop's scheduling, rather than requiring a manual `next()` call from outside.

```
await asyncio.sleep(3)
        │
        ▼
"I'm going to be unavailable for about 3 seconds.
 Event loop: go run something ELSE useful during that time.
 Come back and resume me, right at this exact line, once
 the 3 seconds are up."
```

**You can only use `await` inside a function declared `async def`** — this isn't a style rule, it's enforced; using `await` inside a plain `def` is a `SyntaxError`, because a plain synchronous function has no way to pause itself and hand control back to anything.

---

## ③ Running multiple coroutines concurrently — `asyncio.gather`

A single `await` on its own doesn't get you concurrency by itself — `await task_one()` followed by `await task_two()` still runs them one after another, each one's waiting time wasted rather than overlapped, exactly like the blocking `requests` loop in ①. **`asyncio.gather()` is what actually runs multiple coroutines concurrently**, letting their individual waiting periods overlap:

```python
import asyncio

async def fetch_one(n):
    print(f"starting {n}")
    await asyncio.sleep(2)
    print(f"finished {n}")
    return n * 10

async def main():
    results = await asyncio.gather(
        fetch_one(1),
        fetch_one(2),
        fetch_one(3),
    )
    print(results)      # [10, 20, 30]

asyncio.run(main())
```
```
starting 1
starting 2
starting 3
(all three wait ~2 seconds TOGETHER, not one after another)
finished 1
finished 2
finished 3
[10, 20, 30]
```

**What's actually happening mechanically:** `asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3))` hands all three coroutine objects to the event loop at once. Each one runs until its own `await asyncio.sleep(2)` line, at which point it pauses and hands control back — the event loop immediately starts the *next* coroutine, which also runs to its own `await` and pauses, and so on. Because all three are "waiting" during the same overlapping window, the total time is ~2 seconds (the longest single wait), not ~6 seconds (2+2+2, if run one after another) — this is the direct, concrete mechanism behind ①'s "5 APIs in ~2 seconds instead of ~10" example.

**This is still single-threaded, worth restating precisely since it's easy to mistake for parallelism:** at any given instant, only one coroutine's code is actually executing — the "concurrency" here is entirely about overlapping *waiting* periods, achieved by rapidly switching which paused coroutine gets resumed next, never by literally running Python code on two CPU cores at once (that would need a genuinely different mechanism — threads or multiprocessing — outside this day's scope).

---

## ④ `asyncio.run()` — the one required entry point, and why

Day 0 already flagged that **you** must explicitly start the event loop — nothing async happens automatically. `asyncio.run(main())` is that explicit start:

```python
async def main():
    print("hello from async")

asyncio.run(main())
```

**What `asyncio.run()` actually does, precisely:** creates a brand-new event loop, runs the given coroutine (`main()`) inside it until that coroutine fully completes, then shuts the event loop down and returns the coroutine's result. It's meant to be called **exactly once**, at the true top-level entry point of a script — every other `async def` function in your program should be `await`ed from inside `main()` (directly or indirectly), never wrapped in its own separate `asyncio.run()` call.

**A common, real mistake this section exists to prevent:** calling an `async def` function directly, without `await` or `asyncio.run()`, silently does nothing useful — this is Day 0's exact trap, restated with the mechanism now fully explained:
```python
async def greet():
    print("hi")

greet()          # returns a coroutine OBJECT — "hi" never prints, no error, just silently unstarted
```
Python does not raise an error here (a real, sharp gotcha) — it just quietly hands you back an unused coroutine object. Recent Python versions do emit a `RuntimeWarning: coroutine 'greet' was never awaited` in this exact situation, which is worth actually reading if you ever see it — it's pointing at precisely this mistake.

---

## Summary

```
⓪ Builds directly on Day 0 ⑦: Python is sync/blocking by default,
   asyncio is opt-in, asyncio.run() is the required explicit start.
   Not needed for classical ML/DL/NLP ahead — relevant later for
   agent/API/backend work.

① asyncio helps I/O-BOUND work (waiting on network/disk/timers), NOT
   CPU-bound work (constant computation) — a single-threaded CPU
   can't compute two things at once regardless of asyncio. The payoff
   is overlapping WAITING time across multiple tasks, not making any
   single computation faster.

② async def marks a coroutine function — calling it returns a
   coroutine OBJECT immediately, runs NOTHING until awaited/run
   (same "returns a pausable thing without running the body" idea as
   Day 4's generator objects). await PAUSES the current coroutine
   at that exact line, hands control back to the event loop to do
   other work, and resumes exactly there once the awaited thing is
   ready — mechanically parallel to yield's pause-and-preserve-state,
   wired into the event loop's scheduler instead of manual next().
   await is ONLY legal inside an async def function.

③ asyncio.gather(coro1, coro2, coro3) runs multiple coroutines
   CONCURRENTLY — each runs until its own await, pauses, hands back
   to the event loop, which starts the next one. Their waiting
   periods OVERLAP, so total time ≈ the longest single wait, not the
   sum of all waits. Still single-threaded — only one coroutine's
   code executes at any given instant; "concurrency" here means
   rapid switching between paused coroutines during idle wait time,
   NOT literal simultaneous execution on multiple CPU cores.

④ asyncio.run(main()) creates the event loop, runs main() to
   completion, shuts the loop down, returns the result — called
   EXACTLY ONCE, at the true top-level entry point. Calling an
   async def function directly, without await or asyncio.run(),
   silently returns an unused, never-started coroutine object — no
   error by default, though recent Python emits a RuntimeWarning
   ("coroutine was never awaited") pointing at exactly this mistake.
```

---

*This completes the Python Programming track (Day 0 + Days 1-14). Next: `Machine Learning` (6 days), per the Terminologies Mastery Syllabus.*
