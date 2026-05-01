# Staff sign-in setup runbook

**Status (2026-05-01): both layers are live.** Anyone hitting
`https://greencommllc.com/staff/*` is bounced to a Google Workspace
sign-in restricted to `@greencommllc.com`.

| Layer | What it blocks | Status | Where it runs |
|-------|----------------|--------|---------------|
| **Layer 1** | Casual visitors + crawlers | ✅ live (`assets/js/staff-auth.js`) | Browser (client-side JS) |
| **Layer 2** | Anyone — edge gate before HTML serves | ✅ live (Cloudflare Access app `GCC Staff`) | Cloudflare edge |
| **gcc-api** | API calls without secret | ✅ live (X-Gcc-Admin-Secret) | gcc-api .NET middleware |

---

## Layer 1: Google OAuth Client ID (LIVE)

**Provisioned 2026-05-01.** The `/staff/login.html` page renders a
"Sign in with Google" button that picks the user's Google Workspace
account, validates its `hd` (hosted domain) claim is
`greencommllc.com`, and stamps a 12-hour sessionStorage cookie.

### What was provisioned

- **OAuth client**: created via IAP API under brand
  `projects/699304045834/brands/699304045834` (orgInternalOnly=true,
  so only `@greencommllc.com` Workspace users can complete the flow
  even without further restriction).
- **Client ID** (public, in `assets/js/config.js`):
  `699304045834-e3mr7uusj76kimo5hum5etnjcgokll4c.apps.googleusercontent.com`
- **Client Secret**: stored in Secret Manager as
  `admin-staff-google-client-secret` (used by Cloudflare Access).
- **Display name**: `GCC Staff Sign-in (Cloudflare Access + /staff/login.html)`

### Rotating

To rotate the Client Secret:
1. Open <https://console.cloud.google.com/apis/credentials> in the GCC
   project (`micro-enigma-494403-d0`) and find the IAP-Owned client
   `GCC Staff Sign-in (...)`.
2. Reset the secret. Update Secret Manager:
   - `admin-staff-google-client-secret` ← new secret
3. Update the Cloudflare Access IDP `Google Workspace (greencommllc.com)`
   with the new secret (PATCH on
   `accounts/{acct}/access/identity_providers/56c481b1-d923-4702-a760-b34c42a6ab8c`).

### Tray-launcher bypass

The Layer 1 gate honors `?secret=<api-secret>` on the URL — when
present it stamps the 12-hour sessionStorage entry without Google
sign-in. **However Cloudflare Access (Layer 2) does NOT honor query
strings**, so tray-launcher operators must complete Google sign-in
once per 12-hour CF Access session. After that, all `/staff/*`
navigation flows through normally.

---

## Layer 2: Cloudflare Access (LIVE)

**Provisioned 2026-05-01.** Edge gate on `greencommllc.com/staff`
returning a 302 to `greencomm.cloudflareaccess.com` for any visitor
without a valid Access JWT.

### What was provisioned

- **Account**: `5d5385be79ab1dfa09def1fe76e04d73` (greencomm)
- **Identity Provider**:
  - Name: `Google Workspace (greencommllc.com)`
  - Type: `google-apps` with `apps_domain=greencommllc.com`
  - ID: `56c481b1-d923-4702-a760-b34c42a6ab8c`
- **Access App**:
  - Name: `GCC Staff`
  - Domain: `greencommllc.com/staff`
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
$ Invoke-WebRequest https://greencommllc.com/staff/bc-leads.html -MaximumRedirection 0
# expect: 302 → https://greencomm.cloudflareaccess.com/cdn-cgi/access/login/...
```

### Editing via API

```pwsh
$cfHdr = @{ Authorization = "Bearer $(secret 'admin-cloudflare-api-token')" }
$acct = '5d5385be79ab1dfa09def1fe76e04d73'
# List apps
Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$acct/access/apps" -Headers $cfHdr
# List policies for our app
Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$acct/access/apps/fdcf2fa1-6eda-4d95-b446-675e35a0f0c4/policies" -Headers $cfHdr
```

### What survives both layers

- gcc-api endpoints — unaffected by either layer; they continue to
  enforce `X-Gcc-Admin-Secret` independently.
- Layer 1 still runs after Layer 2 — useful for jobs that load the
  page with `?secret=…` from outside the CF zone (e.g. a localhost
  dev preview), since CF Access only protects the live domain.
