import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}
