# GCC LLC — Proposal Hard Rules

**Purpose.** Machine- and human-readable catalog of the non-negotiable rules every
proposal must follow. The generator enforces these automatically; Claude reads
them before drafting narrative content; the QA pass validates against them.

Last updated: 2026-04-20 · Sourced from `3-Intake/4-Company/Knowledge Base.md` §§19–55.

---

## 1. Pricing & Scope Rules

### 1.1 Cat6A plenum is the cabling baseline
- Every data drop quoted uses **Cat6A plenum**, regardless of what the RFP specifies.
- If the spec calls for Cat6: we quote Cat6A at the same line price. Note in scope:
  "Cat6A plenum supplied on every data drop — no upcharge vs. Cat6 spec."
- If the spec calls for Cat6A: standard.
- Never quote Cat5e for new data drops unless the client explicitly rejects Cat6A
  after being offered it.

### 1.2 Managed Services (MSP) alternate is mandatory
- **Every quote must include** an MSP alternate line, separated from the base bid.
- Minimum MSP line items: monitoring & remote support, MAC labor allowance,
  warranty administration, on-site response terms with drive-time pricing.
- Phrase as an additive alternate: "Optional Managed Services — Monthly: $X / month".
- Never suppress the MSP line, even if the client said they don't want it —
  present it, let them decline in writing.

### 1.3 Loyalty discount for repeat clients
- If the client has at least one prior GCC invoice, apply a **loyalty discount**
  line, visible and named: "GCC Loyalty Discount — Repeat Client".
- Discount is a visible deduction from subtotal, not a silent price cut.
- Always show the gross price AND the discount so the client sees the value.

### 1.4 Standard warranty line — always
- Include verbatim: "Lifetime workmanship warranty on all GCC-installed cable
  and terminations, transferable with the property. Manufacturer warranties
  pass through on equipment. Five-year coverage on GCC-furnished hardware."
- Never shorten, never omit, never substitute alternate language.

### 1.5 NO REQUESTS / NO ACCESS HOLDS
- **Never** include language that makes the proposal contingent on client
  providing access, staging areas, parking, utilities, badges, or similar
  requests. All such items are GCC's responsibility to coordinate.
- Forbidden construction: "GCC requests that the Owner provide [X]".
- Acceptable: "GCC will coordinate site access and staging with the Owner's
  designated representative at least 48 hours before mobilization."

### 1.6 Scope exclusions are stated cleanly
- Always include the standard exclusion block if any of the listed scopes
  appear in the source documents:
  - Fire alarm (FAC / NICET systems)
  - Emergency radio (ERCES / BDA / DAS)
  - Lighting control & shade automation
  - Building management / HVAC controls
  - Mass notification beyond standard PA speakers
  - Line-voltage electrical work
- Phrase as exclusions, not as allowances. Never quote-sheet allowances
  we can't deliver.

---

## 2. Voice & Language Rules

### 2.1 Bid voice (formal bid, public / GC work)
- Third-person, formal: "GCC Contracting will provide..."
- Division 27 / Division 28 references where applicable.
- CSI MasterFormat section numbers when the spec uses them.
- Prevailing-wage compliance statement if the project is public-work bid.
- No sales language, no emotive adjectives, no taglines.
- No "we recommend" — the bid responds to the spec; recommendations go in
  a separate VE (Value Engineering) section if invited.

### 2.2 Quote voice (direct commercial / residential)
- First-person plural, warmer: "We'll run Cat6A plenum to every outlet..."
- Short paragraphs, plain English, no acronyms without expansion.
- Narrative scope over line-item dump for residential quotes.
- Explain value alongside price (why the warranty matters, why Cat6A is
  future-proofing, why MSP is optional insurance).
- Okay to use "we recommend" — this is advisory.

### 2.3 Forbidden phrases — never appear in any proposal
- "best in class"
- "cutting-edge"
- "world-class"
- "synergy" / "synergies"
- "leverage" (as verb)
- "turnkey solution"
- "ecosystem"
- "industry-leading"
- "seamless"
- "robust"
- "low-hanging fruit"
- "value-add" / "value add"
- "bandwidth" (as a metaphor for capacity)
- "touch base"
- "circle back"
- "deep dive"
- Any sentence starting with "In today's..."
- Any sentence ending with "...going forward."

### 2.4 Forbidden structural habits
- No em dashes as a tic (one per page maximum).
- No parenthetical asides in the pricing table.
- No footnotes that say "subject to change" — prices are firm for the
  quoted validity window; if anything is variable, state that inline.
- Never italicize client name.
- Never ALL-CAPS project name in body text.

---

## 3. Brand Compliance

### 3.1 Color usage
- Forest Green `#2E7D32` — primary, section headers, brand marks.
- Slate `#455A64` — body kickers, meta text, secondary info.
- Warm Gold `#D4AF37` — scarcity / emphasis marker only. Cap: 2× per bid
  document, 3× per quote document.
- Cream `#FDFBF4` — primary page background for formal docs.
- Green Tint `#F1F8F1` — alt-row fills, callout backgrounds.
- Ink `#1A1A1A` — body text.

### 3.2 Typography
- Headers: serif (Liberation Serif Bold, stand-in for Georgia / FreeSerif).
- Body: sans (Liberation Sans, stand-in for Calibri / FreeSans).
- Numbers in pricing tables: tabular-figure friendly, never italicized.

### 3.3 Logo rules
- Never place the logo on a white background without a frame or on a
  near-white page without knock-out. Use the transparent-PNG variants
  in `/logos_transparent/`.
- On dark backgrounds (forest-green cover pages, etc.) use typography
  rather than the dark-on-dark logo.
- Any proposal with a visible white logo block fails QC.

### 3.4 Signatures & sign-off
- Prepared by: Nathan Morris, Director of Operations & CTO.
- Approved by: Kaitlyn Lim Morris, President & CEO (for bids > $25k or
  on any public/municipal project).

---

## 4. Document Structure Rules

### 4.1 Formal bid required sections (in order)
1. Cover (project, bid due date, bid number if any)
2. Transmittal letter
3. Scope of work (clean inclusions)
4. Exclusions (clean exclusions — use §1.6 list where applicable)
5. Line-item pricing
6. MSP alternate (mandatory — §1.2)
7. Schedule & milestones
8. Warranty statement (§1.4 verbatim)
9. Terms & conditions
10. Licensure & insurance
11. Sign-off block

### 4.2 Direct quote required sections (in order)
1. Cover / intro
2. Project summary (narrative, 2–3 paragraphs)
3. What we'll do (scope narrative)
4. What we won't do (exclusions, brief)
5. Pricing (line-item table)
6. MSP alternate (mandatory — §1.2)
7. Loyalty discount (if applicable — §1.3)
8. Warranty statement (§1.4 verbatim)
9. Timeline
10. Terms & validity
11. Signature block

### 4.3 Residential quote required sections (in order)
1. Cover / intro (homeowner-friendly)
2. What we're proposing (plain-English summary)
3. What's included (scope in layman terms)
4. What's not included (exclusions)
5. Your price (single-table pricing)
6. MSP alternate (mandatory — §1.2)
7. Warranty statement (§1.4 verbatim)
8. Timeline & next steps
9. Signature block

### 4.4 Change order required sections (in order)
1. Header: referencing original project & CO number
2. Description of added/removed scope
3. Line-item price delta
4. Schedule impact (days added)
5. Revised total (original + CO)
6. Signature block (both parties)

---

## 5. Pricing Table Rules

- Every line: Qty · Description · Unit Price · Line Total.
- Labor shown separately from materials on bid format.
- On quote format, labor is rolled into the line unless client requested
  separation.
- Tax line shown as "Tax — estimated, billed at invoice" (never rolled in).
- Subtotal → (loyalty discount if applicable) → Total.
- MSP alternate shown below Total, clearly separated, labeled as
  "Optional Monthly Service — not included in Total above".
- Validity window: "Pricing firm through [date], 30 days from issue."

---

## 6. QA Gate — Must Pass Before Sending

A proposal is not ready to send until **all** of these return green:

1. [ ] Cat6A plenum on every data drop line (§1.1)
2. [ ] MSP alternate line present (§1.2)
3. [ ] Loyalty discount applied if client is repeat (§1.3)
4. [ ] Standard warranty language verbatim (§1.4)
5. [ ] No REQUESTS language (§1.5) — grep for "GCC requests"
6. [ ] Scope exclusions present if any listed scopes appear in source (§1.6)
7. [ ] Forbidden phrases absent (§2.3) — run grep
8. [ ] Voice matches proposal type (§2.1 / §2.2)
9. [ ] Gold usage within cap (§3.1)
10. [ ] Logo on cream/cream or dark bg handled properly (§3.3)
11. [ ] Section order matches proposal-type checklist (§4)
12. [ ] Pricing table complete per §5
13. [ ] Validity window date set and reasonable
14. [ ] Signature block populated with correct signer per §3.4
