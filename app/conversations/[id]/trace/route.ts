import { getTraceEventsForScope } from "@/lib/server/conversationService";
import { jsonResponse } from "@/lib/server/http";
import { getRequestContext } from "@/lib/server/requestContext";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const { searchParams } = new URL(request.url);

  const messageId = searchParams.get("message_id");
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;

  const traces = getTraceEventsForScope(scope, id, messageId, limit);
  if (!traces) {
    return jsonResponse({ error: "Conversation not found" }, 404);
  }

  return jsonResponse({ data: traces });
}
