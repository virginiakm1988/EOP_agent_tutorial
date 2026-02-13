# EOP Agent Web App

AI Agent for **Evidence-Oriented Programming (EOP/ECF)**, built with Next.js and deployable on Vercel.  
Supports **OpenAI**, **NVIDIA NIM**, and **Google Gemini** — users provide their own API keys in the browser.

This app integrates the concepts from Labs 0–6 of the Agentic Engineering Crash Course into a single interactive web agent.

---

## Quick Start

```bash
cd eop-agent-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
eop-agent-web/
├── app/
│   ├── layout.tsx                  # Root layout, wraps AppProvider context
│   ├── page.tsx                    # Main page: sidebar + chat (single-page app)
│   ├── globals.css                 # Dark theme, NVIDIA green accent, chat markdown styles
│   └── api/chat/
│       └── route.ts               # POST /api/chat — validates request, runs agent, returns reply
│
├── components/
│   ├── Sidebar.tsx                 # API key inputs, provider/model selector, status indicator
│   ├── ChatPanel.tsx               # Chat message list, input box, welcome screen with example prompts
│   ├── MessageBubble.tsx           # Single message rendering with lightweight markdown
│   └── ToolResultCard.tsx          # Expandable card showing tool execution details
│
├── lib/
│   ├── types.ts                    # Shared TypeScript types (ChatMessage, ToolCall, Provider, etc.)
│   ├── context.tsx                 # React Context: API keys, selected provider, messages, loading state
│   │
│   ├── llm/                        # ← LLM provider layer
│   │   ├── adapter.ts              #   Unified callLLM() — routes to the correct provider
│   │   ├── openai-client.ts        #   OpenAI + NVIDIA NIM (same SDK, different baseURL)
│   │   └── gemini-client.ts        #   Google Gemini (format conversion to/from OpenAI shape)
│   │
│   └── eop-agent/                  # ← Agent brain
│       ├── system-prompt.ts        #   The system prompt: role, EOP/ECF knowledge, objection handling
│       ├── tools.ts                #   Tool definitions (schemas) + executor functions
│       └── run-agent.ts            #   Agent loop: LLM → tool_calls → execute → respond (max 5 rounds)
│
├── vercel.json                     # Vercel deployment config
└── package.json
```

---

## Where to Edit: Feature-by-Feature Guide

### I want to change the agent's personality, knowledge, or instructions

Edit **`lib/eop-agent/system-prompt.ts`**

This file contains the single `EOP_SYSTEM_PROMPT` string — the system message sent with every request.
It includes:

- Role & audience definition (Lab 1)
- EOP core concepts and ECF evidence chain (7 artifact types)
- Claim strength & disclosure scope rules (Lab 6)
- Stakeholder framing (author/reviewer/editor)
- Objection handling (e.g. "too much overhead")
- Tool usage instructions (when to call tools vs. answer directly)

### I want to add a new tool or modify an existing tool

Edit **`lib/eop-agent/tools.ts`**

This file has two sections:

1. **`TOOL_DEFINITIONS`** — an array of OpenAI function-calling tool schemas.
   Each entry has a `name`, `description`, and `parameters` (JSON Schema).
   This mirrors the Lab 2 Pydantic-to-OpenAI approach.

2. **Executor functions** — e.g. `executeAnnotateArtifact()`, `executeClassifyRepoArtifacts()`.
   These are called when the LLM invokes the tool. Currently they return placeholder/simulation messages.
   To make tools "real", replace the return strings with actual logic (e.g. write to a manifest file, call an external API).

3. **`executeTool()`** — the dispatch function (switch/case). Add your new tool name here.

**Don't forget**: also mention the new tool in `system-prompt.ts` under the "TOOL USAGE" section so the LLM knows when to call it.

Current tools:

| Tool | Origin | What it does |
|------|--------|--------------|
| `annotate_artifact` | Lab 0 | Tag a file as an ECF artifact type |
| `link_to_claim` | Lab 0 | Link an artifact to a scientific claim |
| `classify_repo_artifacts` | Lab 5 | Classify a list of files into ECF's 7 artifact types |
| `advise_disclosure_scope` | Lab 6 | Recommend disclosure scope from claim strength |
| `suggest_directory_structure` | Lab 5 | Suggest ECF-compliant directory reorganization |

### I want to change the agent loop (retry logic, max rounds, error handling)

Edit **`lib/eop-agent/run-agent.ts`**

This file implements the agent loop from Lab 0/4:

```
system prompt + history → LLM → tool_calls? → execute tools → feed results back → LLM → ... → final text reply
```

Key constants and logic:

- `MAX_TOOL_ROUNDS = 5` — prevents infinite tool-call loops (Lab 4 termination guarantee)
- The `while` loop calls the LLM, checks for `tool_calls`, executes them, appends results, and loops
- If no `tool_calls`, returns the text as the final reply
- Error handling: tool execution failures are caught and returned as error messages to the LLM

### I want to add a new LLM provider or change model defaults

Edit files in **`lib/llm/`**:

- **`adapter.ts`** — the unified `callLLM()` function. Add a new `if (opts.provider === "xxx")` branch.
- **`openai-client.ts`** — OpenAI and NIM client. Change `DEFAULT_MODELS` or `BASE_URLS` here.
- **`gemini-client.ts`** — Gemini client with OpenAI-to-Gemini format conversion. Change `DEFAULT_MODEL` here.

Also update the provider list in **`components/Sidebar.tsx`** (the `PROVIDERS` array at the top) to add UI options.

### I want to change the UI (theme, layout, chat appearance)

- **Theme/colors** → `app/globals.css` — CSS variables under `:root`
- **Layout (sidebar + chat)** → `app/page.tsx`
- **Sidebar content (API keys, provider selector)** → `components/Sidebar.tsx`
- **Chat messages & input** → `components/ChatPanel.tsx`
- **Message rendering (markdown)** → `components/MessageBubble.tsx`
- **Tool result display** → `components/ToolResultCard.tsx`
- **Welcome screen examples** → `components/ChatPanel.tsx` → `WelcomeScreen` function

### I want to change the API route (validation, error handling)

Edit **`app/api/chat/route.ts`**

This is the POST endpoint that:

1. Validates the request body (provider, apiKey, messages)
2. Calls `runAgent()` from `lib/eop-agent/run-agent.ts`
3. Returns the reply + tool results as JSON

### I want to change how state is managed (API keys, messages, provider)

Edit **`lib/context.tsx`**

This React Context holds all client-side state:

- `apiKeys` — stored in React state (not persisted; lost on refresh)
- `provider` — which LLM is selected
- `messages` — conversation history (sent in full with each request for multi-turn, Lab 3)
- `isLoading` — loading indicator

---

## Labs ↔ Code Mapping

| Lab | Concept | Where in the code |
|-----|---------|-------------------|
| Lab 0 | EOP tools + single-turn agent loop | `lib/eop-agent/tools.ts`, `lib/eop-agent/run-agent.ts` |
| Lab 1 | System prompt design (role, audience, advocacy, objection handling) | `lib/eop-agent/system-prompt.ts` |
| Lab 2 | Tool schemas (Pydantic → OpenAI function calling) | `lib/eop-agent/tools.ts` → `TOOL_DEFINITIONS` |
| Lab 3 | Multi-turn memory (conversation history) | `lib/context.tsx` → `messages[]`, `app/api/chat/route.ts` |
| Lab 4 | Agent loop with retry + termination | `lib/eop-agent/run-agent.ts` → `MAX_TOOL_ROUNDS`, `while` loop |
| Lab 5 | ECF classification + directory structure | `lib/eop-agent/tools.ts` → `classify_repo_artifacts`, `suggest_directory_structure` |
| Lab 6 | Claim strength → disclosure scope | `lib/eop-agent/tools.ts` → `advise_disclosure_scope` |

---

## Deploy to Vercel

1. Push this folder to a Git repository
2. Import the repo in [Vercel](https://vercel.com)
3. Set root directory to `eop-agent-web` (if it's inside a monorepo)
4. No environment variables needed — users provide their own API keys in the browser

---

## Security Notes

- API keys are **never stored on the server**. They travel in the request body and are used only for that single LLM call.
- API keys are **not logged**. The API route does not write keys to console or storage.
- For production, consider adding rate limiting (e.g. Vercel KV / Upstash) to prevent abuse.
