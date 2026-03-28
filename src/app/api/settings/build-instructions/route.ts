import { NextResponse } from "next/server";
import {
  getStoredBuildInstructions,
  setBuildInstructionsMarkdown,
} from "@/lib/db";
import { DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN } from "@/lib/build-instructions-default";

export async function GET() {
  const stored = getStoredBuildInstructions();
  return NextResponse.json({
    markdown: stored === undefined ? DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN : stored,
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { markdown?: unknown };
    if (typeof body.markdown !== "string") {
      return NextResponse.json(
        { error: "markdown string required" },
        { status: 400 }
      );
    }
    setBuildInstructionsMarkdown(body.markdown);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
