"use client";

import { useEffect, useRef } from "react";
import { BuildEvent } from "@/lib/types";

interface BuildLogProps {
  persistedLog: string;
  events: BuildEvent[];
  isBuilding: boolean;
  complete: { success: boolean; error?: string } | null;
}

function renderEvent(event: BuildEvent, i: number) {
  if (event.type === "log") {
    return (
      <p
        key={i}
        className="text-foreground/70 whitespace-pre-wrap leading-relaxed"
      >
        {event.text}
      </p>
    );
  }
  if (event.type === "tool_use") {
    return (
      <p key={i} className="text-accent/80">
        <span className="text-muted">[{event.tool}]</span> {event.input}
      </p>
    );
  }
  if (event.type === "service_status") {
    return (
      <p key={i} className="text-yellow-400">
        ✦ {event.serviceId}: {event.status}
      </p>
    );
  }
  if (event.type === "progress") {
    return (
      <p key={i} className="text-muted italic">
        {event.text}
      </p>
    );
  }
  if (event.type === "complete") {
    return (
      <p
        key={i}
        className={`font-semibold mt-2 ${
          event.success ? "text-green-400" : "text-red-400"
        }`}
      >
        {event.success
          ? "Build completed successfully!"
          : `Build failed: ${event.error}`}
      </p>
    );
  }
  return null;
}

export default function BuildLog({
  persistedLog,
  events,
  isBuilding,
  complete,
}: BuildLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const showHistory = persistedLog.trim().length > 0 && !isBuilding;
  const scrollKey = `${persistedLog.length}-${events.length}`;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    scrollToBottom();
    requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    });
  }, [scrollKey]);

  const headerStatus =
    complete && !isBuilding ? (
      <span
        className={`text-xs px-2 py-0.5 rounded ${
          complete.success
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
        }`}
      >
        {complete.success ? "Build complete" : "Build failed"}
      </span>
    ) : null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background border-l border-border">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-3">
        <h3 className="text-sm font-semibold">Build Log</h3>
        {headerStatus}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 font-mono text-xs space-y-1 [scrollbar-gutter:stable]"
      >
        {showHistory && (
          <div className="mb-4 space-y-2 border-b border-border pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              History (saved)
            </p>
            <pre className="whitespace-pre-wrap break-words text-foreground/60 leading-relaxed">
              {persistedLog.trim()}
            </pre>
          </div>
        )}

        {isBuilding && events.length === 0 && (
          <p className="text-muted italic">Waiting for build output…</p>
        )}

        {(isBuilding || events.length > 0) && showHistory && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
            Current session
          </p>
        )}

        {events.map((event, i) => renderEvent(event, i))}
      </div>
    </div>
  );
}
