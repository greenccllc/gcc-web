# Template: Owner / End-Client Direct Proposal

**Audience:** Business owner, facilities director, IT director — direct client (not through a GC)
**Tone:** First-person from GCC, helpful without pushy, universal analogies for technical concepts
**Signed by:** Kaitlyn Lim Morris, President & CEO
**Default length:** 10–14 pages

---

## Cover Page

- GCC LLC logo (stacked with name)
- **QUOTE FOR**
- **{{project_name}}**
- Prepared for: {{client_company_name}}
- Attn: {{client_contact_name}}
- Date: {{proposal_date}}
- Valid through: {{validity_date}}

---

## 01 — A Note from Kaitlyn (cover letter, warmer than GC version)

Addressed to {{client_contact_name}}.

Opening paragraph — reference their specific situation, what they told you they're trying to solve. If there's a natural analogy (their industry → one of the approved analogies), use it here. Max one analogy in this letter.

Paragraph two — what GCC is proposing in plain English. No acronyms without a one-line explanation. Reference the 4 differentiators, but phrased around what they mean for the owner (e.g., "You keep the lifetime warranty — it transfers if you sell the property.").

Paragraph three — what happens next: review this with me, we can walk the building together, sign a contract, and we get started.

Signature: Kaitlyn Lim Morris, President & CEO.

---

## 02 — What You're Getting (executive summary)

- Price: **${{total_price}}** (22pt, Forest Green)
- One-sentence summary of what's being installed
- The 4 differentiator bullets (gold-dotted)
- Schedule headline: "{{schedule_headline}}"

---

## 03 — Who You're Working With

- Short-form company overview from `components/company-overview.md`
- Team — pull from `components/team-and-leadership.md` (executive team section)
- Insurance summary — pull from `components/insurance-and-bonding.md` (short paragraph version for owner-facing)
- Prior work — 2–3 references from `{{relevant_projects}}` matching the owner's vertical or project type. Each: one paragraph, not a data sheet.

---

## 04 — What We're Installing

For each service in `{{services_included}}`, pull inclusions and deliverables from `/scope-library/` — but rewrite the technical language using the plain-English substitutions in each scope file.

Example: "We'll install Cat6A plenum cable to every drop location" becomes "We'll run future-proof network cable — the kind that handles gigabit speeds today and whatever comes next — to every spot where you need a connection."

### 4.1 Standards we work to

One-paragraph summary of why standards matter: independent certification is proof that every cable will do its job; TIA-606-C labeling means anyone — us or any other contractor later — can trace any wire back to its origin in under a minute. The certifications section comes from `components/certifications-and-standards.md` but in conversational framing.

### 4.2 Things we don't do on this job

Pull exclusions from `components/hard-rules.md` "Always exclude" list. For owner audience, explain *why* briefly — e.g., "Fire alarm systems are handled by a specialty contractor certified by the State Fire Marshal — we don't touch that trade." Keep it short.

---

## 05 — How This Gets Built

Pull project-management content from `scope-library/commercial-07-project-management.md`, but translate the acronyms:
- "ICRA" → "infection-control protocol for healthcare sites"
- "OSHA 10 / 30" → "site-safety certifications for every person on the crew"
- "Two-person minimum" → stated plainly

### 5.1 Schedule

Pull appropriate template from `schedule/milestone-templates.md` based on `{{project_type}}`. Keep it to major phases — 4 to 6 rows. Add a one-paragraph narrative explaining the logic ("we start here, then here, then finish here").

---

## 06 — Warranty (hero)

Pull hero + sub-copy from `components/differentiators.md`.

Add a "What this means for you" paragraph: "If a cable we installed starts giving you trouble in 2031, you call us and we fix it. If you sell the building, the next owner has the same guarantee."

---

## 07 — Investment Summary

**Total Price: ${{total_price}}** (bold)

Three-row breakdown max — not line-item detail:

| Category | Amount |
|---|---:|
| Installation (labor, materials, testing, certification) | ${{installation_total}} |
| Equipment (owner-furnished items marked OFCI) | ${{equipment_total}} |
| **Total Investment** | **${{total_price}}** |

Alternate — Managed Services: **${{managed_services_monthly}}/month**, month-to-month, no lock-in.

Loyalty Discount (if applicable): -${{loyalty_discount}}.

### 7.1 Payment terms

Pull commercial payment terms from `pricing/rate-card.md`.

### 7.2 What's included in the price

Bullet summary of what's covered — installation, testing, certification, closeout package, lifetime workmanship warranty.

---

## 08 — Next Steps

1. Review this quote and let me know any questions.
2. I'm happy to walk the building with you if that's helpful.
3. When you're ready, sign the acceptance block on the last page or reply-all with "accepted."
4. We coordinate a start date and get going.

---

## 09 — Terms & Conditions

Pull full commercial T&C from `terms/standard-terms-and-conditions.md`.

---

## 10 — Acceptance

**By signing below, {{client_company_name}} accepts this quote for {{project_name}} at the total price of ${{total_price}}, subject to the terms and conditions herein.**

[signature lines]

---

## Required variables

- `client_company_name`, `client_contact_name`, `client_contact_title`
- `client_industry` (for analogy selection)
- `project_name`, `project_type`
- `project_specific_hook`
- `proposal_date`, `validity_date`
- `services_included`
- `installation_total`, `equipment_total`, `total_price`, `managed_services_monthly`, `loyalty_discount`
- `schedule_headline`, `relevant_projects`
