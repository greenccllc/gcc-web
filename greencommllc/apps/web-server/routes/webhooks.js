const express = require('express');
const store = require('../lib/webhookStore');

const router = express.Router();

// Thumbtack sends one of: lead.* / message.* / review.*
// We classify on event_type / type / kind keys but always store the raw payload.
function classifyThumbtackKind(body) {
  const t = (body?.event_type || body?.type || body?.kind || '').toLowerCase();
  if (t.startsWith('lead'))    return 'lead';
  if (t.startsWith('message')) return 'message';
  if (t.startsWith('review'))  return 'review';
  // Heuristic fallback if Thumbtack doesn't send a discriminator we recognize.
  if (body?.lead || body?.lead_id)        return 'lead';
  if (body?.message || body?.message_id)  return 'message';
  if (body?.review || body?.review_id)    return 'review';
  return 'unknown';
}

// POST /api/webhooks/thumbtack — endpoint URL pasted into the Thumbtack
// "Create a webhook" form. No auth required (Thumbtack offers none).
router.post('/thumbtack', express.json({ limit: '1mb' }), (req, res) => {
  const kind = classifyThumbtackKind(req.body);
  const event = store.append('thumbtack', kind, req.body);
  res.status(200).json({ ok: true, id: event.id, kind });
});

// GET /api/webhooks/health — gives Thumbtack (or you) something to test.
router.get('/thumbtack', (_req, res) => {
  res.json({ ok: true, source: 'thumbtack', method: 'POST' });
});

// GET /api/webhooks/events?source=thumbtack&kind=lead
router.get('/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({
    items: store.list({
      source: req.query.source,
      kind: req.query.kind,
      limit,
    }),
  });
});

// DELETE /api/webhooks/events?source=thumbtack — clear (with optional filter)
router.delete('/events', (req, res) => {
  store.clear({ source: req.query.source, kind: req.query.kind });
  res.json({ ok: true });
});

module.exports = router;
