"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Project,
  ArchNode,
  Architecture,
  ArchitectureChatTurn,
} from "@/lib/types";
import {
  BuildProviderId,
  BuildProviderSummary,
  buildProviderLabel,
} from "@/lib/build-providers/types";
import { PROJECTS_CHANGED_EVENT } from "@/lib/sidebar-events";
import ArchitectureDiagram from "@/components/diagram/ArchitectureDiagram";
import DetailPanel from "@/components/diagram/DetailPanel";
import BuildLog from "@/components/build/BuildLog";
import EditArchitectureChat from "@/components/architecture/EditArchitectureChat";
import ProviderConnectModal, {
  type ProviderAuthPayload,
} from "@/components/build/ProviderConnectModal";
import { useBuild } from "@/hooks/useBuild";
import {
  DEMO_ALL_BUILT_PROJECT_ID,
  DEMO_PROJECT_PUBLIC_URL,
} from "@/lib/demo-project";

type RightPanel = "none" | "build" | "edit";
type EditorChoice = "vscode" | "cursor" | "custom";

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
  const [architectureChatComposeLabel, setArchitectureChatComposeLabel] =
    useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [syncUi, setSyncUi] = useState<"idle" | "loading" | "synced">("idle");
  const [providerOptions, setProviderOptions] = useState<BuildProviderSummary[]>(
    []
  );
  const [savingProvider, setSavingProvider] = useState(false);
  const [providerGate, setProviderGate] = useState<{
    providerId: BuildProviderId;
    snapshot: ProviderAuthPayload;
  } | null>(null);
  const [gateVerifying, setGateVerifying] = useState(false);
  const [gitModalOpen, setGitModalOpen] = useState(false);
  const [editorMenuOpen, setEditorMenuOpen] = useState(false);
  const [customEditorModalOpen, setCustomEditorModalOpen] = useState(false);
  const [customEditorTemplate, setCustomEditorTemplate] = useState("");
  const [isSavingCustomEditor, setIsSavingCustomEditor] = useState(false);
  const [copyPathUi, setCopyPathUi] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [customEditorError, setCustomEditorError] = useState<string | null>(
    null
  );
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyPathTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorMenuRef = useRef<HTMLDivElement>(null);

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
        if (res.status === 401) {
          router.push("/login");
          return;
        }
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
    void (async () => {
      try {
        const res = await fetch("/api/build/providers");
        if (!res.ok) return;
        const data = (await res.json()) as { providers?: BuildProviderSummary[] };
        if (Array.isArray(data.providers)) {
          setProviderOptions(data.providers);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

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

  const architectureForView = useMemo((): Architecture | null => {
    if (!project?.architecture) return null;
    if (projectId !== DEMO_ALL_BUILT_PROJECT_ID || isBuilding) {
      return project.architecture;
    }
    return {
      ...project.architecture,
      nodes: project.architecture.nodes.map((n) => ({
        ...n,
        status: "built" as ArchNode["status"],
      })),
    };
  }, [project?.architecture, projectId, isBuilding]);

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
    if (!project) return;
    setRightPanel("build");
    await startBuild(project.buildProvider);
  }, [startBuild, project]);

  const persistBuildProvider = useCallback(
    async (providerId: BuildProviderId) => {
      if (!project) return;
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildProvider: providerId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        auth?: ProviderAuthPayload;
        provider?: BuildProviderId;
        project?: Project;
      };
      if (!res.ok) {
        if (res.status === 403 && body.auth && body.provider) {
          setProviderGate({
            providerId: body.provider,
            snapshot: body.auth,
          });
          return;
        }
        throw new Error(body.error ?? "save failed");
      }
      if (body.project) setProject(body.project);
    },
    [project, projectId]
  );

  const handleProviderChange = useCallback(
    async (providerId: BuildProviderId) => {
      if (!project || providerId === project.buildProvider || savingProvider) return;
      setSavingProvider(true);
      try {
        const ar = await fetch("/api/build/provider-auth");
        if (!ar.ok) throw new Error("auth check failed");
        const aj = (await ar.json()) as {
          providers: Record<BuildProviderId, ProviderAuthPayload>;
        };
        const snap = aj.providers[providerId];
        if (!snap.ready) {
          setProviderGate({ providerId, snapshot: snap });
          return;
        }
        await persistBuildProvider(providerId);
      } catch {
        /* ignore */
      } finally {
        setSavingProvider(false);
      }
    },
    [project, savingProvider, persistBuildProvider]
  );

  const verifyProviderGateAndSave = useCallback(async () => {
    if (!providerGate || !project) return;
    setGateVerifying(true);
    try {
      const ar = await fetch("/api/build/provider-auth");
      if (!ar.ok) return;
      const aj = (await ar.json()) as {
        providers: Record<BuildProviderId, ProviderAuthPayload>;
      };
      const snap = aj.providers[providerGate.providerId];
      if (!snap.ready) {
        setProviderGate({ ...providerGate, snapshot: snap });
        return;
      }
      await persistBuildProvider(providerGate.providerId);
      setProviderGate(null);
    } catch {
      /* ignore */
    } finally {
      setGateVerifying(false);
    }
  }, [providerGate, project, persistBuildProvider]);

  const openEditArchitecture = useCallback(
    async (options?: {
      inputPrefill?: string | null;
      /** Shown above the chat compose box when opening from Refine with AI */
      composeLabel?: string | null;
    }) => {
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
      setArchitectureChatComposeLabel(options?.composeLabel ?? null);
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

  const openInEditor = useCallback(async (editor: EditorChoice) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/editor-link?editor=${editor}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        launchUrl?: string | null;
        requiresConfiguration?: boolean;
      };
      if (data.launchUrl) {
        window.location.assign(data.launchUrl);
        return;
      }
      if (editor === "custom" && data.requiresConfiguration) {
        setCustomEditorModalOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, [projectId]);

  const loadCustomEditorTemplate = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/editor");
      if (!res.ok) return;
      const data = (await res.json()) as { customTemplate?: string };
      setCustomEditorTemplate(data.customTemplate ?? "");
      setCustomEditorError(null);
    } catch {
      /* ignore */
    }
  }, []);

  const openCustomEditorConfiguration = useCallback(() => {
    setEditorMenuOpen(false);
    setCustomEditorModalOpen(true);
    void loadCustomEditorTemplate();
  }, [loadCustomEditorTemplate]);

  const saveCustomEditorTemplate = useCallback(async () => {
    const hasPathToken =
      customEditorTemplate.includes("{{path}}") ||
      customEditorTemplate.includes("{path}") ||
      customEditorTemplate.includes("{{encodedPath}}") ||
      customEditorTemplate.includes("{encodedPath}");
    if (!hasPathToken) {
      setCustomEditorError(
        "Template must include {path}, {{path}}, {encodedPath}, or {{encodedPath}}."
      );
      return;
    }
    setIsSavingCustomEditor(true);
    try {
      const res = await fetch("/api/settings/editor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTemplate: customEditorTemplate }),
      });
      if (!res.ok) {
        setCustomEditorError("Failed to save custom editor template.");
        return;
      }
      setCustomEditorError(null);
      setCustomEditorModalOpen(false);
    } catch {
      setCustomEditorError("Failed to save custom editor template.");
    } finally {
      setIsSavingCustomEditor(false);
    }
  }, [customEditorTemplate]);

  const handleSyncClick = useCallback(() => {
    if (syncUi === "loading") return;
    setSyncUi("loading");
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      setSyncUi("synced");
    }, 1400);
  }, [syncUi]);

  const copyLocalBuildPath = useCallback(async () => {
    try {
      let folderPath = project?.outputDir ?? "";
      if (!folderPath) {
        const res = await fetch(`/api/projects/${projectId}/editor-link`);
        if (res.ok) {
          const data = (await res.json()) as { folderPath?: string };
          folderPath = data.folderPath ?? "";
        }
      }
      if (!folderPath) {
        setCopyPathUi("error");
        return;
      }
      await navigator.clipboard.writeText(folderPath);
      setCopyPathUi("copied");
    } catch {
      setCopyPathUi("error");
    } finally {
      if (copyPathTimeoutRef.current) clearTimeout(copyPathTimeoutRef.current);
      copyPathTimeoutRef.current = setTimeout(() => {
        copyPathTimeoutRef.current = null;
        setCopyPathUi("idle");
      }, 1800);
    }
  }, [project?.outputDir, projectId]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (copyPathTimeoutRef.current) clearTimeout(copyPathTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (e: globalThis.MouseEvent) => {
      if (!editorMenuRef.current?.contains(e.target as Node)) {
        setEditorMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

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

  const selectedNode =
    selectedNodeId && architectureForView
      ? architectureForView.nodes.find((n) => n.id === selectedNodeId) ?? null
      : null;

  const displayStatus = isBuilding
    ? "building"
    : projectId === DEMO_ALL_BUILT_PROJECT_ID
      ? "built"
      : project.status;

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
          <label className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted">
            Provider
            <select
              value={project.buildProvider}
              onChange={(e) =>
                void handleProviderChange(e.target.value as BuildProviderId)
              }
              disabled={isBuilding || savingProvider}
              className="cursor-pointer bg-transparent text-xs text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Build provider"
            >
              {providerOptions.length > 0 ? (
                providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))
              ) : (
                <option value={project.buildProvider}>
                  {buildProviderLabel(project.buildProvider)}
                </option>
              )}
            </select>
          </label>
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
          <div ref={editorMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setEditorMenuOpen((prev) => !prev)}
              title={
                project.outputDir
                  ? `Open ${project.outputDir} in an editor`
                  : "Open project build folder in an editor"
              }
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Open in editor
              <span aria-hidden>▾</span>
            </button>
            {editorMenuOpen ? (
              <div className="absolute right-0 top-7 z-20 min-w-52 rounded-lg border border-border bg-surface p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setEditorMenuOpen(false);
                    void openInEditor("vscode");
                  }}
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-hover"
                >
                  Open in VS Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorMenuOpen(false);
                    void openInEditor("cursor");
                  }}
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-hover"
                >
                  Open in Cursor
                </button>
                <button
                  type="button"
                  onClick={openCustomEditorConfiguration}
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-hover"
                >
                  Configure custom editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorMenuOpen(false);
                    void openInEditor("custom");
                  }}
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-hover"
                >
                  Open in custom editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorMenuOpen(false);
                    void copyLocalBuildPath();
                  }}
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-hover"
                >
                  Copy local build path
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={syncUi === "loading"}
            title="Sync project"
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-2 py-0.5 text-xs transition-colors disabled:cursor-wait ${
              syncUi === "synced"
                ? "border-green-500/40 text-green-400 hover:border-green-400/60 hover:text-green-300"
                : "border-border text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {syncUi === "loading" ? (
              <>
                <span
                  className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
                  aria-hidden
                />
                Syncing…
              </>
            ) : syncUi === "synced" ? (
              "Synced"
            ) : (
              "Sync"
            )}
          </button>
          <button
            type="button"
            onClick={() => setGitModalOpen(true)}
            className="cursor-pointer rounded border border-border px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Publish in Git
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
        {/* Diagram + full-area detail overlay */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <ArchitectureDiagram
            architecture={architectureForView!}
            demoDeployUrl={
              projectId === DEMO_ALL_BUILT_PROJECT_ID
                ? DEMO_PROJECT_PUBLIC_URL
                : undefined
            }
            nodeStatuses={
              projectId === DEMO_ALL_BUILT_PROJECT_ID && !isBuilding
                ? undefined
                : nodeStatuses
            }
            onNodeClick={handleNodeClick}
            onBuild={handleBuild}
            isBuilding={isBuilding}
            onEditArchitecture={openEditArchitecture}
          />
          {selectedNode && (
            <DetailPanel
              node={selectedNode}
              edges={architectureForView!.edges}
              onClose={() => setSelectedNodeId(null)}
              onUpdateNode={handleUpdateNode}
              onEditWithAI={(node) => {
                void openEditArchitecture({
                  inputPrefill: null,
                  composeLabel: `${node.label} · ${node.type} · id \`${node.id}\``,
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
              demoSuccessfulBuild={
                projectId === DEMO_ALL_BUILT_PROJECT_ID && !isBuilding
              }
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
              composeContextLabel={architectureChatComposeLabel}
              onClose={() => {
                setArchitectureChatComposeLabel(null);
                setRightPanel("none");
              }}
              onSynced={handleArchitectureChatSynced}
            />
          </div>
        )}
      </div>

      <ProviderConnectModal
        open={providerGate !== null}
        providerId={providerGate?.providerId ?? null}
        snapshot={providerGate?.snapshot ?? null}
        verifying={gateVerifying}
        onClose={() => setProviderGate(null)}
        onVerify={() => void verifyProviderGateAndSave()}
      />

      {customEditorModalOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (isSavingCustomEditor) return;
            setCustomEditorModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-editor-title"
            className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-6 py-4">
              <h2 id="custom-editor-title" className="text-base font-semibold text-foreground">
                Configure custom editor
              </h2>
              <p className="mt-1 text-xs text-muted">
                Use a URL template with one token: {"{path}"} / {"{{path}}"} for raw path, or {"{encodedPath}"} / {"{{encodedPath}}"} for encoded path.
              </p>
            </div>
            <div className="px-6 py-4">
              <label className="mb-1 block text-xs font-medium text-muted">
                Launch URL template
              </label>
              <input
                type="text"
                value={customEditorTemplate}
                onChange={(e) => setCustomEditorTemplate(e.target.value)}
                placeholder="myeditor://open?folder={{encodedPath}}"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              {customEditorError ? (
                <p className="mt-2 text-xs text-red-400">{customEditorError}</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setCustomEditorModalOpen(false)}
                disabled={isSavingCustomEditor}
                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveCustomEditorTemplate()}
                disabled={isSavingCustomEditor}
                className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-wait"
              >
                {isSavingCustomEditor ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {copyPathUi !== "idle" ? (
        <div
          className={`fixed bottom-5 right-5 z-[115] rounded-lg border px-3 py-2 text-xs shadow-xl ${
            copyPathUi === "copied"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
          role="status"
          aria-live="polite"
        >
          {copyPathUi === "copied"
            ? "Local build path copied."
            : "Could not copy build path."}
        </div>
      ) : null}

      {gitModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setGitModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="git-connect-title"
            aria-describedby="git-connect-desc"
            className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-0 shadow-2xl ring-1 ring-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setGitModalOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Close"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="border-b border-border px-6 pb-4 pt-6 pr-14">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F05032]/15 ring-1 ring-[#F05032]/25"
                  aria-hidden
                >
                  <svg
                    className="h-7 w-7 text-[#F05032]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.599-.719.72-1.881.72-2.602 0-.719-.719-.719-1.878 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187" />
                  </svg>
                </div>
                <div className="min-w-0 text-left">
                  <h2
                    id="git-connect-title"
                    className="text-lg font-semibold tracking-tight text-foreground"
                  >
                    Publish in Git
                  </h2>
                  <p
                    id="git-connect-desc"
                    className="mt-0.5 text-sm text-muted"
                  >
                    Link a remote repository to push builds and keep history in
                    sync.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                Connection
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-hover/35 px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F05032]/12 text-[#F05032]"
                  aria-hidden
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.599-.719.72-1.881.72-2.602 0-.719-.719-.719-1.878 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Connect to Git
                  </p>
                  <p className="truncate text-xs text-muted">
                    Sign in with GitHub, GitLab, or another provider to
                    continue.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface-hover/25 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setGitModalOpen(false)}
                className="w-full cursor-pointer rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setGitModalOpen(false)}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover sm:w-auto"
              >
                <svg
                  className="h-4 w-4 shrink-0 opacity-95"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.599-.719.72-1.881.72-2.602 0-.719-.719-.719-1.878 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187" />
                </svg>
                Connect
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
