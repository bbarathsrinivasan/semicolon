import { BuildEvent, Project } from "@/lib/types";

export type BuildProviderId = "claude" | "cursor";

/** Human-readable name for UI (sidebar, selects, fallbacks). */
export function buildProviderLabel(id: BuildProviderId): string {
  return id === "cursor" ? "Cursor Agent" : "Claude (Anthropic)";
}

export type BuildProviderSummary = {
  id: BuildProviderId;
  label: string;
};

export interface BuildProvider {
  id: BuildProviderId;
  getOutputDir(projectId: string): string;
  runBuild(
    project: Project,
    outputDir: string,
    signal?: AbortSignal
  ): AsyncGenerator<BuildEvent>;
}
