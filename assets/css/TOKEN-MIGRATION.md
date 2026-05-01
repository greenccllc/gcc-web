# CSS Token Migration Guide (Phase 1)

## New hierarchy

1. `tokens/primitives.css`: raw primitives (color palette, spacing scale, typography scale).
2. `tokens/semantic.css`: semantic tokens (surface, text, border, accent, status, focus).
3. `tokens/components.css`: component mappings (buttons, cards, nav, badges, forms).

`site.css` imports the three layers in this order.

## Migration rules for page-specific CSS

Apply these rules to `assets/css/clients-*.css`, `assets/css/staff-*.css`, and `assets/css/admin-*.css`:

- Prefer semantic tokens over palette tokens.
  - Use `--color-surface-*`, `--color-text-*`, `--color-border-*`, `--color-accent-*`, `--color-status-*`.
- Use component tokens for UI elements.
  - Buttons: `--component-button-*`
  - Cards: `--component-card-*`
  - Nav: `--component-nav-*`
  - Badges: `--component-badge-*`
  - Forms: `--component-input-*`
- Only use primitives when introducing a *new* semantic token; avoid raw hex values in page CSS.
- Keep manager/admin radius overrides local (e.g., `--r-mgr-*`) until phase 2 consolidation.

## Backward compatibility (Phase 1)

Legacy aliases remain in `semantic.css` and `components.css` (examples: `--forest`, `--ink`, `--shadow-sm`, `--s-4`).

### Phase 2 removal checklist

- Replace remaining legacy alias usages in page CSS.
- Remove alias blocks from `semantic.css` and `components.css`.
- Run visual regression checks on marketing, clients, staff, and admin pages.
