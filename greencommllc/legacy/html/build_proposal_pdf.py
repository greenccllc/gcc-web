#!/usr/bin/env python3
"""
GCC LLC Proposal PDF Builder
============================
Converts a filled proposal markdown file (or JSON briefing) into a branded PDF.

Usage
-----
  python build_proposal_pdf.py --input path/to/proposal.md [--output out.pdf]
  python build_proposal_pdf.py --input briefing.json --audience gc

The audience flag is optional when the input is markdown — it is inferred from
the first H1. For JSON input, `audience` is required (either in the JSON or via
--audience).

Design
------
* Pure-markdown → PDF: no external runtime services.
* Brand palette embedded (see `BRAND`).
* Uses Carlito (metric-compatible open-source Calibri replacement) because
  Calibri itself is proprietary. Matches the look of every other GCC deliverable.
* Strips the internal QA-Report appendix before rendering (the master-system
  prompt instructs Claude to include one at the bottom; it is internal only).
* Flags any unsubstituted `{{variable}}` placeholders on a warning page at the
  end so they cannot ship silently.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, List, Optional

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


# ---------------------------------------------------------------------------
# Brand tokens
# ---------------------------------------------------------------------------

BRAND = {
    "forest_green": HexColor("#2E7D32"),
    "slate":        HexColor("#455A64"),
    "warm_gold":    HexColor("#D4AF37"),
    "cream":        HexColor("#FDFBF4"),
    "ink":          HexColor("#1A1A1A"),
    "green_tint":   HexColor("#F1F8F1"),
}

PAGE_MARGIN = 0.75 * inch


# ---------------------------------------------------------------------------
# Font registration (Carlito = Calibri-metric-compatible)
# ---------------------------------------------------------------------------

def _register_fonts() -> str:
    """Register Carlito if available, otherwise fall back to Helvetica."""
    carlito_root = Path("/usr/share/fonts/truetype/crosextra")
    faces = {
        "Carlito":           carlito_root / "Carlito-Regular.ttf",
        "Carlito-Bold":      carlito_root / "Carlito-Bold.ttf",
        "Carlito-Italic":    carlito_root / "Carlito-Italic.ttf",
        "Carlito-BoldItalic": carlito_root / "Carlito-BoldItalic.ttf",
    }
    if all(p.exists() for p in faces.values()):
        for name, path in faces.items():
            pdfmetrics.registerFont(TTFont(name, str(path)))
        registerFontFamily(
            "Carlito",
            normal="Carlito",
            bold="Carlito-Bold",
            italic="Carlito-Italic",
            boldItalic="Carlito-BoldItalic",
        )
        return "Carlito"
    return "Helvetica"  # metric-similar fallback


FONT = _register_fonts()
FONT_BOLD = f"{FONT}-Bold" if FONT == "Carlito" else "Helvetica-Bold"
FONT_ITALIC = f"{FONT}-Italic" if FONT == "Carlito" else "Helvetica-Oblique"


# ---------------------------------------------------------------------------
# Paragraph styles
# ---------------------------------------------------------------------------

def build_styles() -> dict[str, ParagraphStyle]:
    return {
        "h1": ParagraphStyle(
            "h1", fontName=FONT_BOLD, fontSize=22,
            textColor=BRAND["forest_green"], leading=26,
            spaceBefore=4, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2", fontName=FONT_BOLD, fontSize=16,
            textColor=BRAND["forest_green"], leading=20,
            spaceBefore=14, spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3", fontName=FONT_BOLD, fontSize=13,
            textColor=BRAND["slate"], leading=17,
            spaceBefore=10, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body", fontName=FONT, fontSize=11, textColor=BRAND["ink"],
            leading=15, alignment=TA_LEFT, spaceAfter=6,
        ),
        "body_small": ParagraphStyle(
            "body_small", fontName=FONT, fontSize=10, textColor=BRAND["ink"],
            leading=13, alignment=TA_LEFT,
        ),
        "bullet": ParagraphStyle(
            "bullet", fontName=FONT, fontSize=11, textColor=BRAND["ink"],
            leading=15, leftIndent=14, bulletIndent=2, spaceAfter=2,
        ),
        "number": ParagraphStyle(
            "number", fontName=FONT, fontSize=11, textColor=BRAND["ink"],
            leading=15, leftIndent=18, bulletIndent=2, spaceAfter=2,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", fontName=FONT_BOLD, fontSize=30,
            textColor=BRAND["forest_green"], alignment=TA_LEFT, leading=36,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName=FONT, fontSize=13, textColor=BRAND["slate"],
            alignment=TA_LEFT, leading=18,
        ),
        "cover_eyebrow": ParagraphStyle(
            "cover_eyebrow", fontName=FONT_BOLD, fontSize=11,
            textColor=BRAND["warm_gold"], alignment=TA_LEFT, leading=14,
        ),
        "bid_hero": ParagraphStyle(
            "bid_hero", fontName=FONT_BOLD, fontSize=44,
            textColor=BRAND["forest_green"], alignment=TA_LEFT, leading=52,
            spaceBefore=4, spaceAfter=6,
        ),
        "footer": ParagraphStyle(
            "footer", fontName=FONT, fontSize=9, textColor=BRAND["slate"],
            alignment=TA_CENTER, leading=11,
        ),
        "warning": ParagraphStyle(
            "warning", fontName=FONT, fontSize=10,
            textColor=HexColor("#B71C1C"), leading=13,
        ),
        "italic": ParagraphStyle(
            "italic", fontName=FONT_ITALIC, fontSize=11,
            textColor=BRAND["ink"], leading=15,
        ),
    }


# ---------------------------------------------------------------------------
# Markdown block model
# ---------------------------------------------------------------------------

@dataclass
class Block:
    kind: str                          # h1 | h2 | h3 | p | bullet | number | table | hr | pagebreak | hero
    text: str = ""
    items: List[str] = field(default_factory=list)       # for bullet / number lists
    rows: List[List[str]] = field(default_factory=list)  # for tables (first row = header)


# ---------------------------------------------------------------------------
# Markdown parser — tailored for the proposal templates.
# ---------------------------------------------------------------------------

_QA_APPENDIX = re.compile(r"^##\s+QA Report\b", re.IGNORECASE | re.MULTILINE)
_VAR_PATTERN = re.compile(r"\{\{\s*([a-z0-9_]+)\s*\}\}", re.IGNORECASE)


def strip_qa_appendix(md: str) -> str:
    m = _QA_APPENDIX.search(md)
    return md[: m.start()].rstrip() if m else md


def find_unsubstituted_vars(md: str) -> List[str]:
    return sorted(set(_VAR_PATTERN.findall(md)))


def parse_markdown(md: str) -> List[Block]:
    """Parse the subset of markdown used by proposal templates."""
    lines = md.splitlines()
    blocks: List[Block] = []
    i = 0
    n = len(lines)

    def flush_paragraph(buf: List[str]):
        if not buf:
            return
        text = " ".join(ln.strip() for ln in buf).strip()
        if text:
            blocks.append(Block("p", text=text))
        buf.clear()

    para: List[str] = []

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # Horizontal rule / page break marker
        if re.match(r"^-{3,}\s*$", stripped) or re.match(r"^\*{3,}\s*$", stripped):
            flush_paragraph(para)
            blocks.append(Block("hr"))
            i += 1
            continue

        # Headings
        if stripped.startswith("# "):
            flush_paragraph(para)
            blocks.append(Block("h1", text=stripped[2:].strip()))
            i += 1
            continue
        if stripped.startswith("## "):
            flush_paragraph(para)
            blocks.append(Block("h2", text=stripped[3:].strip()))
            i += 1
            continue
        if stripped.startswith("### "):
            flush_paragraph(para)
            blocks.append(Block("h3", text=stripped[4:].strip()))
            i += 1
            continue

        # Bullet lists (- or *)
        if re.match(r"^[\-\*]\s+", stripped):
            flush_paragraph(para)
            items = []
            while i < n and re.match(r"^[\-\*]\s+", lines[i].strip()):
                items.append(re.sub(r"^[\-\*]\s+", "", lines[i].strip()))
                i += 1
            blocks.append(Block("bullet", items=items))
            continue

        # Numbered lists
        if re.match(r"^\d+\.\s+", stripped):
            flush_paragraph(para)
            items = []
            while i < n and re.match(r"^\d+\.\s+", lines[i].strip()):
                items.append(re.sub(r"^\d+\.\s+", "", lines[i].strip()))
                i += 1
            blocks.append(Block("number", items=items))
            continue

        # Pipe tables
        if "|" in stripped and stripped.startswith("|"):
            flush_paragraph(para)
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                raw = lines[i].strip()
                # Separator row -> skip
                if re.match(r"^\|[\s\-\:\|]+\|?\s*$", raw):
                    i += 1
                    continue
                cells = [c.strip() for c in raw.strip("|").split("|")]
                rows.append(cells)
                i += 1
            if rows:
                blocks.append(Block("table", rows=rows))
            continue

        # Blank line -> paragraph break
        if stripped == "":
            flush_paragraph(para)
            i += 1
            continue

        # Otherwise: accumulate paragraph
        para.append(stripped)
        i += 1

    flush_paragraph(para)
    return blocks


# ---------------------------------------------------------------------------
# Inline markdown -> ReportLab mini-HTML
# ---------------------------------------------------------------------------

def inline_md_to_rl(text: str) -> str:
    """Transform inline markdown into ReportLab-accepted mini-HTML.

    Handles: **bold**, *italic*, `code`, and escapes <, >, &.
    Highlights any remaining {{variable}} with a red color span.
    """
    # Escape HTML entities first.
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace("&lt;br&gt;", "<br/>")
    # Put real line breaks back (in case someone wrote <br> in the md).
    text = text.replace("&lt;/", "</").replace("&lt;", "<")  # cautious restore

    # Bold
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # Italic (single * not part of **)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    # Inline code -> bold-ish treatment (no monospace required)
    text = re.sub(r"`([^`]+)`", r"<font name='%s'>\1</font>" % FONT_BOLD, text)

    # Flag any remaining {{var}} tokens inline
    text = _VAR_PATTERN.sub(
        lambda m: f"<font color='#B71C1C'><b>[TBD:{m.group(1)}]</b></font>",
        text,
    )
    return text


# ---------------------------------------------------------------------------
# Flowable builder — turn Block list into ReportLab story.
# ---------------------------------------------------------------------------

def build_story(
    blocks: List[Block],
    audience: str,
    styles: dict[str, ParagraphStyle],
    meta: dict,
) -> list:
    """Convert parsed blocks into ReportLab flowables, including cover handling."""
    story: list = []

    # ---- Cover page -----------------------------------------------------
    story.extend(_cover_page(audience, meta, styles))
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    # ---- Body ----------------------------------------------------------
    skip_cover = True
    cover_h1_seen = False

    for i, b in enumerate(blocks):
        # The first H1 in the doc is usually the project title / cover marker —
        # we've already rendered the cover from meta, so skip until the first
        # meaningful H2.
        if skip_cover:
            if b.kind == "h2":
                skip_cover = False
            else:
                continue

        if b.kind == "h1":
            story.append(Paragraph(inline_md_to_rl(b.text), styles["h1"]))
        elif b.kind == "h2":
            # Every section break gets a gold rule beneath the heading.
            story.append(_heading_with_rule(b.text, styles["h2"]))
        elif b.kind == "h3":
            story.append(Paragraph(inline_md_to_rl(b.text), styles["h3"]))
        elif b.kind == "p":
            story.append(Paragraph(inline_md_to_rl(b.text), styles["body"]))
        elif b.kind == "bullet":
            for it in b.items:
                story.append(
                    Paragraph(
                        f'<font color="#D4AF37">\u2022</font>&nbsp;&nbsp;{inline_md_to_rl(it)}',
                        styles["bullet"],
                    )
                )
            story.append(Spacer(1, 4))
        elif b.kind == "number":
            for idx, it in enumerate(b.items, 1):
                story.append(
                    Paragraph(
                        f'<b>{idx}.</b>&nbsp;&nbsp;{inline_md_to_rl(it)}',
                        styles["number"],
                    )
                )
            story.append(Spacer(1, 4))
        elif b.kind == "table":
            story.append(_build_table(b.rows, styles))
            story.append(Spacer(1, 6))
        elif b.kind == "hr":
            story.append(Spacer(1, 4))
        elif b.kind == "hero":
            story.append(Paragraph(inline_md_to_rl(b.text), styles["bid_hero"]))

    return story


def _heading_with_rule(text: str, style: ParagraphStyle) -> list:
    from reportlab.platypus import Flowable

    class GoldRule(Flowable):
        def __init__(self, width=2.0 * inch, thickness=1.2):
            super().__init__()
            self.width = width
            self.thickness = thickness
            self.height = thickness

        def draw(self):
            c = self.canv
            c.setStrokeColor(BRAND["warm_gold"])
            c.setLineWidth(self.thickness)
            c.line(0, 0, self.width, 0)

    return KeepTogether([
        Paragraph(inline_md_to_rl(text), style),
        GoldRule(width=2.2 * inch, thickness=1.3),
        Spacer(1, 4),
    ])


def _build_table(rows: List[List[str]], styles: dict[str, ParagraphStyle]) -> Table:
    if not rows:
        return Spacer(1, 0)
    header, *body = rows
    ncols = max(len(header), max((len(r) for r in body), default=0))
    # Normalize row widths
    def pad(r: list) -> list:
        return r + [""] * (ncols - len(r))
    header = pad(header)
    body = [pad(r) for r in body]

    # Wrap cells as Paragraphs so they line-break cleanly
    def cellify(text: str, is_header: bool) -> Paragraph:
        style_name = "body_small"
        s = styles[style_name]
        if is_header:
            s = ParagraphStyle("hdr", parent=s, textColor=white, fontName=FONT_BOLD)
        # Right-align numeric-looking cells
        if not is_header and _looks_numeric(text):
            s = ParagraphStyle("num", parent=s, alignment=TA_RIGHT)
        return Paragraph(inline_md_to_rl(text), s)

    data = [[cellify(c, True) for c in header]] + [
        [cellify(c, False) for c in r] for r in body
    ]

    # Column widths: share page width (roughly)
    usable = LETTER[0] - 2 * PAGE_MARGIN
    col_widths = [usable / ncols] * ncols

    t = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND["forest_green"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BRAND["cream"], BRAND["green_tint"]]),
                ("GRID", (0, 0), (-1, -1), 0.3, BRAND["slate"]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


_NUM_RE = re.compile(r"^[\$\-]?[\d,]+(\.\d+)?[%\+]?$")


def _looks_numeric(s: str) -> bool:
    s = s.strip()
    if not s:
        return False
    return bool(_NUM_RE.match(s.replace(" ", "")))


# ---------------------------------------------------------------------------
# Cover page builder
# ---------------------------------------------------------------------------

def _cover_page(audience: str, meta: dict, styles: dict[str, ParagraphStyle]) -> list:
    eyebrow_map = {
        "gc": "PROPOSAL FOR",
        "owner": "QUOTE FOR",
        "residential": "PROPOSAL FOR",
    }
    eyebrow = eyebrow_map.get(audience, "PROPOSAL FOR")

    project_name = meta.get("project_name", "Project Name")
    client_line = (
        meta.get("gc_company_name")
        or meta.get("client_company_name")
        or meta.get("homeowner_name")
        or ""
    )
    attn = (
        meta.get("gc_estimator_name")
        or meta.get("client_contact_name")
        or ""
    )
    attn_title = meta.get("gc_estimator_title") or meta.get("client_contact_title") or ""

    story: list = []
    # Top brand band
    story.append(Spacer(1, 0.8 * inch))
    story.append(Paragraph("GCC LLC", styles["cover_title"]))
    story.append(Paragraph(
        "Division 27 &amp; 28 Low-Voltage Contractor · KCMO / STL",
        styles["cover_sub"],
    ))
    story.append(Spacer(1, 1.1 * inch))

    story.append(Paragraph(eyebrow, styles["cover_eyebrow"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph(project_name, styles["cover_title"]))
    story.append(Spacer(1, 0.35 * inch))

    # Prepared for block
    rows = []
    if client_line:
        rows.append(("Prepared for:", client_line))
    if attn:
        rows.append(("Attn:", attn + (f", {attn_title}" if attn_title else "")))
    if meta.get("project_address"):
        rows.append(("Address:", meta["project_address"]))
    if meta.get("proposal_date"):
        rows.append(("Date:", meta["proposal_date"]))
    if meta.get("validity_date"):
        rows.append(("Valid through:", meta["validity_date"]))
    if meta.get("gcc_bid_number"):
        rows.append(("Our reference:", meta["gcc_bid_number"]))

    if rows:
        table_data = [
            [
                Paragraph(f'<font color="#455A64"><b>{k}</b></font>', styles["body"]),
                Paragraph(inline_md_to_rl(v), styles["body"]),
            ]
            for k, v in rows
        ]
        t = Table(table_data, colWidths=[1.4 * inch, 4.6 * inch])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(t)

    return story


# ---------------------------------------------------------------------------
# Page canvas decoration
# ---------------------------------------------------------------------------

def _draw_cover_decor(canvas, doc):
    # Gold diagonal accent bar top-right
    canvas.saveState()
    canvas.setFillColor(BRAND["warm_gold"])
    canvas.rect(LETTER[0] - 1.5 * inch, LETTER[1] - 0.25 * inch, 1.5 * inch, 0.25 * inch, fill=1, stroke=0)
    # Forest band down left edge
    canvas.setFillColor(BRAND["forest_green"])
    canvas.rect(0, 0, 0.35 * inch, LETTER[1], fill=1, stroke=0)
    canvas.restoreState()


def _draw_body_decor(canvas, doc):
    # Footer
    canvas.saveState()
    canvas.setFont(FONT, 9)
    canvas.setFillColor(BRAND["slate"])
    footer_text = (
        "GCC LLC · 201 S Main St, Ste C, St Peters MO 63376 · (636) 224-8192 · "
        "corporate@greencommllc.com"
    )
    canvas.drawCentredString(LETTER[0] / 2.0, 0.45 * inch, footer_text)
    canvas.setFillColor(BRAND["warm_gold"])
    canvas.rect(PAGE_MARGIN, 0.65 * inch, 0.6 * inch, 0.03 * inch, fill=1, stroke=0)
    # Page number on right
    canvas.setFillColor(BRAND["slate"])
    canvas.drawRightString(LETTER[0] - PAGE_MARGIN, 0.45 * inch, f"Page {doc.page - 1}")
    # Gold header hairline + section tag on left
    canvas.setFillColor(BRAND["forest_green"])
    canvas.setFont(FONT_BOLD, 9)
    canvas.drawString(PAGE_MARGIN, LETTER[1] - 0.45 * inch, "GCC LLC")
    canvas.setStrokeColor(BRAND["warm_gold"])
    canvas.setLineWidth(0.8)
    canvas.line(PAGE_MARGIN, LETTER[1] - 0.55 * inch, LETTER[0] - PAGE_MARGIN, LETTER[1] - 0.55 * inch)
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Document assembly
# ---------------------------------------------------------------------------

def render_pdf(
    md_text: str,
    audience: str,
    meta: dict,
    out_path: Path,
):
    md_clean = strip_qa_appendix(md_text)
    missing = find_unsubstituted_vars(md_clean)
    blocks = parse_markdown(md_clean)

    styles = build_styles()
    story = build_story(blocks, audience, styles, meta)

    # Warning page if placeholders remain
    if missing:
        story.append(PageBreak())
        story.append(Paragraph(
            "<b>Internal Review — Unsubstituted Placeholders</b>",
            styles["h2"],
        ))
        story.append(Paragraph(
            "The following variables were not filled in by the drafter. "
            "Resolve before sending to the client.",
            styles["body"],
        ))
        for v in missing:
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;<b>{{{{{v}}}}}</b>", styles["warning"]))

    # --- Build doc ---
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(out_path),
        pagesize=LETTER,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        topMargin=0.85 * inch,
        bottomMargin=0.85 * inch,
        title=meta.get("project_name", "GCC LLC Proposal"),
        author="GCC LLC",
        subject="GCC LLC Proposal",
        creator="GCC LLC Proposal Generator",
    )

    frame_cover = Frame(
        PAGE_MARGIN, PAGE_MARGIN,
        LETTER[0] - 2 * PAGE_MARGIN, LETTER[1] - 2 * PAGE_MARGIN,
        id="cover", showBoundary=0,
    )
    frame_body = Frame(
        PAGE_MARGIN, 0.85 * inch,
        LETTER[0] - 2 * PAGE_MARGIN, LETTER[1] - 1.7 * inch,
        id="body", showBoundary=0,
    )

    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame_cover], onPage=_draw_cover_decor),
        PageTemplate(id="body", frames=[frame_body], onPage=_draw_body_decor),
    ])

    doc.build(story)

    return missing


# ---------------------------------------------------------------------------
# Input handling
# ---------------------------------------------------------------------------

def infer_audience_from_md(md: str) -> str:
    """Look at the first H2 or headline to guess audience."""
    head = md.splitlines()[:40]
    text = " ".join(head).lower()
    if "homeowner" in text or "hi {{homeowner" in text:
        return "residential"
    if "quote for" in text or "end-client" in text or "direct client" in text:
        return "owner"
    return "gc"


def load_input(path: Path, cli_audience: Optional[str]) -> tuple[str, str, dict]:
    """Return (markdown_text, audience, metadata)."""
    raw = path.read_text(encoding="utf-8")
    if path.suffix.lower() in {".json", ".jsonl"}:
        data = json.loads(raw)
        audience = cli_audience or data.get("audience") or "gc"
        md = data.get("markdown") or data.get("md")
        if not md:
            # JSON briefing with no pre-rendered markdown: emit a tiny placeholder
            # page so the user at least gets a branded PDF skeleton reminding
            # them to run the draft through Claude first.
            md = _briefing_stub(data, audience)
        meta = data.get("meta") or {k: v for k, v in data.items() if isinstance(v, str)}
        meta.setdefault("project_name", data.get("project_name", "Untitled Project"))
        return md, audience, meta

    # Markdown path
    audience = cli_audience or infer_audience_from_md(raw)
    meta = _extract_meta_from_md(raw)
    return raw, audience, meta


def _briefing_stub(data: dict, audience: str) -> str:
    """When JSON has no markdown, create a one-page placeholder."""
    name = data.get("project_name", "Untitled Project")
    return (
        f"# {name}\n\n"
        f"## Draft Required\n\n"
        f"This briefing has been exported from the HTML generator but has not "
        f"yet been run through the Claude drafter. Paste the JSON into the "
        f"Claude Project with the master system prompt to produce the "
        f"proposal markdown, then re-run this tool.\n\n"
        f"**Audience:** {audience}\n\n"
        f"**Briefing payload:**\n\n"
        f"```\n{json.dumps(data, indent=2)[:2000]}\n```\n"
    )


_META_HEADER_RE = re.compile(
    r"^\s*-\s+\*\*(?P<key>[^:*]+):\*\*\s*(?P<val>.+?)\s*$", re.MULTILINE
)


def _extract_meta_from_md(md: str) -> dict:
    """Best-effort scan of the cover section for key/value lines."""
    head = "\n".join(md.splitlines()[:60])
    meta: dict = {}

    # First H1 becomes project_name
    m = re.search(r"^\s*#\s+(.+?)\s*$", md, re.MULTILINE)
    if m:
        meta["project_name"] = m.group(1).strip()

    # Explicit markers in first Cover-Page list
    for m in _META_HEADER_RE.finditer(head):
        key = m.group("key").strip().lower()
        val = m.group("val").strip()
        mapped = {
            "prepared for": "client_company_name",
            "bid to": "gc_company_name",
            "attn": "gc_estimator_name",
            "date": "proposal_date",
            "valid through": "validity_date",
            "our reference": "gcc_bid_number",
            "address": "project_address",
        }.get(key)
        if mapped:
            meta[mapped] = val

    return meta


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def default_output_name(input_path: Path, audience: str, meta: dict) -> Path:
    slug_src = meta.get("project_name") or input_path.stem
    slug = re.sub(r"[^A-Za-z0-9]+", "-", slug_src).strip("-").lower() or "proposal"
    stamp = datetime.now().strftime("%Y-%m-%d")
    out_dir = input_path.parent.parent / "output"
    return out_dir / f"{audience}-{slug}-{stamp}.pdf"


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Build a branded GCC LLC proposal PDF.")
    parser.add_argument("--input", "-i", required=True, type=Path,
                        help="Path to the filled proposal .md OR a .json briefing.")
    parser.add_argument("--output", "-o", type=Path, default=None,
                        help="Output PDF path. Default: ./output/<audience>-<slug>-<date>.pdf")
    parser.add_argument("--audience", "-a", choices=["gc", "owner", "residential"],
                        default=None,
                        help="Override/supply audience. For .md inputs it is inferred.")
    args = parser.parse_args(argv)

    if not args.input.exists():
        print(f"ERROR: input file not found: {args.input}", file=sys.stderr)
        return 2

    md, audience, meta = load_input(args.input, args.audience)
    out_path = args.output or default_output_name(args.input, audience, meta)

    print(f"[build_proposal_pdf] audience={audience}")
    print(f"[build_proposal_pdf] input={args.input}")
    print(f"[build_proposal_pdf] output={out_path}")

    missing = render_pdf(md, audience, meta, out_path)
    if missing:
        print(f"[build_proposal_pdf] WARNING: {len(missing)} unsubstituted placeholders: {', '.join(missing)}")
    print(f"[build_proposal_pdf] OK — wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
