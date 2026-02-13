"use client";

import { useApp } from "@/lib/context";
import type { Provider } from "@/lib/types";

const PROVIDERS: { id: Provider; label: string; placeholder: string; models: string[] }[] = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "nim",
    label: "NVIDIA NIM",
    placeholder: "nvapi-...",
    models: [
      "nvidia/llama-3.3-nemotron-super-49b-v1",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct",
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    placeholder: "AIza...",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { apiKeys, provider, model, setApiKey, setProvider, setModel, clearMessages, isConfigured } =
    useApp();

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  if (!isOpen) return null;

  return (
    <aside className="w-80 flex-shrink-0 border-r border-card-border bg-card flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-bold text-sm tracking-wider">EOP AGENT</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-card-border/50 transition-colors text-muted hover:text-foreground"
          aria-label="Close sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Provider selection */}
        <section>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            LLM Provider
          </label>
          <div className="space-y-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  provider === p.id
                    ? "bg-accent-muted border border-accent/30 text-accent font-medium"
                    : "hover:bg-card-border/30 text-foreground/70"
                }`}
              >
                {p.label}
                {apiKeys[p.id] && (
                  <span className="ml-2 text-xs text-accent/60">configured</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* API Key input */}
        <section>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {currentProvider.label} API Key
          </label>
          <input
            type="password"
            value={apiKeys[provider] || ""}
            onChange={(e) => setApiKey(provider, e.target.value)}
            placeholder={currentProvider.placeholder}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-input-border text-sm
                       placeholder:text-muted/50 focus:outline-none focus:border-accent/50
                       focus:ring-1 focus:ring-accent/20 transition-all"
          />
          <p className="mt-1.5 text-xs text-muted/60">
            Your key is only sent per request and never stored on the server.
          </p>
        </section>

        {/* Model selection */}
        <section>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Model
          </label>
          <select
            value={model || currentProvider.models[0]}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-input-border text-sm
                       focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                       transition-all appearance-none cursor-pointer"
          >
            {currentProvider.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </section>

        {/* Status */}
        <section>
          <div
            className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
              isConfigured()
                ? "bg-accent-muted text-accent"
                : "bg-danger/10 text-danger/80"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConfigured() ? "bg-accent" : "bg-danger"
              }`}
            />
            {isConfigured()
              ? `Ready — ${currentProvider.label}`
              : "Enter an API key to start"}
          </div>
        </section>

        {/* Info card */}
        <section className="bg-card-border/20 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-accent mb-1.5">EOP Agent Capabilities</h3>
          <ul className="text-xs text-muted/80 space-y-1">
            <li>Explain EOP/ECF concepts and handle objections</li>
            <li>Annotate artifacts in the evidence chain</li>
            <li>Link artifacts to scientific claims</li>
            <li>Classify repo files by ECF artifact types</li>
            <li>Advise on disclosure scope based on claim strength</li>
            <li>Suggest ECF-compliant directory structures</li>
          </ul>
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-card-border space-y-2">
        <button
          onClick={clearMessages}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium
                     bg-card-border/30 hover:bg-card-border/50 transition-colors text-muted"
        >
          Clear Conversation
        </button>
        <p className="text-center text-xs text-muted/40">
          NVIDIA Research &middot; EOP/ECF
        </p>
      </div>
    </aside>
  );
}
