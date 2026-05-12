const express = require('express');
const OAuthClient = require('intuit-oauth');
const { oauthClient } = require('../lib/qb');
const tokens = require('../lib/tokens');

const router = express.Router();

router.get('/connect', (_req, res) => {
  const url = oauthClient().authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: 'gcc-' + Date.now(),
  });
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  try {
    const client = oauthClient();
    const tokenRes = await client.createToken(req.url);
    const data = tokenRes.getJson();
    tokens.save({
      ...data,
      realmId: req.query.realmId,
      acquired_at: Date.now(),
    });
    // CLIENT_ORIGIN can be a comma-separated CORS allow-list; take the first
    // entry as the OAuth redirect target.
    const redirectBase = (process.env.CLIENT_ORIGIN || 'https://app.greencommllc.com')
      .split(',')[0].trim();
    res.redirect(redirectBase + '/?connected=1');
  } catch (err) {
    res.status(500).send('OAuth error: ' + err.message);
  }
});

router.get('/status', (_req, res) => {
  const stored = tokens.load();
  res.json({ connected: !!stored, realmId: stored?.realmId || null });
});

router.post('/disconnect', (_req, res) => {
  tokens.clear();
  res.json({ ok: true });
});

module.exports = router;
