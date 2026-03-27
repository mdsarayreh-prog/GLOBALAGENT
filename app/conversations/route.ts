import { createConversationForScope, listConversationsForScope } from "@/lib/server/conversationService";
import { jsonResponse, readJsonBody } from "@/lib/server/http";
import { getPagination, getRequestContext } from "@/lib/server/requestContext";

export const runtime = "nodejs";

interface CreateConversationRequest {
  title?: string;
  defaultAgentId?: string;
  autoRouteEnabled?: boolean;
}

export async function GET(request: Request): Promise<Response> {
  const context = getRequestContext(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = getPagination(searchParams, 40, 120);
  const search = searchParams.get("search") ?? undefined;

  const result = listConversationsForScope(context, { limit, offset, search });
  return jsonResponse({
    data: result.items,
    pagination: {
      total: result.total,
      limit,
      offset,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const context = getRequestContext(request);
  const body = await readJsonBody<CreateConversationRequest>(request);
  const created = createConversationForScope(context, body ?? {});
  return jsonResponse({ data: created }, 201);
}
