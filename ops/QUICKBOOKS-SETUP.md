# QuickBooks Integration Setup

The API supports QuickBooks Online via OAuth 2.0. You create an Intuit Developer
app, then paste its credentials into **Settings → Infrastructure** (which writes
to Google Cloud Secret Manager). No file edits, no API restart.

## 1. Create an Intuit Developer app

1. Go to https://developer.intuit.com/ and sign in with your Intuit ID (same
   account that owns your QuickBooks company — or create a sandbox company for
   testing first).
2. Click **Dashboard → Create an app**.
3. Pick **QuickBooks Online and Payments** platform.
4. Choose the scope **Accounting** (or add more later if needed).
5. Name the app anything (e.g. `GCC Web`).

## 2. Get the Client ID + Client Secret

In your newly created app:
1. Go to **Keys & OAuth**.
2. Choose **Development Settings** (sandbox) for initial testing, or
   **Production Settings** for live data.
3. Copy the **Client ID** and **Client Secret**.

## 3. Set the Redirect URI

In the same **Keys & OAuth** tab, add this to the **Redirect URIs** list
(production):

```
https://api.greencommllc.com/api/qb/callback
```

Intuit requires an **exact** match including scheme, host, port, and path.

## 4. Save credentials in GCC settings

1. Sign in to greencommllc.com as admin.
2. Open **Settings** (`/clients/settings.html`) → **Infrastructure** tab.
3. For each of the keys below, click **Add new** (or edit if it already exists)
   and paste:

| Key | Value |
|---|---|
| `qb-client-id` | the Client ID from step 2 |
| `qb-client-secret` | the Client Secret from step 2 |
| `qb-redirect-uri` | `https://api.greencommllc.com/api/qb/callback` |

The values are written to Google Cloud Secret Manager (project
`micro-enigma-494403-d0`) under secret IDs `infra-qb-client-id`,
`infra-qb-client-secret`, `infra-qb-redirect-uri`. The API reads them at
request time — **no API restart needed** after saving.

If Secret Manager is unreachable when you save, the value gets written to
`dbo.Settings` instead (the configured fallback). Either path works for the
QB connector.

## 5. Connect QuickBooks

1. From `/admin/financials.html`, click **Connect QuickBooks**.
2. Log in to Intuit, pick your company, click **Connect**.
3. You'll land back at the financials page with your connection listed.

Tokens are stored encrypted in `dbo.QbConnections` using ASP.NET Data Protection
(keys at `C:\Users\nmorr\.unifi\dp-keys`). Access tokens auto-refresh before
expiry — refresh tokens rotate automatically too, so the integration "just keeps
working" without intervention.

## 6. Sync invoices

Click **Sync invoices** next to your connected company. This pulls the most
recent 200 invoices from QuickBooks and mirrors them into `dbo.Invoices`,
linking to any matching client by BillEmail.

## Webhooks (real-time event notifications)

In the Intuit app:

1. **Webhooks → Production Settings → Endpoint URL**:
   ```
   https://api.greencommllc.com/api/qb/webhook
   ```
2. Pick the events you want (Invoice Create/Update/Delete, etc.)
3. Save. Intuit reveals a **Verifier Token** — click "Show verifier token" and
   copy it.
4. Save the verifier into Settings → Infrastructure as
   `qb-webhook-verifier-prod` (and `qb-webhook-verifier-dev` for sandbox).
5. Click **Verify** in Intuit's webhook setup. They send a test POST to
   `/api/qb/webhook` with an `intuit-signature` header (HMAC-SHA256 of body
   with verifier token). Our server verifies the signature in constant time
   and responds 200.

After verification, Intuit will deliver webhook events on every QB change:
- Each event is logged into `dbo.Activity` with action `qb-webhook`
- Invoice events trigger an automatic mirror sync (no need to click Sync)

## Going to production

Once sandbox testing works:
1. In the Intuit app, flip to **Production Keys**.
2. Update `qb-client-id` and `qb-client-secret` in Settings → Infrastructure
   to the production values.
3. Update the `Environment` setting to `production`.
4. Reconnect the app from `/admin/financials.html` (tokens are
   environment-scoped — sandbox tokens don't work in production).

## Troubleshooting

- **`/api/qb/status` returns `{ "configured": false }`**: secrets aren't in
  Secret Manager OR `dbo.Settings`. Confirm in Settings → Infrastructure that
  `qb-client-id` and `qb-client-secret` are set. Recheck their values match
  the Intuit app's Production Settings.
- **`/api/qb/connect` 500s**: usually a redirect-URI mismatch. The value in
  `qb-redirect-uri` must EXACTLY match what's registered in Intuit (scheme,
  host, port, path).
- **Connections show as `disconnected`**: the refresh token expired. Click
  **Disconnect** then **Connect QuickBooks** to re-authorize.
- **Webhook verification fails**: `qb-webhook-verifier-prod` doesn't match
  what Intuit gave you. Re-copy from Intuit's "Show verifier token" — there's
  no trailing whitespace tolerance.

## Where the secrets actually live

| Storage | What's there | Notes |
|---|---|---|
| Google Cloud Secret Manager | `infra-qb-*` secrets | Primary source; gcc-api reads on demand. |
| `dbo.Settings` (per-user, scope=`infra`) | Same keys, fallback copy | Used if SM is unreachable; populated on writes when SM fails, AND by the periodic migration `gcc-ops/gcp_migrate_settings_to_secrets.py`. |
| `dbo.QbConnections` | Encrypted access + refresh tokens | Per-connection, not in Settings/SM at all. Encryption keys at `C:\Users\nmorr\.unifi\dp-keys`. |
