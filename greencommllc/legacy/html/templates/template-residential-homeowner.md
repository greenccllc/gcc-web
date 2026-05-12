# Template: Residential Homeowner Proposal

**Audience:** Homeowner — consumer
**Tone:** Warm, plain-English, first-person, "you" is freely used for benefits
**Signed by:** Kaitlyn Lim Morris, President & CEO
**Default length:** 6–10 pages

---

## Cover Page

- GCC LLC logo (stacked with name)
- **{{project_name}}**
- Prepared for: {{homeowner_name}}
- Address: {{project_address}}
- Date: {{proposal_date}}
- Valid through: {{validity_date}}

---

## 01 — Hi {{homeowner_first_name}}

Conversational cover letter, 2–3 short paragraphs.

Paragraph one — thank them for the walkthrough. Reference one specific thing they told you they wanted ({{homeowner_goal}}).

Paragraph two — what we're proposing in plain English. No jargon. The differentiators framed as: "Our work comes with a lifetime warranty on the workmanship. If we install a cable and it ever gives you trouble, we come back and fix it — whether that's next month or fifteen years from now. And if you sell the house, the warranty transfers to the next owner."

Paragraph three — we're happy to answer any questions before you sign. Kaitlyn's cell is available on the signed contract.

Signature: Kaitlyn Lim Morris.

---

## 02 — What You're Getting

Single-page executive summary.

- **Total Price: ${{total_price}}** (22pt, Forest Green)
- One-sentence summary of the install
- The 4 differentiators in plain language:
  - Every cable certified with a professional tester, and you get the test report when we're done
  - Every data cable is the high-grade kind that handles gigabit speeds and will handle whatever comes next
  - Lifetime warranty on our workmanship — transfers if you sell the house
  - We've never missed a project completion date

---

## 03 — Who's Working on Your Home

- Short-form company overview (residential phrasing)
- Two-person minimum on site — never a single tech coming alone
- Background-checked crew, uniformed, with company vehicles clearly marked
- Licensed and insured (short insurance paragraph from `components/insurance-and-bonding.md` residential version)

---

## 04 — What We're Installing

For each residential service in `{{services_included}}`, pull from `/scope-library/residential-*.md` — use the plain-English substitutions.

Example structure per service:

**Home Network**
We'll install future-proof network cable from a central panel to {{drop_count}} spots in your house — TVs, your office, the smart-home hub, the WiFi access points. The panel sits in {{panel_location}}, and from there everything routes to wherever you need it.

Equipment we'll install:
- {{drop_count}} data drops (the outlets you see in each room)
- {{ap_count}} ceiling-mounted WiFi access points for strong coverage
- One structured-media panel — 42" recessed
- Router / switch setup (equipment listed below)

### 4.1 Equipment list

Simple table: item, make/model, who's paying.

| Item | Make / Model | Included |
|---|---|---|
| {{equipment_items}} | | Yes / No |

If it's homeowner-furnished, say so plainly: "You buy the router and we install it."

### 4.2 Things we're not covering

Short, plain list. "ISP setup (you call Spectrum or AT&T to activate service — we time our work to match)." "Drywall patching beyond small access holes at outlet locations."

---

## 05 — How It'll Go

Timeline in weeks or days, depending on scope. Use Template 4 (Residential) from `schedule/milestone-templates.md`.

Brief narrative: what day we'd start, how many consecutive days we'd be on site, when you'd want to be home to review placement decisions.

---

## 06 — What It Costs

- **Total Price: ${{total_price}}**
- 30% deposit due at contract signing — that covers material ordering
- 40% due when material arrives on site
- 30% due at completion walkthrough

Short bullet of what's included: "Installation, materials, testing, lifetime warranty, walkthrough."

If you want to add on a monthly maintenance plan: "We offer a Managed Services option for ${{managed_services_monthly}}/month — we monitor the network, push updates, and swap gear under warranty without you having to call. Month-to-month, cancel any time."

---

## 07 — Warranty

**Lifetime workmanship — transfers with the property.**

Plain-English version: "Every cable we install, every termination we make, for as long as the wires are in service. If something we installed ever stops working, we come back and fix it. Equipment has its own manufacturer warranty, and our hardware is covered for five years."

---

## 08 — Next Steps

1. Read this over.
2. Text or call me if you have questions — (636) 224-8192 or corporate@greencommllc.com.
3. If you're ready to go, sign the last page and send back (photo / scan / DocuSign — however's easiest).
4. We schedule a start date and get going.

---

## 09 — Terms & Conditions

Pull **residential-shortened** T&C from `terms/standard-terms-and-conditions.md`.

---

## 10 — Acceptance

**By signing below, {{homeowner_name}} accepts this proposal for {{project_name}} at the total price of ${{total_price}}.**

[signature lines]

---

## Required variables

- `homeowner_name`, `homeowner_first_name`
- `project_name`, `project_address`
- `homeowner_goal` — what they told us on the walkthrough
- `panel_location`
- `drop_count`, `ap_count`
- `equipment_items` (array)
- `services_included`
- `total_price`, `managed_services_monthly`
- `proposal_date`, `validity_date`
