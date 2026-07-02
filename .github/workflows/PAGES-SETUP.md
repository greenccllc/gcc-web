# Cloudflare Pages deploy for greencommllc.com

This repo publishes the public marketing surface of `greencommllc.com`
to a Cloudflare Pages project named **`gcc-site`** on every push to `main`.

## Current cutover status (2026-07-02)

- `greencommllc.com` and `www.greencommllc.com` DNS point at
  `gcc-site.pages.dev` (was: GCC tunnel `eaab7ba3-...cfargotunnel.com`).
- Public marketing surface is served from Pages.
- Gated portal shells (`/admin`, `/clients`, `/ops`, `/staff`) stay on
  IIS behind the tunnel, reached via `admin.greencommllc.com`,
  `admin-api.greencommllc.com`, `chat.greencommllc.com`.
- `api.greencommllc.com`, `proposal.greencommllc.com`,
  `staff.greencommllc.com`, `phone.greencommllc.com` are unchanged
  (still on IIS behind the tunnel).

## Required repo secrets

The workflow uses two secrets that need to be set in
Settings → Secrets and variables → Actions:

| Secret name              | Value |
|--------------------------|-------|
| `CLOUDFLARE_API_TOKEN`   | Same token as `cloudflare/admin-full-access.json` in the vault |
| `CLOUDFLARE_ACCOUNT_ID`  | `5d5385be79ab1dfa09def1fe76e04d73` |

## Manual deploy (from a workstation with wrangler)

```bash
export CLOUDFLARE_API_TOKEN=<from vault>
export CLOUDFLARE_ACCOUNT_ID=5d5385be79ab1dfa09def1fe76e04d73
npx wrangler pages deploy <dir> --project-name=gcc-site --branch=main
```

Where `<dir>` is a folder containing only the public marketing pages
(NOT `admin/`, `clients/`, `ops/`, `staff/`, or anything gated).

## Note on `phone.greencommllc.com`

The APK at `phone/app-release.apk` is ~45 MiB, over Pages' 25-MiB
per-file limit, so `phone.greencommllc.com` continues to be served
from IIS by the tunnel. If we ever need it on Pages, options:

1. Move the APK to R2 and serve via a Worker.
2. Split `phone.greencommllc.com` into a dedicated Pages project
   that just hosts `phone/index.html` and delegates the APK URL to
   R2 or a signed download link.
