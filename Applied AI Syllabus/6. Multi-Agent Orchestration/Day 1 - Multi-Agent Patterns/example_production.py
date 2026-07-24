# Day 1 production-style example: the SAME supervisor pattern as
# example-production-style.js, rebuilt with real production packages
# instead of hand-rolled loops/schemas — so you see what this looks like
# when built the way an actual production team would build it.
#
# You're new to Python, so every line below is commented for THREE things
# together, not just "why this package": (1) what the Python syntax itself
# does mechanically, (2) what the package/function is and why it's used
# here, (3) what this specific line accomplishes in the flow. If a comment
# looks longer than the code it explains, that's deliberate — nothing here
# assumes you've seen this syntax or package before.
#
# Packages used, and why:
#   - langgraph (StateGraph)      — the current standard framework for
#     building multi-agent/loop-based LLM workflows. We hand-build the
#     graph with StateGraph rather than the prebuilt `langgraph-supervisor`
#     package, because that package is really meant for "one supervisor
#     delegating to several NAMED sub-agents via handoff tools" — for our
#     single worker + single judge loop, a hand-built StateGraph is the
#     simpler, more standard fit, and is what LangGraph's own docs show for
#     this exact "loop until a condition is met" shape.
#   - langchain_anthropic (ChatAnthropic) — the official LangChain wrapper
#     around Claude, giving `.with_structured_output()`, which is the
#     production replacement for hand-writing `tools` + `tool_choice` +
#     manually reading `response.content[0].input` (what
#     example-production-style.js did by hand against the raw Anthropic
#     SDK). Same underlying mechanism (Claude's native structured output /
#     tool-calling), packaged behind one method call.
#   - pydantic (BaseModel) — defines the supervisor's decision SCHEMA
#     (verdict: one of exactly three strings) as a real typed class,
#     instead of a raw JSON Schema dict — this is what real LangChain code
#     uses to describe structured output, and it's what gets validated
#     automatically: `decision.verdict` is guaranteed to be one of the
#     Literal values, or the call raises, not silently drifts.
#
# NOTE ON create_react_agent / create_agent: LangGraph's prebuilt
# `create_react_agent` helper is deprecated as of LangGraph v1 in favor of
# `create_agent` from the `langchain` package — but that replacement has
# had unstable availability across recent `langchain` point releases as of
# mid-2026. This example deliberately avoids BOTH and hand-writes each node
# as a plain function calling ChatAnthropic directly — this is the more
# robust choice against that churn, and it's also clearer for learning
# purposes: you see exactly what each node does, not what a prebuilt
# wrapper does for you.
#
#   START ──► worker (writes a draft) ──► supervisor (judges, decides
#   verdict via with_structured_output) ──► route() reads state["verdict"]:
#       verdict == "approve" OR attempts >= max  ──►  END
#       otherwise ("retry")                      ──►  back to worker
#
# Install: pip install langgraph langchain-anthropic pydantic

# Python's `import X` and `from X import Y` are how a file pulls in code
# from an installed package (a package is code someone else wrote and
# published — `pip install <name>` downloads it onto your machine first;
# `import` then loads it into THIS file so you can use it below).
# `typing` is part of Python's own standard library (ships with Python
# itself, no install needed) — it provides TYPE HINTS: annotations that
# don't change how the code runs, but document what kind of value a
# variable/argument/return is supposed to hold, which tools (and readers)
# can check.
#   - Literal["a", "b", "c"] means "this value must be exactly one of
#     these specific strings" — not any string, only these three.
#   - TypedDict lets you describe a plain Python dict's expected shape
#     (which keys it has, and what type each key's value should be) as if
#     it were a class, without actually needing a class.
from typing import Literal, TypedDict

# pydantic is a THIRD-PARTY package (installed via pip, not part of core
# Python) for defining data shapes as classes that validate themselves —
# BaseModel is the base class you inherit from to define such a shape;
# Field lets you attach extra metadata (like a human-readable description)
# to one of that class's fields.
from pydantic import BaseModel, Field
# ChatAnthropic is a class from the langchain_anthropic package — it wraps
# Anthropic's API (the same messages.create() call you've used directly in
# every JS example) behind LangChain's common interface, so it works
# interchangeably with LangGraph's other tooling.
from langchain_anthropic import ChatAnthropic
# StateGraph, START, END all come from langgraph.graph. StateGraph is the
# class you use to BUILD a graph (define nodes and how they connect).
# START and END are not functions — they're special constant values
# LangGraph itself defines, used as markers meaning "the graph's entry
# point" and "the graph's exit point," respectively.
from langgraph.graph import StateGraph, START, END


# `class Decision(BaseModel):` defines a new type named Decision that
# INHERITS from BaseModel — meaning it automatically gets BaseModel's
# validation behavior for free, you only need to declare its fields below.
# The supervisor's decision schema. Unlike example-production-style.js's
# hand-written JSON Schema dict passed as `input_schema`, this is a real
# Python class — LangChain converts it to the same underlying JSON Schema
# the Anthropic API expects, but you get IDE autocomplete, runtime
# validation, and no dict-literal typos as a result of using this class.
class Decision(BaseModel):
    # `verdict: Literal[...] = Field(...)` reads as: "this class has a
    # field named verdict, its allowed values are restricted to exactly
    # these three strings by the Literal type hint, and Field(...) attaches
    # a description Anthropic's API will see as part of the schema." If
    # Claude tried to return any other string here, Pydantic would reject
    # it — this is what "guaranteed to be one of three values" means
    # concretely, not just a comment's claim.
    verdict: Literal["approve", "retry", "escalate"] = Field(
        description="approve if the sentence is accurate and engaging; retry if worth another attempt; escalate if this should go to a human instead"
    )
    reason: str = Field(description="Why this verdict was reached")


# LangGraph's State: a typed dict describing everything that flows through
# the graph between nodes. Every node function below receives the current
# State and returns a partial update to it — LangGraph merges that update
# into the running state and passes it to whichever node runs next.
# `class SupervisionState(TypedDict):` — same class syntax as Decision
# above, but inheriting from TypedDict instead of BaseModel: this defines
# the SHAPE of a plain dict (which keys must exist, and each one's type),
# purely for type-checking/readability — unlike BaseModel, TypedDict does
# NOT validate or reject bad data at runtime; it's a documentation aid, and
# LangGraph specifically expects your state to be a plain dict shaped like
# this (not an actual Decision-style validating class).
class SupervisionState(TypedDict):
    topic: str
    draft: str
    verdict: str
    reason: str
    attempts: int
    max_attempts: int
    escalated: bool


# A plain string assigned to a variable — no new syntax here, just the
# system prompt text reused by the worker below.
WRITER_SYSTEM_PROMPT = "You write one confident, engaging factual sentence about the given topic. Do not hedge."

# Calling ChatAnthropic(...) constructs an INSTANCE of that class — think
# of the class as a blueprint and this line as building one real object
# from it, configured to use the claude-sonnet-5 model. worker_llm is now a
# reusable object you can call .invoke(...) on, as many times as you want.
worker_llm = ChatAnthropic(model="claude-sonnet-5")

# .with_structured_output(Decision) is the production replacement for
# example-production-style.js's manual `tools: [...] , tool_choice: {...}`
# plus manually pulling `.input` off a tool_use content block — same
# underlying Claude mechanism (forced structured output), one method call
# instead of hand-assembling the schema and parsing the response yourself.
# Mechanically: `.with_structured_output(Decision)` is a METHOD (a function
# attached to an object) called on a NEW ChatAnthropic instance, and it
# returns a DIFFERENT object — one that, when invoked, forces Claude's
# reply into the Decision shape and hands you back an actual Decision
# instance instead of raw text. This is why supervisor_llm and worker_llm
# are built differently even though both start from ChatAnthropic(...).
supervisor_llm = ChatAnthropic(model="claude-sonnet-5").with_structured_output(Decision)


# `def worker_node(state: SupervisionState) -> dict:` defines a function
# named worker_node. `state: SupervisionState` is a type hint saying "this
# parameter should be a dict shaped like SupervisionState" (not enforced at
# runtime, just documentation/IDE help). `-> dict` says this function
# returns a plain dict. Every "node" in a LangGraph graph is just a regular
# Python function with this exact shape: takes the current state in,
# returns a (partial) update to it.
def worker_node(state: SupervisionState) -> dict:
    # .invoke(...) sends a request and waits for the full reply (as opposed
    # to streaming it piece by piece) — this is LangChain's standard method
    # name for "make the actual API call," equivalent to the raw SDK's
    # messages.create(...) used elsewhere in this project. The argument is
    # a Python LIST of TUPLES: each ("system", text) or ("user", text) pair
    # tells LangChain which role that message has, mirroring the {role,
    # content} objects you've built by hand in the JS examples.
    response = worker_llm.invoke(
        [
            ("system", WRITER_SYSTEM_PROMPT),
            # An f-string (`f"..."`) is Python's syntax for embedding a
            # variable's value directly inside a string — {state['topic']}
            # gets replaced with the actual topic value when this line
            # runs, same job as JS's `${...}` template literals.
            ("user", f"Topic: {state['topic']}"),
        ]
    )
    print(f"[WORKER] attempt {state['attempts'] + 1}: wrote a draft")
    # The dict returned here is a PARTIAL update — LangGraph merges just
    # these two keys into the full running state; you don't need to repeat
    # every other key (topic, verdict, etc.) that isn't changing.
    return {"draft": response.content, "attempts": state["attempts"] + 1}


def supervisor_node(state: SupervisionState) -> dict:
    # THE SUPERVISING ACT: one model call, forced into the Decision shape.
    # `decision` here is a real Decision instance — decision.verdict can
    # ONLY be "approve"/"retry"/"escalate", enforced by Pydantic + the
    # underlying structured-output call, not a string you have to guess at.
    print(f"[SUPERVISION] attempt {state['attempts']}: asking the model for a structured verdict")
    # `decision: Decision = ...` here is a VARIABLE type hint (not a
    # function signature) — just documenting "this variable will hold a
    # Decision instance," to make the next lines easier to read.
    decision: Decision = supervisor_llm.invoke(
        [
            ("system", f"You are a supervisor reviewing a worker's output. This is attempt {state['attempts']} of {state['max_attempts']}."),
            ("user", f'Sentence: "{state["draft"]}"'),
        ]
    )
    print(f"[SUPERVISION] verdict={decision.verdict} reason={decision.reason}")
    # `decision.verdict` — dot notation reads a FIELD off the Decision
    # object we got back, exactly like the fields we defined in the
    # `class Decision` block above; this is a real attribute, not a
    # dictionary key lookup.
    return {"verdict": decision.verdict, "reason": decision.reason}


def route(state: SupervisionState) -> str:
    # THE ROUTING ACT: plain Python reading the supervisor's structured
    # verdict — a property check (`state["verdict"] == "approve"`), never a
    # string-prefix guess, because Decision's Literal type already
    # guarantees the value is exactly one of the three allowed strings.
    # A "router" function in LangGraph is just a plain function that
    # returns the NAME of whichever node should run next, as a string.
    if state["verdict"] == "approve":
        return END
    if state["verdict"] == "escalate" or state["attempts"] >= state["max_attempts"]:
        return "escalate"
    return "worker"


def escalate_node(state: SupervisionState) -> dict:
    # A real production system would page a human here (Slack webhook,
    # PagerDuty, a ticket queue) — see example-production-style.js's
    # escalateToHuman for the same stub, documented there in more depth.
    # `!r` inside an f-string's `{...}` (e.g. `{state['topic']!r}`) calls
    # Python's repr() on that value — it prints the value WITH quotes
    # around strings, which is just a debugging convenience so you can see
    # exactly where a string starts/ends in the printed output.
    print(f"[ESCALATION] would page a human here — topic={state['topic']!r} draft={state['draft']!r} reason={state['reason']!r}")
    return {"escalated": True}


# --- Build the graph: nodes are the functions above, edges describe the
# fixed wiring between them, and add_conditional_edges is what makes
# "worker -> supervisor -> (worker again, or done)" an actual LOOP instead
# of a straight-line chain — this is the graph-based equivalent of
# example-production-style.js's hand-written `for` loop with an early
# return, expressed declaratively instead of imperatively.
# `StateGraph(SupervisionState)` constructs a new, empty graph object,
# telling it upfront what shape its state dict will have (the TypedDict
# from above) — this is a BUILDER object: you call methods on it below to
# progressively add nodes/edges, then call .compile() once at the end to
# turn it into something actually runnable.
graph = StateGraph(SupervisionState)
# .add_node("worker", worker_node) registers the worker_node FUNCTION
# (passed by name, not called — note there are no parentheses after
# worker_node here) under the string name "worker", so other parts of the
# graph can refer to it by that name.
graph.add_node("worker", worker_node)
graph.add_node("supervisor", supervisor_node)
graph.add_node("escalate", escalate_node)

# .add_edge(A, B) means "after node A finishes, ALWAYS run node B next" —
# a fixed, unconditional connection.
graph.add_edge(START, "worker")
graph.add_edge("worker", "supervisor")
# .add_conditional_edges("supervisor", route, {...}) means "after
# supervisor finishes, call the route(state) function, and whatever string
# it returns, look that string up in this dict to find which node runs
# next." The dict {"worker": "worker", "escalate": "escalate", END: END}
# maps each possible return value of route() to an actual next node — this
# is what turns route()'s plain string return value into real graph
# navigation.
graph.add_conditional_edges("supervisor", route, {"worker": "worker", "escalate": "escalate", END: END})
graph.add_edge("escalate", END)

# .compile() converts the builder object (which only describes the
# graph's shape) into `app` — an actual runnable object you can call
# .invoke(...) on, similar to how a recipe (the builder) becomes an actual
# meal (the compiled app) once you follow it.
app = graph.compile()


# `if __name__ == "__main__":` is standard Python boilerplate meaning "only
# run the code inside this block when this file is executed directly
# (e.g. `python example_production.py`), not when it's imported by some
# other file." Every file-level example in this project uses this pattern
# for its "run it" section.
if __name__ == "__main__":
    # .invoke(...) here runs the WHOLE graph, starting at START, following
    # edges/conditional edges until it reaches END, and returns the final
    # accumulated state as a plain dict. The dict passed in is the STARTING
    # state — every key SupervisionState declared must have a starting
    # value here.
    result = app.invoke(
        {
            "topic": "the speed of light",
            "draft": "",
            "verdict": "",
            "reason": "",
            "attempts": 0,
            "max_attempts": 3,
            "escalated": False,
        }
    )
    print("\nFinal state:", result)
