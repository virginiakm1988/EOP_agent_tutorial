# Lab 3: The Persistent Agent — Memory, State, and Multi-Turn Coherence

**Series**: Agentic Engineering Crash Course
**Module**: 3 — Memory & State (Managing Context Persistence)
**Prerequisites**: Lab 1 and Lab 2 (or familiarity with tool selection and Pydantic tools), Python 3.10+, OpenAI API key

---

## What You Will Build (Plain English)

In Labs 1 and 2 you built agents that handle **one request at a time**. But real conversations have multiple turns — the user says something, you respond, they follow up, and so on. This lab teaches you how agents handle that.

Here's the key insight: **an AI model has no memory between calls.** Every time you call the API, it starts fresh. "Memory" in an agent is an illusion — you create it by sending the full conversation history with each new request.

By the end of this lab you will have built an agent that:
1. Keeps track of everything said so far (conversation history)
2. Measures how much memory is being used (token counting)
3. Compresses old history when it gets too long (summarization)
4. Stores important values in a structured state object that never gets lost

> **New library this lab — `tiktoken`**: A tool from OpenAI that counts how many tokens (units of text) your messages use. Think of it as a word counter, but more precise. It helps you check whether your conversation is approaching the model's memory limit.

---

## How to Run This Lab

**Recommended — open directly in Google Colab** (one click, no copy-paste):

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/virginiakm1988/EOP_agent_tutorial/blob/main/Lab3_The_Persistent_Agent.ipynb)

**Or clone the whole repo** into Colab (gets all labs at once) — add a code cell and run:

```bash
!git clone https://github.com/virginiakm1988/EOP_agent_tutorial.git
%cd EOP_agent_tutorial
```

Open any `.ipynb` from the file panel on the left, then run cells top to bottom.

**Suggested time**: 45–60 min.  
**Experiments**: Baseline (required). Exploration: Experiments 1–3 required; Experiment 4 optional.

---

## 1. Learning Objectives

By the end of this lab you will be able to:

1. **Implement** conversation-history memory by appending messages to the prompt.
2. **Observe** context-window overflow and its effect on agent behavior.
3. **Build** a summarization strategy to compress history while preserving task-relevant state.
4. **Use** an external state object (dict/dataclass) to persist structured data across turns.

---

## 2. Theoretical Why: Why Memory Matters

### Mechanism

LLMs are **stateless functions** — every call is independent: you send a prompt in, you get a completion out. There is no persistent state inside the model. All "memory" is an illusion created by including prior messages in the prompt you send. Every turn is conditioned only on what you send in that request.

Concepts to keep in mind:

- **Context window as a finite resource**: Only a fixed number of tokens are available. Every message (system, user, assistant, tool) competes for this budget. Once you exceed it, the API may truncate, reject, or behave unpredictably.
- **Recency bias**: The model attends more strongly to recent tokens. Information from many turns ago may be effectively "forgotten" even if it is still present in the prompt.
- **Explicit state vs. implicit state**: You can maintain **structured state** (e.g. a scratchpad, JSON blob, or dataclass in the system message) that the model reads and updates, or rely on **implicit state** (raw conversation history). Explicit state is more reliable for exact values (e.g. ticket IDs, counts) that must not be lost.

**Maintenance connection**: Multi-turn EOP agent failures often trace to **lost context** — the agent "forgets" a prior tool result or user instruction because it was pushed out of the effective attention window or truncated. The first place to look is token count, history length, and whether critical facts are in a structured state object.

> **Conversation history grows each turn (finite context window!):**
>
> ```
>  Tokens │
>   1040  │                                                ████  ← over limit!
>   1000  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─(context limit)─
>    870  │                                         ████
>    690  │                                   ████
>    510  │                             ████
>    320  │                       ████
>    150  │                 ████
>         └─────────────────────────────────────────────────────────────
>               Turn 1  Turn 2  Turn 3  Turn 4  Turn 5  Turn 6
>
>   ⚠  Summarize before hitting the limit!
> ```
>
> **Implicit vs. Explicit State:**
>
> ```
>  ┌───────────────────────────────┐    ┌────────────────────────────────┐
>  │          IMPLICIT             │    │           EXPLICIT              │
>  │  Raw conversation history     │    │  Structured dict / JSON         │
>  │                               │    │                                 │
>  │  ⚠ Can be "forgotten" as     │    │  ✓ Always available,            │
>  │    context window fills       │    │    never truncated              │
>  └───────────────────────────────┘    └────────────────────────────────┘
>
>  Rule: Put ticket IDs, counters, and critical values in EXPLICIT state.
>  Use conversation history for context and natural language only.
> ```

---

## 3. Setup

**Dependencies**: Python 3.10+, `openai`, `tiktoken` (for token counting).

> **Returning student reminder**: You need the same API key from Labs 1–2. If you're starting fresh, see [GETTING_STARTED.md](GETTING_STARTED.md) for setup instructions.
>
> **What is `tiktoken`?** It's a Python library that counts tokens — the units of text that the model reads. Use it to check "how much memory am I using?" before you hit the model's limit. Install it once and it works automatically.

```python
# Cell: Install dependencies
!pip install -q openai tiktoken
```

```python
# Cell: Imports and API key (OpenAI or NVIDIA NIM)
import json
import os
from getpass import getpass

import tiktoken
from openai import OpenAI

use_nim = os.environ.get("USE_NIM", "").lower() in ("1", "true", "yes") or "NIM_API_KEY" in os.environ
if use_nim:
    if "NIM_API_KEY" not in os.environ:
        os.environ["NIM_API_KEY"] = getpass("Enter your NVIDIA API key (NIM): ")
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ["NIM_API_KEY"],
    )
    MODEL = os.environ.get("NIM_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1.5")
else:
    if "OPENAI_API_KEY" not in os.environ:
        os.environ["OPENAI_API_KEY"] = getpass("Enter your OpenAI API key: ")
    client = OpenAI()
    MODEL = "gpt-4o-mini"
ENCODING = tiktoken.encoding_for_model("gpt-4")  # Approximate token count; works for both backends
print(f"Using model: {MODEL}")
```

---

## 4. Baseline Code: Multi-Turn Loop with Conversation History

We build a simple multi-turn loop: the user sends messages, the agent responds (using a single tool for simplicity). We maintain a `messages` list that grows each turn and count tokens so we can observe context growth.

### 4.1 Token counting and message list

```python
# Cell: Token count and message list

def count_tokens(messages: list[dict]) -> int:
    """Approximate token count for the messages list (OpenAI chat format)."""
    total = 0
    for m in messages:
        total += 4  # overhead per message
        total += len(ENCODING.encode(str(m.get("content", ""))))
        if m.get("tool_calls"):
            for tc in m["tool_calls"]:
                total += len(ENCODING.encode(json.dumps(tc)))
    return total


# We'll use a minimal tool: one function the model can call
TOOLS_OPENAI = [
    {
        "type": "function",
        "function": {
            "name": "get_fact",
            "description": "Store or retrieve a fact. Use store_fact to save a key-value fact; use get_fact to retrieve by key.",
            "parameters": {
                "type": "object",
                "properties": {"key": {"type": "string"}, "value": {"type": "string"}},
                "required": ["key"],
            },
        },
    }
]

def run_tool(name: str, arguments: dict, state: dict) -> str:
    """Simulated tool: in-memory key-value store."""
    if name != "get_fact":
        return "Unknown tool"
    key = arguments.get("key", "")
    value = arguments.get("value")
    if value is not None:
        state["facts"] = state.get("facts", {})
        state["facts"][key] = value
        return f"Stored: {key} = {value}"
    return str(state.get("facts", {}).get(key, "(not set)"))
```

### 4.2 Multi-turn agent loop

```python
# Cell: Multi-turn loop

SYSTEM_PROMPT = (
    "You are a helpful assistant with access to a fact store. "
    "When the user tells you something to remember, use the get_fact tool with both 'key' and 'value'. "
    "When the user asks what you know, use get_fact with just 'key' to retrieve. "
    "Keep responses brief."
)

def run_turn(messages: list[dict], state: dict):
    """Run one assistant turn: call API, handle tool calls, return updated messages and state."""
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=messages,
        tools=TOOLS_OPENAI,
        tool_choice="auto",
        max_tokens=200,
    )
    msg = response.choices[0].message
    messages.append({"role": "assistant", "content": msg.content or "", "tool_calls": getattr(msg, "tool_calls", None) or []})

    # Execute tool calls and append results
    for tc in (msg.tool_calls or []):
        name = tc.function.name
        args = json.loads(tc.function.arguments)
        result = run_tool(name, args, state)
        messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": result,
        })
    return messages, state


# Run a short multi-turn dialogue
messages = [{"role": "system", "content": SYSTEM_PROMPT}]
state = {}

# Turn 1: user gives a fact
messages.append({"role": "user", "content": "Remember that my favorite color is blue."})
messages, state = run_turn(messages, state)
print("Turn 1 tokens:", count_tokens(messages))

# Turn 2: user asks to recall
messages.append({"role": "user", "content": "What is my favorite color?"})
messages, state = run_turn(messages, state)
print("Turn 2 tokens:", count_tokens(messages))

# Show last assistant text reply
assistant_msgs = [m for m in messages if m.get("role") == "assistant" and m.get("content")]
if assistant_msgs:
    print("Last assistant reply:", assistant_msgs[-1]["content"])
print("State facts:", state.get("facts", {}))
```

**Expected**: The agent stores "favorite color" → "blue" and later retrieves it. Token count grows each turn.  
**Record**: Total tokens after turn 2; confirm the agent correctly referenced turn 1.

---

## 5. Exploration Lab: Context Overflow, Summarization, and Structured State

### Experiment 1: Context overflow

**Variable**: Feed many turns (e.g. 20–50) of conversation so the prompt grows large.  
**Hypothesis**: Once the effective context is full or very long, the model may start to contradict earlier statements or "forget" facts.

```python
# Cell: Experiment 1 — Many turns (simulated long history)

# Simulate a long history by appending many user/assistant pairs
messages_long = [{"role": "system", "content": SYSTEM_PROMPT}]
state_long = {}
for i in range(15):
    messages_long.append({"role": "user", "content": f"Remember that item_{i} is value_{i}."})
    messages_long, state_long = run_turn(messages_long, state_long)
    if i in (0, 5, 10, 14):
        print(f"After turn {i+1}: tokens ≈ {count_tokens(messages_long)}")

# Now ask for an early fact
messages_long.append({"role": "user", "content": "What was the value of item_0?"})
messages_long, state_long = run_turn(messages_long, state_long)
assistant = [m for m in messages_long if m.get("role") == "assistant" and m.get("content")][-1]
print("Reply about item_0:", assistant["content"])
```

**Observe**: With 15+ turns, token count grows quickly. The model may still answer correctly if it uses the tool to read from `state`; if it relied only on raw history, recency and length can cause errors.  
**Record**: Token count at the end; whether the agent correctly recalled `item_0`.

---

### Experiment 2: Summarization injection

**Variable**: Every N turns, replace the middle of the history with an LLM-generated summary.  
**Hypothesis**: Summarization keeps the prompt shorter so the model maintains coherence longer; some detail may be lost.

```python
# Cell: Experiment 2 — Summarize history every 5 turns

def summarize_messages(messages: list[dict]) -> str:
    """Ask the model to summarize the conversation so far (user/assistant only)."""
    conv = []
    for m in messages:
        if m["role"] in ("user", "assistant") and m.get("content"):
            conv.append(f"{m['role']}: {m['content'][:200]}")
    text = "\n".join(conv[-20:])  # last 20 entries
    r = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=[{"role": "user", "content": f"Summarize this conversation in 3–5 sentences, preserving key facts and decisions:\n\n{text}"}],
        max_tokens=150,
    )
    return r.choices[0].message.content.strip()


# Build history with summarization every 5 turns
messages_sum = [{"role": "system", "content": SYSTEM_PROMPT}]
state_sum = {}
summary_so_far = None
for i in range(12):
    messages_sum.append({"role": "user", "content": f"Remember that project_{i} has status done."})
    messages_sum, state_sum = run_turn(messages_sum, state_sum)
    if (i + 1) % 5 == 0 and i > 0:
        summary_so_far = summarize_messages(messages_sum)
        # Replace all but system + last few turns with a summary block
        keep = [messages_sum[0]] + messages_sum[-(4 * 2):]  # system + last ~4 exchanges
        messages_sum = [messages_sum[0], {"role": "user", "content": f"[Summary of earlier conversation]: {summary_so_far}"}] + keep[1:]
        print(f"After turn {i+1}: summarized; tokens ≈ {count_tokens(messages_sum)}")

print("Sample summary:", summary_so_far[:200] if summary_so_far else "N/A")
```

**Observe**: Summaries compress context; the model can still use the tool state for exact values. Compare what the summary preserves vs. drops.  
**Record**: Whether the agent still recalls early "project_k" values; what the summary contained.

---

### Experiment 3: Structured scratchpad in system message

**Variable**: Maintain a JSON state blob in the system message that the model (or your code) updates each turn.  
**Hypothesis**: Explicit state is more reliable for exact values (e.g. ticket IDs) than implicit conversation history.

```python
# Cell: Experiment 3 — Structured scratchpad

def build_system_with_scratchpad(scratchpad: dict) -> str:
    return (
        SYSTEM_PROMPT
        + "\n\nCurrent structured state (use this for exact values):\n"
        + json.dumps(scratchpad, indent=2)
    )

messages_scratch = []
scratchpad = {"facts": {}, "ticket_id_counter": 0}
messages_scratch.append({"role": "system", "content": build_system_with_scratchpad(scratchpad)})
messages_scratch.append({"role": "user", "content": "Create a ticket for 'Server down' and remember its ID."})
# Simulate: we run tool and update scratchpad
scratchpad["ticket_id_counter"] = 1
scratchpad["facts"]["last_ticket_id"] = "TKT-001"
scratchpad["facts"]["last_ticket_title"] = "Server down"
messages_scratch[0]["content"] = build_system_with_scratchpad(scratchpad)
messages_scratch.append({"role": "assistant", "content": "I've created ticket TKT-001 for 'Server down'."})
messages_scratch.append({"role": "user", "content": "What was the last ticket ID?"})

response = client.chat.completions.create(
    model=MODEL,
    temperature=0.0,
    messages=messages_scratch,
    max_tokens=50,
)
print("Reply:", response.choices[0].message.content)
print("Scratchpad:", json.dumps(scratchpad, indent=2))
```

**Observe**: The scratchpad holds exact values; the model can answer "What was the last ticket ID?" from the system message.  
**Record**: Reply correctness. **Implication**: For EOP agents, critical IDs and counts should live in structured state, not only in free-form history.

---

### Experiment 4: State corruption

**Variable**: Intentionally inject conflicting information into the scratchpad (e.g. two different "last_ticket_id" values).  
**Hypothesis**: Agent behavior becomes unpredictable; demonstrates why state validation and single source of truth matter.

```python
# Cell: Experiment 4 — State corruption

scratchpad_bad = {"facts": {"last_ticket_id": "TKT-001", "current_ticket": "TKT-999"}, "note": "Conflicting IDs"}
sys_corrupt = build_system_with_scratchpad(scratchpad_bad)
messages_corrupt = [
    {"role": "system", "content": sys_corrupt},
    {"role": "user", "content": "What is the last ticket ID we created?"},
]
r = client.chat.completions.create(model=MODEL, temperature=0.0, messages=messages_corrupt, max_tokens=80)
print("Reply with corrupted state:", r.choices[0].message.content)
```

**Observe**: The model may pick one value, hedge, or contradict. **Record**: How the model responded. **Implication**: Validate and normalize state; avoid duplicate or conflicting keys for the same concept.

---

## 6. Maintenance Connection: How This Helps Debug or Scale the EOP Agent

### Persistence across sessions

- EOP agents often persist state across sessions via **database**, **Redis**, or **serialized JSON**. The in-memory `state` and `messages` in this lab are stand-ins for that.
- When debugging "the agent forgot X": (1) **Check token count** and context-window limits. (2) **Inspect summarization** — what was dropped? (3) **Prefer structured state** for exact identifiers and counters.

### State serialization for replay and debugging

- Snapshot the full `messages` list (and state dict) at each decision point. This allows replay and regression tests: "Given this history, the agent should choose tool Y."

### Takeaways

| Issue | Check | Fix |
|-------|--------|-----|
| Agent forgot earlier instruction | Token count, history length | Summarize or trim history; move critical facts to structured state |
| Inconsistent recall | Recency bias, long context | Put key facts in system scratchpad or tool-maintained state |
| State drift | Conflicting keys, no validation | Single source of truth; validate state shape (e.g. Pydantic) before writing |

---

## 7. Summary and Next Steps

### Three takeaways

1. **Memory is prompt engineering.** All context is in the prompt; the model has no internal memory. Context window is finite — every message costs tokens.
2. **Structured state is more reliable than implicit state.** For ticket IDs, counts, and exact values, maintain a dedicated state object (and optionally expose it in the system message) instead of relying only on conversation history.
3. **Summarization and state validation extend coherence.** Compress history when it grows; validate and normalize state to avoid corruption and ambiguous recall.

### Checkpoint: Self-check before Lab 4

Before moving to Lab 4 (graphs and flow logic), check that you can do the following from Labs 1–3:

| Skill | Lab | Self-check question |
|-------|-----|----------------------|
| Relate prompt structure to tool choice | 1 | Can you explain why tool order or format might change which tool the model picks? |
| Run and interpret tool-selection experiments | 1 | Can you vary temperature or user message and predict more/less variance? |
| Define tools with a clear interface/schema | 2 | Can you describe what a tool’s “contract” is (name, args, return)? |
| Handle validation errors (e.g. Pydantic) | 2 | Do you know what to do when the model returns invalid tool arguments? |
| Maintain conversation history across turns | 3 | Can you append messages and pass them into the next LLM call? |
| Reason about context window and token count | 3 | Can you explain why long history can cause truncation or “forgetting”? |
| Use a structured state object (e.g. scratchpad) | 3 | Can you read/update state and optionally surface it in the system message? |

If you’re unsure on any row, revisit that lab before starting Lab 4. Lab 4 builds on prompt structure (1), tool definitions (2), and state/memory (3) inside a graph.

### What's next

**Lab 4 — Graphs, Cycles & Recovery**: LangGraph and flow logic. We'll model an agent workflow as a graph with conditional routing, retry cycles, and error recovery.

---

*End of Lab 3. Proceed to Lab 4 when ready.*
