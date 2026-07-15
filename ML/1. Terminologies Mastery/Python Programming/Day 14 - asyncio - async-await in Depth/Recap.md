# Day 14 Recap — asyncio / async-await in Depth

## The core rule (builds on Day 0 ⑦)

- `asyncio` only helps **I/O-bound** work (waiting on network/disk/timers) — never **CPU-bound** work (constant computation). A single thread can't compute two things at once, `async` or not.
- **From our discussion:** JS has the identical limitation — an `async function` full of pure computation (no real `await` points) still freezes the whole browser tab/Node process, exactly like Python. Genuine CPU-bound parallelism needs a heavier mechanism in both languages: Web Workers/Worker Threads in JS, `multiprocessing` in Python (Python additionally has the GIL, preventing true multi-core parallelism via plain threads — a wrinkle JS doesn't have).

## Coroutines and `await`

```python
async def fetch_data():
    print("start")
    await asyncio.sleep(3)
    print("end")
    return "data"
```

- `async def` → calling it does NOT run the body. It immediately returns a **coroutine object** (same "returns a pausable thing without running it" idea as Day 4's generator objects).
- `await` = pause THIS coroutine right here, hand control back to the event loop to do other work, resume exactly here once the awaited thing is ready. Mechanically parallel to `yield`'s pause-and-preserve-state.

### The trap — confirmed live in this session

```python
fetch_data()     # returns a coroutine object, body NEVER RUNS — no "start", no wait, no "end"
```

Actual terminal output hit during this session:

```
playground.py:66: RuntimeWarning: coroutine 'fetch_data' was never awaited
  fetch_data()
```

This is Python's real, built-in signal for exactly this mistake — calling an `async def` function with no `await` and no `asyncio.run()` silently does nothing (no crash), and the warning is the only clue something's wrong.

**Fix — one of two ways, depending on context:**

```python
asyncio.run(fetch_data())     # from the TOP-LEVEL entry point of a script
await fetch_data()             # from INSIDE another already-running async def function
```

Once fixed: prints `start`, pauses ~3 real seconds, prints `end`, returns `"data"`.

## `asyncio.gather()` ≈ JS's `Promise.all()`

```python
results = await asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3))
# [10, 20, 30] — same order as passed in, regardless of which finishes first internally
```

- Runs multiple coroutines **concurrently** — their waiting periods overlap, so total time ≈ the longest single wait, not the sum of all waits (e.g. 3 tasks each waiting 2s → ~2s total, not 6s).
- Still single-threaded — only one coroutine's code executes at any instant; "concurrency" = rapid switching between paused coroutines during idle wait time, never literal simultaneous execution.
- **From our discussion — the failure-handling difference:** plain `asyncio.gather()` matches plain `Promise.all()` (first exception raised propagates immediately, other pending tasks' results are lost). `asyncio.gather(..., return_exceptions=True)` matches JS's `Promise.allSettled()` instead — waits for every coroutine to finish, puts any exception object directly into the results list instead of crashing the whole batch.

## `asyncio.run()`

- Creates a new event loop, runs the given coroutine to completion, shuts the loop down, returns its result. Called **exactly once**, at the true top-level entry point — every other `async def` should be `await`ed from inside `main()`, not wrapped in its own separate `asyncio.run()`.

---

## The event loop, side by side — JS vs Python

### JS's event loop (browser/Node) — always running, provided by the HOST, not the language

Call Stack on the left, WebAPIs on the right, the two Queues (Microtask, Macrotask) and the Event Loop in the middle:

```
①  CALL STACK (left)                     ②  WebAPIs (right)

┌─────────────────────────┐              ┌────────────────────────  ┐
│  JS ENGINE               │             │   Timers (setTimeout)    │
│  (one frame at a time,   │──async call►│   FS (Node)              │
│  single-threaded)        │  made here  │   Network (fetch)        │
│                          │  (fetch,    │                          │
│  console.log("a")        │  setTimeout,│  Does the ACTUAL waiting,│
│  logger("a")             │  fs.readFile│  OUTSIDE the JS engine   │
│  main()                  │  ...)       │                          │
└────────────▲─────────────┘             └────────────┬─────────────┘
             │                                          │
             │ EVENT LOOP pushes the                    │ once ready (timer
             │ next queued item onto                     │ fired, response
             │ the stack — ONLY once                     │ arrived), dropped
             │ the call stack is EMPTY                   ▼ into a queue below
             │                    ┌─────────────────────────────   ┐
             │                    │  ③ MICROTASK QUEUE (middle)    │
             │                    │  .then()  .catch()  .finally()  │
             │                    │  — drains FULLY, before even    │
             │                    │  ONE macrotask runs             │
             │                    ├────────────────────────────     ┤
             │                    │  MACROTASK QUEUE                │
             │                    │  setTimeout  I/O callback  onclick│
             └────────────────────└───────────────┬───────────────   ┘
                                                  │
                                                  ▼
                                  ┌─────────────────────────────┐
                                  │  ④ EVENT LOOP                │
                                  │                               │
                                  │  "is the call stack empty?    │
                                  │  if yes: drain ALL microtasks,│
                                  │  then take ONE macrotask,     │
                                  │  push it onto the stack"       │
                                  └─────────────────────────────┘
```

**Reading the flow in order:** ① your sync code runs on the Call Stack. ② hitting `fetch`/`setTimeout`/etc. hands the actual waiting off to WebAPIs — this is the ONE moment work leaves the JS engine entirely. ③ once that finishes, the WebAPI drops the callback into a queue — Microtask for Promise continuations, Macrotask for timers/I/O/DOM events. ④ the Event Loop's one job: repeatedly check "is the Call Stack empty?" — if yes, drain the ENTIRE Microtask Queue first, then take exactly one item from the Macrotask Queue and push it onto the Call Stack to run.

**The condition the event loop actually checks, stated plainly:** "Is the call stack (right side) completely empty right now?" If yes — pull the next item, microtasks first (drain ALL of them), then one macrotask, push it onto the stack, let it run to completion, then check again. This loop runs continuously, forever, for the life of the page/process — that's what makes it "always running."

**Key point (from Day 0, restated here with the mechanism named):** the event loop itself is NOT part of the JavaScript language — it's provided by whichever environment is running your JS (the browser's own event loop + Web APIs, or Node's event loop + **libuv**, the C library that actually implements Node's async file/network I/O under the hood). This is why the event loop is *always present* in JS — you never "turn it on," it's baked into the hosting environment from the start.

### Python's `asyncio` event loop — NOT always running, YOU start it explicitly

Same three roles as JS's diagram above, same left → middle → right order — "Call Stack" becomes "Currently-Running Coroutine," "WebAPIs" becomes "OS-level Async I/O," and the two separate queues (Microtask/Macrotask) collapse into just ONE (a real, named difference from JS):

```
①  RUNNING NOW (left)                    ②  OS-LEVEL ASYNC I/O (right)

┌─────────────────────────-┐             ┌─────────────────────────-┐
│  CURRENT COROUTINE       │             │   epoll (Linux)          │
│  (only ONE runs at a     │             │   kqueue (macOS)         │
│  time — same idea as     │──hits an──► │   IOCP (Windows)         │
│  JS's one-frame-at-a-    │  `await`    │                          │
│  time Call Stack)        │             │  asyncio talks to these  │
│                          │             │  DIRECTLY — no separate  │
│  print("start")          │             │  library like libuv      │
│  await asyncio.sleep(3)  │             │  needed                  │
│  print("end")            │             │                          │
│                          │             │  Does the ACTUAL waiting,│
└────────────▲─────────────┘             │  OUTSIDE your Python code│
             │                            └────────────┬─────────────┘
             │                                          │
             │ EVENT LOOP resumes the                    │ once ready (timer
             │ paused coroutine EXACTLY                  │ elapsed, socket has
             │ where its `await` left off                │ data), marked READY
             │                                          ▼
             │                    ┌─────────────────────────────- ┐
             │                    │  ③ READY QUEUE (middle)      │
             │                    │                               │
             └────────────────────│  asyncio's ready coroutines   │
                                  │  — ONE queue only, NOT split  │
                                  │  into microtask/macrotask     │
                                  │  the way JS's is              │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌─────────────────────────────--┐
                                  │  ④ asyncio EVENT LOOP        │
                                  │                               │
                                  │  "whose turn is it next?      │
                                  │  resume that coroutine, run   │
                                  │  it until its NEXT await, or  │
                                  │  until it returns"            │
                                  └─────────────────────────────--┘
```

**Reading the flow in order — deliberately mirroring JS's numbered flow above:** ① your coroutine runs, same single-frame-at-a-time idea as JS's Call Stack. ② hitting `await` hands the actual waiting off to the OS's own async I/O layer (epoll/kqueue/IOCP) — asyncio talks to these DIRECTLY, with no separate library playing libuv's role. ③ once ready, that coroutine gets marked ready and placed in asyncio's ready-queue — but unlike JS, **there's only ONE queue here, no microtask/macrotask split**. ④ the asyncio Event Loop's one job: pick the next ready coroutine, resume it exactly where its `await` paused it, and let it run until it hits another `await` or returns.

**The one difference too structural to fit inside the boxes: this whole loop does not exist until `asyncio.run(main())` creates it, and shuts down completely once `main()` finishes** — unlike JS's loop, which is already running, permanently, the moment the browser tab/Node process starts, whether your code uses it or not.

**The core structural difference (from our discussion, made concrete here):** JS's event loop is provided by the host (browser/Node) and is ALWAYS running, whether your code uses it or not — this is why plain `fetch()`/`setTimeout()` just work with no setup. Python's event loop does NOT exist until `asyncio.run(...)` explicitly creates one — there is no equivalent of "the environment already has a loop running in the background." Once created though, the actual mechanism is conceptually the same shape: hand off waiting to the OS/host layer (libuv for Node, direct OS primitives like epoll/kqueue for asyncio), get notified when ready, resume the paused code. JS additionally splits its queue into microtasks (Promises) vs macrotasks (setTimeout, I/O) with microtasks always draining first — `asyncio` has no equivalent split, just one underlying scheduling mechanism.

## Still need to cover

- `example.py`/`playground.py` completeness pass for Day 14 (currently mid-use, per this session's live debugging).
- Real multi-threading/multiprocessing depth (`threading`, `multiprocessing`, the GIL) — named as the CPU-bound answer here, but full depth is out of this track's scope.

