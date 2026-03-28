"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight">
            Semicolon<span className="text-accent">;</span>
          </h1>
          <p className="text-xl text-muted">
            Describe it. Diagram it. Build it.
          </p>
        </div>

        <p className="text-muted leading-relaxed">
          Tell us what you want to build. We&apos;ll generate an interactive
          architecture diagram, let you refine every service and endpoint, then
          use Claude Code to build the entire project for you.
        </p>

        <button
          onClick={() => router.push("/new")}
          className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-lg cursor-pointer"
        >
          Start a new project
        </button>
      </div>
    </main>
  );
}
