"""Bone Editorial — warm magazine aesthetic, beige + ember orange (2 pages)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _shared_bid_data import *

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Palette — bone cream, warm taupe, camel, ember accent
BONE    = HexColor("#F3ECDE")
PAPER   = HexColor("#F9F2E4")
TAUPE   = HexColor("#8E8069")
CAMEL   = HexColor("#B38A5E")
EMBER   = HexColor("#C55A2D")
EMBER_DEEP = HexColor("#8E3D18")
INK     = HexColor("#2A241A")
INK_MID = HexColor("#5A4F3E")
INK_LT  = HexColor("#9A8E77")
RULE    = HexColor("#D9CDB5")

def _reg(n, f): pdfmetrics.registerFont(TTFont(n, os.path.join(FONT_DIR, f)))
_reg("Display",   "Gloock-Regular.ttf")
_reg("Serif",     "Lora-Regular.ttf")
_reg("Serif-B",   "Lora-Bold.ttf")
_reg("Serif-I",   "Lora-Italic.ttf")
_reg("Sans",      "InstrumentSans-Regular.ttf")
_reg("Sans-B",    "InstrumentSans-Bold.ttf")
_reg("SerifMono", "IBMPlexSerif-Regular.ttf")
_reg("SerifMonoB","IBMPlexSerif-Bold.ttf")

PAGE_W, PAGE_H = LETTER
M = 1.0 * inch        # magazine margins

def bg(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

def kicker(c, x, y, text, color=CAMEL, size=7):
    c.setFont("Sans-B", size); c.setFillColor(color)
    out = "  ".join(list(text.upper()))
    c.drawString(x, y, out)

def hrule(c, x1, y, x2, color=RULE, w=0.4):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def header(c, page_no, label):
    y = PAGE_H - 0.55*inch
    c.setFont("Sans-B", 6.5); c.setFillColor(CAMEL)
    c.drawString(M, y, "  ".join(list("GCC · NO. 01 · BONE EDITORIAL")))
    c.setFont("Serif-I", 8.5); c.setFillColor(INK_MID)
    c.drawCentredString(PAGE_W/2, y, label)
    c.setFont("SerifMono", 8.5); c.setFillColor(INK)
    c.drawRightString(PAGE_W - M, y, f"PAGE {page_no:02d}")
    hrule(c, M, y - 5, PAGE_W - M, RULE, 0.3)

def footer(c, page_no):
    y = 0.55*inch
    hrule(c, M, y + 10, PAGE_W - M, RULE, 0.3)
    c.setFont("Serif-I", 8.5); c.setFillColor(INK_MID)
    c.drawCentredString(PAGE_W/2, y, "Green Communications Contracting  ·  Kansas City · St. Louis")


# ======================================================================
# PAGE 1 — Editorial cover
# ======================================================================
def page_one(c):
    bg(c)
    header(c, 1, "Feature — Proposal No. GCC-2026-0101")

    # Large kicker
    y = PAGE_H - M - 0.4*inch
    kicker(c, M, y, "A Bid · Sealed · Held Sixty Days", EMBER, 8)

    # Editorial title — very large display serif, lowercase phrasing
    y2 = y - 0.5*inch
    c.setFont("Display", 58); c.setFillColor(INK)
    c.drawString(M, y2, "William")
    c.setFont("Display", 58); c.setFillColor(INK)
    c.drawString(M, y2 - 60, "Chrisman.")
    # italic subtitle as kind of "tagline"
    c.setFont("Serif-I", 16); c.setFillColor(EMBER_DEEP)
    c.drawString(M, y2 - 90, "A 2026 low-voltage renovation, in brief.")

    # Camel underline
    uy = y2 - 108
    c.setStrokeColor(CAMEL); c.setLineWidth(1.1)
    c.line(M, uy, M + 3.2*inch, uy)

    # --- Two-column body prose ---
    by = uy - 0.55*inch
    col_w = (PAGE_W - 2*M - 0.4*inch) / 2
    cx1 = M
    cx2 = M + col_w + 0.4*inch

    # Drop cap
    c.setFont("Display", 58); c.setFillColor(EMBER)
    c.drawString(cx1, by - 40, "G")

    # Left column prose
    c.setFont("Serif", 11); c.setFillColor(INK)
    left_lines = [
        "reen Communications Contracting,",
        "a Missouri firm established in",
        "2020, submits this bid for the",
        "low-voltage package at William",
        "Chrisman High School in",
        "Independence. The work covers",
        "structured cabling, fiber, IP",
        "video rough-in, and access-",
        "control infrastructure across",
        "two academic wings and the",
        "competition gym, on a ten-week",
        "summer calendar.",
    ]
    # first line runs around the drop cap
    c.drawString(cx1 + 0.55*inch, by - 20, left_lines[0])
    for i, line in enumerate(left_lines[1:]):
        y_line = by - 38 - i*15
        if i < 2:
            c.drawString(cx1 + 0.55*inch, y_line, line)
        else:
            c.drawString(cx1, y_line, line)

    # Right column — facts rendered as an editorial "stat card" list
    kicker(c, cx2, by, "The Particulars", EMBER, 7)
    hrule(c, cx2, by - 6, cx2 + col_w, RULE, 0.3)
    facts = [
        ("Client",     CLIENT["name"]),
        ("Contact",    f'{CLIENT["contact"]} — {CLIENT["title"]}'),
        ("Email",      CLIENT["email"]),
        ("Phone",      CLIENT["phone"]),
        ("Bid number", PROJECT["bid_no"]),
        ("Due",        BID_DUE),
        ("Schedule",   f'{PROJECT["start"]} — {PROJECT["finish"]}'),
        ("Validity",   VALIDITY),
    ]
    for i, (k, v) in enumerate(facts):
        ry = by - 20 - i*18
        c.setFont("Serif-I", 10); c.setFillColor(CAMEL)
        c.drawString(cx2, ry, k)
        # chose serif for names/phrases, serif-mono for codes/email
        is_mono = "@" in v or any(ch.isdigit() for ch in v)
        c.setFont("SerifMono" if is_mono else "Serif", 9.5 if is_mono else 10)
        c.setFillColor(INK)
        # truncate if needed
        maxw = col_w
        while pdfmetrics.stringWidth(v, "SerifMono" if is_mono else "Serif",
                                     9.5 if is_mono else 10) > maxw:
            v = v[:-2] + "…"
        c.drawString(cx2, ry - 12, v)

    # Total strip — full-width, ember-underlined
    ty = by - len(facts)*18 - 0.75*inch
    kicker(c, M, ty, "The Figure", EMBER_DEEP, 8)
    c.setStrokeColor(CAMEL); c.setLineWidth(0.6); c.line(M, ty - 5, PAGE_W - M, ty - 5)
    # Italic tagline above the big number (not beside it — avoids overlap)
    c.setFont("Serif-I", 12); c.setFillColor(INK_MID)
    c.drawString(M, ty - 24, "Six itemized lines.  Pricing firm sixty days.")
    # Big figure (baseline at ty - 68)
    c.setFont("Display", 44); c.setFillColor(INK)
    c.drawString(M, ty - 68, money(TOTAL))
    # MSP aside on its own line, clearly below the figure
    c.setFont("Serif-I", 10); c.setFillColor(INK_MID)
    c.drawString(M, ty - 90,
                 f"Managed services, offered separately — {money(MSP_MO)} / mo.")

    # Signature (italic) bottom-left
    sy = M
    c.setStrokeColor(EMBER); c.setLineWidth(0.5)
    c.line(M, sy + 0.5*inch, M + 2.0*inch, sy + 0.5*inch)
    c.setFont("Display", 13); c.setFillColor(INK)
    c.drawString(M, sy + 0.3*inch, PREPARED_BY[0])
    c.setFont("Serif-I", 10); c.setFillColor(EMBER_DEEP)
    c.drawString(M, sy + 0.15*inch, PREPARED_BY[1])

    footer(c, 1)


# ======================================================================
# PAGE 2 — Editorial scope
# ======================================================================
def page_two(c):
    bg(c)
    header(c, 2, "Feature — Of the Work")

    y = PAGE_H - M - 0.3*inch
    kicker(c, M, y, "II  ·  The Scope, Itemized", EMBER, 7)
    c.setFont("Display", 38); c.setFillColor(INK)
    c.drawString(M, y - 42, "Of the work.")
    c.setFont("Serif-I", 12); c.setFillColor(INK_MID)
    c.drawString(M, y - 64,
                 "Six lines, priced to the document set of 12 March 2026.")
    # camel underline
    c.setStrokeColor(CAMEL); c.setLineWidth(1.0)
    c.line(M, y - 78, M + 4.5*inch, y - 78)

    # Scope as editorial list — each item a small stacked card
    col_lt = PAGE_W - M
    col_up = PAGE_W - M - 1.45*inch

    yh = y - 102
    c.setFont("Sans-B", 6.5); c.setFillColor(CAMEL)
    c.drawString(M, yh, "  ".join(list("ITEM")))
    c.drawRightString(col_up, yh, "  ".join(list("UNIT")))
    c.drawRightString(col_lt, yh, "  ".join(list("LINE TOTAL")))
    hrule(c, M, yh - 5, PAGE_W - M, INK, 0.5)

    row_y = yh - 26
    for i, (qty, un, head, tail, up, lt) in enumerate(SCOPE):
        # ordinal
        c.setFont("Display", 18); c.setFillColor(EMBER)
        c.drawString(M, row_y - 2, f"{i+1:02d}")
        # head
        c.setFont("Serif-B", 12); c.setFillColor(INK)
        c.drawString(M + 0.5*inch, row_y, head)
        c.setFont("Serif-I", 10.5); c.setFillColor(INK_MID)
        c.drawString(M + 0.5*inch, row_y - 14, f"{qty} {un}.  {tail}")
        # right-aligned prices
        c.setFont("SerifMono", 10); c.setFillColor(INK_MID)
        c.drawRightString(col_up, row_y, money(up))
        c.setFont("SerifMonoB", 11); c.setFillColor(INK)
        c.drawRightString(col_lt, row_y, money(lt))
        hrule(c, M, row_y - 22, PAGE_W - M, RULE, 0.25)
        row_y -= 38

    # Subtotal + Total — editorial "standfirst"
    row_y -= 2
    c.setFont("Serif-I", 10.5); c.setFillColor(INK_MID)
    c.drawRightString(col_up, row_y, "Subtotal")
    c.setFont("SerifMono", 10); c.setFillColor(INK)
    c.drawRightString(col_lt, row_y, money(SUBTOTAL))
    row_y -= 26
    # ember block with total
    c.setFillColor(BONE); c.rect(M, row_y - 18, PAGE_W - 2*M, 38, stroke=0, fill=1)
    c.setStrokeColor(EMBER); c.setLineWidth(1.2); c.line(M, row_y + 20, M, row_y - 18)
    c.setFont("Sans-B", 8); c.setFillColor(EMBER_DEEP)
    c.drawString(M + 14, row_y + 5, "  ".join(list("THE FIGURE IN FULL")))
    c.setFont("Display", 22); c.setFillColor(INK)
    c.drawRightString(PAGE_W - M - 10, row_y - 4, money(TOTAL))

    # Alternate — as an editorial aside
    ay = row_y - 60
    kicker(c, M, ay, "An aside · Managed Services", EMBER, 7)
    hrule(c, M, ay - 6, PAGE_W - M, RULE, 0.3)
    c.setFont("Serif-I", 11); c.setFillColor(INK)
    c.drawString(M, ay - 22,
                 "Priced separately — monitoring and warranty administration.")
    c.setFont("SerifMonoB", 11); c.setFillColor(EMBER_DEEP)
    c.drawRightString(col_lt, ay - 22, f"{money(MSP_MO)} / mo")

    # Exclusions
    ey = ay - 48
    kicker(c, M, ey, "Not Included", CAMEL, 7)
    hrule(c, M, ey - 6, PAGE_W - M, RULE, 0.3)
    c.setFont("Serif", 10.5); c.setFillColor(INK_MID)
    excl = [
        "Speaker, paging, or classroom audio systems.",
        "Existing clock & bell system (retained as-is).",
        "Owner-furnished equipment install beyond terminate-and-test.",
        "Core drilling or saw cutting of existing concrete.",
        "After-hours or weekend labor unless pre-approved at 1.5×.",
    ]
    for i, t in enumerate(excl):
        c.setFillColor(EMBER); c.setFont("Serif-B", 10.5)
        c.drawString(M, ey - 22 - i*15, "¶")
        c.setFillColor(INK); c.setFont("Serif", 10.5)
        c.drawString(M + 14, ey - 22 - i*15, t)

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
