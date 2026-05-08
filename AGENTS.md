# AGENTS.md

## Project overview

This repo (`gcc-site`) is the static HTML/CSS/JS marketing site + customer/staff/admin portal for GCC LLC (Green Communications Contracting) — a Division 27/28 low-voltage cabling contractor. No build step, no package manager, no bundler. Deployed to IIS via git-pull scheduled task (`publish.ps1`).

Production: https://greencommllc.com

The full GCC + MAJIC ecosystem spans 25 repos in the `greenccllc` GitHub org. The sibling repos are cloned into `/workspace/repos/` for cross-repo development.

## Cursor Cloud specific instructions

### Running this site (gcc-site)

```
python3 -m http.server 8080 --directory /workspace
```

All pages at `http://localhost:8080/`. No build step needed.

### Ecosystem services (sibling repos in /workspace/repos/)

| Service | Repo | Stack | Run locally | Port |
|---------|------|-------|-------------|------|
| **gcc-api** | `repos/gcc-api` | ASP.NET Core 8 | `dotnet run` (needs SQL Server + appsettings.json) | 5099 |
| **gcc-scoper** | `repos/gcc-scoper` | Python/FastAPI | `.venv/bin/uvicorn gcc_scoper.main:app --port 5108` | 5108 |
| **majic-app API** | `repos/majic-app/MajicApi` | ASP.NET Core 8 | `dotnet run` (needs SQL Server) | 5000 |
| **majic-app SPA** | `repos/majic-app/spa` | React/Vite/TS | `npm run dev -- --port 5173` | 5173 |
| **google-admin-mcp** | `repos/google-admin-mcp` | Node.js MCP | `node index.js` (needs gcc-api running) | stdio |
| **gcc-bc-scraper** | `repos/gcc-bc-scraper` | Node.js/Playwright | `node scrape.js` (headless browser) | — |
| **proposal-worker** | `repos/proposal-worker` | Python | `.venv/bin/python worker.py` (needs Pub/Sub + GCP) | — |
| **bid-extractor** | `repos/bid-extractor` | Python | `.venv/bin/python worker.py` (needs Pub/Sub + Anthropic key) | — |
| **compliance-checker** | `repos/compliance-checker` | Python | `.venv/bin/python -m compliance` | — |
| **lv-plan-annotator** | `repos/lv-plan-annotator` | Python/OpenCV | Library, no server | — |
| **quote-agent** | `ops/quote-agent.js` (this repo) | Node.js | `node ops/quote-agent.js` | 7101 |

### What works locally without external services

- **gcc-site**: All marketing pages + estimators (client-side JS). Auth/data calls fail without gcc-api.
- **gcc-scoper**: FastAPI starts and responds on `/healthz`. Full inference requires Ollama + GPU.
- **majic-app SPA**: Vite dev server runs. Dashboard renders; live data requires MajicApi backend.
- **compliance-checker**: Full test suite passes (`pytest tests/` — 20 tests).
- **lv-plan-annotator**: Full test suite passes (`pytest tests/` — 9 tests).

### Building .NET projects

.NET 8 SDK installed at `~/.dotnet`. Ensure PATH includes it:
```
export PATH="$HOME/.dotnet:$PATH"
```

All three .csproj projects build cleanly:
- `repos/gcc-api/GccApi` — 0 errors, 13 warnings (unused locals)
- `repos/majic-app/MajicApi` — 0 errors, 0 warnings
- `repos/majic-agent/MajicAgent` — 0 errors, 1 warning (Windows-only API)

### Python repos — venv pattern

Each Python repo has its own `.venv/` with deps installed:
```
cd repos/<name> && .venv/bin/python -m ...
```
Repos: `bid-extractor`, `gcc-scoper`, `compliance-checker`, `proposal-worker`, `lv-plan-annotator`, `docai-training`

### Linting

- **majic-app SPA**: `cd repos/majic-app/spa && npm run lint` (ESLint — has 13 pre-existing lint errors)
- **majic-app SPA TypeScript**: `cd repos/majic-app/spa && npx tsc --noEmit` (passes clean)
- **gcc-site**: No configured linter. Use `node -e "new Function(fs.readFileSync(f,'utf8'))"` for JS syntax checks.

### Tests

- `repos/compliance-checker`: `cd repos/compliance-checker && .venv/bin/python -m pytest tests/ -v` (20 pass)
- `repos/lv-plan-annotator`: `cd repos/lv-plan-annotator && .venv/bin/python -m pytest tests/ -v` (9 pass)

### Key constraints / gotchas

- **gcc-api** targets `windows` platform (IIS, COM, Win32 APIs). It builds on Linux but cannot fully run without SQL Server and Windows services.
- **gcc-scoper** requires Ollama + RTX 3090 GPU for inference. The FastAPI server starts without it but vision/synthesis endpoints return 502.
- **bid-extractor** and **proposal-worker** need GCP Pub/Sub credentials and Anthropic API key.
- **gcc-bc-scraper** needs Playwright + stored BuildingConnected session cookies.
- **gcc-proposal-generator** is an Electron app (Windows desktop only).
- **majic-agent** is a Windows Service (win-x64 runtime, PerformanceCounter APIs).

### Key paths (this repo)

| Path | Purpose |
|------|---------|
| `assets/css/` | All stylesheets (tokens, site, chrome, page-specific) |
| `assets/js/` | All client-side JS (shared + page-specific) |
| `estimate/` | Cost estimator pages (commercial + residential) |
| `clients/` | Customer portal (login, dashboard, estimator, invoices, profile, settings) |
| `admin/` | Staff portal (leads, pipeline, proposals, financials, compliance, marketing) |
| `db/` | SQL Server DDL schema files (reference only, DB is external) |
| `docs/design-system/` | Design tokens, component catalog, governance docs |
