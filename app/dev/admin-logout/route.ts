import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/user", request.url));
  response.cookies.set("role", "", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    expires: new Date(0),
  });

  return response;
}
