import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { requireSessionUser } from "@/lib/require-session";

export async function GET(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const projects = listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  try {
    const { name, spec } = await request.json();
    const id = uuidv4();
    const project = createProject(
      id,
      name || "Untitled Project",
      userOrRes.id,
      spec,
      userOrRes.defaultBuildProvider
    );
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
