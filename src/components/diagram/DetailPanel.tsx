"use client";

import { useCallback, useEffect, useState } from "react";
import { ArchNode, ArchEdge, Endpoint } from "@/lib/types";
import SparklesIcon from "@/components/icons/SparklesIcon";

interface DetailPanelProps {
  node: ArchNode;
  edges: ArchEdge[];
  onClose: () => void;
  onUpdateNode: (updated: ArchNode) => void;
  /** Opens the architecture AI panel with context for this node. */
  onEditWithAI?: (node: ArchNode) => void;
}

const TYPE_BADGES: Record<ArchNode["type"], string> = {
  api: "bg-blue-500/20 text-blue-400",
  worker: "bg-purple-500/20 text-purple-400",
  database: "bg-green-500/20 text-green-400",
  frontend: "bg-orange-500/20 text-orange-400",
  gateway: "bg-gray-500/20 text-gray-400",
};

const SERVICE_STAGE: Record<
  ArchNode["status"],
  { label: string; description: string; badge: string }
> = {
  idle: {
    label: "Pending",
    description:
      "This service has not been generated yet. Run Build project to create it.",
    badge: "bg-surface text-muted border border-border",
  },
  building: {
    label: "Building",
    description: "Code generation is in progress for this service.",
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  },
  built: {
    label: "Built",
    description:
      "Source and artifacts were generated. Start the service locally when you are ready.",
    badge: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
  running: {
    label: "Deployed / running",
    description:
      "Marked as running when the process is up (e.g. after npm start in the build output).",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  error: {
    label: "Error",
    description: "Build or runtime failed for this service. Check the build log.",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
};

function splitList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function DetailPanel({
  node,
  edges,
  onClose,
  onUpdateNode,
  onEditWithAI,
}: DetailPanelProps) {
  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const stage = SERVICE_STAGE[node.status] ?? SERVICE_STAGE.idle;

  const [editingService, setEditingService] = useState(false);
  const [draft, setDraft] = useState<ArchNode>(node);
  const [endpointJson, setEndpointJson] = useState<
    { request: string; response: string }[]
  >([]);
  const [depsDraft, setDepsDraft] = useState("");
  const [envDraft, setEnvDraft] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingService) {
      setDraft(node);
    }
  }, [node, editingService]);

  const startEdit = useCallback(() => {
    setSaveError(null);
    setDraft({ ...node });
    setEndpointJson(
      (node.endpoints ?? []).map((ep) => ({
        request: JSON.stringify(ep.request ?? {}, null, 2),
        response: JSON.stringify(ep.response ?? {}, null, 2),
      }))
    );
    setDepsDraft((node.dependencies ?? []).join("\n"));
    setEnvDraft((node.envVars ?? []).join("\n"));
    setEditingService(true);
  }, [node]);

  const cancelEdit = useCallback(() => {
    setSaveError(null);
    setDraft(node);
    setEditingService(false);
  }, [node]);

  const handleSaveService = useCallback(() => {
    setSaveError(null);
    const dependencies = splitList(depsDraft);
    const envVars = splitList(envDraft);

    if (node.type === "database") {
      onUpdateNode({
        ...draft,
        dependencies,
        envVars,
      });
      setEditingService(false);
      return;
    }

    const eps = draft.endpoints ?? [];
    if (endpointJson.length !== eps.length) {
      setSaveError("Endpoint form state is out of sync. Cancel and try again.");
      return;
    }

    try {
      const parsedEndpoints: Endpoint[] = eps.map((ep, i) => {
        let request: Record<string, string>;
        let response: Record<string, string>;
        try {
          request = JSON.parse(endpointJson[i]?.request || "{}") as Record<
            string,
            string
          >;
        } catch {
          throw new Error(`Endpoint ${i + 1}: request is not valid JSON`);
        }
        try {
          response = JSON.parse(endpointJson[i]?.response || "{}") as Record<
            string,
            string
          >;
        } catch {
          throw new Error(`Endpoint ${i + 1}: response is not valid JSON`);
        }
        return {
          method: ep.method.trim() || "GET",
          path: ep.path.trim() || "/",
          request,
          response,
        };
      });

      onUpdateNode({
        ...draft,
        endpoints: parsedEndpoints,
        dependencies,
        envVars,
      });
      setEditingService(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save");
    }
  }, [depsDraft, draft, endpointJson, envDraft, node.type, onUpdateNode]);

  const addEndpoint = useCallback(() => {
    setDraft((d) => ({
      ...d,
      endpoints: [
        ...(d.endpoints ?? []),
        { method: "GET", path: "/", request: {}, response: {} },
      ],
    }));
    setEndpointJson((j) => [...j, { request: "{}", response: "{}" }]);
  }, []);

  const removeEndpoint = useCallback((index: number) => {
    setDraft((d) => ({
      ...d,
      endpoints: d.endpoints?.filter((_, i) => i !== index),
    }));
    setEndpointJson((j) => j.filter((_, i) => i !== index));
  }, []);

  const updateEndpointField = useCallback(
    (index: number, field: keyof Endpoint, value: string) => {
      setDraft((d) => {
        const list = [...(d.endpoints ?? [])];
        if (!list[index]) return d;
        list[index] = { ...list[index], [field]: value };
        return { ...d, endpoints: list };
      });
    },
    []
  );

  const updateEndpointJson = useCallback(
    (index: number, part: "request" | "response", value: string) => {
      setEndpointJson((j) => {
        const next = [...j];
        if (!next[index]) return j;
        next[index] = { ...next[index], [part]: value };
        return next;
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    if (editingService) {
      cancelEdit();
    }
    onClose();
  }, [editingService, cancelEdit, onClose]);

  const display = editingService ? draft : node;
  const showEndpointsEditor =
    editingService && node.type !== "database";
  const showEndpointsRead =
    !editingService &&
    node.endpoints &&
    node.endpoints.length > 0 &&
    node.type !== "database";

  return (
    <div
      className="absolute inset-0 z-20 flex min-h-0 min-w-0 flex-col bg-surface/98 backdrop-blur-md border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-panel-title"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-surface p-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {editingService ? (
              <input
                id="detail-panel-title"
                type="text"
                value={draft.label}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, label: e.target.value }))
                }
                className="w-full max-w-md bg-background border border-border rounded-md px-2 py-1 text-lg font-semibold focus:outline-none focus:border-accent"
              />
            ) : (
              <h2
                id="detail-panel-title"
                className="font-semibold text-lg truncate"
              >
                {node.label}
              </h2>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono shrink-0 ${TYPE_BADGES[node.type]}`}
            >
              {node.type}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
              Deployment stage
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md ${stage.badge}`}
              >
                {stage.label}
              </span>
              <span className="text-[11px] text-muted leading-snug max-w-xl">
                {stage.description}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {editingService ? (
            <>
              <button
                type="button"
                onClick={handleSaveService}
                className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Edit service
              </button>
              {onEditWithAI && (
                <button
                  type="button"
                  onClick={() => onEditWithAI(node)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  <SparklesIcon className="h-4 w-4 shrink-0 opacity-95" />
                  Refine with AI
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {saveError && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {saveError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-6">
        {/* Description */}
        <section>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1">
            Description
          </label>
          <textarea
            value={display.description}
            onChange={(e) => {
              const v = e.target.value;
              if (editingService) {
                setDraft((d) => ({ ...d, description: v }));
              } else {
                onUpdateNode({ ...node, description: v });
              }
            }}
            disabled={false}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none min-h-[5rem] focus:outline-none focus:border-accent"
          />
        </section>

        {/* Endpoints — read */}
        {showEndpointsRead && (
          <section>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">
              Endpoints ({node.endpoints!.length})
            </label>
            <div className="space-y-2">
              {node.endpoints!.map((ep, i) => (
                <div
                  key={i}
                  className="bg-background border border-border rounded-md p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                      {ep.method}
                    </span>
                    <span className="text-sm font-mono">{ep.path}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted">Request:</span>
                      <pre className="mt-1 text-foreground/70 font-mono whitespace-pre-wrap">
                        {JSON.stringify(ep.request, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-muted">Response:</span>
                      <pre className="mt-1 text-foreground/70 font-mono whitespace-pre-wrap">
                        {JSON.stringify(ep.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!editingService &&
          node.type !== "database" &&
          (!node.endpoints || node.endpoints.length === 0) && (
            <p className="text-sm text-muted">
              No endpoints yet. Use{" "}
              <span className="text-foreground font-medium">Edit service</span>{" "}
              to add some.
            </p>
          )}

        {/* Endpoints — edit */}
        {showEndpointsEditor && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs text-muted uppercase tracking-wide">
                Endpoints ({draft.endpoints?.length ?? 0})
              </label>
              <button
                type="button"
                onClick={addEndpoint}
                className="text-xs px-2 py-1 rounded border border-border text-muted hover:border-accent hover:text-accent cursor-pointer"
              >
                + Add endpoint
              </button>
            </div>
            <div className="space-y-4">
              {(draft.endpoints ?? []).map((ep, i) => (
                <div
                  key={i}
                  className="bg-background border border-border rounded-md p-3 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={ep.method}
                      onChange={(e) =>
                        updateEndpointField(i, "method", e.target.value)
                      }
                      placeholder="GET"
                      className="w-20 px-2 py-1 text-xs font-mono bg-surface border border-border rounded uppercase"
                    />
                    <input
                      type="text"
                      value={ep.path}
                      onChange={(e) =>
                        updateEndpointField(i, "path", e.target.value)
                      }
                      placeholder="/path"
                      className="flex-1 min-w-[8rem] px-2 py-1 text-sm font-mono bg-surface border border-border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeEndpoint(i)}
                      className="text-xs text-red-400 hover:text-red-300 cursor-pointer px-2"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted uppercase">
                        Request JSON
                      </span>
                      <textarea
                        value={endpointJson[i]?.request ?? "{}"}
                        onChange={(e) =>
                          updateEndpointJson(i, "request", e.target.value)
                        }
                        rows={5}
                        className="mt-1 w-full px-2 py-1.5 text-[11px] font-mono bg-surface border border-border rounded-md focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted uppercase">
                        Response JSON
                      </span>
                      <textarea
                        value={endpointJson[i]?.response ?? "{}"}
                        onChange={(e) =>
                          updateEndpointJson(i, "response", e.target.value)
                        }
                        rows={5}
                        className="mt-1 w-full px-2 py-1.5 text-[11px] font-mono bg-surface border border-border rounded-md focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {editingService && node.type === "database" && (
          <p className="text-sm text-muted">
            Database nodes don&apos;t use HTTP endpoints. You can still update
            dependencies and environment variables below.
          </p>
        )}

        {/* Connected Services */}
        {connectedEdges.length > 0 && (
          <section>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">
              Connected Services ({connectedEdges.length})
            </label>
            <div className="space-y-2">
              {connectedEdges.map((edge) => {
                const isOutgoing = edge.source === node.id;
                return (
                  <div
                    key={edge.id}
                    className="bg-background border border-border rounded-md p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted">
                        {isOutgoing ? "to" : "from"}
                      </span>
                      <span className="font-medium">
                        {isOutgoing ? edge.target : edge.source}
                      </span>
                      <span className="text-[10px] font-mono text-accent">
                        {edge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dependencies */}
        <section>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1">
            Dependencies
          </label>
          {editingService ? (
            <textarea
              value={depsDraft}
              onChange={(e) => setDepsDraft(e.target.value)}
              placeholder="One per line or comma-separated (e.g. express, zod)"
              rows={4}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:border-accent"
            />
          ) : node.dependencies && node.dependencies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {node.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="text-[11px] px-2 py-0.5 bg-background border border-border rounded-md font-mono"
                >
                  {dep}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">None listed.</p>
          )}
        </section>

        {/* Environment Variables */}
        <section>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1">
            Environment Variables
          </label>
          {editingService ? (
            <textarea
              value={envDraft}
              onChange={(e) => setEnvDraft(e.target.value)}
              placeholder="One per line or comma-separated (e.g. DATABASE_URL)"
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:border-accent"
            />
          ) : node.envVars && node.envVars.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {node.envVars.map((v) => (
                <span
                  key={v}
                  className="text-[11px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md font-mono"
                >
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">None listed.</p>
          )}
        </section>
      </div>
    </div>
  );
}
