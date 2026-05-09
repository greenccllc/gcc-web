# Changelog

All notable changes to the GCC LLC public site + portal land here. The release
workflow (`.github/workflows/release.yml`) reads the matching section by version
when a new tag is cut.

## v2.1.0 — SEO baseline + ops agent + automation gate

Three PRs on top of v2.0.0. No portal or marketing-page behavior changes
visible to end users; everything here is discoverability, ops automation,
and CI guardrails.

### SEO (#16)
- Open Graph + Twitter Card meta on `index.html`, `services.html`,
  `about.html`, `contact.html`, `projects.html`, plus all 5 service
  sub-pages — link unfurls in Slack/iMessage/social now show a card
  instead of a bare URL
- `JSON-LD` `LocalBusiness` schema on `index.html` so Google can render
  rich-result panels
- `sitemap.xml` corrections so the new sub-pages get indexed

### Ops (#18)
- `ops/majic-claude-watcher/` — Windows service (NSSM-hosted) that runs
  on `majic-svr-iis` with four watchers:
  - **PsExecutor** — drop-folder `*.ps1` runner gated by NTFS ACL +
    owner check; quarantines unauthorized scripts
  - **MemorySync** — appends every exec + file move to `filememory.md`
    on the `claudework` share; digests new memory artifacts to Slack
  - **RemoteClaudeSync** — robocopy mirror of each domain server's
    Claude + Cursor session/memory dirs into `claudework\hosts\`
  - **FileSorter** — moves new generated/downloaded files from watched
    user-profile dirs into `FileStore\<host>\<yyyy>\<MM>\<ext>\`
- Slack `chat.postMessage` wrapper with per-channel soft rate limit so
  a runaway watcher cannot flood the channel
- Trust boundary is the NTFS ACL on the drop folder; `Install-Service.ps1`
  sets it explicitly. Stop-gap location: `MIGRATION.md` tracks the
  eventual move to `majic-agent`

### Automation (#17)
- New `.github/workflows/automated-update-approval.yml` + Python script:
  Slack approval gate that bot-driven dependency-update PRs must clear
  before they can auto-merge — humans Approve/Reject from a Slack
  message, the workflow records the decision on the PR
- Docs at `docs/automated-update-approvals.md`

## v2.0.0 — Manager rebuild + marketing facelift + ecosystem dev env

Big batch on top of v1.1.0. The customer-facing marketing site got a visual
refresh, the staff portal was renamed and redesigned as **GCC Manager**, and
the repo now hosts the rest of the greenccllc dev environment alongside the
site code. No portal logins or saved estimates were invalidated.

### Marketing site
- Overhauled visual language and CTA layouts across the public pages (#10) —
  hero illustration, paired CTAs, login-footer fix, refreshed public nav
- Estimator: dropped renovations + HVAC, fixed contrast, stripped legacy chrome
- New `phone.greencommllc.com` landing page + APK distribution for the
  field-tech phone build

### Site structure & auth
- Site restructure: unified chrome, new sitemap, `/staff/` merged into
  `/admin/`, shared nav shell across customer + staff + admin
- SSO gates `/admin/`; `/staff/` falls through to the landing page
- Client-side Google OAuth gate on staff pages with Cloudflare Access docs
- Admin Console tab on bc-leads; admin tools iframe nav fixed so links jump
  to the top window; admin `<title>` renamed Staff → Admin on 8 dashboards

### Manager (was Admin Console)
- Admin Console aligned as **GCC Manager** with the shared nav shell (#7)
- Manager redesign: Source Sans 3 + JetBrains Mono, tighter radii, tabbed
  manage-job layout, theme picker, V# proposal pane
- manage-job: live extraction-readiness strip; Job Requirements card with
  per-pill location tooltips; refined LV scope groups
  (DATA / SECURITY / TELECOMM / AV); Send-to-proposal button + collapsed
  Audit card; AI describe fallback; LV requirements pane under Latest Proposal
- Queue tab: live activity feed; Chihuahua watchdog pane (last-hour vs today,
  60s tick); Restart All + Chihuahua learning; admin-only Manager nav link;
  "Open local folder" link via `LocalJobFolderPath`
- Projects: Bulk extract-full button (+ auto-synth), Syn Conf column, per-row
  Synthesize refresh, Chihuahua watchdog atop the Queue tab
- Proposal popout: bootstrap action + template manifest, "Build all sections"
  button + results panel, fixed close (hidden attr was being overridden),
  inline popout replaces the proposal-worker handoff, Proposal output card on
  manage-job, smoother Synthesize → Accept → Proposal handoff
- Extract-more button: optimistic UI + local-LLM hint, rotates through
  canonical extraction tools
- Estimator wizard + iframe shell + login-page chrome
- bc-leads + `staff/index.html` drop MyAiDrive references

### Shared foundations
- Shared CSS component layer + internal styleguide (#2)
- Inline marketing styles refactored into reusable utility classes (#3)
- Layered CSS token system; site styles migrated onto it (#4)
- Design governance documentation set (#5)
- Shared navigation initialization + hooks refactored (#6)

### Ops & dev environment
- `ops/recover-iis.ps1` — self-elevating one-shot IIS host recovery script
  for the gcc-site box (#8)
- `.github/workflows/budepc01-recovery.yml` — emergency recovery workflow
- `repos/` — sibling greenccllc repos vendored as gitlinks so a single
  `gcc-site` clone surfaces the rest of the ecosystem (#11)
- `AGENTS.md` — full greenccllc ecosystem dev environment notes (25 repos) (#9)
- `.cursor/rules/gcc-house.mdc` shared Cursor rule + narrowed `.cursor/`
  ignore; `.env*` and `.cursor/` ignored as local-only artifacts

### Known gaps
- `repos/` gitlinks ship without a `.gitmodules`, so
  `git submodule update --init` won't auto-clone them yet — follow-up to add
  the mapping or move siblings out of the repo

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
