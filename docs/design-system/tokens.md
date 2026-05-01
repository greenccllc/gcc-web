# Token Definitions & Usage Rules

## 1) Color Tokens

> Store canonical token values in `:root` within `assets/css/site.css` and consume via CSS variables.

### Brand & Semantic

- `--color-brand-primary`: Primary brand action color.
- `--color-brand-secondary`: Secondary accent.
- `--color-surface`: Card/surface background.
- `--color-bg`: Application/page background.
- `--color-text-primary`: Main text.
- `--color-text-secondary`: Supporting text.
- `--color-border`: Standard border/divider.
- `--color-success`, `--color-warning`, `--color-error`, `--color-info`: State colors.

### Usage Rules

- Do not hardcode hex values in component/page styles unless introducing a new approved token.
- Text and icon colors must be semantic (`text-primary`, `text-secondary`, `error`) rather than arbitrary shades.
- Interactive states (hover/focus/disabled) must have distinct tokenized values.

## 2) Typography Tokens

- `--font-family-base`: Default UI font stack.
- `--font-family-heading`: Heading family (may equal base).
- `--font-size-xs/sm/md/lg/xl/2xl/...`
- `--font-weight-regular/medium/semibold/bold`
- `--line-height-tight/normal/relaxed`

### Usage Rules

- Use a consistent type scale; avoid ad-hoc font-size values.
- Headings must map to a semantic hierarchy (`h1`→largest page title, then `h2`, etc.).
- Body copy should default to `md` and only shift to `sm` for dense utility text.

## 3) Spacing Tokens

- `--space-0`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8`, `--space-12`, `--space-16`

### Usage Rules

- Use spacing tokens for margin/padding/gap.
- Prefer 4px baseline rhythm (increments of 4 or 8).
- Avoid single-off values (e.g., 13px, 22px) unless required by a specific visual asset.

## 4) Radius, Shadow, and Motion Tokens

- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`
- Shadow: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Motion: `--duration-fast`, `--duration-base`, `--duration-slow`, `--easing-standard`

### Usage Rules

- Use small radius for fields, medium for cards, pill for badges/buttons that require full rounding.
- Motion duration should be consistent across controls (typically `150–250ms`).
- Never remove focus indicators; style them with tokenized outline/ring values.
