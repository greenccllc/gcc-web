"""
Field Guide Generator — GCC LV Div27-28 — INTERNAL

Generates the installer's floor-by-floor Field Guide PDF per Field Guide Rules
governance doc. This is the crew's physical build checklist on site.

Governance source: 1-Bids/Field Guide Rules.md (READ FIRST — authoritative).

Key rules (summary):
  · TIA-606-C CLASS 3 labeling (site ID, room ID, panel-port, field-port)
  · Location vocabulary: 19 canonical location codes (see CSV Schema)
  · Cable colors: blue (data), green (CCTV), red (ACS), yellow (voice where present),
    white (wireless), orange (multimode fiber), yellow (singlemode fiber)
  · Cat6A plenum baseline — no Cat6 fallback language
  · Drop format: Floor / Room / Location / Drop # / Label / Cable Type / Endpoint
  · Service loops: 10 ft at faceplate, 15 ft at rack
  · Faceplate material: stainless steel default, recessed box where drywall permits

Input modes:
  1. Inline CONFIG (default)
  2. CSV file (--csv path) — see Field Guide - CSV Schema.csv for headers
  3. BTQ mode (--btq path-to-btq.xlsx) — reads the Materials + Labor sheets

Output: AI_DRIVE_OUTPUT/Field Guide - {Job Name}.pdf

Author: GCC LV Div27-28
"""

from __future__ import annotations

import argparse
import csv
import os
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import LETTER, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)

OUTPUT_DIR = Path("/home/user/AI_DRIVE_OUTPUT")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================================================
# CONFIG — inline job defaults
# ==========================================================================

CONFIG = {
    "job_name": "REPLACE-ME",
    "gc_name": "REPLACE-ME",
    "site": "REPLACE-ME",
    "city_state": "REPLACE-ME",
    "site_id": "SPR",         # 3-letter site code used in labels
    "bid_date": "2026-04-20",

    # drops — list of dicts matching CSV schema
    "drops": [
        # {
        #   "floor": "01", "room": "101", "location": "LO",
        #   "drop_num": "001", "label": "SPR-01-101-LO-001",
        #   "cable_type": "Cat6A-Plenum-Blue", "endpoint": "Data"
        # },
    ],
}

# ==========================================================================
# Constants per Field Guide Rules
# ==========================================================================

# 19-location vocabulary (per Field Guide Rules §Location Vocabulary)
LOCATION_CODES = {
    "LO": "Low Wall — 18\" AFF",
    "HI": "High Wall — 5' AFF",
    "CL": "Ceiling",
    "FP": "Floor Poke-through",
    "DK": "Desk Well",
    "CS": "Column Stub",
    "RK": "Rack Mount (in TR)",
    "OH": "Overhead / Cable Tray",
    "WN": "Window Mullion",
    "DR": "Door Frame",
    "EL": "Elevator Shaft",
    "ME": "Mechanical Room",
    "EX": "Exterior Wall",
    "PO": "Pole / Pendant",
    "KX": "Kiosk",
    "CT": "Counter / Millwork",
    "WS": "Workstation",
    "HD": "Hospital Headwall",
    "PT": "Pathway (J-hook or conduit)",
}

# Cable colors per TIA-606-C + GCC standards
CABLE_COLORS = {
    "Cat6A-Plenum-Blue": "Data (standard)",
    "Cat6A-Plenum-Green": "CCTV / security",
    "Cat6A-Plenum-Red": "Access Control (ACS)",
    "Cat6A-Plenum-Yellow": "Voice (where present)",
    "Cat6A-Plenum-White": "Wireless (WAPs)",
    "OS2-SM-Orange-Jacket": "Singlemode fiber (jacket intentional — TIA-598 code)",
    "OM4-MM-Aqua": "Multimode 50/125 fiber",
}

# Service loops
SERVICE_LOOP_FACEPLATE = 10   # feet at faceplate
SERVICE_LOOP_RACK = 15        # feet at rack

FOREST_GREEN = HexColor("#2E7D32")
SLATE = HexColor("#455A64")
WARM_GOLD = HexColor("#D4AF37")
CREAM = HexColor("#FDFBF4")
WHITE = HexColor("#FFFFFF")
RED = HexColor("#CC0000")

BODY_FONT = "Helvetica"
BOLD_FONT = "Helvetica-Bold"
ITALIC_FONT = "Helvetica-Oblique"


# ==========================================================================
# Validation gates (per Field Guide Rules §QA Gates)
# ==========================================================================

def validate_drop(d):
    """Return list of validation errors for a single drop dict."""
    errors = []
    required = ["floor", "room", "location", "drop_num", "label", "cable_type", "endpoint"]
    for k in required:
        if not d.get(k):
            errors.append(f"missing {k}")
    if d.get("location") and d["location"] not in LOCATION_CODES:
        errors.append(f"unknown location code '{d['location']}' (must be one of {', '.join(LOCATION_CODES)})")
    if d.get("cable_type") and d["cable_type"] not in CABLE_COLORS:
        errors.append(f"non-standard cable type '{d['cable_type']}'")
    return errors


def _ascii_safe(s):
    """Field Guide Rules §Text Handling — ASCII-safe to avoid printer issues."""
    if s is None:
        return ""
    return (str(s)
            .replace("\u2013", "-").replace("\u2014", "-")   # en/em dash
            .replace("\u2018", "'").replace("\u2019", "'")
            .replace("\u201c", '"').replace("\u201d", '"')
            .replace("\u00b7", "·").encode("ascii", "replace").decode("ascii"))


# ==========================================================================
# CSV input
# ==========================================================================

def load_drops_from_csv(csv_path):
    """Read drops from CSV matching Field Guide - CSV Schema.csv header."""
    drops = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            drops.append({
                "floor": row.get("floor", "").strip(),
                "room": row.get("room", "").strip(),
                "location": row.get("location", "").strip(),
                "drop_num": row.get("drop_num", "").strip(),
                "label": row.get("label", "").strip(),
                "cable_type": row.get("cable_type", "").strip(),
                "endpoint": row.get("endpoint", "").strip(),
                "notes": row.get("notes", "").strip(),
            })
    return drops


# ==========================================================================
# PDF rendering
# ==========================================================================

def _group_by_floor(drops):
    """Return dict {floor_id: [drops...]} preserving input order."""
    groups = {}
    for d in drops:
        groups.setdefault(d["floor"], []).append(d)
    return groups


def build_pdf(cfg, drops):
    outpath = OUTPUT_DIR / f"Field Guide - {cfg['job_name']}.pdf"

    # Validate
    val_errors = []
    for i, d in enumerate(drops, 1):
        errs = validate_drop(d)
        if errs:
            val_errors.append((i, d.get("label", f"drop {i}"), errs))

    doc = SimpleDocTemplate(
        str(outpath),
        pagesize=landscape(LETTER),
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        title=f"Field Guide - {cfg['job_name']}",
        author="GCC LV Div27-28",
    )

    styles = getSampleStyleSheet()
    title_st = ParagraphStyle(
        "T", parent=styles["Title"],
        fontName=BOLD_FONT, fontSize=18, textColor=FOREST_GREEN,
        spaceAfter=4, alignment=0,
    )
    sub_st = ParagraphStyle(
        "S", parent=styles["Normal"],
        fontName=ITALIC_FONT, fontSize=10, textColor=SLATE,
        spaceAfter=10,
    )
    h2 = ParagraphStyle(
        "H2", parent=styles["Heading2"],
        fontName=BOLD_FONT, fontSize=13, textColor=FOREST_GREEN,
        spaceBefore=12, spaceAfter=6,
    )
    body = ParagraphStyle(
        "B", parent=styles["Normal"],
        fontName=BODY_FONT, fontSize=9, textColor=SLATE,
        spaceAfter=4, leading=12,
    )
    warn_st = ParagraphStyle(
        "W", parent=styles["Normal"],
        fontName=BOLD_FONT, fontSize=9, textColor=RED,
        spaceAfter=4,
    )

    story = []

    # Cover
    story.append(Paragraph(f"Field Guide — {_ascii_safe(cfg['job_name'])}", title_st))
    story.append(Paragraph(
        f"{_ascii_safe(cfg['gc_name'])} &nbsp;·&nbsp; {_ascii_safe(cfg['site'])} &nbsp;·&nbsp; "
        f"{_ascii_safe(cfg['city_state'])} &nbsp;·&nbsp; Site ID: <b>{cfg['site_id']}</b>",
        sub_st,
    ))

    # Validation summary
    if val_errors:
        story.append(Paragraph(f"[VALIDATION] {len(val_errors)} drop(s) have errors — review before issuing to crew:", warn_st))
        for idx, label, errs in val_errors[:20]:
            story.append(Paragraph(f"&nbsp;&nbsp;#{idx} {label}: {', '.join(errs)}", warn_st))
        if len(val_errors) > 20:
            story.append(Paragraph(f"&nbsp;&nbsp;... and {len(val_errors) - 20} more", warn_st))
        story.append(Spacer(1, 6))
    else:
        story.append(Paragraph(f"[VALIDATION PASS] {len(drops)} drops — all fields complete.", body))

    # Instructions block
    story.append(Paragraph("Install Notes", h2))
    story.append(Paragraph(
        f"· Cable baseline: Cat6A plenum on every drop. No Cat6 substitute — GCC standard.",
        body,
    ))
    story.append(Paragraph(
        f"· Service loops: <b>{SERVICE_LOOP_FACEPLATE}'</b> at faceplate, <b>{SERVICE_LOOP_RACK}'</b> at rack.",
        body,
    ))
    story.append(Paragraph(
        "· Label format: <b>SITE-FLR-ROOM-LOC-NNN</b> (TIA-606-C Class 3).",
        body,
    ))
    story.append(Paragraph(
        "· Color code: blue=data · green=CCTV · red=ACS · yellow=voice · white=WAP · orange=SM fiber · aqua=MM fiber.",
        body,
    ))
    story.append(Paragraph(
        "· Faceplate default: stainless steel, recessed where drywall permits.",
        body,
    ))
    story.append(Paragraph(
        "· Test every drop to Class EA (Cat6A). Fluke DSX-8000. LinkWare PDF to GCC closeout folder.",
        body,
    ))

    # Floor-by-floor tables
    groups = _group_by_floor(drops)
    for floor_id in sorted(groups):
        story.append(PageBreak())
        story.append(Paragraph(f"Floor {floor_id} — Drop List ({len(groups[floor_id])} drops)", h2))

        data = [["#", "Label", "Floor", "Room", "Loc", "Cable", "Endpoint", "Notes"]]
        for i, d in enumerate(groups[floor_id], 1):
            data.append([
                str(i),
                _ascii_safe(d["label"]),
                _ascii_safe(d["floor"]),
                _ascii_safe(d["room"]),
                _ascii_safe(d["location"]),
                _ascii_safe(d["cable_type"]),
                _ascii_safe(d["endpoint"]),
                _ascii_safe(d.get("notes", "")),
            ])

        tbl = Table(data, colWidths=[0.3*inch, 1.6*inch, 0.55*inch, 0.7*inch, 0.5*inch, 1.7*inch, 1.5*inch, 2.3*inch], repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), FOREST_GREEN),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), BOLD_FONT),
            ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (4, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.25, SLATE),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(tbl)

    # Location code reference
    story.append(PageBreak())
    story.append(Paragraph("Location Code Reference (19 codes)", h2))
    ref_data = [["Code", "Meaning"]]
    for code, meaning in LOCATION_CODES.items():
        ref_data.append([code, meaning])
    ref_tbl = Table(ref_data, colWidths=[1.0 * inch, 6.0 * inch], repeatRows=1)
    ref_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), BOLD_FONT),
        ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
        ("GRID", (0, 0), (-1, -1), 0.25, SLATE),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ref_tbl)

    # Footer note
    story.append(Spacer(1, 14))
    footer_st = ParagraphStyle("F", parent=styles["Normal"], fontName=ITALIC_FONT, fontSize=8, textColor=SLATE, alignment=1)
    story.append(Paragraph(
        f"GCC LLC  ·  Field Guide  ·  Internal crew tool  ·  {datetime.today():%Y-%m-%d}",
        footer_st,
    ))

    doc.build(story)
    return outpath


# ==========================================================================
# Main
# ==========================================================================

def generate_field_guide(config=None, csv_path=None):
    cfg = config or CONFIG
    if csv_path:
        drops = load_drops_from_csv(csv_path)
    else:
        drops = cfg["drops"]

    out = build_pdf(cfg, drops)
    print(f"[OK] Field Guide generated: {out.name}")
    print(f"     {len(drops)} drops across {len({d['floor'] for d in drops})} floor(s)")
    return out


def main():
    p = argparse.ArgumentParser(description="Generate GCC installer Field Guide PDF")
    p.add_argument("--csv", help="Path to CSV drops file (overrides inline CONFIG)")
    args = p.parse_args()
    generate_field_guide(csv_path=args.csv)


if __name__ == "__main__":
    main()
