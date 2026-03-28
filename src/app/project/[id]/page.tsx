"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Project, ArchNode, Architecture } from "@/lib/types";
import ArchitectureDiagram from "@/components/diagram/ArchitectureDiagram";
import DetailPanel from "@/components/diagram/DetailPanel";
import BuildLog from "@/components/build/BuildLog";
import { useBuild } from "@/hooks/useBuild";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showBuildLog, setShowBuildLog] = useState(false);

  const { events, isBuilding, nodeStatuses, complete, startBuild } =
    useBuild(projectId);

  // Fetch project
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          router.push("/new");
          return;
        }
        const data = await res.json();
        setProject(data.project);
      } catch {
        router.push("/new");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, router]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleUpdateNode = useCallback(
    async (updated: ArchNode) => {
      if (!project?.architecture) return;
      const newArch: Architecture = {
        ...project.architecture,
        nodes: project.architecture.nodes.map((n) =>
          n.id === updated.id ? updated : n
        ),
      };
      setProject((prev) => prev ? { ...prev, architecture: newArch } : prev);

      // Persist to DB
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architecture: newArch }),
      });
    },
    [project, projectId]
  );

  const handleBuild = useCallback(async () => {
    setShowBuildLog(true);
    await startBuild();
  }, [startBuild]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted">
          <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          Loading project...
        </div>
      </div>
    );
  }

  if (!project || !project.architecture) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted">Architecture not ready yet.</p>
          <button
            onClick={() => router.push("/new")}
            className="px-4 py-2 bg-accent text-white rounded-lg cursor-pointer"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const selectedNode = selectedNodeId
    ? project.architecture.nodes.find((n) => n.id === selectedNodeId) || null
    : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex items-center px-4 border-b border-border gap-4 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="text-muted hover:text-foreground transition-colors text-sm cursor-pointer"
        >
          ← Semicolon
        </button>
        <span className="text-muted">|</span>
        <h1 className="text-sm font-medium truncate max-w-xs">{project.name}</h1>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded ${
            project.status === "built"
              ? "bg-green-500/20 text-green-400"
              : project.status === "building"
              ? "bg-yellow-500/20 text-yellow-400"
              : project.status === "error"
              ? "bg-red-500/20 text-red-400"
              : "bg-surface text-muted"
          }`}
        >
          {project.status}
        </span>
        <button
          onClick={() => setShowBuildLog((v) => !v)}
          className={`text-xs px-2 py-0.5 rounded border cursor-pointer transition-colors ${
            showBuildLog
              ? "border-accent text-accent"
              : "border-border text-muted hover:border-accent hover:text-accent"
          }`}
        >
          Build Log
        </button>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagram */}
        <div className="flex-1 overflow-hidden">
          <ArchitectureDiagram
            architecture={project.architecture}
            nodeStatuses={nodeStatuses}
            onNodeClick={handleNodeClick}
            onBuild={handleBuild}
            isBuilding={isBuilding}
          />
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            edges={project.architecture.edges}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={handleUpdateNode}
          />
        )}

        {/* Build log panel */}
        {showBuildLog && (
          <div className="w-96 overflow-hidden">
            <BuildLog events={events} complete={complete} />
          </div>
        )}
      </div>
    </div>
  );
}
