"""
Labor Plan Generator — GCC LV Div27-28 — INTERNAL ONLY

Generates the per-phase labor planning PDF for a bid. Models crew composition,
hours per phase, internal cost, billed labor, and buffer rules. Feeds BTQ
Labor sheet and Finance Summary Scenarios.

Governance source: 1-Bids/Rules.md, memory ## Estimation & Labor Rules.
  · Minimum on-site crew: 2 people (never solo)
  · Default: 1 foreman + 1 laborer = $52.50/hr blended cost
  · Foreman ratio cap: 1:3 max (1 foreman per 3 laborers)
  · Billed rate: $100/hr flat
  · Conservative labor rule: use HIGH end of BICSI range always
  · Buffer: 5% ≤50 drops · 10% 50-500 · 15% >500 or complex

Output: AI_DRIVE_OUTPUT/Labor Plan - {Job Name}.pdf

Author: GCC LV Div27-28
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
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
# CONFIG
# ==========================================================================

CONFIG = {
    "job_name": "REPLACE-ME",
    "gc_name": "REPLACE-ME",
    "site": "REPLACE-ME",
    "bid_date": "2026-04-20",
    "total_drops": 0,
    "complex_access": False,
    "prevailing_wage": False,

    # 5 phases — defaults can be overridden
    "phases": [
        # (phase_name, crew_size, foremen, weeks, hrs_per_week)
        ("Phase 1 — Mobilization", 2, 1, 0.5, 40),
        ("Phase 2 — Pathway + Rough-in", 4, 1, 3, 40),
        ("Phase 3 — Pull cable", 4, 1, 4, 40),
        ("Phase 4 — Terminate + test", 3, 1, 2, 40),
        ("Phase 5 — Closeout + punch", 2, 1, 1, 40),
    ],

    # Mob/demob
    "mob_hours": 8,
    "coordination_hours_per_week": 4,
    "demob_hours": 8,
    "truck_transfers": 2,  # 4 hrs each
}

# Constants
BILLED_RATE = 100.00
COST_FOREMAN = 65.00
COST_LABORER = 40.00
COST_PW = 63.26

FOREST_GREEN = HexColor("#2E7D32")
SLATE = HexColor("#455A64")
WARM_GOLD = HexColor("#D4AF37")
CREAM = HexColor("#FDFBF4")
WHITE = HexColor("#FFFFFF")
RED = HexColor("#CC0000")

BODY_FONT = "Helvetica"  # reportlab default closest to Calibri visual
BOLD_FONT = "Helvetica-Bold"
ITALIC_FONT = "Helvetica-Oblique"


# ==========================================================================
# Helpers
# ==========================================================================

def buffer_pct(drops, complex_access):
    if complex_access or drops > 500:
        return 0.15
    if drops >= 50:
        return 0.10
    return 0.05


def blended_cost_rate(crew_size, foremen):
    """Per governance: 1F+1L=$52.50, 1F+2L=$48.33, 1F+3L=$46.25 (cap)."""
    if foremen < 1:
        foremen = 1  # Always at least one foreman on site
    laborers = max(0, crew_size - foremen)
    total = foremen * COST_FOREMAN + laborers * COST_LABORER
    return total / crew_size


def check_crew_rules(cfg):
    """Return list of compliance warnings."""
    warnings = []
    for name, size, foremen, weeks, hrs in cfg["phases"]:
        if size < 2:
            warnings.append(f"{name}: crew size {size} violates 2-person minimum")
        laborers = size - foremen
        if laborers > 0 and (laborers / foremen) > 3:
            warnings.append(f"{name}: foreman ratio 1:{laborers} exceeds 1:3 cap")
    return warnings


# ==========================================================================
# PDF building
# ==========================================================================

def build_pdf(cfg):
    outpath = OUTPUT_DIR / f"Labor Plan - {cfg['job_name']}.pdf"
    doc = SimpleDocTemplate(
        str(outpath),
        pagesize=LETTER,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        title=f"Labor Plan - {cfg['job_name']}",
        author="GCC LV Div27-28",
    )

    story = []

    # Internal banner
    styles = getSampleStyleSheet()
    banner = ParagraphStyle(
        "Banner", parent=styles["Normal"],
        fontName=BOLD_FONT, fontSize=11, alignment=1,
        textColor=WHITE, backColor=RED,
        spaceAfter=12, leading=16, borderPadding=6,
    )
    story.append(Paragraph(
        "[INTERNAL ONLY] &nbsp; GCC Proprietary &amp; Confidential &nbsp;·&nbsp; Never share with GC, Owner, or sub",
        banner,
    ))

    # Title block
    title_st = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontName=BOLD_FONT, fontSize=16, textColor=FOREST_GREEN,
        spaceAfter=4, leading=20,
    )
    sub_st = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        fontName=ITALIC_FONT, fontSize=10, textColor=SLATE,
        spaceAfter=12,
    )
    story.append(Paragraph(f"Labor Plan — {cfg['job_name']}", title_st))
    story.append(Paragraph(
        f"{cfg['gc_name']} &nbsp;·&nbsp; {cfg['site']} &nbsp;·&nbsp; Bid {cfg['bid_date']}",
        sub_st,
    ))

    # Compliance banner
    warnings = check_crew_rules(cfg)
    if warnings:
        warn_st = ParagraphStyle(
            "Warn", parent=styles["Normal"],
            fontName=BOLD_FONT, fontSize=9, textColor=RED,
            spaceAfter=8,
        )
        story.append(Paragraph("[COMPLIANCE WARNINGS]", warn_st))
        for w in warnings:
            story.append(Paragraph(f"&nbsp;&nbsp;·&nbsp; {w}", warn_st))

    body_st = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontName=BODY_FONT, fontSize=10, textColor=SLATE,
        spaceAfter=6, leading=14,
    )
    h2_st = ParagraphStyle(
        "H2", parent=styles["Heading2"],
        fontName=BOLD_FONT, fontSize=12, textColor=FOREST_GREEN,
        spaceAfter=4, spaceBefore=10,
    )

    # Rules panel
    story.append(Paragraph("1. Rules Applied", h2_st))
    story.append(Paragraph(
        f"· Buffer = <b>{int(buffer_pct(cfg['total_drops'], cfg['complex_access'])*100)}%</b> per drop count {cfg['total_drops']}"
        + (" + complex access" if cfg["complex_access"] else ""),
        body_st))
    story.append(Paragraph(
        f"· Labor cost rate = <b>${COST_PW if cfg['prevailing_wage'] else 'blended per crew'}/hr</b>"
        + (" (MO Wage Order 32 — prevailing wage)" if cfg["prevailing_wage"] else " (Conservative labor rule, high end of BICSI range)"),
        body_st))
    story.append(Paragraph(
        "· Billed rate = <b>$100/hr flat</b> (client-facing — foreman/laborer split never disclosed)",
        body_st))
    story.append(Paragraph(
        "· Minimum on-site: <b>2 people always</b>; foreman ratio capped at 1:3",
        body_st))

    # Phase table
    story.append(Spacer(1, 10))
    story.append(Paragraph("2. Phase Build-up", h2_st))

    phase_data = [["#", "Phase", "Crew", "Fmn", "Wks", "Hrs/wk", "Total Hrs", "Cost $/hr", "Labor Cost $", "Labor Billed $"]]
    total_hrs_catalog = 0
    total_cost = 0.0
    total_billed = 0.0

    for i, (name, crew, foremen, weeks, hrs_per_wk) in enumerate(cfg["phases"], 1):
        phase_hrs = crew * weeks * hrs_per_wk
        if cfg["prevailing_wage"]:
            cost_rate = COST_PW
        else:
            cost_rate = blended_cost_rate(crew, foremen)
        phase_cost = phase_hrs * cost_rate
        phase_billed = phase_hrs * BILLED_RATE
        phase_data.append([
            str(i), name, str(crew), str(foremen),
            f"{weeks:.1f}", str(hrs_per_wk),
            f"{phase_hrs:.0f}",
            f"${cost_rate:.2f}",
            f"${phase_cost:,.0f}",
            f"${phase_billed:,.0f}",
        ])
        total_hrs_catalog += phase_hrs
        total_cost += phase_cost
        total_billed += phase_billed

    # Buffer row
    buf = buffer_pct(cfg["total_drops"], cfg["complex_access"])
    buf_hrs = total_hrs_catalog * buf
    buf_cost_rate = COST_PW if cfg["prevailing_wage"] else 52.50
    buf_cost = buf_hrs * buf_cost_rate
    buf_billed = buf_hrs * BILLED_RATE
    phase_data.append(["", f"Buffer ({int(buf*100)}%)", "", "", "", "", f"{buf_hrs:.0f}", "—", f"${buf_cost:,.0f}", f"${buf_billed:,.0f}"])

    # Mob/demob row
    mob_hrs = cfg["mob_hours"] + cfg["demob_hours"] + cfg["truck_transfers"] * 4
    # Add coordination hours across project weeks
    total_weeks = sum(w for _, _, _, w, _ in cfg["phases"])
    coord_hrs = int(total_weeks) * cfg["coordination_hours_per_week"]
    mobd_hrs = mob_hrs + coord_hrs
    mob_cost = mobd_hrs * buf_cost_rate
    mob_billed = mobd_hrs * BILLED_RATE
    phase_data.append(["", "Mobilization + demobilization + coordination", "", "", "", "", f"{mobd_hrs:.0f}", "—", f"${mob_cost:,.0f}", f"${mob_billed:,.0f}"])

    # Total row
    grand_hrs = total_hrs_catalog + buf_hrs + mobd_hrs
    grand_cost = total_cost + buf_cost + mob_cost
    grand_billed = total_billed + buf_billed + mob_billed
    phase_data.append(["", "TOTAL", "", "", "", "", f"{grand_hrs:.0f}", "—", f"${grand_cost:,.0f}", f"${grand_billed:,.0f}"])

    tbl = Table(phase_data, colWidths=[0.3*inch, 2.1*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.55*inch, 0.65*inch, 0.65*inch, 0.85*inch, 0.9*inch], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), BOLD_FONT),
        ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.25, SLATE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        # Buffer + mob + total rows styling
        ("BACKGROUND", (0, -3), (-1, -3), CREAM),
        ("BACKGROUND", (0, -2), (-1, -2), CREAM),
        ("BACKGROUND", (0, -1), (-1, -1), CREAM),
        ("FONTNAME", (0, -1), (-1, -1), BOLD_FONT),
        ("TEXTCOLOR", (0, -1), (-1, -1), FOREST_GREEN),
    ]))
    story.append(tbl)

    # Margin summary
    story.append(Spacer(1, 14))
    story.append(Paragraph("3. Labor Margin Summary (internal)", h2_st))
    margin_dollars = grand_billed - grand_cost
    margin_pct = margin_dollars / grand_billed if grand_billed else 0
    story.append(Paragraph(
        f"Labor billed (grand total): <b>${grand_billed:,.0f}</b>",
        body_st,
    ))
    story.append(Paragraph(
        f"Labor cost (grand total): <b>${grand_cost:,.0f}</b>",
        body_st,
    ))
    story.append(Paragraph(
        f"Labor margin: <b>${margin_dollars:,.0f}</b> &nbsp;·&nbsp; <b>{margin_pct:.1%}</b>",
        body_st,
    ))
    target_note = "within target band (40%+ expected on 2-crew @ blended)" if margin_pct >= 0.40 else "below 40% floor — verify crew composition and buffer"
    story.append(Paragraph(f"<i>{target_note}</i>", body_st))

    # Footer note
    story.append(Spacer(1, 16))
    footer_st = ParagraphStyle(
        "Footer", parent=styles["Normal"],
        fontName=ITALIC_FONT, fontSize=8, textColor=SLATE,
        alignment=1,
    )
    story.append(Paragraph(
        f"GCC LLC  ·  Labor Plan  ·  Internal only  ·  {datetime.today():%Y-%m-%d}",
        footer_st,
    ))

    doc.build(story)
    return outpath


# ==========================================================================
# Main
# ==========================================================================

def generate_labor_plan(config=None):
    cfg = config or CONFIG
    out = build_pdf(cfg)
    print(f"[OK] Labor Plan generated: {out.name}")
    return out


if __name__ == "__main__":
    generate_labor_plan()
