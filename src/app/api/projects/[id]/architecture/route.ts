import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";
import { requireSessionUser } from "@/lib/require-session";
import { reviseArchitecture } from "@/lib/claude";
import { Architecture, ArchitectureChatTurn } from "@/lib/types";

const ASSISTANT_SUCCESS =
  "Architecture updated. The diagram now reflects your changes. Ask for more edits anytime.";

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
  if (!project.architecture) {
    return NextResponse.json(
      { error: "No architecture to edit" },
      { status: 400 }
    );
  }
  if (project.status === "building") {
    return NextResponse.json(
      { error: "Cannot edit architecture while a build is in progress" },
      { status: 409 }
    );
  }

  const body = (await request.json()) as { messages?: ArchitectureChatTurn[] };
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array required" },
      { status: 400 }
    );
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return NextResponse.json(
      { error: "At least one user message is required" },
      { status: 400 }
    );
  }

  try {
    const next = await reviseArchitecture(
      project.architecture,
      messages,
      project.spec
    );

    const normalized: Architecture = {
      nodes: next.nodes.map((n) => ({
        ...n,
        port: n.port ?? null,
        status: n.status ?? "idle",
      })),
      edges: next.edges,
    };

    const savedMessages: ArchitectureChatTurn[] = [
      ...messages,
      { role: "assistant", content: ASSISTANT_SUCCESS },
    ];

    updateProject(id, {
      architecture: normalized,
      architectureChat: savedMessages,
    });

    return NextResponse.json({
      architecture: normalized,
      messages: savedMessages,
      project: getProject(id),
    });
  } catch (e) {
    console.error("reviseArchitecture:", e);
    const detail =
      e instanceof Error ? e.message : "Failed to update architecture";
    const savedMessages: ArchitectureChatTurn[] = [
      ...messages,
      {
        role: "assistant",
        content: `Could not apply that change: ${detail}`,
      },
    ];
    updateProject(id, { architectureChat: savedMessages });
    return NextResponse.json(
      {
        error: "Failed to update architecture",
        messages: savedMessages,
        project: getProject(id),
      },
      { status: 500 }
    );
  }
}
