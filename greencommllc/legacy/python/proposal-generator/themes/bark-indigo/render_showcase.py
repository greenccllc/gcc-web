"""Bark & Indigo — ledger-folio, navy + walnut on oyster paper (2 pages)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _shared_bid_data import *

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Palette — dusted-navy & walnut on oyster cream
OYSTER  = HexColor("#F1EBDC")
PAPER   = HexColor("#F7F2E3")
INDIGO  = HexColor("#1B2B48")
INDIGO_MID = HexColor("#384E71")
WALNUT  = HexColor("#6B4A2E")
WALNUT_DEEP = HexColor("#4A3220")
INK     = HexColor("#1E1A14")
INK_MID = HexColor("#4F4738")
INK_LT  = HexColor("#8D836F")
RULE    = HexColor("#C8BDA2")

def _reg(n, f): pdfmetrics.registerFont(TTFont(n, os.path.join(FONT_DIR, f)))
_reg("Display", "LibreBaskerville-Regular.ttf")
_reg("Serif",   "CrimsonPro-Regular.ttf")
_reg("Serif-B", "CrimsonPro-Bold.ttf")
_reg("Serif-I", "CrimsonPro-Italic.ttf")
_reg("Sans",    "InstrumentSans-Regular.ttf")
_reg("Sans-B",  "InstrumentSans-Bold.ttf")
_reg("Mono",    "IBMPlexMono-Regular.ttf")
_reg("Mono-B",  "IBMPlexMono-Bold.ttf")

PAGE_W, PAGE_H = LETTER
M = 0.85 * inch      # generous margins for folio feel

def bg(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

def folio_border(c):
    """Indigo hairline border inside margin — the bound-folio frame."""
    inset = 0.55*inch
    c.setStrokeColor(INDIGO); c.setLineWidth(0.5)
    c.rect(inset, inset, PAGE_W - 2*inset, PAGE_H - 2*inset, stroke=1, fill=0)
    # double inner rule at the top (folio motif)
    c.setLineWidth(0.3)
    c.line(inset + 0.12*inch, PAGE_H - inset - 0.12*inch,
           PAGE_W - inset - 0.12*inch, PAGE_H - inset - 0.12*inch)

def kicker(c, x, y, text, color=WALNUT, size=7.5):
    c.setFont("Sans-B", size); c.setFillColor(color)
    out = "  ".join(list(text.upper()))
    c.drawString(x, y, out)

def wbracket(c, x, y, w=12, h=14, color=INDIGO, lw=0.9):
    """Small indigo bracket — for flagging a total."""
    c.setStrokeColor(color); c.setLineWidth(lw)
    c.line(x, y, x, y + h)
    c.line(x, y, x + w, y)
    c.line(x, y + h, x + w, y + h)

def hrule(c, x1, y, x2, color=RULE, w=0.4):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def header(c, page_no):
    y = PAGE_H - M + 0.12*inch
    c.setFont("Sans-B", 6.5); c.setFillColor(INDIGO)
    kicker_text = "  ".join(list("GREEN COMMUNICATIONS · LOW-VOLTAGE PRACTICE"))
    c.drawString(M, y, kicker_text)
    c.setFont("Mono", 7); c.setFillColor(WALNUT_DEEP)
    c.drawRightString(PAGE_W - M, y, f"{PROPOSAL_NO}  ·  Folio {page_no:02d} of 02")

def footer(c, page_no):
    y = M - 0.35*inch
    hrule(c, M, y + 14, PAGE_W - M, RULE, 0.3)
    c.setFont("Serif-I", 9); c.setFillColor(INK_MID)
    c.drawString(M, y, "Green Communications Contracting LLC  ·  Established 2020  ·  Missouri")
    c.setFont("Mono", 8); c.setFillColor(WALNUT)
    c.drawRightString(PAGE_W - M, y, f"— {page_no} —")


# ======================================================================
# PAGE 1 — Folio cover
# ======================================================================
def page_one(c):
    bg(c)
    folio_border(c)
    header(c, 1)

    # Monogram band — small indigo square top-left of content
    cx = M + 0.05*inch
    c.setFillColor(INDIGO); c.rect(cx, PAGE_H - M - 0.15*inch - 10, 10, 10, stroke=0, fill=1)
    c.setFont("Sans-B", 7.5); c.setFillColor(INDIGO)
    c.drawString(cx + 18, PAGE_H - M - 0.15*inch - 4,
                 "  ".join(list("FORMAL BID · SEALED · HELD 60 DAYS")))

    # Title — big, lowercase-styled display serif
    y = PAGE_H - M - 1.0*inch
    c.setFont("Display", 40); c.setFillColor(INDIGO)
    c.drawString(M, y, "William Chrisman")
    c.setFont("Display", 40); c.setFillColor(INDIGO_MID)
    c.drawString(M, y - 44, "High School.")

    # Italic subtitle
    c.setFont("Serif-I", 17); c.setFillColor(WALNUT_DEEP)
    c.drawString(M, y - 72, "2026 Renovations  —  Low-Voltage Package")

    # Walnut rule
    ry = y - 92
    c.setStrokeColor(WALNUT); c.setLineWidth(1.3)
    c.line(M, ry, M + 2.6*inch, ry)
    c.setLineWidth(0.4)
    c.line(M, ry - 3, M + 2.6*inch, ry - 3)

    # Body — prose-led summary
    by = ry - 0.5*inch
    c.setFont("Serif", 11.5); c.setFillColor(INK)
    prose_lines = [
        "Green Communications Contracting respectfully submits this bid",
        "for the low-voltage package at William Chrisman High School,",
        "per the Independence School District solicitation ISD-2026-014.",
        "Pricing is held firm through 07 July 2026 and reflects the ten-",
        "week summer window of 09 June through 15 August 2026.",
    ]
    for i, line in enumerate(prose_lines):
        c.drawString(M, by - i*17, line)

    # Counterparty block — set as a letter heading
    py = by - len(prose_lines)*17 - 0.55*inch
    kicker(c, M, py, "Addressed To", WALNUT, 7)
    c.setFont("Display", 14); c.setFillColor(INDIGO)
    c.drawString(M, py - 20, CLIENT["name"])
    c.setFont("Serif", 11); c.setFillColor(INK)
    c.drawString(M, py - 38, f'{CLIENT["contact"]},  {CLIENT["title"]}')
    c.setFont("Mono", 9); c.setFillColor(WALNUT_DEEP)
    c.drawString(M, py - 54, CLIENT["email"])
    c.setFont("Mono", 9); c.setFillColor(INK_MID)
    c.drawString(M, py - 68, CLIENT["phone"])

    # Summary panel on the right — small indigo bracket framing the total
    sx = PAGE_W - M - 2.6*inch
    sy = py
    kicker(c, sx, sy, "Of Record", WALNUT, 7)
    hrule(c, sx, sy - 6, PAGE_W - M, RULE, 0.3)

    rows = [
        ("Proposal no.",  PROPOSAL_NO),
        ("Issued",        ISSUE_DATE),
        ("Bid due",       BID_DUE),
        ("Bid number",    PROJECT["bid_no"]),
        ("Schedule",      f'{PROJECT["start"]} → {PROJECT["finish"]}'),
        ("Site",          "Independence, MO"),
    ]
    for i, (k, v) in enumerate(rows):
        ry = sy - 20 - i*15
        c.setFont("Serif", 9.5); c.setFillColor(INK_MID)
        c.drawString(sx, ry, k)
        c.setFont("Mono", 9); c.setFillColor(INK)
        c.drawRightString(PAGE_W - M, ry, v)

    # Total with indigo bracket
    ty = sy - 20 - len(rows)*15 - 0.25*inch
    wbracket(c, sx - 8, ty - 6, 10, 30, INDIGO, 1.2)
    c.setFont("Sans-B", 7); c.setFillColor(WALNUT)
    c.drawString(sx + 8, ty + 14, "  ".join(list("BID TOTAL")))
    c.setFont("Serif-B", 22); c.setFillColor(INDIGO)
    c.drawRightString(PAGE_W - M, ty - 4, money(TOTAL))
    c.setFont("Serif-I", 9); c.setFillColor(INK_MID)
    c.drawRightString(PAGE_W - M, ty - 18, "Held firm 60 days from issue")

    # Signature line (preparer) — bottom-left
    sig_y = M + 0.25*inch
    c.setStrokeColor(WALNUT); c.setLineWidth(0.5)
    c.line(M, sig_y + 0.55*inch, M + 2.2*inch, sig_y + 0.55*inch)
    c.setFont("Display", 12); c.setFillColor(INDIGO)
    c.drawString(M, sig_y + 0.35*inch, PREPARED_BY[0])
    c.setFont("Serif-I", 10); c.setFillColor(WALNUT_DEEP)
    c.drawString(M, sig_y + 0.20*inch, PREPARED_BY[1])
    c.setFont("Mono", 8); c.setFillColor(INK_MID)
    c.drawString(M, sig_y + 0.05*inch, f"{PREPARED_BY[2]}  ·  {PREPARED_BY[3]}")

    footer(c, 1)


# ======================================================================
# PAGE 2 — Folio scope
# ======================================================================
def page_two(c):
    bg(c)
    folio_border(c)
    header(c, 2)

    y = PAGE_H - M - 0.4*inch
    kicker(c, M, y, "Article II", WALNUT)
    c.setFont("Display", 28); c.setFillColor(INDIGO)
    c.drawString(M, y - 36, "Of the Work.")
    c.setFont("Serif-I", 12); c.setFillColor(WALNUT_DEEP)
    c.drawString(M, y - 58,
                 "Unit pricing and extended totals per bid documents dated 12 March 2026.")

    # Walnut double rule
    ry = y - 76
    c.setStrokeColor(WALNUT); c.setLineWidth(1.0); c.line(M, ry, PAGE_W - M, ry)
    c.setLineWidth(0.3); c.line(M, ry - 3, PAGE_W - M, ry - 3)

    # Table — single-column narrative with right-aligned figures
    tx0 = M
    col_up = PAGE_W - M - 1.45*inch
    col_lt = PAGE_W - M

    yh = ry - 22
    c.setFont("Sans-B", 6.5); c.setFillColor(WALNUT)
    c.drawString(tx0, yh, "  ".join(list("ITEM")))
    c.drawRightString(col_up, yh, "  ".join(list("UNIT")))
    c.drawRightString(col_lt, yh, "  ".join(list("EXTENDED")))
    hrule(c, tx0, yh - 6, PAGE_W - M, INDIGO, 0.5)

    row_y = yh - 22
    for i, (qty, un, head, tail, up, lt) in enumerate(SCOPE):
        # roman numeral + head
        roman = ["i.", "ii.", "iii.", "iv.", "v.", "vi."][i]
        c.setFont("Serif-I", 10); c.setFillColor(WALNUT)
        c.drawString(tx0, row_y, roman)
        c.setFont("Serif-B", 11); c.setFillColor(INDIGO)
        c.drawString(tx0 + 0.3*inch, row_y, head)
        c.setFont("Serif-I", 10); c.setFillColor(INK_MID)
        qty_str = f"  —  {qty} {un}.  {tail}"
        c.drawString(tx0 + 0.3*inch + pdfmetrics.stringWidth(head, "Serif-B", 11), row_y, qty_str)
        # prices
        c.setFont("Mono", 9); c.setFillColor(INK_MID)
        c.drawRightString(col_up, row_y, money(up))
        c.setFont("Mono-B", 10); c.setFillColor(INDIGO)
        c.drawRightString(col_lt, row_y, money(lt))
        # row rule
        hrule(c, tx0, row_y - 10, PAGE_W - M, RULE, 0.25)
        row_y -= 28

    # Subtotal + total — with indigo bracket around the total
    row_y -= 8
    c.setFont("Sans-B", 7.5); c.setFillColor(WALNUT)
    c.drawRightString(col_up, row_y, "  ".join(list("SUBTOTAL")))
    c.setFont("Mono", 10); c.setFillColor(INK)
    c.drawRightString(col_lt, row_y, money(SUBTOTAL))
    # Bid total
    row_y -= 28
    wbracket(c, col_up - 1.2*inch - 8, row_y - 8, 10, 30, INDIGO, 1.2)
    c.setFont("Sans-B", 8); c.setFillColor(WALNUT)
    c.drawString(col_up - 1.2*inch + 8, row_y + 14, "  ".join(list("BID TOTAL")))
    c.setFont("Serif-B", 20); c.setFillColor(INDIGO)
    c.drawRightString(col_lt, row_y, money(TOTAL))

    # Alternate
    ay = row_y - 58
    kicker(c, tx0, ay, "Alternate · Managed Services", WALNUT)
    hrule(c, tx0, ay - 6, PAGE_W - M, RULE, 0.3)
    c.setFont("Serif", 10.5); c.setFillColor(INK_MID)
    c.drawString(tx0, ay - 22,
                 "Monthly service offering, priced separately and commencing upon acceptance.")
    c.setFont("Mono-B", 11); c.setFillColor(INDIGO)
    c.drawRightString(col_lt, ay - 22, f"{money(MSP_MO)} / mo")
    c.setFont("Mono", 9); c.setFillColor(INK_MID)
    c.drawRightString(col_lt, ay - 36, f"{money(MSP_YR)} / yr")

    # Terms of record — ultra-compact
    ty = ay - 70
    kicker(c, tx0, ty, "Of Terms", WALNUT)
    hrule(c, tx0, ty - 6, PAGE_W - M, RULE, 0.3)
    terms = [
        ("Payment",   "Net 30 from invoice, per general contract terms."),
        ("Deposit",   "Per GC payment schedule."),
        ("Insurance", "GL $2M · Auto $1M · WC $1M.  COI with ISD & Straub on request."),
        ("Licensure", "Licensed in Missouri.  Prevailing-wage compliant."),
    ]
    for i, (k, v) in enumerate(terms):
        ly = ty - 20 - i*14
        c.setFont("Serif-B", 10); c.setFillColor(WALNUT_DEEP)
        c.drawString(tx0, ly, k + ".")
        c.setFont("Serif", 10); c.setFillColor(INK)
        c.drawString(tx0 + 0.85*inch, ly, v)

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
