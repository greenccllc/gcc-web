# GCC LLC Proposal Generator

A hybrid system for generating branded, on-voice proposals for GCC LLC's three core audiences: General Contractors, Owners/End-Clients, and Residential homeowners.

## How it works

Two entry points, one back-end:

```
┌─────────────────────────┐        ┌─────────────────────────┐
│  HTML Form (artifact)   │        │  Claude prompt          │
│  Fill fields → export   │   OR   │  "Draft a GC proposal   │
│  structured JSON        │        │   for Smith Constr..."  │
└───────────┬─────────────┘        └───────────┬─────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  System Prompt (Claude)      │
            │  + Company Profile           │
            │  + Template (GC/Owner/Res)   │
            │  + Components (credentials)  │
            │  + Scope Library             │
            │  + Rate Card                 │
            │  + Schedule templates        │
            │  + T&C                       │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  Filled Proposal (markdown)  │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  build_proposal_pdf.py       │
            │  → Branded PDF in /output/   │
            └──────────────────────────────┘
```

## Folder map

| Folder | Purpose |
|---|---|
| `/templates/` | Master outlines for GC / Owner / Residential proposals. Define section order, placeholders, which components to pull. |
| `/components/` | Reusable content blocks — Company Overview, Team, Insurance, Certifications, Hard Rules, Differentiators. Pulled verbatim into every proposal. |
| `/scope-library/` | One file per service group (11 total: 7 commercial + 4 residential). Standards cited, deliverables, inclusions, exclusions. |
| `/pricing/` | Rate card (labor, materials, markup), unit prices, estimating methodology. TBD values for Nathan to fill. |
| `/schedule/` | Milestone schedule templates by project type. |
| `/terms/` | Standard T&C — payment, change orders, warranty, insurance, lien waivers. |
| `/prompts/` | Claude system prompts. The master prompt references profile + templates. |
| `/samples/` | Example filled briefings + generated proposals for reference. |
| `/output/` | Final generated PDFs. |
| `generator.html` | Interactive form — fill and export as JSON briefing. |
| `build_proposal_pdf.py` | Renders filled proposal markdown into a branded PDF. |

## Usage — two flows

### Flow A: Conversational (fastest)

1. In your Claude Project, paste the contents of `/prompts/master-system-prompt.md` as the project instructions (one-time setup).
2. Start a new chat. Say: *"Draft a GC proposal for Smith Construction on the Riverside Warehouse project — 120,000 sqft, Cat6A + cameras + access control, mobilize Jan 2027, substantial completion Mar 2027."*
3. Claude drafts the proposal markdown, pulling components and scope-library content.
4. Save the markdown output, then run `python build_proposal_pdf.py <markdown file>` to generate the PDF.

### Flow B: Structured form (repeatable)

1. Open `generator.html` in a browser (or in the Cowork artifact panel).
2. Fill in the form: client, project type, audience, services, key numbers, schedule.
3. Click **Export Briefing** — copies a structured JSON blob to clipboard.
4. Paste the JSON into Claude with the system prompt loaded, or save as `briefing.json` and run `python build_proposal_pdf.py --input briefing.json --audience gc` to render directly.

### PDF rendering — command line

```
python build_proposal_pdf.py --input samples/sample-gc-k12-summer.md
python build_proposal_pdf.py --input samples/sample-owner-retail.md --audience owner
python build_proposal_pdf.py --input samples/sample-residential-custom.md --audience residential
```

Output lands in `/output/<audience>-<slug>-<YYYY-MM-DD>.pdf`. The renderer automatically:

- Strips any internal "QA Report" appendix before rendering
- Flags unsubstituted `{{variable}}` placeholders on a warning page at the end
- Uses Carlito (metric-compatible Calibri replacement; same look on non-Windows systems)
- Enforces brand palette, bullet-only lists in body, gold accent rules beneath H2s
- Adds GCC-branded footer with contact block + page number on every body page
- Skips footer on the cover page

## Brand & voice rules (enforced in every generated proposal)

- **Palette:** Forest Green `#2E7D32`, Ink Slate `#455A64`, Warm Gold `#D4AF37`, Cream `#FDFBF4`, Ink `#1A1A1A`
- **Type:** Calibri 11pt body, Forest Green H1/H2
- **Lists:** Bullet-only, no numbered lists except for schedule milestones
- **No photos.** Text-only proposals. (Logos and simple dividers OK.)
- **Forbidden phrases** (enforced): "world-class", "best-in-class", "industry-leading", "non-union", "synergy", "cutting-edge", "turnkey solution", "state-of-the-art", "leverage". See `/components/voice-rules.md`.
- **Name rule:** "GCC LLC" in full on first reference per page; "GCC" is acceptable thereafter. Never "Green Comm Cabling" unless in legal name block.

## Maintenance

- When a new service is added, drop a new scope file in `/scope-library/` and update the template checklist.
- When pricing changes, update `/pricing/Rate Card.md` — the system prompt references the latest version.
- When a new project completes that's worth citing, add it to the projects reference data AND add a short blurb to `/components/Case Studies.md`.

## Source of truth

- Company profile: `/GCC LLC - Company Profile.docx` (uploaded to Claude Project Knowledge)
- Website content: `/Website Content Inventory.md`

Last updated: 2026-04-21 — proposal generator fully wired; three sample audience PDFs produced and QA-validated.
