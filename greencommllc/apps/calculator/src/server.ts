/**
 * Entry point. Wires middleware, mounts routers, starts the HTTP server,
 * handles graceful shutdown.
 *
 * Routes:
 *   GET  /healthz              — liveness
 *   GET  /readyz               — pg ping
 *   GET  /                     — serves public/index.html (calc shell)
 *   /auth/*                    — signup/login/logout/me/google
 *   /api/projects/*            — project CRUD
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { pool, query, shutdown } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

const app = express();

// ─── core middleware ─────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(pinoHttp({
  level: config.isProd ? 'info' : 'debug',
  redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password']
}));

app.use(helmet({
  // CSP: allow embedding from configured parent origins (e.g. greencommllc.com)
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'frame-ancestors': ["'self'", ...config.allowedParentOrigins]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: config.allowedParentOrigins,
  credentials: true
}));

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── liveness/readiness ──────────────────────────────────────────────────
app.get('/healthz', (_req, res) => { res.json({ ok: true }); });
app.get('/readyz', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : 'unknown'
    });
  }
});

// ─── routers ─────────────────────────────────────────────────────────────
app.use('/auth',          authRouter);
app.use('/api/projects',  projectsRouter);

// ─── static frontend ─────────────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR, { index: 'index.html', maxAge: 0 }));

// SPA fallback — serve index.html for any non-API path
app.get(/^\/(?!api|auth|healthz|readyz).*/, (_req, res) => {
  res.sendFile(resolve(PUBLIC_DIR, 'index.html'));
});

// ─── error handler ───────────────────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('unhandled error:', err);
  res.status(500).json({ error: 'internal_error', message: config.isProd ? undefined : message });
});

// ─── boot ────────────────────────────────────────────────────────────────
async function boot(): Promise<void> {
  // pg ping at boot — fail fast if Postgres isn't reachable
  try {
    await query('SELECT 1');
  } catch (err) {
    console.error('Postgres unreachable at boot:', err);
    process.exit(2);
  }

  const server = app.listen(config.PORT, () => {
    console.log(
      `calc-app listening on :${config.PORT}` +
      ` (${config.NODE_ENV})` +
      ` allowed parents: ${config.allowedParentOrigins.join(', ')}`
    );
  });

  const stop = async (signal: string): Promise<void> => {
    console.log(`\nReceived ${signal} — shutting down...`);
    server.close(() => { console.log('http server closed'); });
    await shutdown();
    console.log('postgres pool drained');
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop('SIGTERM'));
  process.on('SIGINT',  () => void stop('SIGINT'));
}

void boot();
void pool;
