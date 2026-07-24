# Week 5 Integration Project, production version — the same "Autonomous
# Task Agent" as example.js (memory + planning + tools + human gate, all
# four pillars from Days 1-4), rebuilt with real production packages
# instead of hand-rolled loops/state/gating. This is the ONE production
# example for all of Week 5 — Days 1-4 individually are too conceptual
# (a design/blueprint day, a memory day, a planning day, a human-gate day)
# for a standalone production file each to make sense; Day 5's integration
# project is the first point where "how would a real team actually build
# this whole thing" has a single, concrete, worthwhile answer.
#
# You're new to Python, so every line uses genuinely new syntax gets a
# comment covering THREE things: (1) what the Python syntax itself does
# mechanically, (2) what the package/function is and why it's used here,
# (3) what this line accomplishes in the flow — same standard as Week 6
# Day 1's example_production.py, extended to cover the extra syntax this
# file introduces (comprehensions, lambda, keyword-only args, unpacking).
#
# Packages used, and why:
#   - langgraph (StateGraph)            — the executor loop + planning/
#     replanning loop, same reasoning as Week 6 Day 1's example_production.py.
#   - langgraph.checkpoint (InMemorySaver) — SHORT-TERM memory: persists
#     graph state across multiple invoke() calls sharing the same
#     thread_id, which is what makes pausing for human approval (below)
#     possible at all — production would swap this for a durable
#     checkpointer (e.g. Postgres) so state survives a process restart.
#   - langgraph.store (InMemoryStore)   — LONG-TERM memory, separate from
#     the checkpointer: this is what Day 2's hand-rolled embed/store/
#     cosine-similarity vector store becomes in production — a real,
#     namespaced key-value + semantic-search store, persisted independent
#     of any one thread/session (production swaps this for a Postgres-
#     backed store too).
#   - langgraph.types (interrupt, Command) — the REAL human-in-the-loop
#     primitive. Day 4's hand-rolled `HumanGate.check()` (a plain function
#     call that immediately "approves") becomes an ACTUAL execution pause:
#     interrupt() halts the graph mid-node and returns control to whoever
#     called invoke(); the human's real decision resumes it later via
#     Command(resume=...) — this is what "pause and wait for a person"
#     really means, not a function call that returns instantly.
#   - langchain_anthropic (ChatAnthropic) — same structured-output/tool-
#     calling wrapper as Week 6 Day 1's production example.
#   - pydantic (BaseModel)               — the Plan schema (a list of typed
#     subtasks with dependsOn), replacing example.js's hand-parsed JSON.
#
# NOTE: as with Week 6 Day 1's production example, `create_react_agent` is
# deliberately NOT used (deprecated in favor of `create_agent`, which has
# had unstable availability in recent langchain releases) — every node
# below is a plain function calling ChatAnthropic directly.
#
#   START ──► retrieve_memory (long-term store lookup)
#        ──► plan (structured LLM call -> Plan)
#        ──► LOOP:
#              next_subtask (plain Python: dependency check, no LLM)
#                 │ no eligible subtask left
#                 ▼
#              (loop exits to commit_memory)
#                 │ eligible subtask found
#                 ▼
#              decide_action (LLM decides tool + input + confidence)
#                 │
#                 ▼
#              gate (plain Python: tier lookup) ──sensitive?──► interrupt()
#                 │ not sensitive, or human approved after resume         │
#                 ▼                                            rejected ◄─┘
#              execute_tool (real side effect)          re-plan, continue
#                 │
#                 ▼
#              detect_broken_assumption ──yes──► re-plan (same plan() call,
#                 │ no                             fed the new real fact)
#                 ▼
#              mark done, loop again
#        ──► commit_memory (write session summary to long-term store)
#        ──► END
#
# Install: pip install langgraph langchain-anthropic pydantic

# `uuid` is part of Python's own standard library (ships with Python, no
# pip install needed) — it generates random unique IDs. We use it below
# to create a fresh "thread_id" (a session identifier) and unique keys
# for stored memories.
import uuid
# Optional[X] is a type hint meaning "either a value of type X, OR the
# special value None" — e.g. Optional[Subtask] means "a Subtask object,
# or None if there isn't one." It's shorthand for Union[X, None].
from typing import Literal, Optional, TypedDict

from pydantic import BaseModel, Field
from langchain_anthropic import ChatAnthropic
from langgraph.graph import StateGraph, START, END
# InMemorySaver is LangGraph's SHORT-TERM memory mechanism — a
# "checkpointer" that saves the graph's state to memory after every step,
# keyed by thread_id, so the SAME graph run can be paused (e.g. by
# interrupt(), below) and resumed later without losing anything.
from langgraph.checkpoint.memory import InMemorySaver
# InMemoryStore is LangGraph's LONG-TERM memory mechanism — separate from
# the checkpointer above: this persists data across ENTIRELY DIFFERENT
# thread_ids/sessions (e.g. "what do we know about user X" that should
# still be there next week, not just within one paused-and-resumed run).
from langgraph.store.memory import InMemoryStore
# interrupt() is the function that actually PAUSES graph execution
# mid-node; Command is the class you use to RESUME a paused graph,
# carrying the human's real decision back in.
from langgraph.types import interrupt, Command


# --- Structured schemas (replace example.js's hand-parsed JSON strings) ---

class Subtask(BaseModel):
    id: int
    description: str
    # `list[int] = Field(default_factory=list)` — the type hint `list[int]`
    # means "a list containing only integers." `default_factory=list` tells
    # Pydantic "if no value is given for this field, call the list()
    # function fresh to create a NEW empty list as the default" — this is
    # Pydantic's required way of giving a field a default that's a mutable
    # container (a plain `= []` default would be a bug: every Subtask
    # instance would silently share the SAME list object instead of each
    # getting its own).
    depends_on: list[int] = Field(default_factory=list)
    # `Optional[Literal[...]] = None` reads as: "this field is either one
    # of these three exact tool-name strings, or it's None (meaning this
    # subtask is a pure reasoning step with no tool call)" — combining the
    # two type hints introduced above.
    tool: Optional[Literal["get_account_status", "send_message", "write_file"]] = None
    status: Literal["pending", "done"] = "pending"


class Plan(BaseModel):
    # `list[Subtask]` — a list where every item must be a Subtask instance
    # (not just any value) — Pydantic validates every item in the list,
    # not just the list's existence.
    subtasks: list[Subtask]


class ToolDecision(BaseModel):
    tool: Literal["get_account_status", "send_message", "write_file"]
    tool_input: dict = Field(description="Arguments for the tool call")
    # `ge=0, le=100` are Field CONSTRAINTS ("greater-or-equal to 0,
    # less-or-equal to 100") — Pydantic will reject a confidence value
    # outside this range at validation time, not silently accept it.
    confidence: int = Field(ge=0, le=100, description="Self-reported confidence 0-100")
    justification: str


# --- Day 4's tool registry, now with real risk tiers as plain data ---

# A `lambda` is Python's syntax for a small, ANONYMOUS function written
# inline, with no `def` and no name of its own — `lambda i: {...}` means
# "a function that takes one argument named `i` and returns the dict on
# the right." It's used here purely because each of these fake tool
# implementations is a one-line throwaway — the same simplification Day 2
# and Day 4's JS examples used with fake tool functions.
TOOL_REGISTRY = {
    "get_account_status": {"tier": "never-ask", "run": lambda i: {"card_status": "still expired", "pending_booking": True}},
    "send_message": {"tier": "always-ask", "run": lambda i: {"delivered": True}},
    "write_file": {"tier": "threshold-based", "threshold": 80, "run": lambda i: {"written": True, "path": i.get("path")}},
}


class AgentState(TypedDict):
    goal: str
    user_id: str
    relevant_memory: list[str]
    plan: Plan
    execution_log: list[dict]
    gate_log: list[dict]


planner_llm = ChatAnthropic(model="claude-sonnet-5").with_structured_output(Plan)
decision_llm = ChatAnthropic(model="claude-sonnet-5").with_structured_output(ToolDecision)


# --- Node: retrieve long-term memory BEFORE planning (Day 2's ordering) ---

# `def retrieve_memory_node(state: AgentState, *, store) -> dict:` — the
# `*,` before `store` is Python syntax meaning "everything after this MUST
# be passed by keyword name (store=...), never just positionally." This
# matters here because LangGraph itself calls this function and
# automatically supplies `store` for you (it injects the compiled graph's
# store object into any node function that declares a `store` parameter
# this way) — you never call retrieve_memory_node yourself with a second
# positional argument.
def retrieve_memory_node(state: AgentState, *, store) -> dict:
    # A tuple `(a, b)` is an ordered, fixed-size, immutable grouping of
    # values — LangGraph's Store uses a tuple like this as a "namespace":
    # a path identifying WHOSE memories these are (here: this user's
    # "memories" bucket), so different users' stored memories never mix.
    namespace = (state["user_id"], "memories")
    # Real semantic search over the store, replacing example.js's hand-rolled
    # embed() + cosineSimilarity() + .sort().slice() — same job, a real
    # package call. InMemoryStore supports this when configured with an
    # index; production swaps InMemoryStore for a Postgres-backed store.
    hits = store.search(namespace, query=state["goal"], limit=3)
    # `[hit.value.get("text", "") for hit in hits]` is a LIST
    # COMPREHENSION — Python's compact syntax for "build a new list by
    # taking one value out of each item in `hits`." It's equivalent to
    # writing a for-loop that appends to an empty list each time, just in
    # one line. `.get("text", "")` reads the "text" key off a dict,
    # falling back to an empty string if that key doesn't exist (instead
    # of crashing).
    memories = [hit.value.get("text", "") for hit in hits]
    print(f"[MEMORY] retrieved {len(memories)} relevant memories from the long-term store")
    return {"relevant_memory": memories}


# --- Node: planning — one structured LLM call, reused for replanning too ---

def plan_node(state: AgentState) -> dict:
    # `"\n".join(f"- {m}" for m in state["relevant_memory"]) or "(none)"`:
    # `f"- {m}" for m in ...` (no square brackets this time) is a GENERATOR
    # EXPRESSION — like the list comprehension above but produced one item
    # at a time instead of building the whole list upfront; `"\n".join(...)`
    # then glues all those pieces together with a newline between each.
    # The trailing `or "(none)"` uses Python's `or`: if the joined string
    # ends up empty (no memories at all), fall back to the literal text
    # "(none)" instead of showing a blank line.
    memory_block = "\n".join(f"- {m}" for m in state["relevant_memory"]) or "(none)"
    print("[PLANNING] asking the model for a structured subtask plan")
    plan: Plan = planner_llm.invoke(
        f"Goal: {state['goal']}\n\nRelevant memory:\n{memory_block}\n\n"
        "Break this into subtasks. Each subtask that requires an action must name a real tool: "
        "get_account_status, send_message, or write_file."
    )
    # `.model_dump()` is a Pydantic method every BaseModel instance has —
    # it converts the object back into a plain dict (the opposite
    # direction of Pydantic validating a dict INTO an object), which is
    # what we want here since the execution log is meant to be a plain,
    # printable/serializable record, not a live Plan object.
    return {"plan": plan, "execution_log": state["execution_log"] + [{"step": "plan-generated", "plan": plan.model_dump()}]}


def replan_node(state: AgentState, real_outcome: str) -> Plan:
    memory_block = "\n".join(f"- {m}" for m in state["relevant_memory"]) or "(none)"
    print(f"[REPLANNING] a real result changed the picture: {real_outcome}")
    return planner_llm.invoke(
        f"Goal: {state['goal']}\n\nRelevant memory:\n{memory_block}\n\n"
        f"This is a REPLAN. Current plan: {state['plan'].model_dump()}\n"
        f"Real outcome that just happened: {real_outcome}\n"
        "Revise the remaining (not-yet-done) subtasks accordingly, keeping completed ones as-is."
    )


# --- Plain Python: dependency resolution, no LLM call (Day 3's point) ---

def next_eligible_subtask(plan: Plan) -> Optional[Subtask]:
    # `{t.id for t in plan.subtasks if t.status == "done"}` uses CURLY
    # braces with a for-in-and-if clause — this is a SET comprehension
    # (like a list comprehension, but builds a set: a collection with no
    # duplicates and no guaranteed order, ideal here since we only care
    # "is this id present," not order or repeats).
    done_ids = {t.id for t in plan.subtasks if t.status == "done"}
    for t in plan.subtasks:
        # `all(dep in done_ids for dep in t.depends_on)` — `all(...)` is a
        # Python built-in that returns True only if EVERY item in the
        # generator expression passed to it is truthy; combined with `dep
        # in done_ids for dep in t.depends_on`, this reads as "every
        # dependency this subtask lists is already in the done set" — the
        # plain-code dependency check named in Theory.md, with no LLM
        # involved.
        if t.status == "pending" and all(dep in done_ids for dep in t.depends_on):
            return t
    return None


# --- Node: the executor loop body — one subtask per pass through this node ---

def execute_subtask_node(state: AgentState) -> dict:
    subtask = next_eligible_subtask(state["plan"])
    if subtask is None:
        return {}  # nothing eligible; route() below sends this to commit_memory

    if subtask.tool is None:
        subtask.status = "done"
        log = state["execution_log"] + [{"step": "subtask-done", "id": subtask.id, "note": "non-tool reasoning step"}]
        return {"plan": state["plan"], "execution_log": log}

    print(f"[EXECUTOR] deciding action for subtask {subtask.id}: {subtask.description}")
    decision: ToolDecision = decision_llm.invoke(
        f"Subtask: {subtask.description}\nUser ID: {state['user_id']}\n"
        f"Call the tool: {subtask.tool}. Report a confidence score 0-100 and a one-sentence justification."
    )

    tool_meta = TOOL_REGISTRY[decision.tool]
    # Python allows wrapping a boolean expression across multiple lines
    # inside parentheses purely for readability — this is still one single
    # `or`/`and` expression, just formatted onto three lines.
    needs_approval = (
        tool_meta["tier"] == "always-ask"
        or (tool_meta["tier"] == "threshold-based" and decision.confidence < tool_meta["threshold"])
    )

    gate_entry = {
        "subtask_id": subtask.id,
        "tool": decision.tool,
        "tier": tool_meta["tier"],
        "confidence": decision.confidence,
        "gated": needs_approval,
    }

    if needs_approval:
        # THE REAL PAUSE: interrupt() actually halts graph execution here and
        # hands `payload` back to whoever called .invoke() — this is not a
        # function call that returns instantly like example.js's
        # simulateHumanReview(); the graph genuinely stops running until a
        # human decision arrives via Command(resume=...).
        print(f"[HUMAN GATE] pausing for real human approval — tool={decision.tool} tier={tool_meta['tier']}")
        # `interrupt({...})` — calling this function is what actually
        # pauses execution. The dict argument is the PAYLOAD: whatever you
        # want the paused-execution caller to see (so they know what
        # they're being asked to approve). The FIRST time this line runs,
        # it never "returns" in the normal sense — it raises a special
        # signal that LangGraph catches to halt the graph. When the graph
        # is later RESUMED (via Command(resume=...), further down), this
        # same line effectively "returns" whatever value was passed to
        # `resume=`, and execution continues from here as if nothing
        # unusual happened — that's why `human_decision` below just reads
        # like a normal function return value.
        human_decision = interrupt({
            "action": "approve_tool_call",
            "tool": decision.tool,
            "tool_input": decision.tool_input,
            "confidence": decision.confidence,
            "justification": decision.justification,
        })
        gate_entry["human_decision"] = human_decision.get("decision")
        gate_entry["human_reason"] = human_decision.get("reason")
        approved = human_decision.get("decision") == "approve"
    else:
        gate_entry["human_decision"] = "auto-approved"
        approved = True

    gate_log = state["gate_log"] + [gate_entry]

    if not approved:
        reason = gate_entry.get("human_reason") or "no reason given"
        new_plan = replan_node(state, f"Human rejected tool call {decision.tool}: {reason}")
        log = state["execution_log"] + [{"step": "human-rejected", "subtask_id": subtask.id, "reason": reason}]
        return {"plan": new_plan, "execution_log": log, "gate_log": gate_log}

    real_result = tool_meta["run"](decision.tool_input)
    subtask.status = "done"
    log = state["execution_log"] + [
        {"step": "tool-executed", "subtask_id": subtask.id, "tool": decision.tool, "input": decision.tool_input, "result": real_result}
    ]

    # Day 3's broken-assumption check — a real result contradicting what the
    # remaining plan assumed triggers a replan through the SAME mechanism as
    # a human rejection above (Day 3 + Day 4's shared point: both are just
    # "a real, only-now-known fact invalidating part of the plan").
    broke_assumption = decision.tool == "get_account_status" and real_result.get("card_status") == "still expired"
    plan = state["plan"]
    if broke_assumption:
        # `{**state, "execution_log": log, "gate_log": gate_log}` — `**` in
        # front of a dict inside `{...}` UNPACKS all of that dict's
        # key-value pairs into this new dict literal; any keys repeated
        # afterward (execution_log, gate_log) OVERRIDE the unpacked
        # version. This reads as "a copy of state, but with execution_log
        # and gate_log replaced by these newer values" — needed because
        # replan_node expects a full AgentState-shaped dict, but this
        # function's local `log`/`gate_log` variables are one step ahead
        # of what's still sitting in `state`.
        plan = replan_node(
            {**state, "execution_log": log, "gate_log": gate_log},
            "get_account_status returned card_status='still expired' — notify the user about the expired card before anything else.",
        )
        log = log + [{"step": "replan-after-real-result", "plan": plan.model_dump()}]

    return {"plan": plan, "execution_log": log, "gate_log": gate_log}


def route_after_execute(state: AgentState) -> str:
    # `"commit_memory" if next_eligible_subtask(...) is None else
    # "execute_subtask"` is Python's CONDITIONAL EXPRESSION (also called a
    # ternary) — reads right-to-left as "check the condition after `if`;
    # if true, the value is whatever's before `if`; otherwise it's
    # whatever's after `else`." Equivalent to a 4-line if/else block,
    # written on one line because the whole point is just picking one of
    # two node names to return.
    return "commit_memory" if next_eligible_subtask(state["plan"]) is None else "execute_subtask"


# --- Node: commit this session to long-term memory (Day 2's auto-summarize) ---

# Same `*, store` keyword-only pattern as retrieve_memory_node above —
# LangGraph injects the compiled graph's store object here too.
def commit_memory_node(state: AgentState, *, store) -> dict:
    transcript = "\n".join(str(e) for e in state["execution_log"])
    print("[MEMORY] summarizing this session and writing it to the long-term store")
    summary_llm = ChatAnthropic(model="claude-sonnet-5")
    summary = summary_llm.invoke(
        f"Summarize this session in 2-3 sentences (what was attempted, the outcome, "
        f"anything a future session should know):\n{transcript}"
    ).content

    namespace = (state["user_id"], "memories")
    # store.put(namespace, key, value) WRITES one entry into the long-term
    # store — `str(uuid.uuid4())` generates a fresh random unique string to
    # use as this entry's key (we don't care what the key IS, just that
    # it's unique so this entry doesn't overwrite a previous one).
    store.put(namespace, str(uuid.uuid4()), {"text": summary})
    return {"execution_log": state["execution_log"] + [{"step": "session-committed-to-memory", "summary": summary}]}


# --- Build the graph ---

builder = StateGraph(AgentState)
builder.add_node("retrieve_memory", retrieve_memory_node)
builder.add_node("plan", plan_node)
builder.add_node("execute_subtask", execute_subtask_node)
builder.add_node("commit_memory", commit_memory_node)

builder.add_edge(START, "retrieve_memory")
builder.add_edge("retrieve_memory", "plan")
builder.add_edge("plan", "execute_subtask")
# This conditional edge is what makes execute_subtask a LOOP: as long as
# route_after_execute keeps returning "execute_subtask", the graph keeps
# re-entering the same node — this is the graph-based equivalent of
# example.js's `while (iterations < maxIterations)` loop, expressed as
# self-referencing edges instead of an imperative while-loop.
builder.add_conditional_edges("execute_subtask", route_after_execute, {"execute_subtask": "execute_subtask", "commit_memory": "commit_memory"})
builder.add_edge("commit_memory", END)

checkpointer = InMemorySaver()  # short-term: persists state across the paused interrupt() call
store = InMemoryStore()  # long-term: survives across entirely separate sessions/thread_ids
# Passing BOTH checkpointer= and store= here is what makes LangGraph
# automatically supply the `store` parameter to retrieve_memory_node and
# commit_memory_node above, and what makes interrupt()/Command(resume=...)
# work at all (interrupt requires a checkpointer to be configured, since
# pausing means the graph's state has to be saved somewhere while it waits).
graph = builder.compile(checkpointer=checkpointer, store=store)


if __name__ == "__main__":
    # A fresh random thread_id, so this run's checkpointed state doesn't
    # collide with any other run's. `config` is the standard LangGraph
    # shape for passing "which thread is this" into every .invoke() call —
    # both the FIRST invoke and every RESUME invoke below must use this
    # exact same config so LangGraph knows which paused run to continue.
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "goal": "Check user X's account for pending issues and follow up appropriately, and write a note about it to notes.txt.",
        "user_id": "X",
        "relevant_memory": [],
        "plan": Plan(subtasks=[]),
        "execution_log": [],
        "gate_log": [],
    }

    result = graph.invoke(initial_state, config)

    # If the graph paused on interrupt(), result contains "__interrupt__"
    # instead of a finished state — this is what a REAL pause looks like,
    # unlike example.js's simulateHumanReview() which never actually stops
    # anything. A real deployment would surface result["__interrupt__"][0].value
    # to an actual human (CLI prompt, Slack button, web UI) and only call
    # Command(resume=...) once a real decision comes back.
    # `while "__interrupt__" in result:` checks whether that specific key
    # exists in the result dict — as long as it does, the graph is still
    # paused somewhere and needs another resume before it's truly finished.
    while "__interrupt__" in result:
        # `result["__interrupt__"][0]` — LangGraph returns a LIST of
        # pending interrupts (there could technically be more than one);
        # `[0]` takes the first one. `.value` reads off the payload dict we
        # passed into interrupt(...) earlier, so we can see exactly what's
        # being asked of us.
        pending = result["__interrupt__"][0].value
        print(f"\n[PAUSED] awaiting human decision on: {pending}")
        # Simulated human response, standing in for a real approval UI —
        # this is the one deliberately fake piece, same as example.js's
        # simulateHumanReview, but here it resumes REAL paused execution
        # rather than a function that never actually paused anything.
        simulated_response = {"decision": "approve", "reason": None}
        # `Command(resume=simulated_response)` constructs a Command object
        # carrying the human's decision; passing it to graph.invoke(...)
        # (with the SAME config/thread_id as before) tells LangGraph "resume
        # the paused run for this thread, and make interrupt() return this
        # value where it left off" — this is the actual resume mechanism,
        # not a second fresh run.
        result = graph.invoke(Command(resume=simulated_response), config)

    print("\n=== FULL EXECUTION LOG ===")
    for entry in result["execution_log"]:
        print(entry)

    print("\n=== HUMAN GATE LOG ===")
    for entry in result["gate_log"]:
        print(entry)
