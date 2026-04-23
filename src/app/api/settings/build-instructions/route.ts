import { NextResponse } from "next/server";
import {
  getStoredBuildInstructions,
  setBuildInstructionsMarkdown,
} from "@/lib/db";
import { requireSessionUser } from "@/lib/require-session";
import { DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN } from "@/lib/build-instructions-default";

export async function GET() {
  const stored = getStoredBuildInstructions();
  return NextResponse.json({
    markdown: stored === undefined ? DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN : stored,
  });
}

export async function PUT(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

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
