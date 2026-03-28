"use client";

import { Handle, Position } from "@xyflow/react";
import { ArchNode } from "@/lib/types";

const TYPE_COLORS: Record<ArchNode["type"], string> = {
  api: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  worker: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  database: "bg-green-500/20 text-green-400 border-green-500/30",
  frontend: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  gateway: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_COLORS: Record<ArchNode["status"], string> = {
  idle: "bg-gray-500",
  building: "bg-yellow-500 animate-pulse",
  built: "bg-blue-500",
  running: "bg-green-500",
  error: "bg-red-500",
};

interface ServiceNodeProps {
  data: ArchNode;
  selected: boolean;
}

export default function ServiceNode({ data, selected }: ServiceNodeProps) {
  const endpointCount = data.endpoints?.length || 0;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border !border-none !w-2 !h-2"
      />

      <div
        className={`bg-surface border rounded-lg p-4 w-[280px] transition-all ${
          selected ? "border-accent shadow-lg shadow-accent/10" : "border-border"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[data.status]}`} />
            <h3 className="font-semibold text-sm truncate">{data.label}</h3>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 uppercase font-mono ${TYPE_COLORS[data.type]}`}
          >
            {data.type}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted line-clamp-2 mb-2">{data.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>
            {endpointCount} endpoint{endpointCount !== 1 ? "s" : ""}
          </span>
          {data.port && (
            <span className="text-green-400 font-mono">:{data.port}</span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border !border-none !w-2 !h-2"
      />
    </>
  );
}
