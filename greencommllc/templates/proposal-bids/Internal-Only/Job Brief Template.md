# Job Brief — {{JOB NAME}}

**INTERNAL — DO NOT SHARE WITH GC**

| Field | Value |
|---|---|
| Job Name | {{JOB NAME}} |
| GC | {{GC NAME}} |
| Owner | {{OWNER NAME}} |
| Site Address | {{SITE ADDRESS}} |
| Project Type | {{PROJECT TYPE}} |
| Confidence % (latest) | {{CONFIDENCE}} |
| Bid Date | {{BID DATE}} |
| Cover Letter Date | {{COVER LETTER DATE}} |
| Status | {{Client Intake / In Progress / Proposal Sent / Won / Lost}} |

> **Hub document.** Merges all internal brief-level records for the life of this bid. Section 1 is the project identity; §2-3 carry analysis + strategy; §4 tracks proposal build; §5-6 log events. Keep this file current — other internal docs read from here.

---

## §1  Job Identity / RSI  (Ready for Scope Intake)

### 1.1  BuildingConnected / Invitation

- **BuildingConnected link:** {{BC URL}}
- **BC due date:** {{BC DUE DATE}}
- **Invitation source:** {{GC / direct / prequal portal}}
- **Prequal status:** {{Approved / Pending / Not required}}

### 1.2  Documents Provided

- [ ] Bid drawings ({{count}} sheets, issued {{date}})
- [ ] Project manual / specifications
- [ ] Addenda received ({{count}})
- [ ] Pre-bid meeting minutes
- [ ] Pre-bid RFI responses ({{count}})
- [ ] Site walk / photos — {{scheduled / held / declined}}
- [ ] Bid form (if required by GC)
- [ ] Scope-of-work clarifications from GC

**Bid-as-drawn compliance:** GCC does not issue pre-bid RFIs or clarification requests. All ambiguities resolved by assumption or exclusion in the proposal. See `1-Bids/Rules.md` §B.5.

### 1.3  Key Contacts

| Role | Name | Org | Phone | Email |
|---|---|---|---|---|
| GC Estimator | {{}} | {{}} | {{}} | {} |
| GC PM | {{}} | {{}} | {{}} | {{}} |
| Architect | {{}} | {{}} | {{}} | {{}} |
| Engineer (EE/MEP) | {{}} | {{}} | {{}} | {{}} |
| Owner Rep | {{}} | {{}} | {{}} | {{}} |

### 1.4  Site / Program Basics

- **Building type:** {{Office / Hotel / K-12 / Healthcare / Industrial / Mixed-use}}
- **Gross SF:** {{}}
- **Floor count:** {{}}
- **Occupancy at time of work:** {{Unoccupied / Phased occupied / Fully occupied}}
- **Ceiling heights:** {{}}
- **Work hours:** {{Standard 7-5 / Night / Weekend}}
- **Union status:** {{Non-union GC / Union-only / Mixed}}
- **Prevailing wage:** {{Yes — order # / No}}

---

## §2  Plan Analysis

### 2.1  Scope Extraction Summary

| Endpoint Type | Count | Confidence |
|---|---:|---:|
| A — Data drops (WAP, workstation, device) | {{}} | {{}}% |
| B — Voice drops | {{}} | {{}}% |
| C — CCTV cameras | {{}} | {{}}% |
| D — Access control readers | {{}} | {{}}% |
| E — Intercom / paging | {{}} | {{}}% |
| F — Fiber strands (horizontal + backbone) | {{}} | {{}}% |
| G — Other (nurse-call, AV, DAS feeders, etc.) | {{}} | {{}}% |
| **Total active drops** | **{{}}** | **{{}}% overall** |

Extraction method: `3-Intake/Templates/LV Symbol Extractor.py` + plan markups. Counting hierarchy per `3-Intake/Extraction Rules.md`.

### 2.2  Cable Length Estimate

- **Avg run length basis:** {{building type band — see memory Calc Methods §Horizontal cable}}
- **Total horizontal cable LF (with waste %):** {{}} LF ({{waste}}% applied)
- **Box count (1,000' plenum, +5% safety):** {{}} boxes
- **Fiber backbone (if any):** {{}} LF
- **Pathway / J-hook / cable tray notes:** {{}}

### 2.3  TR / IDF / MDF Plan

| Room | Floor | Function | Rack Count | Backbone In | Horizontal Out | Notes |
|---|---|---|---:|---|---|---|
| MDF | {{}} | Head-end | {{}} | {{fiber / demarc}} | {{}} | {{}} |
| IDF-{{#}} | {{}} | IDF | {{}} | {{fiber up}} | {{}} | {{}} |

### 2.4  Site-Wide Spec Decisions

- **Cable spec baseline:** Cat6A plenum on every data drop (GCC standard — always included, no upcharge to GC; Cat6 substitute is NEVER offered).
- **Jacket colors:** {{Blue = data · Green = CCTV · Red = ACS · White = voice}}
- **Connector / plate:** {{}}
- **Fiber type:** {{OS2 SM / OM4 MM}}
- **Service loop lengths:** {{MDF 10' · IDF 10' · endpoint 3'}}
- **Cat6A alternate:** REMOVED — baseline standard, carried as included upgrade in Bid Proposal §3.
- **Weekend + after-hours alternate:** **DEDUCT only** — labor surplus credit passed to GC. Never priced as ADD.

### 2.5  Ambiguities → Resolutions (NO REQUESTS policy)

| # | Plan Question | GCC Resolution | Carried In |
|---:|---|---|---|
| 1 | {{e.g. fiber strand count not specified}} | {{Assumption — 12-strand OS2 per run}} | Assumptions §2.1 SOW |
| 2 | {{}} | {{}} | {{Exclusion §7 or Assumption SOW §2}} |

> GCC never issues pre-bid RFIs. If a plan gap is truly unbiddable, document the walk decision here and withdraw from the opportunity.

### 2.6  Special Scope / High-Risk Items

- {{e.g. historic building — existing pathway unknown}}
- {{e.g. occupied school — after-hours access required}}
- {{e.g. ceiling height >14' — lift rental}}

---

## §3  Internal Review  (GCC strategy — never leaves this file)

### 3.1  Pricing Strategy

- **Base Bid target:** ${{}}
- **Pricing band vs. benchmarks:** ${{low}}–${{high}} ({{hotel per-key / office $/SF / $/drop}})
- **Buffer applied:** {{5% / 10% / 15%}} (per Conservative Labor Rule)
- **Contingency:** {{5% / 10% / 15%}} inside materials subtotal
- **Margin target:** {{28–35%}}

### 3.2  Alternates & Unit Prices Strategy

| Item | Included? | Rationale |
|---|---|---|
| UniFi Managed Services ({{tier}}) | YES | Mandatory whole-building alternate |
| Accelerated schedule | {{YES/NO}} | {{}} |
| Performance & payment bond | {{YES/NO}} | {{Required by GC / Optional}} |
| Weekend after-hours DEDUCT | {{YES/NO}} | {{Offer when we have labor surplus}} |
| Project-specific ADD A4 | {{}} | {{}} |
| Project-specific DEDUCT D2 | {{}} | {{}} |

### 3.3  Margin & Scenario Analysis  (read from Finance Summary)

| Scenario | Base Bid | Cost | Gross Margin | Notes |
|---|---:|---:|---:|---|
| Best case | ${{}} | ${{}} | {{}}% | {{Fast crew, no CO delays}} |
| Expected | ${{}} | ${{}} | {{}}% | {{Labor Plan baseline}} |
| Worst case | ${{}} | ${{}} | {{}}% | {{Full buffer burned, scope creep}} |

### 3.4  Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---:|---|---|---|---|
| 1 | {{e.g. GC moves schedule forward}} | Med | High | Accelerated-schedule alternate priced |
| 2 | {{}} | {{}} | {{}} | {{}} |

### 3.5  Go / No-Go Decision

- **Decision:** {{GO / NO-GO}}
- **Decision-maker:** Kaitlyn Morris — {{date}}
- **Reasoning:** {{}}

---

## §4  Proposal Tracker

### 4.1  Section Status

| # | Section | Source | Status | Owner | Target |
|---:|---|---|---|---|---|
| 01 | Cover Letter | `Templates/Standard/01 Cover Letter.docx` | {{Draft/Review/Final}} | Kaitlyn | {{}} |
| 02 | Bid Overview | `Templates/Standard/02 Bid Overview.docx` | {{}} | {{}} | {{}} |
| 03 | Bid Proposal | `Templates/Standard/03 Bid Proposal.docx` | {{}} | {{}} | {{}} |
| 04 | Statement of Work | `Templates/Standard/04 Statement of Work.docx` | {{}} | {{}} | {{}} |
| 05 | Qualifications | `Templates/Standard/05 Qualifications.docx` | {{}} | {{}} | {{}} |
| 06 | Standards | `Templates/Standard/06 Standards.docx` | {{}} | {{}} | {{}} |
| 07+ | Conditional sections | See §4.2 | {{}} | {{}} | {{}} |

### 4.2  Conditional Sections Triggered

| # | Trigger | Source | Status |
|---:|---|---|---|
| {{}} | {{e.g. Bonding required}} | `Templates/Conditional/Bonding Capacity Statement.docx` | {{}} |

### 4.3  Submission Plan

- **Submission target:** {{date/time}}
- **Submission method:** {{BC portal / email to estimator / hand-delivered}}
- **Cover email:** from `Submission Email.md` — {{Draft/Ready}}
- **Proposal Packet file name:** `GCC LV Div27-28 - {{GC}} Proposal Packet - {{Site}}.pdf`
- **Packet version:** v1

### 4.4  Internal Review Gates

- [ ] Plan analysis QC (Nathan)
- [ ] BTQ sanity vs. benchmarks
- [ ] Margin floor check (≥28%)
- [ ] Reality-check vs $/drop band
- [ ] Final proposal packet QC (Kaitlyn)
- [ ] Kaitlyn signature on Cover Letter + 02 Bid Overview

---

## §5  Addenda Log

| Addendum # | Issued | Received | Summary | Confidence Δ | Pricing Δ |
|---:|---|---|---|---:|---:|
| 00 | Baseline | — | Original bid docs | — | — |
| 01 | {{date}} | {{date}} | {{}} | {{±%}} | ${{±}} |
| 02 | {{date}} | {{date}} | {{}} | {{±%}} | ${{±}} |

> Addenda extend Intake immutability exception — add docs to `Intake/Addenda ##/` but do not rewrite prior extractions; supersede via delta notes in Extractions/.

---

## §6  Post-Submission Log

### 6.1  Submission Record

- **Submitted:** {{date/time}}
- **Confirmation:** {{screenshot / email receipt / BC log}}
- **Base Bid submitted:** ${{}}
- **Alternates included (count):** {{}}

### 6.2  GC Post-Submission Requests

| Date | Request | GCC Response | Status |
|---|---|---|---|
| {{}} | {{e.g. clarification on §7.H ACS programming}} | {{}} | {{}} |

### 6.3  Outcome

- **Result:** {{Won / Lost / Pending}}
- **Award date:** {{}}
- **Awarded amount:** ${{}}
- **Lost to:** {{Competitor name if known}}
- **Competitor price (if disclosed):** ${{}}

### 6.4  Lessons Learned

- **What went well:**
  - {{}}
- **What to fix for next bid:**
  - {{}}
- **Data to carry forward:**
  - {{}}

---

*Job Brief is the single internal hub. Update throughout the bid. Archive upon Won/Lost final.*
