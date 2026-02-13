# Glossary — Agentic Engineering Crash Course

One-sentence definitions for terms used across Labs 1–6. Use this when you see an unfamiliar term in the tutorial.

| Term | Definition |
|------|-------------|
| **API** | Application Programming Interface: a way for your code to call an external service (e.g. OpenAI’s API to send a prompt and receive a model response). |
| **context window** | The fixed maximum number of tokens the model can “see” at once; input longer than this is truncated or rejected, and only tokens inside the window affect the model’s output. |
| **conditional decoding** | The process of generating the next token (or tool choice) from the model’s distribution over possible tokens, *conditioned on* the current prompt and prior context. |
| **distribution over next tokens** | The set of probabilities the model assigns to each possible next token (or tool name); tool selection is effectively sampling or taking the argmax from this distribution. |
| **logits** | Raw scores (before softmax) that the model assigns to each possible next token; higher logit means higher probability for that token after normalization. |
| **LLM** | Large Language Model: a neural network trained to predict the next token given previous text; used for chat, tool routing, and structured outputs. |
| **prompt** | The text (and optionally structured messages) you send to the model as input; it conditions the model’s response and includes system instructions, tool definitions, and user messages. |
| **schema** | A formal description of allowed structure and types (e.g. JSON Schema for tool arguments); it constrains what the model or your code can produce and parse. |
| **state (agent state)** | The structured data (messages, tool results, retry counts, scratchpad, etc.) that the agent carries across turns or graph nodes; it is updated as the workflow runs. |
| **token** | The smallest unit of text the model reads and writes (often a word or subword); prompt and response lengths are measured in tokens. |
| **tool call** | A structured request from the model to run a function (e.g. get_weather, search_docs), usually with a name and arguments that your code executes and then returns a result. |

---

*For the full series, see Lab 1–6 in the Agentic Engineering Crash Course.*
