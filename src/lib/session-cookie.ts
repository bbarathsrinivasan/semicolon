import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

export { SESSION_COOKIE_NAME };
