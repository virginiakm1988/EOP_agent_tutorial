# Getting Started — Beginner Guide

> **Who is this for?** CS students or developers who know Python but have no prior AI or machine learning background. You do not need to know how neural networks work.

---

## What Will I Build?

You will build an **AI agent** — a program that reads a user's request, decides what action to take, and executes it. The agent is designed to help researchers organize their scientific code using a framework called Evidence-Oriented Programming (EOP).

Don't worry if EOP sounds unfamiliar. Here's the plain-English version:

> Researchers write code to produce figures and results for papers. EOP is a way of organizing that code so every result can be traced back to the exact data and script that produced it. Your agent helps researchers do that tracing automatically.

By the end of the tutorial series you will understand:
- How to talk to an AI model from Python
- How to define tools the AI can use
- How to build agents that remember context across a conversation
- How to design graph-based workflows with error recovery

---

## Before You Start

### Step 1 — Check Python version

You need **Python 3.10 or newer**. Check by running:

```bash
python --version
```

If you see `Python 3.10.x` or higher, you're good. If not, download from [python.org](https://www.python.org/downloads/).

### Step 2 — Get an API key

The labs call an AI model via an API (a web service). You need a key to authenticate.

**Option A — OpenAI (recommended for beginners)**

1. Go to [platform.openai.com](https://platform.openai.com) and create a free account.
2. Navigate to **API Keys** and click **Create new secret key**.
3. Copy the key (it starts with `sk-...`). You won't be able to see it again.
4. Add $5–$10 of credit under **Billing**. This is enough for all 6 labs combined.

**Option B — NVIDIA NIM (for NVIDIA researchers)**

1. Log in to the NIM portal and copy your API key.
2. Before running any lab, set: `export USE_NIM=1` in your terminal, or set `NIM_API_KEY` as an environment variable.

> **Keep your key secret.** Never paste it directly into a notebook cell — the labs use Python's `getpass` to prompt for it securely. Never commit it to git.

### Step 3 — Choose how to run the labs

**Option A — Google Colab (easiest, no local setup)**

1. Go to [colab.research.google.com](https://colab.research.google.com).
2. Open the `.ipynb` file for the lab you want (e.g. `Lab0_Build_an_EOP_Agent_Prototype.ipynb`).
3. Run cells top to bottom. When prompted, paste your API key.

**Option B — Local Jupyter**

```bash
pip install jupyter openai pydantic
jupyter notebook
```

Then open the `.ipynb` file for the lab.

**Option C — Plain Python**

Each lab also has a `.md` version with all the code blocks. You can copy each code block into a `.py` file and run it with `python myfile.py`.

---

## Lab Overview

| Lab | What You'll Build | New Concepts | Time |
|-----|-------------------|-------------|------|
| **Lab 0** *(optional warm-up)* | A minimal agent that picks between two actions | API calls, prompts, parsing | 30–40 min |
| **Lab 1** | Experiments on how prompt wording affects tool choice | Temperature, prompt structure | 45–60 min |
| **Lab 2** | Tools with typed arguments and validation | Pydantic, function calling, JSON Schema | 45–60 min |
| **Lab 3** | An agent that remembers across a conversation | Context window, memory, state | 45–60 min |
| **Lab 4** | A workflow with retries and error recovery | LangGraph, graphs, cycles | 60–75 min |
| **Lab 5** | Classifying files in a messy research repo | Evidence chain extraction | 45–60 min |
| **Lab 6** | Advising how much to disclose based on claim type | Claim-contingent disclosure | 45–60 min |

**Recommended order**: Lab 0 → Lab 1 → Lab 2 → Lab 3 → Lab 4 → Lab 5 → Lab 6

Labs 0–4 are general agentic engineering skills. Labs 5–6 apply those skills to the EOP domain.

---

## Concepts You'll Encounter (Plain English)

You don't need to memorize these now — come back here when you see an unfamiliar term.

| Concept | Plain English |
|---------|--------------|
| **LLM** | A large language model — the AI model you're calling (e.g. GPT-4). It takes text in and produces text out. |
| **Prompt** | The text you send to the model. It has a system message (instructions) and a user message (the request). |
| **Tool / function call** | A way for the model to request that your code runs a function (e.g. "run get_weather('NYC')") and return the result. |
| **Token** | The smallest unit of text the model processes. Roughly 1 token ≈ ¾ of a word. |
| **Context window** | The maximum number of tokens the model can read at once. Think of it as short-term memory — it's finite. |
| **Temperature** | A setting that controls how random the model's output is. `0.0` = always the same answer. `1.0` = more creative/varied. |
| **Pydantic** | A Python library for validating data structure. Used to define what arguments a tool expects. |
| **JSON Schema** | A standard way to describe the shape of JSON data. The API uses it to tell the model what arguments it can return. |

For the full glossary see [Glossary.md](Glossary.md).

---

## Common Issues

**"I don't have an API key yet"**
→ See Step 2 above. You need one before running any code cell that calls the model.

**"The code says `client is not defined`"**
→ You skipped the Setup cell. Run all cells from the top in order.

**"I got a `ValidationError`"**
→ This is expected in some experiments (Lab 2). It means Pydantic caught bad data — read the error message to see which field failed.

**"The model picked the wrong tool"**
→ That's the experiment! Lab 1 teaches you to diagnose and fix exactly this. Note what happened and continue.

**"I'm getting API errors / rate limits"**
→ Wait a few seconds and retry. If it persists, check your billing/credit at [platform.openai.com](https://platform.openai.com).

---

## Ready?

Start with **[Lab 0](Lab0_Build_an_EOP_Agent_Prototype.ipynb)** for a quick warm-up, or jump straight to **[Lab 1](Lab1_Anatomy_of_a_Decision.ipynb)** if you want to go directly to the foundation curriculum.

Good luck — and remember: every confusing output is a learning signal, not a bug to avoid.
