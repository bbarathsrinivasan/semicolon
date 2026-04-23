import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { getSessionTokenFromRequest } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (token) deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
