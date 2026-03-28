"use client";

import { useCallback, useEffect, useState } from "react";

function DocIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
      suppressHydrationWarning
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

interface BuildInstructionsPanelProps {
  collapsed: boolean;
}

export default function BuildInstructionsPanel({
  collapsed,
}: BuildInstructionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/settings/build-instructions");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { markdown?: string };
      setMarkdown(typeof data.markdown === "string" ? data.markdown : "");
    } catch {
      setLoadError("Could not load instructions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/build-instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!res.ok) throw new Error("save failed");
      setLoadError(null);
      setOpen(false);
    } catch {
      setLoadError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }, [markdown]);

  return (
    <>
      <div className="mt-auto shrink-0 border-t border-border">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Build instructions (markdown)"
          className={`flex w-full items-center gap-3 rounded-lg text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer ${
            collapsed ? "h-10 justify-center p-0" : "px-3 py-2.5 text-left"
          }`}
        >
          <DocIcon className="shrink-0" />
          {!collapsed && (
            <span className="min-w-0 truncate font-medium">
              Build instructions
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="build-instructions-title"
            className="flex max-h-[min(90dvh,720px)] w-full max-w-2xl flex-col border border-border bg-surface shadow-xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2
                  id="build-instructions-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Build instructions
                </h2>
                <p className="mt-0.5 text-xs text-muted leading-snug">
                  Markdown notes on frameworks, stack, and how you want apps
                  built. Included in architecture generation and in each
                  build&apos;s <code className="text-[11px]">BUILD.md</code> for
                  our coding agents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded border border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 flex flex-col gap-2 px-4 py-3">
              {loadError && (
                <p className="text-xs text-red-400">{loadError}</p>
              )}
              {loading ? (
                <p className="text-sm text-muted py-8 text-center">Loading…</p>
              ) : (
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  spellCheck={false}
                  className="min-h-[280px] flex-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  placeholder="# Your instructions…"
                  aria-label="Build instructions markdown"
                />
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => void save()}
                className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
