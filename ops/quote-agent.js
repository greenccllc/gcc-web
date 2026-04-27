// ============================================================
// GCC Quote Agent — minimal receiver on 127.0.0.1:7100
//
// Receives fire-and-forget POSTs from the main API after a lead
// is recorded. Validates X-Shared-Secret, logs the lead, and
// (later) hands off to a Composio-driven draft generator.
//
// Run:  node quote-agent.js
// Service: installed as scheduled task "GCC-QuoteAgent"
// ============================================================
const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST   = '127.0.0.1';
// Default port matches QuoteAgent.Url in API appsettings.json. Override via --port=N or QA_PORT env.
const argPort = (process.argv.find(a => a.startsWith('--port=')) || '').split('=')[1];
const PORT    = parseInt(argPort || process.env.QA_PORT || '7101', 10);
const SECRET = process.env.QA_SECRET || 'ZT6zb1m1eFVglfeP0PRkpjxmN40ap4FZB6KJUMGzRqM';
const LOG    = process.env.QA_LOG    || 'C:\\Users\\nmorr\\AppData\\Local\\Temp\\quote-agent.log';
const INBOX  = process.env.QA_INBOX  || 'C:\\GCC_LLC\\IIS\\gcc-files\\_quote-agent-inbox';

fs.mkdirSync(INBOX, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch (_) {}
  try { process.stdout.write(line); } catch (_) {}
}

// Constant-time header compare to avoid timing oracle
function timingSafeEquals(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch (_) { return false; }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  if (url.pathname !== '/quote-agent' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  // Auth check
  const sig = req.headers['x-shared-secret'] || '';
  if (!timingSafeEquals(sig, SECRET)) {
    log(`REJECT ${req.socket.remoteAddress} missing/bad shared secret`);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  let body = '';
  req.on('data', c => { body += c; if (body.length > 1_000_000) { req.destroy(); } });
  req.on('end', () => {
    let lead;
    try { lead = JSON.parse(body); }
    catch (e) {
      log(`PARSE-ERR ${e.message}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad json' }));
      return;
    }

    const id = (lead && lead.id) || 'unknown';
    const ts = Date.now();
    const fn = path.join(INBOX, `${ts}-lead-${id}.json`);
    try {
      fs.writeFileSync(fn, JSON.stringify(lead, null, 2), { encoding: 'utf8' });
      log(`RECV lead id=${id} from=${lead.email || lead.phone || '??'} -> ${fn}`);
    } catch (e) {
      log(`WRITE-ERR ${e.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'write failed' }));
      return;
    }

    // ── Future: kick off Composio draft-gen workflow here ──
    // For now we just ack and persist for later batch processing.

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, id, inbox: path.basename(fn) }));
  });
});

server.listen(PORT, HOST, () => {
  log(`QuoteAgent listening on http://${HOST}:${PORT}  inbox=${INBOX}`);
});

server.on('error', err => {
  log(`SERVER-ERR ${err.message}`);
  process.exit(1);
});
