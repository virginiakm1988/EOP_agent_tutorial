# EOP Agent — Capability Architecture & Tutorial Series

> **Project**: AI Agent for Evidence-Oriented Programming (EOP)
> **Collaboration**: NVIDIA Research
> **Context**: Building an AI agent that helps researchers adopt EOP/ECF practices for research software disclosure

---

## What is EOP?

**Evidence-Oriented Programming (EOP)** is a conceptual model introduced in the paper *"Research software as scientific evidence"* (Zhang et al.). It reorients research software development around the relationship between **scientific claims** and the **computational artifacts** (software components and data elements) that substantiate them.

**Evidence Chain Formalization (ECF)** operationalizes EOP by mapping a traceable chain:

```
input data
  → experimental / analytical process(es)
    → output data
      → visual data
        → plotting / summarizing process(es)
          → visual claims (figures, tables, statistics)
```

The EOP Agent assists researchers in understanding, adopting, and implementing EOP/ECF-compliant research software practices.

---

## Agent Core Functions

The EOP Agent serves three primary functions:

### 1. Advocacy — Promote EOP adoption

Help researchers understand the EOP concept and motivate them to adopt it in their own work.

| Capability | Description |
|---|---|
| **EOP/ECF Knowledge Base** | Deep understanding of the three EOP dimensions (scope, timing, form) and the ECF basic evidence chain with its seven artifact types |
| **Audience-adaptive Explanation** | Adjust explanation depth based on the user's software development experience (from "no experience" to "proficient") |
| **Stakeholder Framing** | Present benefits tailored to user role: author, reviewer, editor, or external actor — each with distinct incentives per the EOP framework |
| **Concrete Case Demonstration** | Reference real examples (e.g., the neural network motif case study, the AlphaFold3 disclosure incident) to illustrate EOP's practical value |
| **Objection Handling** | Address common concerns: "How is this different from reproducibility?", "Does ECF address misconduct?", "Is this too much overhead?" |

### 2. Restructure Code — Transform existing code to EOP/ECF-compliant structure

Help researchers reorganize their research software archives to support evidence chain traceability.

| Capability | Description |
|---|---|
| **Directory Structure Mapping** | Reorganize user repositories into the ECF-prescribed structure: `work/`, `input/`, `output/`, `claim/`, `source/`, `test/`, `case/`, `document/` + entry document |
| **Evidence Chain Extraction** | Identify the seven ECF artifacts in existing code: input data, experimental process, output data, visual data, plotting process, visual claims, documentation |
| **Pipeline Ordering** | Establish correct execution order (e.g., `run_tasks.py` → `run_packs.py` → `show_main.py`) ensuring end-to-end traceability |
| **Intermediate Data Checkpoint Design** | Recommend appropriate checkpoint granularity — not too coarse (obscures logic) nor too fine (introduces clutter) |
| **Lightweighting** | Remove computational artifacts that do not contribute to reported visual claims (deprecated analyses, dead code, orphan outputs) |
| **Software Usage Classification** | Classify the user's software along three dimensions: invocation complexity, methodological novelty, and initialization difficulty — to determine appropriate disclosure level |

### 3. Coding Assistant — Support daily EOP-compliant development

Assist researchers in writing and maintaining EOP/ECF-compliant code during active development.

| Capability | Description |
|---|---|
| **Entry Document Generation** | Auto-generate README/entry documents describing archive scope, directory structure, execution environment, and pipeline run order |
| **Evidence Chain Validation** | Verify that the code maintains a complete evidence chain — every step from input to visual claim is traceable and executable |
| **Modular Packaging** | Help break monolithic scripts into independent modules, each with a short accompanying document describing its computational task |
| **External Barrier Handling** | When proprietary, commercial, or security constraints exist, suggest alternative disclosure strategies: auditable intermediate data or restricted functional equivalence implementations |
| **Hash Value Generation** | Provide hash values for withheld components to enable future verification upon disclosure |
| **Claim-contingent Scope Advice** | Advise on disclosure scope based on claim strength — existential claims ("we can produce X") vs. distributional claims ("we reliably produce X") require different disclosure levels |

---

## Capability Architecture

```
                           EOP Agent
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
       1. Advocacy       2. Restructure      3. Coding
                            Code             Assistant
            |                  |                  |
      ┌─────┴─────┐    ┌──────┴──────┐    ┌──────┴──────┐
      | Knowledge  |    | Evidence    |    | Chain       |
      | Retrieval  |    | Chain       |    | Validation  |
      | (EOP/ECF)  |    | Extraction  |    |             |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | Audience   |    | Directory   |    | Entry Doc   |
      | Adaptation |    | Structure   |    | Generation  |
      |            |    | Mapping     |    |             |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | Stakeholder|    | Pipeline    |    | Modular     |
      | Framing    |    | Ordering    |    | Packaging   |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | Case Demo  |    | Checkpoint  |    | Barrier     |
      |            |    | Design      |    | Handling    |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | Objection  |    | Light-      |    | Claim-scope |
      | Handling   |    | weighting   |    | Advice      |
      └────────────┘    └─────────────┘    └─────────────┘
```

---

## Tutorial Series — Agentic Engineering Crash Course

The tutorial series trains PhD students to build and maintain the EOP Agent. It follows a two-layer structure, with an optional warm-up lab.

### Optional Warm-up

| Lab | Title | Core Skill |
|-----|-------|------------|
| **Lab 0** | Build a Minimal EOP Agent Prototype | Step-by-step: setup → EOP tools (`annotate_artifact`, `link_to_claim`) → prompt + LLM → parse tool → execute. Single-turn agent, no frameworks. (~30–40 min.) |

### Foundation Layer (Generic Agentic Skills)

| Lab | Title | Core Skill |
|-----|-------|------------|
| Lab 1 | The Anatomy of a Decision | Prompt structure → tool selection accuracy; **system prompt design** (role, audience, EOP advocacy & objection handling) |
| Lab 2 | The Contract of a Tool | Pydantic schemas → structured tool calls |
| Lab 3 | The Persistent Agent | Memory & state → multi-turn coherence |
| Lab 4 | Graphs, Cycles & Recovery | LangGraph → orchestrated workflows with error recovery |

### Domain Layer (EOP-Specific Skills)

| Lab | Title | Core Skill |
|-----|-------|------------|
| Lab 5 | Evidence Chain Extraction | Given a messy research repo, identify ECF's seven artifacts and suggest restructuring |
| Lab 6 | Claim-contingent Disclosure | Given scientific claims of varying strength, determine required disclosure scope |

### Progression

```
Warm-up:    Lab 0 (optional)
                |
Foundation: Lab 1 → Lab 2 → Lab 3 → Lab 4
                                        |
Domain:                            Lab 5 → Lab 6
```

---

## Repository Structure

```
ECM-Agent-tutorial/
├── README.md                              # This file (English)
├── README_zh.md                           # Chinese version
├── ROADMAP.md                             # Detailed learning roadmap
├── Glossary.md                            # Term definitions (EN)
├── Glossary_zh.md                         # Term definitions (ZH)
├── EOP Agent.pdf                          # Source paper
├── Lab0_Build_an_EOP_Agent_Prototype.md   # Lab 0 (optional warm-up)
├── Lab0_Build_an_EOP_Agent_Prototype.ipynb
├── Lab1_Anatomy_of_a_Decision.md
├── Lab1_Anatomy_of_a_Decision.ipynb       # Lab 1 — prompt structure & system prompt design
├── Lab2_Contract_of_a_Tool.md
├── Lab2_Contract_of_a_Tool.ipynb
├── Lab3_The_Persistent_Agent.md
├── Lab3_The_Persistent_Agent.ipynb
├── Lab4_Graphs_Cycles_and_Recovery.md
├── Lab4_Graphs_Cycles_and_Recovery.ipynb
├── Lab5_Evidence_Chain_Extraction.md
├── Lab5_Evidence_Chain_Extraction.ipynb
├── Lab6_Claim_Contingent_Disclosure.md
├── Lab6_Claim_Contingent_Disclosure.ipynb
└── outlines/
    ├── Lab2_Contract_of_a_Tool.outline.md
    ├── Lab3_The_Persistent_Agent.outline.md
    └── Lab4_Graphs_Cycles_and_Recovery.outline.md
```

---

## References

- Zhang, H. et al. "Research software as scientific evidence: clarifying missing specifications." (EOP/ECF paper)
- Zhang, H. et al. "Reviewability and Supportability: New complementary principles to empower research software practices." *Computational and Structural Biotechnology Journal* 23 (2024).
- Zhang, H. et al. "Leveraging network motifs to improve artificial neural networks." *Nature Communications* (2025).
