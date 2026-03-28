import { NextRequest, NextResponse } from "next/server";

import {
  buildSessionFromTokenResponse,
  encodeSession,
  getAppBaseUrl,
  getAuthNonceCookieName,
  getAuthStateCookieName,
  getMicrosoftAuthConfig,
  getSessionCookieName,
  readSignedValue,
} from "@/lib/server/authSession";

export async function GET(request: NextRequest) {
  const { clientId, clientSecret, redirectUri, tokenUrl, scope, baseUrl } = getMicrosoftAuthConfig();
  const appBaseUrl = new URL(baseUrl);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieState = readSignedValue(request.cookies.get(getAuthStateCookieName())?.value);

  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error)}`, appBaseUrl));
  }

  if (!code || !returnedState || !cookieState || returnedState !== cookieState) {
    return NextResponse.redirect(new URL("/sign-in?error=state_mismatch", appBaseUrl));
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      scope,
    }).toString(),
    cache: "no-store",
  });

  const payload = (await tokenResponse.json().catch(() => ({}))) as {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number | string;
    error?: string;
  };

  if (!tokenResponse.ok) {
    const reason = payload.error || `token_${tokenResponse.status}`;
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(reason)}`, appBaseUrl));
  }

  const session = buildSessionFromTokenResponse(payload);
  const destination = new URL("/user", appBaseUrl).toString();
  const response = new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${destination}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in...</title>
  </head>
  <body>
    <p>Signing in...</p>
    <script>window.location.replace(${JSON.stringify(destination)});</script>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
  const secure = new URL(getAppBaseUrl()).protocol === "https:";
  const sameSite = secure ? "none" : "lax";

  response.cookies.set(getSessionCookieName(), encodeSession(session), {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    expires: new Date(session.expiresAt),
  });
  response.cookies.set("user_id", session.user.id, {
    httpOnly: false,
    sameSite,
    secure,
    path: "/",
    expires: new Date(session.expiresAt),
  });
  response.cookies.set("tenant_id", session.user.tenantId, {
    httpOnly: false,
    sameSite,
    secure,
    path: "/",
    expires: new Date(session.expiresAt),
  });
  response.cookies.set("role", "user", {
    httpOnly: false,
    sameSite,
    secure,
    path: "/",
    expires: new Date(session.expiresAt),
  });
  response.cookies.set(getAuthStateCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set(getAuthNonceCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
