"use client";

import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  if (!message.content) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-black rounded-br-md"
            : isAssistant
              ? "bg-card border border-card-border rounded-bl-md"
              : "bg-card-border/30 text-muted text-xs rounded-bl-md"
        }`}
      >
        {isAssistant ? (
          <div className="chat-markdown">
            <SimpleMarkdown text={message.content} />
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </div>
  );
}

/** Very lightweight markdown renderer for chat messages. */
function SimpleMarkdown({ text }: { text: string }) {
  // Split into lines and process
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${codeKey++}`} className="my-2">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{processInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{processInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i}>{processInline(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc">
          {processInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const rest = line.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={i} className="ml-4 list-decimal">
          {processInline(rest)}
        </li>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i}>{processInline(line.slice(2))}</blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i}>{processInline(line)}</p>);
    }
  }

  // Close any unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key={`code-${codeKey}`}>
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <>{elements}</>;
}

function processInline(text: string): React.ReactNode {
  // Process bold, inline code, and italic
  const parts: React.ReactNode[] = [];
  // Simple regex-based split: **bold**, `code`, *italic*
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(<code key={match.index}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
