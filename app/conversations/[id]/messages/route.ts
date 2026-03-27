import { appendUserMessageForScope, getMessagesForScope } from "@/lib/server/conversationService";
import { jsonResponse, readJsonBody } from "@/lib/server/http";
import { getPagination, getRequestContext } from "@/lib/server/requestContext";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PostMessageRequest {
  content?: string;
  contentBlocks?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  parentMessageId?: string | null;
  selectedAgentId?: string;
  autoRouteEnabled?: boolean;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = getPagination(searchParams, 120, 250);

  const result = getMessagesForScope(scope, id, { limit, offset });
  if (!result) {
    return jsonResponse({ error: "Conversation not found" }, 404);
  }

  return jsonResponse({
    data: result.items,
    pagination: {
      total: result.total,
      limit,
      offset,
    },
  });
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const scope = getRequestContext(request);
  const body = await readJsonBody<PostMessageRequest>(request);
  if (!body) {
    return jsonResponse({ error: "Invalid message payload" }, 400);
  }

  const content = typeof body.content === "string" ? body.content : "";
  const result = await appendUserMessageForScope(scope, id, {
    content,
    contentBlocks: body.contentBlocks,
    attachments: body.attachments,
    parentMessageId: body.parentMessageId ?? null,
    selectedAgentId: body.selectedAgentId,
    autoRouteEnabled: body.autoRouteEnabled,
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      return jsonResponse({ error: "Conversation not found" }, 404);
    }

    if (result.error === "archived") {
      return jsonResponse({ error: "Conversation is archived" }, 409);
    }

    return jsonResponse({ error: "Message content is required" }, 400);
  }

  return jsonResponse({
    data: result,
    mode: "immediate",
  });
}
