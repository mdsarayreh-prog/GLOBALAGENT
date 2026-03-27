import { deleteConversationForScope, getConversationForScope, patchConversationForScope } from "@/lib/server/conversationService";
import { jsonResponse, readJsonBody } from "@/lib/server/http";
import { getRequestContext } from "@/lib/server/requestContext";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PatchConversationRequest {
  title?: string;
  autoRouteEnabled?: boolean;
  status?: "active" | "archived";
  defaultAgentId?: string;
  isPinned?: boolean;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const conversation = getConversationForScope(scope, id);

  if (!conversation) {
    return jsonResponse({ error: "Conversation not found" }, 404);
  }

  return jsonResponse({ data: conversation });
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const body = await readJsonBody<PatchConversationRequest>(request);

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Invalid patch payload" }, 400);
  }

  const updated = patchConversationForScope(scope, id, body);
  if (!updated) {
    return jsonResponse({ error: "Conversation not found" }, 404);
  }

  return jsonResponse({ data: updated });
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const deleted = deleteConversationForScope(scope, id);

  if (!deleted) {
    return jsonResponse({ error: "Conversation not found" }, 404);
  }

  return jsonResponse({ ok: true });
}
