# Lab 6: Claim-Contingent Disclosure — Disclosure Scope and Claim Strength

**Series**: Agentic Engineering Crash Course (Domain Layer)  
**Module**: EOP/ECF — Coding Assistant (Claim-contingent Scope Advice)  
**Prerequisites**: Labs 1–5, Python 3.10+, OpenAI API key, familiarity with EOP/ECF and scientific claims  

---

## How to use this tutorial in Google Colab

1. Open [Google Colab](https://colab.research.google.com/) and create a new notebook.
2. For each **markdown section** below: insert a **Text cell** and paste the section.
3. For each **code block**: insert a **Code cell** and paste the code, then run.
4. Run cells in order from top to bottom.

**Suggested time**: 45–60 min.  
**Experiments**: Baseline (required). Exploration: Experiments 1–2 required; Experiment 3 optional.

---

## 1. Learning Objectives

By the end of this lab you will be able to:

1. **Distinguish** scientific claim strengths relevant to disclosure: e.g. **existential** ("we can produce X") vs. **distributional** ("we reliably produce X under conditions Y").
2. **Given** a short description of a claim and its strength, **determine** a recommended disclosure scope (what code, data, and documentation should be shared).
3. **Use** an LLM with a structured prompt (and optional tools) to map claim strength → disclosure level and to explain the reasoning.
4. **Relate** this skill to the EOP Agent capability "Claim-contingent Scope Advice."

---

## 2. Theoretical Why: Why Claim Strength Affects Disclosure

### Mechanism

**Evidence-Oriented Programming (EOP)** ties research software to **scientific claims**. Not all claims impose the same burden of evidence:

- **Existential claims** (e.g. "We can train a model that achieves >90% accuracy on dataset D") focus on *possibility* or a single result. Disclosure may reasonably emphasize: one runnable path, key code, and enough to reproduce the reported result.
- **Distributional or reliability claims** (e.g. "Our method reliably achieves >90% across seeds and train/test splits") make stronger statements about *generalization* or *stability*. Disclosure typically needs: multiple runs, seeds, splits, and possibly full training/eval code and data so others can assess reliability.

Regulators, reviewers, and the EOP framework often distinguish:

- **Minimal disclosure**: Enough to verify the claim exists (e.g. one executable path, one result).
- **Standard disclosure**: Code, data (or access), and documentation so that an independent party can reproduce and slightly vary the setup.
- **Full disclosure**: Everything needed to assess reliability and variation (multiple runs, ablations, environment, dependencies).

**Claim strength** (existential vs. distributional, or weak vs. strong) should **drive** the recommended scope so that disclosure is proportionate and reviewable.

**Maintenance connection**: The EOP Agent's "Claim-contingent Scope Advice" helps researchers decide *how much* to disclose given *what* they claim. When the agent gives generic advice, improving the prompt (claim types, scope levels, and examples) aligns outputs with EOP/ECF expectations.

---

## 3. Setup

**Dependencies**: Python 3.10+, `openai`.

```python
# Cell: Install and import
!pip install -q openai
```

```python
# Cell: API key and client (OpenAI or NVIDIA NIM)
import os
import json
from getpass import getpass

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
print(f"Using model: {MODEL}")
```

---

## 4. Baseline Code: Claim Strength → Disclosure Scope

We define **claim strength** labels and **disclosure scope** levels in a system prompt. The LLM takes a short claim description and returns: (1) classified claim strength, (2) recommended disclosure scope, (3) brief reasoning.

### 4.1 Definitions and single-call advisor

```python
# Cell: Claim strength and disclosure scope definitions

CLAIM_SCOPE_SYSTEM = """You are an EOP/ECF advisor. You help researchers match disclosure scope to the strength of their scientific claims.

Claim strength (choose one):
- existential: "We can do X" / "It is possible to achieve X" — single instance or possibility.
- distributional: "We reliably do X" / "Our method consistently achieves X under conditions Y" — generalization, stability, or repeated results.

Disclosure scope (choose one):
- minimal: One runnable path, key code, and one reported result; enough to verify the claim exists.
- standard: Code, data (or access), and documentation so an independent party can reproduce and slightly vary the setup.
- full: Everything needed to assess reliability: multiple runs, seeds/splits, environment, dependencies; supports distributional claims.

Rule of thumb: Stronger (distributional) claims → broader (standard or full) disclosure. Weaker (existential) claims → often minimal or standard.

Reply with JSON only: {"claim_strength": "existential"|"distributional", "disclosure_scope": "minimal"|"standard"|"full", "reasoning": "1-2 sentences."}"""

def advise_disclosure(claim_description: str) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=[
            {"role": "system", "content": CLAIM_SCOPE_SYSTEM},
            {"role": "user", "content": f"Claim: {claim_description}"},
        ],
        max_tokens=200,
    )
    text = response.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1].replace("json", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"_raw": text}
```

### 4.2 Run on example claims

```python
# Cell: Baseline — example claims

EXAMPLES = [
    "We trained a model that reaches 95% accuracy on the test set.",
    "Our method consistently achieves 95% accuracy across 10 random seeds and three train/test splits.",
    "We show that optimization X is feasible for problem Y.",
]

for claim in EXAMPLES:
    out = advise_disclosure(claim)
    print("Claim:", claim[:60], "...")
    print("  Strength:", out.get("claim_strength"), "| Scope:", out.get("disclosure_scope"))
    print("  Reasoning:", out.get("reasoning", out.get("_raw", ""))[:120])
    print()
```

**Expected**: First claim → often existential + minimal/standard; second → distributional + standard/full; third → existential + minimal.  
**Record**: The (strength, scope) pair and reasoning for each example.

---

## 5. Exploration Lab: Edge Cases, Conflicting Cues, and Custom Scopes

### Experiment 1: Vague claim

**Variable**: A claim that does not clearly state "we can" vs. "we reliably."  
**Hypothesis**: The model may default to one strength or scope; vague wording increases variance.

```python
# Cell: Experiment 1 — Vague claim

VAGUE = "Our approach works well on the benchmark."
out = advise_disclosure(VAGUE)
print("Vague claim ->", out.get("claim_strength"), out.get("disclosure_scope"))
print("Reasoning:", out.get("reasoning", "")[:150])
```

**Observe**: Whether the model picks existential or distributional and how it justifies. **Record**: The outcome. **Implication**: In production, prompt for clarification or use a "conservative" default (e.g. standard) when unclear.

---

### Experiment 2: Conflicting cues

**Variable**: A claim that mixes existential wording with distributional implications (e.g. "We can achieve X, and we ran 20 seeds.").  
**Hypothesis**: The model may prioritize one cue; the recommended scope may lean toward the stronger interpretation.

```python
# Cell: Experiment 2 — Mixed cues

MIXED = "We can achieve 90% accuracy; we ran 20 random seeds and report mean and std."
out = advise_disclosure(MIXED)
print("Mixed claim ->", out.get("claim_strength"), out.get("disclosure_scope"))
print("Reasoning:", out.get("reasoning", "")[:200])
```

**Observe**: If the model recommends "full" or "standard" because of the 20 seeds, it is correctly weighting the distributional aspect. **Record**: Strength and scope. **Implication**: Explicitly describing "existential vs. distributional" in the prompt helps the model handle mixed cues.

---

### Experiment 3: Custom scope level

**Variable**: Add a fourth scope, e.g. **"audit_only"**: code and config shared under NDA or for audit, not public.  
**Hypothesis**: The model can map claim strength to a custom level when the prompt defines it.

```python
# Cell: Experiment 3 — Custom scope (audit_only)

CUSTOM_SYSTEM = """You are an EOP/ECF advisor. You help researchers match disclosure scope to the strength of their scientific claims.

Claim strength (choose one):
- existential: "We can do X" / "It is possible to achieve X" — single instance or possibility.
- distributional: "We reliably do X" / "Our method consistently achieves X under conditions Y" — generalization, stability, or repeated results.

Disclosure scope (choose one):
- minimal: One runnable path, key code, and one reported result; enough to verify the claim exists.
- standard: Code, data (or access), and documentation so an independent party can reproduce and slightly vary the setup.
- full: Everything needed to assess reliability: multiple runs, seeds/splits, environment, dependencies; supports distributional claims.
- audit_only: Code and config available for audit or under NDA, not public; for sensitive or proprietary settings.

Rule of thumb: Stronger (distributional) claims → broader (standard or full) disclosure. Weaker (existential) claims → often minimal or standard. Use audit_only when legal or proprietary constraints prevent public release.

Reply with JSON only: {"claim_strength": "existential"|"distributional", "disclosure_scope": "minimal"|"standard"|"full"|"audit_only", "reasoning": "1-2 sentences."}"""

def advise_disclosure_custom(claim_description: str) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=[
            {"role": "system", "content": CUSTOM_SYSTEM},
            {"role": "user", "content": f"Claim: {claim_description}"},
        ],
        max_tokens=200,
    )
    text = response.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1].replace("json", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"_raw": text}

# Use when external or proprietary constraints apply
PROPRIETARY_CLAIM = "We use a proprietary solver to achieve the reported runtime; we cannot release the solver."
out_custom = advise_disclosure_custom(PROPRIETARY_CLAIM)
print("Proprietary claim ->", out_custom.get("disclosure_scope"))
print("Reasoning:", out_custom.get("reasoning", "")[:200])
```

**Observe**: The model may suggest "audit_only" or "standard" with a note about the solver. **Record**: Whether the custom level was selected when appropriate. **Implication**: EOP Agent "External Barrier Handling" can suggest audit-only or restricted disclosure when constraints exist; this prompt extends scope advice to that case.

---

## 6. Maintenance Connection: EOP Agent Claim-Contingent Scope Advice

### How this maps to the EOP Agent

- **Claim-contingent Scope Advice**: The agent advises on disclosure scope based on claim strength; this lab implements a prompt-based advisor with existential vs. distributional and minimal/standard/full (and optional audit_only).
- **External Barrier Handling**: When proprietary or security constraints exist, the agent suggests alternatives (auditable intermediate data, restricted access); Experiment 3 introduces an audit-only style scope.

### Improving robustness

- Add **few-shot examples** (claim text → strength, scope, reasoning).
- Use **structured output** (e.g. Pydantic) so the agent always returns parseable strength and scope.
- For integration with the rest of the agent, expose this as a **tool** (e.g. `advise_disclosure_scope(claim_text)`) so other nodes can call it.

---

## 7. Summary and Next Steps

### Three takeaways

1. **Claim strength** (existential vs. distributional) should drive **disclosure scope** (minimal, standard, full) so that evidence matches what is claimed.
2. **Vague or mixed claims** need clear prompt definitions and optionally conservative defaults or clarification steps.
3. **Custom scope levels** (e.g. audit_only) extend the advisor to proprietary or constrained settings and align with EOP "External Barrier Handling."

### Course completion

You have completed the **Domain Layer** labs (Lab 5 — Evidence Chain Extraction, Lab 6 — Claim-contingent Disclosure). Together with the **Foundation Layer** (Labs 1–4), you can:

- Diagnose and fix tool selection and schema issues (Labs 1–2).
- Manage multi-turn state and context (Lab 3).
- Orchestrate workflows with graphs, retries, and fallbacks (Lab 4).
- Apply ECF artifact extraction and restructuring (Lab 5).
- Advise on disclosure scope given claim strength (Lab 6).

---

## 整合視角（Integration View）：How Labs 1–6 Fit Together

| Layer | Labs | EOP Agent capability |
|-------|------|----------------------|
| **Foundation** | Lab 1 | Prompt structure → correct tool selection |
| | Lab 2 | Tool interface & validation (schema, Pydantic) |
| | Lab 3 | Multi-turn memory, state, summarization |
| | Lab 4 | Flow orchestration, retry, fallback, human-in-the-loop |
| **Domain** | Lab 5 | Evidence Chain Extraction / directory mapping |
| | Lab 6 | Claim-contingent scope advice / external barriers |

**How to plug Lab 5 and Lab 6 into the Lab 4 graph:**

- **Lab 5**: Expose the ECF classification and restructuring logic as a **tool** (e.g. `classify_repo_artifacts(repo_path)` or `suggest_restructure(files)`). In the Lab 4 graph, the **route** node can call this tool when the user asks for evidence-chain extraction; the **execute** node runs it and returns the result to **respond**.
- **Lab 6**: Expose the claim → disclosure advice as a **tool** (e.g. `advise_disclosure_scope(claim_text)`). The same graph can route to this tool when the user asks for disclosure advice; the execute node runs it and the respond node formats the answer.

So: **Foundation (1–4)** gives you the agent skeleton (prompt, tools, state, graph); **Domain (5–6)** gives you EOP-specific tools or nodes that you register in Lab 4’s graph and call from the router.

---

*End of Lab 6. End of Agentic Engineering Crash Course — Domain Layer.*
