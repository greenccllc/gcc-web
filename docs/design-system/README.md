# Design Governance

This folder defines governance standards for the GCC site design system and implementation consistency.

## Contents

1. [Design Tokens & Usage Rules](./tokens.md)
2. [Component Catalog](./components.md)
3. [Page Template Inventory](./page-templates.md)
4. [Responsive Breakpoints & Spacing Standards](./responsive-spacing.md)
5. [Visual QA Checklist](./visual-qa-checklist.md)
6. [Migration Tracker](./migration-tracker.md)

## Governance Process

- Update token and component docs before shipping new UI patterns.
- Run Visual QA checklist on every page-level release.
- Keep migration tracker statuses current in each PR that touches HTML/CSS.

## Phase 1 (delivered)

- Primitive design tokens in `assets/css/tokens-primitives.css`.
- Semantic token mappings in `assets/css/tokens-semantic.css`.
- Site stylesheet import wiring in `assets/css/site.css`.

## Migration rules

1. New styles should consume semantic tokens (`--forest`, `--ink`, `--paper`) instead of hardcoded hex values.
2. Additional colors must be added to primitives first, then mapped semantically.
3. Legacy variables remain valid during transition to avoid regressions.

## Next phases

- Component tokens (buttons/cards/forms/tables).
- Shared component stylesheet for marketing + dashboard surfaces.
- Inline style cleanup in marketing HTML templates.
