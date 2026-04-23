import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/session";

export function requireSessionUser(request: Request): SessionUser | NextResponse {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
