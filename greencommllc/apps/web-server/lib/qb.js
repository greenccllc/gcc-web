const OAuthClient = require('intuit-oauth');
const QuickBooks = require('node-quickbooks');
const tokens = require('./tokens');

function oauthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QB_REDIRECT_URI,
  });
}

async function refreshIfNeeded(stored) {
  const expiresAt = stored.acquired_at + stored.expires_in * 1000;
  if (Date.now() < expiresAt - 60_000) return stored;

  const client = oauthClient();
  client.setToken(stored);
  const res = await client.refresh();
  const next = { ...res.getJson(), realmId: stored.realmId, acquired_at: Date.now() };
  tokens.save(next);
  return next;
}

async function qbClient() {
  const stored = tokens.load();
  if (!stored) throw new Error('not_connected');
  const fresh = await refreshIfNeeded(stored);

  return new QuickBooks(
    process.env.QB_CLIENT_ID,
    process.env.QB_CLIENT_SECRET,
    fresh.access_token,
    false,
    fresh.realmId,
    process.env.QB_ENVIRONMENT !== 'production',
    false,
    null,
    '2.0',
    fresh.refresh_token,
  );
}

module.exports = { oauthClient, qbClient };
