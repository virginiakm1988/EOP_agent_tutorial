# Lab 5: Evidence Chain Extraction — Identifying ECF Artifacts in a Research Repo

**Series**: Agentic Engineering Crash Course (Domain Layer)
**Module**: OOP/ECF — Restructure Code (Evidence Chain Extraction)
**Prerequisites**: Labs 1–4 (foundation layer), Python 3.10+, OpenAI API key, familiarity with EOP/ECF concepts

This lab uses **single LLM calls** (and optional tools) to do ECF classification and restructuring. In a full EOP agent, you can wrap this logic as **one tool or one graph node** and plug it into the Lab 4 graph (e.g. a "classify_and_restructure" node or tool that the router can call).

---

## What You Will Build (Plain English)

Imagine a researcher has a folder of Python scripts, CSV files, and figures — but they're all mixed together with no clear organization. This lab teaches you to use an AI model to look at that folder and say: "this file is input data, this script is an analysis process, this figure is a visual claim."

That classification is the first step toward making the research software reviewable and traceable — the core goal of EOP.

By the end of this lab you will have built a program that:
1. Takes a list of files and their descriptions
2. Asks an AI model to classify each one into one of seven ECF artifact types
3. Asks the model to suggest how to reorganize them into a cleaner folder structure
4. Asks the model to order the analysis scripts into a logical run sequence

> **Quick recap of the seven ECF artifact types** (from Lab 0/README):
>
> | Type | Plain English |
> |------|--------------|
> | `input_data` | The raw data you start with |
> | `experimental_process` | Scripts that transform input into output |
> | `output_data` | Results produced by those scripts |
> | `visual_data` | Data specifically prepared for plotting |
> | `plotting_process` | Scripts that make figures or tables |
> | `visual_claims` | The actual figures/tables that appear in the paper |
> | `documentation` | README files and run instructions |

> **New pattern this lab — JSON parsing**: The model is asked to reply in JSON format so your code can parse it as a Python dictionary. The `json.loads()` function converts a JSON string into a dict. Some models wrap JSON in markdown code fences (` ```json ... ``` `); the code handles that automatically.

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

1. **Name** the seven ECF (Evidence Chain Formalization) artifact types in the basic evidence chain.
2. **Given** a messy or flat research repo layout (real or simulated), **identify** which files or directories map to which ECF artifact.
3. **Use** an LLM with a structured prompt (and optional tools) to suggest a restructuring that aligns the repo with ECF directory structure and pipeline order.
4. **Relate** this skill to the EOP Agent capability "Evidence Chain Extraction" and "Directory Structure Mapping."

---

## 2. Theoretical Why: Why Evidence Chain Extraction Matters

### Mechanism

**Evidence-Oriented Programming (EOP)** ties research software to the relationship between **scientific claims** and the **computational artifacts** that support them. **Evidence Chain Formalization (ECF)** operationalizes this as a traceable chain:

```
input data
  → experimental / analytical process(es)
    → output data
      → visual data
        → plotting / summarizing process(es)
          → visual claims (figures, tables, statistics)
            + documentation
```

The **seven ECF artifact types** commonly referenced are:

| # | Artifact type | Description |
|---|----------------|-------------|
| 1 | Input data | Raw or preprocessed inputs to the pipeline |
| 2 | Experimental / analytical process | Code that transforms input → output |
| 3 | Output data | Intermediate or final computed results |
| 4 | Visual data | Data prepared for visualization |
| 5 | Plotting / summarizing process | Code that produces figures, tables, stats |
| 6 | Visual claims | Figures, tables, statistics reported in papers |
| 7 | Documentation | Entry document, README, per-step descriptions |

Researchers often have **messy repos**: one-off scripts, mixed concerns, no clear separation of these seven. The EOP Agent helps by **extracting** which files play which roles and **suggesting** a restructuring (e.g. into `work/`, `input/`, `output/`, `claim/`, `source/`, etc.) so the evidence chain is explicit and reviewable.

**Maintenance connection**: The EOP Agent's "Evidence Chain Extraction" and "Directory Structure Mapping" capabilities depend on this taxonomy. When the agent misclassifies a file, improving the prompt (artifact definitions, few-shot examples) and optional tool schema (e.g. a tool that returns structured artifact labels) improves accuracy.

---

## 3. Setup

**Dependencies**: Python 3.10+, `openai`. Optionally `pydantic` for structured outputs.

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

## 4. Baseline Code: Simulated Repo and ECF Classifier

We create a **simulated messy repo** (a list of file paths and short descriptions) and a **system prompt** that defines the seven ECF artifact types. The LLM classifies each file into one artifact type and we print a simple report.

### 4.1 ECF definitions and simulated repo

```python
# Cell: ECF artifact definitions and simulated repo

ECF_ARTIFACTS = [
    "input_data",
    "experimental_process",
    "output_data",
    "visual_data",
    "plotting_process",
    "visual_claims",
    "documentation",
]

ECF_SYSTEM = """You are an EOP/ECF expert. Given a research repository layout, you classify each item into exactly one of these ECF artifact types:

1. input_data — Raw or preprocessed inputs to the pipeline.
2. experimental_process — Code or config that transforms input into output (e.g. training, analysis scripts).
3. output_data — Intermediate or final computed results (e.g. model checkpoints, CSV outputs).
4. visual_data — Data prepared specifically for visualization.
5. plotting_process — Code that produces figures, tables, or summary statistics.
6. visual_claims — The actual figures, tables, or statistics reported in papers.
7. documentation — README, entry document, or per-step descriptions.

Reply with a JSON object: keys = file or folder paths, values = one of the seven artifact types. No other text."""

# Simulated "messy" repo: flat list of paths and one-line descriptions
MESSY_REPO = [
    ("data/raw/samples.csv", "Raw measurement data"),
    ("scripts/train_model.py", "Trains the model and saves checkpoint"),
    ("results/checkpoint.pt", "Saved model weights"),
    ("results/metrics.csv", "Accuracy and loss per epoch"),
    ("scripts/plot_curves.py", "Plots training curves from metrics.csv"),
    ("figures/fig1_training_curves.png", "Figure 1 in the paper"),
    ("scripts/preprocess.py", "Cleans and normalizes raw data"),
    ("data/processed/train.pt", "Preprocessed tensors"),
    ("README.md", "Project overview and run instructions"),
]
```

### 4.2 Single call to classify the repo

```python
# Cell: Classify repo with LLM

def classify_repo(repo_items: list[tuple[str, str]], system: str = ECF_SYSTEM) -> dict:
    """Return a dict path -> ECF artifact type."""
    user_content = "Classify each of these repo items into one ECF artifact type.\n\n"
    user_content += "\n".join(f"- {path}: {desc}" for path, desc in repo_items)
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        max_tokens=500,
    )
    text = response.choices[0].message.content.strip()
    # Try to parse JSON from the response (may be wrapped in markdown)
    if "```" in text:
        text = text.split("```")[1].replace("json", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"_raw": text}

result = classify_repo(MESSY_REPO)
print("Classification result:")
for path, artifact in result.items():
    if not path.startswith("_"):
        print(f"  {path} -> {artifact}")
```

**Expected**: Each path is assigned one of the seven types (e.g. `data/raw/samples.csv` → input_data, `figures/fig1_training_curves.png` → visual_claims).  
**Record**: The mapping; note any misclassifications for the exploration steps.

---

## 5. Exploration Lab: Ambiguity, Restructuring, and Pipeline Order

### Experiment 1: Ambiguous items

**Variable**: Add repo items that could fit two artifact types (e.g. a script that both analyzes and plots).  
**Hypothesis**: The model may pick one type; different phrasings can change the choice. Clarifying descriptions reduce ambiguity.

```python
# Cell: Experiment 1 — Ambiguous items

AMBIGUOUS_REPO = [
    ("run_all.py", "Runs preprocess, train, then plot in one script"),
    ("output/figures_and_tables/", "Contains both figure PNGs and summary CSV"),
]
result_amb = classify_repo(MESSY_REPO + AMBIGUOUS_REPO)
for path in ["run_all.py", "output/figures_and_tables/"]:
    print(f"  {path} -> {result_amb.get(path, 'N/A')}")
```

**Observe**: Multi-role files or folders may be classified as one type; the prompt doesn't allow "multiple." **Record**: How the model resolved ambiguity. **Implication**: For production, consider allowing multiple labels or a "hybrid" type and refining descriptions.

---

### Experiment 2: Suggest restructuring (target ECF layout)

**Variable**: After classification, ask the model to suggest a **target directory layout** (e.g. `input/`, `work/`, `output/`, `claim/`, `source/`, `document/`) and which current paths should move where.  
**Hypothesis**: The model can propose a mapping from current paths to ECF-prescribed structure.

```python
# Cell: Experiment 2 — Restructuring suggestion

RESTRUCTURE_PROMPT = """Given this classification of repo items into ECF artifact types, suggest a target ECF directory layout.

Use standard ECF-style folders when possible: input/, work/ (or source/), output/, claim/, document/.
For each original path, suggest a target path in the new layout. Reply with JSON: "mapping" = list of {"from": "<original>", "to": "<target>"}."""

def suggest_restructure(classification: dict) -> dict:
    user_content = json.dumps({k: v for k, v in classification.items() if not k.startswith("_")}, indent=2)
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=[
            {"role": "system", "content": RESTRUCTURE_PROMPT},
            {"role": "user", "content": user_content},
        ],
        max_tokens=600,
    )
    text = response.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1].replace("json", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"_raw": text}

suggestion = suggest_restructure(result)
if "mapping" in suggestion:
    for m in suggestion["mapping"][:10]:
        print(m.get("from"), "->", m.get("to"))
else:
    print(suggestion.get("_raw", suggestion)[:400])
```

**Observe**: The model proposes target paths; quality depends on how well the classification matched ECF. **Record**: Whether the mapping is consistent with the seven artifact types and ECF folder names.

---

### Experiment 3: Pipeline ordering

**Variable**: Ask the model to **order** the experimental and plotting processes into a suggested run order (e.g. preprocess → train → plot).  
**Hypothesis**: The model can infer dependencies from names and artifact types to suggest execution order.

```python
# Cell: Experiment 3 — Pipeline order

ORDER_PROMPT = """Given this ECF classification, list the computational processes (experimental_process and plotting_process) in a suggested execution order.
Reply with JSON: "order" = list of paths in run order."""

def suggest_order(classification: dict) -> list:
    user_content = json.dumps({k: v for k, v in classification.items() if not k.startswith("_")}, indent=2)
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        messages=[
            {"role": "system", "content": ORDER_PROMPT},
            {"role": "user", "content": user_content},
        ],
        max_tokens=300,
    )
    text = response.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1].replace("json", "").strip()
    try:
        data = json.loads(text)
        return data.get("order", [])
    except json.JSONDecodeError:
        return []

order = suggest_order(result)
print("Suggested run order:", order)
```

**Observe**: Order should respect data flow (e.g. preprocess before train, train before plot). **Record**: Whether the order is plausible. **Implication**: Pipeline ordering is part of the EOP Agent's "Pipeline Ordering" capability; this prompt is a minimal version.

---

## 6. Maintenance Connection: EOP Agent Evidence Chain Extraction

### How this maps to the EOP Agent

- **Evidence Chain Extraction**: The agent identifies the seven ECF artifacts in existing code; this lab implements a prompt-based classifier and optional restructuring/ordering steps.
- **Directory Structure Mapping**: The agent suggests moving files into ECF-prescribed structure; Experiment 2 is a minimal version.
- **Pipeline Ordering**: The agent suggests run order (e.g. `run_tasks.py` → `run_packs.py` → `show_main.py`); Experiment 3 is a minimal version.

### Improving robustness

- Add **few-shot examples** (example repo snippets with correct classifications).
- Use **structured output** (e.g. Pydantic or JSON schema) so the agent returns parseable mappings.
- For real repos, add a **tool** that reads directory trees or file contents and passes them to the LLM in chunks.

---

## 7. Summary and Next Steps

### Three takeaways

1. **The seven ECF artifact types** structure the evidence chain; classifying repo items into them is the first step toward EOP-compliant restructuring.
2. **Restructuring and pipeline ordering** can be prompted from the same classification; clarity of definitions and examples improves consistency.
3. **Ambiguous or multi-role items** may need richer descriptions or multi-label support when scaling to real repos.

### What's next

**Lab 6 — Claim-contingent Disclosure**: Given scientific claims of varying strength, determine required disclosure scope (existential vs. distributional claims, disclosure level).

---

*End of Lab 5. Proceed to Lab 6 when ready.*
