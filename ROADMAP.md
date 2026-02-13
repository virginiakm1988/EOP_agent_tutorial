# Agentic Engineering Crash Course — Learning Roadmap

> **Audience**: PhD students transitioning from traditional coding to agentic engineering.
> **Goal**: Build the skills required to maintain and extend EOP (Enterprise Operations) Agents.

---

## Philosophy

Traditional software engineering is deterministic: you write a function, it returns the same output for the same input. Agentic systems are **stochastic pipelines** — an LLM sits at the decision core, and its outputs are sampled from a probability distribution conditioned on the prompt context. Maintaining these systems requires a different mental model: one rooted in probability, interface contracts, state management, and graph-based control flow.

This roadmap is structured as four modules, each with a hands-on Colab lab. Every lab follows the same template:

| Section | Purpose |
|---|---|
| **Theoretical Why** | The mechanism behind the behavior (latent space, state machines, DAGs). |
| **Baseline Code** | Minimal working example you can run and inspect. |
| **Exploration Lab** | Code that purposely fails or behaves stochastically to reveal edge cases. |
| **Maintenance Connection** | How this specific skill maps to debugging or scaling EOP Agents. |

---

## Module Map

```
Module 1                Module 2                Module 3                Module 4
Tokenization &          Tool Definition &       Memory &                LangGraph /
Logit Control           Pydantic                State                   Flow Logic
─────────────           ─────────────           ─────────────           ─────────────
Understand              Define the              Manage context          Handle cycles
stochasticity           interface               persistence             & error recovery
     │                       │                       │                       │
     ▼                       ▼                       ▼                       ▼
 Lab 1                   Lab 2                   Lab 3                   Lab 4
 Anatomy of              Contract of             The Persistent          Graphs, Cycles
 a Decision              a Tool                  Agent                   & Recovery
```

---

## Module 1 — Tokenization & Logit Control (Understanding Stochasticity)

**Core question**: Why does the same prompt sometimes produce different tool selections?

| Concept | What you learn |
|---|---|
| Tokenization | Text is split into subword tokens; the granularity affects how the model "sees" tool names. |
| Logits & Softmax | The model outputs a vector of scores (logits) over the vocabulary; sampling converts these to a probability distribution. |
| Temperature & Top-p | Sampling parameters control the spread of that distribution — and therefore the variance of tool selection. |
| Prompt conditioning | The prompt is the context that shapes the logit distribution. Structure, order, and clarity shift the mode. |

**Lab 1 — The Anatomy of a Decision**: Focuses on how prompt structure influences tool selection accuracy. Experiments with definition order, prompt clarity, temperature, and format drift.

---

## Module 2 — Tool Definition & Pydantic (Defining the Interface)

**Core question**: How do you make tool selection unambiguous and tool arguments parseable?

| Concept | What you learn |
|---|---|
| JSON Schema / Pydantic | Formal schemas constrain both what the model can select and what arguments it must provide. |
| Function calling API | Modern LLMs have native "tool use" modes that enforce structured output via schema. |
| Validation & error messages | Pydantic validators catch malformed tool calls before they reach your backend. |
| Description engineering | The `description` field in a tool schema is a mini-prompt; its wording directly affects selection accuracy. |

**Lab 2 — The Contract of a Tool**: Define tools with Pydantic, use OpenAI function-calling, and observe how schema quality affects selection and argument accuracy.

---

## Module 3 — Memory & State (Managing Context Persistence)

**Core question**: How does an agent remember what happened in previous steps?

| Concept | What you learn |
|---|---|
| Conversation history | The simplest memory: append messages to the prompt. Trade-off: context window is finite. |
| Summarization & compression | Strategies to keep relevant history without exceeding the window. |
| External state stores | Key-value stores, vector databases, and structured state objects that persist across calls. |
| State serialization | How to snapshot and restore agent state for debugging and replay. |

**Lab 3 — The Persistent Agent**: Build an agent that maintains state across multi-turn interactions, observe context-window overflow, and implement a summarization strategy.

---

## Module 4 — LangGraph / Flow Logic (Handling Cycles and Error Recovery)

**Core question**: How do you orchestrate multi-step agent workflows with branches, loops, and fallbacks?

| Concept | What you learn |
|---|---|
| DAGs vs. cyclic graphs | Most pipelines are DAGs; agents that retry or self-correct require cycles. |
| LangGraph nodes & edges | Each node is a function (or LLM call); edges define control flow. |
| Conditional routing | Route to different nodes based on LLM output, tool result, or state. |
| Error recovery patterns | Retry, fallback, human-in-the-loop, and graceful degradation. |

**Lab 4 — Graphs, Cycles & Recovery**: Build a LangGraph workflow with conditional edges, implement retry logic, and observe how graph structure affects reliability.

---

## Progression Logic

```
Lab 1 (prompt → tool choice)
  └─► Lab 2 (schema → structured tool calls)
        └─► Lab 3 (state → multi-turn coherence)
              └─► Lab 4 (graph → orchestrated workflows)
```

Each lab builds on the previous one. By the end, a student should be able to:

1. Diagnose why an EOP agent selected the wrong tool.
2. Fix the tool definition or prompt to correct the behavior.
3. Inspect and modify the agent's state mid-execution.
4. Trace a failure through the agent's execution graph and add recovery logic.

---

## Prerequisites

- Python 3.10+
- Familiarity with REST APIs and JSON
- Basic understanding of neural networks (attention, softmax)
- A Google Colab account (free tier is sufficient for all labs)
- An OpenAI API key (or access to an equivalent chat-completion endpoint)
