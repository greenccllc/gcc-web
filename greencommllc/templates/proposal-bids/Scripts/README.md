# 1-Bids/Templates/Scripts/

Python helpers for GCC LV Div27-28 bid production. All outputs go to `/home/user/AI_DRIVE_OUTPUT/` (auto-uploaded to AI Drive).

## Script Index

| Script | Purpose | Output |
|---|---|---|
| **Template Filler.py** | Universal `{{TOKEN}}` replacer — XML-level, handles run fragmentation | `{Template}` - FILLED.docx |
| **DOCX Text Replacer.py** | Bulk XML-level search-and-replace inside a DOCX (string + regex) | `{input}` - patched.docx |
| **Bid Overview Builder.py** | Thin wrapper — fills 02 Bid Overview template with job data | `02 Bid Overview - {job}.docx` |
| **BTQ Generator.py** | Multi-sheet Excel pricing workbook (Summary · Materials · Equipment · Labor · Services · Alternates · Unit Prices · Milestones) | `BTQ - {job}.xlsx` |
| **Finance Summary Generator.py** | Internal P&L scenario workbook (base / efficient / stressed / PW / CO+20%) | `Finance Summary - {job}.xlsx` |
| **Labor Plan Generator.py** | Per-phase labor PDF with crew composition + compliance checks | `Labor Plan - {job}.pdf` |
| **Drop Counts Generator.py** | 20-category stacked takeoff PDF (Data Drops · Fiber Runs · Fiber Term Enclosures · Fiber Patch Panel · Coax · HDMI · WAPs · Cameras Interior · Camera Exterior · ACS Doors · Intercoms/Speakers · Elevator Endpoints · TV/Display · IoT (Smart) · MDF · IDF · Switches · Patch Panels · UPS · Ladder Racks\Trays) + Construction Environment | `GCC Discrete Drop Counts - {job}.pdf` |
| **Field Guide Generator.py** | Installer floor-by-floor PDF per Field Guide Rules (supports inline, CSV, BTQ input modes) | `Field Guide - {job}.pdf` |
| **Proposal Packet Merger.py** | Merges section PDFs → one packet with bookmarks (governance naming: `GCC LV Div27-28 - {GC} Proposal Packet - {Site}.pdf`) | Packet PDF |
| **Proposal Packet Rebuilder.py** | Batch brand formatter — applies Forest Green + Slate + Calibri + bullets + keep-with-next to every DOCX in a folder | In-place edit |
| **weasyprint_batch.py** | DOCX→PDF fallback via WeasyPrint with branded CSS (used when LibreOffice produces artifacts) | `{stem}.pdf` |
| **Field Guide - CSV Schema.csv** | Canonical CSV schema for Field Guide Generator CSV input mode | Reference |

## Usage Pattern

Every generator script follows the same pattern:

1. Top-of-file `CONFIG` dict — edit per job
2. `generate_xxx(config=None)` function — call programmatically OR run `python script.py` to use CONFIG defaults
3. Output → `/home/user/AI_DRIVE_OUTPUT/` (auto-uploads to AI Drive)

Programmatic usage:

```python
from BTQ_Generator import generate_btq

generate_btq({
    "job_name": "Springhill Suites",
    "gc_name": "McCarthy",
    "total_drops": 170,
    # ...
})
```

CLI usage (where supported):

```bash
python "Template Filler.py" "path/to/template.docx" "path/to/job_data.json"
python "Field Guide Generator.py" --csv "path/to/drops.csv"
python "Proposal Packet Merger.py" --folder "Client/Proposal/v1" --gc "McCarthy" --site "Springhill"
python "Proposal Packet Rebuilder.py" --folder "Internal/Processing"
python "weasyprint_batch.py" --folder "Internal/Processing"
```

## Brand Constants (shared across scripts)

| Color | Hex | Use |
|---|---|---|
| Forest Green | `#2E7D32` | Headings, table header fills, accent lines |
| Slate | `#455A64` | Body text, sub-headers, inner table rules |
| Warm Gold | `#D4AF37` | Lifetime Warranty badge, 100% on-time callout (max 2× per doc) |
| Cream | `#FDFBF4` | Subtotal/total row fills, callout backgrounds |

| Font | Use |
|---|---|
| Calibri 10pt body | Default on all DOCX |
| Calibri 8.5pt body / 7.5pt tables | PDF outputs (bids) |
| Helvetica (reportlab) | Closest substitute in PDF-builder scripts |

## Governance Sources (read BEFORE editing any script)

| Need | File |
|---|---|
| Bid pricing rules (labor rates, buffer, bond, tax) | `1-Bids/Rules.md` |
| Bid workflow (Phase 1-6) | `1-Bids/Workflow.md` |
| Brand, typography, imagery, footers, page layout | `1-Bids/Format Guide.md` |
| Field Guide labeling, location vocab, service loops | `1-Bids/Field Guide Rules.md` |
| Pricing (internal + external) | `4-Company/Pricing/Master Catalog.xlsx` |

## Related Script Locations (not in this folder)

| Script | Location | Purpose |
|---|---|---|
| Quote DOCX → branded PDF | `2-Quotes/Templates/Scripts/Quote to PDF.py` | Quote rendering |
| Quote Generator (owner-direct) | `2-Quotes/Templates/Scripts/Generator.py` | Quote assembly |
| LV Symbol Extractor | `3-Intake/Templates/LV Symbol Extractor.py` | Plan takeoff |
| Master Catalog Builder | `4-Company/Pricing/Scripts/Master Catalog Builder.py` | Pricing source rebuilder |
| URL Extractor | `4-Company/Pricing/Scripts/URL Extractor.py` | Refresh pipeline (part 1) |
| Price Refresh | `4-Company/Pricing/Scripts/Price Refresh.py` | Refresh pipeline (part 2) |

## Output Path Rules

- All scripts write to `/home/user/AI_DRIVE_OUTPUT/` (sandbox).
- AI Drive auto-uploads anything in that folder after execution.
- Per-job deliverables should be moved to the appropriate job folder after upload:
  - Internal docs (BTQ, Finance Summary, Labor Plan, Drop Counts, Field Guide) → `{Job}/Internal/`
  - Client deliverables (merged Proposal Packet) → `{Job}/Client/Proposal/v#/`

## Editing Checklist

Before committing a script edit:

- [ ] CONFIG block at top (no constants buried in functions)
- [ ] Brand colors use the exact hex values above
- [ ] Calibri (or Helvetica fallback in reportlab)
- [ ] Bullet lists only — no numbered lists in content
- [ ] Internal docs have red "DO NOT SHARE" banner
- [ ] Client-facing scripts never show foreman/laborer split, never show markup multipliers
- [ ] Output filename follows governance convention (`{Thing} - {Job Name}.{ext}` or the Packet Merger's exact format)
- [ ] Script imports from standard library + documented installed packages only (pandas, openpyxl, reportlab, python-docx, pypdf, weasyprint)
