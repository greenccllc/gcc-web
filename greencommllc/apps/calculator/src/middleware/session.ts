/**
 * Cookie-based session middleware.
 *
 * Cookie:        gcc_calc_sid  (httpOnly, secure in prod, sameSite=lax)
 * Cookie value:  signed JWT carrying { sid }, signed with SESSION_SECRET
 *
 * On every request:
 *   1. Read cookie → verify JWT → extract sid
 *   2. Look up sid in user_sessions; assert not revoked, not expired
 *   3. Look up user; assert is_active
 *   4. Hang { user, sessionId } off req.locals
 *
 * Routes that need auth use requireAuth(); requireRole('staff') for staff-only.
 */

import type { NextFunction, Request, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { config } from '../config.js';
import { findActiveSession, revokeSession } from '../db/sessions.js';
import { findById, type UserRow } from '../db/users.js';

const COOKIE_NAME = 'gcc_calc_sid';
const SECRET = new TextEncoder().encode(config.SESSION_SECRET);

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserRow;
    sessionId?: string;
  }
}

// ─── cookie helpers ──────────────────────────────────────────────────────

export async function issueSessionCookie(
  res: Response,
  sessionId: string,
  ttlSeconds = config.SESSION_TTL_SECONDS
): Promise<void> {
  const jwt = await new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .setIssuer('gcc-calc-app')
    .setAudience('gcc-calc-session')
    .sign(SECRET);

  res.cookie(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure:   config.isProd,
    sameSite: 'lax',
    maxAge:   ttlSeconds * 1000,
    path:     '/'
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

async function readCookieSession(req: Request): Promise<string | null> {
  const raw = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, SECRET, {
      issuer:   'gcc-calc-app',
      audience: 'gcc-calc-session'
    });
    const sid = payload['sid'];
    return typeof sid === 'string' ? sid : null;
  } catch {
    return null;
  }
}

// ─── middleware ──────────────────────────────────────────────────────────

/** Populates req.user if there's a valid cookie. Always next()s. */
export async function loadSession(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const sid = await readCookieSession(req);
  if (!sid) { next(); return; }

  const session = await findActiveSession(sid);
  if (!session) { next(); return; }

  const user = await findById(session.user_id);
  if (!user || !user.is_active) {
    // Stale or banned — burn the session row so the next req is consistent
    await revokeSession(sid);
    next();
    return;
  }

  req.user = user;
  req.sessionId = sid;
  next();
}

/** 401 if no req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { res.status(401).json({ error: 'unauthorized' }); return; }
  next();
}

/** 403 if req.user.role isn't in the allowed set. */
export function requireRole(...allowed: ReadonlyArray<UserRow['role']>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'unauthorized' }); return; }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', need: allowed });
      return;
    }
    next();
  };
}
