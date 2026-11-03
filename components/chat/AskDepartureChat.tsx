"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  ExternalLink,
  GitBranch,
  BookOpen,
  Loader2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, Button, Textarea, Badge, ScrollArea } from "@/components/ui";
import { cn, formatRelativeTime, generateId } from "@/lib/utils";
import type { ChatMessage, HandoverDossier } from "@/types";

const SUGGESTED_QUESTIONS = [
  "Where are the staging deployment keys stored?",
  "Who approved the last schema migration?",
  "What is the Vault token renewal procedure?",
  "What services does this person own?",
  "Are there any critical security risks I should know about?",
  "What are the unmerged branches I should be aware of?",
];

function SourceChip({
  source,
}: {
  source: NonNullable<ChatMessage["sources"]>[0];
}) {
  const icons: Record<string, React.ReactElement> = {
    github: <GitBranch size={10} />,
    slack: <MessageSquare size={10} />,
    meeting: <MessageSquare size={10} />,
    doc: <BookOpen size={10} />,
    jira: <BookOpen size={10} />,
    gitlab: <GitBranch size={10} />,
  };

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
    >
      {icons[source.type]}
      <span className="max-w-[120px] truncate">{source.title}</span>
      <ExternalLink size={8} />
    </a>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-zinc-900" : "bg-gradient-to-br from-violet-500 to-blue-500"
        )}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "rounded-tr-none bg-zinc-900 text-white"
            : "rounded-tl-none bg-zinc-100 text-zinc-900"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.sources.map((s, i) => (
              <SourceChip key={i} source={s} />
            ))}
          </div>
        )}

        <p
          className={cn(
            "mt-1.5 text-[10px]",
            isUser ? "text-zinc-400" : "text-zinc-400"
          )}
        >
          {formatRelativeTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
        <Bot size={14} className="text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-none bg-zinc-100 px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AskDepartureChat({ dossier }: { dossier: HandoverDossier }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm Continuum â€” your AI guide to ${dossier.departingEmployee.name}'s work and context.\n\nI've indexed their commits, Slack threads, meeting transcripts, and documentation. Ask me anything about their systems, workflows, or handover items.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previousInteractionId, setPreviousInteractionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossierId: dossier.id,
          message: text,
          previousInteractionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Chat request failed. Please try again.");
      }

      if (data.interactionId) {
        setPreviousInteractionId(data.interactionId);
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: data.content ?? "I couldn't generate a response.",
        timestamp: new Date().toISOString(),
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const reset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi! I'm Continuum â€” your AI guide to ${dossier.departingEmployee.name}'s work and context. Ask me anything!`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setPreviousInteractionId(undefined);
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="border-b border-zinc-100">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles size={14} className="text-white" />
          </div>
          Ask-The-Departure Bot
          <Badge variant="secondary" className="ml-1 text-[10px]">
            Powered by Gemini
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={reset}
            title="Reset conversation"
          >
            <RotateCcw size={13} />
          </Button>
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <p className="text-[11px] text-zinc-400 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-zinc-100 p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about deployment keys, ownership, workflowsâ€¦"
            className="flex-1 min-h-[60px] max-h-[120px] text-sm resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400">
          Press Enter to send Â· Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
