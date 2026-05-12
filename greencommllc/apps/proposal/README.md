# GCC Proposal Generator — TypeScript Rewrite

Vite + TypeScript + Svelte rebuild of the single-file `bundle-builder.html`.

## Status

**Phase 0 — Scaffold (in progress)**

- [x] Project skeleton (`package.json`, `tsconfig.json`, `vite.config.ts`)
- [x] Core types ported: `crosswalk`, `lineItem`, `pricing`, `risk`, `brand`, `intake`
- [x] First pure-function modules ported with unit tests:
  - [x] `src/pricing/decisionScore.ts` + tests
  - [x] `src/viz/svgCharts.ts` + tests
  - [x] `src/risk/seedRedFlags.ts` + tests
- [ ] Svelte shell (`App.svelte`, 4-stage router, store)
- [ ] First Svelte component: Stage 4 Pricing Strategy card

**Phase 1 — Feature parity (not started)**

- [ ] Port intake upload + decoding pipeline
- [ ] Port extraction runs + reconcile
- [ ] Port catalog + line-item editor
- [ ] Port labor plan + cable schedule
- [ ] Port Stage 4 Proposal Configurator

**Phase 2 — Output generators (not started)**

- [ ] Port `gccHtmlShell` to a typed module
- [ ] Port the 13 `onExport*` handlers
- [ ] Swap HTML-as-PDF for real PDFs via `pdf-lib`

See [MIGRATION.md](./MIGRATION.md) for the step-by-step plan.

## Setup

```bash
cd "C:\\Users\\nmorr\\Downloads\\proposal system\\proposal-generator-ts"
npm install
npm run check      # svelte-check + tsc (type-only build)
npm run test       # vitest (unit tests)
npm run dev        # vite dev server
```

## Project Layout

```
src/
  types/           Type definitions (one module per model)
    brand.ts
    crosswalk.ts
    intake.ts
    lineItem.ts
    pricing.ts
    risk.ts
    index.ts        (barrel)
  brand/           GCC brand constants (logos, colors, standards, etc.)
  viz/             Chart generators (SVG — universal output)
    svgCharts.ts
  pricing/         Pricing-strategy engine
    decisionScore.ts
  risk/            Risk + red-flag model
    redFlagCatalog.ts
    seedRedFlags.ts
  renderers/       (reserved) Svelte components
tests/             Vitest unit tests
```

## Why This Stack

| Choice | Why |
|---|---|
| **TypeScript (strict)** | Catches the class of bugs the 340KB single-file JS can't. `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` on. |
| **Svelte** | Smallest jump from vanilla JS. Compiles to plain JS — no React runtime, no virtual DOM bundle. Templating is HTML-shaped. |
| **Vite** | Fast dev loop. Zero-config TS + Svelte. |
| **Vitest** | Same ergonomics as Jest but runs on Vite's transform pipeline. |
| **pdf-lib** | Real PDF generation without a headless browser. Replaces the HTML-renamed-`.pdf` trick. |
| **mermaid** | Keep the diagram story intact (gantt / infrastructure flowcharts). |

## Copyright / Internal Use

Internal GCC LLC tooling. Not for redistribution.
