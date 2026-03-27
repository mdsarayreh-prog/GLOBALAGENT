import { Activity } from "@microsoft/agents-activity";
import { ConnectionSettings, CopilotStudioClient } from "@microsoft/agents-copilotstudio-client";

const DEFAULT_HR_CONNECTION_URL =
  "https://defaultfbc0f940b6764d6881f04ab427e121.0f.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/copilots_header_2ba33/conversations?api-version=2022-03-01-preview";
const HR_CONNECTION_URL = process.env.COPILOT_HR_URL?.trim() || DEFAULT_HR_CONNECTION_URL;
const HR_AUTH_TOKEN = process.env.COPILOT_HR_AUTH_TOKEN?.trim();
const HR_TENANT_ID = process.env.COPILOT_HR_TENANT_ID?.trim();
const HR_CLIENT_ID = process.env.COPILOT_HR_CLIENT_ID?.trim();
const HR_CLIENT_SECRET = process.env.COPILOT_HR_CLIENT_SECRET?.trim();
const DEFAULT_HR_TOKEN_SCOPE = "https://api.powerplatform.com/.default";
const HR_TOKEN_SCOPE = process.env.COPILOT_HR_TOKEN_SCOPE?.trim() || DEFAULT_HR_TOKEN_SCOPE;
const HR_TOKEN_ENDPOINT = process.env.COPILOT_HR_TOKEN_ENDPOINT?.trim();
export const HR_COPILOT_DIRECT_URL = HR_CONNECTION_URL;

interface CachedHrToken {
  value: string;
  expiresAt: number;
}

interface TokenClaims {
  roles?: string[];
}

let cachedHrToken: CachedHrToken | null = null;
const HR_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.COPILOT_HR_REQUEST_TIMEOUT_MS ?? "15000", 10);

function asText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveHrTokenEndpoint(): string {
  if (HR_TOKEN_ENDPOINT) {
    return HR_TOKEN_ENDPOINT;
  }

  if (!HR_TENANT_ID) {
    throw new Error("Missing COPILOT_HR_TENANT_ID for client credential authentication.");
  }

  return `https://login.microsoftonline.com/${encodeURIComponent(HR_TENANT_ID)}/oauth2/v2.0/token`;
}

function hasHrClientCredentialInputs(): boolean {
  return Boolean(HR_TENANT_ID || HR_CLIENT_ID || HR_CLIENT_SECRET);
}

function decodeJwtClaims(token: string): TokenClaims {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return {};
    }

    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as TokenClaims;
  } catch {
    return {};
  }
}

function ensureCopilotInvokePermission(token: string) {
  const claims = decodeJwtClaims(token);
  if (Array.isArray(claims.roles) && claims.roles.length > 0) {
    return;
  }

  throw new Error(
    "Power Platform token is missing Copilot invocation permissions. Add Power Platform API application permission `CopilotStudio.Copilots.Invoke` to app registration `15fd4b3e-f1af-4b6f-a928-6ce43a68ba6c`, then grant admin consent."
  );
}

async function fetchHrClientCredentialToken(): Promise<string> {
  if (!HR_CLIENT_ID || !HR_CLIENT_SECRET) {
    throw new Error("Missing COPILOT_HR_CLIENT_ID or COPILOT_HR_CLIENT_SECRET for client credential authentication.");
  }

  if (cachedHrToken && cachedHrToken.expiresAt > Date.now()) {
    return cachedHrToken.value;
  }

  const response = await fetch(resolveHrTokenEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: HR_CLIENT_ID,
      client_secret: HR_CLIENT_SECRET,
      scope: HR_TOKEN_SCOPE,
    }).toString(),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`HR token request failed (${response.status}).`);
  }

  const accessToken = asText(payload.access_token);
  if (!accessToken) {
    throw new Error("HR token request succeeded but access_token was missing.");
  }

  ensureCopilotInvokePermission(accessToken);

  const expiresInSeconds = Number(payload.expires_in);
  const refreshInSeconds =
    Number.isFinite(expiresInSeconds) && expiresInSeconds > 90 ? expiresInSeconds - 60 : 300;

  cachedHrToken = {
    value: accessToken,
    expiresAt: Date.now() + refreshInSeconds * 1000,
  };

  return accessToken;
}

async function resolveHrAuthToken(): Promise<string> {
  if (HR_AUTH_TOKEN) {
    return HR_AUTH_TOKEN;
  }

  if (!hasHrClientCredentialInputs()) {
    throw new Error(
      "HR endpoint requires authorization. Set COPILOT_HR_AUTH_TOKEN or configure client credentials (COPILOT_HR_TENANT_ID, COPILOT_HR_CLIENT_ID, COPILOT_HR_CLIENT_SECRET)."
    );
  }

  if (!HR_TENANT_ID || !HR_CLIENT_ID || !HR_CLIENT_SECRET) {
    throw new Error(
      "Incomplete HR client credentials. Set COPILOT_HR_TENANT_ID, COPILOT_HR_CLIENT_ID, and COPILOT_HR_CLIENT_SECRET."
    );
  }

  return fetchHrClientCredentialToken();
}

export async function getHrCopilotAccessToken(): Promise<string> {
  return resolveHrAuthToken();
}

function extractReplyText(activities: Activity[]): string | null {
  const messages = activities.filter((activity) => activity.type === "message");
  for (const activity of messages) {
    if (typeof activity.text === "string" && activity.text.trim()) {
      return activity.text.trim();
    }
  }

  return null;
}

function buildClient(token: string): CopilotStudioClient {
  const settings = new ConnectionSettings({
    directConnectUrl: HR_CONNECTION_URL,
    enableDiagnostics: true,
  });

  return new CopilotStudioClient(settings, token);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

export async function requestHrAgent(prompt: string, accessToken?: string): Promise<string> {
  const token = accessToken?.trim() || (await resolveHrAuthToken());
  const client = buildClient(token);
  const conversationId = crypto.randomUUID();

  const activity = Activity.fromObject({
    type: "message",
    text: prompt,
    locale: "en-US",
    from: {
      id: "global-agent-ui",
      name: "Global Agent UI",
      role: "user",
    },
    conversation: {
      id: conversationId,
    },
  });

  const response = await withTimeout(
    client.executeWithResponse(activity, conversationId),
    HR_REQUEST_TIMEOUT_MS,
    "HR turn execution"
  );
  const reply = extractReplyText(response.activities);
  if (!reply) {
    throw new Error("HR agent returned no readable message.");
  }

  return reply;
}
