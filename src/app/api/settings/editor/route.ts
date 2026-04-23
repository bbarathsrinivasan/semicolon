import { NextResponse } from "next/server";
import { getAppSetting, setAppSetting } from "@/lib/db";
import { requireSessionUser } from "@/lib/require-session";

const CUSTOM_EDITOR_TEMPLATE_KEY = "custom_editor_template";

export async function GET(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;
  return NextResponse.json({
    customTemplate: getAppSetting(CUSTOM_EDITOR_TEMPLATE_KEY) ?? "",
  });
}

export async function PUT(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  try {
    const body = (await request.json()) as { customTemplate?: unknown };
    if (typeof body.customTemplate !== "string") {
      return NextResponse.json(
        { error: "customTemplate string required" },
        { status: 400 }
      );
    }
    setAppSetting(CUSTOM_EDITOR_TEMPLATE_KEY, body.customTemplate.trim());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
