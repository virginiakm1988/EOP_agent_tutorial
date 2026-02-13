# Lab 2: The Contract of a Tool — Outline

**Module**: 2 — Tool Definition & Pydantic (Defining the Interface)

---

## Learning Objectives

1. Define tools using Pydantic models with typed arguments and descriptions.
2. Use the OpenAI function-calling API (or compatible) to let the model invoke tools via structured JSON.
3. Observe how schema quality (description wording, argument types, enum constraints) affects both tool selection and argument accuracy.
4. Implement validation and error handling for malformed tool calls.

---

## Section Plan

### 1. Theoretical Why: Schemas as Contracts

- **Mechanism**: Function-calling models decode into a constrained output space defined by a JSON Schema. The schema acts as both a grammar constraint and a semantic guide.
- **Key concepts**:
  - JSON Schema and how Pydantic models map to it.
  - Description engineering: the tool `description` field is a prompt fragment; its wording changes selection probability.
  - Argument schemas as type constraints: `enum` fields, `min/max`, `pattern` — all narrow the output space.
- **Maintenance connection**: Malformed tool calls (wrong type, missing field, invalid enum value) are a top failure class in EOP agents. Pydantic validators catch these before they hit business logic.

### 2. Baseline Code

- Define 3 tools as Pydantic `BaseModel` subclasses (e.g., `GetWeather(city: str)`, `SearchDocs(query: str, top_k: int = 5)`, `CreateTicket(title: str, severity: Literal["low","medium","high"])`).
- Convert to OpenAI `tools` format automatically.
- Send a user query and receive a structured `tool_calls` response.
- Parse and validate with Pydantic.
- Print: selected tool, parsed arguments, validation status.

### 3. Exploration Lab

| Experiment | Variable | Expected observation |
|---|---|---|
| Description A/B test | Swap tool descriptions between two tools | Model selects the tool whose description now matches the query, proving descriptions are the primary selection signal. |
| Missing enum constraint | Remove `Literal` from severity field | Model may output arbitrary strings ("critical", "urgent") that would fail validation if not caught. |
| Ambiguous argument names | Rename `city` to `input` | Model's argument accuracy drops; name serves as an implicit prompt. |
| Validation failure handling | Intentionally pass bad schema to Pydantic | Show how `ValidationError` provides structured diagnostics. |

### 4. Maintenance Connection

- Diagnostic checklist for "agent called the right tool but with wrong arguments."
- How to version tool schemas and run regression tests.
- Strategies for backward-compatible schema evolution (adding optional fields, deprecating tools).

### 5. Summary and Next Steps

- Takeaways: Schemas are contracts; descriptions are prompts; validation is defense-in-depth.
- Next: Lab 3 — Memory & State.

---

## Dependencies

- `openai`, `pydantic`
