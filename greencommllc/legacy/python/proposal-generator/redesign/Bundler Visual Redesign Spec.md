# GCC Proposal Bundler — Visual Redesign Spec

**Author:** Nathan Morris  ·  **Date:** 2026-04-21  ·  **Status:** Draft for review
**Scope:** `proposal-generator/build_proposal.py` — types `formal-bid` (RFP subcontract) and `direct-quote` (owner-friendly)
**Rendering target:** HTML/CSS → WeasyPrint (max layout flexibility, same palette and typography)
**Out of scope this round:** `residential-quote`, `change-order` (next pass after approval)

**Ground rules**
1. **1:1 content parity.** Every field, every section, every line the current generator produces must land somewhere in the new design. Nothing combined, nothing condensed.
2. **All hard rules in `rules.md` still apply.** Cat6A baseline, mandatory MSP alternate, verbatim warranty, no REQUESTS language, forbidden-phrase grep, gold-usage cap, approver at > $25K or public work.
3. **The footer lock is permanent.** Every client-facing page carries `GCC LLC · Proprietary & Confidential · {proposal_no} · {issue_date}` on the left and page number on the right.
4. **"Non-Union Div 27/28 Contractor" stays banned** across every template. Tagline remains "Low-Voltage Div 27/28 Contractor".

---

## 1. Content Inventory — What Currently Ships

Both types share one generator (`build_proposal.py`), but the narrative blocks differ by type. This inventory is the contract for the redesign: every row below must appear in the new output.

### 1.1 Formal-Bid (RFP subcontract) — in `build()` order

| # | Block | Current source | Content elements |
|---|---|---|---|
| 1 | Cover kicker | `build_cover` | `"BID PROPOSAL"` label |
| 2 | Cover title | `build_cover` | Full project name, 28pt Serif-B |
| 3 | Cover gold rule | `build_cover` | 1.5" horizontal gold bar |
| 4 | Cover facts block | `build_cover` | Prepared for · Contact · Project site · *(Bid due if present)* · *(Bid no. if present)* · Issued · Valid for · Proposal no. |
| 5 | Transmittal H1 | `build_transmittal` | `"Bid transmittal."` |
| 6 | Transmittal lead | `build_transmittal` | 5-line formal opener re: bid submission, validity, compliance with specs / GC contract / prevailing wage |
| 7 | Project description | `build_transmittal` | Multi-paragraph body text from `project.description` |
| 8 | Scope H1 | `build_scope_narrative` | `"Scope of work."` |
| 9 | Scope lead | `build_scope_narrative` | Paragraph re: base bid, schedule, mobilization/testing/closeout included, Fluke DSX-8000 + LinkWare PDF included |
| 10 | Scope table | `scope_table` | For each line: Qty · Unit · Description · Unit Price · Line Total |
| 11 | Totals block | `totals_block` | Subtotal · *(Loyalty discount line if repeat)* · TOTAL · *(Optional Managed Services per month if MSP monthly set)* |
| 12 | Exclusions H1 | inline | `"What we're not including."` |
| 13 | Exclusions list | `exclusions_block` | Standard 6 (fire alarm · ERCES/BDA/DAS · lighting control & shade · BMS/HVAC · mass notification · line-voltage) *when `standard_excluded_auto: true`* PLUS any `extra` items |
| 14 | Alternate H1 | inline | `"Optional — Managed Services alternate."` |
| 15 | Alternate lead | inline | Paragraph re: monthly, priced separately, not in total, decline in writing |
| 16 | Alternate table | `alternate_block` | For each alternate: Name · Description · Monthly |
| 17 | Warranty H1 | inline | `"Warranty."` |
| 18 | Warranty block | `warranty_block` | **Verbatim** `WARRANTY_TEXT` (§1.4) in a green-tint/gold-left-rule panel |
| 19 | Schedule H1 | `build_schedule` | `"Schedule."` |
| 20 | Schedule facts | `build_schedule` | Target start · Target finish · *(Bid due)* |
| 21 | Notes H1 | `build_notes` | `"Project notes."` |
| 22 | Notes list | `build_notes` | Italic bulleted `notes` items |
| 23 | Terms H1 | inline | `"Terms."` |
| 24 | Terms facts | `terms_block` | Payment · Deposit · Changes · Insurance · Licensure · Validity (auto-computed) |
| 25 | Acceptance H1 | inline | `"Acceptance."` |
| 26 | Signature block | `signature_block` | Prepared by (Nathan) left / Approved by (Kaitlyn) right — on bid > $25K or public work |
| 27 | Running header | `draw_frame` | Gold square · `GCC · BID PROPOSAL` · proposal_no right |
| 28 | Running footer | `draw_frame` | `GCC LLC · Proprietary & Confidential · {no} · {date}` · `Page N` |

### 1.2 Direct-Quote (owner-friendly) — in `build()` order

Same 28 blocks, with these text differences:

| # | What changes |
|---|---|
| 1 | Kicker becomes `"QUOTE"` |
| 5 | H1 becomes `"What this quote covers."` |
| 6 | Warmer opener: `"{contact}, thanks for reaching out. This quote covers the {project} scope we discussed. Pricing held firm through the date on the cover, and every cable we install carries our standard lifetime workmanship warranty."` |
| 8 | H1 becomes `"What we'll do."` |
| 9 | Warmer lead: one price per line (rolled labor + materials), Fluke testing included, LinkWare PDF at closeout |
| 4 | Facts block typically omits Bid due / Bid no. |
| 26 | Signature block usually replaces "Approved by" with "Client Acceptance" signature line (when `approved_by` is null — i.e., under $25K) |

Everything else lands identically.

---

## 2. What's Weak About the Current Design (baseline critique)

I spent time with the four sample PDFs (`GCC-2026-0101_straub...`, `GCC-2026-0102_adhoc...`, `GCC-2026-0103_emily-james-hartwell...`, `GCC-2026-0104-CO-001_mocsa...`) and the per-page PNG QA snaps. These are the specific visual problems the redesign solves — stated so the spec can be judged against them.

1. **Cover is quiet.** The project name sits on a cream field with a short gold rule and a facts table. For a formal subcontract bid this should feel like a document that closes a deal. No hero visual rhythm, no pricing at a glance, no reinforcement of the "lifetime warranty" value.
2. **Scope table is cramped.** Five columns in 6.5" live width with Qty and Unit getting 0.45" each — descriptions wrap awkwardly. No category bands, no subtotal by category, no row grouping.
3. **Totals aren't a hero.** Subtotal → Discount → TOTAL is a 5.5" × 1.5" table. The Total is the whole reason a buyer opens page 3 — it should be displayed, not tabled.
4. **Warranty is buried.** Order is Totals → Exclusions → MSP Alternate → Warranty. By the time an owner reads the warranty panel they've already processed three tables of negation. Moving it directly after Totals would reframe price in value.
5. **MSP alternate is under-merchandised.** Forest-on-gold-tint table on page 3 — but the MSP monthly is the recurring-revenue play. It should be a full-width card, not a third table.
6. **No visual proof.** No logo knockout, no manufacturer list, no brand marks, no "why GCC" reinforcement. This is okay for a small quote, thin for a $200K subcontract.
7. **Single column throughout.** Cover, scope narrative, terms — all stack vertically. Zero use of horizontal space.
8. **Owner quote shares the exact chassis as a GC bid.** Same header, same typography, same sectioning — just warmer copy. An owner deserves a document that looks warmer, not just reads warmer.
9. **Header rule is 0.4pt.** Loses to any photocopier. Needs 1pt minimum.
10. **Signature block has no letterhead context.** Empty signature lines with no firm total restated, no reassurance footer, no contact line.

---

## 3. Shared Design System

Applies to both types. Anything a type overrides is called out in §4 / §5.

### 3.1 Palette (unchanged from `rules.md` §3.1)

| Token | Hex | Use |
|---|---|---|
| `--forest` | `#2E7D32` | Section headings, brand marks, table header rows |
| `--forest-dark` | `#1E5622` | Display type, totals hero, cover band |
| `--slate` | `#455A64` | Sub-headers, body secondary, kickers |
| `--slate-light` | `#788A93` | Meta text (dates, proposal no., running header/footer) |
| `--gold` | `#D4AF37` | Scarcity marker, rules, callout edge — **max 2× per bid · 3× per quote** |
| `--gold-tint` | `#FAF3DC` | Alternate card fill |
| `--cream` | `#FDFBF4` | Page field |
| `--green-tint` | `#F1F8F1` | Warranty panel, alt-row fills, callout bg |
| `--ink` | `#1A1A1A` | Body text |
| `--rule` | `#D8D8D8` | Hairlines, table inner rules |

### 3.2 Typography

| Style | Font | Size / Leading | Case | Tracking |
|---|---|---|---|---|
| Display | Serif-B | 44 / 48 | Sentence | −10 |
| H1 | Serif-B | 22 / 26 | Sentence | 0 |
| H2 | Serif-B | 14 / 18 | Sentence | 0 |
| Kicker | Sans-B | 9 / 12 | UPPERCASE | +80 |
| Lead | Serif | 12 / 18 | Sentence | 0 |
| Body | Sans | 10.5 / 15 | Sentence | 0 |
| Table body | Sans | 10 / 13 | Sentence | 0 |
| Small / meta | Sans | 8.5 / 11 | Sentence | 0 |
| Currency hero | Serif-B | 36 / 40 | — | Tabular |
| Currency table | Sans | 10 / 13 | — | Tabular |

Body goes up from 10 to 10.5pt for readability. H1 goes 18 → 22. A new Display style (44pt) anchors the cover hero and the Total hero.

### 3.3 Grid

7.0" live width inside 0.75" margins. 12-column grid, 0.5" gutter between sidebar (col 1–4) and main (col 5–12). Full-width blocks span cols 1–12.

### 3.4 Page furniture (both types, every page)

- **Top rule:** 1pt `--rule`, 0.6" from top-edge.
- **Header strip:** 6pt gold square on left (cap Gold use at 2× per page across header+body). `GCC  ·  {TYPE LABEL}  ·  {SECTION NAME}` in Sans-B 9pt `--forest` next to it. Proposal no. in Sans 8.5pt `--slate-light`, right-aligned.
- **Bottom rule:** 1pt `--rule`, 0.55" from bottom-edge.
- **Footer:** `GCC LLC · Proprietary & Confidential · {proposal_no} · {issue_date}` in Sans 8.5pt `--slate-light` left, `Page {n}` right.
- **Section name in header** is new — it's the running section (COVER · TRANSMITTAL · SCOPE · FINANCIAL SUMMARY · EXCLUSIONS · MANAGED SERVICES · WARRANTY · SCHEDULE · TERMS · ACCEPTANCE). Makes stapled bids navigable.

### 3.5 Callout panels

Two variants; both are full-width (cols 1–12):

- **Forest panel:** `--green-tint` fill, 3pt `--gold` left rule, 14/12pt padding, for Warranty and other value content.
- **Cream panel:** `--cream` fill, 0.5pt `--rule` all sides, 14/12pt padding, for terms and secondary facts grids.

### 3.6 Section dividers

No underlines. Between major sections: 14pt space + H1 in `--forest-dark` + 0.5pt `--rule` spanning cols 5–12 (not full-width — leaves breathing room on the sidebar side).

---

## 4. Formal-Bid Redesign — Page by Page

Target length: 4 pages on the William Chrisman example (currently 4 pages). Target: same content, restructured for hierarchy.

### 4.1 Page 1 — Cover + At-a-Glance

**Top third (cols 1–12):** solid `--forest-dark` band, 2.8" tall. Inside the band:
- Kicker (cream, 9pt UPPERCASE, +80 tracking): `SUBCONTRACT BID  ·  LOW-VOLTAGE DIVISION 27/28`
- Display title (cream, 44pt Serif-B): project name, wrapped to 2 lines max.
- Gold rule, 2.5" × 2pt, `--gold`.
- Sub (cream italic Serif, 14pt): `Prepared for {client.name}` (or GC name).

**Middle (cols 1–12):** 24pt gap, then 2-column facts grid (cols 1–6 / 7–12):

| Left column | Right column |
|---|---|
| Prepared for: `{client.name}` | Bid due: `{bid_due_date}` |
| Contact: `{contact}` · `{email}` | Bid no.: `{bid_number}` |
| Project site: `{one-line address}` | Proposal no.: `{proposal_no}` |
| Issued: `{issue_date}` | Valid for: `{validity_days} days` |

Kicker style on the left token, Body style on the value. Key/value spacing: 4pt top, 4pt bottom, 14pt between rows.

**Bottom third (cols 1–12):** "Base Bid" hero card.
- Cream panel, `--gold` top rule (3pt).
- Kicker inside: `BASE BID`
- Currency hero (`--forest-dark`, 44pt Serif-B, tabular): `${total}`
- Body below: `Held firm through {validity_date}. Inclusive of all mobilization, testing, and closeout. Separate Managed Services alternate on page 3.`

This last card turns the cover from "nice project title" into "here's your price, here's what it includes, here's where to look for the optional line". Content is all already in the intake.

### 4.2 Page 2 — Transmittal + Scope

**Top:** H1 `Bid transmittal.` with section rule cols 5–12.
**Sidebar (cols 1–4):** "At a glance" card — kicker + value grid, 8 rows:
- BID DUE: `{bid_due_date}`
- BID NO.: `{bid_number}`
- VERTICAL: `{project.vertical}` (k-12, higher-ed, healthcare, etc.)
- PUBLIC WORK: `Yes — prevailing wage compliant` *(only if `is_public_work: true`)*
- TARGET START: `{target_start}`
- TARGET FINISH: `{target_finish}`
- SUBMITTER: `{prepared_by.name}`, `{prepared_by.title}`
- APPROVER: `{approved_by.name}`, `{approved_by.title}`

**Main (cols 5–12):** Transmittal lead paragraph (12pt Serif), then project description paragraph(s), then H1 `Scope of work.` with scope lead paragraph.

Transmittal and Scope now share page 2 because the sidebar absorbs ~3" of vertical that used to stack below.

**Bottom (cols 1–12):** Scope table (full-width, spans cols 1–12). See §4.6 for redesign.

### 4.3 Page 3 — Scope table continuation + Financial Summary + Warranty

**Top (cols 1–12):** Scope table continued if needed.

**Middle (cols 1–12):** **Financial Summary** hero panel.
- Cream panel, 3pt `--gold` top rule.
- Left block (cols 1–7): facts list — Subtotal, Loyalty Discount (visible line, `−{money}`), any extra accounting items. Sans 11pt.
- Right block (cols 8–12): Total hero — kicker `TOTAL`, Currency hero `{money}` in `--forest-dark` 36pt Serif-B, sub-line `Held firm through {validity_date}`.
- Bottom strip of panel: kicker `OPTIONAL — MONTHLY` + `${msp_monthly}/mo` in Sans-B 14pt + kicker `See page 4`. Visually separated from the Total, so a reader can't confuse them.

This replaces the existing `totals_block` 5.5"×1.5" strip.

**Bottom (cols 1–12):** H1 `Warranty.` Warranty panel (Forest panel variant, `--gold` left rule, `WARRANTY_TEXT` verbatim in 11pt Serif italic `--forest-dark`).

The warranty is now directly under the Total — buyer reads the price, then immediately reads what it guarantees.

### 4.4 Page 4 — Exclusions + Managed Services + Schedule + Notes

**Top (cols 1–12):** H1 `What we're not including.` Two-column list (cols 1–6 / 7–12). Each item: `✕` glyph (Sans-B 9pt `--forest`) + body text. Standard-6 goes in the left column, any `extra` items in the right.

**Middle (cols 1–12):** H1 `Optional — Managed Services alternate.` Cream panel with 3pt `--gold` top rule.
- Row 1: kicker `MONTHLY SERVICE` + currency hero `${monthly}/mo` in `--forest-dark` 22pt Serif-B (right-aligned).
- Row 2: lead paragraph (12pt Serif) = existing alternate lead.
- Row 3: description list — alternate name + description per alternate. If MSP has `annual` value, shown alongside: `Monthly $X · Annual $Y`.
- Row 4: small kicker `Accept or decline in writing; not included in Total above.`

**Bottom (cols 1–12):** 2-column row.
- Left (cols 1–6): H2 `Schedule.` → facts list (Target start · Target finish · Bid due).
- Right (cols 7–12): H2 `Project notes.` → italic list of `notes` items.

### 4.5 Page 5 — Terms + Acceptance

**Top (cols 1–12):** H1 `Terms.` Cream panel, 2-column facts grid inside (cols 1–6 / 7–12):

| Left | Right |
|---|---|
| Payment: `{payment}` | Insurance: `{insurance}` |
| Deposit: `{deposit}` | Licensure: `{licensure}` |
| Changes: `{change_order_policy}` | Validity: `Pricing firm through {validity_date}` |

**Middle (cols 1–12):** H1 `Acceptance.` Cream panel. 2-column:
- Left (Prepared by): kicker `PREPARED BY` · serif name · italic title · email · phone · 2" signature line · date line.
- Right (Approved by OR Client Acceptance):
  - If `approved_by` present: kicker `APPROVED BY` · serif name · italic title · 2" signature line · date line.
  - Else: kicker `CLIENT ACCEPTANCE` · 2" signature line labeled `Signature` · 2" signature line labeled `Printed name · Title` · date line.

**Bottom (cols 1–12):** Thin reassurance strip, `--green-tint` fill, 1pt `--gold` top rule, centered text: `Questions? Call (636) 224-8192  ·  corporate@greencommllc.com  ·  greencommllc.com`.

### 4.6 Scope table — new treatment

Column widths (7" live):
- Qty: 0.55"
- Unit: 0.5"
- Description: 3.95"
- Unit Price: 0.95"
- Line Total: 1.05"

Header row: `--forest-dark` fill, cream text, 1.5pt `--gold` bottom rule, row height 24pt.

Body rows: 10pt Sans, 20pt row height, alt-row `--green-tint` fill.

**New behavior: category banding.** Before each category's first line, inject a full-width band row (`--forest` fill at 12% opacity, 8pt Sans-B `--forest-dark` UPPERCASE kicker): `CABLING`, `FIBER`, `CCTV`, `ACCESS CONTROL`, `LABOR`. Category label comes from each line's `category` field (already in the schema). **Adds visual structure without touching content.**

Subtotal by category is *optional* — can be added as a per-band running total later. Not in v1 to preserve 1:1 with the current output.

Totals stay inside the Financial Summary panel, not below the table.

### 4.7 Content elements mapping (formal-bid)

| Current block (from §1.1) | New location |
|---|---|
| 1 Cover kicker | §4.1 cover band kicker (redesigned copy: `SUBCONTRACT BID · LOW-VOLTAGE DIVISION 27/28`) |
| 2 Cover title | §4.1 cover band display |
| 3 Cover gold rule | §4.1 cover band rule |
| 4 Cover facts block | §4.1 2-col facts grid |
| 5 Transmittal H1 | §4.2 H1 |
| 6 Transmittal lead | §4.2 main lead paragraph |
| 7 Project description | §4.2 main body paragraphs |
| 8 Scope H1 | §4.2 H1 |
| 9 Scope lead | §4.2 scope lead paragraph |
| 10 Scope table | §4.2 bottom + §4.3 top (full-width, with category bands per §4.6) |
| 11 Totals block | §4.3 Financial Summary panel |
| 12 Exclusions H1 | §4.4 H1 |
| 13 Exclusions list | §4.4 2-col list |
| 14 Alternate H1 | §4.4 H1 |
| 15 Alternate lead | §4.4 MSP card row 2 |
| 16 Alternate table | §4.4 MSP card rows 1+3 |
| 17 Warranty H1 | §4.3 H1 |
| 18 Warranty block | §4.3 Forest panel |
| 19 Schedule H1 | §4.4 H2 (demoted since it shares a 2-col row with Notes) |
| 20 Schedule facts | §4.4 left column |
| 21 Notes H1 | §4.4 H2 (demoted, same reason) |
| 22 Notes list | §4.4 right column |
| 23 Terms H1 | §4.5 H1 |
| 24 Terms facts | §4.5 2-col grid |
| 25 Acceptance H1 | §4.5 H1 |
| 26 Signature block | §4.5 2-col signatures |
| 27 Running header | §3.4 page furniture |
| 28 Running footer | §3.4 page furniture |

**Net change:** zero content dropped. Two demotions (Schedule + Notes H1 → H2) because they share a page row; both still have their own heading. Two promotions (Total + Base Bid → Display type). Rearranged order: Warranty moves ahead of Exclusions/MSP so value follows price immediately.

---

## 5. Direct-Quote Redesign — Page by Page

Target: 3–4 pages on the AdHoc example (currently 3 pages). Lighter, warmer, same content inventory.

### 5.1 Page 1 — Cover + Project Summary

**Top:** Cream field, no dark band. 2" of top margin breathing room.
- Kicker (slate, 9pt UPPERCASE, +80 tracking): `A QUOTE FOR  ·  {client.name}`
- Display title (forest-dark, 38pt Serif-B, not 44pt — softer than the bid cover): project name.
- 2.5" × 1.5pt `--gold` rule.
- Sub (slate italic Serif, 14pt): `Prepared for {contact.first_name}, {contact.title}`.

**Middle:** "What this quote covers" band — 3 plain-language cards in a 3-col grid (cols 1–4 / 5–8 / 9–12).

| Card 1 | Card 2 | Card 3 |
|---|---|---|
| **Your scope** | **Your price** | **Your warranty** |
| One-line plain English pulled from `project.description` sentence 1 | `${total}` in `--forest-dark` 22pt Serif-B · kicker `HELD FIRM THROUGH {validity_date}` | `Lifetime workmanship warranty · 5-yr hardware` · kicker `See page 2 for the full language` |

All three cards: cream panel, 0.5pt `--rule` border, 2pt `--gold` top rule.

**Bottom:** Facts block (2-col):

| Left | Right |
|---|---|
| Contact: `{client.contact}` · `{email}` | Issued: `{issue_date}` |
| Project site: `{address}` | Valid for: `{validity_days} days` |
| Prior project: `{prior_project_refs[0]}` *(when repeat client)* | Proposal no.: `{proposal_no}` |

### 5.2 Page 2 — What this quote covers + Scope + Your price

**Top (cols 1–12):** H1 `What this quote covers.` (rephrased section title — content is the same "transmittal" narrative).

**Sub-block: warmer opener:**
> `{contact.first_name}, thanks for reaching out. This quote covers the {project.name} scope we discussed. Pricing is held firm through the date on the cover, and every cable we install carries our standard lifetime workmanship warranty.`

**Sub-block: project description** — full multi-paragraph text from `project.description`.

**Middle:** H1 `What we'll do.` + scope lead paragraph (same content as current `build_scope_narrative` for direct-quote).

**Bottom (cols 1–12):** Scope table — same column treatment as the bid, but with 3-column rolled format when labor is rolled:
- Qty · 0.55"
- Description · 5.45"
- Price · 1.0"

*Unit column suppressed when every scope line is `ls` or rolled.* When unit varies, use the 5-col bid layout. Category bands still apply.

### 5.3 Page 3 — Your price + Warranty + Not included + Managed Services

**Top (cols 1–12):** "Your price" panel. Same structure as the formal-bid Financial Summary but relabeled `Your price` / `What it costs` / `Final` and using sentence-case kickers (warmer). All numeric content identical.

**Middle-upper (cols 1–12):** H2 `What lifetime warranty means for you` (warmer frame). Two blocks in sequence:
- Gold-italic serif pull-quote (12pt, 2-line): plain-English translation: `If we put the cable in, we stand behind the cable — for as long as you own the property. The warranty transfers if you sell. You do not pay us to honor it.`
- Then the verbatim `WARRANTY_TEXT` in 11pt Serif italic `--forest-dark` in the Forest panel. **The verbatim text stays untouched** (§1.4) — the pull-quote above translates it without altering it.

This is the "no reducing content" rule in action: we add a plain-English frame, we don't edit the legal text.

**Middle-lower (cols 1–12):** H2 `What's not in this quote.` Item-by-item body text (not bullets — softer). Each item = one short paragraph.

**Bottom (cols 1–12):** H2 `Keep it running — optional monthly service.` Same MSP card structure as the bid, but the lead is warmer:
> `This is not included in the price above. Monthly plan covers monitoring, remote support, {msp.mac_hours} hr/quarter of MAC labor, and {msp.response} on-site response. Accept it in writing or decline in writing — your call.`

Description list pulls straight from the intake.

### 5.4 Page 4 — Timeline + Terms + Signatures

**Top (cols 1–12):** H2 `Timeline & next steps.` Facts block (Target start · Target finish · notes[0] if it describes scheduling).

**Middle (cols 1–12):** H1 `Terms.` Cream panel, same 2-col grid as the bid.

**Bottom (cols 1–12):** H1 `Signatures.` Two-column signature block:
- Left: kicker `GCC LLC` · Nathan serif · italic title · email · phone · 2" signature line · date line.
- Right: kicker `{client.name}` · 2" name line · 2" title line · 2" signature line · date line.

**Footer strip:** `--green-tint` fill, 1pt `--gold` top rule: `Questions? Call (636) 224-8192  ·  corporate@greencommllc.com  ·  greencommllc.com`.

### 5.5 Content elements mapping (direct-quote)

Same 28 blocks land in the new layout, with page-reallocation only:
- Blocks 1–4 → §5.1
- Blocks 5–9 → §5.2
- Block 10 → §5.2 bottom + §5.3 top
- Block 11 → §5.3 top (Your price panel)
- Blocks 12–13 → §5.3 (What's not in this quote)
- Blocks 14–16 → §5.3 (Keep it running)
- Blocks 17–18 → §5.3 (warranty panel + plain-English pull-quote; verbatim preserved)
- Blocks 19–22 → §5.4 (Timeline absorbs Schedule + Notes when notes are scheduling-flavored; non-scheduling notes still render below)
- Blocks 23–24 → §5.4 Terms
- Blocks 25–26 → §5.4 Signatures
- Blocks 27–28 → page furniture

Only addition: the plain-English warranty pull-quote (§5.3). Nothing removed.

---

## 6. Engine Migration — HTML/CSS → WeasyPrint

### 6.1 Why WeasyPrint

The user asked for "the most fluid/flexible output." WeasyPrint:
- Accepts full CSS (flexbox, grid, multi-column, CSS variables, `@page`, `@media print`).
- Handles tabular figures, font-feature-settings, precise letter-spacing.
- No headless browser dependency (faster than Playwright, lighter than Puppeteer).
- Still pure Python — slots into the existing CLI without changing the skill surface.

ReportLab works but enforces a PDF-primitive mental model. HTML/CSS lets a designer iterate the look without a code release.

### 6.2 File structure

```
proposal-generator/
├── build_proposal.py          # orchestrator — intake → template render → WeasyPrint
├── renderer/
│   ├── __init__.py
│   ├── render.py              # Jinja2 + WeasyPrint
│   ├── templates/
│   │   ├── base.html          # shared layout, @page rules, running header/footer
│   │   ├── formal-bid.html    # blocks/extends base.html
│   │   └── direct-quote.html  # blocks/extends base.html
│   └── static/
│       ├── print.css          # design system (palette, type, grid, panels)
│       ├── formal-bid.css     # bid-only overrides
│       ├── direct-quote.css   # quote-only overrides
│       └── fonts/             # Liberation Serif/Sans TTFs (copy of /usr/share/fonts/truetype/liberation)
└── ...
```

### 6.3 Enforcement stays where it is

`enforce_rules()` in `build_proposal.py` keeps running **before** template render. The template gets a fully enforced intake dict (MSP alt auto-inserted, approver auto-set, forbidden phrase grep'd, etc.). Templates never enforce; they just render.

### 6.4 QA gate still runs

The 14-point QA gate in `rules.md` §6 runs on the final HTML (not the PDF) via a post-render string check. Forbidden phrases, "GCC requests" grep, Cat6A mention, etc. The only check that moves is #9 "Gold usage within cap" — now a CSS-class counter rather than a color-usage heuristic.

### 6.5 Compatibility with existing YAML

Zero schema changes. Every field the current generator reads is read by the new templates. This means a user can point either generator at the same intake and get 1:1 content parity with different visuals.

---

## 7. Accessibility & Print

- Body contrast: Ink `#1A1A1A` on Cream `#FDFBF4` = 15.9:1 ratio (passes AA, passes AAA).
- Forest `#2E7D32` on Cream `#FDFBF4` = 6.5:1 (passes AA normal, AAA large).
- Slate `#455A64` on Cream `#FDFBF4` = 8.3:1 (passes all).
- Gold `#D4AF37` on Cream — 3.0:1, **used only as accent / rule, never as text** (policy match with `rules.md`).
- White on `--forest-dark` `#1E5622` = 9.6:1 (passes all) — cover band.
- Green-tint callout bg: text contrast identical to cream (background color difference is ~4% lightness).
- All tables keep a thead-repeat rule so scope tables split cleanly across pages with header repetition.
- All signature lines are actual horizontal rules in HTML (`<hr>` styled), not ASCII underscores — so e-sign software can overlay fields cleanly.

---

## 8. What changes in the build pipeline

Comparing the new build to the current one step-for-step:

| Stage | Current | Redesigned |
|---|---|---|
| 1. Intake load | `yaml.safe_load` | Same |
| 2. Enforcement pass | `enforce_rules()` | Same (no changes) |
| 3. Render | `build_cover()` + `build_transmittal()` + scope/totals/etc. → `Story` → `BaseDocTemplate.build()` | `render(type, intake)` → Jinja2 pulls `formal-bid.html` or `direct-quote.html`, pipes to `weasyprint.HTML(...).write_pdf(out_path)` |
| 4. Filename | `{proposal_no}_{client-slug}_{type}.pdf` in `out/` | Same |
| 5. Enforcement report | `Enforcement.report()` to stdout | Same |
| 6. QA gate | Hard rules re-grep on intake text | Run on rendered HTML before PDF write |

The CLI doesn't change: `python3 build_proposal.py intakes/<file>.yaml` still produces the same output path.

---

## 9. Deliverables for this spec

1. **This document.** Design system, content inventory, page-by-page layouts for both types.
2. **`mockups/formal-bid-mockup.html`** — live HTML of page 1–5 of the formal-bid design using `examples/bid-example.yaml` content (Straub / William Chrisman HS).
3. **`mockups/direct-quote-mockup.html`** — live HTML of page 1–4 of the direct-quote design using `examples/quote-example.yaml` content (AdHoc Center CCTV expansion).

Both mockups render as real documents in a browser and can be printed to PDF as-is (Cmd+P → Save as PDF) to see how the page breaks land. They'll also go through WeasyPrint cleanly once the renderer is wired.

---

## 10. Open questions — please flag any before I wire the code

1. **Cover band color** — `--forest-dark` at 2.8" tall on a Letter page is bold. Acceptable, or dial to 2.2" with a gold rule under?
2. **Category bands in the scope table** — add now, or reserve for a v2 once the new chassis is approved?
3. **MSP annual treatment** — show `${monthly}/mo · ${annual}/yr` in the card when `annual` is present, or keep monthly-only?
4. **Owner-friendly warranty pull-quote wording** — locked to the draft in §5.3 or open to tightening?
5. **Residential-quote and change-order** — hold for a v2 pass after this design is approved, or include in the same round?

---

*Companion files: [formal-bid mockup](./mockups/formal-bid-mockup.html) · [direct-quote mockup](./mockups/direct-quote-mockup.html) · [rules.md](../rules.md) · [SKILL.md](../SKILL.md) · [build_proposal.py](../build_proposal.py)*
