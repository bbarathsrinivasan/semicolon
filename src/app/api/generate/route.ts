import { NextResponse } from "next/server";
import { generateArchitecture } from "@/lib/claude";
import { getProject, updateProject } from "@/lib/db";
import { ProjectSpec } from "@/lib/types";
import { requireSessionUser } from "@/lib/require-session";

export async function POST(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  try {
    const { projectId, spec } = (await request.json()) as {
      projectId: string;
      spec: ProjectSpec;
    };

    if (!projectId || !spec) {
      return NextResponse.json(
        { error: "projectId and spec are required" },
        { status: 400 }
      );
    }

    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const architecture = await generateArchitecture(spec);

    // Add default status to all nodes
    architecture.nodes = architecture.nodes.map((n) => ({
      ...n,
      port: n.port ?? null,
      status: n.status ?? "idle",
    }));

    updateProject(projectId, {
      architecture,
      status: "diagramming",
    });

    return NextResponse.json({ architecture });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate architecture" },
      { status: 500 }
    );
  }
}
