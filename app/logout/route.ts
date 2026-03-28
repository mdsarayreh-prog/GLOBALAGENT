import { NextRequest, NextResponse } from "next/server";

import {
  destroySession,
  getAppBaseUrl,
  getAuthNonceCookieName,
  getAuthStateCookieName,
  getSessionCookieName,
} from "@/lib/server/authSession";

export async function GET(request: NextRequest) {
  const appBaseUrl = new URL(getAppBaseUrl());
  const response = NextResponse.redirect(new URL("/sign-in", appBaseUrl));
  const secure = appBaseUrl.protocol === "https:";
  const sameSite = secure ? "none" : "lax";
  destroySession(request.cookies.get(getSessionCookieName())?.value);

  response.cookies.set(getSessionCookieName(), "", {
    path: "/",
    sameSite,
    httpOnly: true,
    secure,
    expires: new Date(0),
  });
  response.cookies.set("role", "", {
    path: "/",
    sameSite,
    httpOnly: false,
    secure,
    expires: new Date(0),
  });
  response.cookies.set("user_id", "", {
    path: "/",
    sameSite,
    httpOnly: false,
    secure,
    expires: new Date(0),
  });
  response.cookies.set("tenant_id", "", {
    path: "/",
    sameSite,
    httpOnly: false,
    secure,
    expires: new Date(0),
  });
  response.cookies.set(getAuthStateCookieName(), "", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
    expires: new Date(0),
  });
  response.cookies.set(getAuthNonceCookieName(), "", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
    expires: new Date(0),
  });

  return response;
}
