"use client";

import { useRouter } from "next/navigation";
import HomeAurora from "@/components/home/HomeAurora";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <HomeAurora />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">
              Semicolon<span className="text-accent">;</span>
            </h1>
            <p className="text-xl text-foreground/70">
              Describe it. Diagram it. Build it.
            </p>
          </div>

          <p className="text-foreground/65 leading-relaxed">
            Tell us what you want to build. We&apos;ll generate an interactive
            architecture diagram, let you refine every service and endpoint,
            then our coding agents will build the entire project for you.
          </p>

          <button
            onClick={() => router.push("/new")}
            className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-lg cursor-pointer shadow-[0_2px_16px_rgba(99,102,241,0.2)]"
          >
            Start a new project
          </button>
        </div>
      </div>
    </main>
  );
}
