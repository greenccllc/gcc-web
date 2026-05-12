"""Forest Ledger — grid-dense forest green theme showcase (2 pages)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _shared_bid_data import *

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Palette
CREAM   = HexColor("#F6F2E8")
PAPER   = HexColor("#FBF8F0")
CONIFER = HexColor("#1F3A2E")
PINE    = HexColor("#2E5544")
MOSS    = HexColor("#7C8B5F")
INK     = HexColor("#1A1814")
INK_MID = HexColor("#4A463F")
INK_LT  = HexColor("#8B877E")
RULE    = HexColor("#D8D2C1")

def _reg(n, f): pdfmetrics.registerFont(TTFont(n, os.path.join(FONT_DIR, f)))
_reg("Sans",   "WorkSans-Regular.ttf")
_reg("Sans-B", "WorkSans-Bold.ttf")
_reg("Sans-I", "WorkSans-Italic.ttf")
_reg("Serif",  "Lora-Regular.ttf")
_reg("Serif-I","Lora-Italic.ttf")
_reg("Mono",   "JetBrainsMono-Regular.ttf")
_reg("Mono-B", "JetBrainsMono-Bold.ttf")

PAGE_W, PAGE_H = LETTER
M = 0.55 * inch

def bg(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

def hrule(c, x1, y, x2, color=RULE, w=0.5):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def vrule(c, x, y1, y2, color=CONIFER, w=1.2):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x, y1, x, y2)

def chip(c, x, y, size=4, color=CONIFER):
    c.setFillColor(color); c.rect(x, y, size, size, stroke=0, fill=1)

def kicker(c, x, y, text, color=PINE, size=6.5):
    c.setFont("Sans-B", size); c.setFillColor(color)
    out = "  ".join(list(text.upper()))
    c.drawString(x, y, out)

def header(c, page_no):
    # Top masthead band — thin, all left-aligned
    y = PAGE_H - M
    c.setFont("Sans-B", 7.5); c.setFillColor(CONIFER)
    c.drawString(M, y, "GCC · FOREST LEDGER")
    c.setFont("Sans", 7.5); c.setFillColor(INK_MID)
    c.drawString(M + 1.9*inch, y, "Low-Voltage Practice")
    # Right-aligned meta
    c.setFont("Mono", 7.5); c.setFillColor(INK)
    c.drawRightString(PAGE_W - M, y, f"{PROPOSAL_NO}   ·   {page_no:02d} / 02")
    # Thin green rule
    hrule(c, M, y - 5, PAGE_W - M, CONIFER, 0.8)

def footer(c, page_no):
    y = 0.55 * inch
    hrule(c, M, y + 10, PAGE_W - M, RULE, 0.4)
    c.setFont("Sans", 7); c.setFillColor(INK_LT)
    c.drawString(M, y, "Green Communications Contracting LLC  ·  Kansas City, MO  ·  St. Louis, MO")
    c.setFont("Mono", 7); c.setFillColor(INK_MID)
    c.drawRightString(PAGE_W - M, y, f"PAGE {page_no:02d} / 02")


# ======================================================================
# PAGE 1 — Dashboard cover
# ======================================================================
def page_one(c):
    bg(c)
    header(c, 1)

    # --- TITLE BLOCK ---
    y = PAGE_H - M - 0.55*inch
    chip(c, M, y + 18, 5, CONIFER)
    kicker(c, M + 12, y + 19, "Formal Bid · Sealed")

    c.setFont("Sans-B", 30); c.setFillColor(INK)
    c.drawString(M, y - 12, "William Chrisman HS")
    c.setFont("Serif-I", 14); c.setFillColor(PINE)
    c.drawString(M, y - 32, "2026 Renovations — Low-Voltage Package")

    # Subtitle rule
    hrule(c, M, y - 46, PAGE_W - M, CONIFER, 1.0)

    # --- QUAD FACT GRID (2x2) ---
    col_w = (PAGE_W - 2*M - 0.35*inch) / 2
    row_h = 1.50 * inch
    top   = y - 50 - 0.15*inch
    quads = [
        ("Prepared for", [("Client",  CLIENT["name"]),
                          ("Contact", f'{CLIENT["contact"]} · {CLIENT["title"]}'),
                          ("Email",   CLIENT["email"]),
                          ("Phone",   CLIENT["phone"])]),
        ("Project",      [("Site",    PROJECT["addr"]),
                          ("Vertical",PROJECT["vertical"]),
                          ("Bid no.", PROJECT["bid_no"]),
                          ("Due",     BID_DUE)]),
        ("Schedule",     [("Target start",  PROJECT["start"]),
                          ("Target finish", PROJECT["finish"]),
                          ("Window",        "10 summer weeks"),
                          ("Validity",      VALIDITY)]),
        ("Commercial",   [("Scope lines",   "6"),
                          ("Bid total",     money(TOTAL)),
                          ("MSP (alt)",     f"{money(MSP_MO)} / mo"),
                          ("Loyalty disc.", "—")]),
    ]
    for i, (label, rows) in enumerate(quads):
        col = i % 2
        row = i // 2
        qx = M + col * (col_w + 0.35*inch)
        qy = top - row * (row_h + 0.15*inch)
        # left spine
        vrule(c, qx, qy - row_h + 6, qy - 2, CONIFER, 1.4)
        kicker(c, qx + 10, qy - 6, label, CONIFER, 7)
        for j, (k, v) in enumerate(rows):
            ly = qy - 22 - j * 18
            c.setFont("Sans", 6.8); c.setFillColor(INK_LT)
            c.drawString(qx + 10, ly + 8, k.upper())
            # choose mono or sans by content
            is_mono = any(ch.isdigit() for ch in v) or "@" in v or ":" in v or v.startswith("$")
            c.setFont("Mono" if is_mono else "Sans", 9 if is_mono else 10)
            c.setFillColor(INK)
            # truncate if needed
            maxw = col_w - 20
            while pdfmetrics.stringWidth(v, "Mono" if is_mono else "Sans", 9 if is_mono else 10) > maxw:
                v = v[:-2] + "…"
            c.drawString(qx + 10, ly - 4, v)

    # --- TOTAL BAR ---
    ty = top - 2*(row_h + 0.15*inch) - 0.35*inch
    c.setFillColor(CREAM)
    c.rect(M, ty - 0.55*inch, PAGE_W - 2*M, 0.55*inch, stroke=0, fill=1)
    vrule(c, M, ty - 0.55*inch, ty, CONIFER, 3)
    kicker(c, M + 16, ty - 16, "Bid Total · Held 60 Days", CONIFER, 7)
    c.setFont("Mono-B", 26); c.setFillColor(INK)
    c.drawRightString(PAGE_W - M - 14, ty - 28, money(TOTAL))

    # --- Prepared-by block ---
    py = ty - 0.55*inch - 0.45*inch
    kicker(c, M, py, "Prepared By", CONIFER, 7)
    c.setFont("Serif", 12); c.setFillColor(INK)
    c.drawString(M, py - 16, PREPARED_BY[0])
    c.setFont("Sans", 9); c.setFillColor(INK_MID)
    c.drawString(M, py - 30, PREPARED_BY[1])
    c.setFont("Mono", 8); c.setFillColor(INK_MID)
    c.drawString(M, py - 44, f"{PREPARED_BY[2]}  ·  {PREPARED_BY[3]}")

    # Approved-by on the right
    ax = PAGE_W - M - 2.5*inch
    kicker(c, ax, py, "Approved By", CONIFER, 7)
    c.setFont("Serif", 12); c.setFillColor(INK)
    c.drawString(ax, py - 16, APPROVED_BY[0])
    c.setFont("Sans", 9); c.setFillColor(INK_MID)
    c.drawString(ax, py - 30, APPROVED_BY[1])

    footer(c, 1)


# ======================================================================
# PAGE 2 — Scope (bill of materials)
# ======================================================================
def page_two(c):
    bg(c)
    header(c, 2)

    y = PAGE_H - M - 0.55*inch
    chip(c, M, y + 18, 5, CONIFER)
    kicker(c, M + 12, y + 19, "Plate II · Scope of Work")
    c.setFont("Sans-B", 24); c.setFillColor(INK)
    c.drawString(M, y - 4, "The Work, Itemized.")
    c.setFont("Serif-I", 11); c.setFillColor(INK_MID)
    c.drawString(M, y - 22, "Unit pricing and extended totals per bid documents 2026-03-12.")
    hrule(c, M, y - 38, PAGE_W - M, CONIFER, 1.0)

    # Table columns — explicit x-coords, no overlap
    tx0 = M
    col_qty  = tx0
    col_un   = tx0 + 0.42*inch
    col_desc = tx0 + 0.85*inch
    col_up   = PAGE_W - M - 1.55*inch   # right-edge of unit price column
    col_lt   = PAGE_W - M                # right-edge of line total column

    yh = y - 58
    c.setFont("Sans-B", 6.5); c.setFillColor(PINE)
    c.drawString(col_qty,  yh, "QTY")
    c.drawString(col_un,   yh, "UN")
    c.drawString(col_desc, yh, "DESCRIPTION")
    c.drawRightString(col_up, yh, "UNIT PRICE")
    c.drawRightString(col_lt, yh, "LINE TOTAL")
    hrule(c, tx0, yh - 6, PAGE_W - M, INK, 0.8)

    row_y = yh - 26
    for (qty, un, head, tail, up, lt) in SCOPE:
        # left chip
        chip(c, tx0 - 8, row_y + 1, 3, CONIFER)
        c.setFont("Mono", 9); c.setFillColor(INK)
        c.drawString(col_qty, row_y, f"{qty}")
        c.setFillColor(INK_LT)
        c.drawString(col_un, row_y, un)
        # description head + tail
        c.setFont("Sans-B", 9.5); c.setFillColor(INK)
        c.drawString(col_desc, row_y, head)
        c.setFont("Serif-I", 9); c.setFillColor(INK_MID)
        c.drawString(col_desc, row_y - 12, tail)
        # prices
        c.setFont("Mono", 9); c.setFillColor(INK)
        c.drawRightString(col_up, row_y, money(up))
        c.setFont("Mono-B", 9.5); c.setFillColor(INK)
        c.drawRightString(col_lt, row_y, money(lt))
        # row rule
        hrule(c, tx0, row_y - 18, PAGE_W - M, RULE, 0.3)
        row_y -= 30

    # --- Subtotal + Total ---
    row_y -= 6
    # Subtotal on its own row, label well-left of value
    c.setFont("Sans-B", 8); c.setFillColor(PINE)
    c.drawRightString(col_up, row_y, "SUBTOTAL")
    c.setFont("Mono", 10); c.setFillColor(INK)
    c.drawRightString(col_lt, row_y, money(SUBTOTAL))
    row_y -= 26
    # Total bar — spans well left of col_up so label has its own zone
    bar_x = col_up - 1.35*inch
    c.setFillColor(CREAM)
    c.rect(bar_x, row_y - 10, col_lt - bar_x, 30, stroke=0, fill=1)
    vrule(c, bar_x, row_y - 10, row_y + 20, CONIFER, 3)
    c.setFont("Sans-B", 9); c.setFillColor(CONIFER)
    c.drawString(bar_x + 14, row_y + 5, "BID TOTAL")
    c.setFont("Mono-B", 14); c.setFillColor(INK)
    c.drawRightString(col_lt - 6, row_y + 3, money(TOTAL))

    # --- Alternate: Managed Services ---
    ay = row_y - 56
    kicker(c, tx0, ay, "Alternate · Managed Services", CONIFER, 7)
    hrule(c, tx0, ay - 6, PAGE_W - M, RULE, 0.4)
    # Description on line 1, price on line 2 — keeps them from colliding
    c.setFont("Serif-I", 10); c.setFillColor(INK_MID)
    c.drawString(tx0, ay - 20,
                 "Priced separately. Begins on acceptance. Scope per GCC MSP addendum.")
    c.setFont("Mono", 10); c.setFillColor(INK)
    c.drawRightString(col_lt, ay - 20, f"{money(MSP_MO)} / mo")
    c.setFont("Mono", 9); c.setFillColor(INK_MID)
    c.drawRightString(col_lt, ay - 34, f"{money(MSP_YR)} / yr")

    # --- Exclusions note ---
    ey = ay - 46
    kicker(c, tx0, ey, "Not Included", PINE, 7)
    c.setFont("Sans", 9); c.setFillColor(INK_MID)
    bullets = [
        "Speaker, paging, or classroom audio systems",
        "Existing clock & bell system (retained as-is)",
        "Owner-furnished equipment install beyond terminate-and-test",
        "Core drilling / saw cutting of existing concrete",
        "After-hours or weekend labor unless pre-approved at 1.5×",
    ]
    for i, b in enumerate(bullets):
        c.setFillColor(PINE)
        c.rect(tx0, ey - 16 - i*14 + 2, 2, 2, stroke=0, fill=1)
        c.setFillColor(INK_MID)
        c.drawString(tx0 + 8, ey - 16 - i*14, b)

    footer(c, 2)


def build(out):
    c = canvas.Canvas(out, pagesize=LETTER)
    page_one(c); c.showPage()
    page_two(c); c.showPage()
    c.save()
    print(f"OK: {out}")
    print(f"Size: {os.path.getsize(out):,} bytes")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "showcase.pdf")
    build(out)
