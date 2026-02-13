# Lab 4: Graphs, Cycles & Recovery — Outline

**Module**: 4 — LangGraph / Flow Logic (Handling Cycles and Error Recovery)

---

## Learning Objectives

1. Model an agent workflow as a directed graph with nodes (actions) and edges (transitions).
2. Build a LangGraph workflow with conditional routing, cycles (retry loops), and terminal states.
3. Observe how graph structure affects reliability: what happens when a node fails, when a cycle doesn't terminate, when fallback logic is missing.
4. Implement error-recovery patterns: retry with backoff, fallback tools, and human-in-the-loop escalation.

---

## Section Plan

### 1. Theoretical Why: Agents as Graphs

- **Mechanism**: An agentic workflow is a state machine or directed graph. Each node performs an action (LLM call, tool execution, validation). Each edge encodes a transition condition.
- **Key concepts**:
  - DAG vs. cyclic graph: simple pipelines (retrieve → generate → respond) are DAGs. Agents that self-correct or retry require cycles.
  - State as edge payload: the graph passes a state object through nodes; each node reads and writes to it.
  - Conditional edges: routing based on the output of a node (e.g., "if tool call failed, retry; if succeeded, proceed; if max retries exceeded, escalate").
  - Termination guarantees: cycles need explicit exit conditions (max iterations, success criteria) to avoid infinite loops.
- **Maintenance connection**: EOP agent failures often manifest as hung workflows (infinite retry) or silent failures (no fallback path). Understanding the graph structure is essential for diagnosing these.

### 2. Baseline Code

- Install LangGraph (`langgraph`).
- Define a 3-node graph:
  1. `route` — LLM decides which tool to call (uses prompt from Lab 1, schema from Lab 2).
  2. `execute` — Simulate tool execution (may succeed or fail randomly).
  3. `respond` — Format the result for the user.
- Add edges: `route → execute → respond`.
- Run with a clear user query; show the state at each node.

### 3. Exploration Lab

| Experiment | Variable | Expected observation |
|---|---|---|
| Tool execution failure | Make `execute` fail 50% of the time | Without retry logic, half of runs produce errors. |
| Retry cycle | Add a `route → execute → (fail? → route)` cycle with max_retries=3 | Agent recovers from transient failures; observe retry count distribution. |
| Infinite loop | Set max_retries to infinity and make `execute` always fail | Workflow hangs; demonstrates why termination bounds are mandatory. |
| Fallback path | Add a `fallback` node that returns a canned response | When retries exhaust, the agent degrades gracefully instead of crashing. |
| Conditional routing | Add a second tool; route conditionally based on LLM output | Show branching logic and how the state object carries the routing decision. |
| Human-in-the-loop | Add an `escalate` node that pauses for simulated human input | Demonstrate the escape hatch for cases the agent cannot resolve. |

### 4. Maintenance Connection

- Reading a LangGraph graph definition to understand an EOP agent's control flow.
- Adding logging at each node for observability (state snapshots, timing, error messages).
- Common failure patterns: infinite retry, missing fallback, state corruption across nodes.
- How to add a new tool/node to an existing EOP agent graph without breaking existing paths.

### 5. Summary and Next Steps

- Takeaways: Agents are graphs; cycles need bounds; fallbacks prevent silent failures; state flows through edges.
- Capstone idea: Combine Labs 1-4 into a single multi-tool agent with structured schemas, persistent memory, and graph-based orchestration.

---

## Dependencies

- `openai`, `langgraph`, `langchain-core`, `langchain-openai`
