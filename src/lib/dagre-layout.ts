import dagre from "@dagrejs/dagre";
import { ArchNode, ArchEdge } from "./types";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;

export function getLayoutedElements(
  nodes: ArchNode[],
  edges: ArchEdge[],
  direction: "TB" | "LR" = "TB"
) {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      type: "serviceNode" as const,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      data: node,
    };
  });

  const layoutedEdges = edges.map((edge) => ({
    id: edge.id || `${edge.source}-to-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "serviceEdge" as const,
    data: edge,
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
