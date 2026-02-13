# Lab 0: Build a Minimal EOP Agent Prototype — Step by Step

**Series**: Agentic Engineering Crash Course (EOP focus)  
**Goal**: Assemble the simplest agent that understands “evidence-oriented” actions and chooses a tool to help researchers annotate or link artifacts.  
**Prerequisites**: Python 3.10+, OpenAI API key (or NVIDIA NIM).  
**Time**: ~30–40 min.

---

## What You Will Build

By the end of this lab you will have a **single-turn EOP agent** that:

1. Reads a user message (e.g. “Tag this file as input data” or “Link Figure 2 to the main claim”).
2. Chooses one of two **EOP tools**: `annotate_artifact` or `link_to_claim`.
3. Executes the chosen tool and returns a short result.

No frameworks (LangChain/LangGraph) — just prompt, LLM call, parse, and execute. This matches the idea from the EOP paper: *AI agents might assist researchers in identifying and annotating evidentiary artifacts during software development*.

---

## How to Use This Tutorial

- **Notebook**: Open `Lab0_Build_an_EOP_Agent_Prototype.ipynb` in Jupyter or Google Colab and run cells in order.
- **Markdown**: Alternatively, copy sections from this `.md` file into a new notebook or a `.py` file and run top to bottom.

For terms (prompt, tool call, LLM), see [Glossary](Glossary.md).

---

## Step 1: Setup

Install the client and load your API key. Same pattern as Lab 1 (OpenAI or NVIDIA NIM).

```python
# Cell: Install
!pip install -q openai
```

```python
# Cell: Imports and API key
import os
import re
from getpass import getpass
from openai import OpenAI

use_nim = os.environ.get("USE_NIM", "").lower() in ("1", "true", "yes") or "NIM_API_KEY" in os.environ
if use_nim:
    if "NIM_API_KEY" not in os.environ:
        os.environ["NIM_API_KEY"] = getpass("Enter your NVIDIA API key (NIM): ")
    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=os.environ["NIM_API_KEY"])
    MODEL = os.environ.get("NIM_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1.5")
else:
    if "OPENAI_API_KEY" not in os.environ:
        os.environ["OPENAI_API_KEY"] = getpass("Enter your OpenAI API key: ")
    client = OpenAI()
    MODEL = "gpt-4o-mini"

print(f"Using model: {MODEL}")
```

---

## Step 2: Define EOP Tools (Concept Only)

We define two tools that match the EOP idea of *identifying and linking evidence*:

| Tool | When to use |
|------|------------------|
| `annotate_artifact` | User wants to tag a file, dataset, or figure/table as part of the evidence chain (e.g. input data, output data, visual claim). |
| `link_to_claim`     | User wants to link an artifact or process to a scientific claim. |

For this prototype, each tool is a Python function that returns a short message. No real I/O yet.

```python
# Cell: EOP tool definitions (implementations)

EOP_TOOLS = {
    "annotate_artifact": "Tag a file or data artifact as part of the evidence chain (e.g. input_data, output_data, visual_claim). Use when the user mentions a file, dataset, or figure/table they want to annotate.",
    "link_to_claim": "Link an artifact or process to a scientific claim. Use when the user wants to associate evidence with a claim or figure/table with a claim.",
}


def execute_annotate_artifact(artifact_name: str = "") -> str:
    """Placeholder: in a full implementation, this would update metadata or a manifest."""
    return f"[EOP] Annotated artifact: {artifact_name or '(unspecified)'} — recorded in evidence chain."


def execute_link_to_claim(artifact_name: str = "", claim_text: str = "") -> str:
    """Placeholder: in a full implementation, this would store the artifact–claim link."""
    return f"[EOP] Linked '{artifact_name or '(artifact)'}' to claim: '{claim_text or '(claim)'}'."


def run_tool(tool_name: str, **kwargs) -> str:
    """Execute the named EOP tool and return a result string."""
    if tool_name == "annotate_artifact":
        return execute_annotate_artifact(artifact_name=kwargs.get("artifact_name", ""))
    if tool_name == "link_to_claim":
        return execute_link_to_claim(
            artifact_name=kwargs.get("artifact_name", ""),
            claim_text=kwargs.get("claim_text", ""),
        )
    return f"[EOP] Unknown tool: {tool_name}"
```

**Check**: You now have a tool registry (`EOP_TOOLS`) and an executor (`run_tool`). The agent’s job is to *choose* `tool_name`; we will parse it from the LLM output in the next steps.

---

## Step 3: Build the Prompt and Ask the LLM for a Tool Choice

The agent prompt has two parts: (1) system message = “you have these tools, reply with TOOL: <name>”; (2) user message = the researcher’s request. We send them to the LLM and get back one line like `TOOL: annotate_artifact`.

```python
# Cell: Prompt builder and tool-choice call

def build_system_prompt(tools: dict) -> str:
    """Build the system message that lists EOP tools and the reply format."""
    lines = [
        "You are an EOP (Evidence-Oriented Programming) assistant. You help researchers annotate artifacts and link them to scientific claims.",
        "",
        "You have the following tools:",
    ]
    for i, (name, desc) in enumerate(tools.items(), 1):
        lines.append(f"  {i}. {name} — {desc}")
    lines.extend([
        "",
        "Given the user's message, choose exactly one tool to invoke.",
        "Reply with exactly one line in this format:",
        "TOOL: <tool_name>",
        "Do not include any other text.",
    ])
    return "\n".join(lines)


def parse_tool_choice(response_text: str):
    """Extract tool name from a line like 'TOOL: annotate_artifact'."""
    match = re.search(r"TOOL:\s*(\S+)", response_text.strip(), re.IGNORECASE)
    return match.group(1) if match else None


def ask_agent_for_tool(user_message: str, tools: dict, temperature: float = 0.0):
    """Send user message to the LLM; return raw response and parsed tool name."""
    system = build_system_prompt(tools)
    response = client.chat.completions.create(
        model=MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        max_tokens=50,
    )
    text = (response.choices[0].message.content or "").strip()
    tool = parse_tool_choice(text)
    return {"raw": text, "tool": tool}
```

**Observe**: Same idea as Lab 1 — prompt structure and format (e.g. “TOOL: …”) determine whether the model’s answer is easy to parse and correct.

---

## Step 4: Wire Tool Choice to Execution (One Turn)

Combine “ask LLM” and “run tool” into a single function. For the prototype we do not parse arguments from the LLM; we pass the raw `user_message` as a simple context string so the placeholder tools have something to show.

```python
# Cell: Single-turn EOP agent

def run_eop_agent(user_message: str, tools: dict = None, temperature: float = 0.0):
    """
    One turn: user message -> LLM chooses tool -> we execute tool -> return result.
    """
    if tools is None:
        tools = EOP_TOOLS

    step1 = ask_agent_for_tool(user_message, tools, temperature=temperature)
    chosen = step1["tool"]

    if not chosen or chosen not in tools:
        return {
            "user_message": user_message,
            "raw_response": step1["raw"],
            "chosen_tool": chosen,
            "tool_result": None,
            "error": "No valid tool parsed or tool not in list.",
        }

    # Optional: later you could parse artifact_name / claim_text from user_message or from LLM
    tool_result = run_tool(chosen, artifact_name=user_message[:80], claim_text="")

    return {
        "user_message": user_message,
        "raw_response": step1["raw"],
        "chosen_tool": chosen,
        "tool_result": tool_result,
    }
```

---

## Step 5: Try Your EOP Agent

Run a few example user messages and inspect the chosen tool and the placeholder result.

```python
# Cell: Run examples

examples = [
    "Tag the file data/measurements.csv as input data for the experiment.",
    "Link Figure 2 to the main claim about the correlation.",
    "I want to annotate the trained model checkpoint as output data.",
]

for msg in examples:
    out = run_eop_agent(msg, temperature=0.0)
    print("User:", out["user_message"])
    print("LLM said:", out["raw_response"])
    print("Chosen tool:", out["chosen_tool"])
    print("Tool result:", out["tool_result"])
    print()
```

**Record**:

- For “Tag the file …” / “annotate …” you should usually see `annotate_artifact`.
- For “Link Figure 2 to the main claim” you should usually see `link_to_claim`.
- If something different happens, note it — that’s the kind of behavior Lab 1 teaches you to fix with prompt structure and temperature.

---

## Step 6: Optional — “No Tool” and Format Drift

Sometimes the user might ask something that doesn’t clearly map to a tool (e.g. “What is EOP?”). The model might then reply with text that doesn’t match `TOOL: <name>`, and `parse_tool_choice` returns `None`. Our agent already handles that by returning `chosen_tool: None` and `error: "No valid tool parsed..."`. Try it:

```python
# Cell: Optional — query that may not map to a tool

out = run_eop_agent("What is Evidence-Oriented Programming?", temperature=0.0)
print("Chosen tool:", out["chosen_tool"])
print("Tool result:", out["tool_result"])
print("Error:", out.get("error"))
```

**Observe**: When the answer is not in the expected format, the agent “fails gracefully” (no crash, but no tool run). Improving this (e.g. a “no_tool” or “answer_directly” option) is a natural next step.

---

## Summary and Next Steps

You built a minimal EOP agent that:

1. **Setup**: Connects to an LLM (OpenAI or NIM).
2. **Tools**: Defines two EOP-themed tools and executes them via `run_tool`.
3. **Prompt**: Builds a system message that lists tools and asks for `TOOL: <name>`.
4. **Parse**: Extracts the tool name from the model output.
5. **Run**: Calls `run_eop_agent(user_message)` → LLM chooses tool → execute → return result.

**Takeaways**:

- The agent is a loop: *user message → prompt (system + user) → LLM → parse tool → execute tool*. This is the same anatomy you see in Lab 1; here we added execution.
- EOP tools are just functions; the “evidence chain” is only simulated (placeholder messages). A real implementation would write to a manifest or database.
- Prompt structure and reply format matter: if you change the wording or the “TOOL: …” convention, parsing can break (format drift).

**Next**:

- **Lab 1** — Understand why the model sometimes picks the wrong tool (order, temperature, vague prompts) and how to debug.
- **Lab 2** — Define tools with a proper schema (e.g. Pydantic) so the model can return *arguments* (e.g. `artifact_name`, `claim_text`) and you can pass them into `run_tool` instead of the raw message.

---

*For the full series, see Lab 1–6 in the Agentic Engineering Crash Course and the EOP/ECF materials.*
