import { NextResponse } from "next/server";
import { listBuildProviders } from "@/lib/build-providers";
import { requireSessionUser } from "@/lib/require-session";

export async function GET(request: Request) {
  const userOrRes = requireSessionUser(request);
  if (userOrRes instanceof NextResponse) return userOrRes;
  return NextResponse.json({ providers: listBuildProviders() });
}
