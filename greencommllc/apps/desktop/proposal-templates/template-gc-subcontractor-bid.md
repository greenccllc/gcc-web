# Template: GC Subcontractor Bid

**Audience:** General contractor estimator / PM
**Tone:** Formal, technical, third-person organizational. Scope first, price second.
**Signed by:** Kaitlyn Lim Morris, President & CEO
**Default length:** 12–16 pages

Variables are in `{{double braces}}`. Components are pulled by filename from `/components/` or `/scope-library/`.

---

## Cover Page

- GCC LLC logo (stacked with name)
- **PROPOSAL FOR**
- **{{project_name}}**
- Bid to: {{gc_company_name}}
- Attn: {{gc_estimator_name}}, {{gc_estimator_title}}
- Date: {{proposal_date}}
- Valid through: {{validity_date}}
- Our reference: {{gcc_bid_number}}

---

## 01 — Cover Letter (single page)

Addressed to {{gc_estimator_name}}.

Opening paragraph — one project-specific sentence proving we read their docs. Reference the RFP number, issue date, and at least one specific project characteristic ({{project_specific_hook}}).

Paragraph two — what GCC is proposing. Reference the 4 differentiator bullets pulled from `components/differentiators.md`.

Paragraph three — validity window, bond capacity, schedule assumption.

Signature block:

Kaitlyn Lim Morris
President & CEO
GCC LLC
(636) 224-8192 · corporate@greencommllc.com

---

## 02 — Bid Overview (single page, hero-style)

- Project name: {{project_name}} (14pt, Forest Green)
- Base Bid: **${{base_bid_amount}}** (44pt, Forest Green — this is the hero)
- Alternates summary (table: ADD / DEDUCT with amounts)
- Schedule: {{schedule_summary_line}}
- The 4 differentiator bullets (gold-dotted, Calibri 11pt)

---

## 03 — Scope of Work

### 3.1 Base Scope

Pull from `/scope-library/` — only the scopes in `{{services_included}}`. For each service, include: inclusions, deliverables, standards cited. **Omit the density tables from client-facing copy** (density tables are internal estimating reference).

### 3.2 Base Scope Summary Table

| Item | Quantity | Unit |
|---|---:|---|
| {{quantified_items}} | | |

(Example rows: "Cat6A plenum data drops | 420 | each"; "IP camera installs | 48 | each"; "Fiber backbone strands | 24 | strand")

### 3.3 Exclusions (mandatory section)

Pull from `components/hard-rules.md` "Always exclude" list. Append any project-specific exclusions in `{{project_exclusions}}`.

---

## 04 — About GCC (Company Overview)

Pull long-form from `components/company-overview.md`.

---

## 05 — Qualifications

- Team — pull from `components/team-and-leadership.md`
- Insurance & Bonding — pull from `components/insurance-and-bonding.md` (commercial table)
- Certifications & Standards — pull from `components/certifications-and-standards.md`
- Prior work references — insert 3 projects from `{{relevant_projects}}` matched by vertical / scope similarity (pull from the projects reference data). Each reference: project name, GC name (if applicable), scope summary, reference contact available on request.

---

## 06 — Warranty (hero callout opens section)

Pull hero + sub-copy from `components/differentiators.md` (the "LIFETIME WORKMANSHIP" hero).

---

## 07 — Project Management & Delivery

Pull from `scope-library/commercial-07-project-management.md`.

---

## 08 — Schedule

Pull appropriate template from `schedule/milestone-templates.md` based on `{{project_type}}`. Customize week numbers. Add a "Schedule Notes" paragraph addressing: {{schedule_constraints}}.

---

## 09 — Investment Summary (price breakdown)

Not line-item detail (that's internal only). Client-facing summary:

| Category | Amount |
|---|---:|
| Base Bid | ${{base_bid_amount}} |
| Alternate A1 — Managed Services (month-to-month) | ${{ms_alternate_monthly}} /month |
| Alternate D1 — Weekend / After-hours DEDUCT | -${{d1_amount}} |
| Loyalty Discount (if applicable) | -${{loyalty_discount_amount}} |
| **Net Bid (after Loyalty)** | **${{net_bid_amount}}** |

Payment terms — pull from `pricing/rate-card.md` commercial payment terms.

---

## 10 — Terms & Conditions

Pull full commercial T&C from `terms/standard-terms-and-conditions.md`.

---

## 11 — Acceptance Block (last page)

**By signing below, {{gc_company_name}} accepts GCC LLC's proposal for {{project_name}} at the Base Bid of ${{base_bid_amount}}, subject to the terms and conditions herein.**

Signature: ________________________________
Name: ________________________________
Title: ________________________________
Date: ________________________________

---

## Required variables (the HTML form collects these)

- `gc_company_name`, `gc_estimator_name`, `gc_estimator_title`
- `project_name`, `project_type` (select: new-construction | renovation | K-12-summer | healthcare)
- `project_specific_hook` — one sentence about the project proving we read the docs
- `proposal_date`, `validity_date` (auto-calculated +60 days)
- `gcc_bid_number` (auto-generated from date + sequence)
- `services_included` (multi-select from the 7 commercial scope files)
- `quantified_items` (array of {item, qty, unit})
- `relevant_projects` (3 projects pulled from the projects reference data matching vertical)
- `project_exclusions` (free text)
- `schedule_summary_line`, `schedule_constraints`
- `base_bid_amount`, `ms_alternate_monthly`, `d1_amount`, `loyalty_discount_amount`
