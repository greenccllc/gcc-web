# QuickBooks Integration Setup

The API supports QuickBooks Online via OAuth 2.0. You need to create an Intuit
Developer app and paste its credentials into `appsettings.json`.

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
2. Choose **Development Settings** (sandbox) for initial testing, or **Production Settings** for live data.
3. Copy the **Client ID** and **Client Secret**.

## 3. Set the Redirect URI

In the same **Keys & OAuth** tab, add this to the **Redirect URIs** list:

```
http://10.0.0.194:5099/api/qb/callback
```

Or, once HTTPS is live on a public domain:

```
https://api.greencommllc.com/qb/callback
```

Intuit requires an **exact** match including scheme, host, port, and path.

## 4. Paste credentials into `appsettings.json`

Open `C:\inetpub\gcc-api\appsettings.json` and fill in the `Qb` section:

```json
"Qb": {
    "ClientId": "ABwZ...your-client-id...",
    "ClientSecret": "your-client-secret",
    "Environment": "sandbox",
    "RedirectUri": "http://10.0.0.194:5099/api/qb/callback",
    "Scope": "com.intuit.quickbooks.accounting"
}
```

- `Environment` — `sandbox` until you go live, then `production`.
- `RedirectUri` must exactly match what you registered in the Intuit app.

## 5. Restart the API

From an elevated PowerShell:

```powershell
Stop-ScheduledTask  -TaskName "GCC-Api-Service"
Start-ScheduledTask -TaskName "GCC-Api-Service"
```

## 6. Connect QuickBooks

1. Sign in to `https://greencommllc.com/clients/` as an admin.
2. Go to `/admin/financials.html`.
3. Click **Connect QuickBooks**.
4. Log in to Intuit, pick your company, click **Connect**.
5. You'll land back at the financials page with your connection listed.

Tokens are stored encrypted in `dbo.QbConnections` using ASP.NET Data Protection
(keys at `C:\Users\nmorr\.unifi\dp-keys`). Access tokens auto-refresh before
expiry.

## 7. Sync invoices

Click **Sync invoices** next to your connected company. Pulls the most recent
200 invoices from QuickBooks and mirrors them into `dbo.Invoices`, linking to
any matching client by BillEmail.

## Webhooks (real-time event notifications from QB)

Once HTTPS is live on `api.greencommllc.com`:

1. In your Intuit app: **Webhooks → Production Settings → Endpoint URL**:
   ```
   https://api.greencommllc.com/api/qb/webhook
   ```
2. Pick the events you want (Invoice Create/Update/Delete, etc.)
3. Save. Intuit will reveal a **Verifier Token** — click "Show verifier token" and copy it.
4. Save the token to `appsettings.json` → `Qb.WebhookVerifierToken`:
   ```json
   "Qb": {
     ...
     "WebhookVerifierToken": "paste-token-here"
   }
   ```
5. Restart the API:
   ```powershell
   Stop-ScheduledTask  -TaskName "GCC-Api-Service"
   Start-ScheduledTask -TaskName "GCC-Api-Service"
   ```
6. Click **Verify** in Intuit's webhook setup. They send a test POST to
   `/api/qb/webhook` with an `intuit-signature` header (HMAC-SHA256 of body
   with verifier token). Our server verifies the signature in constant time
   and responds 200.

After verification, Intuit will deliver webhook events on every QB change:
- Each event is logged into `dbo.Activity` with action `qb-webhook`
- Invoice events trigger an automatic mirror sync (no need to click Sync)

## Going to production

Once sandbox testing works:
1. In the Intuit app, flip to **Production Keys**.
2. Update `appsettings.json`:
   - `ClientId` + `ClientSecret` to production values
   - `Environment` to `production`
3. Restart the API.
4. Reconnect the app (tokens are environment-scoped).
