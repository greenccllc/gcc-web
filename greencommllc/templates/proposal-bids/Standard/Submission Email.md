# GCC Bid Submission Email Template

> **Purpose:** Standardized cover email transmitting a Proposal Packet to a General Contractor. The email IS the archive — no separate PDF deliverable per `1-Bids/Rules.md` §F and `Format Guide.md` Round 2 consolidation.
> **Usage:** Drafted in `Internal/Submission Email - {{SITE_NAME}} - {{GC_NAME}}.md`, sent from Kaitlyn's email.
> **Replace every `{{TOKEN}}` before sending.**

---

## Subject line

```
GCC LV Div27-28 Proposal — {{SITE_NAME}} — Bid # {{BID_NUMBER}} — Due {{DUE_DATE}}
```

---

## Email body

```
{{GC_CONTACT_NAME}},

Please find attached the full Proposal Packet for {{SITE_NAME}} in {{CITY_STATE}} — GCC's formal Division 27/28 Low-Voltage subcontract proposal.

BASE BID
${{BASE_BID}} — firm-fixed, valid 30 days from today.

Priced as three buckets per standard GCC structure:
 • Materials (commodity hardware, cable, terminations)
 • Labor ({{LABOR_HOURS}} hrs at standard billed rate)
 • Services (project management, closeout, warranty administration)

SCOPE SNAPSHOT
 • {{ENDPOINT_COUNT}} endpoints across {{FLOOR_COUNT}} floor(s) / {{SQ_FT}} SF
 • {{TR_COUNT}} telecom room(s): 1 MDF + {{IDF_COUNT}} IDF(s)
 • Cat6A plenum default · Fluke DSX-8000 certified on every drop
 • Active equipment treated as Owner-Furnished / Contractor-Installed unless specs name a model

SCHEDULE
 • Earliest mobilize: {{MOBILIZE_DATE}}
 • Substantial completion: {{SUBSTANTIAL_DATE}}
 • Crew: {{FOREMAN_COUNT}} foreman + {{INSTALLER_COUNT}} installer(s) minimum on-site

ADDENDA ACKNOWLEDGED
{{ADDENDA_LIST}} — all received addenda reviewed and priced.

ATTACHMENTS
 • GCC LV Div27-28 - {{GC_NAME}} Proposal Packet - {{SITE_NAME}}.pdf (merged — includes Cover Letter, Bid Overview, Bid Proposal with SOV, Statement of Work, Qualifications, Standards, and any triggered conditional sections with PDF bookmarks for navigation)

WHY GCC
 • Lifetime workmanship warranty — transfers with the property
 • 100% on-time delivery record
 • Fluke DSX-8000 certification on every cable, reported via LinkWare PDFs

Happy to walk through the Schedule of Values or any alternate with you. Reply here or call direct.

Kaitlyn Morris
President · Green Communications Contracting LLC
(636) 224-8192 · kaitlyn@greencommllc.com
KCMO & STL

GCC LLC · Proprietary & Confidential · Licensed & Insured · KCMO & STL
```

---

## Authoring rules (follow on every send)

- Replace every `{{TOKEN}}` before sending. Leftover tokens = do-not-send.
- Keep the body inside the code fence above. No additional marketing language, no AI-filler phrases ("in conclusion", "it is important to note").
- **Forbidden in the email body** (per `1-Bids/Rules.md` §D): internal labor rates, markup multipliers, GCC actual cost, buffer percentages, efficiency scenarios, revision language ("v2", "revised", "updated"), the word "Submittal", or internal file names (BTQ, Job Brief, Finance Summary, Labor Plan, Field Guide).
- **Forbidden forever** (per `Format Guide.md` §A.6): "Non-Union Div 27/28 Contractor" — auto-DQs GCC from union-GC packets.
- Subject line uses exactly the format above. No "Revised", no "v2". Addenda are noted inside the body, not in the subject.
- Attachments list names exactly one merged Proposal Packet. Individual section PDFs exist at `Client/Proposal/v#/` root but are not attached — bookmarks inside the Packet are the TOC.
- Multi-GC jobs: send one email per GC, each with its own per-GC Proposal Packet (`GCC LV Div27-28 - {{GC_NAME}} Proposal Packet - {{SITE_NAME}}.pdf`).
- For public / school / federal jobs, the Packet already includes triggered Conditional sections (Bonding, Prevailing Wage, Site Safety Plan, etc.) — no need to re-list in the email body.

---

## Variables to fill in

| Token | Source |
|---|---|
| `{{SITE_NAME}}` | Job folder name (project + location) |
| `{{CITY_STATE}}` | Intake — BC printout or contract |
| `{{GC_NAME}}` | Job Brief §1 Job Identity |
| `{{GC_CONTACT_NAME}}` | Intake — BC printout primary contact |
| `{{BID_NUMBER}}` | RFP cover or BC printout |
| `{{DUE_DATE}}` | RFP cover |
| `{{BASE_BID}}` | 03 Bid Proposal §1 (rounded whole dollars — never show cents) |
| `{{LABOR_HOURS}}` | 03 Bid Proposal §2 SOV labor line (rounded) |
| `{{ENDPOINT_COUNT}}` | Drop Counts grand total |
| `{{FLOOR_COUNT}}` | Job Brief §2 Plan Analysis |
| `{{SQ_FT}}` | RFP / specs |
| `{{TR_COUNT}}` / `{{IDF_COUNT}}` | Job Brief §2 — 1 MDF implied |
| `{{MOBILIZE_DATE}}` | Project Schedule Phase 1 start |
| `{{SUBSTANTIAL_DATE}}` | Project Schedule Phase 5 end |
| `{{FOREMAN_COUNT}}` / `{{INSTALLER_COUNT}}` | Labor Plan crew mix (minimum on-site) |
| `{{ADDENDA_LIST}}` | 01 Cover Letter addenda block (mirror exactly) |

---

*Governance: `1-Bids/Rules.md` · `1-Bids/Workflow.md` · `1-Bids/Format Guide.md`*
