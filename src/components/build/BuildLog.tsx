"use client";

import { useEffect, useRef } from "react";
import { BuildEvent } from "@/lib/types";

interface BuildLogProps {
  events: BuildEvent[];
  complete: { success: boolean; error?: string } | null;
}

export default function BuildLog({ events, complete }: BuildLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Build Log</h3>
        {complete && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              complete.success
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {complete.success ? "Build complete" : "Build failed"}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
        {events.map((event, i) => {
          if (event.type === "log") {
            return (
              <p key={i} className="text-foreground/70 whitespace-pre-wrap leading-relaxed">
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
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
