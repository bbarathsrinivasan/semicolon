"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ARCHITECTURE_CHAT_INTRO,
  type Architecture,
  type ArchitectureChatTurn,
} from "@/lib/types";

export type ArchitectureChatSyncPayload = {
  architecture?: Architecture;
  architectureChat: ArchitectureChatTurn[];
};

interface EditArchitectureChatProps {
  projectId: string;
  initialMessages: ArchitectureChatTurn[] | null;
  /** When set, replaces the compose box once (e.g. opening from Refine with AI on a node). */
  inputPrefill: string | null;
  onInputPrefillConsumed?: () => void;
  onClose: () => void;
  onSynced: (payload: ArchitectureChatSyncPayload) => void;
}

function seedMessages(saved: ArchitectureChatTurn[] | null): ArchitectureChatTurn[] {
  if (saved && saved.length > 0) {
    return saved;
  }
  return [DEFAULT_ARCHITECTURE_CHAT_INTRO];
}

export default function EditArchitectureChat({
  projectId,
  initialMessages,
  inputPrefill,
  onInputPrefillConsumed,
  onClose,
  onSynced,
}: EditArchitectureChatProps) {
  const [messages, setMessages] = useState<ArchitectureChatTurn[]>(() =>
    seedMessages(initialMessages)
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inputPrefill) return;
    setInput(inputPrefill);
    const t = window.setTimeout(() => {
      onInputPrefillConsumed?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [inputPrefill, onInputPrefillConsumed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ArchitectureChatTurn[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/architecture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      let data: {
        error?: string;
        messages?: ArchitectureChatTurn[];
        architecture?: Architecture;
      } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as typeof data;
      } catch {
        /* ignore */
      }

      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        onSynced({
          ...(data.architecture !== undefined
            ? { architecture: data.architecture }
            : {}),
          architectureChat: data.messages,
        });
      }

      if (!res.ok && !data.messages?.length) {
        throw new Error(data.error || "Request failed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      const fallback: ArchitectureChatTurn[] = [
        ...nextMessages,
        {
          role: "assistant",
          content: `Could not apply that change: ${msg}`,
        },
      ];
      setMessages(fallback);
      onSynced({ architectureChat: fallback });
      void fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architectureChat: fallback }),
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, onSynced, projectId]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-border bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-3">
        <h3 className="text-sm font-semibold">Edit architecture</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer"
        >
          Close
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 flex-1 basis-0 space-y-3 overflow-y-auto overscroll-y-contain p-3 text-sm"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-4 rounded-lg bg-surface px-3 py-2 text-foreground"
                : "mr-4 rounded-lg border border-border px-3 py-2 text-foreground/90"
            }
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
              {m.role === "user" ? "You" : "Assistant"}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
        {loading && (
          <p className="text-muted text-xs italic flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            Updating architecture…
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="e.g. Add a Redis cache between the API and the database…"
          disabled={loading}
          rows={3}
          className="mb-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Send
        </button>
      </div>
    </div>
  );
}
