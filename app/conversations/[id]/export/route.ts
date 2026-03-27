import { exportConversationForScope } from "@/lib/server/conversationService";
import { jsonResponse } from "@/lib/server/http";
import { getRequestContext } from "@/lib/server/requestContext";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const exported = exportConversationForScope(scope, id);

  if (!exported) {
    return jsonResponse({ error: "Conversation not found" }, 404);
  }

  return jsonResponse({ data: exported });
}
