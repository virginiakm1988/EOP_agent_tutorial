# Lab 2: The Contract of a Tool — Schemas, Pydantic, and Function Calling

**Series**: Agentic Engineering Crash Course  
**Module**: 2 — Tool Definition & Pydantic (Defining the Interface)  
**Prerequisites**: Lab 1 (or familiarity with prompt-based tool selection), Python 3.10+, OpenAI API key  

---

## How to use this tutorial in Google Colab

1. Open [Google Colab](https://colab.research.google.com/) and create a new notebook.
2. For each **markdown section** below: insert a **Text cell** and paste the section.
3. For each **code block**: insert a **Code cell** and paste the code, then run.
4. Run cells in order from top to bottom.

**Suggested time**: 45–60 min.  
**Experiments**: Baseline (required). Exploration: Experiments 1–3 required; Experiment 4 optional.

---

## 1. Learning Objectives

By the end of this lab you will be able to:

1. **Define** tools using Pydantic models with typed arguments and descriptions.
2. **Use** the OpenAI function-calling API to let the model invoke tools via structured JSON.
3. **Observe** how schema quality (description wording, argument types, enum constraints) affects both tool selection and argument accuracy.
4. **Implement** validation and error handling for malformed tool calls.

---

## 2. Theoretical Why: Schemas as Contracts

### Mechanism

Function-calling models decode into a **constrained output space** defined by a JSON Schema. The schema acts as both a **grammar constraint** (valid JSON, required fields, types) and a **semantic guide** (descriptions tell the model when and how to use the tool).

- **JSON Schema and Pydantic**: Pydantic models map directly to JSON Schema. The model's field types (`str`, `int`, `Literal["a","b"]`) become schema constraints; the API enforces that the model's raw output conforms before you parse it.
- **Description engineering**: The tool's `description` field is a **prompt fragment**. Its wording changes the probability that the model selects this tool for a given user query. Clear, non-overlapping descriptions reduce misrouting.
- **Argument schemas as type constraints**: `enum` (or `Literal`) fields, `min`/`max` for numbers, `pattern` for strings — all narrow the output space and reduce invalid or ambiguous arguments.

### Maintenance connection

Malformed tool calls (wrong type, missing required field, invalid enum value) are a top failure class in EOP agents. **Pydantic validators** catch these before they reach business logic, giving you structured `ValidationError` diagnostics instead of runtime crashes or silent misuse.

---

## 3. Setup

**Dependencies**: Python 3.10+, `openai`, `pydantic`.

> **What is Pydantic?**
>
> Pydantic is a Python library that lets you define the *shape* of your data using normal Python classes and type annotations. When data comes in, Pydantic automatically checks that it matches the shape — and raises a clear error if it doesn't.
>
> Example: instead of manually checking `if not isinstance(city, str): raise ValueError(...)`, you write:
> ```python
> from pydantic import BaseModel
> class GetWeather(BaseModel):
>     city: str
> ```
> Now `GetWeather(city=123)` raises a `ValidationError` automatically. In this lab, we use Pydantic to define what arguments each AI tool expects, so bad outputs from the model are caught before they reach your code.
>
> No prior experience with Pydantic is needed — the lab introduces it step by step.

> **How Pydantic catches bad tool arguments before they break your code:**
>
> ```
>  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
>  │  LLM Output  │──► │ json.loads() │──► │   Pydantic   │──► (valid)   ✓ Run tool safely
>  │ (JSON string)│    │  Parse JSON  │    │  .validate() │
>  └──────────────┘    └──────────────┘    └──────────────┘──► (invalid) ✗ ValidationError → log & handle
> ```

```python
# Cell: Install dependencies
!pip install -q openai pydantic
```

```python
# Cell: Imports and API key (OpenAI or NVIDIA NIM)
import json
import os
from getpass import getpass
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

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

## 4. Baseline Code: Pydantic Tools and OpenAI Function Calling

We define **three tools** as Pydantic `BaseModel` subclasses, convert them to the OpenAI `tools` format, send a user query, and parse/validate the model's tool call with Pydantic.

### 4.1 Define the tool models

```python
# Cell: Pydantic tool models

class GetWeather(BaseModel):
    """Retrieve the current weather for a given city. Use when the user asks about weather, temperature, or forecast."""
    city: str = Field(description="The city name, e.g. New York, Tokyo.")

class SearchDocs(BaseModel):
    """Search internal documentation by keyword. Use when the user asks about policies, procedures, or technical references."""
    query: str = Field(description="Search query or keywords.")
    top_k: int = Field(default=5, description="Maximum number of results to return (default 5).", ge=1, le=20)

class CreateTicket(BaseModel):
    """Create a support ticket in the ticketing system. Use when the user wants to report an issue, request help, or escalate."""
    title: str = Field(description="Short title or summary of the ticket.")
    severity: Literal["low", "medium", "high"] = Field(description="Severity level: low, medium, or high.")
```

Note: The **docstring** of each model becomes the tool's `description` in the API. The **Field(description=...)** on each argument becomes the parameter description in the JSON Schema — both drive tool selection and argument quality.

### 4.2 Convert Pydantic models to OpenAI tools format

```python
# Cell: Pydantic to OpenAI tools format

def pydantic_to_openai_tool(model: type[BaseModel], name: str | None = None) -> dict:
    """Build an OpenAI tool definition from a Pydantic model."""
    name = name or model.__name__
    schema = model.model_json_schema()
    # OpenAI expects "parameters" to be a JSON Schema object (type, properties, required).
    # Pydantic's schema may include "title"; we keep properties and required.
    parameters = {
        "type": "object",
        "properties": schema.get("properties", {}),
        "required": schema.get("required", []),
    }
    description = model.model_json_schema().get("description") or (model.__doc__ or "")
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description.strip(),
            "parameters": parameters,
        },
    }


# Tool registry: name -> Pydantic model (for parsing)
TOOL_MODELS = {
    "GetWeather": GetWeather,
    "SearchDocs": SearchDocs,
    "CreateTicket": CreateTicket,
}

tools_openai = [pydantic_to_openai_tool(m, name) for name, m in TOOL_MODELS.items()]
print(json.dumps(tools_openai[0], indent=2))
```

### 4.3 Call the API and parse tool_calls

```python
# Cell: Chat with tools and parse response

def chat_with_tools(user_message: str, temperature: float = 0.0):
    """Send user message with tools; return assistant message and any tool calls."""
    response = client.chat.completions.create(
        model=MODEL,
        temperature=temperature,
        messages=[{"role": "user", "content": user_message}],
        tools=tools_openai,
        tool_choice="auto",
        max_tokens=500,
    )
    msg = response.choices[0].message
    return msg


def parse_and_validate_tool_call(tool_call) -> dict:
    """
    Given one item from message.tool_calls, parse arguments and validate with Pydantic.
    Returns dict with: tool_name, parsed_args (Pydantic model instance or None), error (if validation failed).
    """
    name = tool_call.function.name
    raw_args = tool_call.function.arguments
    model_class = TOOL_MODELS.get(name)
    result = {"tool_name": name, "parsed_args": None, "error": None}
    if not model_class:
        result["error"] = f"Unknown tool: {name}"
        return result
    try:
        args_dict = json.loads(raw_args)
        result["parsed_args"] = model_class.model_validate(args_dict)
    except json.JSONDecodeError as e:
        result["error"] = f"Invalid JSON: {e}"
    except ValidationError as e:
        result["error"] = f"ValidationError: {e}"
    return result


# Baseline run
msg = chat_with_tools("What's the weather in San Francisco?")
print("Assistant content:", msg.content or "(no text)")
if msg.tool_calls:
    for tc in msg.tool_calls:
        out = parse_and_validate_tool_call(tc)
        print("Tool:", out["tool_name"])
        print("Parsed args:", out["parsed_args"])
        print("Error:", out["error"])
else:
    print("No tool calls.")
```

**Expected**: The model returns a tool call for `GetWeather` with `{"city": "San Francisco"}` (or similar). Parsed args are a `GetWeather` instance; error is None.  
**Record**: Selected tool, parsed arguments, validation status. This is the **control** for the experiments below.

---

## 5. Exploration Lab: Schema Quality and Validation

### Experiment 1: Description A/B test

**Variable**: Swap the **descriptions** of two tools (e.g. give `GetWeather` the old `SearchDocs` description and vice versa).  
**Expected**: The model selects the tool whose description now matches the query — proving descriptions are the primary selection signal.

```python
# Cell: Experiment 1 — Description A/B

# Swap descriptions between GetWeather and SearchDocs (no mutation of tools_openai)
tools_swapped = [
    {"type": "function", "function": {**tools_openai[0]["function"], "description": tools_openai[1]["function"]["description"]}},
    {"type": "function", "function": {**tools_openai[1]["function"], "description": tools_openai[0]["function"]["description"]}},
]

# Query about weather — but GetWeather now has the "search docs" description
resp = client.chat.completions.create(
    model=MODEL,
    temperature=0.0,
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
    tools=tools_swapped,
    tool_choice="auto",
    max_tokens=100,
)
msg = resp.choices[0].message
if msg.tool_calls:
    for tc in msg.tool_calls:
        print("Selected tool:", tc.function.name)
        print("Arguments:", tc.function.arguments)
else:
    print("No tool calls; content:", msg.content)
```

**Observe**: With swapped descriptions, the model may choose the tool whose *description* matches "weather" (SearchDocs in this setup), not the one whose *name* is GetWeather.  
**Record**: Which tool was selected? This shows that **descriptions are prompts** for tool selection.

---

### Experiment 2: Missing enum constraint

**Variable**: Remove the `Literal` from the `severity` field (e.g. use plain `str`).  
**Expected**: The model may output values like `"critical"` or `"urgent"` that would be invalid for the original enum. If we keep Literal and the model outputs an invalid value, Pydantic raises `ValidationError`.

```python
# Cell: Experiment 2 — Missing enum (plain str severity)

class CreateTicketNoEnum(BaseModel):
    """Create a support ticket. Use when the user wants to report an issue or escalate."""
    title: str = Field(description="Short title of the ticket.")
    severity: str = Field(description="Severity level.")  # No Literal — model can say anything

tool_no_enum = pydantic_to_openai_tool(CreateTicketNoEnum, "CreateTicket")

resp = client.chat.completions.create(
    model=MODEL,
    temperature=0.3,
    messages=[{"role": "user", "content": "I need to create a critical bug ticket for login failures."}],
    tools=[tool_no_enum],
    tool_choice="auto",
    max_tokens=100,
)
msg = resp.choices[0].message
if msg.tool_calls:
    for tc in msg.tool_calls:
        print("Arguments (raw):", tc.function.arguments)
        # Try parsing with the STRICT model (Literal["low","medium","high"])
        try:
            args = json.loads(tc.function.arguments)
            strict_parsed = CreateTicket.model_validate(args)
            print("Strict parse OK:", strict_parsed)
        except ValidationError as e:
            print("Strict parse ValidationError:", e)
```

**Observe**: The model may return `"severity": "critical"`. With the strict `CreateTicket` model (Literal), validation fails. Without the enum, invalid values reach your code unless you add a validator.  
**Record**: Note the raw `severity` value and whether strict validation failed. **Implication**: Use enums (or constrained types) so Pydantic catches invalid values.

---

### Experiment 3: Ambiguous argument names

**Variable**: Rename a clear parameter (e.g. `city`) to something generic like `input`.  
**Expected**: Argument accuracy drops; the parameter name acts as an implicit prompt.

```python
# Cell: Experiment 3 — Ambiguous argument name

class GetWeatherGeneric(BaseModel):
    """Retrieve the current weather for a given city. Use when the user asks about weather."""
    input: str = Field(description="The city name.")  # Generic name

tool_generic = pydantic_to_openai_tool(GetWeatherGeneric, "GetWeather")

resp = client.chat.completions.create(
    model=MODEL,
    temperature=0.0,
    messages=[{"role": "user", "content": "What's the weather in NYC and Boston?"}],
    tools=[tool_generic],
    tool_choice="auto",
    max_tokens=100,
)
msg = resp.choices[0].message
if msg.tool_calls:
    for tc in msg.tool_calls:
        print("Arguments:", tc.function.arguments)
```

**Observe**: With a generic name like `input`, the model may still do well for simple queries, but for "NYC and Boston" it may put both in one string, omit one, or format oddly. Clear names (`city`, `query`) improve consistency.  
**Record**: Compare argument quality (e.g. single city vs two cities) to the baseline `GetWeather(city=...)`. **Implication**: Argument names are part of the contract; keep them specific and consistent.

---

### Experiment 4: Validation failure handling

**Variable**: Intentionally pass **invalid** JSON or invalid types to Pydantic (e.g. wrong type, missing required field, invalid enum).  
**Expected**: `ValidationError` provides structured diagnostics (which field, what went wrong).

```python
# Cell: Experiment 4 — ValidationError handling

# Simulate malformed tool output (as if the model returned bad JSON)
bad_payloads = [
    '{"city": 123}',                    # wrong type for city
    '{}',                              # missing required city
    '{"title": "Bug", "severity": "critical"}',  # invalid enum for CreateTicket
]

for raw in bad_payloads:
    print("Input:", raw)
    try:
        data = json.loads(raw)
        # Try validating as GetWeather (first two) or CreateTicket (third)
        if "city" in data or "title" not in data:
            GetWeather.model_validate(data)
        else:
            CreateTicket.model_validate(data)
        print("  -> Valid")
    except ValidationError as e:
        print("  -> ValidationError:")
        for err in e.errors():
            print("     ", err)
    except json.JSONDecodeError as e:
        print("  -> JSONDecodeError:", e)
    print()
```

**Observe**: Pydantic reports field path, error type, and message. Use this to log and fix malformed tool calls in production.  
**Record**: Note how each payload fails. **Implication**: Always validate tool arguments with Pydantic before calling business logic; surface ValidationError in logs or user-facing error messages.

---

## 6. Maintenance Connection: Debugging and Evolving Tool Schemas

### Diagnostic checklist: "Right tool, wrong arguments"

| Step | Check | Fix |
|------|--------|-----|
| 1 | **Parameter descriptions** | Make each argument's description explicit (e.g. "City name, e.g. New York"). |
| 2 | **Enum / Literal** | Use Literal or Enum for fixed sets (severity, status) so invalid values are caught. |
| 3 | **Argument names** | Prefer specific names (`city`, `query`) over generic (`input`, `value`). |
| 4 | **Required vs optional** | Mark optional args with default; required list in schema must match. |
| 5 | **ValidationError handling** | Log and (optionally) return a clear message to the user or agent loop. |

### Versioning and regression tests

- **Version tool schemas**: Include a schema version or tool name suffix when you change parameters (e.g. `CreateTicket_v2`).
- **Regression tests**: Store example user queries and expected (tool, args) pairs; run after model or schema changes to detect drift.

### Backward-compatible evolution

- **Add optional fields** with defaults so old callers still validate.
- **Deprecate tools** by keeping the old tool in the list with a description like "Deprecated. Use NewTool instead." and routing internally to the new implementation until clients migrate.

---

## 7. Summary and Next Steps

### Takeaways

1. **Schemas are contracts**: JSON Schema + Pydantic define both what the model can output and how you validate it.
2. **Descriptions are prompts**: Tool and parameter descriptions drive selection and argument quality; keep them clear and non-overlapping.
3. **Validation is defense-in-depth**: Pydantic validators catch malformed tool calls and give structured errors before business logic runs.

### What's next

**Lab 3: The Persistent Agent** — Memory & State. We'll build an agent that maintains state across multi-turn interactions, observe context-window limits, and implement a summarization strategy.

---

*End of Lab 2. Proceed to Lab 3 when ready.*
