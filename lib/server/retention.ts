import { serverConfig } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";

export function applyRetentionPolicy(nowIso = new Date().toISOString()) {
  if (serverConfig.retentionDays <= 0) {
    return;
  }

  const cutoffDate = new Date(Date.now() - serverConfig.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();

  db.prepare(
    `
      UPDATE conversations
      SET
        status = 'archived',
        archived_at = COALESCE(archived_at, ?),
        updated_at = ?
      WHERE status = 'active'
        AND deleted_at IS NULL
        AND last_message_at < ?
    `
  ).run(nowIso, nowIso, cutoffDate);
}
