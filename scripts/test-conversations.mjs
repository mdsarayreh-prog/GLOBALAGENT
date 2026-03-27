import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

const baseUrl = process.env.CONVERSATION_TEST_BASE_URL || "http://127.0.0.1:3217";

async function waitForServer(timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/conversations`, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until server is reachable.
    }
    await sleep(600);
  }
  throw new Error(`Timed out waiting for server on ${baseUrl}`);
}

function scopedHeaders(scope) {
  return {
    "Content-Type": "application/json",
    "x-user-id": scope.userId,
    "x-tenant-id": scope.tenantId,
    Cookie: `role=user; user_id=${scope.userId}; tenant_id=${scope.tenantId}`,
  };
}

async function requestJson(path, options = {}, scope) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...scopedHeaders(scope),
    },
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function runSuite() {
  const scope = {
    userId: `suite_user_${Date.now()}`,
    tenantId: `suite_tenant_${Date.now()}`,
  };
  const outsiderUser = {
    userId: `${scope.userId}_other`,
    tenantId: scope.tenantId,
  };
  const outsiderTenant = {
    userId: scope.userId,
    tenantId: `${scope.tenantId}_other`,
  };

  const createRes = await requestJson(
    "/conversations",
    {
      method: "POST",
      body: JSON.stringify({
        title: "Endpoint CRUD Smoke",
        defaultAgentId: "it",
        autoRouteEnabled: false,
      }),
    },
    scope
  );
  assert.equal(createRes.status, 201, "conversation creation should return 201");
  const conversationId = createRes.payload?.data?.id;
  assert.ok(conversationId, "conversation id should be returned");

  const listRes = await requestJson("/conversations?limit=20&offset=0&search=Endpoint", { method: "GET" }, scope);
  assert.equal(listRes.status, 200, "conversation list should return 200");
  assert.ok(listRes.payload?.data?.some((conversation) => conversation.id === conversationId), "conversation should be visible in list");

  const detailsRes = await requestJson(`/conversations/${conversationId}`, { method: "GET" }, scope);
  assert.equal(detailsRes.status, 200, "conversation details should return 200");
  assert.equal(detailsRes.payload?.data?.title, "Endpoint CRUD Smoke");

  const patchRes = await requestJson(
    `/conversations/${conversationId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: "Endpoint CRUD Updated",
        autoRouteEnabled: true,
        defaultAgentId: "ops",
        isPinned: true,
      }),
    },
    scope
  );
  assert.equal(patchRes.status, 200, "conversation patch should return 200");
  assert.equal(patchRes.payload?.data?.title, "Endpoint CRUD Updated");
  assert.equal(patchRes.payload?.data?.autoRouteEnabled, true);

  const messageRes = await requestJson(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: "Decision: proceed with rollout INC-2026-1001 and avoid weekends.",
        selectedAgentId: "it",
        autoRouteEnabled: false,
      }),
    },
    scope
  );
  assert.equal(messageRes.status, 200, "posting message should return 200");
  assert.ok(messageRes.payload?.data?.userMessage?.id, "user message should be returned");
  assert.ok(messageRes.payload?.data?.assistantMessage?.id, "assistant message should be returned");
  assert.ok(messageRes.payload?.data?.traceEvent?.id, "trace event should be returned");

  const userMessageId = messageRes.payload.data.userMessage.id;

  const messagesRes = await requestJson(`/conversations/${conversationId}/messages?limit=100&offset=0`, { method: "GET" }, scope);
  assert.equal(messagesRes.status, 200, "messages list should return 200");
  assert.ok(messagesRes.payload?.data?.length >= 2, "messages should include user + assistant");

  const traceRes = await requestJson(
    `/conversations/${conversationId}/trace?message_id=${encodeURIComponent(userMessageId)}`,
    { method: "GET" },
    scope
  );
  assert.equal(traceRes.status, 200, "trace endpoint should return 200");
  assert.ok(traceRes.payload?.data?.length >= 1, "trace should include at least one event");

  const exportRes = await requestJson(`/conversations/${conversationId}/export`, { method: "GET" }, scope);
  assert.equal(exportRes.status, 200, "export endpoint should return 200");
  assert.ok(exportRes.payload?.data?.messages?.length >= 2, "export should include messages");
  assert.ok(exportRes.payload?.data?.traceEvents?.length >= 1, "export should include trace events");

  const searchByTextRes = await requestJson("/conversations?search=INC-2026-1001", { method: "GET" }, scope);
  assert.equal(searchByTextRes.status, 200, "search by message text should return 200");
  assert.ok(searchByTextRes.payload?.data?.some((conversation) => conversation.id === conversationId), "search should find conversation by message text");

  const blockedByUserRes = await requestJson(`/conversations/${conversationId}`, { method: "GET" }, outsiderUser);
  assert.equal(blockedByUserRes.status, 404, "different user should not access conversation");

  const blockedByTenantRes = await requestJson(`/conversations/${conversationId}`, { method: "GET" }, outsiderTenant);
  assert.equal(blockedByTenantRes.status, 404, "different tenant should not access conversation");

  console.log("Conversation endpoint suite passed.");
}

await waitForServer();
await runSuite();
