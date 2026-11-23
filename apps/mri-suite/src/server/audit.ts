import { q, type Db } from "@/lib/db";
import type { Actor } from "./actor";

export async function audit(db: Db | undefined, actor: Actor | null, action: string, entity?: string | null, entityId?: string | null, details?: unknown) {
  await q(
    `INSERT INTO audit_logs (user_id, username, action, entity, entity_id, details, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [actor?.userId ?? null, actor?.username ?? null, action, entity ?? null, entityId ?? null, details === undefined ? null : JSON.stringify(details), actor?.ip ?? null],
    db,
  );
}
