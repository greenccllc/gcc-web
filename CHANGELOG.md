# Changelog

All notable changes to the GCC LLC public site + portal land here. The release
workflow (`.github/workflows/release.yml`) reads the matching section by version
when a new tag is cut.

## v1.1.0 — Settings consolidation + Places autocomplete

Five-commit batch on top of v1.0.0. No breaking changes; portal users keep
existing logins and saved estimates.

### Settings & integrations
- Admin and client settings unified into one role-aware page — staff and
  customers now hit the same surface, with admin-only sections gated server-side
- Bundler API keys surfaced as individual integration cards, visible to all
  roles (read-only for non-admins) so the connector inventory is discoverable

### Forms
- Google Places address autocomplete wired into the contact form and the
  client profile page — fewer typos in the address fields that feed proposals
  and invoices

### Content
- Removed WBE/MBE, woman-owned, and minority-owned claims sitewide so the
  public site reflects the current certification state

### Plumbing
- `/admin/console/` build refreshed with a fetch-prefix wrapper so the embedded
  React app talks to gcc-api through the same base URL the rest of the site uses

## v1.0.0 — Mobile/perf pass + full design-system rebuild

First tagged release. Two-part overhaul shipped together via PR #1.

### Mobile + performance
- 16px form inputs (kills iOS zoom-on-focus)
- 44px tap targets across `.btn`, `.menu-toggle`, the num-stepper, and mobile nav links
- Mobile drawer locks body scroll while open; closes on link tap, outside click, Escape, or breakpoint change
- New responsive blocks at ≤600px and ≤480px: tighter sections, full-width strip CTAs, single-column hero stats, estimator stepper stacks below the label on narrow screens
- Safe-area-inset padding, `text-wrap: balance`, `scroll-margin-top` for sticky-header anchors
- `prefers-reduced-motion` honored; clean print stylesheet
- `viewport-fit=cover` on every page; `defer` on every `/assets/js/*` script
- `quickbooks.html` inline IIFE moved inside `DOMContentLoaded` so the now-deferred `gccApi` is ready

### Design system
- Inter via Google Fonts (`@import` + `font-display: swap`)
- Forest stays `#1E4D2B`; gold refined `#D4AF37` → `#C9A158`; warmer green-tinted neutrals; deeper ink
- New tokens: 4-based spacing scale (`--s-1` … `--s-24`), softer multi-layer shadows, focus ring, bumped radius (8 / 12 / 16 / 22)
- Polished `.btn` plus size variants `.btn-sm` / `.btn-lg` / `.btn-block`
- Polished `.card` plus `.card-elevated` / `.card-interactive` / `.card-flush`
- Subtle dot-pattern overlay on the hero; refined gradient stops
- New components: `.stepper`, `.badge` (+ gold/slate), `.tag`, `.surface`, `.divider`, `.kbd`, `.kpi`, `.tbl`, `.calc-mini`, plus the `.signup-step` family
- Subtle card fade-up on first paint, gated on `prefers-reduced-motion: no-preference`
- Every existing class name preserved so portal pages (`clients/*`, `staff/*`, `admin/*`) inherit the refreshed look automatically

### Sign-up rebuilt as a 4-step flow
- Single `<form id="form-signup">` retains every input — same JS contract preserved
- Step 1: account type (residential / commercial) as tap-friendly cards
- Step 2: account details with inline validation
- Step 3: mini-estimator teaser (residential: APs / cameras / smart locks; commercial: drops / cameras / doors) with live `$X – $Y` and a "Skip teaser" link
- Step 4: review with per-row Edit links and the final "Create Account →" submit
- After successful signup, best-effort `gccApi.saveEstimate()` persists the teaser so it shows up in the portal; failure is non-fatal and never blocks the redirect
- Sign-in tab still reachable; `#signup` hash still deep-links to signup mode

### Modernized landing
- Hero now has a `.calc-mini` card directly under it: drops / cameras / doors with a live "Rough range" output and a "See full breakdown →" deep-link that carries values to `/estimator.html` via querystring
- New "How it works" 3-step row using the new `.badge` component (Plans → Install → As-builts)
- `estimator.html` reads `?drops=&cameras=&doors=&speakers=&fiberRuns=&serverRooms=` on load and dispatches `input` + `change` so the existing `estimator.js` recompute fires

### Tooling
- New `.github/workflows/release.yml`: bumping `VERSION` + adding a CHANGELOG section creates a tagged GitHub release automatically
