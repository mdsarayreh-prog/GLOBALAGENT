import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set("role", "admin", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
