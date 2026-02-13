/**
 * EOP Agent runner — the main agent loop.
 *
 * Implements the Lab 0/4 pattern: prompt → LLM → parse tool_calls → execute → respond.
 * Supports multi-turn (Lab 3) by receiving full conversation history.
 * Includes retry on tool failure (simplified Lab 4 graph: route → execute → respond).
 */

import type { ChatMessage, Provider, ToolResult } from "@/lib/types";
import { callLLM } from "@/lib/llm/adapter";
import { EOP_SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

const MAX_TOOL_ROUNDS = 5; // prevent infinite tool-call loops (Lab 4: termination)

export interface AgentRunResult {
  reply: ChatMessage;
  toolResults: ToolResult[];
}

/**
 * Run the EOP agent for one user turn.
 *
 * @param provider  - which LLM provider to use
 * @param apiKey    - the API key for that provider
 * @param history   - conversation history (user + assistant turns, no system)
 * @param model     - optional model override
 */
export async function runAgent(
  provider: Provider,
  apiKey: string,
  history: ChatMessage[],
  model?: string
): Promise<AgentRunResult> {
  // Build the full message list with system prompt
  const messages: ChatMessage[] = [
    { role: "system", content: EOP_SYSTEM_PROMPT },
    ...history,
  ];

  const toolResults: ToolResult[] = [];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await callLLM({
      provider,
      apiKey,
      messages,
      tools: TOOL_DEFINITIONS,
      model,
    });

    // If no tool calls, return the text response
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        reply: {
          role: "assistant",
          content: response.content || "I'm not sure how to respond to that. Could you rephrase?",
        },
        toolResults,
      };
    }

    // The assistant message with tool_calls (add to messages for next round)
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: response.content,
      tool_calls: response.toolCalls,
    };
    messages.push(assistantMsg);

    // Execute each tool call and add results as tool messages
    for (const tc of response.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = { _raw: tc.function.arguments };
      }

      let result: string;
      try {
        result = executeTool(tc.function.name, args);
      } catch (err) {
        result = `[EOP] Tool execution error: ${err instanceof Error ? err.message : String(err)}`;
      }

      toolResults.push({
        toolName: tc.function.name,
        toolCallId: tc.id,
        arguments: args,
        result,
      });

      // Add tool result message (Lab 4: pass result back for next LLM turn)
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
        name: tc.function.name,
      });
    }

    // Loop: the LLM will see the tool results and either call more tools or respond
  }

  // If we exhausted rounds, return whatever we have
  return {
    reply: {
      role: "assistant",
      content:
        "I've completed the maximum number of tool operations. Here's a summary of what was done:\n\n" +
        toolResults.map((r) => `- **${r.toolName}**: ${r.result}`).join("\n"),
    },
    toolResults,
  };
}
