import fs from "fs";
import path from "path";
import os from "os";
import { Project, BuildEvent } from "./types";

export function generateClaudeMd(project: Project): string {
  const arch = project.architecture!;
  const spec = project.spec!;

  const prefsSection = Object.entries(spec.preferences)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const nodesSection = arch.nodes
    .map((n) => {
      const endpointsList =
        n.endpoints && n.endpoints.length > 0
          ? n.endpoints
              .map(
                (ep) =>
                  `  - ${ep.method} ${ep.path}\n    Request: ${JSON.stringify(ep.request)}\n    Response: ${JSON.stringify(ep.response)}`
              )
              .join("\n")
          : "  (none)";

      const deps =
        n.dependencies && n.dependencies.length > 0
          ? n.dependencies.join(", ")
          : "none";
      const envs =
        n.envVars && n.envVars.length > 0 ? n.envVars.join(", ") : "none";

      return `### ${n.label} (${n.type}) — id: ${n.id}
Description: ${n.description}
Endpoints:
${endpointsList}
Dependencies: ${deps}
Environment Variables: ${envs}`;
    })
    .join("\n\n");

  const edgesSection = arch.edges
    .map(
      (e) =>
        `- ${e.source} → ${e.target}: ${e.label}\n  Contract: method=${e.contract.method} path=${e.contract.path}`
    )
    .join("\n");

  const serviceIds = arch.nodes.map((n) => n.id).join(", ");

  return `# Project: ${project.name}

## Overview
${spec.prompt}

## User Preferences
${prefsSection}

## Architecture

### Services
${nodesSection}

### Service Connections
${edgesSection}

## Build Instructions

Build a complete, working software project with these requirements:

1. Create a monorepo at the root with one folder per service (named by the service id: ${serviceIds})
2. Each service must be independently runnable with \`npm start\` (or equivalent for the stack)
3. Implement ALL endpoint contracts exactly as specified above
4. Use the user's preferred database and stack from the preferences section
5. Add proper error handling and input validation
6. Include a \`package.json\` with all dependencies for each service
7. Add a \`docker-compose.yml\` if the project has a database
8. Initialize a git repository and make an initial commit
9. Create a \`README.md\` with setup instructions

## Progress Tracking

After completing each service, create a marker file at \`.semicolon/{serviceId}.done\`
For example, after building the auth service: \`.semicolon/auth.done\`
Create the \`.semicolon/\` directory if it doesn't exist.

## Important Notes
- Write complete, working code — NO stubs or placeholders
- Install dependencies with npm/pip/etc as appropriate
- Make sure services can actually run
- Use environment variables for all configuration (database URLs, secrets, etc.)
`;
}

export async function* runBuild(
  project: Project,
  outputDir: string
): AsyncGenerator<BuildEvent> {
  // Write CLAUDE.md to outputDir
  fs.mkdirSync(outputDir, { recursive: true });
  const claudeMdContent = generateClaudeMd(project);
  fs.writeFileSync(path.join(outputDir, "CLAUDE.md"), claudeMdContent);

  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const nodeIds = project.architecture!.nodes.map((n) => n.id);

  const buildPrompt = `Read the CLAUDE.md file in this directory and build the entire project according to its specifications.

Build services in dependency order: databases first, then APIs, then workers, then frontends.

After building each service, create a marker file at .semicolon/{serviceId}.done so progress can be tracked.`;

  try {
    const messages = query({
      prompt: buildPrompt,
      options: {
        cwd: outputDir,
        tools: ["Read", "Edit", "Write", "Bash"],
        allowedTools: ["Read", "Edit", "Write", "Bash"],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 80,
      },
    });

    for await (const message of messages) {
      if (message.type === "assistant") {
        // Iterate over content blocks in the BetaMessage
        for (const block of message.message.content) {
          if (block.type === "text" && block.text.trim()) {
            yield { type: "log", text: block.text };
          }

          if (block.type === "tool_use") {
            const inputStr =
              typeof block.input === "string"
                ? block.input
                : JSON.stringify(block.input).slice(0, 200);

            yield {
              type: "tool_use",
              tool: block.name,
              input: inputStr,
            };

            // Detect service dir writes for progress
            if (block.name === "Write" || block.name === "Edit") {
              const inp =
                typeof block.input === "object" && block.input !== null
                  ? (block.input as Record<string, unknown>)
                  : {};
              const filePath = String(inp.file_path || inp.path || "");
              for (const nodeId of nodeIds) {
                if (
                  filePath.includes(`/${nodeId}/`) ||
                  filePath.includes(`\\${nodeId}\\`) ||
                  filePath.endsWith(`/${nodeId}`) ||
                  filePath.endsWith(`\\${nodeId}`)
                ) {
                  yield { type: "progress", text: `Working on ${nodeId}...` };
                }
              }
            }

            // Detect marker file creation (bash)
            if (block.name === "Bash") {
              const inp =
                typeof block.input === "object" && block.input !== null
                  ? (block.input as Record<string, unknown>)
                  : {};
              const cmd = String(inp.command || "");
              for (const nodeId of nodeIds) {
                if (cmd.includes(`.semicolon/${nodeId}.done`)) {
                  yield {
                    type: "service_status",
                    serviceId: nodeId,
                    status: "building",
                  };
                }
              }
            }
          }
        }
      }

      // Check result message
      if (message.type === "result") {
        if (message.subtype === "success") {
          // Check marker files to mark services as built
          for (const nodeId of nodeIds) {
            const markerPath = path.join(
              outputDir,
              ".semicolon",
              `${nodeId}.done`
            );
            if (fs.existsSync(markerPath)) {
              yield {
                type: "service_status",
                serviceId: nodeId,
                status: "built",
              };
            }
          }
          yield { type: "complete", success: true };
        } else {
          yield {
            type: "complete",
            success: false,
            error: `Build stopped: ${message.subtype}`,
          };
        }
        return;
      }

      // User messages with tool results — scan for completed markers
      if (message.type === "user") {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const nodeId of nodeIds) {
            const markerPath = path.join(
              outputDir,
              ".semicolon",
              `${nodeId}.done`
            );
            if (fs.existsSync(markerPath)) {
              yield {
                type: "service_status",
                serviceId: nodeId,
                status: "built",
              };
            }
          }
        }
      }
    }

    yield { type: "complete", success: true };
  } catch (err) {
    yield {
      type: "complete",
      success: false,
      error: String(err),
    };
  }
}

export function getOutputDir(projectId: string): string {
  return path.join(os.homedir(), "semicolon-builds", projectId);
}
