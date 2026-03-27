import { NextResponse } from "next/server";

import {
  createRandomState,
  createSignedValue,
  getAppBaseUrl,
  getAuthNonceCookieName,
  getAuthStateCookieName,
  getMicrosoftAuthConfig,
} from "@/lib/server/authSession";

export async function GET() {
  const { authorizeUrl, clientId, redirectUri, scope } = getMicrosoftAuthConfig();
  const state = createRandomState();
  const nonce = createRandomState();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope,
    state,
    nonce,
  });

  const response = NextResponse.redirect(`${authorizeUrl}?${params.toString()}`);
  const secure = new URL(getAppBaseUrl()).protocol === "https:";

  response.cookies.set(getAuthStateCookieName(), createSignedValue(state), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
  response.cookies.set(getAuthNonceCookieName(), createSignedValue(nonce), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });

  return response;
}
