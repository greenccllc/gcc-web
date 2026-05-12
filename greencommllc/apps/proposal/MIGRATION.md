# Migration Plan — `bundle-builder.html` → TypeScript/Svelte

## Guiding principle

**Ship the legacy file forward alongside the rewrite.** Never big-bang. Every module that lands in `proposal-generator-ts/` should be unit-tested and verifiably equivalent to the legacy behavior before the legacy version is retired.

## Snapshot policy

The legacy file lives at `../Proposal Generator/bundle-builder.html`. Numbered snapshots (`Bundler V01.html`, `Bundler V02.html`, …) are taken whenever a meaningful feature lands. We keep the last 5 snapshots.

## Phase 0 — Scaffold *(COMPLETE)*

Non-destructive. The new project compiles and tests independently; the legacy file is untouched.

- [x] `package.json`, `tsconfig.json` (strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`), `vite.config.ts` with path aliases
- [x] Full type model:
  - `crosswalk` — `CrosswalkEntry`, `TokenCategory`, `PHASE_REQUIRED_CATS`
  - `lineItem` — `LineItem`, `LineSource`, `Totals`
  - `pricing` — `PricingTier`, `PricingTiers`, `DecisionInputs`, `DecisionResult`
  - `risk` — `RedFlag`, `RedFlagRule`, `RedFlagTestContext`
  - `brand` — `GccBrand`, `BrandColors`, `LogoVariant`
  - `intake` — `IntakeState` (the single source of truth)
- [x] Three pure-function modules ported with unit tests:
  - `src/pricing/decisionScore.ts` — `computeDecisionScore()`
  - `src/viz/svgCharts.ts` — `svgBarChart`, `svgDonut`, `svgWaterfall`, `svgGauge`
  - `src/risk/seedRedFlags.ts` — `seedRedFlags`, `mergeRedFlags`, `buildRedFlagContext`

## Phase 1 — Svelte shell + Stage 4 *(COMPLETE)*

Stage 4 Proposal Configurator renders in the new stack using the already-ported pricing + risk modules, reading from `intakeStore.svelte.ts` (mirrors the legacy `gcc-intake-v1` / `gcc-session-v1` localStorage keys).

- [x] `src/App.svelte` — shell
- [x] `src/store/intakeStore.svelte.ts` — `$state`-backed intake + session with persistence
- [x] `src/components/JobHeader.svelte` — sticky top header driven by crosswalk
- [x] `src/components/Stage4.svelte` — full Proposal Configurator (Customization strip, Closeout, Pricing, Decision, Alts, Risk, Labor, Financial Summary, TOC, Preview modal)
- [x] All Stage 4 sub-components ported with unit tests: 64 tests pinning legacy behavior.

## Phase 2 — Port the remaining renderers *(IN PROGRESS)*

One renderer per pull request. Each PR must include:
- The Svelte component
- The pure-function module it depends on (extracted and typed)
- Unit tests for the pure function
- A screenshot diff against the legacy version

Order (by reader-visible impact):
1. **Stage 1** — file upload + decoder pipeline *(COMPLETE for texty-file path; PDF/DWG path pending)*
   - [x] `src/decoders/classify.ts` — `classifyFile()`, `isTextyFile()`, sheet-code + scale extraction. 14 pinning tests.
   - [x] `src/decoders/takeoff.ts` — `DEVICE_LEXICON`, `TAKEOFF_MAP`, `takeoffToCandidates()`, `parseTakeoffJson()`. 12 pinning tests (2D×20 → 40 drops, FIBER×4 → 48 strands).
   - [x] `src/components/Stage1Intake.svelte` — drag-drop zone + file picker + takeoff-JSON import + deterministic-scan button + file list with class/sheet/scale chips.
   - [ ] pdf.js text extraction (PDF → text)
   - [ ] DWG/image OCR path
2. **Stage 1** — crosswalk extraction runs *(IN PROGRESS)*
   - [x] `src/decoders/runs.ts` — `tryParseJson()`, `recordCandidate()`, `runCounts()`, `reduceCandidates()` — the data-manipulation layer from legacy parse/dict/conf/synth, cleanly portable without a backend. 15 pinning tests including the score → conf → count tie-break ordering.
   - [x] `src/decoders/deterministicScan.ts` — regex-based token hunter. Finds `data_drops_count`, `ap_count`, `camera_count_commercial`, `door_positions_count`, `fiber_strands_count`, `rack_count` in texty files. 14 tests. TS-app replacement for the Claude-powered parse phase until a backend ships.
   - [x] Stage1Intake "Run scan" button — creates a run from every parsed texty file, reduces across all runs, merges into crosswalk (respecting user-locked entries).
   - [ ] LLM-backed parse/dict/conf/synth phases — blocked on a backend that can proxy Claude API calls.
3. **Stage 2** — catalog + line-item editor *(editor COMPLETE; picker pending)*
   - [x] `src/components/Stage2Catalog.svelte` — editable qty / sale / cost / hours grid grouped by source (eq / ma / sv), live margin + totals, per-row delete, "+ Add line" per group.
   - [ ] Catalog picker (drag-in from master tree) + scope-library suggestions — legacy CATALOG data still runs in `bundle-builder.html`.
4. **Stage 2** — live quote preview + weekly labor *(pending — still runs in legacy center pane)*
5. **Stage 3** — docs review + open items *(editable snapshot COMPLETE; per-file cards pending)*
   - [x] `src/components/Stage3Review.svelte` — files-by-class counts, add/resolve/remove open items, supplement + closeout toggle lists with presets (after-hours, prevailing wage, bonding, cert scan, as-builts, extended warranty; closeout: test results, as-builts, O&M, training, warranty letter, license transfers).
   - [ ] Per-file docs-review cards (pdf.js-extracted highlights) — blocked on PDF text extraction.
6. **Router + navigation** *(COMPLETE)*
   - [x] `src/components/StageNav.svelte` — 4-step sticky stepper, clickable + keyboard-navigable, reads/writes `store.intake.stage`.
   - [x] `src/App.svelte` — `{#if stage === 'intake'} ...` router replacing the hardcoded `<Stage4 />`.

**Phase 2 scorecard (this cut):** 119/119 tests, 0 svelte-check errors, production build at 147 kB JS (52 kB gzipped). All four stages are editable in the new stack:
- **Stage 1**: file upload + classify + takeoff-JSON import + deterministic regex-based scan that produces candidate runs and merges them into the crosswalk without an LLM.
- **Stage 2**: full line-item editor (qty / sale / cost / hours) grouped by source with live margin.
- **Stage 3**: add/resolve/remove open items + supplement + closeout toggles.
- **Stage 4**: fully ported (Customization, Closeout, Pricing, Decision, Alts, Risk, Labor, Financial Summary, TOC, Preview).

What still runs in the legacy `bundle-builder.html`: PDF text extraction, DWG vector parsing, master catalog picker, LLM-backed parse/dict/conf/synth extraction.

## Phase 3 — Output documents

Pure string functions today (`gccHtmlShell`, `onExportBidOverview`, etc.) port cleanly. The big architectural decision: do we keep HTML-as-PDF or switch to real PDFs?

**Recommended path:**

| Feature | Today | Target |
|---|---|---|
| Short customer docs (cover, overview, proposal) | HTML renamed `.pdf` → user prints from browser | **`pdf-lib`** — real PDF, embedded fonts, proper bookmarks |
| Finance Summary (internal) | HTML renamed `.xlsx` → opens in Excel | **SheetJS** (already loaded) — real XLSX with cell types |
| Master Extraction / Drop Counts (internal text) | Markdown | Unchanged (plain text is fine) |

Move `gccHtmlShell` to `src/outputs/shellHtml.ts` as a typed string builder. Move each `onExport*` into `src/outputs/<name>.ts`. Each output function takes `(intake, state, brand)` as arguments — no more globals.

## Phase 4 — Retire the legacy file

Once:
- [ ] All 4 stages render in the new app
- [ ] All 13 output generators produce docs passing a byte-for-byte diff (modulo timestamps) against legacy
- [ ] Load + save round-trips preserve intake state

…the legacy file moves to `archive/` and the new app takes over `index.html`.

## Things that will NOT change

- **Brand values** (GCC colors, standards, tagline, etc.) — copied verbatim into `src/brand/gcc.ts`.
- **Pricing math** (`_sellPrice`, per-drop floor/ceiling, 3-bucket split) — ported 1:1, with unit tests pinning the exact legacy output.
- **Red-flag rules** — catalog already ported. Adding new rules is append-only.

## Things that WILL change (deliberately)

- **No more globals**. `intake` becomes a Svelte store. `state` becomes part of `SessionState`. `GCC_BRAND` becomes an imported const.
- **No more string-concat HTML**. Renderers become Svelte components.
- **No more silent failures**. Everything is typed; errors surface at compile time or in test.
- **Real PDFs**. `pdf-lib` replaces the HTML-rename hack for customer-facing documents.
- **CI**. A GitHub Action runs `npm run check` and `npm run test` on every push.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Rewrite drifts from legacy behavior | Every ported module has pinning tests. Screenshot diff per Svelte component. |
| Migration loses steam after Phase 1 | Phases are independently shippable. Legacy app works while the rewrite progresses. |
| PDF fidelity regression | A/B the first 2–3 ported output docs side-by-side with printed legacy PDFs before removing the legacy fallback. |
| Bundle size growth | `manualChunks` split in vite.config is pre-wired (commented). Mermaid + pdf-lib are the big ones. |

## How to resume

If work resumes after a break:

1. Run `npm install` then `npm run test` — all Phase-0 tests should pass.
2. Open [README.md](./README.md) Status section to find the next checklist item.
3. `git log --oneline -- src/` in the legacy repo to see what new renderers landed that need to be back-ported.
