import {
  getUserForSessionToken,
  type SessionUserRow,
} from "@/lib/db";
import type { BuildProviderId } from "@/lib/build-providers/types";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export { SESSION_COOKIE_NAME };

export type SessionUser = {
  id: string;
  email: string;
  defaultBuildProvider: BuildProviderId;
};

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  const raw = cookies[SESSION_COOKIE_NAME];
  return raw && raw.length > 0 ? raw : null;
}

function rowToSessionUser(row: SessionUserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    defaultBuildProvider: row.defaultBuildProvider,
  };
}

export function getSessionUser(request: Request): SessionUser | null {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;
  const row = getUserForSessionToken(token);
  return row ? rowToSessionUser(row) : null;
}
