import { NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { interruptBuildSession } from "@/lib/build-interrupt";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  interruptBuildSession(id);
  const updated = getProject(id);
  return NextResponse.json({ project: updated });
}
