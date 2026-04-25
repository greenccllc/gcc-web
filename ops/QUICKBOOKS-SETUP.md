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

## Going to production

Once sandbox testing works:
1. In the Intuit app, flip to **Production Keys**.
2. Update `appsettings.json`:
   - `ClientId` + `ClientSecret` to production values
   - `Environment` to `production`
3. Restart the API.
4. Reconnect the app (tokens are environment-scoped).
