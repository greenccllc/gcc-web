# GCC Visual Overhaul Plan (Phase 1)

## Purpose
This folder defines the baseline design system artifacts for a full visual overhaul.

## Phase 1 deliverables
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
