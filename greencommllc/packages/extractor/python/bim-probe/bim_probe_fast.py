#!/usr/bin/env python3
"""
FAST BIM probe — metadata + OCG layers + XMP only (no text scan).
Fast because pikepdf only reads the PDF trailer/catalog, not page content.
"""
import os, shutil, datetime
import pikepdf

OUT_ROOT = "/home/user/AI_DRIVE_OUTPUT"
if os.path.exists(OUT_ROOT): shutil.rmtree(OUT_ROOT)
os.makedirs(OUT_ROOT, exist_ok=True)

JOB_ROOT = "5-Jobs/2. In Progress - 5/2026-05-12 - Springhill Suites and Towneplace Suites - O'Fallon, MO - 75%/Intake"
TARGETS = [
    ("CD Set (329pp) — primary plans", f"{JOB_ROOT}/Plans - CD Set Compiled 02-20-2026.pdf"),
    ("Civil Site (35pp)",               f"{JOB_ROOT}/Plans - Civil Site Improvement V3.pdf"),
    ("Photometrics (1pp)",              f"{JOB_ROOT}/Plans - Site Photometrics PH1.pdf"),
]


def format_pdf_date(d):
    if not d: return "—"
    s = str(d).strip()
    if s.startswith("D:"): s = s[2:]
    try:
        return f"{s[0:4]}-{s[4:6]}-{s[6:8]} {s[8:10]}:{s[10:12]}:{s[12:14]}"
    except Exception:
        return s


def detect_source(creator, producer):
    tokens = f"{(creator or '').lower()} {(producer or '').lower()}"
    for key, label in [
        ("revit", "🏗️  Autodesk Revit (BIM)"),
        ("autocad", "📐 Autodesk AutoCAD"),
        ("bluebeam", "🔧 Bluebeam Revu"),
        ("adobe", "📄 Adobe Acrobat / Illustrator"),
        ("microstation", "🏛️  Bentley MicroStation"),
        ("archicad", "🏠 Graphisoft Archicad"),
        ("vectorworks", "✏️  Vectorworks"),
        ("sketchup", "📦 SketchUp"),
        ("pdf-xchange", "📝 PDF-XChange"),
        ("pdfsharp", "⚙️  PDFsharp"),
        ("itext", "⚙️  iText"),
        ("prince", "🤴 Prince XML"),
        ("foxit", "🦊 Foxit"),
    ]:
        if key in tokens: return label
    return "❓ Unknown"


def get_ocg_layers(pdf):
    try:
        root = pdf.Root
        if "/OCProperties" not in root: return []
        ocprops = root["/OCProperties"]
        if "/OCGs" not in ocprops: return []
        names = []
        for ocg in ocprops["/OCGs"]:
            try:
                n = str(ocg.get("/Name", "")).strip('"').strip("'")
                if n: names.append(n)
            except Exception: continue
        return sorted(set(names))
    except Exception:
        return []


def get_xmp(pdf, max_lines=50):
    try:
        with pdf.open_metadata() as meta:
            return str(meta).split("\n")[:max_lines]
    except Exception:
        return []


out_path = f"{OUT_ROOT}/Springhill_BIM_Metadata_Probe.md"
lines = [
    "# Springhill Suites — BIM / PDF Metadata Probe",
    "",
    f"Generated: {datetime.datetime.utcnow().isoformat()}Z",
    "",
    "**Purpose:** Detect BIM/CAD origin of Intake PDFs; extract OCG layers + XMP metadata not recoverable from text OCR.",
    "",
    "**Method:** pikepdf — reads PDF catalog + metadata only (no page content). Fast by design.",
    "",
    "---",
    "",
]

for label, path in TARGETS:
    lines.append(f"## {label}")
    lines.append(f"`{path}`")
    lines.append("")
    print(f"Processing: {label}")

    try:
        pdf = pikepdf.open(path)
    except Exception as e:
        lines.append(f"❌ Failed to open: {e}")
        lines.append("")
        continue

    docinfo = pdf.docinfo or {}
    def gv(k):
        v = docinfo.get(f"/{k}")
        return str(v) if v is not None else ""
    creator = gv("Creator")
    producer = gv("Producer")

    lines.append("### 📋 Document Metadata")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| Title | {gv('Title') or '—'} |")
    lines.append(f"| Author | {gv('Author') or '—'} |")
    lines.append(f"| Subject | {gv('Subject') or '—'} |")
    lines.append(f"| Keywords | {gv('Keywords') or '—'} |")
    lines.append(f"| **Creator** | **{creator or '—'}** |")
    lines.append(f"| **Producer** | **{producer or '—'}** |")
    lines.append(f"| CreationDate | {format_pdf_date(gv('CreationDate'))} |")
    lines.append(f"| ModDate | {format_pdf_date(gv('ModDate'))} |")
    lines.append(f"| **🔍 Source Guess** | **{detect_source(creator, producer)}** |")
    lines.append(f"| Pages | {len(pdf.pages)} |")
    lines.append(f"| Encrypted | {pdf.is_encrypted} |")
    lines.append("")

    # XMP
    xmp = get_xmp(pdf)
    if xmp:
        lines.append("### 📜 XMP Metadata (first 50 lines)")
        lines.append("")
        lines.append("```xml")
        lines.extend(xmp)
        lines.append("```")
        lines.append("")

    # OCG layers
    ocgs = get_ocg_layers(pdf)
    lines.append(f"### 🗂️  OCG Layers ({len(ocgs)})")
    lines.append("")
    if ocgs:
        lines.append("**Layers preserved — confirms BIM/CAD origin.** Discipline prefixes reveal how drafter organized work:")
        lines.append("`A-` Architectural · `E-` Electrical · `T-` Telecom · `S-` Security · `M-` Mechanical · `P-` Plumbing · `FP-` Fire Protection.")
        lines.append("")
        for name in ocgs:
            lines.append(f"- `{name}`")
    else:
        lines.append("No OCG layers — PDF was **flattened on export** (layer data discarded).")
    lines.append("")

    pdf.close()
    lines.append("---")
    lines.append("")
    print(f"  Done: {label}")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\n✅ BIM metadata probe complete: {out_path}")
print(f"   {len(lines)} lines written, {os.path.getsize(out_path):,} bytes")
