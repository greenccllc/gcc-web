# AGENTS.md

## Project overview

Static HTML/CSS/JS website for GCC LLC (Green Communications Contracting) — a Division 27/28 low-voltage cabling contractor. No build step, no package manager, no bundler. The repo is deployed to IIS via a git-pull scheduled task (`publish.ps1`).

Production: https://greencommllc.com

## Cursor Cloud specific instructions

### Running the dev server

Serve the site locally with any static file server from the repo root:

```
python3 -m http.server 8080 --directory /workspace
```

All pages are then at `http://localhost:8080/`. No build step is required.

### Architecture (for context)

- This repo contains **only the static frontend**. The backend API (`gcc-api`, .NET minimal API on port 5099) and Admin Console Express server (port 3001) live in separate, private repos not available here.
- The site's JS calls the API via `/assets/js/api.js` which expects `api.greencommllc.com` — those calls will 404 or fail locally. Marketing pages, estimators, and contact form UI all render and function client-side without the API.
- `/admin/console/` contains a pre-built React SPA (bundled, no source code in this repo).

### What works locally without the API

- All marketing pages (`/index.html`, `/about.html`, `/services.html`, `/projects.html`, `/contact.html`, `/support.html`)
- Cost estimators (`/estimate/commercial.html`, `/estimate/residential.html`) — fully client-side JS calculations
- Client login/signup UI (`/clients/index.html`) — form renders but auth calls will fail
- Admin dashboard pages (`/admin/*.html`) — UI renders but data fetches will fail

### Linting / validation

No linter is configured (no `package.json`, no `.eslintrc`). For quick validation:

- **HTML parse check:** `python3 -c "import html.parser, os; ..."`  (see setup session for snippet)
- **JS syntax check:** `node -e "..."` wrapping each file in `new Function(...)` catches syntax errors

### Quote Agent (optional microservice in-repo)

`/ops/quote-agent.js` is a standalone Node.js HTTP receiver (port 7101). Run with `node ops/quote-agent.js`. It's only relevant for lead-handling workflows and not needed for frontend dev.

### Key paths

| Path | Purpose |
|------|---------|
| `assets/css/` | All stylesheets (tokens, site, chrome, page-specific) |
| `assets/js/` | All client-side JS (shared + page-specific) |
| `estimate/` | Cost estimator pages (commercial + residential) |
| `clients/` | Customer portal (login, dashboard, estimator, invoices, profile, settings) |
| `admin/` | Staff portal (leads, pipeline, proposals, financials, compliance, marketing) |
| `db/` | SQL Server DDL schema files (reference only, DB is external) |
| `docs/design-system/` | Design tokens, component catalog, governance docs |
