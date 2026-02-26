# Glossary — Agentic Engineering Crash Course

One-sentence definitions for terms used across Labs 1–6. Use this when you see an unfamiliar term in the tutorial.

| Term | Definition |
|------|-------------|
| **API** | Application Programming Interface: a way for your code to call an external service (e.g. OpenAI’s API to send a prompt and receive a model response). |
| **API key** | A secret string that identifies you to an API service (like OpenAI); treat it like a password — never share it or commit it to version control. |
| **BaseModel** | The Pydantic class you inherit from to define a typed data model; fields with type annotations become validated attributes (e.g. `class MyTool(BaseModel): city: str`). |
| **context window** | The fixed maximum number of tokens the model can “see” at once; input longer than this is truncated or rejected, and only tokens inside the window affect the model’s output. |
| **conditional decoding** | The process of generating the next token (or tool choice) from the model’s distribution over possible tokens, *conditioned on* the current prompt and prior context. |
| **distribution over next tokens** | The set of probabilities the model assigns to each possible next token (or tool name); tool selection is effectively sampling or taking the argmax from this distribution. |
| **function calling** | A feature of LLM APIs where the model can request to run a named function with typed arguments instead of returning plain text; your code executes the function and sends the result back to the model. |
| **JSON Schema** | A standard for describing the structure and types of JSON data (e.g. which fields are required, what type they are); used here to tell the LLM what arguments a tool expects. |
| **logits** | Raw scores (before softmax) that the model assigns to each possible next token; higher logit means higher probability for that token after normalization. |
| **LLM** | Large Language Model: a neural network trained to predict the next token given previous text; used for chat, tool routing, and structured outputs. |
| **Mermaid** | A text-based diagramming format used in Markdown; diagrams in these labs use Mermaid to draw flowcharts (rendered by GitHub, VS Code, and Jupyter extensions). |
| **Pydantic** | A Python library for defining data models with automatic type validation; used here to define tool argument schemas and catch invalid inputs before they reach your code. |
| **prompt** | The text (and optionally structured messages) you send to the model as input; it conditions the model’s response and includes system instructions, tool definitions, and user messages. |
| **schema** | A formal description of allowed structure and types (e.g. JSON Schema for tool arguments); it constrains what the model or your code can produce and parse. |
| **state (agent state)** | The structured data (messages, tool results, retry counts, scratchpad, etc.) that the agent carries across turns or graph nodes; it is updated as the workflow runs. |
| **temperature** | A sampling parameter (0.0–2.0) that controls randomness in model outputs; 0.0 is fully deterministic (same output every run), higher values introduce more variety and unpredictability. |
| **token** | The smallest unit of text the model reads and writes (often a word or subword); prompt and response lengths are measured in tokens. |
| **tool call** | A structured request from the model to run a function (e.g. get_weather, search_docs), usually with a name and arguments that your code executes and then returns a result. |

---

*For the full series, see Lab 1–6 in the Agentic Engineering Crash Course.*
