import { getOutputDir, runBuild } from "@/lib/claude-code";
import { BuildProvider } from "./types";

export const claudeBuildProvider: BuildProvider = {
  id: "claude",
  getOutputDir,
  runBuild,
};
