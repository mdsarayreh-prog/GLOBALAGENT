import { getDb } from "@/lib/server/db";
import { createId } from "@/lib/utils";

interface AuditEventInput {
  actorUserId: string;
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

export function writeAuditEvent(input: AuditEventInput) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO audit_logs (
        id,
        actor_user_id,
        tenant_id,
        action,
        resource_type,
        resource_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    createId("audit"),
    input.actorUserId,
    input.tenantId,
    input.action,
    input.resourceType,
    input.resourceId,
    JSON.stringify(input.metadata ?? {}),
    new Date().toISOString()
  );
}
