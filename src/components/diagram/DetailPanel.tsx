"use client";

import { ArchNode, ArchEdge } from "@/lib/types";

interface DetailPanelProps {
  node: ArchNode;
  edges: ArchEdge[];
  onClose: () => void;
  onUpdateNode: (updated: ArchNode) => void;
}

const TYPE_BADGES: Record<ArchNode["type"], string> = {
  api: "bg-blue-500/20 text-blue-400",
  worker: "bg-purple-500/20 text-purple-400",
  database: "bg-green-500/20 text-green-400",
  frontend: "bg-orange-500/20 text-orange-400",
  gateway: "bg-gray-500/20 text-gray-400",
};

export default function DetailPanel({
  node,
  edges,
  onClose,
  onUpdateNode,
}: DetailPanelProps) {
  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  return (
    <div className="w-[420px] h-full bg-surface border-l border-border overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{node.label}</h2>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono ${TYPE_BADGES[node.type]}`}
          >
            {node.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground transition-colors cursor-pointer text-lg"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Description */}
        <section>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1">
            Description
          </label>
          <textarea
            value={node.description}
            onChange={(e) =>
              onUpdateNode({ ...node, description: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none h-20 focus:outline-none focus:border-accent"
          />
        </section>

        {/* Endpoints */}
        {node.endpoints && node.endpoints.length > 0 && (
          <section>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">
              Endpoints ({node.endpoints.length})
            </label>
            <div className="space-y-2">
              {node.endpoints.map((ep, i) => (
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
        {node.dependencies && node.dependencies.length > 0 && (
          <section>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">
              Dependencies
            </label>
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
          </section>
        )}

        {/* Environment Variables */}
        {node.envVars && node.envVars.length > 0 && (
          <section>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">
              Environment Variables
            </label>
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
          </section>
        )}
      </div>
    </div>
  );
}
