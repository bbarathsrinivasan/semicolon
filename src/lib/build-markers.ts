import fs from "fs";
import path from "path";
import type { BuildEvent, Project } from "@/lib/types";

/** Emit `service_status: built` for each service that has a `.semicolon/{id}.done` marker. */
export function* yieldBuiltMarkers(
  project: Project,
  outputDir: string
): Generator<BuildEvent> {
  const arch = project.architecture;
  if (!arch) return;
  for (const node of arch.nodes) {
    const markerPath = path.join(outputDir, ".semicolon", `${node.id}.done`);
    if (fs.existsSync(markerPath)) {
      yield {
        type: "service_status",
        serviceId: node.id,
        status: "built",
      };
    }
  }
}
