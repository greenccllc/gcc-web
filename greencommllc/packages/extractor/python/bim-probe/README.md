# BIM Probe

Forensic extraction tooling that reads PDF metadata, OCG (Optional Content Group) layer names, and XMP data — **without scanning page content**. Fast by design: pikepdf reads only the PDF catalog + trailer.

## Why

Construction-set PDFs almost always originate from **Revit, AutoCAD, Civil 3D, MicroStation, Archicad, Vectorworks, or SketchUp**. Between the visible drawing and the raw plot, three extra data layers survive (or get destroyed) at export:

1. **Document metadata** — Creator/Producer/Author/CreationDate — reveals the source CAD/BIM system
2. **XMP metadata** — extended XML with project-specific tags (Revit sheet indices, Civil 3D versions)
3. **OCG layers** — the CAD/Revit layer structure (`A-WALL`, `E-LITE-EQPM`, `T-DATA-DROP`, `T-WAP`, `SEC-CAM`) preserved as toggleable PDF layers

A Bluebeam-Stapler flatten destroys OCG data. A native Revit export preserves it. The probe tells us which.

## Files

| File | Role |
|------|------|
| `bim_probe_fast.py` | pikepdf-based forensic probe. Iterates a hard-coded `TARGETS` list of PDFs, extracts metadata + XMP + OCGs, writes a Markdown report to `/home/user/AI_DRIVE_OUTPUT/{job}_BIM_Metadata_Probe.md`. |

Current `TARGETS` are hard-coded for Springhill Suites (CD Set 329pp, Civil Site 35pp, Photometrics 1pp). The script is meant to be copy-edited per job — swap the `JOB_ROOT` path and rebuild the `TARGETS` list, then run.

## What it detects

From `Extraction Rules.md` §16.3 source-system cheat sheet:

| Producer/Creator token | Source system | Implication |
|---|---|---|
| `Revit` | Autodesk Revit (BIM) | .rvt source exists (do NOT request per NO REQUESTS policy — diagnostic only) |
| `AutoCAD` | Autodesk AutoCAD | .dwg source |
| `Civil 3D` | Autodesk Civil 3D | Civil-specific layers expected (V-EX-*) |
| `Bluebeam Stapler` | Bluebeam page-merge | **Layers FLATTENED** — upstream discipline PDFs likely still layered |
| `Bluebeam Revu` | Bluebeam markup | May be re-saved after review |
| `MicroStation` | Bentley | .dgn source |
| `Archicad` | Graphisoft | .pln |
| `Vectorworks` | Vectorworks | .vwx |
| `pdfplot*` / `HP Plot` | CAD plotter driver | Native plot — layers most likely preserved |

## OCG layer prefix interpretation

Per `LV Identifiers.md` §13.7, discovered layers feed back into the LV Identifiers living CAD Layer Vocabulary registry. Critical prefixes: `T-` Telecom (GCC scope primary), `E-LOW-*`/`E-COMM-*` (LV on E-sheets), `SEC-*`/`CCTV-*` (security), `V-EX-TELE` (existing telecom utility at property line), `C-PVMT-STRP-EV` (EV charger stall striping → GCC data drops).

## Hard rule — diagnostic only

Per memory `### NO REQUESTS policy` and Extraction Rules §16.7: the probe is a **read-only diagnostic**. Findings never become outbound requests to the GC. Never request source CAD/BIM, un-stapled PDFs, or BIM 360 access. If layers are flattened, fall back to full text-OCR (Extraction Rules §1 source hierarchy) and bid the package as delivered.

## Execution integration

Standard forensic passes on every new Intake PDF (per AI System Prompt item 15, in parallel):
- OCR force pass (Extraction Rules §15)
- BIM/metadata probe (this tool, §16)
- Vector-layer + annotation scan (§15.4)
- LV TOC catalog update (feeds §16 LV High Reference PDF build)

Output lands in `{Job}/Internal/Processing/BIM Metadata Probe.md` (per §16.5 record-where-findings-land rule).
