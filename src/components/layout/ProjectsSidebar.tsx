"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import type { BuildProviderId } from "@/lib/build-providers/types";
import { PROJECTS_CHANGED_EVENT } from "@/lib/sidebar-events";
import BuildInstructionsPanel from "./BuildInstructionsPanel";
import ProviderConnectModal, {
  type ProviderAuthPayload,
} from "@/components/build/ProviderConnectModal";

const STORAGE_KEY = "semicolon-sidebar-collapsed";

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      suppressHydrationWarning
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      suppressHydrationWarning
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      suppressHydrationWarning
    >
      {collapsed ? (
        <polyline points="9 18 15 12 9 6" />
      ) : (
        <polyline points="15 18 9 12 15 6" />
      )}
    </svg>
  );
}

type MeUser = {
  id: string;
  email: string;
  defaultBuildProvider: BuildProviderId;
};

export default function ProjectsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
  const [providerOptions, setProviderOptions] = useState<
    { id: BuildProviderId; label: string }[]
  >([]);
  const [savingAgent, setSavingAgent] = useState(false);
  const [agentGate, setAgentGate] = useState<{
    providerId: BuildProviderId;
    snapshot: ProviderAuthPayload;
  } | null>(null);
  const [agentGateVerifying, setAgentGateVerifying] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setMe(null);
        return;
      }
      const data = (await res.json()) as { user: MeUser | null };
      setMe(data.user ?? null);
    } catch {
      setMe(null);
    }
  }, []);

  const loadProviderOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/build/providers");
      if (!res.ok) return;
      const data = (await res.json()) as {
        providers?: { id: BuildProviderId; label: string }[];
      };
      if (Array.isArray(data.providers)) setProviderOptions(data.providers);
    } catch {
      /* ignore */
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (
        res.status === 401 &&
        pathname !== "/login" &&
        pathname !== "/register"
      ) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { projects: Project[] };
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects, pathname]);

  useEffect(() => {
    void loadMe();
    void loadProviderOptions();
  }, [loadMe, loadProviderOptions, pathname]);

  useEffect(() => {
    const onChange = () => {
      void loadProjects();
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, onChange);
  }, [loadProjects]);

  const persistDefaultAgent = async (providerId: BuildProviderId) => {
    if (!me) return;
    const res = await fetch("/api/auth/agent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultBuildProvider: providerId }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      auth?: ProviderAuthPayload;
      provider?: BuildProviderId;
      user?: MeUser;
    };
    if (!res.ok) {
      if (res.status === 403 && body.auth && body.provider) {
        setAgentGate({ providerId: body.provider, snapshot: body.auth });
        return;
      }
      throw new Error(body.error ?? "save failed");
    }
    if (body.user) setMe(body.user);
  };

  const handleDefaultAgentChange = async (providerId: BuildProviderId) => {
    if (!me || savingAgent || providerId === me.defaultBuildProvider) return;
    setSavingAgent(true);
    try {
      const ar = await fetch("/api/build/provider-auth");
      if (!ar.ok) throw new Error("auth check failed");
      const aj = (await ar.json()) as {
        providers: Record<BuildProviderId, ProviderAuthPayload>;
      };
      const snap = aj.providers[providerId];
      if (!snap.ready) {
        setAgentGate({ providerId, snapshot: snap });
        return;
      }
      await persistDefaultAgent(providerId);
    } catch {
      /* ignore */
    } finally {
      setSavingAgent(false);
    }
  };

  const verifyAgentGateAndSave = async () => {
    if (!agentGate || !me) return;
    setAgentGateVerifying(true);
    try {
      const ar = await fetch("/api/build/provider-auth");
      if (!ar.ok) return;
      const aj = (await ar.json()) as {
        providers: Record<BuildProviderId, ProviderAuthPayload>;
      };
      const snap = aj.providers[agentGate.providerId];
      if (!snap.ready) {
        setAgentGate({ ...agentGate, snapshot: snap });
        return;
      }
      await persistDefaultAgent(agentGate.providerId);
      setAgentGate(null);
    } catch {
      /* ignore */
    } finally {
      setAgentGateVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setMe(null);
    setProjects([]);
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={`flex h-dvh min-h-0 shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      <div
        className={`flex h-12 shrink-0 items-center border-b border-border ${
          collapsed ? "justify-center px-0" : "justify-between gap-2 px-3"
        }`}
      >
        {!collapsed && (
          <Link
            href="/"
            className="truncate text-sm font-semibold tracking-tight text-foreground hover:text-accent transition-colors"
          >
            Semicolon<span className="text-accent">;</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
        >
          <PanelToggleIcon collapsed={collapsed} />
        </button>
      </div>

      <div
        className={`flex shrink-0 flex-col gap-2 border-border py-3 ${
          collapsed
            ? "items-center border-b px-0"
            : "border-b px-3"
        }`}
      >
        <Link
          href="/"
          title="Home"
          className={`flex items-center gap-3 rounded-lg text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground ${
            collapsed ? "h-10 w-10 justify-center p-0" : "px-3 py-2"
          } ${pathname === "/" ? "bg-surface-hover text-foreground" : ""}`}
        >
          <HomeIcon className="shrink-0" />
          {!collapsed && <span>Home</span>}
        </Link>
        <Link
          href="/new"
          title="New project"
          className={`flex items-center gap-3 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors ${
            collapsed ? "h-10 w-10 justify-center p-0" : "px-3 py-2"
          } ${pathname === "/new" ? "brightness-110" : ""}`}
        >
          <PlusIcon className="shrink-0" />
          {!collapsed && <span>New project</span>}
        </Link>
      </div>

      {!collapsed && (
        <>
          <p className="shrink-0 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Recent
          </p>
          <nav
            className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2"
            aria-label="Recent projects"
          >
            {loading && (
              <p className="px-2 py-2 text-xs text-muted">Loading…</p>
            )}
            {!loading && projects.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted leading-relaxed">
                No projects yet. Start a new one to see it here.
              </p>
            )}
            {projects.map((p) => {
              const active = pathname === `/project/${p.id}`;
              return (
                <Link
                  key={p.id}
                  href={`/project/${p.id}`}
                  className={`block truncate rounded-lg px-2 py-2 text-sm transition-colors ${
                    active
                      ? "bg-surface-hover font-medium text-foreground"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {p.name || "Untitled"}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {!collapsed && me === undefined ? (
        <div className="shrink-0 border-t border-border px-3 py-2">
          <p className="text-xs text-muted">Loading account…</p>
        </div>
      ) : null}

      {!collapsed && me === null && pathname !== "/login" && pathname !== "/register" ? (
        <div className="shrink-0 space-y-2 border-t border-border px-3 py-3">
          <p className="text-xs text-muted leading-relaxed">
            Sign in to sync projects across sessions.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className="inline-flex flex-1 min-w-[5rem] items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex flex-1 min-w-[5rem] items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
            >
              Register
            </Link>
          </div>
        </div>
      ) : null}

      {!collapsed && me ? (
        <div className="shrink-0 space-y-2 border-t border-border px-3 py-3">
          <p className="truncate text-xs text-muted" title={me.email}>
            {me.email}
          </p>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
            Default coding agent
          </label>
          <select
            value={me.defaultBuildProvider}
            onChange={(e) =>
              void handleDefaultAgentChange(e.target.value as BuildProviderId)
            }
            disabled={savingAgent || providerOptions.length === 0}
            className="w-full cursor-pointer rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Default coding agent for new projects"
          >
            {providerOptions.length > 0 ? (
              providerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))
            ) : (
              <option value={me.defaultBuildProvider}>Claude</option>
            )}
          </select>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full cursor-pointer rounded-lg border border-border py-1.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      ) : null}

      <ProviderConnectModal
        open={agentGate !== null}
        providerId={agentGate?.providerId ?? null}
        snapshot={agentGate?.snapshot ?? null}
        verifying={agentGateVerifying}
        onClose={() => setAgentGate(null)}
        onVerify={() => void verifyAgentGateAndSave()}
      />

      <BuildInstructionsPanel collapsed={collapsed} />
    </aside>
  );
}
