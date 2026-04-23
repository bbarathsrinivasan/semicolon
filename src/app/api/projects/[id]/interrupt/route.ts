import { NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { interruptBuildSession } from "@/lib/build-interrupt";
import { requireSessionUser } from "@/lib/require-session";

export async function POST(
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

  interruptBuildSession(id);
  const updated = getProject(id);
  return NextResponse.json({ project: updated });
}
