/**
 * OpenAI + NVIDIA NIM client — both use the openai SDK;
 * NIM simply sets a different baseURL.
 */

import OpenAI from "openai";
import type { ChatMessage, ToolDefinition } from "@/lib/types";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  nim: "nvidia/llama-3.3-nemotron-super-49b-v1",
};

const BASE_URLS: Record<string, string | undefined> = {
  openai: undefined, // use default
  nim: "https://integrate.api.nvidia.com/v1",
};

export interface OpenAICompletionOptions {
  provider: "openai" | "nim";
  apiKey: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callOpenAICompatible(
  opts: OpenAICompletionOptions
): Promise<OpenAI.Chat.ChatCompletion> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: BASE_URLS[opts.provider],
  });

  const model = opts.model || DEFAULT_MODELS[opts.provider] || "gpt-4o-mini";

  const requestBody: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: opts.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 2048,
  };

  if (opts.tools && opts.tools.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestBody.tools = opts.tools as any;
  }

  return client.chat.completions.create(requestBody);
}
