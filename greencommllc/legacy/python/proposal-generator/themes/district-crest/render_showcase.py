"""District Crest — K-12 / public institution audience, navy + gold (2 pages)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _shared_bid_data import *

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Palette — district civic navy + board gold on warm white
WARM    = HexColor("#FDFBF4")
PAPER   = HexColor("#FFFDF6")
NAVY    = HexColor("#132745")
NAVY_MID= HexColor("#2D4872")
GOLD    = HexColor("#B08734")
GOLD_LT = HexColor("#D4B56C")
INK     = HexColor("#1A1A1A")
INK_MID = HexColor("#4A4A4A")
INK_LT  = HexColor("#8F8F8F")
RULE    = HexColor("#D7D2BD")

def _reg(n, f): pdfmetrics.registerFont(TTFont(n, os.path.join(FONT_DIR, f)))
_reg("Serif",   "LibreBaskerville-Regular.ttf")
_reg("Display", "CrimsonPro-Bold.ttf")
_reg("Serif-I", "CrimsonPro-Italic.ttf")
_reg("Sans",    "InstrumentSans-Regular.ttf")
_reg("Sans-B",  "InstrumentSans-Bold.ttf")
_reg("Mono",    "IBMPlexMono-Regular.ttf")
_reg("Mono-B",  "IBMPlexMono-Bold.ttf")

PAGE_W, PAGE_H = LETTER
M = 0.85 * inch

def bg(c):
    c.setFillColor(PAPER); c.rect(0,0,PAGE_W,PAGE_H, stroke=0, fill=1)

def crest_band(c):
    """Navy band at top with gold keyline — the 'district crest' motif."""
    band_h = 0.55*inch
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - band_h, PAGE_W, band_h, stroke=0, fill=1)
    # Gold hairline at bottom of band
    c.setStrokeColor(GOLD); c.setLineWidth(1.3)
    c.line(0, PAGE_H - band_h - 1, PAGE_W, PAGE_H - band_h - 1)
    c.setLineWidth(0.3)
    c.line(0, PAGE_H - band_h - 4, PAGE_W, PAGE_H - band_h - 4)
    # Gold square (crest seal) far right
    c.setFillColor(GOLD)
    c.rect(PAGE_W - M - 18, PAGE_H - band_h + 0.16*inch, 18, 18, stroke=0, fill=1)
    # Inside the band — title
    c.setFont("Sans-B", 7); c.setFillColor(WARM)
    c.drawString(M, PAGE_H - 0.22*inch,
                 "  ".join(list("GREEN COMMUNICATIONS · LOW-VOLTAGE PRACTICE")))
    c.setFont("Mono", 7); c.setFillColor(GOLD_LT)
    c.drawRightString(PAGE_W - M - 28, PAGE_H - 0.22*inch,
                      f"{PROPOSAL_NO}")

def kicker(c, x, y, text, color=GOLD, size=7):
    c.setFont("Sans-B", size); c.setFillColor(color)
    c.drawString(x, y, "  ".join(list(text.upper())))

def hrule(c, x1, y, x2, color=RULE, w=0.4):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def footer(c, page_no):
    y = 0.5*inch
    hrule(c, M, y + 14, PAGE_W - M, NAVY, 0.5)
    hrule(c, M, y + 10, PAGE_W - M, GOLD, 0.25)
    c.setFont("Serif-I", 9); c.setFillColor(INK_MID)
    c.drawString(M, y - 2,
                 "Green Communications Contracting LLC · Kansas City & St. Louis, MO")
    c.setFont("Mono", 8); c.setFillColor(NAVY)
    c.drawRightString(PAGE_W - M, y - 2, f"Page {page_no} of 2")


# ======================================================================
# PAGE 1 — District cover
# ======================================================================
def page_one(c):
    bg(c)
    crest_band(c)

    # --- Title block ---
    y = PAGE_H - 1.25*inch
    kicker(c, M, y, "For the Independence School District Board", GOLD, 8)
    c.setFont("Display", 32); c.setFillColor(NAVY)
    c.drawString(M, y - 44, "William Chrisman High School")
    c.setFont("Serif-I", 15); c.setFillColor(NAVY_MID)
    c.drawString(M, y - 66, "2026 Renovations — Low-Voltage Package")

    # Gold rule + thinner accent
    ry = y - 84
    c.setStrokeColor(GOLD); c.setLineWidth(1.0); c.line(M, ry, M + 2.8*inch, ry)
    c.setLineWidth(0.35); c.line(M, ry - 3, M + 2.8*inch, ry - 3)

    # --- Summary panel (district-ready) ---
    py = ry - 0.4*inch
    kicker(c, M, py, "Summary for the Board", GOLD, 7.5)
    hrule(c, M, py - 6, PAGE_W - M, NAVY, 0.5)

    c.setFont("Serif", 11); c.setFillColor(INK)
    summary_lines = [
        "Green Communications Contracting submits this bid for the low-voltage",
        "package at William Chrisman High School, per ISD solicitation ISD-2026-014.",
        "The work is scheduled to complete inside the summer window, before the",
        "08/17 student return, and is priced in full compliance with Missouri",
        "prevailing-wage requirements for public work.",
    ]
    for i, line in enumerate(summary_lines):
        c.drawString(M, py - 22 - i*16, line)

    # --- Two-column civic fact grid ---
    fx_y = py - 22 - len(summary_lines)*16 - 0.35*inch
    col_w = (PAGE_W - 2*M - 0.3*inch) / 2
    cx1 = M
    cx2 = M + col_w + 0.3*inch

    def fact_card(c, x, y, label, rows):
        # Gold kicker, navy top hairline
        kicker(c, x, y, label, GOLD, 7)
        hrule(c, x, y - 6, x + col_w, NAVY, 0.4)
        for i, (k, v) in enumerate(rows):
            ry = y - 20 - i*16
            c.setFont("Serif-I", 9.5); c.setFillColor(NAVY_MID)
            c.drawString(x, ry, k)
            is_mono = "@" in v or "/" in v or v.startswith("$") or (
                sum(1 for ch in v if ch.isdigit()) >= 3 and k != "Schedule"
            )
            c.setFont("Mono" if is_mono else "Serif", 9 if is_mono else 10)
            c.setFillColor(INK)
            maxw = col_w - 1.25*inch
            while pdfmetrics.stringWidth(v, "Mono" if is_mono else "Serif",
                                         9 if is_mono else 10) > maxw:
                v = v[:-2] + "…"
            c.drawRightString(x + col_w, ry, v)

    fact_card(c, cx1, fx_y, "Of the Client", [
        ("Contractor",  "Straub Construction Co."),
        ("Contact",     "Alan Brooks"),
        ("Title",       "Sr. Project Manager"),
        ("Email",       "abrooks@straub…com"),
        ("Phone",       "+1 913 555 0142"),
    ])
    fact_card(c, cx2, fx_y, "Of the Project", [
        ("Site",        "1223 N Noland Rd."),
        ("City",        "Independence, MO"),
        ("Vertical",    "K-12 · Public Work"),
        ("Bid number",  PROJECT["bid_no"]),
        ("Bid due",     BID_DUE),
    ])
    fact_card(c, cx1, fx_y - 1.6*inch, "Of the Schedule", [
        ("Target start",  PROJECT["start"]),
        ("Target finish", PROJECT["finish"]),
        ("Window",        "10 summer weeks"),
        ("Validity",      "60 days"),
        ("Compliance",    "Prevailing-wage"),
    ])
    fact_card(c, cx2, fx_y - 1.6*inch, "Of the Figure", [
        ("Scope lines",   "6"),
        ("Subtotal",      money(SUBTOTAL)),
        ("Bid total",     money(TOTAL)),
        ("MSP (alt)",     f"{money(MSP_MO)} / mo"),
        ("Discount",      "—"),
    ])

    # --- Bid total bar (board-packet style) ---
    by2 = fx_y - 3.25*inch
    c.setFillColor(NAVY)
    c.rect(M, by2 - 0.6*inch, PAGE_W - 2*M, 0.6*inch, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.rect(M, by2 - 0.64*inch, PAGE_W - 2*M, 0.04*inch, stroke=0, fill=1)
    c.setFont("Sans-B", 8); c.setFillColor(GOLD_LT)
    c.drawString(M + 14, by2 - 18, "  ".join(list("BID TOTAL · HELD FIRM 60 DAYS")))
    c.setFont("Display", 28); c.setFillColor(WARM)
    c.drawRightString(PAGE_W - M - 14, by2 - 28, money(TOTAL))

    # --- Signatures prepared/approved (compact) ---
    sy = 1.1*inch
    for i, (label, name, title) in enumerate([
        ("Prepared By", PREPARED_BY[0], PREPARED_BY[1]),
        ("Approved By", APPROVED_BY[0], APPROVED_BY[1]),
    ]):
        sx = M + i * ((PAGE_W - 2*M)/2 + 0.15*inch)
        kicker(c, sx, sy + 0.6*inch, label, GOLD, 7)
        hrule(c, sx, sy + 0.35*inch, sx + (PAGE_W - 2*M)/2 - 0.15*inch, NAVY, 0.5)
        c.setFont("Serif", 12); c.setFillColor(NAVY)
        c.drawString(sx, sy + 0.18*inch, name)
        c.setFont("Serif-I", 10); c.setFillColor(INK_MID)
        c.drawString(sx, sy + 0.04*inch, title)

    footer(c, 1)


# ======================================================================
# PAGE 2 — Scope (packet-ready)
# ======================================================================
def page_two(c):
    bg(c)
    crest_band(c)

    y = PAGE_H - 1.25*inch
    kicker(c, M, y, "Article II · Scope of Work", GOLD, 7.5)
    c.setFont("Display", 26); c.setFillColor(NAVY)
    c.drawString(M, y - 36, "Scope & Pricing.")
    c.setFont("Serif-I", 11); c.setFillColor(INK_MID)
    c.drawString(M, y - 54,
                 "Priced to the bid documents dated 12 March 2026, inclusive of prevailing-wage compliance.")
    c.setStrokeColor(GOLD); c.setLineWidth(1.0); c.line(M, y - 70, M + 4.5*inch, y - 70)
    c.setLineWidth(0.3); c.line(M, y - 73, M + 4.5*inch, y - 73)

    # Table
    tx0 = M
    col_qty  = tx0
    col_un   = tx0 + 0.42*inch
    col_desc = tx0 + 0.85*inch
    col_up   = PAGE_W - M - 1.55*inch
    col_lt   = PAGE_W - M

    yh = y - 96
    c.setFont("Sans-B", 6.5); c.setFillColor(NAVY)
    c.drawString(col_qty,  yh, "QTY")
    c.drawString(col_un,   yh, "UN")
    c.drawString(col_desc, yh, "DESCRIPTION")
    c.drawRightString(col_up, yh, "UNIT PRICE")
    c.drawRightString(col_lt, yh, "LINE TOTAL")
    hrule(c, tx0, yh - 6, PAGE_W - M, NAVY, 0.7)
    hrule(c, tx0, yh - 9, PAGE_W - M, GOLD, 0.3)

    row_y = yh - 26
    for (qty, un, head, tail, up, lt) in SCOPE:
        c.setFont("Mono", 9); c.setFillColor(INK)
        c.drawString(col_qty, row_y, f"{qty}")
        c.setFillColor(INK_LT); c.drawString(col_un, row_y, un)
        c.setFont("Serif", 10); c.setFillColor(NAVY)
        c.drawString(col_desc, row_y, head)
        c.setFont("Serif-I", 9.5); c.setFillColor(INK_MID)
        c.drawString(col_desc, row_y - 12, tail)
        c.setFont("Mono", 9); c.setFillColor(INK_MID)
        c.drawRightString(col_up, row_y, money(up))
        c.setFont("Mono-B", 9.5); c.setFillColor(NAVY)
        c.drawRightString(col_lt, row_y, money(lt))
        hrule(c, tx0, row_y - 18, PAGE_W - M, RULE, 0.25)
        row_y -= 30

    # Subtotal
    row_y -= 6
    c.setFont("Sans-B", 8); c.setFillColor(GOLD)
    c.drawRightString(col_up, row_y, "SUBTOTAL")
    c.setFont("Mono", 10); c.setFillColor(INK)
    c.drawRightString(col_lt, row_y, money(SUBTOTAL))

    # Total — navy bar across right portion
    row_y -= 28
    bar_x = col_up - 1.4*inch
    c.setFillColor(NAVY)
    c.rect(bar_x, row_y - 14, col_lt - bar_x, 36, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.rect(bar_x, row_y - 18, col_lt - bar_x, 3, stroke=0, fill=1)
    c.setFont("Sans-B", 9); c.setFillColor(GOLD_LT)
    c.drawString(bar_x + 14, row_y + 6, "BID TOTAL")
    c.setFont("Display", 18); c.setFillColor(WARM)
    c.drawRightString(col_lt - 10, row_y + 2, money(TOTAL))

    # Alternate + exclusions side-by-side
    ay = row_y - 74
    # Alternate (left)
    al_w = 3.4*inch
    kicker(c, M, ay, "Alternate · Managed Services", GOLD, 7)
    hrule(c, M, ay - 6, M + al_w, NAVY, 0.4)
    c.setFont("Serif", 10); c.setFillColor(INK)
    c.drawString(M, ay - 20,
                 "Monthly service offering, commencing on acceptance.")
    c.setFont("Serif-I", 9.5); c.setFillColor(INK_MID)
    c.drawString(M, ay - 34, "Monitoring · MAC allowance · warranty admin.")
    c.setFont("Mono-B", 11); c.setFillColor(NAVY)
    c.drawString(M, ay - 54, f"{money(MSP_MO)} / mo")
    c.setFont("Mono", 9); c.setFillColor(INK_MID)
    c.drawString(M + 1.2*inch, ay - 54, f"· {money(MSP_YR)} / yr")

    # Exclusions (right)
    ex_x = M + al_w + 0.3*inch
    kicker(c, ex_x, ay, "Not Included", GOLD, 7)
    hrule(c, ex_x, ay - 6, PAGE_W - M, NAVY, 0.4)
    c.setFont("Serif", 9.5); c.setFillColor(INK)
    excl = [
        "Speaker, paging, classroom audio",
        "Existing clock & bell system",
        "Owner-furnished install beyond T&T",
        "Core drilling / saw cutting concrete",
        "After-hours labor unless pre-approved 1.5×",
    ]
    for i, t in enumerate(excl):
        c.setFillColor(GOLD); c.rect(ex_x, ay - 20 - i*13 + 3, 2.5, 2.5, stroke=0, fill=1)
        c.setFillColor(INK_MID)
        c.drawString(ex_x + 8, ay - 20 - i*13, t)

    # Compliance tag at bottom (district-ready)
    comp_y = 1.0*inch
    c.setFillColor(WARM)
    c.rect(M, comp_y, PAGE_W - 2*M, 0.45*inch, stroke=0, fill=1)
    c.setStrokeColor(GOLD); c.setLineWidth(0.5)
    c.rect(M, comp_y, PAGE_W - 2*M, 0.45*inch, stroke=1, fill=0)
    kicker(c, M + 12, comp_y + 22, "Board-ready · Prevailing wage · Summer window", NAVY, 7)
    c.setFont("Serif-I", 9.5); c.setFillColor(INK_MID)
    c.drawString(M + 12, comp_y + 8,
                 "Licensed in Missouri.  COI with ISD and Straub available on request.  Pricing firm 60 days.")

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
