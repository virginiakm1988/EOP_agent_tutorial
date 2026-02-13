"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/lib/context";
import type { ChatMessage, ChatResponse, ToolResult } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ToolResultCard from "./ToolResultCard";

export default function ChatPanel() {
  const {
    messages,
    addMessage,
    isLoading,
    setIsLoading,
    provider,
    model,
    currentApiKey,
    isConfigured,
  } = useApp();

  const [input, setInput] = useState("");
  const [toolResults, setToolResults] = useState<ToolResult[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading || !isConfigured()) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: text };
    addMessage(userMsg);

    setIsLoading(true);

    try {
      const allMessages = [...messages, userMsg];
      const apiKey = currentApiKey();
      if (!apiKey) throw new Error("No API key configured.");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          messages: allMessages,
          model: model || undefined,
        }),
      });

      const data: ChatResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      addMessage(data.reply);

      if (data.toolResults && data.toolResults.length > 0) {
        setToolResults((prev) => [...prev, data.toolResults!]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find tool results for a given assistant message index
  const getToolResultsForIndex = (assistantIndex: number): ToolResult[] | undefined => {
    return toolResults[assistantIndex];
  };

  let assistantCount = 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <WelcomeScreen onSelect={(text) => handleSend(text)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => {
              let trForThis: ToolResult[] | undefined;
              if (msg.role === "assistant") {
                trForThis = getToolResultsForIndex(assistantCount);
                assistantCount++;
              }
              return (
                <div key={i}>
                  {trForThis && trForThis.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {trForThis.map((tr, j) => (
                        <ToolResultCard key={j} result={tr} />
                      ))}
                    </div>
                  )}
                  <MessageBubble message={msg} />
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted text-sm pl-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Thinking...
              </div>
            )}
            {error && (
              <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-card-border bg-card/30 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isConfigured()
                  ? "Ask about EOP, annotate artifacts, classify repos..."
                  : "Configure an API key in the sidebar to start"
              }
              disabled={!isConfigured() || isLoading}
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm
                         placeholder:text-muted/40 resize-none
                         focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleSend()}
              disabled={!isConfigured() || isLoading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-accent text-black font-semibold text-sm
                         hover:bg-accent-hover transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed
                         flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              Send
            </button>
          </div>
          <p className="text-xs text-muted/40 mt-1.5 text-center">
            Shift+Enter for new line &middot; Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onSelect }: { onSelect: (text: string) => void }) {
  const examples = [
    { icon: "?", text: "What is EOP and how is it different from reproducibility?" },
    { icon: "T", text: "Tag data/raw.csv as input_data in the evidence chain" },
    { icon: "C", text: "Classify my repo files into ECF artifact types" },
    { icon: "D", text: "What disclosure scope for 'Our model reliably achieves 95% accuracy'?" },
  ];

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-accent">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2">EOP Agent</h2>
      <p className="text-muted text-sm mb-8 max-w-md">
        Evidence-Oriented Programming assistant. I help researchers understand, adopt,
        and implement EOP/ECF practices for research software disclosure.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onSelect(ex.text)}
            className="px-3 py-2.5 rounded-lg border border-card-border bg-card/50
                       text-xs text-left text-muted hover:text-foreground hover:border-accent/30
                       hover:bg-accent-muted/30 active:scale-[0.98]
                       transition-all cursor-pointer"
          >
            <span className="inline-block w-5 h-5 rounded bg-accent-muted text-accent
                            text-xs font-bold text-center leading-5 mr-2">
              {ex.icon}
            </span>
            {ex.text}
          </button>
        ))}
      </div>
    </div>
  );
}
