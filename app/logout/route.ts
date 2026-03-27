import { NextRequest, NextResponse } from "next/server";

import {
  destroySession,
  getAppBaseUrl,
  getAuthNonceCookieName,
  getAuthStateCookieName,
  getSessionCookieName,
} from "@/lib/server/authSession";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url));
  const secure = new URL(getAppBaseUrl()).protocol === "https:";
  destroySession(request.cookies.get(getSessionCookieName())?.value);

  response.cookies.set(getSessionCookieName(), "", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
    expires: new Date(0),
  });
  response.cookies.set("role", "", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure,
    expires: new Date(0),
  });
  response.cookies.set("user_id", "", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure,
    expires: new Date(0),
  });
  response.cookies.set("tenant_id", "", {
    path: "/",
    sameSite: "lax",
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
