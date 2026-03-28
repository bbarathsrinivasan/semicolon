"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Project,
  ArchNode,
  Architecture,
  ArchitectureChatTurn,
} from "@/lib/types";
import { PROJECTS_CHANGED_EVENT } from "@/lib/sidebar-events";
import ArchitectureDiagram from "@/components/diagram/ArchitectureDiagram";
import DetailPanel from "@/components/diagram/DetailPanel";
import BuildLog from "@/components/build/BuildLog";
import EditArchitectureChat from "@/components/architecture/EditArchitectureChat";
import { useBuild } from "@/hooks/useBuild";

type RightPanel = "none" | "build" | "edit";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [architectureChatInputPrefill, setArchitectureChatInputPrefill] =
    useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    events,
    isBuilding,
    nodeStatuses,
    complete,
    startBuild,
    abortBuild,
    clearLiveEvents,
  } = useBuild(projectId);

  const refetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.project as Project;
  }, [projectId]);

  const stopBuildAndSync = useCallback(async () => {
    abortBuild();
    await new Promise((r) => setTimeout(r, 80));
    const res = await fetch(`/api/projects/${projectId}/interrupt`, {
      method: "POST",
    });
    clearLiveEvents();
    if (res.ok) {
      const j = await res.json();
      setProject(j.project as Project);
    } else {
      const p = await refetchProject();
      if (p) setProject(p);
    }
  }, [projectId, abortBuild, clearLiveEvents, refetchProject]);

  // Fetch project; recover stale "building" from a closed tab or lost connection
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          router.push("/new");
          return;
        }
        const data = await res.json();
        let proj = data.project as Project;
        if (proj.status === "building") {
          const ir = await fetch(`/api/projects/${projectId}/interrupt`, {
            method: "POST",
          });
          if (ir.ok) {
            const ij = await ir.json();
            proj = ij.project as Project;
          }
        }
        setProject(proj);
      } catch {
        router.push("/new");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, router]);

  useEffect(() => {
    if (!complete) return;
    void (async () => {
      const p = await refetchProject();
      if (p) setProject(p);
      clearLiveEvents();
    })();
  }, [complete, refetchProject, clearLiveEvents]);

  useEffect(() => {
    if (!isBuilding) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const onClickCapture = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!el) return;
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("http://") || href.startsWith("https://")) return;
      const path = href.split("?")[0];
      if (!path.startsWith("/")) return;
      if (path === `/project/${projectId}`) return;

      if (
        !window.confirm(
          "A build is in progress. Leaving this page will stop the build. Continue?"
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        await stopBuildAndSync();
        router.push(path);
      })();
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [isBuilding, projectId, router, stopBuildAndSync]);

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
    setRightPanel("build");
    await startBuild();
  }, [startBuild]);

  const openEditArchitecture = useCallback(
    async (options?: { inputPrefill?: string | null }) => {
      if (isBuilding) {
        if (
          !window.confirm(
            "Stop the current build to edit architecture?"
          )
        ) {
          return;
        }
        await stopBuildAndSync();
      }
      setArchitectureChatInputPrefill(options?.inputPrefill ?? null);
      setRightPanel("edit");
    },
    [isBuilding, stopBuildAndSync]
  );

  const clearArchitectureChatInputPrefill = useCallback(() => {
    setArchitectureChatInputPrefill(null);
  }, []);

  const handleArchitectureChatSynced = useCallback(
    (payload: {
      architecture?: Architecture;
      architectureChat: ArchitectureChatTurn[];
    }) => {
      setProject((p) => {
        if (!p) return p;
        return {
          ...p,
          ...(payload.architecture !== undefined
            ? { architecture: payload.architecture }
            : {}),
          architectureChat: payload.architectureChat,
        };
      });
      if (payload.architecture) {
        const arch = payload.architecture;
        setSelectedNodeId((id) => {
          if (!id) return null;
          return arch.nodes.some((n) => n.id === id) ? id : null;
        });
      }
    },
    []
  );

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  const commitTitle = useCallback(async () => {
    if (!project) return;
    const trimmed = titleDraft.trim() || "Untitled";
    setEditingTitle(false);
    if (trimmed === project.name) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setProject(data.project as Project);
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch {
      setTitleDraft(project.name);
    }
  }, [project, projectId, titleDraft]);

  const openInVsCode = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/vscode-link`);
      if (!res.ok) return;
      const data = (await res.json()) as { vscodeUrl?: string };
      if (data.vscodeUrl) {
        window.location.assign(data.vscodeUrl);
      }
    } catch {
      /* ignore */
    }
  }, [projectId]);

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

  const displayStatus = isBuilding ? "building" : project.status;

  const toggleBuildLog = () => {
    if (rightPanel === "build") {
      if (
        isBuilding &&
        !window.confirm(
          "Closing the build log will stop the build. Continue?"
        )
      ) {
        return;
      }
      if (isBuilding) void stopBuildAndSync();
      setRightPanel("none");
      return;
    }
    setRightPanel("build");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex shrink-0 items-center gap-4 border-b border-border px-4">
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="cursor-pointer text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Semicolon
          </button>
          <span className="text-muted">|</span>
        </div>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "Escape") {
                  setTitleDraft(project.name);
                  setEditingTitle(false);
                }
              }}
              className="w-full min-w-0 rounded border border-accent bg-surface px-2 py-0.5 text-sm font-medium text-foreground outline-none"
              aria-label="Project name"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(project.name);
                setEditingTitle(true);
              }}
              className="block w-full min-w-0 cursor-pointer truncate rounded px-1 -mx-1 text-left text-sm font-medium text-foreground hover:text-accent transition-colors"
              title="Click to rename"
            >
              {project.name}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              displayStatus === "built"
                ? "bg-green-500/20 text-green-400"
                : displayStatus === "building"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : displayStatus === "error"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-surface text-muted"
            }`}
          >
            {displayStatus}
          </span>
          <button
            type="button"
            onClick={toggleBuildLog}
            className={`cursor-pointer rounded border px-2 py-0.5 text-xs transition-colors ${
              rightPanel === "build"
                ? "border-accent text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent"
            }`}
          >
            Build Log
          </button>
          <button
            type="button"
            onClick={() => void openInVsCode()}
            title={
              project.outputDir
                ? `Open ${project.outputDir} in VS Code`
                : "Open project build folder in VS Code"
            }
            className="cursor-pointer rounded border border-border px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Open in VS Code
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
        {/* Diagram + full-area detail overlay */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <ArchitectureDiagram
            architecture={project.architecture}
            nodeStatuses={nodeStatuses}
            onNodeClick={handleNodeClick}
            onBuild={handleBuild}
            isBuilding={isBuilding}
            onEditArchitecture={openEditArchitecture}
          />
          {selectedNode && (
            <DetailPanel
              node={selectedNode}
              edges={project.architecture.edges}
              onClose={() => setSelectedNodeId(null)}
              onUpdateNode={handleUpdateNode}
              onEditWithAI={(node) => {
                void openEditArchitecture({
                  inputPrefill: `Update the "${node.label}" service (id: \`${node.id}\`, type: ${node.type}). `,
                });
                setSelectedNodeId(null);
              }}
            />
          )}
        </div>

        {rightPanel === "build" && (
          <div className="flex min-h-0 min-w-0 w-96 max-w-96 shrink-0 flex-col overflow-hidden self-stretch">
            <BuildLog
              persistedLog={project.buildLog}
              events={events}
              isBuilding={isBuilding}
              complete={complete}
            />
          </div>
        )}

        {rightPanel === "edit" && (
          <div className="flex min-h-0 min-w-0 w-96 max-w-96 shrink-0 flex-col overflow-hidden self-stretch">
            <EditArchitectureChat
              projectId={projectId}
              initialMessages={project.architectureChat}
              inputPrefill={architectureChatInputPrefill}
              onInputPrefillConsumed={clearArchitectureChatInputPrefill}
              onClose={() => setRightPanel("none")}
              onSynced={handleArchitectureChatSynced}
            />
          </div>
        )}
      </div>
    </div>
  );
}
