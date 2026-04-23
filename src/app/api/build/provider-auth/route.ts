import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/require-session";
import {
  getClaudeAuthSnapshot,
  getCursorAuthSnapshot,
} from "@/lib/build-provider-auth";
import type { BuildProviderId } from "@/lib/build-providers/types";

export async function GET(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const claude = getClaudeAuthSnapshot();
  const cursor = await getCursorAuthSnapshot();

  const providers = {
    claude,
    cursor,
  } satisfies Record<BuildProviderId, typeof claude>;

  return NextResponse.json({ providers });
}
