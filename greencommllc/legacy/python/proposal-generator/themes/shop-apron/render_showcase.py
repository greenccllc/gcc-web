"""Shop Apron — plainspoken tradesman humor. Canvas tan, safety orange, masking-tape yellow."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _shared_bid_data import *

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Palette — canvas-apron tan, safety orange, masking-tape yellow, ink
CANVAS  = HexColor("#E8DCC0")
PAPER   = HexColor("#F4EAD1")
DARK    = HexColor("#16140F")
INK     = HexColor("#1D1A14")
INK_MID = HexColor("#47432F")
INK_LT  = HexColor("#8F8569")
ORANGE  = HexColor("#E75B1E")
ORANGE_DP = HexColor("#B24113")
TAPE    = HexColor("#F4D35E")     # masking-tape yellow
TAPE_LT = HexColor("#F9E49E")
RULE    = HexColor("#C8BC9C")

def _reg(n, f): pdfmetrics.registerFont(TTFont(n, os.path.join(FONT_DIR, f)))
_reg("Cond",     "BigShoulders-Bold.ttf")
_reg("Cond-R",   "BigShoulders-Regular.ttf")
_reg("Serif",    "Lora-Regular.ttf")
_reg("Serif-B",  "Lora-Bold.ttf")
_reg("Serif-I",  "Lora-Italic.ttf")
_reg("Sans",     "WorkSans-Regular.ttf")
_reg("Sans-B",   "WorkSans-Bold.ttf")
_reg("Mono",     "GeistMono-Regular.ttf")
_reg("Mono-B",   "GeistMono-Bold.ttf")

PAGE_W, PAGE_H = LETTER
M = 0.7 * inch

def bg(c):
    c.setFillColor(PAPER); c.rect(0,0,PAGE_W,PAGE_H, stroke=0, fill=1)

def tape_label(c, x, y, text, w=None, color=TAPE, size=8):
    """Draw a piece of 'masking tape' with a kicker label."""
    if w is None:
        w = pdfmetrics.stringWidth(text.upper(), "Sans-B", size) + 16
    h = 16
    # tape body with slight rounding by drawing two rects offset
    c.setFillColor(color)
    c.rect(x, y, w, h, stroke=0, fill=1)
    # tiny torn edges (darker corners)
    c.setFillColor(HexColor("#E6C14E"))
    c.rect(x, y, 3, h, stroke=0, fill=1)
    c.rect(x + w - 3, y, 3, h, stroke=0, fill=1)
    # label
    c.setFont("Sans-B", size); c.setFillColor(DARK)
    c.drawString(x + 8, y + 4, text.upper())
    return x + w

def hrule(c, x1, y, x2, color=RULE, w=0.4):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def orange_spine(c, x, y1, y2, w=3.5):
    c.setStrokeColor(ORANGE); c.setLineWidth(w); c.line(x, y1, x, y2)

def header(c, page_no, label):
    y = PAGE_H - 0.45*inch
    c.setFont("Sans-B", 7.5); c.setFillColor(ORANGE_DP)
    c.drawString(M, y, "GCC  ·  SHOP APRON  ·  LOW-VOLTAGE")
    c.setFont("Serif-I", 9); c.setFillColor(INK_MID)
    c.drawCentredString(PAGE_W/2, y, label)
    c.setFont("Mono", 8); c.setFillColor(INK)
    c.drawRightString(PAGE_W - M, y, f"{PROPOSAL_NO}   —   {page_no} of 2")
    hrule(c, M, y - 5, PAGE_W - M, RULE, 0.3)

def footer(c, page_no, aside):
    y = 0.55*inch
    hrule(c, M, y + 16, PAGE_W - M, RULE, 0.3)
    # orange dot
    c.setFillColor(ORANGE); c.circle(M + 3, y + 4, 3, stroke=0, fill=1)
    c.setFont("Serif-I", 9); c.setFillColor(INK_MID)
    c.drawString(M + 12, y + 1, aside)
    c.setFont("Mono", 7.5); c.setFillColor(INK_LT)
    c.drawRightString(PAGE_W - M, y + 1, f"GCC · {page_no} of 2")


# ======================================================================
# PAGE 1 — "Here's what, here's why, here's the number."
# ======================================================================
def page_one(c):
    bg(c)
    header(c, 1, "Proposal — William Chrisman High School")

    y = PAGE_H - M - 0.35*inch
    # Tape label
    tape_label(c, M, y - 16, "A PROPOSAL · NOT A SALES PITCH", color=TAPE)

    # Big plainspoken title — condensed bold
    c.setFont("Cond", 66); c.setFillColor(DARK)
    c.drawString(M, y - 74, "Here's the work.")
    c.setFont("Cond", 66); c.setFillColor(DARK)
    c.drawString(M, y - 74 - 58, "Here's the number.")

    # Orange spine running down left of the numbers zone
    orange_spine(c, M - 10, y - 74 - 58 - 20, y - 4, w=3)

    # Italic subtitle — the joke is in the tone
    c.setFont("Serif-I", 13); c.setFillColor(ORANGE_DP)
    c.drawString(M, y - 74 - 58 - 22, "(The handshake comes at the bottom of page two.)")

    # --- Plainspoken summary as a single column ---
    by = y - 74 - 58 - 56
    c.setFont("Serif", 11.5); c.setFillColor(INK)
    lines = [
        "We're Green Communications Contracting. We pull low-voltage cable",
        "for schools, hospitals, and mid-sized commercial builds across Kansas",
        "City and St. Louis. We like schedules that land on time and bids that",
        "don't need an asterisk.",
        "",
        "Below is our bid for the 2026 low-voltage package at William Chrisman",
        "High School. Ten-week summer window. Cat6A throughout. Prevailing",
        "wage. Certified and LinkWare-PDF'd at closeout — we do that part anyway.",
    ]
    for i, line in enumerate(lines):
        c.drawString(M, by - i*16, line)

    # --- Side-by-side info chips ---
    cy = by - len(lines)*16 - 0.45*inch
    # Client card
    tape_label(c, M, cy + 6, "WHO THIS IS FOR")
    c.setFont("Cond", 18); c.setFillColor(DARK)
    c.drawString(M, cy - 16, CLIENT["name"])
    c.setFont("Serif", 10.5); c.setFillColor(INK_MID)
    c.drawString(M, cy - 32, f'{CLIENT["contact"]} · {CLIENT["title"]}')
    c.setFont("Mono", 9); c.setFillColor(INK)
    c.drawString(M, cy - 46, CLIENT["email"])
    c.setFont("Mono", 9); c.setFillColor(INK_MID)
    c.drawString(M, cy - 60, CLIENT["phone"])

    # Project card
    px = PAGE_W/2 + 0.15*inch
    tape_label(c, px, cy + 6, "WHERE THE WORK LIVES")
    c.setFont("Cond", 18); c.setFillColor(DARK)
    c.drawString(px, cy - 16, PROJECT["title"])
    c.setFont("Serif-I", 10.5); c.setFillColor(INK_MID)
    c.drawString(px, cy - 32, PROJECT["subtitle"])
    c.setFont("Mono", 9); c.setFillColor(INK)
    c.drawString(px, cy - 46, PROJECT["addr"])
    c.setFont("Mono", 9); c.setFillColor(INK_MID)
    c.drawString(px, cy - 60, f'Bid # {PROJECT["bid_no"]}  ·  Due {BID_DUE}')

    # --- The number ---
    ny = cy - 1.25*inch
    tape_label(c, M, ny + 26, "THE NUMBER")
    # Number on its own line, large but sized to leave breathing room
    c.setFont("Cond", 72); c.setFillColor(DARK)
    c.drawString(M - 4, ny - 46, money(TOTAL))
    # orange underline
    num_w = pdfmetrics.stringWidth(money(TOTAL), "Cond", 72)
    c.setStrokeColor(ORANGE); c.setLineWidth(3.5)
    c.line(M - 4, ny - 52, M - 4 + num_w, ny - 52)

    # Right-side small text — stacked BELOW the number, left-aligned, to avoid collision
    cap_y = ny - 74
    c.setFont("Serif", 11); c.setFillColor(INK)
    c.drawString(M, cap_y, "Six lines. All-in. No truck charges hiding in a footnote.")
    c.setFont("Serif-I", 10); c.setFillColor(INK_MID)
    c.drawString(M, cap_y - 14, "Held firm for 60 days from the issue date.")
    # MSP aside on the right — clear of the number
    c.setFont("Mono-B", 10.5); c.setFillColor(ORANGE_DP)
    c.drawRightString(PAGE_W - M, cap_y, f"MSP alternate · {money(MSP_MO)} / mo")
    c.setFont("Serif-I", 9); c.setFillColor(INK_LT)
    c.drawRightString(PAGE_W - M, cap_y - 14, "(optional — page two)")

    footer(c, 1, "No surprises. No hidden truck charges. If the price changes, we say so first.")


# ======================================================================
# PAGE 2 — "Line by line. Plain English."
# ======================================================================
def page_two(c):
    bg(c)
    header(c, 2, "Scope & Pricing — William Chrisman High School")

    y = PAGE_H - M - 0.35*inch
    tape_label(c, M, y - 16, "LINE BY LINE · PLAIN ENGLISH", color=TAPE)

    c.setFont("Cond", 44); c.setFillColor(DARK)
    c.drawString(M, y - 70, "What we're going to do.")
    orange_spine(c, M - 10, y - 98, y - 4, w=3)

    # Header row
    tx0 = M
    col_qty  = tx0
    col_un   = tx0 + 0.42*inch
    col_desc = tx0 + 0.85*inch
    col_up   = PAGE_W - M - 1.55*inch
    col_lt   = PAGE_W - M

    yh = y - 120
    c.setFont("Sans-B", 6.5); c.setFillColor(ORANGE_DP)
    c.drawString(col_qty,  yh, "QTY")
    c.drawString(col_un,   yh, "UN")
    c.drawString(col_desc, yh, "WHAT YOU'RE GETTING")
    c.drawRightString(col_up, yh, "EACH")
    c.drawRightString(col_lt, yh, "LINE")
    hrule(c, tx0, yh - 6, PAGE_W - M, DARK, 0.8)

    # Plain-English translations of each scope item
    plain = [
        "Cat6A runs to every classroom and admin outlet (bid asked Cat6 — we give you Cat6A at Cat6 pricing).",
        "Six MDF/IDF closets built out: racks, cable management, vertical runway, the works.",
        "Twelve-strand single-mode fiber knitting all six closets together.",
        "Cat6A home-runs to every camera location. Cameras supplied by others — we leave terminated ends waiting.",
        "Door-hardware rough-in so the security integrator's install day is boring.",
        "Fluke DSX-8000 certification on everything. LinkWare PDF handed over at closeout.",
    ]
    row_y = yh - 24
    for i, ((qty, un, head, _tail, up, lt), plain_desc) in enumerate(zip(SCOPE, plain)):
        c.setFont("Mono-B", 9.5); c.setFillColor(INK)
        c.drawString(col_qty, row_y, f"{qty}")
        c.setFont("Mono", 9); c.setFillColor(INK_LT)
        c.drawString(col_un, row_y, un)
        c.setFont("Sans-B", 10); c.setFillColor(DARK)
        c.drawString(col_desc, row_y, head)
        # wrap plain description
        words = plain_desc.split()
        cur = ""; wrapped = []
        max_desc_w = col_up - col_desc - 16
        for w in words:
            test = (cur + " " + w).strip()
            if pdfmetrics.stringWidth(test, "Serif", 9.5) > max_desc_w:
                wrapped.append(cur); cur = w
            else:
                cur = test
        if cur: wrapped.append(cur)
        c.setFont("Serif", 9.5); c.setFillColor(INK_MID)
        for j, ln in enumerate(wrapped[:2]):
            c.drawString(col_desc, row_y - 13 - j*12, ln)
        # prices
        c.setFont("Mono", 9); c.setFillColor(INK_MID)
        c.drawRightString(col_up, row_y, money(up))
        c.setFont("Mono-B", 10); c.setFillColor(DARK)
        c.drawRightString(col_lt, row_y, money(lt))
        hrule(c, tx0, row_y - 28, PAGE_W - M, RULE, 0.25)
        row_y -= 42

    # Subtotal
    row_y -= 2
    c.setFont("Sans-B", 8); c.setFillColor(ORANGE_DP)
    c.drawRightString(col_up, row_y, "SUBTOTAL")
    c.setFont("Mono", 10); c.setFillColor(INK)
    c.drawRightString(col_lt, row_y, money(SUBTOTAL))

    # Total — orange tape
    row_y -= 30
    tape_label(c, col_up - 1.7*inch, row_y, "THE WHOLE THING",
               w=col_lt - (col_up - 1.7*inch), color=ORANGE, size=9)
    # override — draw number over the tape
    c.setFont("Cond", 20); c.setFillColor(DARK)
    c.drawRightString(col_lt - 10, row_y + 4, money(TOTAL))
    # tape text re-draw (to keep it visible)
    c.setFont("Sans-B", 9); c.setFillColor(DARK)
    c.drawString(col_up - 1.7*inch + 10, row_y + 4, "THE WHOLE THING")

    # MSP alternate
    ay = row_y - 52
    tape_label(c, M, ay + 6, "KEEP-IT-RUNNING PLAN · OPTIONAL")
    c.setFont("Serif", 10.5); c.setFillColor(INK)
    c.drawString(M, ay - 16,
                 "Monthly service once the job is live. Priced separately because it should be.")
    c.setFont("Serif-I", 10); c.setFillColor(INK_MID)
    c.drawString(M, ay - 32,
                 "Monitoring · quarterly MAC allowance · warranty admin · 4-hr on-site response.")
    c.setFont("Mono-B", 12); c.setFillColor(ORANGE_DP)
    c.drawRightString(col_lt, ay - 16, f"{money(MSP_MO)} / mo")
    c.setFont("Mono", 10); c.setFillColor(INK_MID)
    c.drawRightString(col_lt, ay - 32, f"{money(MSP_YR)} / yr")

    # What's not in here
    ey = ay - 70
    tape_label(c, M, ey + 6, "STUFF WE'RE NOT DOING (ON PURPOSE)")
    c.setFont("Serif", 10); c.setFillColor(INK)
    excl = [
        "Speakers, paging, classroom audio — different trade, different proposal.",
        "The old bell system. It stays. We don't touch working stuff.",
        "Installing owner-furnished gear past the terminate-and-test point.",
        "Drilling or saw-cutting concrete. We price those separately when they come up.",
        "After-hours/weekend labor at straight rate. If you need us nights, it's 1.5×.",
    ]
    for i, t in enumerate(excl):
        c.setFillColor(ORANGE); c.rect(M, ey - 18 - i*14 + 3, 3, 3, stroke=0, fill=1)
        c.setFillColor(INK_MID)
        c.drawString(M + 10, ey - 18 - i*14, t)

    footer(c, 2, "If any line above doesn't match the bid docs, call me — we'll fix it before you sign.")


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
