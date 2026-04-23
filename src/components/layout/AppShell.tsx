"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProjectsSidebar from "./ProjectsSidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = pathname?.replace(/\/+$/, "") || "/";
  const pathSegments = normalizedPath.split("/").filter(Boolean);
  const isAuthRoute = pathSegments.some(
    (segment) =>
      segment === "login" || segment === "register" || segment === "signup"
  );

  if (isAuthRoute) {
    return (
      <div className="flex h-dvh min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent"
          >
            Semicolon<span className="text-accent">;</span>
          </Link>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden">
      <ProjectsSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
