import { NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { requireSessionUser } from "@/lib/require-session";
import { getOutputDir } from "@/lib/claude-code";
import { vscodeOpenFolderUrl } from "@/lib/vscode-url";

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

  const folderPath = project.outputDir ?? getOutputDir(id);
  const vscodeUrl = vscodeOpenFolderUrl(folderPath);

  return NextResponse.json({ folderPath, vscodeUrl });
}
