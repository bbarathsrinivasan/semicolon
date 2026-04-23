import { claudeBuildProvider } from "./claude-provider";
import { cursorBuildProvider } from "./cursor-provider";
import {
  BuildProvider,
  BuildProviderId,
  BuildProviderSummary,
  buildProviderLabel,
} from "./types";

const providerRegistry: Record<BuildProviderId, BuildProvider> = {
  claude: claudeBuildProvider,
  cursor: cursorBuildProvider,
};

const providerSummaries: BuildProviderSummary[] = [
  { id: "claude", label: buildProviderLabel("claude") },
  { id: "cursor", label: buildProviderLabel("cursor") },
];

export function getBuildProvider(providerId: BuildProviderId): BuildProvider {
  return providerRegistry[providerId];
}

export function getDefaultBuildProvider(): BuildProvider {
  return getBuildProvider("claude");
}

export function resolveBuildProviderId(input?: string | null): BuildProviderId {
  if (input && input in providerRegistry) {
    return input as BuildProviderId;
  }
  return "claude";
}

export function listBuildProviders(): BuildProviderSummary[] {
  return providerSummaries;
}
