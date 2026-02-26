# Lab 7: The EOP Spokesperson — Advocating Across Disciplines

**Series**: Agentic Engineering Crash Course (Prompt Engineering Focus)
**Module**: 7 — Persona, Cross-Disciplinary Advocacy & LLM-as-Judge
**Prerequisites**: Labs 0–2 (agent prototype, tool selection basics), Python 3.10+, OpenAI API key

---

## Background: Why a Spokesperson Agent?

The EOP paper (*Research software as scientific evidence*) was developed through one-on-one interviews with researchers from **applied mathematics, cell biology, metagenomics, microbiology, inorganic chemistry, molecular biology, biochemistry, and computational biology** — most with little or no software development experience. Many had never heard of EOP before the interview.

This is EOP's real adoption challenge: the researchers who most need it are **domain scientists**, not software engineers. They come from very different backgrounds, use software in very different ways, and are motivated by very different concerns. A single one-size-fits-all pitch won't work.

This lab teaches you to build an AI agent that acts as a **knowledgeable, empathetic EOP spokesperson** — one that can adapt its message to researchers from any discipline, address the specific objections their stakeholder group raises, and explain *why EOP benefits them in particular*.

> **The paper's key insight about stakeholders:**
>
> ```
>  Each group has DIFFERENT concerns about disclosure:
>
>  ┌──────────────────────────────────────────────────────────────────┐
>  │  Authors     → maximize visibility, reduce disclosure burden,    │
>  │                can't provide competitive studies                 │
>  ├──────────────────────────────────────────────────────────────────┤
>  │  Reviewers   → assess claim credibility, reduce review burden    │
>  ├──────────────────────────────────────────────────────────────────┤
>  │  Editors     → disseminate high-impact work, minimize retraction │
>  ├──────────────────────────────────────────────────────────────────┤
>  │  External    → preserve competitive advantage, mitigate misuse   │
>  │  actors        (funders, regulators, oversight bodies)           │
>  └──────────────────────────────────────────────────────────────────┘
>
>  EOP's goal: find a workable, minimally sufficient level of consensus
>  that meets all groups' legitimate needs simultaneously.
> ```

---

## What You Will Build (Plain English)

By the end of this lab you will have:

1. Loaded a rich **EOP knowledge base** drawn directly from the paper, covering the real motivating examples, stakeholder benefits, and common objections
2. Built a **generic spokesperson** and seen its limitations
3. Experimented with **discipline-specific advocates** — prompts that explain EOP's value to a biologist differently from how they explain it to a mathematician or a reviewer
4. Tested the spokesperson against **real objections from the paper's FAQ**
5. Built an **LLM-as-judge evaluator** that grades how well the spokesperson serves each audience

---

## How to Use This Tutorial in Google Colab

1. Open [Google Colab](https://colab.research.google.com/) and create a new notebook.
2. For each **markdown section**: insert a **Text cell** and paste it.
3. For each **code block**: insert a **Code cell**, paste the code, and run.
4. Run cells in order from top to bottom.

**Suggested time**: 60–75 min.
**Experiments**: Baseline + Experiments 1–4 required. Experiment 5 optional.

---

## 1. Learning Objectives

By the end of this lab you will be able to:

1. **Explain** why a single EOP pitch does not work across all disciplines and stakeholder groups.
2. **Build** a spokesperson prompt grounded in real EOP paper content (motivating examples, stakeholder benefits, field-agnostic ECF design).
3. **Adapt** the spokesperson for researchers from different fields (biology, chemistry, math, CS) and roles (author, reviewer, editor, funder).
4. **Handle** the real objections raised in the EOP paper's FAQ with specific, accurate counter-arguments.
5. **Evaluate** responses using an LLM-as-judge with structured criteria.

---

## 2. What Makes EOP Advocacy Hard: The Cross-Disciplinary Challenge

### Why one pitch doesn't work for everyone

The EOP paper observed that **disclosure norms vary dramatically across scientific fields**. A cell biologist who uses a simple statistical pipeline has very different disclosure concerns from a computational biologist building multi-stage neural-network workflows. An inorganic chemist who uses software only to visualize spectra has different needs from an applied mathematician whose entire contribution is an algorithm.

ECF was deliberately designed to be **field-agnostic**: it focuses on the relationship between software artifacts and scientific claims, not on how the software was technically implemented. But *explaining* this to a domain scientist requires knowing what their specific concerns are.

The paper identified a concrete **motivating example**: when *Nature* published AlphaFold3, they required code to be made available on request. A reviewer had only temporary access to an early web server and described repeated, unanswered requests for code. *Nature* later cited biosecurity risks; DeepMind cited commercial considerations. Each stakeholder acted from their own position — without shared disclosure specifications, there was no common ground.

**This is the problem the spokesperson needs to solve**: help researchers understand that EOP isn't a demand for full openness, but a framework for *negotiating* what needs to be disclosed to make claims evaluable — under whatever constraints apply.

### The three dimensions of EOP

When building spokesperson prompts, keep these three dimensions in mind:

| Dimension | Question | EOP's answer |
|-----------|---------|--------------|
| **Scope** | What must be disclosed? | Not everything — just what's needed to evaluate the specific claim |
| **Timing** | When must it be disclosed? | Usually at submission; staged disclosure possible for sensitive components |
| **Form** | How should it be disclosed? | As a structured evidence chain (ECF) so evaluators can trace claim → artifact |

---

## 3. Setup

**Dependencies**: Python 3.10+, `openai`. No additional libraries needed.

```python
# Cell: Install dependencies
!pip install -q openai
```

```python
# Cell: Imports and API key (OpenAI or NVIDIA NIM)
import os
import json
import textwrap
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


def ask(system: str, user: str, temperature: float = 0.5, max_tokens: int = 400) -> str:
    """One-turn helper: system + user -> assistant reply string."""
    response = client.chat.completions.create(
        model=MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
    )
    return (response.choices[0].message.content or "").strip()


def show(label: str, text: str, width: int = 88) -> None:
    """Pretty-print a labeled response."""
    print(f"\n{'─'*width}")
    print(f"  {label}")
    print(f"{'─'*width}")
    for line in text.split("\n"):
        print(textwrap.fill(line, width=width) if len(line) > width else line)
    print()
```

---

## 4. The EOP Knowledge Base

The most important ingredient in the spokesperson prompt is **accurate, specific knowledge**. A spokesperson who says "EOP helps you organize your code" is useless — anyone could say that. One who can explain the AlphaFold3 case, or how ECF handles proprietary data, is compelling.

The following cell defines the knowledge base drawn directly from the paper. Read it carefully — this is what makes the spokesperson credible.

```python
# Cell: EOP knowledge base (drawn from the paper)

EOP_KNOWLEDGE = """
=== Core Concepts ===
- EOP (Evidence-Oriented Programming): A framework that reframes research software around
  its EVIDENTIARY ROLE — not just how to develop it, but how to disclose it so scientific
  claims can be evaluated. The key question: does the disclosed software provide enough
  information to evaluate the evidentiary support behind a claim?

- ECF (Evidence Chain Formalization): The operational tool of EOP. ECF maps computational
  artifacts to the claims they support via a structured chain:
      input_data → experimental/analytical process(es) → output_data
      → visual_data → plotting/summarizing process(es) → visual_claims
  plus documentation spanning the whole chain.
  ECF identifies the MINIMAL set of artifacts needed to evaluate a specific claim.

- Evidentiary sufficiency vs. reproducibility: Reproducibility asks "can I re-run this
  and get the same number?" EOP asks "has enough been disclosed to evaluate whether the
  claim is adequately supported?" A failed replication doesn't disprove a claim; a
  successful one doesn't validate poor evidentiary structure. These are different questions.

=== The Problem EOP Solves ===
- Currently, a "gray zone" exists: disclosure is inconsistently interpreted and selectively
  applied. Researchers acting in good faith may believe subjectively avoiding fabrication
  is sufficient. Others have exploited this lack of consensus to justify withholding
  critical code or data. Neither case can be resolved by case-by-case discretion.

- Real example (AlphaFold3): Nature required code to be made available upon request.
  A reviewer had only temporary access to an early web server and described repeated,
  unanswered code requests. Nature later cited biosecurity risks; DeepMind cited
  commercial considerations. Each stakeholder acted from their own position — no shared
  expectations existed to navigate the conflict. This is the problem EOP addresses.

=== Why ECF is Field-Agnostic ===
- ECF doesn't care what programming language you use, what framework, or whether your
  software is a simple script or a multi-stage ML pipeline.
- What matters is the RELATIONSHIP between software artifacts and scientific claims —
  specifically, which artifacts lie on the evidence chain leading to the visual claims
  (figures, tables, statistics) reported in the paper.
- Different fields use software differently (simple pipelines vs. complex workflows,
  standard methods vs. novel algorithms), but they all produce visual claims, and ECF
  applies to all of them.

=== Stakeholder-Specific Benefits ===
- AUTHORS benefit because:
  (1) ECF lets them SELF-AUDIT during development — tracing visual claims back to code
      and data catches errors, inconsistencies, and undocumented parameter choices early.
  (2) ECF provides a DEFENSIBLE RATIONALE for disclosure decisions — instead of arbitrary
      choices about what to share, authors can justify exactly what's on the evidence chain
      and what isn't, reducing ad-hoc reviewer requests.
  (3) ECF accommodates EXTERNAL BARRIERS: proprietary licensing, commercial interests,
      security concerns don't mean full opacity — ECF provides mechanisms (auditable
      intermediate data, restricted functional equivalents) to preserve evidentiary
      traceability under constraints.

- REVIEWERS benefit because:
  (1) ECF prevents being sidetracked by irrelevant implementation details — it identifies
      WHICH artifacts actually matter for the claim under evaluation.
  (2) ECF makes the processes generating visual claims more traceable — reviewers can
      follow how inputs become outputs instead of inferring from incomplete descriptions.
  (3) This reduces reliance on guesswork and increases the efficiency and reliability
      of peer review.

- EDITORS benefit because:
  (1) ECF gives a clearer, more quantifiable basis for assessing whether missing software
      information materially affects a manuscript's scientific claims.
  (2) ECF improves editor-author communication: instead of vague "please share your code"
      requests, editors can anchor guidance in specific evidentiary needs.

- EXTERNAL ACTORS (funders, regulators, oversight bodies) benefit because:
  (1) ECF separates the evidentiary evaluation layer (what reviewers need) from the
      oversight layer (what regulators or funders may require), so requests can be
      targeted and justified rather than blanket demands for openness.
  (2) This reduces direct competition over a single, undifferentiated notion of transparency.

=== Common Objections (from the paper's FAQ) ===
- "GitHub already has my code": A GitHub repo without an entry document that maps claims
  to artifacts is not EOP-compliant. The evidentiary structure — which file produces
  which figure, in what order — is invisible unless explicitly documented.

- "This is too much overhead": ECF doesn't require restructuring everything at once.
  Adoption is incremental: start with ONE pipeline and ONE claim, document the evidence
  chain for that, and grow from there. The organizational overhead is modest and
  intentional — it reflects a shift from viewing software as an implementation artifact
  to viewing it as an evidentiary asset.

- "Nobody in my field does this": Disclosure norms currently vary informally across
  fields. EOP's goal is not to prescribe uniform openness but to help each field develop
  shared, workable specifications. Being an early adopter means your work is more
  evaluable and your disclosure decisions are more defensible.

- "Our data is proprietary": ECF explicitly supports external disclosure barriers.
  Two mechanisms: (1) AUDITABLE INTERMEDIATE DATA — disclose outputs of the restricted
  component so evaluators can verify consistency without accessing restricted inputs;
  (2) RESTRICTED FUNCTIONAL EQUIVALENTS — a simplified open version that demonstrates
  the key computational logic without exposing proprietary details.

- "EOP is the same as reproducibility initiatives": EOP complements but does not replace
  FAIR, TOP Guidelines, or CodeOcean. It adds a claim-centered evaluation layer that
  these initiatives don't address — whether the disclosed software gives enough information
  to evaluate the SUPPORT for specific claims, not just whether results can be re-run.
"""

print("Knowledge base loaded:", len(EOP_KNOWLEDGE), "chars")
print("Key sections:", EOP_KNOWLEDGE.count("===") // 2, "topics")
```

---

## 5. Baseline: What a Generic Prompt Produces

Before building a spokesperson, see what a plain prompt gives you. This is the control.

```python
# Cell: Baseline — generic system prompt

GENERIC_SYSTEM = "You are a helpful AI assistant who knows about research software practices."

PROBE_QUESTIONS = [
    "I'm a cell biologist. My lab uses Python scripts to analyze microscopy images and produce figures for papers. Why should I care about EOP?",
    "We already put our code on GitHub with a README. Isn't that enough for transparency?",
    "How is EOP different from reproducibility? We already follow the TOP Guidelines.",
]

print("=== BASELINE: Generic system prompt ===")
for q in PROBE_QUESTIONS:
    reply = ask(GENERIC_SYSTEM, q, temperature=0.3)
    show(f"Q: {q[:70]}...", reply)
```

**Observe:**
- Does the baseline correctly distinguish EOP from reproducibility?
- Does it explain *what specifically* is missing from a GitHub repo without an entry document?
- Does it speak to the cell biologist's actual workflow, or give a generic answer?

**Record**: Note two specific gaps in accuracy or relevance. These are your targets for Experiment 1.

---

## 6. Experiment 1: The Full Spokesperson Prompt

### 1a — Build and inspect the spokesperson

```python
# Cell: Experiment 1a — Build the spokesperson system prompt

SPOKESPERSON_SYSTEM = f"""You are Jordan, an EOP (Evidence-Oriented Programming) specialist who works with \
researchers across disciplines to help them understand and adopt EOP and ECF.

Your role: A knowledgeable, patient, and pragmatic advocate. You deeply believe EOP \
makes science more trustworthy — but you also understand that researchers face real \
constraints (time, proprietary data, field norms) and you never dismiss those concerns.

Your approach:
- Lead with the benefit that is most relevant to THIS researcher's situation.
- Distinguish EOP from reproducibility clearly — this is the most common confusion.
- Use the AlphaFold3 example when it helps illustrate the "gray zone" problem.
- Be specific: cite the evidence chain structure, the entry document, the four stakeholder groups.
- For constraints (proprietary data, competitive concerns): explain the ECF mechanisms
  (auditable intermediates, restricted functional equivalents) — don't just say "it's fine."
- Keep replies to 3–5 paragraphs unless asked for more. No bullet-point lists unless
  the user asks for a structured summary.
{EOP_KNOWLEDGE}"""

print("Spokesperson prompt built.")
print(f"Total length: {len(SPOKESPERSON_SYSTEM):,} chars")
```

### 1b — Run the same probes and compare

```python
# Cell: Experiment 1b — Spokesperson vs. baseline side-by-side

print("=== SPOKESPERSON: Full structured prompt ===\n")
for q in PROBE_QUESTIONS:
    reply = ask(SPOKESPERSON_SYSTEM, q, temperature=0.5)
    show(f"Q: {q[:70]}...", reply)
```

**Observe:**
- Does the spokesperson correctly distinguish evidentiary sufficiency from reproducibility?
- For the cell biologist, does it connect EOP to their actual workflow (image analysis → figures)?
- For the GitHub question, does it mention the entry document and evidence chain structure?

**Record**: For one question, paste both the baseline reply and the spokesperson reply side by side. Identify the 2-3 most significant differences.

---

## 7. Experiment 2: Discipline-Specific Advocacy

The paper interviewed researchers from **eight different fields**. Each uses software differently and has different disclosure concerns. Here you will adapt the spokesperson's audience description to three field types and observe how the framing changes.

```python
# Cell: Experiment 2 — Discipline-specific advocacy

# These three represent the range of field types in the paper's interviews
DISCIPLINE_PROFILES = {
    "Wet-lab biologist (cell biology / biochemistry)": {
        "profile": (
            "Your audience is a wet-lab biologist — cell biology, biochemistry, or similar. "
            "They use software mainly to analyze experimental data and produce figures, "
            "not to build new algorithms. They may use R or simple Python scripts. "
            "They have little software engineering background. "
            "Their main concern: 'I'm not a programmer — EOP seems like a software engineering thing, not for me.'"
        ),
        "question": "I do wet-lab experiments. I write small R scripts to make my figures. Does EOP apply to me?",
    },
    "Computational/ML researcher": {
        "profile": (
            "Your audience is a computational researcher who builds machine learning models and "
            "multi-stage software pipelines. They are proficient in software development. "
            "They may already use version control and CI. "
            "Their main concern: 'I already do good software engineering. EOP is redundant for me.'"
        ),
        "question": "I already use Git, write tests, and document my code well. What does EOP add beyond good software practice?",
    },
    "Field scientist with proprietary constraints": {
        "profile": (
            "Your audience is a researcher in a field (e.g., applied mathematics, inorganic chemistry) "
            "whose work involves industry partnerships or proprietary data/methods. "
            "They face real legal and commercial disclosure barriers. "
            "Their main concern: 'We can't share our data or code — EOP doesn't apply to us.'"
        ),
        "question": "Our key dataset is owned by an industry partner and cannot be shared. EOP can't possibly apply to us.",
    },
}

for label, config in DISCIPLINE_PROFILES.items():
    system = (
        f"You are Jordan, an EOP specialist.\n\n"
        f"Audience context: {config['profile']}\n\n"
        f"Use this knowledge about EOP:\n{EOP_KNOWLEDGE}\n\n"
        f"Be specific to this researcher's situation. Lead with the benefit or mechanism "
        f"most relevant to their concerns."
    )
    reply = ask(system, config["question"], temperature=0.5, max_tokens=350)
    show(f"Discipline: {label}", reply)
```

**Observe:**
- For the wet-lab biologist: does the response explain that ECF applies to *any* software-mediated figure, regardless of programming sophistication?
- For the ML researcher: does it articulate what's *different* about evidentiary sufficiency vs. good software practice (e.g., the missing entry document, the claim-artifact mapping)?
- For the proprietary-constraints researcher: does it correctly explain the auditable intermediates and restricted functional equivalent mechanisms?

**Record**: Which discipline produced the sharpest, most tailored response? Which was weakest? Why?

---

## 8. Experiment 3: Stakeholder Role Adaptation

The paper identifies four distinct stakeholder groups — author, reviewer, editor, and external actor — each with different incentives. Here you test whether the spokesperson can shift its framing depending on *which role* the researcher holds.

```python
# Cell: Experiment 3 — Stakeholder role adaptation

ROLE_PROFILES = {
    "Author preparing a submission": (
        "Your audience is a research author preparing to submit a manuscript. "
        "They are worried about disclosure overhead and reviewer demands. "
        "Frame EOP's benefit in terms of: reduced reviewer friction, defensible disclosure "
        "decisions, and self-audit value during development."
    ),
    "Peer reviewer": (
        "Your audience is a reviewer who has just received a paper with complex computational methods. "
        "They are time-constrained and frustrated by incomplete software descriptions. "
        "Frame EOP's benefit in terms of: knowing what artifacts to look for, being able to "
        "trace visual claims back to code, and reducing guesswork."
    ),
    "Journal editor": (
        "Your audience is a journal editor deciding whether to require EOP/ECF from authors. "
        "They care about scalability, author buy-in, and avoiding retraction risk. "
        "Frame EOP's benefit in terms of: clearer editorial guidance, quantifiable evidentiary "
        "gaps, and better editor-author communication about disclosure needs."
    ),
    "Funding agency program officer": (
        "Your audience is a program officer at a funding agency thinking about requiring "
        "structured software disclosure for funded projects. "
        "Frame EOP's benefit in terms of: accountability, targeted disclosure (not blanket openness), "
        "and how ECF separates evaluation needs from oversight needs."
    ),
}

ROLE_QUESTION = "Can you explain in one paragraph why EOP matters for someone in my position?"

for role_label, role_desc in ROLE_PROFILES.items():
    system = (
        f"You are Jordan, an EOP specialist.\n\n"
        f"Role context: {role_desc}\n\n"
        f"Use this knowledge about EOP:\n{EOP_KNOWLEDGE}\n\n"
        f"Give a single focused paragraph. Lead with the most relevant benefit for this role."
    )
    reply = ask(system, ROLE_QUESTION, temperature=0.5, max_tokens=200)
    show(f"Role: {role_label}", reply)
```

**Observe:**
- Does each reply stay focused on the benefits most relevant to that role?
- Does the reviewer reply mention traceability and reducing guesswork?
- Does the editor reply mention quantifiable evidentiary gaps and retraction risk?
- Does the funder reply correctly explain that ECF separates evaluation from oversight?

**Record**: Which role description produced the most focused and accurate reply? What in the prompt drove that?

---

## 9. Experiment 4: Handling the Paper's Real Objections

The EOP paper includes a detailed FAQ section with objections raised in real interviews. This experiment tests whether the spokesperson can handle those exact objections accurately — not with generic reassurance, but with specific, correct counter-arguments.

```python
# Cell: Experiment 4a — Real objections from the paper

REAL_OBJECTIONS = [
    # From the FAQ
    "EOP seems to be just another reproducibility initiative. How is it actually different from FAIR or TOP Guidelines?",
    "If I use Code Ocean or put my code on Zenodo with a DOI, I've satisfied disclosure requirements. Why do I need EOP on top of that?",
    "ECF requires reconstructing the full evidence chain — that sounds like enormous additional work for multi-year projects.",
    # From the interviews (field-specific)
    "In my field (metagenomics), we use established tools in standard pipelines. There's nothing novel about the software — why would anyone need to trace the evidence chain?",
    "Our reviewers have never asked for software beyond the methods section description. If nobody is demanding EOP compliance, why should we bother?",
]

SYSTEM_WITH_OBJECTIONS = (
    f"You are Jordan, an EOP specialist.\n\n"
    f"When responding to an objection:\n"
    f"1. Acknowledge the concern directly — show you understand the real worry behind it.\n"
    f"2. Provide the specific, accurate EOP counter-argument (not generic reassurance).\n"
    f"3. If relevant, use a concrete example (AlphaFold3, a real field scenario, a specific ECF mechanism).\n"
    f"4. Close with one concrete first step.\n"
    f"Keep each reply to 3-4 paragraphs. Do not be preachy.\n\n"
    f"Use this knowledge:\n{EOP_KNOWLEDGE}"
)

print("=== Real objections from the paper — spokesperson response ===\n")
for obj in REAL_OBJECTIONS:
    reply = ask(SYSTEM_WITH_OBJECTIONS, obj, temperature=0.5, max_tokens=300)
    show(f"Objection: {obj[:72]}...", reply)
```

```python
# Cell: Experiment 4b — Compare: with and without specific counter-argument guidance

VAGUE_OBJECTION_SYSTEM = (
    f"You are a helpful EOP advocate. Answer questions about EOP thoughtfully.\n"
    f"{EOP_KNOWLEDGE}"
)

HARD_OBJECTION = "In my field we don't really have a software disclosure culture. Reviewers don't ask for code and nobody expects it. EOP is a solution looking for a problem."

print("Without structured objection-handling guidance:")
reply_vague = ask(VAGUE_OBJECTION_SYSTEM, HARD_OBJECTION, temperature=0.5, max_tokens=250)
show("Vague system", reply_vague)

print("With structured objection-handling guidance:")
reply_structured = ask(SYSTEM_WITH_OBJECTIONS, HARD_OBJECTION, temperature=0.5, max_tokens=250)
show("Structured system", reply_structured)
```

**Observe:**
- Does the structured version acknowledge → specific counter-argument → concrete first step?
- For the "established pipelines" objection: does it correctly note that ECF still applies even to standard tools, because the *claim-artifact mapping* is what's missing, not novel code?
- For the "no culture" objection: does it reference the AlphaFold3 gray zone problem, not just say "it's a good idea"?

**Record**: Pick the objection you found weakest. Rewrite one sentence in the objection-handling guidance and test again.

---

## 10. Experiment 5: Auto-Evaluation (LLM-as-Judge)

How do you systematically improve the spokesperson? One scalable approach: use a second LLM call as a **structured evaluator** — the LLM-as-judge pattern. The judge uses a rubric calibrated to EOP-specific quality criteria.

```python
# Cell: Experiment 5a — The EOP-specific judge prompt

EOP_JUDGE_SYSTEM = """You are an expert evaluator assessing the quality of EOP (Evidence-Oriented Programming) advocacy responses.

Score the response on five criteria, each 1 (poor) to 5 (excellent):

1. eop_accuracy     — Are EOP/ECF concepts correctly described? (evidentiary sufficiency ≠ reproducibility;
                       ECF structure; stakeholder benefits; no hallucinations)
2. audience_fit     — Does the response address the specific discipline, role, or concern raised?
                       (Not a generic answer — specifically relevant to this person's situation)
3. objection_quality — If handling an objection: does it acknowledge → give a specific counter-argument →
                       offer a concrete step? (N/A = 3 if no objection was raised)
4. persuasiveness   — Does it make a compelling case? Does it lead with benefits rather than definitions?
5. conciseness      — Is it appropriately brief? Does every sentence add value?

Reply with JSON only:
{
  "eop_accuracy": <1-5>,
  "audience_fit": <1-5>,
  "objection_quality": <1-5>,
  "persuasiveness": <1-5>,
  "conciseness": <1-5>,
  "overall": <1-5>,
  "best_sentence": "<quote the single best sentence from the response>",
  "weakest_point": "<one sentence describing the main weakness>"
}"""


def evaluate_eop(question: str, response: str) -> dict:
    """Use a second LLM call to grade a spokesperson response."""
    user_msg = (
        f"Question / objection:\n{question}\n\n"
        f"Spokesperson response:\n{response}\n\n"
        "Score this response using the EOP advocacy criteria."
    )
    raw = ask(EOP_JUDGE_SYSTEM, user_msg, temperature=0.0, max_tokens=350)
    if "```" in raw:
        raw = raw.split("```")[1].replace("json", "").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"_raw": raw}
```

```python
# Cell: Experiment 5b — Evaluate baseline vs. spokesperson

eval_question = PROBE_QUESTIONS[2]  # "How is EOP different from reproducibility?"
baseline_reply = ask(GENERIC_SYSTEM, eval_question, temperature=0.3)
spokes_reply   = ask(SPOKESPERSON_SYSTEM, eval_question, temperature=0.5)

baseline_scores = evaluate_eop(eval_question, baseline_reply)
spokes_scores   = evaluate_eop(eval_question, spokes_reply)

print(f"Question: {eval_question}\n")
print("BASELINE SCORES:")
for k, v in baseline_scores.items():
    print(f"  {k:22s}: {v}")
print("\nSPOKESPERSON SCORES:")
for k, v in spokes_scores.items():
    print(f"  {k:22s}: {v}")
```

```python
# Cell: Experiment 5c — Score all discipline-specific responses

print("=== Discipline-specific advocacy quality ===\n")
score_summary = []
for label, config in DISCIPLINE_PROFILES.items():
    system = (
        f"You are Jordan, an EOP specialist.\n\n"
        f"Audience context: {config['profile']}\n\n"
        f"Use this knowledge:\n{EOP_KNOWLEDGE}\n\n"
        f"Lead with the benefit most relevant to this researcher's situation."
    )
    reply = ask(system, config["question"], temperature=0.5, max_tokens=350)
    scores = evaluate_eop(config["question"], reply)
    overall = scores.get("overall", "?")
    weak = scores.get("weakest_point", "")
    best = scores.get("best_sentence", "")
    print(f"Discipline: {label}")
    print(f"  Overall: {overall}/5")
    print(f"  Best:    {best[:80]}")
    print(f"  Weak:    {weak[:80]}")
    print()
    score_summary.append({"label": label, "overall": overall})

# Summary
try:
    avg = sum(r["overall"] for r in score_summary if isinstance(r["overall"], int)) / len(score_summary)
    print(f"Average overall score across disciplines: {avg:.1f}/5")
except Exception:
    pass
```

**Observe:**
- Which discipline scored lowest on `audience_fit`? What would improve it?
- Does the judge's `best_sentence` pick align with your intuition about what's most persuasive?
- Where does `eop_accuracy` drop? These indicate spots where the spokesperson's knowledge base needs strengthening.

**Record**: One judge evaluation that surprised you. Is the judge's assessment fair? Why or why not?

---

## 11. Capstone: Design Your Own Spokesperson for a Specific Field

Now build a spokesperson for a research audience from a field **not covered in the experiments above**. Suggestions from the paper's interview cohort: applied mathematics, inorganic chemistry. Or choose your own field.

```python
# Cell: Capstone — Your own field-specific spokesperson

# --- Fill in your chosen field ---
MY_FIELD = "[Your field here, e.g., 'applied mathematics' or 'inorganic chemistry']"
MY_AUDIENCE_PROFILE = (
    "[Describe the researcher: what software do they use? "
    "What is their typical disclosure concern? "
    "What is the most likely objection they would raise?]"
)
MY_QUESTION = "[A question this researcher would actually ask about EOP]"

MY_SYSTEM = (
    f"You are Jordan, an EOP specialist.\n\n"
    f"Audience: A researcher in {MY_FIELD}.\n"
    f"Profile: {MY_AUDIENCE_PROFILE}\n\n"
    f"Use this knowledge:\n{EOP_KNOWLEDGE}\n\n"
    f"Lead with what is most relevant to this specific field and researcher profile. "
    f"Use a concrete example from their domain if possible."
)

my_reply = ask(MY_SYSTEM, MY_QUESTION, temperature=0.6, max_tokens=400)
show(f"My field: {MY_FIELD}", my_reply)

my_scores = evaluate_eop(MY_QUESTION, my_reply)
print("Judge evaluation:")
for k, v in my_scores.items():
    print(f"  {k:22s}: {v}")
```

**Iterate**: Adjust `MY_AUDIENCE_PROFILE` based on the judge's `weakest_point` and rerun. Aim for overall ≥ 4/5.

---

## 12. Summary and What You Have Learned

### Four core insights from this lab

1. **Generic EOP pitches fail domain scientists.** A cell biologist, a mathematician, and a computational biologist all use software differently and have different disclosure concerns. The spokesperson must connect EOP to *their* workflow and *their* incentives.

2. **Accurate knowledge is the foundation of credibility.** The gap between the baseline and the spokesperson isn't tone — it's specificity. Knowing the AlphaFold3 case, the auditable intermediates mechanism, or the exact difference between evidentiary sufficiency and reproducibility is what makes a response compelling instead of generic.

3. **Stakeholder framing changes everything.** The same EOP framework benefits authors, reviewers, editors, and funders differently. The spokesperson must lead with the benefit that is most salient for the person they're talking to.

4. **LLM-as-judge makes iteration fast.** Instead of manually reviewing every response, a structured judge prompt lets you score across multiple criteria and identify the weakest link in each response — so you know exactly where to improve the system prompt.

### How this connects to the rest of the course

| This lab | Connection to Labs 1–6 |
|----------|----------------------|
| Spokesperson system prompt | Same prompt structure principles as Lab 1 (role, format, instructions shape distribution over outputs) |
| Discipline/role adaptation | Same audience-switching logic used in any conditional routing node (Lab 4) |
| LLM-as-judge | Production evaluation pattern; can be added as a validation node in the Lab 4 graph |
| Knowledge base in system prompt | Same "explicit state in system message" pattern as Lab 3 scratchpad |

### Prompt design checklist for the EOP spokesperson

Before deploying any EOP advocacy prompt, verify:

- [ ] **Accuracy**: Does the system prompt correctly distinguish evidentiary sufficiency from reproducibility?
- [ ] **Stakeholder specificity**: Does it specify which role or discipline the audience belongs to?
- [ ] **Concrete mechanisms**: Does it mention auditable intermediates and restricted functional equivalents for proprietary cases?
- [ ] **Objection structure**: Does it give explicit guidance on how to handle skepticism (acknowledge → counter → first step)?
- [ ] **Real examples**: Does it include the AlphaFold3 case or another specific real-world motivating example?
- [ ] **Auto-evaluated**: Has at least one response been graded by the LLM judge to check accuracy and audience fit?

---

*End of Lab 7. End of the Agentic Engineering Crash Course.*
