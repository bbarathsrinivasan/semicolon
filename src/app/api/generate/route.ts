import { NextResponse } from "next/server";
import { generateArchitecture } from "@/lib/claude";
import { updateProject } from "@/lib/db";
import { ProjectSpec } from "@/lib/types";

export async function POST(request: Request) {
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
