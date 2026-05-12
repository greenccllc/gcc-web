/**
 * Minimal Google OAuth client. We don't need passport for this — the flow
 * is two HTTPS calls (authorize URL + token exchange). Keeps the dep tree
 * shallower and the code easier to audit.
 */

import { config } from '../config.js';

const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  /** Google Workspace hosted-domain claim (e.g. "greencommllc.com"). */
  hd?: string;
}

/** Returns the URL to redirect the user to. Scopes: openid + email + profile. */
export function buildGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     config.GOOGLE_CLIENT_ID,
    redirect_uri:  config.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
    prompt:        'select_account'
  });
  if (config.GOOGLE_HOSTED_DOMAIN) {
    params.set('hd', config.GOOGLE_HOSTED_DOMAIN);
  }
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface IdTokenPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  hd?: string;
}

/**
 * Exchange the auth code for tokens, then decode the id_token (no signature
 * check — id_tokens come from a TLS connection to googleapis.com so we
 * trust the channel; if you want belt-and-suspenders, verify with jwks).
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id:     config.GOOGLE_CLIENT_ID,
    client_secret: config.GOOGLE_CLIENT_SECRET,
    redirect_uri:  config.GOOGLE_CALLBACK_URL,
    grant_type:    'authorization_code'
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${detail}`);
  }
  const tok = (await res.json()) as TokenResponse;

  const payload = decodeIdTokenPayload(tok.id_token);

  const profile: GoogleProfile = {
    sub:   payload.sub,
    email: payload.email
  };
  if (payload.email_verified !== undefined) profile.email_verified = payload.email_verified;
  if (payload.name    !== undefined)        profile.name           = payload.name;
  if (payload.picture !== undefined)        profile.picture        = payload.picture;
  if (payload.hd      !== undefined)        profile.hd             = payload.hd;
  return profile;
}

function decodeIdTokenPayload(idToken: string): IdTokenPayload {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed id_token');
  }
  const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json) as IdTokenPayload;
}
