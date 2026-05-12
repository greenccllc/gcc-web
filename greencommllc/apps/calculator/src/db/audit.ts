/**
 * Append-only audit log. Every auth event + every artifact render writes
 * one row here. Read-only after insert.
 */

import { query } from './pool.js';

export interface AuditEvent {
  userId?: string | null | undefined;
  event: string;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  metadata?: Record<string, unknown> | null | undefined;
}

export async function logEvent(e: AuditEvent): Promise<void> {
  await query(
    `INSERT INTO audit_log (user_id, event, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      e.userId ?? null,
      e.event,
      e.ipAddress ?? null,
      e.userAgent ?? null,
      e.metadata ? JSON.stringify(e.metadata) : null
    ]
  );
}
