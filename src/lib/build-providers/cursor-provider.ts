import { getOutputDir } from "@/lib/claude-code";
import { runCursorBuild } from "@/lib/cursor-code";
import { BuildProvider } from "./types";

export const cursorBuildProvider: BuildProvider = {
  id: "cursor",
  getOutputDir,
  runBuild: runCursorBuild,
};
