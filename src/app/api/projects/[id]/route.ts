import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";
import { requireSessionUser } from "@/lib/require-session";
import { resolveBuildProviderId } from "@/lib/build-providers";
import type { BuildProviderId } from "@/lib/build-providers/types";
import { assertBuildProviderAuthenticated } from "@/lib/build-provider-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const updates = (await request.json()) as {
    buildProvider?: unknown;
    [key: string]: unknown;
  };

  if (updates.buildProvider !== undefined) {
    const next = resolveBuildProviderId(
      String(updates.buildProvider)
    ) as BuildProviderId;
    if (next !== project.buildProvider) {
      const gate = await assertBuildProviderAuthenticated(next);
      if (!gate.ok) {
        return NextResponse.json(
          {
            error: "Connect this coding agent before selecting it.",
            provider: next,
            auth: gate.snapshot,
          },
          { status: 403 }
        );
      }
    }
  }

  updateProject(
    id,
    updates as {
      name?: string;
      spec?: import("@/lib/types").ProjectSpec;
      architecture?: import("@/lib/types").Architecture;
      buildProvider?: BuildProviderId;
      status?: import("@/lib/types").ProjectStatus;
      buildLog?: string;
      outputDir?: string;
      architectureChat?: import("@/lib/types").ArchitectureChatTurn[] | null;
    }
  );
  const updated = getProject(id);
  return NextResponse.json({ project: updated });
}
