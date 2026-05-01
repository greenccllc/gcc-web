# Sign-in & SSO runbook

GCC sign-in is split by audience. The model (after 2026-05-01 retune):

| Path | Audience | Gate | Where it runs |
|------|----------|------|---------------|
| `/admin/*` | greencommllc.com employees (admin console, financials, settings) | **Cloudflare Access** Google Workspace SSO | CF edge |
| `/staff/*` | Operator tools (bc-leads, manage-job, etc.) | gcc-api `X-Gcc-Admin-Secret` (tray launcher provides via `?secret=…`) | gcc-api .NET |
| `/clients/*` | External clients + landing page | gcc-api session cookie (email + password) | gcc-api .NET |
| `/` and other top-level marketing pages | Public | none | static |

The unified landing page is `/clients/` — visitors choose **Client**
(stays on tabs) or **Staff** (redirects to `/admin/console/` → CF Access).

---

## Cloudflare Access — `/admin/*` gate (LIVE)

**Provisioned 2026-05-01.** Edge gate on `greencommllc.com/admin`
that returns a 302 to `greencomm.cloudflareaccess.com` for any visitor
without a valid Access JWT. After Google sign-in restricted to
`@greencommllc.com`, CF stamps a 12-hour cookie and the request flows
through.

### What was provisioned

- **Account**: `5d5385be79ab1dfa09def1fe76e04d73` (greencomm)
- **Identity Provider**:
  - Name: `Google Workspace (greencommllc.com)`
  - Type: `google-apps` with `apps_domain=greencommllc.com`
  - ID: `56c481b1-d923-4702-a760-b34c42a6ab8c`
- **Access App**:
  - Name: `GCC Admin`
  - Domain: `greencommllc.com/admin`
  - Type: `self_hosted`
  - Session duration: 12 hours
  - ID: `fdcf2fa1-6eda-4d95-b446-675e35a0f0c4`
- **Policy**:
  - Name: `Allow greencommllc.com employees`
  - Decision: `allow`
  - Match: emails matching `*@greencommllc.com`
  - ID: `8b279efb-dea1-4f88-87d4-a3f3b7b7e09d`

### Verifying

```pwsh
$ Invoke-WebRequest https://greencommllc.com/admin/console/ -MaximumRedirection 0
# expect: 302 → https://greencomm.cloudflareaccess.com/cdn-cgi/access/login/...
```

### OAuth client (powering CF Access Google IDP)

- IAP-managed OAuth client under brand
  `projects/699304045834/brands/699304045834` (orgInternalOnly=true).
- Client ID: `699304045834-e3mr7uusj76kimo5hum5etnjcgokll4c.apps.googleusercontent.com`
  (also stored in Secret Manager as `admin-staff-google-client-id`).
- Client secret: `admin-staff-google-client-secret` in Secret Manager
  + same value in the CF Access IDP config.

### Editing via API

```pwsh
$cfHdr = @{ Authorization = "Bearer $(secret 'admin-cloudflare-api-token')" }
$acct = '5d5385be79ab1dfa09def1fe76e04d73'
# List apps
Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$acct/access/apps" -Headers $cfHdr
# Read GCC Admin app
Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$acct/access/apps/fdcf2fa1-6eda-4d95-b446-675e35a0f0c4" -Headers $cfHdr
# List policies for our app
Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$acct/access/apps/fdcf2fa1-6eda-4d95-b446-675e35a0f0c4/policies" -Headers $cfHdr
```

---

## `/staff/*` — operator tools (no SSO; tray-launcher gated)

`/staff/*` pages (bc-leads, manage-job, etc.) are NOT behind Cloudflare
Access. They are intended to be opened via the GCC Manager tray
launcher which appends `?secret=<api-secret>` to every URL it opens.

If a staff page is hit directly without a session, its first API call
(`GET /api/admin/jobs`, etc.) returns 401 and the existing client-side
helper redirects the visitor to `/clients/?next=<original-url>` — i.e.
the unified landing page.

### Tray-launcher path

1. Operator clicks "Open Manager" in the tray.
2. The launcher opens `https://greencommllc.com/staff/bc-leads.html?secret=…`.
3. The page captures the secret into `localStorage.gccAdminSecret` and
   makes API calls with `X-Gcc-Admin-Secret` set to it.

### Direct-visit fallback

1. Visitor opens `https://greencommllc.com/staff/bc-leads.html` (no secret).
2. The page boots, makes its first API call, gets 401.
3. The page's API helper calls `location.href = '/clients/?next=/staff/bc-leads.html'`.
4. The visitor lands on the unified sign-in page where they can pick
   Client (existing tabs) or Staff (→ /admin/ → CF Access).

---

## `/clients/` — unified landing page

`/clients/index.html` is the single sign-in entry point. It serves
both clients and staff.

### Audience picker

Above the existing sign-in/sign-up tabs there is a 2-up tile picker:

- **🏢 Client** — stays on the page; clients use the email+password
  tabs below to sign in or create an account.
- **🔧 Staff** — anchor link to `/admin/console/`; CF Access kicks in
  and routes through Google Workspace SSO.

### Marketing-page CTAs

Existing marketing pages (`/index.html`, `/about.html`, `/projects.html`,
etc.) link to `/clients/` for "Client login" and `/staff/` for "Staff
login". The Staff link still works — direct hits to `/staff/` redirect
back to `/clients/` via the 401 fallback above, where the visitor
picks the **Staff** tile and goes through SSO. The fallback adds one
hop but it's transparent.
