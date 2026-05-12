require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const qbRoutes = require('./routes/quickbooks');
const apsRoutes = require('./routes/aps');
const aidriveRoutes = require('./routes/aidrive');
const geminiRoutes = require('./routes/gemini');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// Trust the IIS reverse-proxy in front of us so req.ip and protocol
// reflect the real client, not 127.0.0.1.
app.set('trust proxy', true);

// CORS: comma-separated allow-list via CLIENT_ORIGIN. Default covers prod
// origins only — for local dev, set CLIENT_ORIGIN in .env (see .env.example).
const corsOrigins = (process.env.CLIENT_ORIGIN ||
  'https://greencommllc.com,https://www.greencommllc.com,https://app.greencommllc.com,https://api.greencommllc.com'
).split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);          // curl, server-to-server
    if (corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true
}));
app.use(express.json());

// In production this server sits behind a Cloudflare Tunnel that routes
// www.greencommllc.com/admin/console/api/* and /admin/console/auth/* to us.
// cloudflared doesn't strip path prefixes, so requests arrive with the
// /admin/console prefix intact. Strip it before any router sees the URL,
// so routes can stay mounted at /api and /auth in both dev and prod.
app.use((req, _res, next) => {
  if (req.url.startsWith('/admin/console')) {
    req.url = req.url.slice('/admin/console'.length) || '/';
  }
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/api/qb', qbRoutes);
app.use('/api/aps', apsRoutes);
app.use('/api/aidrive', aidriveRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/webhooks', webhookRoutes);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`server listening on port ${port}`));
