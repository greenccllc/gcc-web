# GCC Proposal Components — Code Connect bundle

Two mirrored libraries + a Figma Code Connect manifest that turns the
redesigned proposal mockups into a reusable component system.

## The three pieces

```
code-connect/
├── tokens/                  Shared brand tokens (CSS custom props + TypeScript)
│   ├── tokens.css           Consumed by Jinja partials at render time
│   └── tokens.ts            Consumed by React components at build time
│
├── jinja/                   PDF render path (WeasyPrint)
│   ├── base.html            Page skeleton with @page footer rules
│   └── macros/all.html      All 34 components as Jinja macros
│
├── react/                   Docs + Figma Code Connect target
│   ├── src/components.tsx   All 34 components as typed React FCs
│   ├── src/styles.css       Scoped component styles (gcc- prefix)
│   ├── src/index.ts         Barrel export for @figma/code-connect
│   ├── package.json         @figma/code-connect + React peer deps
│   └── tsconfig.json
│
├── figma.code-connect.ts    Manifest — maps each React component → Figma node
├── figma.config.json        Code Connect parser config
└── COMPONENT-INVENTORY.md   Authoritative list of every component
```

## Why two libraries

React is what Code Connect speaks natively, and it's the library Dev Mode
shows to designers. Jinja is what the bundler actually renders to PDF via
WeasyPrint. They mirror each other 1:1 — same component names, same props,
same visual output — so a change to the Figma design has exactly one
React file and one Jinja macro to update.

## Tokens are the contract

Both libraries read the same brand tokens (colors, type scale, spacing).
If the design system evolves in Figma, updating `tokens.css` /
`tokens.ts` propagates to every component in both libraries without
touching individual component code.

## Figma node IDs are TODOs until the Figma file exists

Every entry in `figma.code-connect.ts` points at a placeholder URL:

```ts
'https://www.figma.com/design/TBD_FILE_KEY/GCC-Proposals?node-id=TBD-PRICE_HERO_BAND'
```

When you (or I) stand up the Figma file, find-and-replace `TBD_FILE_KEY`
with the real file key, and replace each `TBD-<COMPONENT>` with the real
node ID for the matching Figma component. The manifest is otherwise
complete and run-ready.

## How the bundler uses this

Current `build_proposal.py` (832-line ReportLab script) gets deprecated.
The new bundler is a thin Python glue script:

1. Load YAML example (`examples/bid-example.yaml`)
2. Load the matching base template (`jinja/base.html`) with the right
   proposal-type partial imports
3. Render through Jinja with the YAML as context
4. Pipe to WeasyPrint → PDF

React library is never invoked at PDF-render time. It exists for Figma
Code Connect + Storybook / docs / potential future web preview.

## Running Code Connect

After filling in real Figma node IDs:

```bash
# from code-connect/
npx @figma/code-connect publish --token $FIGMA_TOKEN
```

This publishes the mapping to the Figma file so Dev Mode shows the
actual React code (and, via the companion `codeExample` field, the
equivalent Jinja macro call) next to each component in Figma.

## What's built

- [x] Tokens — `tokens.css` + `tokens.ts` (shared contract)
- [x] All 34 React components with typed props — `react/src/components.tsx`
- [x] All 34 Jinja macros (mirror of React) — `jinja/macros/all.html`
- [x] Component styles — `react/src/styles.css` (all `.gcc-*` classes)
- [x] `figma.code-connect.ts` manifest — 34 entries, placeholder Figma URLs
- [x] Minimal `package.json` + `tsconfig.json`
- [x] Jinja `base.html` with WeasyPrint `@page` footer rules
- [x] Code Connect config — `figma.config.json`

## What's pending

- [ ] Real Figma file + node IDs — find-and-replace `TBD_FILE_KEY` and `TBD-<COMPONENT>`
- [ ] Storybook stories (one per component) for visual review
- [ ] Python glue script (`render_proposal.py`) that wires YAML → Jinja → WeasyPrint
- [ ] CI check: every React component has a matching Jinja macro with the same props
- [ ] Snapshot tests against the 4 reference mockups in `redesign/mockups/`
