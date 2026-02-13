// ── Shared types for the EOP Agent web app ──

export type Provider = "openai" | "nim" | "gemini";

export interface ApiKeys {
  openai?: string;
  nim?: string;
  gemini?: string;
}

/** A single message in the OpenAI chat format. */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/** Body sent from the frontend to POST /api/chat */
export interface ChatRequest {
  provider: Provider;
  apiKey: string;
  messages: ChatMessage[]; // conversation history (user + assistant turns)
  model?: string; // optional model override
}

/** Response returned from POST /api/chat */
export interface ChatResponse {
  reply: ChatMessage; // the final assistant message
  toolResults?: ToolResult[]; // intermediate tool execution results (for UI display)
  error?: string;
}

export interface ToolResult {
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
  result: string;
}

/** OpenAI-style tool definition for function calling */
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
