"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-card-border bg-card/50 backdrop-blur-sm">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-card-border/50 transition-colors"
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h1 className="text-sm font-semibold tracking-wide">
              EOP Agent
            </h1>
          </div>
          <span className="text-xs text-muted hidden sm:block">
            Evidence-Oriented Programming Assistant
          </span>
        </header>

        <ChatPanel />
      </main>
    </div>
  );
}
