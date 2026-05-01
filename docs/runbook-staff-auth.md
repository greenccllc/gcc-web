# Staff sign-in setup runbook

`/staff/*` pages are gated behind a Google sign-in restricted to
`@greencommllc.com`. The gate has two layers — pick the one matching
your security posture:

| Layer | What it blocks | Setup effort | Where it runs |
|-------|----------------|--------------|---------------|
| **Layer 1 (shipped)** | Casual visitors + crawlers | 5 min Google Cloud Console | Browser (client-side JS) |
| **Layer 2 (recommended)** | Anyone — true edge gate | 5 min Cloudflare dashboard | Cloudflare edge |

The gcc-api side is already protected via `X-Gcc-Admin-Secret`, so
Layer 1 alone is sufficient to keep the staff UI off the public
internet. Layer 2 adds defense-in-depth at the edge so even the page
HTML never reaches a non-employee browser.

---

## Layer 1: Google OAuth Client ID (REQUIRED)

The shipped `/staff/login.html` page renders a "Sign in with Google"
button that picks the user's Google Workspace account, validates its
`hd` (hosted domain) claim is `greencommllc.com`, and stamps a 12-hour
sessionStorage cookie. Without a client ID the page surfaces a clear
error.

### Steps

1. Open <https://console.cloud.google.com/apis/credentials> and pick
   the GCC project (`micro-enigma-494403-d0`).
2. Click **+ Create credentials → OAuth client ID**.
   - **Application type**: Web application
   - **Name**: `GCC Staff Sign-in`
   - **Authorized JavaScript origins**:
     - `https://greencommllc.com`
     - `https://www.greencommllc.com`
     - (optional dev) `http://localhost:5173`
   - **Authorized redirect URIs**: leave empty (we use the GIS
     credential flow, not redirect)
3. Click **Create**. Copy the **Client ID** (`xxxxxx.apps.googleusercontent.com`).
4. Drop it into `assets/js/config.js` on the deployed site:

   ```js
   window.GCC_AUTH_CONFIG = {
     googleClientId: 'xxxxxxxxxxxxxxxx.apps.googleusercontent.com',
     allowedDomain: 'greencommllc.com',
   };
   ```

   Or store the value in Secret Manager as
   `infra-gcc-staff-google-client-id` and let `publish.ps1` (gcc-site
   deploy script) write `assets/js/config.js` from the secret. See
   `assets/js/config.example.js` for the shape.
5. Publish gcc-site (auto-syncs to IIS via the GCC-Site-Sync task).
6. Open <https://greencommllc.com/staff/bc-leads.html> in incognito —
   you should bounce to `/staff/login.html`. Sign in with your
   greencommllc.com account; you land back on bc-leads.html.

### Tray-launcher bypass

The auth gate honors `?secret=<api-secret>` on the URL — when present
it stamps the same 12-hour sessionStorage entry without requiring
Google sign-in. The tray launcher's "Open Manager" link already
appends `?secret=…`, so operator workflows are unaffected.

---

## Layer 2: Cloudflare Access (RECOMMENDED, DASHBOARD-ONLY)

Adds an edge-level gate so the HTML never reaches non-employees, even
if they bypass the client-side script. Five minutes via the dashboard.
The current gcc-site Cloudflare API token does not have Access:Edit
permissions, so this step is manual.

### Steps

1. Open <https://one.dash.cloudflare.com/5d5385be79ab1dfa09def1fe76e04d73/access/apps>.
2. Click **Add an application → Self-hosted**.
3. Configure:
   - **Application name**: `GCC Staff`
   - **Session duration**: 12 hours
   - **Application domain**:
     - subdomain: (blank)
     - domain: `greencommllc.com`
     - path: `/staff`
   - Toggle **Enable AppLauncher** off (operator-only app)
4. Click **Next**, then add a policy:
   - **Policy name**: `greencommllc.com employees`
   - **Action**: Allow
   - **Configure rules → Selector**: Emails ending in
     `@greencommllc.com`
5. Click **Next → Add an Identity provider → Google**:
   - If no Google IDP exists yet: **+ Add new** → Google → paste the
     same OAuth Client ID + secret from Layer 1.
6. Click **Add application**.
7. Test in incognito: <https://greencommllc.com/staff/bc-leads.html>
   should now show the Cloudflare Access login page. After signing
   in with a `@greencommllc.com` email, you land on the staff page
   AND clear the client-side gate (since you're already authenticated
   at the edge).

### What survives both layers

- Tray launcher with `?secret=` URL param — still works (Cloudflare
  Access doesn't filter the query string; the staff-auth.js gate
  honors `secret` first).
- gcc-api endpoints — unaffected by either layer; they continue to
  enforce `X-Gcc-Admin-Secret` independently.
