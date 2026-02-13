/**
 * Google Gemini client — uses @google/generative-ai SDK.
 *
 * Converts OpenAI-format messages and tool definitions to Gemini format,
 * then converts the response back to an OpenAI-compatible shape so the
 * rest of run-agent.ts can use a single code path.
 */

import {
  GoogleGenerativeAI,
  Content,
  Part,
  Tool as GeminiTool,
  FunctionDeclaration,
  FunctionCallingMode,
  SchemaType,
} from "@google/generative-ai";
import type { ChatMessage, ToolDefinition, ToolCall } from "@/lib/types";

const DEFAULT_MODEL = "gemini-2.0-flash";

// ── Format converters ──

function openaiTypeToGeminiType(type: string): SchemaType {
  switch (type) {
    case "string":
      return SchemaType.STRING;
    case "number":
      return SchemaType.NUMBER;
    case "integer":
      return SchemaType.INTEGER;
    case "boolean":
      return SchemaType.BOOLEAN;
    case "array":
      return SchemaType.ARRAY;
    case "object":
      return SchemaType.OBJECT;
    default:
      return SchemaType.STRING;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertJsonSchemaToGemini(schema: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  if (schema.type) {
    result.type = openaiTypeToGeminiType(schema.type);
  }
  if (schema.description) {
    result.description = schema.description;
  }
  if (schema.enum) {
    result.enum = schema.enum;
  }
  if (schema.properties) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.properties = {} as Record<string, any>;
    for (const [key, value] of Object.entries(schema.properties)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.properties[key] = convertJsonSchemaToGemini(value as Record<string, any>);
    }
  }
  if (schema.required) {
    result.required = schema.required;
  }
  if (schema.items) {
    result.items = convertJsonSchemaToGemini(schema.items);
  }

  return result;
}

function toolDefsToGemini(tools: ToolDefinition[]): GeminiTool[] {
  const declarations = tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: convertJsonSchemaToGemini(t.function.parameters),
  }));
  // Cast needed because convertJsonSchemaToGemini returns a generic Record
  // but Gemini SDK expects FunctionDeclarationSchema
  return [{ functionDeclarations: declarations as unknown as FunctionDeclaration[] }];
}

function messagesToGeminiContents(messages: ChatMessage[]): {
  systemInstruction: string | undefined;
  contents: Content[];
} {
  let systemInstruction: string | undefined;
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = (systemInstruction || "") + (msg.content || "");
      continue;
    }

    if (msg.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: msg.content || "" }],
      });
    } else if (msg.role === "assistant") {
      const parts: Part[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments),
            },
          });
        }
      }
      if (parts.length > 0) {
        contents.push({ role: "model", parts });
      }
    } else if (msg.role === "tool") {
      contents.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: msg.name || "unknown",
              response: { result: msg.content || "" },
            },
          },
        ],
      });
    }
  }

  return { systemInstruction, contents };
}

// ── Main call function ──

export interface GeminiCompletionOptions {
  apiKey: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Result shaped like a simplified OpenAI completion for consistency. */
export interface GeminiResult {
  content: string | null;
  tool_calls: ToolCall[] | undefined;
}

export async function callGemini(
  opts: GeminiCompletionOptions
): Promise<GeminiResult> {
  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const model = opts.model || DEFAULT_MODEL;

  const { systemInstruction, contents } = messagesToGeminiContents(
    opts.messages
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelConfig: any = {
    model,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  };

  if (systemInstruction) {
    modelConfig.systemInstruction = systemInstruction;
  }

  if (opts.tools && opts.tools.length > 0) {
    modelConfig.tools = toolDefsToGemini(opts.tools);
    modelConfig.toolConfig = {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    };
  }

  const generativeModel = genAI.getGenerativeModel(modelConfig);

  const result = await generativeModel.generateContent({ contents });
  const response = result.response;
  const candidate = response.candidates?.[0];

  if (!candidate || !candidate.content) {
    return { content: response.text() || null, tool_calls: undefined };
  }

  let textContent = "";
  const toolCalls: ToolCall[] = [];

  for (const part of candidate.content.parts) {
    if (part.text) {
      textContent += part.text;
    }
    if (part.functionCall) {
      toolCalls.push({
        id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "function",
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args),
        },
      });
    }
  }

  return {
    content: textContent || null,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
