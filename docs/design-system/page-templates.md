# Page Template Inventory

## Marketing Pages

### `index.html`
- Template type: Marketing home / lead generation.
- Required sections: Hero, services overview, trust signals, CTA footer.

### `services.html`
- Template type: Service listing/detail hub.
- Required sections: Service cards/list, differentiators, contact CTA.

### `about.html`
- Template type: Company profile.
- Required sections: Mission/story, team credibility, process/value proposition.

### `contact.html`
- Template type: Contact conversion.
- Required sections: Contact form, direct contact options, response expectations.

## Dashboard Templates

### Admin dashboards
- `admin/console/index.html`
- `admin/pipeline.html`, `admin/marketing.html`, `admin/users.html`, `admin/financials.html`
- Pattern: KPI summary + filters + data table + detail/actions panel.

### Staff dashboards
- `staff/dashboard.html`, `staff/index.html`
- Pattern: Task queue + schedule/context panels + quick actions.

### Client dashboards
- `clients/dashboard.html`, `clients/index.html`
- Pattern: Account summary + estimates/invoices/actions + support entry points.

## Template Governance Rules

- All templates must use shared layout primitives (container widths, spacing scale, type scale).
- Every template must define: empty states, loading states, and error/permission states.
- Conversion-focused pages must maintain a primary CTA above the fold on common breakpoints.
