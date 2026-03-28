import { appendBuildLog, getProject, updateProject } from "./db";

export const BUILD_INTERRUPT_MARKER = "--- Build was interrupted";

export function interruptBuildSession(
  projectId: string,
  detail?: string
): void {
  const p = getProject(projectId);
  if (!p || p.status !== "building") return;

  const note =
    detail?.trim() ||
    "The build was stopped (tab closed, navigation, or build panel closed).";
  appendBuildLog(
    projectId,
    `\n\n${BUILD_INTERRUPT_MARKER}\n${note}\n`
  );

  if (p.architecture) {
    const nodes = p.architecture.nodes.map((n) =>
      n.status === "building" ? { ...n, status: "idle" as const } : n
    );
    updateProject(projectId, {
      status: "diagramming",
      architecture: { ...p.architecture, nodes },
    });
  } else {
    updateProject(projectId, { status: "diagramming" });
  }
}
