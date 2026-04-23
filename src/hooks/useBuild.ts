"use client";

import { useState, useCallback, useRef } from "react";
import { BuildEvent, ArchNode } from "@/lib/types";
import type { BuildProviderId } from "@/lib/build-providers/types";

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

  const startBuild = useCallback(async (buildProvider?: BuildProviderId) => {
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
        body: JSON.stringify({
          projectId,
          ...(buildProvider !== undefined ? { buildProvider } : {}),
        }),
        signal: ac.signal,
      });

      if (!response.ok) {
        let msg = `Build failed (${response.status} ${response.statusText})`;
        try {
          const j = (await response.json()) as {
            error?: string;
            auth?: { message?: string; loginSteps?: string[] };
          };
          if (j.error) msg = j.error;
          if (j.auth?.message) {
            msg = `${msg}\n${j.auth.message}`;
            if (j.auth.loginSteps?.length) {
              msg = `${msg}\n${j.auth.loginSteps.join("\n")}`;
            }
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawComplete = false;

      const processSseBlock = (raw: string) => {
        const part = raw.replace(/\r\n/g, "\n").trim();
        if (!part.startsWith("data:")) return;
        const payload = part.startsWith("data: ")
          ? part.slice(6).trim()
          : part.slice(5).trim();
        if (!payload) return;
        try {
          const event = JSON.parse(payload) as BuildEvent;
          setEvents((prev) => [...prev, event]);

          if (event.type === "service_status") {
            setNodeStatuses((prev) => ({
              ...prev,
              [event.serviceId]: event.status,
            }));
          }

          if (event.type === "complete") {
            sawComplete = true;
            setComplete({ success: event.success, error: event.error });
            setIsBuilding(false);
          }
        } catch {
          /* skip malformed SSE */
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const normalized = buffer.replace(/\r\n/g, "\n");
        const blocks = normalized.split(/\n\n/);
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          processSseBlock(block);
        }
      }

      const tail = buffer.replace(/\r\n/g, "\n").trim();
      if (tail) {
        for (const block of tail.split(/\n\n/)) {
          processSseBlock(block);
        }
      }

      if (!sawComplete) {
        setEvents((prev) => [
          ...prev,
          {
            type: "complete",
            success: false,
            error:
              "Build stream ended before completion (connection closed or server error). Check the terminal running `npm run dev`.",
          },
        ]);
        setComplete({
          success: false,
          error:
            "Build stream ended before completion (connection closed or server error).",
        });
        setIsBuilding(false);
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
