# Day 2 Recap — Building Real Tools

## Tools are plain business logic, not AI-aware
- A tool's real implementation (e.g. `callUserApi`) is a normal function — could be called from a cron job or REST controller, no different from non-AI code.
- The ONLY tool-specific part is where it's registered (name/description/schema) and where its errors get caught and turned into text — everything else is just my own backend logic.

## Single responsibility
- One tool = one job. A `manageFile(action, path, content?)` style flag-based tool forces the model to guess a hidden mode string — split into `readFile`/`writeFile`/`deleteFile` instead.
- Matters more here than normal code because the model's only knowledge of a tool is its name + description — it never reads the implementation to disambiguate.

## Descriptions must state scope AND anti-scope
- Good description = trigger condition ("use this when...") + explicit exclusion ("do NOT use this for...").
- The "do NOT use this for" half is what most people skip, and it's often what prevents wrong tool calls on edge-case questions.

## Safe failure modes
- Fail loud like normal code (throw on bad input/timeout/non-2xx) — same discipline as any function.
- But the failure must be CAUGHT at the registry boundary and converted to readable text before it reaches `tool_result` — a raw uncaught throw would crash `runWithTools` entirely.
- Pattern: `execute()` wraps `tool.fn(input)` in try/catch, returns `` `Error: ${err.message}` `` on failure — the model reads this like any other tool output and reacts (report failure, retry, ask user).

## `input_schema` vs the model's actual output — don't confuse the two
- `input_schema` (in `register(...)`) is a CONTRACT I write once — it tells the model what shape of arguments it's allowed to produce. It is never sent to my function directly.
- At runtime, the model generates its OWN output (`block.input`, e.g. `{city: "Chennai"}`) by following that contract — THAT generated value is what my function actually receives as its input.
- So: schema = rule I define → model reads rule → model produces value → my function consumes that value. Two different "inputs," easy to conflate.

## Real tools = new risk surface
- Once a tool does real I/O (network call, file read/write, arbitrary URL fetch), it's no longer harmless like Day 1's stubs.
- `fetchURL(url)` with a model/attacker-influenced URL is the seed of SSRF — not solved here, just flagged (full hardening: Week 12 Day 5).
- Not asked to build production sandboxing today — just to recognize that "model can request something dangerous, nothing happens until my code executes it" (Day 1) becomes a real concern the moment tools touch the outside world.

## Interview gotcha — SSRF is not a "better description" problem
- A tricked/careless prompt causing `fetchURL("http://169.254.169.254/latest/meta-data/")` (cloud metadata endpoint) or `fetchURL("http://localhost:6379")` (internal service) is **SSRF (Server-Side Request Forgery)** — a named, specific vulnerability class, not a decision-quality issue. A better tool description does NOT fix this — the model can still be asked directly to fetch that exact string, and the tool has no way to "know" an IP is dangerous from a description.
- Real defenses live in the tool's own code, not the prompt: (1) **allowlist/blocklist at the network layer** — reject requests to private IP ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.1/localhost), and cloud metadata IPs (169.254.169.254) before the request is made; (2) **least-privilege network egress** — run tool execution with restricted outbound access (only public HTTPS, internal subnets blocked at the firewall/sandbox level) so even a bad URL that slips past the code-level check gets refused at the network.

## Full request → response trace (the Day 1 "Request, Execute, Inject, Continue" loop — send message + tools, model returns a tool_use block, your code executes the real function, the result is injected back as a tool_result, model reads it and responds)
- Raw tool results never go straight to the user — they go back to the model first, which converts raw JSON/data into a natural-language answer. Only that final text is displayed.
- This is why it's a loop of at least 2 API calls: call #1 gets the tool_use request, call #2 gets the human-readable answer.

## Still need to cover / do
- Read Lessons.md sources (LLM tool design best practices, Anthropic tool description guidelines) and log the vague-vs-precise experiment results here.
- Run example.js and example-real-api.js for real, confirm tool calls route correctly.
- Tool Use & Function Calling Day 3 — Multi-Step Tool Chains
