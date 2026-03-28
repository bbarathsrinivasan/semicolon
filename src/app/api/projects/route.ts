import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const projects = listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const { name, spec } = await request.json();
    const id = uuidv4();
    const project = createProject(id, name || "Untitled Project", spec);
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
