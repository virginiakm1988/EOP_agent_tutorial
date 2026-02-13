# Lab 3: The Persistent Agent — Outline

**Module**: 3 — Memory & State (Managing Context Persistence)

---

## Learning Objectives

1. Implement conversation-history memory by appending messages to the prompt.
2. Observe context-window overflow and its effect on agent behavior.
3. Build a summarization strategy to compress history while preserving task-relevant state.
4. Use an external state object (dict/dataclass) to persist structured data across turns.

---

## Section Plan

### 1. Theoretical Why: Why Memory Matters

- **Mechanism**: LLMs are stateless functions — `f(prompt) → completion`. All "memory" is an illusion created by including prior messages in the prompt.
- **Key concepts**:
  - Context window as a finite resource (tokens). Every message competes for attention budget.
  - Recency bias: the model attends more strongly to recent tokens; old context may be effectively "forgotten" even if technically present.
  - Explicit state vs. implicit state: structured key-value state (scratchpad, JSON blob) vs. letting the model infer state from conversation history.
- **Maintenance connection**: Multi-turn EOP agent failures often trace to lost context — the agent "forgets" a prior tool result or user instruction because it was pushed out of the effective attention window.

### 2. Baseline Code

- Build a simple multi-turn loop: user sends messages, agent responds (with tool calls from Lab 2).
- Maintain a `messages: list[dict]` that grows with each turn.
- After each turn, print the total token count of the prompt.
- Show the agent correctly referencing information from turn 1 when answering in turn 5.

### 3. Exploration Lab

| Experiment | Variable | Expected observation |
|---|---|---|
| Context overflow | Feed 50+ turns of conversation | Model starts hallucinating or contradicting earlier statements once context is full. |
| Summarization injection | Every 10 turns, replace history with an LLM-generated summary | Agent maintains coherence longer; observe what the summary preserves vs. drops. |
| Structured scratchpad | Maintain a JSON state blob in the system message | Agent can retrieve exact values (e.g., ticket IDs) that would otherwise be lost in long conversations. |
| State corruption | Intentionally inject conflicting info into the scratchpad | Agent behavior becomes unpredictable — demonstrates why state validation matters. |

### 4. Maintenance Connection

- How EOP agents persist state across sessions (database, Redis, serialized JSON).
- Debugging "the agent forgot X" — check token count, attention window, summarization quality.
- State serialization for replay and debugging: snapshot the full `messages` list at each decision point.

### 5. Summary and Next Steps

- Takeaways: Memory is prompt engineering; context windows are finite; structured state is more reliable than implicit state.
- Next: Lab 4 — LangGraph / Flow Logic.

---

## Dependencies

- `openai`, `tiktoken` (for token counting)
