import {
  getProject,
  updateProject,
  appendBuildLog,
  updateNodeStatus,
} from "@/lib/db";
import { runBuild, getOutputDir } from "@/lib/claude-code";
import { interruptBuildSession } from "@/lib/build-interrupt";
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

  let interruptHandled = false;

  function finalizeInterrupt(detail: string) {
    if (interruptHandled) return;
    interruptHandled = true;
    interruptBuildSession(projectId, detail);
  }

  const onAbort = () => {
    finalizeInterrupt("Client disconnected.");
  };
  request.signal.addEventListener("abort", onAbort);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runBuild(
          project,
          outputDir,
          request.signal
        )) {
          try {
            controller.enqueue(sseEvent(event));
          } catch {
            finalizeInterrupt("Client disconnected.");
            break;
          }

          if (event.type === "log") {
            appendBuildLog(projectId, event.text);
          }
          if (event.type === "tool_use") {
            appendBuildLog(projectId, `[${event.tool}] ${event.input}`);
          }
          if (event.type === "service_status") {
            updateNodeStatus(projectId, event.serviceId, event.status);
          }

          if (event.type === "complete") {
            if (event.success) {
              updateProject(projectId, { status: "built" });
            } else if (interruptHandled) {
              /* interrupt path already updated DB */
            } else {
              const err = String(event.error ?? "").toLowerCase();
              if (err.includes("interrupt")) {
                finalizeInterrupt(String(event.error));
              } else {
                updateProject(projectId, { status: "error" });
              }
            }
          }
        }

        if (request.signal.aborted && !interruptHandled) {
          finalizeInterrupt("Client disconnected.");
        }
      } catch (err) {
        const errorEvent: BuildEvent = {
          type: "complete",
          success: false,
          error: String(err),
        };
        try {
          controller.enqueue(sseEvent(errorEvent));
        } catch {
          /* client gone */
        }
        if (!interruptHandled) {
          updateProject(projectId, { status: "error" });
        }
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      finalizeInterrupt("Client disconnected.");
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
