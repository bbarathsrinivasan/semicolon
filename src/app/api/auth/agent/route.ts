import { NextResponse } from "next/server";
import { updateUserDefaultBuildProvider } from "@/lib/db";
import { resolveBuildProviderId } from "@/lib/build-providers";
import type { BuildProviderId } from "@/lib/build-providers/types";
import { requireSessionUser } from "@/lib/require-session";
import { assertBuildProviderAuthenticated } from "@/lib/build-provider-auth";

export async function PUT(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  try {
    const body = (await request.json()) as {
      defaultBuildProvider?: unknown;
    };
    if (typeof body.defaultBuildProvider !== "string") {
      return NextResponse.json(
        { error: "defaultBuildProvider string required" },
        { status: 400 }
      );
    }
    const id = resolveBuildProviderId(
      body.defaultBuildProvider
    ) as BuildProviderId;
    if (id !== userOrRes.defaultBuildProvider) {
      const gate = await assertBuildProviderAuthenticated(id);
      if (!gate.ok) {
        return NextResponse.json(
          {
            error: "Connect this coding agent before selecting it as default.",
            provider: id,
            auth: gate.snapshot,
          },
          { status: 403 }
        );
      }
    }
    updateUserDefaultBuildProvider(userOrRes.id, id);
    return NextResponse.json({
      user: { ...userOrRes, defaultBuildProvider: id },
    });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
