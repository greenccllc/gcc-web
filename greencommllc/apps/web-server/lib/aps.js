const TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token';
const API_BASE = 'https://developer.api.autodesk.com';

let cached = null;

async function getToken() {
  if (cached && Date.now() < cached.expires_at - 60_000) return cached.access_token;

  const id = process.env.APS_CLIENT_ID;
  const secret = process.env.APS_CLIENT_SECRET;
  const scopes = process.env.APS_SCOPES || 'data:read bucket:read';

  if (!id || !secret) throw new Error('aps_not_configured');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: scopes,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`aps_auth_failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cached = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cached.access_token;
}

async function apsFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`aps_${res.status}: ${text}`);
  }
  return res.json();
}

module.exports = { getToken, apsFetch };
