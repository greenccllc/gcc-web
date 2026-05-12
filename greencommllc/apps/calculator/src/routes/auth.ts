/**
 * Auth routes:
 *   POST /auth/signup        — email + password (creates user, logs in)
 *   POST /auth/login         — email + password
 *   POST /auth/logout        — revokes session
 *   GET  /auth/me            — returns logged-in user (or 401)
 *   GET  /auth/google        — kicks off Google OAuth
 *   GET  /auth/google/callback
 */

import bcrypt from 'bcrypt';
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { logEvent } from '../db/audit.js';
import {
  createSession,
  revokeSession
} from '../db/sessions.js';
import {
  attachGoogleSub,
  createUser,
  findByEmail,
  findByGoogleSub,
  touchLastLogin,
  type UserRow
} from '../db/users.js';
import {
  clearSessionCookie,
  issueSessionCookie,
  loadSession,
  requireAuth
} from '../middleware/session.js';
import { buildGoogleAuthUrl, exchangeGoogleCode } from '../auth/google.js';

export const authRouter: Router = Router();
authRouter.use(loadSession);

// ─── rate limits ─────────────────────────────────────────────────────────
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' }
});

// ─── helpers ─────────────────────────────────────────────────────────────
function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]!.trim();
  }
  return req.ip ?? null;
}

function publicUser(u: UserRow): Record<string, unknown> {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    orgName: u.org_name,
    emailVerified: u.email_verified
  };
}

async function startSession(
  req: Request,
  res: Response,
  user: UserRow,
  authMethod: 'password' | 'google'
): Promise<void> {
  const session = await createSession({
    userId: user.id,
    authMethod,
    ttlSeconds: config.SESSION_TTL_SECONDS,
    ipAddress: clientIp(req),
    userAgent: req.headers['user-agent'] ?? null
  });
  await issueSessionCookie(res, session.id);
  await touchLastLogin(user.id);
  await logEvent({
    userId: user.id,
    event: `login.${authMethod}`,
    ipAddress: clientIp(req),
    userAgent: req.headers['user-agent'] ?? null
  });
}

// ─── signup ──────────────────────────────────────────────────────────────
const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
  fullName: z.string().min(1).max(120).optional(),
  orgName: z.string().min(1).max(120).optional()
});

authRouter.post('/signup', loginLimit, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
    return;
  }
  const { email, password, fullName, orgName } = parsed.data;

  const existing = await findByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'email_in_use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
  const user = await createUser({
    email,
    passwordHash,
    fullName: fullName ?? null,
    orgName: orgName ?? null,
    role: 'gc'  // self-signup defaults to GC; staff are seeded
  });
  await startSession(req, res, user, 'password');
  res.status(201).json({ user: publicUser(user) });
});

// ─── login ───────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128)
});

authRouter.post('/login', loginLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const { email, password } = parsed.data;
  const user = await findByEmail(email);
  if (!user || !user.password_hash || !user.is_active) {
    await logEvent({ event: 'login.fail', ipAddress: clientIp(req), metadata: { email } });
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await logEvent({ event: 'login.fail', userId: user.id, ipAddress: clientIp(req) });
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  await startSession(req, res, user, 'password');
  res.json({ user: publicUser(user) });
});

// ─── logout ──────────────────────────────────────────────────────────────
authRouter.post('/logout', async (req, res) => {
  if (req.sessionId) {
    await revokeSession(req.sessionId);
    await logEvent({
      userId: req.user?.id ?? null,
      event: 'logout',
      ipAddress: clientIp(req)
    });
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ─── me ──────────────────────────────────────────────────────────────────
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

// ─── google oauth ────────────────────────────────────────────────────────
authRouter.get('/google', (_req, res) => {
  if (!config.googleEnabled) {
    res.status(503).json({ error: 'google_oauth_not_configured' });
    return;
  }
  res.redirect(buildGoogleAuthUrl());
});

authRouter.get('/google/callback', async (req, res) => {
  if (!config.googleEnabled) {
    res.status(503).send('Google OAuth not configured');
    return;
  }
  const code = typeof req.query['code'] === 'string' ? req.query['code'] : '';
  if (!code) {
    res.status(400).send('Missing code');
    return;
  }

  const profile = await exchangeGoogleCode(code);
  if (!profile.email) {
    res.status(400).send('Google did not return an email');
    return;
  }
  if (
    config.GOOGLE_HOSTED_DOMAIN &&
    profile.hd !== config.GOOGLE_HOSTED_DOMAIN
  ) {
    res.status(403).send(`Only ${config.GOOGLE_HOSTED_DOMAIN} accounts are permitted`);
    return;
  }

  let user =
    (await findByGoogleSub(profile.sub)) ??
    (await findByEmail(profile.email));

  if (!user) {
    user = await createUser({
      email: profile.email,
      fullName: profile.name ?? null,
      googleSub: profile.sub,
      emailVerified: true,
      role: profile.hd === 'greencommllc.com' ? 'staff' : 'gc'
    });
  } else if (!user.google_sub) {
    await attachGoogleSub(user.id, profile.sub);
  }

  await startSession(req, res, user, 'google');
  res.redirect('/');
});
