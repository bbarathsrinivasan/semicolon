"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Project } from "@/lib/types";

const STORAGE_KEY = "semicolon-sidebar-collapsed";

export const PROJECTS_CHANGED_EVENT = "semicolon-projects-changed";

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
    >
      {collapsed ? (
        <polyline points="9 18 15 12 9 6" />
      ) : (
        <polyline points="15 18 9 12 15 6" />
      )}
    </svg>
  );
}

export default function ProjectsSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data = (await res.json()) as { projects: Project[] };
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    const onChange = () => {
      void loadProjects();
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, onChange);
  }, [loadProjects]);

  const toggleCollapsed = () => setCollapsed((c) => !c);

  const isProjectActive = (id: string) => pathname === `/project/${id}`;

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out ${
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
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
        >
          <PanelToggleIcon collapsed={collapsed} />
        </button>
      </div>

      <div
        className={`flex shrink-0 flex-col gap-2 border-b border-border py-3 ${
          collapsed ? "items-center px-0" : "px-3"
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
          } ${pathname === "/new" ? "ring-2 ring-accent-hover ring-offset-2 ring-offset-surface" : ""}`}
        >
          <PlusIcon className="shrink-0" />
          {!collapsed && <span>New project</span>}
        </Link>
      </div>

      {!collapsed && (
        <p className="shrink-0 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Recent
        </p>
      )}

      <nav
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain py-2 ${
          collapsed ? "flex flex-col items-center gap-1 px-0" : "space-y-0.5 px-2"
        }`}
        aria-label="Recent projects"
      >
        {loading && !collapsed && (
          <p className="px-2 py-2 text-xs text-muted">Loading…</p>
        )}
        {!loading && projects.length === 0 && !collapsed && (
          <p className="px-2 py-2 text-xs text-muted leading-relaxed">
            No projects yet. Start a new one to see it here.
          </p>
        )}
        {projects.map((p) => {
          const active = isProjectActive(p.id);
          const initial = (p.name?.trim()?.[0] || "?").toUpperCase();
          if (collapsed) {
            return (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                title={p.name}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "bg-background text-foreground hover:bg-surface-hover"
                }`}
              >
                {initial}
              </Link>
            );
          }
          return (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className={`block truncate rounded-lg px-2 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface-hover text-foreground font-medium"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {p.name || "Untitled"}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
