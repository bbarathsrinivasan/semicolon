import { NextRequest, NextResponse } from "next/server";
import { getProject, getAppSetting } from "@/lib/db";
import { getOutputDir } from "@/lib/claude-code";
import { buildEditorOpenFolderUrl, EditorKind } from "@/lib/editor-url";

const CUSTOM_EDITOR_TEMPLATE_KEY = "custom_editor_template";

function parseEditor(input: string | null): EditorKind {
  if (input === "cursor") return "cursor";
  if (input === "custom") return "custom";
  return "vscode";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const editor = parseEditor(request.nextUrl.searchParams.get("editor"));
  const folderPath = project.outputDir ?? getOutputDir(id);
  const customTemplate = getAppSetting(CUSTOM_EDITOR_TEMPLATE_KEY);

  const launchUrl = buildEditorOpenFolderUrl({
    editor,
    folderPath,
    customTemplate,
  });

  return NextResponse.json({
    editor,
    folderPath,
    launchUrl,
    requiresConfiguration: editor === "custom" && !launchUrl,
  });
}
