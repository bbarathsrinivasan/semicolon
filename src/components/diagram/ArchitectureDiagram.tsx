"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Architecture, ArchNode } from "@/lib/types";
import { getLayoutedElements } from "@/lib/dagre-layout";
import SparklesIcon from "@/components/icons/SparklesIcon";
import ServiceNode from "./ServiceNode";
import ServiceEdge from "./ServiceEdge";

const nodeTypes = { serviceNode: ServiceNode };
const edgeTypes = { serviceEdge: ServiceEdge };

/** Set in `.env.local` as `NEXT_PUBLIC_DEMO_DEPLOY_URL=https://…` (client-exposed). */
const DEMO_DEPLOY_URL =
  typeof process.env.NEXT_PUBLIC_DEMO_DEPLOY_URL === "string"
    ? process.env.NEXT_PUBLIC_DEMO_DEPLOY_URL.trim()
    : "";

interface ArchitectureDiagramProps {
  architecture: Architecture;
  /** When set (demo project), Deploy opens a success banner with this URL instead of only a new tab. */
  demoDeployUrl?: string;
  nodeStatuses?: Record<string, ArchNode["status"]>;
  onNodeClick?: (nodeId: string) => void;
  onBuild?: () => void;
  isBuilding?: boolean;
  onEditArchitecture?: () => void | Promise<void>;
  editArchitectureDisabled?: boolean;
}

export default function ArchitectureDiagram({
  architecture,
  demoDeployUrl,
  nodeStatuses,
  onNodeClick,
  onBuild,
  isBuilding,
  onEditArchitecture,
  editArchitectureDisabled,
}: ArchitectureDiagramProps) {
  const [deployBannerOpen, setDeployBannerOpen] = useState(false);

  const demoUrl = demoDeployUrl?.trim() ?? "";
  const resolvedDeployUrl = demoUrl || DEMO_DEPLOY_URL;
  const deployUsesDemoBanner = Boolean(demoUrl);

  useEffect(() => {
    if (!demoUrl) setDeployBannerOpen(false);
  }, [demoUrl]);

  const handleDeployClick = useCallback(() => {
    if (!resolvedDeployUrl) return;
    if (deployUsesDemoBanner) {
      setDeployBannerOpen(true);
      return;
    }
    window.open(resolvedDeployUrl, "_blank", "noopener,noreferrer");
  }, [resolvedDeployUrl, deployUsesDemoBanner]);
  // Merge live statuses into architecture nodes
  const mergedNodes = useMemo(() => {
    if (!nodeStatuses) return architecture.nodes;
    return architecture.nodes.map((n) => ({
      ...n,
      status: nodeStatuses[n.id] || n.status,
    }));
  }, [architecture.nodes, nodeStatuses]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(mergedNodes, architecture.edges),
    [mergedNodes, architecture.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const handleRelayout = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
      mergedNodes,
      architecture.edges
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [mergedNodes, architecture.edges, setNodes, setEdges]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e1e1e" gap={20} />
        <Controls
          showInteractive={false}
          className="!bg-surface !border-border !rounded-lg [&>button]:!bg-surface [&>button]:!border-border [&>button]:!fill-foreground [&>button:hover]:!bg-surface-hover"
        />
      </ReactFlow>

      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          type="button"
          onClick={handleRelayout}
          className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors cursor-pointer"
        >
          Re-layout
        </button>
        <button
          type="button"
          disabled={!resolvedDeployUrl}
          onClick={handleDeployClick}
          title={
            resolvedDeployUrl
              ? resolvedDeployUrl
              : "Set NEXT_PUBLIC_DEMO_DEPLOY_URL in .env.local, then restart the dev server."
          }
          className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm transition-colors hover:bg-surface-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface"
        >
          Deploy
        </button>
        {onEditArchitecture && (
          <button
            type="button"
            onClick={() => void onEditArchitecture?.()}
            disabled={editArchitectureDisabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4 shrink-0 opacity-95" />
            Edit architecture
          </button>
        )}
        {onBuild && (
          <button
            type="button"
            onClick={onBuild}
            disabled={isBuilding}
            className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {isBuilding ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Building...
              </span>
            ) : (
              "Build Project"
            )}
          </button>
        )}
      </div>

      {deployBannerOpen && demoUrl ? (
        <div
          className="absolute top-14 right-4 z-10 flex max-w-md items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/90 px-3 py-2.5 shadow-lg backdrop-blur-sm"
          role="status"
        >
          <span className="mt-0.5 shrink-0 text-emerald-400" aria-hidden>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7" />
              <path d="M17 7H9M17 7v8" />
            </svg>
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-emerald-100">Deployed successfully</p>
            <p className="mt-1 text-emerald-200/90">
              Deployed to{" "}
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-300 underline decoration-emerald-500/60 underline-offset-2 hover:text-white"
              >
                {demoUrl.replace(/^https:\/\//, "")}
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path d="M7 17 17 7M7 7h10v10" />
                </svg>
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeployBannerOpen(false)}
            className="shrink-0 rounded p-0.5 text-emerald-300/80 hover:bg-emerald-500/20 hover:text-emerald-100"
            aria-label="Dismiss"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
