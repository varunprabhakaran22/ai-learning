# Week 1 Integration Project, Python version — the SAME "Smart CLI
# Assistant" as example.js (stateless calls, system prompts, parameter
# presets, token counting/cost, sliding-window history), rebuilt in Python
# using the real, official `anthropic` Python SDK. This is the FIRST of
# one `example_production.py` per week (see CLAUDE.md) — deliberately the
# simplest one: no framework yet (no LangGraph, no Pydantic), because none
# of Week 1's concepts need one. Later weeks' production files introduce
# ONE new package each, only once that week's concept genuinely needs it —
# this file is the floor everything else builds up from.
#
# You're new to Python, so every genuinely new piece of syntax gets a
# comment covering THREE things: (1) what the Python syntax itself does
# mechanically, (2) what the package/function is and why it's used here,
# (3) what this line accomplishes in the flow. Nothing here assumes you've
# seen Python before — if a construct looks trivial to someone who already
# knows Python, it still gets explained, because you don't yet.
#
# Package used, and why:
#   - anthropic (the official Python SDK) — the direct Python equivalent
#     of the `@anthropic-ai/sdk` npm package example.js uses. Same
#     company, same API, same method names, just Python's calling
#     convention instead of JavaScript's. Nothing else is used this week —
#     no ORM, no framework, no retry library — because Week 1's actual
#     content (stateless calls, system prompts, parameters, token
#     counting) doesn't need anything beyond the raw SDK.
#
# Install: pip install anthropic
#
#   User types a question (a loop, reading from the terminal)
#        │
#        ▼
#   classify(question)          -- Day 3: keyword heuristic, no LLM call
#        │
#        ▼
#   fit_to_budget(history)      -- Day 4: count tokens, trim oldest if over budget
#        │
#        ▼
#   client.messages.create(...) -- Day 1 + 2: system prompt + trimmed history
#        │                          + preset's temperature/top_p
#        ▼
#   reply appended to history (Day 1: memory you manage yourself, the API
#        │                     call itself is stateless every single time)
#        ▼
#   session token/cost totals updated (Day 4)
#        │
#        ▼
#   back to the prompt loop (until user types "exit")

# `import re` brings in Python's own built-in regular-expression module
# (part of the standard library, no pip install needed) — used below by
# classify() for the exact same keyword-pattern matching example.js does
# with JavaScript's built-in RegExp.
import re
# `import os` is Python's standard library module for reading environment
# variables, among other OS-level things — `os.environ` is how Python
# reads `ANTHROPIC_API_KEY` from your shell, equivalent to Node's
# `process.env.ANTHROPIC_API_KEY`.
import os

# `from anthropic import Anthropic` pulls the `Anthropic` class out of the
# `anthropic` package (installed via `pip install anthropic`) — this one
# class is the entire SDK's entry point, same role as
# `require("@anthropic-ai/sdk")` in the JS version.
from anthropic import Anthropic

# Constructing an Anthropic CLIENT object — `os.environ["ANTHROPIC_API_KEY"]`
# reads that environment variable's value (raises an error if it's not
# set, which is what you want here — better to fail loudly than run with
# no key). `client` below is now the reusable object every API call goes
# through, exactly like `client` in example.js.
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

MODEL = "claude-sonnet-5"
CONTEXT_WINDOW = 200_000  # Python allows underscores inside number literals purely for readability — 200_000 is just 200000
MAX_REPLY_TOKENS = 1024

# A plain Python dict literal — `{"input": 3, "output": 15}` — same
# concept as a JS object literal, just Python's curly-brace-with-colons
# syntax. Check current pricing before trusting these numbers (same
# caveat as example.js's version of this constant).
PRICE_PER_MTOK = {"input": 3, "output": 15}

SYSTEM_PROMPT = "You are a helpful assistant. Be clear and concise."

# --- Day 3: Parameter Presets ---------------------------------------------
# A dict of dicts: PRESETS["factual"] is itself a dict with its own keys.
# Same shape/purpose as example.js's PRESETS object — each preset carries
# a `reason` field stating WHY that temperature/top_p combination fits the
# use case, per the syllabus's explicit requirement.
PRESETS = {
    "factual": {
        "temperature": 0.2,
        "top_p": 1.0,
        "reason": "facts/code need low temperature - consistent, not creative",
    },
    "creative": {
        "temperature": 1.0,
        "top_p": 0.9,
        "reason": "creative writing needs high temperature; top_p 0.9 trims the weird 0.1% tail",
    },
    "structured": {
        "temperature": 0,
        "top_p": 1.0,
        "reason": "structured output (JSON/lists) needs temp 0 - same shape every time",
    },
    "conversational": {
        "temperature": 0.7,
        "top_p": 1.0,
        "reason": "everyday chat - balanced between consistent and varied",
    },
}


# --- Day 3: Question Classification ----------------------------------------
# `def classify(question):` — Python's function-definition syntax: `def`,
# the function name, parameters in parentheses, then a colon starting an
# indented block. Unlike the JS version, there's no `function` keyword and
# no curly braces — INDENTATION ITSELF is what marks a block's start/end
# in Python; every line indented under this `def` is part of this
# function's body.
def classify(question):
    # `.lower()` is a STRING METHOD — a function attached to string
    # objects themselves, called with dot notation — converting the
    # string to lowercase. Same job as JS's `.toLowerCase()`.
    q = question.lower()

    # `re.search(pattern, q)` uses Python's built-in regex module (`re`,
    # imported above) to search `q` for a match against `pattern` — this
    # returns a match object (truthy) if found, or `None` (falsy) if not,
    # which is why `if re.search(...):` works directly as a condition,
    # same as example.js's `if (/pattern/.test(q))`.
    if re.search(r"\b(write a story|imagine|poem|creative|brainstorm)\b", q):
        return "creative"
    if re.search(r"\b(json|list only|format as|schema|table)\b", q):
        return "structured"
    if re.search(r"\b(what is|explain|define|how does|why does|calculate)\b", q):
        return "factual"
    return "conversational"


# --- Day 4: Token Counting ---------------------------------------------
# `def count_tokens(messages, system):` — Python convention is
# snake_case function names (count_tokens), unlike JS's camelCase
# (countTokens) — purely a naming-style difference, not a functional one.
def count_tokens(messages, system):
    # `client.messages.count_tokens(...)` — the Python SDK's method names
    # are snake_case too (count_tokens, not countTokens), but it's the
    # SAME underlying API endpoint as example.js's `client.messages.countTokens(...)`.
    # Passing arguments as `name=value` (e.g. `model=MODEL`) is Python's
    # KEYWORD ARGUMENT syntax — equivalent to JS passing one options
    # object `{model, system, messages}`.
    result = client.messages.count_tokens(model=MODEL, system=system, messages=messages)
    return result.input_tokens


def estimate_cost(input_tokens, output_tokens):
    input_cost = (input_tokens / 1_000_000) * PRICE_PER_MTOK["input"]
    output_cost = (output_tokens / 1_000_000) * PRICE_PER_MTOK["output"]
    return input_cost + output_cost


# --- Day 4: Sliding Window ----------------------------------------------
def fit_to_budget(history, system, new_message):
    fixed_cost = count_tokens([{"role": "user", "content": new_message}], system)
    budget = CONTEXT_WINDOW - MAX_REPLY_TOKENS - fixed_cost

    kept = []
    running_total = 0
    dropped_count = 0

    # `range(len(history) - 1, -1, -1)` generates a countdown sequence:
    # start at the last valid index, stop before -1 (i.e. include 0), step
    # -1 each time — this is Python's way of writing a REVERSE for-loop
    # (there's no direct equivalent of JS's `for (let i = ...; i >= 0; i--)`
    # syntax in Python; `range` with a negative step is how you get the
    # same countable countdown).
    for i in range(len(history) - 1, -1, -1):
        message = history[i]
        message_tokens = count_tokens([message], system)

        if running_total + message_tokens > budget:
            dropped_count = i + 1
            break

        # `.insert(0, message)` inserts `message` at position 0 (the
        # front) of the `kept` list — Python lists don't have JS's
        # `.unshift()` method; `.insert(0, x)` is the equivalent
        # "add to the front" operation.
        kept.insert(0, message)
        running_total += message_tokens

    if dropped_count > 0:
        print(f"  (dropped {dropped_count} oldest message(s) to fit budget)")
    return kept


# --- Session state ---------------------------------------------------------
# Two plain variables holding this session's running state — same role as
# example.js's `history`/`sessionTokens` variables, just declared at
# module level in Python (no `let`/`const` keyword needed; a bare
# `name = value` at the top level of a Python file is how you declare a
# variable there).
history = []
session_tokens = {"input": 0, "output": 0}


def ask(user_message):
    # `global session_tokens` tells Python "when this function modifies
    # session_tokens, modify the ONE at module level, don't create a new
    # local variable with the same name" — Python requires this
    # declaration whenever a function needs to REASSIGN a variable defined
    # outside it (reading it needs no such declaration; only writing to it
    # does). JS has no equivalent requirement — this is a genuine Python-
    # specific rule worth knowing.
    global history, session_tokens

    preset = PRESETS[classify(user_message)]
    trimmed_history = fit_to_budget(history, SYSTEM_PROMPT, user_message)
    trimmed_history.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model=MODEL,
        system=SYSTEM_PROMPT,
        messages=trimmed_history,
        max_tokens=MAX_REPLY_TOKENS,
        temperature=preset["temperature"],
        top_p=preset["top_p"],
    )

    reply = response.content[0].text
    trimmed_history.append({"role": "assistant", "content": reply})
    history = trimmed_history

    session_tokens["input"] += response.usage.input_tokens
    session_tokens["output"] += response.usage.output_tokens

    return reply, preset


# --- CLI loop ---------------------------------------------------------
# `if __name__ == "__main__":` — see Week 6 Day 1's example_production.py
# for the full explanation of this pattern (runs this block only when the
# file is executed directly, not when imported elsewhere).
if __name__ == "__main__":
    print("Smart CLI Assistant (Python) - type your question, or 'exit' to quit.\n")

    # `while True:` is Python's infinite-loop syntax — runs forever until
    # something inside explicitly `break`s or `return`s out of it. Same
    # role as example.js's recursive `promptLoop()` calls, just written as
    # a loop instead of recursion (Python has no special tail-call
    # optimization, so a genuinely infinite CLI loop is written this way,
    # not via a function calling itself repeatedly).
    while True:
        # `input("> ")` is a built-in Python function: it prints the given
        # prompt, waits for the user to type a line and press Enter, then
        # returns what they typed as a string — Python's terminal input is
        # SYNCHRONOUS (the whole program pauses here), unlike Node's
        # callback-based `readline` interface used in example.js.
        question = input("> ").strip()

        if question.lower() == "exit":
            cost = estimate_cost(session_tokens["input"], session_tokens["output"])
            print(f"\nSession totals: {session_tokens['input']} input tokens, {session_tokens['output']} output tokens")
            # `:.6f` inside an f-string's `{...}` is a FORMAT SPEC — it
            # tells Python "print this number as a fixed-point decimal
            # with exactly 6 digits after the decimal point," same
            # rounding/display job as JS's `.toFixed(6)`.
            print(f"Estimated cost: ${cost:.6f}")
            break

        reply, preset = ask(question)
        # `next(name for name, p in PRESETS.items() if p == preset)` —
        # `PRESETS.items()` gives (key, value) pairs from the dict;
        # `name for name, p in ... if p == preset` is a generator
        # expression picking out just the key whose value matches; `next(...)`
        # takes the first (and here, only) result. This is the Python
        # equivalent of example.js's `Object.keys(PRESETS).find(...)` —
        # just a different route to "find which preset name this object came from."
        preset_name = next(name for name, p in PRESETS.items() if p == preset)
        print(f"\n[preset: {preset_name} - {preset['reason']}]")
        print(reply, "\n")
