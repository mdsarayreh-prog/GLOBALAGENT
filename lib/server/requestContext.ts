import { AppRole } from "@/lib/access";
import { decodeSession } from "@/lib/server/authSession";

export interface RequestContext {
  userId: string;
  tenantId: string;
  role: AppRole;
  accessToken?: string;
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rest] = chunk.trim().split("=");
    if (!rawKey) {
      return acc;
    }

    const key = rawKey.trim();
    const value = decodeURIComponent(rest.join("=").trim());
    acc[key] = value;
    return acc;
  }, {});
}

function sanitizeId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/[^a-zA-Z0-9_\-:@.]/g, "");
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 120);
}

export function getRequestContext(request: Request): RequestContext {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const forwardedSession = request.headers.get("x-app-session") ?? undefined;
  const session = decodeSession(forwardedSession || cookies.app_session);
  const forwardedAccessToken = sanitizeBearerToken(request.headers.get("x-access-token"));
  const role = cookies.role === "admin" ? "admin" : "user";

  const userId =
    sanitizeId(request.headers.get("x-user-id")) ??
    sanitizeId(session?.user.id) ??
    sanitizeId(cookies.user_id) ??
    (role === "admin" ? "admin-local" : "user-local");

  const tenantId =
    sanitizeId(request.headers.get("x-tenant-id")) ??
    sanitizeId(session?.user.tenantId) ??
    sanitizeId(cookies.tenant_id) ??
    "default-workspace";

  return {
    userId,
    tenantId,
    role,
    accessToken: forwardedAccessToken ?? session?.accessToken,
  };
}

function sanitizeBearerToken(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getPagination(searchParams: URLSearchParams, defaultLimit = 30, maxLimit = 100) {
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "", 10);

  const limit = Number.isFinite(rawLimit) ? Math.min(maxLimit, Math.max(1, rawLimit)) : defaultLimit;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  return { limit, offset };
}
