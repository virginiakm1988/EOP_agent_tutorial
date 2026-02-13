# Agentic Engineering Crash Course — Learning Roadmap

> **Audience**: PhD students transitioning from traditional coding to agentic engineering.
> **Goal**: Build the skills required to maintain and extend **EOP (Evidence-Oriented Programming) Agents**.

---

## Philosophy

Traditional software engineering is deterministic: you write a function, it returns the same output for the same input. Agentic systems are **stochastic pipelines** — an LLM sits at the decision core, and its outputs are sampled from a probability distribution conditioned on the prompt context. Maintaining these systems requires a different mental model: one rooted in probability, interface contracts, state management, and graph-based control flow.

This roadmap is structured in two layers: a **foundation layer** (Labs 1–4) of generic agentic skills, and a **domain layer** (Labs 5–6) of EOP/ECF-specific skills. Every lab follows the same template:

| Section | Purpose |
|---------|---------|
| **Theoretical Why** | The mechanism behind the behavior (latent space, state machines, DAGs). |
| **Baseline Code** | Minimal working example you can run and inspect. |
| **Exploration Lab** | Code that purposely fails or behaves stochastically to reveal edge cases. |
| **Maintenance Connection** | How this specific skill maps to debugging or scaling EOP Agents. |

---

## Lab 0 — Build a Minimal EOP Agent Prototype (Optional Warm-up)

**Files**: `Lab0_Build_an_EOP_Agent_Prototype.ipynb` | `Lab0_Build_an_EOP_Agent_Prototype.md`

A short, step-by-step lab (~30–40 min) that builds the **simplest EOP agent** from scratch: setup → define two EOP-themed tools (`annotate_artifact`, `link_to_claim`) → prompt + LLM call → parse tool choice → execute tool. No frameworks; one single-turn loop. Good as a warm-up before Lab 1 or for anyone who wants to see the full “prompt → tool choice → run” anatomy in one place.

---

## Overview: Foundation and Domain Layers

```
Optional warm-up:  Lab 0 (minimal EOP agent)
                          |
Foundation layer:  Lab 1 → Lab 2 → Lab 3 → Lab 4
                  (prompt) (tools) (state) (graphs)
                          |
Domain layer:             Lab 5 → Lab 6
                  (evidence chain) (claim-contingent disclosure)
```

---

## Foundation Layer — Module Map

```
Module 1                Module 2                Module 3                Module 4
Tokenization &          Tool Definition &       Memory &                LangGraph /
Logit Control            Pydantic                State                   Flow Logic
─────────────            ─────────────           ─────────────           ─────────────
Understand               Define the              Manage context          Handle cycles
stochasticity            interface               persistence             & error recovery
     │                        │                        │                        │
     ▼                        ▼                        ▼                        ▼
 Lab 1                    Lab 2                    Lab 3                    Lab 4
 Anatomy of               Contract of             The Persistent          Graphs, Cycles
 a Decision               a Tool                  Agent                    & Recovery
```

---

## Module 1 — Tokenization & Logit Control (Understanding Stochasticity)

**Core question**: Why does the same prompt sometimes produce different tool selections?

| Concept | What you learn |
|---------|----------------|
| Tokenization | Text is split into subword tokens; the granularity affects how the model "sees" tool names. |
| Logits & Softmax | The model outputs a vector of scores (logits) over the vocabulary; sampling converts these to a probability distribution. |
| Temperature & Top-p | Sampling parameters control the spread of that distribution — and therefore the variance of tool selection. |
| Prompt conditioning | The prompt is the context that shapes the logit distribution. Structure, order, and clarity shift the mode. |

**Lab 1 — The Anatomy of a Decision**  
**Files**: `Lab1_Anatomy_of_a_Decision.ipynb` | `Lab1_Anatomy_of_a_Decision.md`

Focuses on how prompt structure influences tool selection accuracy. Includes **system prompt design** (role, audience, EOP advocacy, objection handling) and prompt-engineering experiments. Covers definition order, prompt clarity, temperature, and format drift.

---

## Module 2 — Tool Definition & Pydantic (Defining the Interface)

**Core question**: How do you make tool selection unambiguous and tool arguments parseable?

| Concept | What you learn |
|---------|----------------|
| JSON Schema / Pydantic | Formal schemas constrain both what the model can select and what arguments it must provide. |
| Function calling API | Modern LLMs have native "tool use" modes that enforce structured output via schema. |
| Validation & error messages | Pydantic validators catch malformed tool calls before they reach your backend. |
| Description engineering | The `description` field in a tool schema is a mini-prompt; its wording directly affects selection accuracy. |

**Lab 2 — The Contract of a Tool**  
**Files**: `Lab2_Contract_of_a_Tool.ipynb` | `Lab2_Contract_of_a_Tool.md`

Define tools with Pydantic, use OpenAI function-calling, and observe how schema quality affects selection and argument accuracy.

---

## Module 3 — Memory & State (Managing Context Persistence)

**Core question**: How does an agent remember what happened in previous steps?

| Concept | What you learn |
|---------|----------------|
| Conversation history | The simplest memory: append messages to the prompt. Trade-off: context window is finite. |
| Summarization & compression | Strategies to keep relevant history without exceeding the window. |
| External state stores | Key-value stores, vector databases, and structured state objects that persist across calls. |
| State serialization | How to snapshot and restore agent state for debugging and replay. |

**Lab 3 — The Persistent Agent**  
**Files**: `Lab3_The_Persistent_Agent.ipynb` | `Lab3_The_Persistent_Agent.md`

Build an agent that maintains state across multi-turn interactions, observe context-window overflow, and implement a summarization strategy.

---

## Module 4 — LangGraph / Flow Logic (Handling Cycles and Error Recovery)

**Core question**: How do you orchestrate multi-step agent workflows with branches, loops, and fallbacks?

| Concept | What you learn |
|---------|----------------|
| DAGs vs. cyclic graphs | Most pipelines are DAGs; agents that retry or self-correct require cycles. |
| LangGraph nodes & edges | Each node is a function (or LLM call); edges define control flow. |
| Conditional routing | Route to different nodes based on LLM output, tool result, or state. |
| Error recovery patterns | Retry, fallback, human-in-the-loop, and graceful degradation. |

**Lab 4 — Graphs, Cycles & Recovery**  
**Files**: `Lab4_Graphs_Cycles_and_Recovery.ipynb` | `Lab4_Graphs_Cycles_and_Recovery.md`

Build a LangGraph workflow with conditional edges, implement retry logic, and observe how graph structure affects reliability.

---

## Domain Layer — EOP/ECF-Specific Labs

After the foundation (Labs 1–4), two labs apply those skills to **EOP Agent capabilities**: Restructure Code and Coding Assistant.

---

## Lab 5 — Evidence Chain Extraction (Restructure Code)

**Core question**: How do you identify ECF artifact types in a research repo and suggest restructuring?

| Concept | What you learn |
|---------|----------------|
| Seven ECF artifact types | Input data, experimental process, output data, visual data, plotting process, visual claims, documentation. |
| Repo → ECF mapping | Given a messy or flat layout, map files/dirs to artifact types. |
| LLM for classification | Use structured prompts (and optional tools) to suggest ECF-aligned directory structure and pipeline order. |

**Lab 5 — Evidence Chain Extraction**  
**Files**: `Lab5_Evidence_Chain_Extraction.ipynb` | `Lab5_Evidence_Chain_Extraction.md`

**Prerequisites**: Labs 1–4. Identify which files or directories map to which ECF artifact and use an LLM to suggest restructuring. Maps to the EOP Agent capabilities **Evidence Chain Extraction** and **Directory Structure Mapping**.

---

## Lab 6 — Claim-Contingent Disclosure (Coding Assistant)

**Core question**: How does claim strength (existential vs. distributional) drive recommended disclosure scope?

| Concept | What you learn |
|---------|----------------|
| Claim strength | Existential (“we can produce X”) vs. distributional (“we reliably produce X”) and the evidence burden each implies. |
| Disclosure levels | Minimal, standard, and full disclosure; proportionate to claim strength. |
| LLM for scope advice | Map claim strength → disclosure level and explain reasoning. |

**Lab 6 — Claim-Contingent Disclosure**  
**Files**: `Lab6_Claim_Contingent_Disclosure.ipynb` | `Lab6_Claim_Contingent_Disclosure.md`

**Prerequisites**: Labs 1–5. Given a short description of a claim and its strength, determine recommended disclosure scope. Maps to the EOP Agent capability **Claim-contingent Scope Advice**.

---

## Progression Logic

```
Lab 0 (optional)  →  minimal EOP agent
Lab 1             →  prompt → tool choice; system prompt design
Lab 2             →  schema → structured tool calls
Lab 3             →  state → multi-turn coherence
Lab 4             →  graph → orchestrated workflows
Lab 5             →  evidence chain extraction (EOP/ECF)
Lab 6             →  claim-contingent disclosure (EOP/ECF)
```

By the end, a student should be able to:

1. **Diagnose** why an EOP agent selected the wrong tool.
2. **Fix** the tool definition or prompt to correct the behavior.
3. **Inspect and modify** the agent's state mid-execution.
4. **Trace** a failure through the agent's execution graph and add recovery logic.
5. **Apply** evidence-chain extraction and claim-contingent disclosure in EOP/ECF contexts.

---

## Prerequisites

- Python 3.10+
- Familiarity with REST APIs and JSON
- Basic understanding of neural networks (attention, softmax) helpful but not required for Lab 0–1
- A Google Colab account (free tier is sufficient for all labs), or a local Jupyter environment
- An **OpenAI API key** or **NVIDIA NIM** access (Labs support both; set `USE_NIM=1` or `NIM_API_KEY` for NIM)
