"use client";

import { useState } from "react";
import type { ToolResult } from "@/lib/types";

interface ToolResultCardProps {
  result: ToolResult;
}

const TOOL_LABELS: Record<string, string> = {
  annotate_artifact: "Annotate Artifact",
  link_to_claim: "Link to Claim",
  classify_repo_artifacts: "Classify Repo Artifacts",
  advise_disclosure_scope: "Advise Disclosure Scope",
  suggest_directory_structure: "Suggest Directory Structure",
};

export default function ToolResultCard({ result }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  const label = TOOL_LABELS[result.toolName] || result.toolName;

  return (
    <div className="border border-accent/20 rounded-lg bg-accent-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-accent-muted/50 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="font-medium">{label}</span>
        <span className="text-accent/50 ml-auto">
          {expanded ? "collapse" : "expand"}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5 text-xs">
          <div className="text-muted/60">
            <span className="font-medium text-muted">Args: </span>
            <code className="text-accent/70">
              {JSON.stringify(result.arguments, null, 2)}
            </code>
          </div>
          <div className="text-foreground/70 whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-input-bg rounded p-2">
            {result.result}
          </div>
        </div>
      )}
    </div>
  );
}
