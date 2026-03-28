export interface ProjectSpec {
  prompt: string;
  preferences: Record<string, string>;
}

export interface Endpoint {
  method: string;
  path: string;
  request: Record<string, string>;
  response: Record<string, string>;
}

export interface ArchNode extends Record<string, unknown> {
  id: string;
  label: string;
  type: "api" | "worker" | "database" | "frontend" | "gateway";
  description: string;
  port: number | null;
  status: "idle" | "building" | "built" | "running" | "error";
  endpoints?: Endpoint[];
  dependencies?: string[];
  envVars?: string[];
}

export interface ArchEdge extends Record<string, unknown> {
  id: string;
  source: string;
  target: string;
  label: string;
  contract: {
    method: string;
    path: string;
    request: Record<string, string>;
    response: Record<string, string>;
  };
}

export interface Architecture {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export type ProjectStatus =
  | "specifying"
  | "diagramming"
  | "building"
  | "built"
  | "error";

export interface Project {
  id: string;
  name: string;
  spec: ProjectSpec | null;
  architecture: Architecture | null;
  status: ProjectStatus;
  buildLog: string;
  outputDir: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  options?: string[];
}

export type BuildEvent =
  | { type: "log"; text: string }
  | { type: "tool_use"; tool: string; input: string }
  | { type: "service_status"; serviceId: string; status: ArchNode["status"] }
  | { type: "complete"; success: boolean; error?: string }
  | { type: "progress"; text: string };
