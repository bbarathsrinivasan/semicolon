import { getProject, updateProject, appendBuildLog, updateNodeStatus } from "@/lib/db";
import { runBuild, getOutputDir } from "@/lib/claude-code";
import { BuildEvent } from "@/lib/types";

export const maxDuration = 300; // 5 minute timeout for build

export async function POST(request: Request) {
  const { projectId } = await request.json();

  const project = getProject(projectId);
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!project.architecture) {
    return new Response(
      JSON.stringify({ error: "No architecture generated yet" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const outputDir = getOutputDir(projectId);
  updateProject(projectId, { status: "building", outputDir });

  const encoder = new TextEncoder();

  function sseEvent(event: BuildEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runBuild(project, outputDir)) {
          controller.enqueue(sseEvent(event));

          // Persist to build log
          if (event.type === "log") {
            appendBuildLog(projectId, event.text);
          }
          if (event.type === "tool_use") {
            appendBuildLog(projectId, `[${event.tool}] ${event.input}`);
          }

          // Update node statuses in DB
          if (event.type === "service_status") {
            updateNodeStatus(projectId, event.serviceId, event.status);
          }

          // Update project status on completion
          if (event.type === "complete") {
            updateProject(projectId, {
              status: event.success ? "built" : "error",
            });
          }
        }
      } catch (err) {
        const errorEvent: BuildEvent = {
          type: "complete",
          success: false,
          error: String(err),
        };
        controller.enqueue(sseEvent(errorEvent));
        updateProject(projectId, { status: "error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
