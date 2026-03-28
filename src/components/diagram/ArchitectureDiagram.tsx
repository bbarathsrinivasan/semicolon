"use client";

import { useCallback, useMemo } from "react";
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
import ServiceNode from "./ServiceNode";
import ServiceEdge from "./ServiceEdge";

const nodeTypes = { serviceNode: ServiceNode };
const edgeTypes = { serviceEdge: ServiceEdge };

interface ArchitectureDiagramProps {
  architecture: Architecture;
  nodeStatuses?: Record<string, ArchNode["status"]>;
  onNodeClick?: (nodeId: string) => void;
  onBuild?: () => void;
  isBuilding?: boolean;
}

export default function ArchitectureDiagram({
  architecture,
  nodeStatuses,
  onNodeClick,
  onBuild,
  isBuilding,
}: ArchitectureDiagramProps) {
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
    <div className="w-full h-full relative">
      <ReactFlow
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
          onClick={handleRelayout}
          className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors cursor-pointer"
        >
          Re-layout
        </button>
        {onBuild && (
          <button
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
    </div>
  );
}
