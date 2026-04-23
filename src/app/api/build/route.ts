import {
  getProject,
  updateProject,
  appendBuildLog,
  updateNodeStatus,
} from "@/lib/db";
import { interruptBuildSession } from "@/lib/build-interrupt";
import { BuildEvent } from "@/lib/types";
import {
  getBuildProvider,
  resolveBuildProviderId,
} from "@/lib/build-providers";
import type { BuildProviderId } from "@/lib/build-providers/types";
import { requireSessionUser } from "@/lib/require-session";
import { NextResponse } from "next/server";
import { assertBuildProviderAuthenticated } from "@/lib/build-provider-auth";

export const maxDuration = 300; // 5 minute timeout for build

export async function POST(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const body = (await request.json()) as {
    projectId?: string;
    buildProvider?: unknown;
  };
  const rawProjectId = body.projectId;
  if (typeof rawProjectId !== "string" || !rawProjectId) {
    return new Response(JSON.stringify({ error: "projectId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const projectId = rawProjectId;

  const project = getProject(projectId);
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requested =
    typeof body.buildProvider === "string"
      ? resolveBuildProviderId(body.buildProvider)
      : resolveBuildProviderId(project.buildProvider);
  const providerId: BuildProviderId = requested;

  if (providerId !== project.buildProvider) {
    updateProject(projectId, { buildProvider: providerId });
  }
  const provider = getBuildProvider(providerId);

  const authGate = await assertBuildProviderAuthenticated(providerId);
  if (!authGate.ok) {
    return NextResponse.json(
      {
        error: "Coding agent is not connected on this machine.",
        provider: providerId,
        auth: authGate.snapshot,
      },
      { status: 403 }
    );
  }

  if (!project.architecture) {
    return new Response(
      JSON.stringify({ error: "No architecture generated yet" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const outputDir = provider.getOutputDir(projectId);
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
        controller.enqueue(
          sseEvent({
            type: "progress",
            text: `Starting build with ${providerId}…`,
          })
        );

        for await (const event of provider.runBuild(
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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
