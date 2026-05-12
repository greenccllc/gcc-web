"""
Graphite & Copper — Showcase renderer for the GCC LLC proposal system (alt theme).

Renders the bid-example.yaml data (William Chrisman HS / Straub) in the
Graphite & Copper aesthetic: bone paper, graphite ink, copper accents,
hairline construction grid, mono numerics, display-serif titles.

The intent is a *showcase* — a design demonstration that uses the exact
same proposal data as the Forest Canopy render, so Nathan can compare them
side-by-side and choose a house style. This script renders directly via
reportlab.canvas (rather than Platypus) because the theme is composed from
hand-placed marks: scale bars, registration ticks, measured rules.
"""

import os
from pathlib import Path

import yaml
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# ---------------------------------------------------------------------
# PALETTE — see PHILOSOPHY.md
# ---------------------------------------------------------------------
BONE           = HexColor("#F4EFE6")
PAPER          = HexColor("#FBF8F2")
GRAPHITE       = HexColor("#1F1E1C")
GRAPHITE_MID   = HexColor("#4A4744")
GRAPHITE_LIGHT = HexColor("#8E8A83")
COPPER         = HexColor("#A0603A")
COPPER_DEEP    = HexColor("#7A4628")
HAIRLINE       = HexColor("#C6BFAF")
HAIRLINE_DARK  = HexColor("#8E8679")

# ---------------------------------------------------------------------
# FONTS
# ---------------------------------------------------------------------
FONT_DIR = "/sessions/gifted-compassionate-gates/mnt/.claude/skills/canvas-design/canvas-fonts"

def _reg(name, filename):
    path = os.path.join(FONT_DIR, filename)
    pdfmetrics.registerFont(TTFont(name, path))

_reg("Display",    "InstrumentSerif-Regular.ttf")
_reg("Display-I",  "InstrumentSerif-Italic.ttf")
_reg("Sans",       "InstrumentSans-Regular.ttf")
_reg("Sans-B",     "InstrumentSans-Bold.ttf")
_reg("Sans-I",     "InstrumentSans-Italic.ttf")
_reg("Mono",       "IBMPlexMono-Regular.ttf")
_reg("Mono-B",     "IBMPlexMono-Bold.ttf")

# ---------------------------------------------------------------------
# PAGE GEOMETRY
# ---------------------------------------------------------------------
PAGE_W, PAGE_H   = LETTER
LEFT_M           = 1.25 * inch     # wide left margin — room for scale bar
RIGHT_M          = 0.85 * inch
TOP_M            = 0.95 * inch
BOT_M            = 0.95 * inch
COL_W            = PAGE_W - LEFT_M - RIGHT_M

SCALE_X          = 0.52 * inch     # where the vertical scale bar lives

# ---------------------------------------------------------------------
# PLATE / SURFACE
# ---------------------------------------------------------------------
def fill_surface(c):
    """Warm ivory field — the base paper."""
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

def reg_ticks(c):
    """Registration crosses at page corners — like plate marks on an
    engineering drawing. Whispered, not decorative."""
    c.setStrokeColor(HAIRLINE_DARK)
    c.setLineWidth(0.4)
    t = 5  # tick arm length
    # top-left
    c.line(0.35*inch - t, PAGE_H - 0.35*inch, 0.35*inch + t, PAGE_H - 0.35*inch)
    c.line(0.35*inch, PAGE_H - 0.35*inch - t, 0.35*inch, PAGE_H - 0.35*inch + t)
    # top-right
    c.line(PAGE_W - 0.35*inch - t, PAGE_H - 0.35*inch, PAGE_W - 0.35*inch + t, PAGE_H - 0.35*inch)
    c.line(PAGE_W - 0.35*inch, PAGE_H - 0.35*inch - t, PAGE_W - 0.35*inch, PAGE_H - 0.35*inch + t)
    # bot-left
    c.line(0.35*inch - t, 0.35*inch, 0.35*inch + t, 0.35*inch)
    c.line(0.35*inch, 0.35*inch - t, 0.35*inch, 0.35*inch + t)
    # bot-right
    c.line(PAGE_W - 0.35*inch - t, 0.35*inch, PAGE_W - 0.35*inch + t, 0.35*inch)
    c.line(PAGE_W - 0.35*inch, 0.35*inch - t, PAGE_W - 0.35*inch, 0.35*inch + t)

def scale_bar(c):
    """Vertical measurement scale at left margin — architect's scale."""
    x = SCALE_X
    y_top = PAGE_H - TOP_M + 0.15*inch
    y_bot = BOT_M - 0.15*inch
    # spine
    c.setStrokeColor(HAIRLINE_DARK)
    c.setLineWidth(0.5)
    c.line(x, y_bot, x, y_top)
    # major/minor ticks every 0.5" from bottom
    total = y_top - y_bot
    n_minor = int(total / (0.25*inch))
    c.setFont("Mono", 5.8)
    c.setFillColor(GRAPHITE_LIGHT)
    for i in range(n_minor + 1):
        y = y_bot + i * 0.25*inch
        if y > y_top: break
        major = (i % 4 == 0)
        arm = 6 if major else 3
        c.setStrokeColor(HAIRLINE_DARK if major else HAIRLINE)
        c.setLineWidth(0.5 if major else 0.35)
        c.line(x - arm, y, x + arm, y)
        if major and i > 0:
            c.drawRightString(x - 8, y - 1.6, f"{i//4:02d}")

def plate_code(c, code, page_no, total):
    """Top-right plate code, mono — locates this plate in the series."""
    c.setFont("Mono", 7.5)
    c.setFillColor(GRAPHITE)
    c.drawRightString(PAGE_W - RIGHT_M, PAGE_H - 0.62*inch, code)
    c.setFont("Mono", 6.2)
    c.setFillColor(GRAPHITE_LIGHT)
    c.drawRightString(PAGE_W - RIGHT_M, PAGE_H - 0.78*inch, f"PLATE {page_no:02d} / {total:02d}")

def copper_tick(c, x, y, size=5):
    """Small solid copper square — the signature mark of this series."""
    c.setFillColor(COPPER)
    c.rect(x, y, size, size, stroke=0, fill=1)

def hairline(c, x1, y, x2, col=HAIRLINE_DARK, w=0.4):
    c.setStrokeColor(col)
    c.setLineWidth(w)
    c.line(x1, y, x2, y)

def draw_running_head(c, series_label):
    """Tiny running head at top — like a book's chapter mark."""
    c.setFont("Sans", 7)
    c.setFillColor(GRAPHITE_LIGHT)
    c.drawString(LEFT_M, PAGE_H - 0.62*inch, "GCC LLC · LOW-VOLTAGE PRACTICE")
    # series label in copper
    c.setFont("Sans", 7)
    c.setFillColor(COPPER_DEEP)
    c.drawString(LEFT_M, PAGE_H - 0.78*inch, series_label)

def draw_footer(c, proposal_no, page_no, total):
    """Hairline rule + mono footer info."""
    y = BOT_M - 0.32*inch
    hairline(c, LEFT_M, y, PAGE_W - RIGHT_M, HAIRLINE_DARK, 0.4)
    c.setFont("Mono", 6.8)
    c.setFillColor(GRAPHITE_MID)
    c.drawString(LEFT_M, y - 12, "GREEN  COMMUNICATIONS  CONTRACTING  LLC")
    c.setFillColor(GRAPHITE_LIGHT)
    c.drawCentredString(PAGE_W/2, y - 12, proposal_no)
    c.drawRightString(PAGE_W - RIGHT_M, y - 12, f"{page_no:02d} / {total:02d}")

# ---------------------------------------------------------------------
# TYPOGRAPHIC HELPERS
# ---------------------------------------------------------------------
def kicker(c, x, y, text, color=None):
    """Small-caps tracked kicker — manually spaced since reportlab lacks
    setCharSpace on the canvas at some versions."""
    c.setFont("Sans-B", 6.8)
    c.setFillColor(color if color else COPPER_DEEP)
    spaced = "  ".join(list(text.upper()))
    c.drawString(x, y, spaced)

def serif_title(c, x, y, text, size=30, color=None, leading=None):
    c.setFont("Display", size)
    c.setFillColor(color if color else GRAPHITE)
    # wrap manually at COL_W
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(test, "Display", size) > COL_W:
            lines.append(cur); cur = w
        else:
            cur = test
    if cur: lines.append(cur)
    lh = leading or int(size * 1.08)
    for i, ln in enumerate(lines):
        c.drawString(x, y - i*lh, ln)
    return y - (len(lines)-1)*lh

def body_paragraph(c, x, y, text, width, size=9.3, leading=13, color=None, font="Sans"):
    c.setFont(font, size)
    c.setFillColor(color if color else GRAPHITE_MID)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(test, font, size) > width:
            lines.append(cur); cur = w
        else:
            cur = test
    if cur: lines.append(cur)
    for i, ln in enumerate(lines):
        c.drawString(x, y - i*leading, ln)
    return y - (len(lines)-1)*leading - leading

def label_value(c, x, y, label, value, label_w=1.25*inch,
                val_font="Mono", val_size=9.5):
    """Small-caps kicker + mono value, datum style."""
    kicker(c, x, y, label, COPPER_DEEP)
    c.setFont(val_font, val_size)
    c.setFillColor(GRAPHITE)
    c.drawString(x + label_w, y, value)

# ---------------------------------------------------------------------
# PAGE BUILDERS
# ---------------------------------------------------------------------
def money(n): return f"${n:,.2f}"

def page_shell(c, series_label, plate_code_txt, page_no, total, proposal_no):
    fill_surface(c)
    reg_ticks(c)
    scale_bar(c)
    plate_code(c, plate_code_txt, page_no, total)
    draw_running_head(c, series_label)
    draw_footer(c, proposal_no, page_no, total)


def page_one_cover(c, data, total, proposal_no):
    """Cover plate — the title page."""
    page_shell(c, "PLATE 01 · COVER", "PL-001", 1, total, proposal_no)

    # Copper tick above title
    copper_tick(c, LEFT_M, PAGE_H - 1.90*inch, 7)

    # Kicker
    kicker(c, LEFT_M, PAGE_H - 2.05*inch, "Bid Proposal · Sealed")
    # Large serif title — set on two lines with proper leading
    TITLE_LEADING = 54
    y_title = PAGE_H - 2.80*inch
    c.setFont("Display", 48)
    c.setFillColor(GRAPHITE)
    c.drawString(LEFT_M, y_title, "William Chrisman")
    c.drawString(LEFT_M, y_title - TITLE_LEADING, "High School.")
    y = y_title - TITLE_LEADING

    # italic subtitle
    c.setFont("Display-I", 19)
    c.setFillColor(GRAPHITE_MID)
    c.drawString(LEFT_M, y - 0.48*inch, "2026 Renovations  —  Low-Voltage Package")

    # Thin copper rule
    y2 = y - 0.88*inch
    c.setStrokeColor(COPPER)
    c.setLineWidth(0.8)
    c.line(LEFT_M, y2, LEFT_M + 2.2*inch, y2)

    # Fact block — stacked rows, full-width, label + mono value
    # Single column keeps the email, project number etc. from colliding.
    row_y = y2 - 0.55*inch
    row_h = 0.32*inch
    label_w = 1.6*inch

    facts = [
        ("Prepared for",  "Straub Construction Co.",          "Sans",    10.5),
        ("Attention",     "Alan Brooks  ·  Sr Project Mgr",   "Sans",    10.5),
        ("Email",         "abrooks@straubconstruction.com",   "Mono",    9.5),
        ("Phone",         "+1 913 555 0142",                   "Mono",    9.5),
        ("Project no.",   "ISD-2026-014",                      "Mono",    9.5),
        ("Bid due",       "May 08, 2026",                      "Mono",    9.5),
        ("Pricing firm",  "60 days",                            "Mono",    9.5),
        ("Proposal no.",  proposal_no,                         "Mono",    9.5),
    ]
    for i, (k, v, font, size) in enumerate(facts):
        yy = row_y - i*row_h
        # hairline above each row except the first — subtle row divider
        if i > 0:
            hairline(c, LEFT_M, yy + 0.19*inch, LEFT_M + COL_W, HAIRLINE, 0.25)
        kicker(c, LEFT_M, yy, k, COPPER_DEEP)
        c.setFont(font, size)
        c.setFillColor(GRAPHITE)
        c.drawString(LEFT_M + label_w, yy, v)

    # Project site + scope summary — placed below all 8 fact rows
    block_y = row_y - 8*row_h - 0.35*inch
    kicker(c, LEFT_M, block_y, "Project site", COPPER_DEEP)
    c.setFont("Display-I", 14)
    c.setFillColor(GRAPHITE)
    c.drawString(LEFT_M, block_y - 22, "1223 N Noland Rd. · Independence, MO 64050")

    # Bottom signature mark
    sig_y = 1.4*inch
    c.setStrokeColor(HAIRLINE_DARK)
    c.setLineWidth(0.5)
    c.line(LEFT_M, sig_y + 0.4*inch, LEFT_M + 1.8*inch, sig_y + 0.4*inch)
    c.setFont("Display-I", 11)
    c.setFillColor(GRAPHITE)
    c.drawString(LEFT_M, sig_y + 0.2*inch, "Nathan Morris")
    c.setFont("Sans", 8)
    c.setFillColor(GRAPHITE_LIGHT)
    c.drawString(LEFT_M, sig_y + 0.05*inch, "Director of Operations & CTO")
    c.drawString(LEFT_M, sig_y - 0.08*inch, "nmorris@greencommllc.com  ·  +1 816 555 0101")


def page_two_scope(c, data, total, proposal_no):
    """Scope-of-work plate — bill of materials."""
    page_shell(c, "PLATE 02 · SCOPE OF WORK", "PL-002", 2, total, proposal_no)

    # Plate heading
    y = PAGE_H - 1.55*inch
    kicker(c, LEFT_M, y, "PLATE  II")
    copper_tick(c, LEFT_M + COL_W - 7, y - 1, 6)
    serif_title(c, LEFT_M, y - 0.45*inch, "Scope of work.", size=32)

    # Small descriptive italic
    y = y - 0.95*inch
    c.setFont("Display-I", 11)
    c.setFillColor(GRAPHITE_MID)
    c.drawString(LEFT_M, y, "Unit pricing and extended totals per bid documents 2026-03-12.")

    # Table construction: fixed column starts
    y_table = y - 0.35*inch
    col_qty   = LEFT_M
    col_un    = LEFT_M + 0.55*inch
    col_desc  = LEFT_M + 1.00*inch
    col_unit  = LEFT_M + COL_W - 1.75*inch
    col_line  = LEFT_M + COL_W - 0.05*inch

    # Header row — tracked manually via double-space
    c.setFillColor(GRAPHITE)
    c.setFont("Sans-B", 6.8)
    c.drawString(col_qty,   y_table, "Q T Y")
    c.drawString(col_un,    y_table, "U N")
    c.drawString(col_desc,  y_table, "D E S C R I P T I O N")
    c.drawRightString(col_unit + 0.9*inch, y_table, "U N I T   P R I C E")
    c.drawRightString(col_line, y_table, "L I N E   T O T A L")

    hairline(c, LEFT_M, y_table - 6, LEFT_M + COL_W, GRAPHITE, 0.6)

    scope = [
        (480, "ea", "Cat6A plenum data drops — classroom and admin outlets (Cat6 spec; GCC supplies Cat6A at spec price)", 86.50, 41520.00),
        (32,  "ls", "MDF / IDF rack buildout — 6 closets, 45U racks with cable management and vertical runway", 2850.00, 91200.00),
        (6,   "ls", "Inter-closet fiber backbone — 12-strand OS2 single-mode between MDF and 5 IDFs", 6200.00, 37200.00),
        (42,  "ea", "IP CCTV camera rough-in — Cat6A home-run from each camera location to nearest IDF, terminated both ends", 215.00, 9030.00),
        (18,  "ea", "Access-control rough-in — door position switch, REX, reader cable, strike cable to door, terminated at IDF", 485.00, 8730.00),
        (1,   "ls", "Fluke DSX-8000 certification testing — all data and fiber; LinkWare PDF at closeout", 4200.00, 4200.00),
    ]

    row_y = y_table - 22
    row_h_base = 16  # per text line
    desc_w = col_unit - col_desc - 12
    c.setFillColor(GRAPHITE)

    subtotal = 0
    for (qty, un, desc, up, lt) in scope:
        # wrap description
        c.setFont("Sans", 9)
        words = desc.split()
        lines, cur = [], ""
        for w in words:
            test = (cur + " " + w).strip()
            if pdfmetrics.stringWidth(test, "Sans", 9) > desc_w:
                lines.append(cur); cur = w
            else:
                cur = test
        if cur: lines.append(cur)
        row_height = max(len(lines)*13 + 6, 22)

        # mono numerics
        c.setFont("Mono", 9)
        c.setFillColor(GRAPHITE)
        c.drawString(col_qty, row_y, f"{qty}")
        c.setFillColor(GRAPHITE_LIGHT)
        c.drawString(col_un, row_y, un)

        # description lines
        c.setFont("Sans", 9)
        c.setFillColor(GRAPHITE_MID)
        for i, ln in enumerate(lines):
            c.drawString(col_desc, row_y - i*13, ln)

        # unit price + line total (mono, right-aligned)
        c.setFont("Mono", 9)
        c.setFillColor(GRAPHITE)
        c.drawRightString(col_unit + 0.9*inch, row_y, money(up))
        c.setFont("Mono-B", 9)
        c.drawRightString(col_line, row_y, money(lt))

        subtotal += lt
        row_y -= row_height
        # thin hairline between rows
        hairline(c, LEFT_M, row_y + 6, LEFT_M + COL_W, HAIRLINE, 0.35)

    # Subtotal
    row_y -= 8
    c.setFont("Sans-B", 8)
    c.setFillColor(GRAPHITE_MID)
    c.drawString(col_desc, row_y, "S U B T O T A L")
    c.setFont("Mono", 9.5)
    c.setFillColor(GRAPHITE)
    c.drawRightString(col_line, row_y, money(subtotal))

    # TOTAL — copper underline treatment
    row_y -= 24
    hairline(c, col_desc - 6, row_y + 10, LEFT_M + COL_W, GRAPHITE, 0.6)
    c.setFont("Display", 18)
    c.setFillColor(GRAPHITE)
    c.drawString(col_desc, row_y - 6, "Total.")
    c.setFont("Mono-B", 15)
    c.drawRightString(col_line, row_y - 6, money(subtotal))
    # copper double-rule under total
    c.setStrokeColor(COPPER)
    c.setLineWidth(0.5)
    c.line(col_desc - 6, row_y - 14, LEFT_M + COL_W, row_y - 14)
    c.setLineWidth(0.35)
    c.line(col_desc - 6, row_y - 17, LEFT_M + COL_W, row_y - 17)

    # MSP alternate — below total, separate block
    msp_y = row_y - 0.75*inch
    kicker(c, LEFT_M, msp_y, "ALTERNATE · MANAGED SERVICES")
    copper_tick(c, LEFT_M + 2.85*inch, msp_y - 1, 5)
    c.setFont("Display-I", 12)
    c.setFillColor(GRAPHITE_MID)
    c.drawString(LEFT_M, msp_y - 20,
        "Monthly service beyond commissioning. Priced separately.")
    c.setFont("Mono", 10)
    c.setFillColor(GRAPHITE)
    c.drawRightString(col_line, msp_y - 20, "$985.00 / mo")


def page_three_warranty_terms(c, data, total, proposal_no):
    """Warranty + schedule + terms plate."""
    page_shell(c, "PLATE 03 · WARRANTY · SCHEDULE · TERMS", "PL-003", 3, total, proposal_no)

    y = PAGE_H - 1.55*inch
    kicker(c, LEFT_M, y, "PLATE  III")
    copper_tick(c, LEFT_M + COL_W - 7, y - 1, 6)
    serif_title(c, LEFT_M, y - 0.45*inch, "Warranty, schedule, terms.", size=30)

    # Warranty callout — keylined box with copper tick
    y_box = y - 1.45*inch
    box_h = 1.15*inch
    c.setStrokeColor(GRAPHITE_LIGHT)
    c.setLineWidth(0.35)
    c.rect(LEFT_M, y_box - box_h, COL_W, box_h, stroke=1, fill=0)
    # copper tick at top-left
    copper_tick(c, LEFT_M - 3, y_box - 3, 6)
    # label
    kicker(c, LEFT_M + 14, y_box - 16, "WARRANTY — §1.4")
    # warranty body
    warranty_text = (
        "Lifetime workmanship warranty on all GCC-installed cable and "
        "terminations, transferable with the property. Manufacturer "
        "warranties pass through on equipment. Five-year coverage on "
        "GCC-furnished hardware."
    )
    c.setFont("Display-I", 12)
    c.setFillColor(GRAPHITE)
    body_paragraph(c, LEFT_M + 14, y_box - 40, warranty_text,
                   COL_W - 28, size=12, leading=18,
                   color=GRAPHITE, font="Display-I")

    # SCHEDULE block
    sch_y = y_box - box_h - 0.45*inch
    kicker(c, LEFT_M, sch_y, "SCHEDULE")
    # copper vertical hairline left of the block
    c.setStrokeColor(COPPER)
    c.setLineWidth(0.8)
    c.line(LEFT_M - 10, sch_y - 4, LEFT_M - 10, sch_y - 3*24 - 14)

    sch_rows = [
        ("TARGET  START",   "09 JUN 2026"),
        ("TARGET  FINISH",  "15 AUG 2026"),
        ("BID  DUE",        "08 MAY 2026"),
    ]
    for i, (k, v) in enumerate(sch_rows):
        yy = sch_y - 22 - i*24
        c.setFont("Sans", 7.2)
        c.setFillColor(GRAPHITE_LIGHT)
        c.drawString(LEFT_M, yy, k)
        c.setFont("Mono", 11)
        c.setFillColor(GRAPHITE)
        c.drawString(LEFT_M + 1.6*inch, yy, v)

    # TERMS — two columns
    t_y = sch_y - 3*24 - 0.6*inch
    kicker(c, LEFT_M, t_y, "TERMS")
    terms = [
        ("PAYMENT",   "Net 30 from invoice, per GC terms."),
        ("DEPOSIT",   "Per GC payment schedule."),
        ("CHANGES",   "Any scope change via CO — priced T&M or lump-sum."),
        ("INSURANCE", "GL $2M · Auto $1M · WC $1M.  COI on request."),
        ("LICENSURE", "Licensed in MO · prevailing-wage compliant."),
        ("VALIDITY",  "Pricing firm through 07 Jul 2026."),
    ]
    for i, (k, v) in enumerate(terms):
        yy = t_y - 22 - i*20
        c.setFont("Sans-B", 7.2)
        c.setFillColor(COPPER_DEEP)
        c.drawString(LEFT_M, yy, k)
        c.setFont("Sans", 9.2)
        c.setFillColor(GRAPHITE_MID)
        c.drawString(LEFT_M + 1.4*inch, yy, v)


def page_four_acceptance(c, data, total, proposal_no):
    """Acceptance / signature plate."""
    page_shell(c, "PLATE 04 · ACCEPTANCE", "PL-004", 4, total, proposal_no)

    y = PAGE_H - 1.55*inch
    kicker(c, LEFT_M, y, "PLATE  IV")
    copper_tick(c, LEFT_M + COL_W - 7, y - 1, 6)
    serif_title(c, LEFT_M, y - 0.45*inch, "Acceptance.", size=38)

    # Italic lead
    y = y - 1.15*inch
    c.setFont("Display-I", 13)
    c.setFillColor(GRAPHITE_MID)
    body_paragraph(c, LEFT_M, y,
        "Execution by both parties constitutes acceptance of the scope, "
        "pricing, and terms set forth in the preceding plates.",
        COL_W, size=13, leading=19, color=GRAPHITE_MID, font="Display-I")

    # Two signature columns
    sig_y = y - 1.15*inch
    col_w = (COL_W - 0.6*inch) / 2
    left_x  = LEFT_M
    right_x = LEFT_M + col_w + 0.6*inch

    def sig_col(x, kicker_txt, name, title):
        kicker(c, x, sig_y, kicker_txt)
        # signature line
        line_y = sig_y - 52
        c.setStrokeColor(GRAPHITE)
        c.setLineWidth(0.5)
        c.line(x, line_y, x + col_w - 0.3*inch, line_y)
        # mono date stub below the line
        c.setFont("Mono", 6.8)
        c.setFillColor(GRAPHITE_LIGHT)
        c.drawString(x, line_y - 10, "SIGNATURE")
        c.drawRightString(x + col_w - 0.3*inch, line_y - 10, "DATE")
        # name
        c.setFont("Display", 15)
        c.setFillColor(GRAPHITE)
        c.drawString(x, line_y - 34, name)
        # title italic
        c.setFont("Display-I", 10.5)
        c.setFillColor(GRAPHITE_MID)
        c.drawString(x, line_y - 50, title)

    sig_col(left_x, "PREPARED  BY",
            "Nathan Morris", "Director of Operations & CTO")
    sig_col(right_x, "APPROVED  BY",
            "Kaitlyn Lim Morris", "President & CEO")

    # Contact block at bottom
    contact_y = 1.9*inch
    hairline(c, LEFT_M, contact_y + 0.3*inch, LEFT_M + COL_W, HAIRLINE_DARK, 0.4)
    copper_tick(c, LEFT_M, contact_y + 0.15*inch, 5)
    kicker(c, LEFT_M + 14, contact_y + 0.17*inch, "CONTACT · GCC LLC")
    c.setFont("Mono", 8.5)
    c.setFillColor(GRAPHITE)
    c.drawString(LEFT_M + 14, contact_y - 2, "nmorris@greencommllc.com")
    c.setFillColor(GRAPHITE_MID)
    c.drawString(LEFT_M + 14, contact_y - 16, "+1 816 555 0101")
    c.drawString(LEFT_M + 14, contact_y - 30, "Kansas City, MO  ·  St. Louis, MO")


# ---------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------
def main():
    out = Path("/sessions/gifted-compassionate-gates/mnt/proposal system/proposal-generator/themes/graphite-and-copper/showcase.pdf")
    out.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(out), pagesize=LETTER)
    c.setTitle("GCC LLC · Graphite & Copper — Proposal Theme Showcase")
    c.setAuthor("Green Communications Contracting LLC")

    PROPOSAL_NO = "GCC-2026-0101"
    TOTAL = 4

    page_one_cover(c, None, TOTAL, PROPOSAL_NO);       c.showPage()
    page_two_scope(c, None, TOTAL, PROPOSAL_NO);       c.showPage()
    page_three_warranty_terms(c, None, TOTAL, PROPOSAL_NO); c.showPage()
    page_four_acceptance(c, None, TOTAL, PROPOSAL_NO); c.showPage()

    c.save()
    print(f"OK: {out}")
    print(f"Size: {out.stat().st_size:,} bytes")

if __name__ == "__main__":
    main()
