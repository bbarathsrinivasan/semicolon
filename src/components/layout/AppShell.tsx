"use client";

import ProjectsSidebar from "./ProjectsSidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden">
      <ProjectsSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
