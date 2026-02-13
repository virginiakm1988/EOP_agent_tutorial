/**
 * LLM Adapter — unified interface across OpenAI, NIM, and Gemini.
 *
 * Returns a consistent shape regardless of provider so the agent
 * runner (run-agent.ts) uses a single code path.
 */

import type { ChatMessage, ToolDefinition, ToolCall, Provider } from "@/lib/types";
import { callOpenAICompatible } from "./openai-client";
import { callGemini } from "./gemini-client";

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[] | undefined;
}

export interface LLMCallOptions {
  provider: Provider;
  apiKey: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMResponse> {
  if (opts.provider === "openai" || opts.provider === "nim") {
    const completion = await callOpenAICompatible({
      provider: opts.provider,
      apiKey: opts.apiKey,
      messages: opts.messages,
      tools: opts.tools,
      model: opts.model,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });

    const choice = completion.choices[0];
    const msg = choice?.message;

    const toolCalls: ToolCall[] | undefined = msg?.tool_calls
      ?.filter((tc) => tc.type === "function")
      .map((tc) => {
        // tc is ChatCompletionMessageFunctionToolCall after the filter
        const ftc = tc as { id: string; type: "function"; function: { name: string; arguments: string } };
        return {
          id: ftc.id,
          type: "function" as const,
          function: {
            name: ftc.function.name,
            arguments: ftc.function.arguments,
          },
        };
      });

    return {
      content: msg?.content ?? null,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  if (opts.provider === "gemini") {
    const result = await callGemini({
      apiKey: opts.apiKey,
      messages: opts.messages,
      tools: opts.tools,
      model: opts.model,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });

    return {
      content: result.content,
      toolCalls: result.tool_calls,
    };
  }

  throw new Error(`Unknown provider: ${opts.provider}`);
}
