/**
 * POST /api/chat — EOP Agent chat endpoint.
 *
 * Receives { provider, apiKey, messages, model? } and returns the agent's reply.
 * No API keys are stored server-side; they come from the request body.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, Provider } from "@/lib/types";
import { runAgent } from "@/lib/eop-agent/run-agent";

const VALID_PROVIDERS: Provider[] = ["openai", "nim", "gemini"];
const MAX_MESSAGES = 100;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;

    // ── Validate ──
    if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.apiKey || typeof body.apiKey !== "string" || body.apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "API key is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty." },
        { status: 400 }
      );
    }

    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Too many messages (max ${MAX_MESSAGES}).` },
        { status: 400 }
      );
    }

    // ── Run agent ──
    const result = await runAgent(
      body.provider,
      body.apiKey.trim(),
      body.messages,
      body.model
    );

    const response: ChatResponse = {
      reply: result.reply,
      toolResults: result.toolResults.length > 0 ? result.toolResults : undefined,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[/api/chat] Error:", err);

    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    // Return user-friendly error (don't leak internals)
    const status =
      message.includes("401") || message.includes("Unauthorized")
        ? 401
        : message.includes("429") || message.includes("rate")
          ? 429
          : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
