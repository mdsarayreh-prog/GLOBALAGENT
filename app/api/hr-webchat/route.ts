import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/server/authSession";
import { HR_COPILOT_DIRECT_URL } from "@/lib/server/hrCopilotClient";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    return NextResponse.json({
      token: session.accessToken,
      directConnectUrl: HR_COPILOT_DIRECT_URL,
      user: session.user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown HR Copilot token error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
