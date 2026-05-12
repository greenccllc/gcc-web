/**
 * Session repository. A session row is the source of truth for a logged-in
 * user — the cookie carries only the session id (signed JWT), the row holds
 * the rest. Revoking a row makes the cookie useless on the next request.
 */

import { maybeOne, one, query } from './pool.js';

export type AuthMethod = 'password' | 'google';

export interface SessionRow {
  id: string;
  user_id: string;
  auth_method: AuthMethod;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface CreateSessionInput {
  userId: string;
  authMethod: AuthMethod;
  ttlSeconds: number;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export async function createSession(inp: CreateSessionInput): Promise<SessionRow> {
  return one<SessionRow>(
    `INSERT INTO user_sessions (user_id, auth_method, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)
     RETURNING id, user_id, auth_method, ip_address::text, user_agent,
               created_at, expires_at, revoked_at`,
    [
      inp.userId,
      inp.authMethod,
      inp.ipAddress ?? null,
      inp.userAgent ?? null,
      String(inp.ttlSeconds)
    ]
  );
}

export async function findActiveSession(id: string): Promise<SessionRow | null> {
  return maybeOne<SessionRow>(
    `SELECT id, user_id, auth_method, ip_address::text, user_agent,
            created_at, expires_at, revoked_at
       FROM user_sessions
      WHERE id = $1
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1`,
    [id]
  );
}

export async function revokeSession(id: string): Promise<void> {
  await query(`UPDATE user_sessions SET revoked_at = now() WHERE id = $1`, [id]);
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await query(
    `UPDATE user_sessions SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}
