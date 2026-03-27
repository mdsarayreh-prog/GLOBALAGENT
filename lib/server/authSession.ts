import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { getDb } from "@/lib/server/db";

export interface AppSession {
  user: {
    id: string;
    tenantId: string;
    name: string;
    email: string;
  };
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
}

interface IdTokenClaims {
  oid?: string;
  sub?: string;
  tid?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
}

const SESSION_COOKIE_NAME = "app_session";
const AUTH_STATE_COOKIE_NAME = "auth_state";
const AUTH_NONCE_COOKIE_NAME = "auth_nonce";
const AUTH_SESSIONS_TABLE = "auth_sessions";

function asBaseUrl(value: string | undefined): string {
  return (value?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export function getAppBaseUrl(): string {
  return asBaseUrl(process.env.APP_BASE_URL);
}

export function getMicrosoftAuthConfig() {
  const tenantId = process.env.COPILOT_HR_TENANT_ID?.trim();
  const clientId = process.env.COPILOT_HR_CLIENT_ID?.trim();
  const clientSecret = process.env.COPILOT_HR_CLIENT_SECRET?.trim();

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Microsoft auth configuration in environment.");
  }

  const baseUrl = getAppBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/callback/microsoft`;
  const authorizeUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const scope =
    process.env.COPILOT_HR_DELEGATED_SCOPE?.trim() ||
    "openid profile offline_access https://api.powerplatform.com/.default";

  return { tenantId, clientId, clientSecret, baseUrl, redirectUri, authorizeUrl, tokenUrl, scope };
}

function getSessionSecret(): string {
  return (
    process.env.APP_SESSION_SECRET?.trim() ||
    process.env.COPILOT_HR_CLIENT_SECRET?.trim() ||
    "local-dev-session-secret"
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSignedValue(value: string): string {
  const payload = base64UrlEncode(value);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function readSignedValue(input: string | undefined): string | null {
  if (!input) {
    return null;
  }

  const [payload, signature] = input.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    return base64UrlDecode(payload);
  } catch {
    return null;
  }
}

export function encodeSession(session: AppSession): string {
  const sessionId = persistSession(session);
  return createSignedValue(sessionId);
}

export function decodeSession(value: string | undefined): AppSession | null {
  const sessionId = readSignedValue(value);
  if (!sessionId) {
    return null;
  }

  const session = loadSession(sessionId);
  if (!session) {
    return null;
  }

  return session;
}

export async function getServerSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
}

export function decodeIdTokenClaims(idToken: string): IdTokenClaims {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) {
      return {};
    }

    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IdTokenClaims;
  } catch {
    return {};
  }
}

export function buildSessionFromTokenResponse(tokenResponse: {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
}): AppSession {
  const accessToken = tokenResponse.access_token?.trim();
  const idToken = tokenResponse.id_token?.trim();

  if (!accessToken || !idToken) {
    throw new Error("Microsoft sign-in response was missing access_token or id_token.");
  }

  const claims = decodeIdTokenClaims(idToken);
  const userId = claims.oid || claims.sub || "user";
  const tenantId = claims.tid || "default-workspace";
  const email = claims.preferred_username || claims.email || `${userId}@unknown.local`;
  const name = claims.name || email;
  const expiresIn = Number(tokenResponse.expires_in);
  const expiresAt = Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000 - 60_000;

  return {
    user: {
      id: userId,
      tenantId,
      name,
      email,
    },
    accessToken,
    idToken,
    refreshToken: tokenResponse.refresh_token?.trim(),
    expiresAt,
  };
}

export function createRandomState(): string {
  return randomBytes(24).toString("base64url");
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getAuthStateCookieName(): string {
  return AUTH_STATE_COOKIE_NAME;
}

export function getAuthNonceCookieName(): string {
  return AUTH_NONCE_COOKIE_NAME;
}

function ensureAuthSessionsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${AUTH_SESSIONS_TABLE} (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
      ON ${AUTH_SESSIONS_TABLE} (expires_at);
  `);
}

function persistSession(session: AppSession): string {
  ensureAuthSessionsTable();
  const db = getDb();
  const sessionId = createRandomState();

  db.prepare(
    `
      INSERT INTO ${AUTH_SESSIONS_TABLE} (id, payload_json, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `
  ).run(sessionId, JSON.stringify(session), session.expiresAt, new Date().toISOString());

  return sessionId;
}

function loadSession(sessionId: string): AppSession | null {
  ensureAuthSessionsTable();
  const db = getDb();
  const row = db
    .prepare(`SELECT payload_json, expires_at FROM ${AUTH_SESSIONS_TABLE} WHERE id = ? LIMIT 1`)
    .get(sessionId) as { payload_json: string; expires_at: number } | undefined;

  if (!row) {
    return null;
  }

  if (Number(row.expires_at) <= Date.now()) {
    db.prepare(`DELETE FROM ${AUTH_SESSIONS_TABLE} WHERE id = ?`).run(sessionId);
    return null;
  }

  try {
    const session = JSON.parse(String(row.payload_json)) as AppSession;
    if (!session.accessToken || !session.user?.id || !session.user?.tenantId || !session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function destroySession(value: string | undefined) {
  const sessionId = readSignedValue(value);
  if (!sessionId) {
    return;
  }

  ensureAuthSessionsTable();
  const db = getDb();
  db.prepare(`DELETE FROM ${AUTH_SESSIONS_TABLE} WHERE id = ?`).run(sessionId);
}
