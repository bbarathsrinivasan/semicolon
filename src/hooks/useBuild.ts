"use client";

import { useState, useCallback, useRef } from "react";
import { BuildEvent, ArchNode } from "@/lib/types";

export function useBuild(projectId: string) {
  const [events, setEvents] = useState<BuildEvent[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState<
    Record<string, ArchNode["status"]>
  >({});
  const [complete, setComplete] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const clearLiveEvents = useCallback(() => {
    setEvents([]);
    setNodeStatuses({});
  }, []);

  const abortBuild = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startBuild = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setIsBuilding(true);
    setEvents([]);
    setComplete(null);

    try {
      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
        signal: ac.signal,
      });

      if (!response.ok) {
        throw new Error(`Build failed: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            try {
              const event = JSON.parse(part.slice(6)) as BuildEvent;
              setEvents((prev) => [...prev, event]);

              if (event.type === "service_status") {
                setNodeStatuses((prev) => ({
                  ...prev,
                  [event.serviceId]: event.status,
                }));
              }

              if (event.type === "complete") {
                setComplete({ success: event.success, error: event.error });
                setIsBuilding(false);
              }
            } catch {
              // skip malformed SSE events
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setIsBuilding(false);
        return;
      }
      setEvents((prev) => [
        ...prev,
        {
          type: "complete",
          success: false,
          error: String(err),
        },
      ]);
      setComplete({ success: false, error: String(err) });
      setIsBuilding(false);
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
    }
  }, [projectId]);

  return {
    events,
    isBuilding,
    nodeStatuses,
    complete,
    startBuild,
    abortBuild,
    clearLiveEvents,
  };
}
