# Component Catalog

## Header / Navigation

**Example**
- Site header with logo, primary nav links, and CTA button.

**Do**
- Keep navigation labels short and predictable.
- Keep active state visible.

**Don't**
- Hide key navigation actions behind hover-only affordances.

## Buttons

**Variants**
- Primary, Secondary, Tertiary/Ghost, Destructive.

**Do**
- Use one primary action per section/modal.
- Include visible focus and disabled styles.

**Don't**
- Mix multiple primary buttons in the same action group.
- Rely on color alone to indicate destructive intent; include text/icon context.

## Form Controls

**Includes**
- Text input, textarea, select, checkbox, radio, switch.

**Do**
- Pair each control with a persistent label.
- Show helper text and validation messages near fields.

**Don't**
- Use placeholder text as the only label.

## Cards

**Use Cases**
- Service previews, dashboard summaries, quick actions.

**Do**
- Keep consistent internal padding and heading structure.

**Don't**
- Combine unrelated actions in one card without grouping.

## Tables / Data Grids

**Use Cases**
- Dashboards, admin lists, client invoices/sessions.

**Do**
- Keep column labels explicit and sortable where relevant.
- Support empty/loading/error states.

**Don't**
- Truncate critical values without access to full value.

## Alerts / Banners

**Variants**
- Success, warning, error, info.

**Do**
- Include concise summary + optional action.

**Don't**
- Show persistent error banners after issue is resolved.

## Modals / Drawers

**Do**
- Trap focus, close on `Esc`, and restore focus on close.

**Don't**
- Use modals for long multi-step flows when a dedicated page is better.
