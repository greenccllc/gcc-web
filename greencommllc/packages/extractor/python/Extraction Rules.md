# 3-Intake / Extraction Rules

> **Purpose:** How to count, how to resolve conflicts, how to tag confidence. Applies to both bids and quotes.
> **Referenced by:** `1-Bids/Rules.md` §B.2–B.4, `2-Quotes/Rules.md`.

---

## 1. THE SOURCE HIERARCHY (what wins when sources disagree)

Applied in this order:

1. **Placed floor-plan symbols** (count what's actually drawn)
2. **Legend / symbol key** (if legend shows symbol not found on floor plan, cross-check RCP)
3. **Note blocks on drawings** (less authoritative than symbols)
4. **OCR of drawing text** (last resort — can misread)
5. **Spec narrative** (for device TYPES, not counts)

### Drawing precedence
- **T-sheets** (Telecom) > **E-sheets** (Electrical) > **A-sheets** (Architectural)
- **S-sheets** (Security) for cameras, ACS, intrusion — often separate from T
- **RCPs** (Reflected Ceiling Plans) — mandatory check for ceiling-mounted devices (WAPs, speakers, cameras)
- **A600** (Door Hardware Schedule) — mandatory check for ACS readers, mag locks, door position switches
- **M-sheets** (Mechanical) — check for BMS points that might touch LV (usually excluded)

---

## 2. THE 3-BUCKET SYSTEM

Every scope item gets exactly one bucket:

| Bucket | Meaning | Shows on proposal? |
|--------|---------|---------------------|
| **Official** | Explicitly shown on uploaded originals | Yes, as carried quantity |
| **Allowance** | Derived from building logic or indirect sources (inferred) | Yes, as explicit allowance with basis |
| **Excluded** | Outside GCC scope or "by others" | Yes, in exclusion matrix |

Never mix buckets. Never carry an Allowance as Official.

---

## 3. CONFIDENCE TAGS

Every Official quantity gets a confidence tag:

| Tag | Basis | Action |
|-----|-------|--------|
| **High** | Shown on plans, counted directly | Carry as-is |
| **Medium** | Inferred from cross-sheet verification (e.g., A600 doors that need ACS but aren't on T-sheets) | Carry as-is, note basis |
| **Low** | Estimated via allowance logic (e.g., "typical classroom" replicated across unmarked rooms) | Convert to explicit Allowance; never carry as Official |

**Rule:** Low-confidence items must either be explicit allowances in the proposal or escape into exclusions. They do not live as "Official" quantities.

---

## 4. CROSS-SHEET VERIFICATION (mandatory)

Before locking a quantity, verify against:

### 4.A Doors (for ACS, intercoms, strikes)
- **A600** door hardware schedule is the primary source
- Cross-check with T-sheets for reader placement
- Cross-check with S-sheets (if present) for controller drops
- Flag any door with electric hardware not shown on T/S

### 4.B Ceilings (for WAPs, speakers, cameras)
- **RCPs** are primary for ceiling devices
- Cross-check with T-sheets for drop locations
- Flag ceiling devices not on T-sheets (common omission)

### 4.C Telecom rooms
- **E-sheets** for power to TR (GCC excludes but notes)
- **A-sheets** for TR dimensions (for rack sizing)
- **T-sheets** for backbone connections
- Flag missing TR dimensions → allowance

### 4.D Elevators
- Count **shafts**, not floors (Rule B.19)
- Exactly 2 Cat6 per shaft, homerun to MDF/IDF
- Shaft symbol repeats on every floor plan — do not double-count

---

## 5. THE 6 SCOPE CATEGORIES

Every endpoint falls into one of 6 categories. Tabulate all quantities under these:

### A. Data Endpoints (Cat6 / Cat6A)
Sub-groups by termination style:
- WAPs (biscuit or ceiling mount)
- Wall boxes by port count (1-port, 2-port, 4-port)
- Floor boxes by port count
- TV boxes (1 data cable per TV, existing recessed box)
- Cameras (IP — biscuit, ceiling/wall mount)
- Intercoms / call stations
- Elevator phones (biscuit, 2 per shaft, Ground floor only on plans)
- ACS devices (direct to controller, no faceplate)

### B. Coax Endpoints (RG6)
Same sub-group structure as A. Many jobs = 0 coax (all-IP).

### C. HDMI Endpoints
Display / AV runs. Wall boxes, floor boxes, recessed TV boxes. Group by run length and connector type.

### D. Composite Endpoints
Multi-conductor / specialty cable (ACS composite, speaker wire, intercom multi-pair). Group by cable type and device.

### E. Fiber Scope (backbone)
- Runs (count, strand count, type — e.g., 3× 12-strand OM3)
- Panels (rack-mount or wall-mount by TR)
- Linear feet (total LF)

### F. TR Buildout
- Server racks (qty, size — e.g., 42U 2-post)
- Ladder rack / cable runway (LF)
- Fiber termination boxes (wall-mount if no rack)
- GCC-scope equipment: UPS, patch panels, cable managers, grounding bars

### G. Materials & Supplies (calculated-quantity items)
Nested under the category each item supports:
- Cable by type with LF totals
- J-hooks, bridle rings, hangers (calculated from LF / spacing)
- Velcro, labels, cable ties
- Mud rings, gang boxes, blank inserts
- Consumables

---

## 6. THE 3-TIER INPUT SYSTEM

Minimum data needed to start estimating:

| Tier | Input | AI Output |
|------|-------|-----------|
| **Tier 1** | Plans only | Quantities only (allowances for everything not shown) |
| **Tier 2** | Plans + Specs | Quantities + conformance matrices + testing commitment |
| **Tier 3** | Full Package (plans, specs, contract, schedule) | Everything including schedule, phasing, commercial terms |

Escalate to the user when we have less than Tier 1 data.

---

## 7. UNCLEAR INFORMATION PROTOCOL (Rule B.5 ref)

When drawings are unclear, illegible, or conflicting — do NOT issue RFIs. Resolve in this order:

1. **Derive** from other files in the job (spec says one thing, plan shows another → use the more specific)
2. **HD / AI deep analysis** (re-read the problem page at higher resolution, re-check legends)
3. **Unit allowance** with clear basis (e.g., "14 ea classroom data drops allowance based on typical K-12 spec")
4. **Exclusion** with written rationale

Never carry a Low-confidence quantity as Official. Never guess.

---

## 8. COUNT VERIFICATION (before BTQ lock)

Before locking BTQ, run these checks:

- **Total endpoint count** ≤ 1.5× the symbol count on T-sheets (flag overcount)
- **Per-drop rate** = Connect subtotal ÷ drop count, **target < $400/drop**
- **Cable LF** = drops × typical run length (building-dependent; 120' avg small job, 180' avg large)
- **TR count** — exactly 1 MDF per building; IDFs as shown
- **Fiber run count** = IDFs (each IDF gets one OM3 run from MDF)
- **Elevator cables** = shafts × 2 (Rule B.19)
- **Door readers** cross-verified with A600

Any check failure → revisit the extraction before pricing.

---

## 9. WHAT TO DELIVER AFTER EXTRACTION

At end of Phase 2:
- `BTQ - {Job Name}.xlsx` in `Internal/` — master quantities + pricing workbook
- `GCC Discrete Drop Counts - {Job Name}.pdf` in `Internal/` — A–G inventory with LF subtotals per category
- **Section 2 (Plan Analysis)** of `Job Brief - {Job Name}.md` in `Internal/` — internal quantity + risk analysis
- Cross-sheet verification log in `Internal/Processing/` (optional but recommended for complex jobs)

Template sources:
- `1-Bids/Templates/Internal-Only/Job Brief Template.md` (§2 Plan Analysis)
- `3-Intake/Templates/Drop Counts.md` (template for the PDF)

---

## 10. UNIFIED SCOPE RECONCILIATION (pre-extraction)

Before any quantity is extracted or price is modeled, reconcile all `Intake/` sources into a **single maximal scope**:

1. List every phase, level, and area mentioned across ALL `Intake/` files (plans, specs, RFP, addenda, contracts, GC invite, site notes)
2. Where sources disagree on presence/absence, use the **union** — include it unless excluded in writing
3. Document the reconciled scope in **Section 2 (Plan Analysis)** of `Job Brief - {Job}.md` (Internal/) with a **scope matrix**: phase × level × area
4. Document every "declined / deferred" phase with:
   - Source document (with page reference)
   - Exact exclusion language (verbatim quote)
   - Date of source
5. When a phase / level / area is present in plans but missing from spec (or vice versa), **include it** and note the source conflict in the scope matrix

The reconciled scope becomes the **binding scope for every downstream output** (BTQ, Drop Counts, Field Guide, Proposal Packet). No output is allowed to cover less than the reconciled scope.

See `1-Bids/Rules.md` §B.0 for the binding Unified Scope Rule.

---

## 11. RE-ANALYSIS SOURCE PROTOCOL (operationalizes §B.2.5)

When the user asks to re-analyze, re-scope, re-extract, or re-price any job:

### 11.1 Reset-to-Intake
1. Open `Intake/` — treat as if encountering the files for the first time
2. Do **NOT** reference prior `Internal/` outputs (BTQ, Job Brief, Drop Counts, Finance Summary, etc.) as inputs to the re-run
3. Do **NOT** reference prior `Extractions/{file}/Run N/` outputs as inputs (use only for comparison after the new run completes)

### 11.2 New Run folder
1. For each `Intake/` file being re-analyzed, locate `Extractions/{matching filename stem}/`
2. Find the highest existing `Run N/` — create `Run N+1/`
3. Write the new analysis artifacts into `Run N+1/`:
   - `extraction.md` — narrative + structured field tables with confidence scores
   - `data.csv` — machine-readable row output (optional but recommended)
   - `annotated-source.pdf` (optional) — source PDF with annotations
   - any cropped figures, heat maps, or supporting artifacts

### 11.3 Update Master Extraction
After the new run completes, update `Extractions/Master Extraction - {Job}.md` (see §13) by merging this run's findings into the consolidated view per §14 most-likely-value logic.

### 11.4 Exception — audit-trail work
When the user explicitly asks "compare v1 analysis to v2 analysis" or similar, prior `Internal/` or `Extractions/` outputs ARE the input — the task is measuring drift. Log the comparison output in the Master Extraction Conflicts table.

---

## 12. EXTRACTIONS FOLDER PROTOCOL

### 12.1 Structure

```
{Job Name}/Extractions/
├── Master Extraction - {Job Name}.md     ← consolidated running view
├── {Intake filename stem 1}/
│   ├── Run 1/
│   │   ├── extraction.md
│   │   ├── data.csv
│   │   └── annotated-source.pdf
│   ├── Run 2/
│   └── Run 3/
├── {Intake filename stem 2}/
│   └── Run 1/
└── {Intake filename stem 3}/
    ├── Run 1/
    └── Run 2/
```

### 12.2 Auto-create on Intake
When any file is added to `Intake/` (or encountered without a matching Extraction subfolder), **immediately create** `Extractions/{filename stem}/` — the filename **without extension**, preserving the original name as-is (category prefix, hyphens, etc.).

Example: `Intake/Plans - A-001 First Floor.pdf` → `Extractions/Plans - A-001 First Floor/`

### 12.3 Run-N numbering
- First analysis pass of any Intake file → `Run 1/`
- Each subsequent re-analysis (manual or triggered) → `Run N+1/`
- **Prior runs are never modified or deleted** — forensic record

### 12.4 What goes in each Run folder

**Minimum:**
- `extraction.md` — narrative + field tables with source citations and confidence scores

**Recommended:**
- `data.csv` — machine-readable version of the field tables
- Any cropped figures / heatmaps / annotation images referenced in `extraction.md`

**Optional:**
- `annotated-source.pdf` — original Intake PDF with overlays (circles, highlights, callouts)
- `prompt.md` — the exact prompt used for this run (reproducibility)

### 12.5 Not allowed in Extractions/
- Client-facing deliverables (those live in `Client/`)
- Editable master artifacts like BTQ, Job Brief, Finance Summary (those live in `Internal/`)
- Modifying anything inside a prior `Run N/` folder once the next run exists

---

## 13. MASTER EXTRACTION FILE SPEC

Single file at `Extractions/Master Extraction - {Job Name}.md` — the running **consolidated view** of every field extracted from every Intake source across every Run.

### 13.1 Required sections

1. **Header** — Job name, update timestamp, source file count, total run count
2. **Project Metadata** — SF, floor count, phases, due date, market type, etc.
3. **Scope Matrix** — phase × level × area (per §10 reconciliation)
4. **Endpoints** — data drops, WAPs, cameras, ACS devices, etc.
5. **Infrastructure** — MDF/IDF count, fiber runs, rack specs, cable LFs
6. **Commercial Terms** — payment, retainage, schedule, LDs
7. **Addenda Log** — every addendum with date + summary
8. **Conflicts Requiring Human Resolution** — any field where sources disagree and no clear tiebreaker applied
9. **Update Log** — append-only log, one entry per Run, with timestamp + source file + Run # + summary of new findings

### 13.2 Field table row format

| Field | Value | Conf | Source |
|-------|-------|------|--------|

- **Field** — canonical name (e.g., `Total SF`, `Cat6 drops`, `Fiber OM3 runs`)
- **Value** — chosen value (most-likely after §14 logic)
- **Conf** — percentage 0–100 (see §14.1)
- **Source** — which Intake file + Run + basis (e.g., "Plans R2 (Plans R1 said 82,000)")

### 13.3 Conflicts table format

| Item | Value A | Value B | Chosen | Why |
|------|---------|---------|--------|-----|

Every row flagged during §14 tiebreaker analysis lands here until human resolves.

### 13.4 Update cadence
- Updated at the end of EVERY Run (any Intake file)
- Timestamp updated on every write
- Prior state preserved via Update Log section (§13.1 item 9)

### 13.5 Template
`3-Intake/Templates/Master Extraction Template.md` — copy into new jobs as the starting skeleton.

---

## 14. CONFIDENCE & MOST-LIKELY-VALUE LOGIC

### 14.1 Confidence scale

| Score | Meaning |
|-------|---------|
| **100%** | Explicitly stated, unambiguous (e.g., spec section header "84,000 SF") |
| **90–99%** | Direct inference from hard data (e.g., counted symbols from a clean T-sheet) |
| **70–89%** | Reasonable derivation with minor ambiguity (e.g., RCP shows count but T-sheet is silent) |
| **50–69%** | Best-guess with meaningful ambiguity (e.g., "approximately 500 drops" from RFP narrative) |
| **<50%** | → **Flag to Conflicts table** — do not populate main field |

### 14.2 Tiebreaker order (for NON-COUNT fields when two sources disagree)

Applies to discrete non-count values: SF, floor count, phase count, schedule dates, addenda count, commercial terms, contact names, room labels. **Count fields follow §14.5 compilation logic instead.**

Apply in sequence; stop at the first tiebreaker that resolves:

1. **Higher-confidence source wins** (e.g., counted symbols > RFP narrative)
2. **Later-dated source wins** (addendum beats base plan)
3. **More-specific source wins** (architectural SF from floor plan > program narrative SF)
4. **Most-recent run of same source wins** (Run 3 beats Run 1 on same file)
5. **Still tied → populate Conflicts table** with both values + "unresolved — needs human review"

### 14.3 Write-through
- Main field tables hold the winning value
- Conflicts table preserves the full picture (A vs B + chosen + why)
- Never silently drop a losing value — always log in Conflicts

### 14.4 Confidence tracking (folder name + Job Brief, in sync)

The overall job folder confidence % (in `{Site} - {Date} - {XX%}`) rolls up from the weighted average of field confidences on the top 20 most-material fields (SF, drop count, floor count, phase count, MDF/IDF count, schedule, etc.). When Master Extraction updates OR a Scope Summary is rebuilt (§18), update the folder name confidence % if change ≥ 5%.

**Confidence is BIDIRECTIONAL** — it can DECREASE when an addendum broadens scope, reveals new systems, or exposes ambiguities. Canonical example: PLMS Middle School 85% → 70% after Addendum 02 added ACS + VSS + IDS + CareHawk scope reversals — scope got more *clear* but also much *bigger*, and new unknowns outgrew the resolution gain.

**Secondary record in Job Brief:** `Job Brief - {Job}.md` §1 Job Identity also carries the confidence % for audit trail. Keep in sync — update Job Brief first, then rename the folder (or batch renames at end of session, see below).

**Path-volatility mitigation for multi-step workflows (MANDATORY):**
1. Before starting any batch/queue operation, snapshot folder names via `list_folder_contents` on `5-Jobs/2. In Progress - #/` — use those exact paths throughout the workflow
2. **Defer all folder renames until ALL in-flight extractions/batches complete** — never rename mid-flight
3. Run all renames as the LAST step of a session via `move_operations_batch`
4. When continuing a prior session, re-snapshot paths before using any cached queue

This single issue cost 2 retry cycles in the 2026-04-20 backfill. Hardening this rule saves ~30% of multi-step-workflow debug time.

### 14.5 Count-field compilation (device counts, drop counts, cable LF)

Counts do NOT use §14.2 tiebreakers — they use **compilation + cross-verification**. A count is reliable when **≥2 independent signals converge**. Single-signal counts are downgraded to allowance until verified.

**Cross-verification signals** (any 2 convergent = High confidence):

| Signal | Source |
|---|---|
| Visual symbol takeoff | VLM per-file extraction |
| Label numbering sequence | Consistent range present (e.g., `D1–D17`, `AP1–AP11`, `CAM1–CAM5`) |
| Legend entry | Symbol defined in legend with count/note |
| Spec note | Spec narrative states count or per-room density |
| Room schedule | A-series schedule lists devices per room |
| PDF annotation dictionary | Bluebeam/Acrobat `/FreeText` enumerable via pikepdf (§19 method 4) |
| CAD layer metadata | OCG layer names expose discipline (`T-DATA`, `T-WAP`, etc.) |
| Prior-run consensus | Same count observed across multiple independent runs |
| Mount-pattern inference | Labeled area reveals pattern (e.g., cameras corridor-only, clocks classroom-only — see LV Identifiers §9.6) |

**Compilation process:**
1. Each run produces its own count per sheet/area
2. Master Extraction §Endpoints tables show **range** when runs diverge (e.g., "Data drops: 149–165"), or **single value** when they converge
3. Conflicts table logs every run's count + which signals corroborate
4. Final compiled count = the value with the **most corroborating signals**. If ≥2 values each have 2+ signals, use the **high end** per Memory Conservative Labor Rule.
5. Single-signal counts that can't be verified → flagged "field verify" or converted to allowance

**Example (Brookland 2026-04-20):**
- E1.08 PDF `IDF1-D` labels: Run 2 VLM said 17 (`D1–D17`); Run 3 VLM said 16 ("D13 gap"); annotation enumerator read 18 dict entries; grep on PDF text found `D1..D12 + D14..D17`
- Signals supporting **17**: Run 2 VLM + Run 4 legend-first + annotation dict (with duplicate D12 explaining the extra entry — Bluebeam save artifact)
- Signals supporting **16**: Run 3 VLM only (single signal; likely rendering-resolution artifact)
- **Compiled: 17** (3 convergent signals vs 1)

---

## 15. INTAKE OCR FORCING (mandatory, added 2026-04-20)

Every OCR-capable file uploaded to a job's `Intake/` folder must have OCR forced **immediately upon arrival**, before any extraction or analysis runs. This guarantees text is indexed and searchable for downstream work (semantic search, grep, plan extraction, addenda comparison).

### 15.1 What "OCR-capable" means

| Force OCR | Why |
|-----------|-----|
| **PDFs** (any variant — born-digital, scanned, mixed) | OCR fills any image-only pages |
| **PNG, JPG, JPEG** | Plan markups, screenshots, scanned reference images |
| **HEIC** | iPhone field photos / markups |
| **TIFF, BMP, WebP** | Less common but supported |

| Skip OCR | Why |
|----------|-----|
| XLSX, DOCX, PPTX | Text already extractable natively |
| TXT, MD, CSV, JSON, XML, HTML | Plain text — no OCR needed |
| MP4, MP3, WAV, M4A | Use `transcribe_audio` instead |

### 15.2 Why force OCR instead of relying on default ingest

1. **Searchability** — OCR text powers `search_folder_semantic`, `search_file_semantic`, `grep_tool`, and AI extraction. A scanned plan with no OCR is invisible to all four.
2. **Plan analysis** — older RFPs and GC-supplied scans frequently arrive as image-only PDFs. Without forced OCR, device counts and notes can't be extracted.
3. **Conflict detection** — addenda comparison (per §10 reconciliation) and cross-sheet verification (§4) depend on text being present in every source.
4. **Cost** — running OCR once during intake is cheaper than discovering missing text mid-extraction and having to backfill under deadline pressure.
5. **Failed-OCR retries** — `force_ocr=True` re-runs OCR even on previously-failed attempts (default ingest gives up on first failure).

### 15.3 How (mechanical)

Use `extract_structured_data` with `force_ocr=True`. Recommended params:

```
extract_structured_data(
    files=[...all OCR-capable files added this batch...],
    table_schema={"fields": [{"name": "doc_type", "display_name": "Document Type", "type": "string"}]},
    prompt="Identify document type. Primary purpose: OCR refresh.",
    force_ocr=True,
    effort_level="medium",                  # Gemini 3 Flash — 1M context, reliable on construction sets
    process_one_page_at_a_time=False,       # one task per file, not per page
    use_pdf_screenshots=False,              # text-only is fine for OCR trigger
    output_file_name="intake_ocr_{job_slug or batch_id}.csv"
)
```

**The output CSV is incidental** — it's a single-column dump of doc types. The real deliverable is the OCR re-index in AI Drive's storage. The CSV can be left in the chat artifacts folder or deleted after the call completes.

**Escalation tier (if medium fails):** Isolate the failed file paths from the output CSV (files missing from `file_name` column vs. input queue), build a retry CSV, and re-run with `effort_level="high"` (Gemini 3 Pro — 2M context, strongest on oversized or malformed PDFs). **Do not re-run the whole batch** — only the failures. Never escalate by running the same effort level twice; promote tiers: low → medium → high.

⚠️ **BEFORE escalating — check for stale paths first.** If ALL files in a retry batch fail with "Failed to read file content" and the close time is 4-5 seconds (no actual processing), the cause is almost always stale file paths, not model effort. In Progress job folders contain a `{XX%}` confidence suffix that renames the folder when scope extraction advances. A queue built 10 minutes ago may reference `... - 70%/Intake/...` when the current path is `... - 85%/Intake/...`. **Remediation:** call `list_folder_contents` on `5-Jobs/2. In Progress - #/` (folders_only=true), build a `{old_confidence → new_confidence}` mapping, remap the retry CSV, and re-run. This single issue cost 2 retry cycles in the 2026-04-20 backfill run.

**Effort-level history (2026-04-20 backfill):** Pass 1 at `low` yielded 458/493 (93%) success; all 35 failures were large PDFs in active-bid jobs (construction sets, specs manuals, drawing sets). **Default was bumped from `low` → `medium` as a result.** This §15.3 recipe now opens at medium.

---

## §16 — LV High Reference Build (per-job Internal/ deliverable)

Every job with ≥1 High-relevance Intake file gets a consolidated `Internal/LV High Reference.pdf` — a single PDF containing **only the LV-relevant pages** of the job's High-relevance Intake files, with an auto-generated cover page. This is the estimator's single-stop reference during bid preparation.

### 16.1 Why
- Intake files are kept whole and immutable for forensic integrity **once the lock engages** (first `Run 1/` created → job auto-moves to `2. In Progress/`). While the job is in `1. Client Intake/`, adds / deletes / replacements / renames are all permitted as uploads are assembled. See `Folder Structure.md` §4.
- But estimators don't need to re-read a 1,500-page construction set to find the 30 LV-relevant pages
- **Selective-page extraction** pulls only the pages referenced in the LV TOC, dramatically shrinking file size (typically 70–90% reduction)
- One PDF per job = one tab in the browser = faster bid prep

### 16.2 When to build / rebuild
- **Initial build:** After LV TOC extraction catalog is complete and `LV Relevance = High` is set on ≥1 file for the job
- **Rebuild:** Any time new Intake files are added and any are tagged High, OR existing file's relevance is promoted to High
- **Versioning:** Follows `## Output Doc Versioning Rule` (memory) — archives prior to `Internal/Past Versions/V# - LV High Reference.pdf`

### 16.3 Selection rules
- **Include:** All files with `LV Relevance = High` in the catalog
- **Source-file selection deduplication:** if `{name}.pdf` and `{name} (Copy).pdf` both appear, keep only `{name}.pdf`
- **Order within merged PDF:** Plans → Specs → Addendum → RFP → Contract → GC Invite → Reference → Markup → Photo
- **Single-file jobs:** Copy the source file as-is (no cover page)
- **Multi-file jobs:** Prepend auto-generated cover page listing source files + pages included per source

### 16.4 Page extraction logic
Parse the catalog's `LV Table of Contents` column for page references. Supported patterns:
- `(p. 5)` `(p.5)` `(page 5)` — single page
- `(pp. 5-12)` `(pages 5 to 12)` `(Pages 5-12)` — range
- `(Sheets T1.1, T2.1)` — sheet labels (resolved to page numbers via TOC lookup if available, else treated as opaque refs)
- `[Page 5]` `[pp. 5-10]` — bracketed variants

Apply these extensions:
1. **Section-fill** — for Specs/Project-Manual files, extend each page ref forward by up to 5 pages or until next spec section heading, whichever is closer
2. **+1 context page** — for non-spec files, include +1 page after last ref to catch continuation content
3. **≤3 page safety** — any source file ≤3 pages long is included in full (page extraction skipped)
4. **Fallback** — if TOC parser finds no page refs in a High-relevance file, include the whole file

### 16.5 Cover page format
Auto-generated first page of merged PDF (multi-file jobs only):
- Title: `LV High Reference`
- Subtitle: `{Job Name}`
- Build date (suppress from user-facing output per memory rules — for internal/audit only)
- Source table: `{File}` · `{Doc Type}` · `{Pages Extracted}` · `{LV Systems}` · `{1-sentence summary from catalog}`
- No GCC branding (this is an internal doc, not a deliverable)

### 16.6 Build pipeline
1. Read `intake_lv_toc_catalog.xlsx` (the master LV TOC catalog)
2. Filter `LV Relevance == High` AND `path_norm.endswith('.pdf')`
3. Group by `job` → build per-job manifest
4. For each job: parse page refs from `LV Table of Contents`, apply section-fill + context rules
5. Use `pypdf` to extract selected pages from each source → merge in category-sorted order → prepend cover page
6. Write to `System/Chat History/{chat_id}.artifacts/merged/{job_slug}_LV_High_Reference.pdf`
7. Use `copy_operations_batch` to copy each merged PDF to `{job_path}/Internal/LV High Reference.pdf`

**Initial build (2026-04-20):** 21 jobs processed, 85/88 High files included (3 HEIC format skipped — UCM Mitchell Barn), avg 82% size reduction vs whole-file merge. Processing time ~33 seconds.

### 16.7 Known format gaps
- **HEIC** — `pillow_heif` not preinstalled in sandbox; use `convert_file_to_pdf` tool to pre-convert HEIC → PDF before merger, OR accept partial build
- **CAD/BIM** — `.rvt`, `.dwg`, `.ifc` files cannot be merged into PDF within sandbox; if any appear as High-relevance, flag for manual handling
- **Video** — `.mp4`, `.mov` files cannot be embedded in PDF; link in cover page text only

### 16.8 Catalog regeneration dependency
The LV High Reference build depends on `intake_lv_toc_catalog.xlsx` being current. If new Intake files are added:
1. Rerun §15 OCR force-refresh on the new files
2. Rerun LV TOC extraction (effort_level=medium, with `3-Intake/LV Identifiers.md` + `3-Intake/Trade Boundaries.md` as knowledge_files)
3. Regenerate merged PDF for affected jobs
4. Redistribute via `copy_operations_batch`

---

## §15.4 Vector layer & annotation extraction (supplemental to OCR)

**Why:** OCR captures rasterized text and handles scanned documents well. But PDFs exported from CAD/Revit/Bluebeam often carry **structured vector data that OCR cannot see**:
- **OCG (Optional Content Groups) layers** — CAD layer names preserved as PDF layers (e.g., `E-LIGHT-CKTS`, `T-DEVICE`, `SEC-CAM`)
- **PDF annotations** — bluebeam/acrobat markups with device tags embedded as `/Contents` text (e.g., "AP", "CAM", "CR", "IC")

This data is a **pre-cooked takeoff**. Extracting it costs 0 LLM tokens — just Python + pikepdf.

**When to run:** Automatically on every intake PDF upload (alongside the §15.3 OCR pass). Also retroactively on existing intake via backfill.

**What to look for:**
| Finding | Signal | Action |
|---|---|---|
| OCG layers present | Plan was exported preserving CAD layers | Parse layer names — often spell out disciplines |
| Annotations with `/Contents` text matching device tokens (AP, CAM, CR, IC, WAP, RDR, DRP, IDF, MDF) | Consultant/designer placed device markers on the plan | Treat as first-pass device count |
| Annotations without `/Contents` (shapes only) | Visual highlights / zones — no readable tags | Ignore for count; still useful for location heat-map |

**Device token regex** (use word-boundary regex to avoid false positives like "AP" inside narrative text):
```python
device_tokens = {'AP','CAM','CR','IC','WAP','RDR','DATA','DRP','IDF','MDF','CCTV','KP','SPK','INTERCOM','READER','SENSOR'}
tokens_in_text = set(re.findall(r'\b[A-Z]{1,5}\b', ' '.join(annot_texts).upper()))
has_device_labels = bool(tokens_in_text & device_tokens)
```

**Mechanics (pikepdf one-liner template):**
```python
import pikepdf
from collections import Counter
with pikepdf.open(path) as pdf:
    ocg = pdf.Root.get('/OCProperties', {})              # CAD layers (often empty)
    for page in pdf.pages:
        for annot in page.get('/Annots', []):
            subtype = str(annot.get('/Subtype', '?'))     # Circle/Square/FreeText/Popup
            contents = annot.get('/Contents', None)       # device tag string if any
```

**Scale:** ~10 seconds to scan 374 PDFs (100% of a 26-job intake). Negligible cost.

**2026-04-20 baseline scan findings:**
- 374 intake PDFs scanned
- 122 (33%) have ≥1 annotation
- 44 have text annotations
- **6 files (4 unique, 2 dup copies)** carry actionable LV device-tag data — concentrated in **MOCSA** and **AdHoc Center** markup files
- 0 files had OCG layers (confirms plans in GCC's intake are flattened exports, not live-layered CAD → consultant markups are the richer signal)
- Output: `intake_annot_scan.xlsx` — one row per PDF, columns: `total_annots`, `text_annots`, `has_device_labels`, `annot_text_sample`, `subtype_mix`

**Integration with §15.3 OCR pass:** Run both passes on every new upload. Annotation scan is fast and free — run first. OCR pass is the long tail.

**Integration with LV TOC cataloging:** When building the LV relevance catalog, **boost relevance score for any file flagged `has_device_labels=True`** — these files contain the highest-signal takeoff data in the entire intake.

### 15.4 When triggered

| Event | Action |
|-------|--------|
| New file added to any `Intake/` folder | Run §15.3 call covering that file (or batch with sibling additions) |
| Multiple files added in one upload session | Single batched call covering all OCR-capable additions |
| Rename within `Intake/` (move = same bytes) | Skip — OCR persists with file content, not name |
| File replaced (common during Client Intake assembly; rare post-lock) | Re-trigger OCR on the new content |

### 15.5 Output file routing

Per memory `### File handling`, intermediate scratch goes in `Temporary/` for portfolio-wide ops, or `{Job}/Internal/Processing/` for job-specific. The OCR refresh CSV is technically scratch — leaving it in the chat artifacts folder (`System/Chat History/{chat_id}.artifacts/`) is acceptable since it has no downstream value beyond the OCR side-effect.

### 15.6 Retroactive backfill (2026-04-20)

A one-time backfill ran `force_ocr=True` against all 493 OCR-capable files across the existing 26 jobs with intake content (374 PDF + 97 JPG + 13 PNG + 9 HEIC). 5 non-OCR files (2 XLSX, 2 DOCX, 1 MP4) were correctly skipped. Any file uploaded before 2026-04-20 is now covered. **Going forward, the rule applies to every new intake addition.**


---

## 16. BIM / PDF METADATA EXTRACTION (added 2026-04-20)

### 16.1 Why

Construction-set PDFs almost always originate from **Revit (BIM)** or **AutoCAD**. The PDF format can preserve — or discard — three layers of information beyond the visible drawing:

1. **Document metadata** (Creator, Producer, Author, CreationDate) — reveals the source CAD/BIM system
2. **XMP metadata** (extended XML) — sometimes has Revit-specific project tags
3. **OCG layers** (Optional Content Groups) — the CAD/Revit layer structure (e.g., `A-WALL`, `E-LITE-EQPM`, `T-DATA-DROP`)

Extracting these tells us:
- **Whether the source CAD/BIM file carries layer intelligence** (→ document source system in Job Brief; do NOT request files per §16.7)
- **The drafter's discipline organization** (reveals hidden scope categories even if text is raster)
- **Which downstream extraction method is most productive** (layer-aware vs text-OCR)

### 16.2 When to run

Trigger `bim_probe_fast.py` (stored at `3-Intake/Templates/BIM Probe/bim_probe_fast.py`) on any new `Intake/` job **immediately after §15 OCR force-pass completes**. Output lands in `{Job}/Internal/Processing/BIM Metadata Probe.md`.

**Do not skip** for small jobs — a 1-page Civil 3D plot can carry dozens of layers of intelligence.

### 16.3 Source system cheat-sheet (Creator/Producer tags)

| Token | Source System | Implication |
|-------|---------------|-------------|
| `Revit` | Autodesk Revit (BIM) | .rvt source exists; request via BIM 360 / ACC |
| `AutoCAD` | Autodesk AutoCAD | .dwg source exists; request directly |
| `Civil 3D` | Autodesk Civil 3D | .dwg with civil-specific layers; check for V-EX-* utility traces |
| `Bluebeam Stapler` | Bluebeam page-merge tool | **PDF was compiled from multiple source PDFs — layers FLATTENED.** Individual discipline PDFs upstream likely still have layers. Request un-stapled set. |
| `Bluebeam Revu` | Bluebeam (markup/review) | May have been re-saved after review; original CAD is upstream |
| `MicroStation` | Bentley | .dgn source; common on civil/infrastructure jobs |
| `Archicad` | Graphisoft | .pln source; common on hospitality |
| `Vectorworks` | Vectorworks | .vwx source; common on landscape/theatrical |
| `SketchUp` | SketchUp | .skp source; rare on LV scope |
| `pdfplot*` / `HP Plot` | CAD plotter driver | PDF is a native CAD plot — layer data most likely preserved |

### 16.4 OCG layer prefix cheat-sheet (CAD industry standard AIA CAD Layer Guidelines)

| Prefix | Discipline | GCC interest |
|--------|-----------|--------------|
| `A-` | Architectural | Wall layouts, door numbering for ACS cross-ref |
| `E-` | Electrical (power + lighting) | EC scope — mostly OUT for LV, but `E-LITE-*` confirms lighting controls scope; `E-LOW-*` or `E-COMM-*` may flag LV |
| `T-` | Telecommunications | 🎯 **GCC scope primary layers** — T-DATA, T-VOICE, T-WAP, T-CCTV, T-ACCS, T-FIBR |
| `S-` | Structural / Security | Ambiguous — can be structural steel OR security; check context |
| `M-` | Mechanical (HVAC) | BMS scope — mostly OUT for GCC |
| `P-` | Plumbing | OUT for GCC |
| `FP-` | Fire Protection (suppression) | OUT for GCC |
| `FA-` | Fire Alarm | OUT for GCC per Trade Boundaries §2.B |
| `C-` | Civil (site) | Mostly OUT; watch for `C-UTIL-TELE` or `C-COMM-DUCT` (site comm sleeves) |
| `V-` | Survey / Existing conditions | `V-EX-TELE` reveals existing telecom utility at property line |
| `G-` | General (sheets, title blocks) | No scope content |
| `I-` | Interior (furnishings) | Mostly OUT; rare LV cross-ref |
| `Q-` | Equipment / Quantities | Sometimes Revit schedules spill here |
| `L-` | Landscape | OUT |

When an OCG list is present, search for `T-*`, `E-LOW-*`, `E-COMM-*`, `SEC-*`, `CCTV-*`, `AV-*` — those are GCC targets even if the visible drawing shows them merged with other disciplines.

### 16.5 Record where findings land

- **Probe output** → `{Job}/Internal/Processing/BIM Metadata Probe.md`
- **Findings in Plan Analysis** → §2 Document Basis adds "Source system" column; §13 Recommendation notes if un-stapled source request is warranted
- **New symbols found in OCG layer names** → append to `3-Intake/LV Identifiers.md` §13.5 (CAD Layer Vocabulary)
- **Scope-claim verification** (optional follow-up pass) → run targeted needle-scan on T-sheet page range only; do NOT scan full 300+ page sets

### 16.6 Flattened-PDF reality

If the main construction set is Bluebeam-Stapled and layers are gone:
1. Flag in Plan Analysis §2 Document Basis: "PDF was compiled by Bluebeam Stapler — layer intelligence destroyed."
2. **Fall back to full text-OCR extraction per §1.** That's the only path.
3. Accept the information loss and bid the package as delivered. Density allowances + exclusions (Rule B.5) handle any downstream ambiguity.

### 16.7 What this rule is NOT — NO REQUESTS POLICY (hard rule)

- **Never request the source CAD/BIM file**, un-stapled PDFs, BIM 360 access, or any clarification — GCC bids the package as delivered, period.
- Not a trigger for RFIs — GCC does NOT issue RFIs, pre-bid questions, metadata requests, or any outbound ask to GC during the bid window.
- Not a substitute for the §1 source hierarchy (symbols on sheets still win).
- Not applied to non-plan PDFs (specs, RFPs, reports — metadata has little scope value there).
- Rationale: asking for more information signals GCC lacks the ability to bid the package delivered. Cover Letter should emphasize GCC's self-reliance — "bid as drawn" is a competitive differentiator.

---

## 17. AUTHOR METADATA CROSS-REFERENCE (added 2026-04-20)

PDF Author field often reveals the specific drafter who plotted the file. Cross-referencing multiple Intake files against Author field can detect:

- **Same drafter across disciplines** = well-coordinated set (higher confidence)
- **Different drafters same firm** = normal, confidence neutral
- **Author field missing** = CAD set plotted by central plot service, common on large firms; neutral

Example pattern: `Plans - Civil Site Improvement V3.pdf` and `Plans - Site Photometrics PH1.pdf` sharing the same drafter in PDF properties → confirms single-source civil package and internal consistency. Use when cross-validating civil scope boundaries.

---

## 18. SCOPE SUMMARY DELIVERABLE (added 2026-04-20)

### 18.1 What it is

A compressed **decision brief** — 1-3 pages — that distills every Master Extraction into a go/no-go actionable format. Written AFTER Master Extraction is stable, BEFORE BTQ runs. One per job.

### 18.2 Where it lives

```
{Job}/Extractions/Scope Summary - {Job Name}.md
```

Sibling to `Master Extraction - {Job Name}.md`. Never in `Internal/` (Scope Summary drives BTQ but is NOT a BTQ input doc itself — it's the scope-decision record).

### 18.3 Required structure (6 sections, in this exact order)

```markdown
# Scope Summary — {Job Name}

**Confidence: XX%** · {bid context: due date, GC, owner, square footage}

## [optional ★ banner] — Any critical scope finding that must not be missed

## 1. What GCC Bids (IN SCOPE — furnish & install)
[Device/system table with counts + notes]

## 2. What GCC Does NOT Bid (OUT)
[By-others table with reason citation per Trade Boundaries §]

## 3. Vendor Cost Estimate Bands (GCC cost basis)
[Materials + equipment + labor cost bands + ballpark base bid range]

## 4. Key Commercial Terms
[LDs, prevailing wage, warranty, payment terms, schedule constraints]

## 5. Assumptions Carried (priced into bid — no open items)
[Every gray-zone item with assumption + treatment (carried/excluded/buffer)]
**Outstanding Items: None.** [one-line explanation of how every item is resolved]

## 6. Confidence: **XX%** — Rationale
[Why this confidence; what's locked; what's priced via buffer; NO "raises when GC clarifies" language]

---
*See also: `Master Extraction - {Job}.md` · `Internal/LV High Reference.pdf`*
```

### 18.4 NO OUTSTANDING ITEMS rule (HARD RULE)

Every Scope Summary MUST include the line `**Outstanding Items: None.**` in §5. To earn this line, every ambiguity from earlier extraction passes must be resolved by one of three paths:

| Path | Action | Example |
|---|---|---|
| (a) Assume | Pick most-likely-case, price with +X% contingency | "ACS door count 15 — Add 02 cited 13+, carry +15% buffer" |
| (b) Exclude | Cite Trade Boundaries § or memory rule | "Wireless clock hardware OFOI per Trade Boundaries §2.B" |
| (c) Price buffer | Add contingency inside materials/equipment subtotal | "+10% pathway allowance on ACS/VSS/IDS scope" |

**Forbidden language in a shipped Scope Summary:**
- "TBD"
- "To be confirmed"
- "Pending GC clarification"
- "Awaiting addendum"
- "Confirmed in pre-bid"
- "Raises to X% when [GC action]"

**Allowed language about internal actions:**
- "Internal plan re-count could tighten range"
- "BTQ audit required if outside reality-check bands"
- "Field verification not performed per NO REQUESTS policy"

### 18.5 Confidence rationale rules

The §6 rationale must:
1. State that scope is **locked** — no outstanding questions
2. Separate **scope certainty** (what's in/out) from **count certainty** (how many)
3. Explain how buffer pricing absorbs count uncertainty
4. Name the confidence as **ship-as-is** — implying bid can drop today
5. Optionally note what internal action could raise confidence (re-count, catalog refresh), but NEVER GC-dependent actions

### 18.6 Update cadence

Scope Summary is regenerated whenever:
- New addendum arrives and forces Master Extraction refresh
- Vendor pricing research changes cost bands materially (>15%)
- Confidence % changes (folder rename triggers Scope Summary refresh too)

Old Scope Summaries archive to `{Job}/Extractions/Past Versions/V# - Scope Summary - {Job}.md` per Output Doc Versioning Rule.

### 18.7 Integration with other deliverables

| Downstream Doc | How Scope Summary Feeds It |
|---|---|
| BTQ workbook | §1 IN SCOPE table = line item source; §3 cost bands = sanity-check tool |
| Cover Letter | §2 OUT OF SCOPE = exclusions; §5 assumptions = cover letter assumptions |
| Bid Proposal | §1 + §4 = base scope + commercial terms; §3 = bid price range |
| Job Brief | §6 confidence rationale = Internal Review §3 content |
| Finance Summary | §3 base bid range = revenue forecast |

---

## 19. MULTI-METHOD EXTRACTION PIPELINE (added 2026-04-20)

### 19.1 Why multiple methods

No single extraction method is perfect. VLM hallucinates on overlapping annotations. OCR stops at image boundaries. Layer metadata only works if CAD preserved layers. Annotation enumeration only works when plans carry Bluebeam/Acrobat markup. **Cross-verifying 3+ independent methods is faster and more accurate than re-running one method endlessly.** Convergent signals earn confidence; divergent signals trigger compilation per §14.5.

### 19.2 The 6 methods

| # | Method | Tool | Best for | Limitations |
|---|---|---|---|---|
| 1 | VLM per-file | `delegate_large_file_or_multi_file_task` + `high_effort_model=gemini` | Symbol takeoff, narrative interpretation, legend parsing | Can hallucinate on duplicate overlapping annotations; silently stops mid-doc if page range not explicit |
| 2 | Schema structured extraction | `extract_structured_data` | Row-per-device CSV with consistent fields | Requires well-defined schema upfront |
| 3 | PDF layer + metadata | `execute_python_code` + pikepdf | CAD layer names (OCG), producer/author/revision tags | Only works on layer-preserved PDFs (§16) |
| 4 | PDF annotation enumeration | `execute_python_code` + pikepdf reading `/Annots` + `/Contents` | Bluebeam/Acrobat `/FreeText` markups — definitive for labeled devices | Only works when plans carry markup |
| 5 | Grep pattern search | `grep_tool` | Label sequence validation (e.g., `D\d+`, `AP\d+`, `SPK\d+`) | Requires OCR text layer (§15) |
| 6 | Semantic search | `search_folder_semantic` / `search_file_semantic` | Concept discovery (e.g., "where are fiber runs mentioned") | Doesn't return counts |

### 19.3 Pipeline sequence (per-run guidance)

These are defaults; a specific job may collapse or expand based on the deliverable signal:

- **Run 1 (initial):** Methods 1 + 2 in parallel. Most jobs end here if counts converge.
- **Run 2 (re-run after rules update):** Method 1 only, reset-to-Intake per §11.1.
- **Run 3 (cross-verification):** Methods 3 + 4 + 5 in parallel (cheap — no LLM tokens). Compare against Run 2.
- **Run 4 (deep legend-first):** Method 1 again with `high_effort_model=gemini` + explicit legend-first prompt. Compile all 4 runs per §14.5.

Run counts > 4 are legitimate when new signals emerge (addenda, field verification, scope changes).

### 19.4 Page-range enforcement (NEVER STOP AT PAGE 5)

Every delegate call MUST specify explicit `start_page` and `end_page`. Default behavior on large documents can silently truncate.

```python
delegate_large_file_or_multi_file_task(
    files=[...],
    start_page=1,
    end_page=999,     # explicit — covers any realistic document
    prompt="..."
)
```

**Verify coverage:** check `pages_read` in the response. Confirmed coverage reads like "All pages in the requested page range: 1 to N were read". If `pages_read` is silent or reports fewer pages, rerun with tighter ranges.

### 19.5 Failed-file handling (SPLIT, don't SKIP)

When a delegate call fails on a specific file (timeout, content error, size limit):

1. **Do NOT skip the file** — §12.2 requires every Intake file to be extracted
2. **Do NOT force a retry with same parameters** — will fail again
3. **Split the file into page ranges** and run each separately:
   - 20-page file → 4 × 5-page batches
   - Each batch gets its own delegate call with explicit start_page / end_page
   - Concatenate results into the per-file `extraction.md`
4. If the file still fails as a single page, convert to image via sandbox (`pdf2image`) and retry as image extraction
5. If no method works, log as `extraction failed — manual review required` in Master Extraction Conflicts table

### 19.6 Output structure per run

```
Extractions/{file stem}/Run N/
├── extraction.md              ← primary narrative (method 1)
├── data.csv                   ← structured row output (method 2), optional
├── layer-meta.md              ← OCG layers + PDF metadata (method 3), when run
├── layer-meta.raw.json        ← raw pikepdf dict output (method 3), when run
└── annotation-inventory.md    ← Bluebeam enumeration (method 4), only if /FreeText present
```

**Sandbox hygiene:** Clear `AI_DRIVE_OUTPUT/` at the start of every generation run. Stale files from prior runs can bleed into Internal/ or Client/ folders on upload. One-line reset:

```python
import shutil, os
if os.path.exists('AI_DRIVE_OUTPUT'):
    shutil.rmtree('AI_DRIVE_OUTPUT')
```

### 19.7 Cross-reference to §14.5

Once all pipeline methods have run, consolidate via §14.5 compilation logic into Master Extraction. Do NOT use §14.2 tiebreakers for count fields — §14.2 is for non-count values only.
