# Visual QA Checklist

Use this checklist before release.

## 1) Contrast

- [ ] Body text meets WCAG AA contrast against background.
- [ ] Button text and icon contrast is sufficient in default/hover/disabled states.
- [ ] Links remain distinguishable from surrounding text.

## 2) Typography Hierarchy

- [ ] One clear `h1` per page.
- [ ] Heading levels descend logically (`h1` > `h2` > `h3`).
- [ ] Body, caption, and label sizes are consistent with token scale.

## 3) Spacing Rhythm

- [ ] Margins/padding follow approved spacing tokens.
- [ ] Section spacing is consistent across equivalent template blocks.
- [ ] Form controls and labels maintain consistent vertical rhythm.

## 4) Interaction States

- [ ] Hover states are visible for pointer devices.
- [ ] Focus styles are clearly visible for keyboard users.
- [ ] Disabled states are visually distinct and semantically disabled.
- [ ] Error/success states are communicated by text + style (not color-only).

## 5) Responsive Behavior

- [ ] Page verified at `xs`, `md`, and `lg` breakpoints.
- [ ] No horizontal overflow in primary layouts.
- [ ] Tables and dense content degrade gracefully on small screens.
