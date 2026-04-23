import { NextResponse } from "next/server";
import { createSession, getUserByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session-cookie";
import { resolveBuildProviderId } from "@/lib/build-providers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const row = getUserByEmail(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createSession(row.id);
    const res = NextResponse.json({
      user: {
        id: row.id,
        email: row.email,
        defaultBuildProvider: resolveBuildProviderId(row.default_build_provider),
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
