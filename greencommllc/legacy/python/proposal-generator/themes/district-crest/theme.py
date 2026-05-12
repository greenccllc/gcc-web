"""
District Crest — warm cream with navy + gold.
Board-packet / public-institution grammar. Navy crest band across the top,
gold hairline, small gold seal. Reads as board-ready for K-12 and municipal.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "DC-Display":  "LibreBaskerville-Regular.ttf",
    "DC-Serif":    "CrimsonPro-Regular.ttf",
    "DC-Serif-B":  "CrimsonPro-Bold.ttf",
    "DC-Serif-I":  "CrimsonPro-Italic.ttf",
    "DC-Sans":     "InstrumentSans-Regular.ttf",
    "DC-Sans-B":   "InstrumentSans-Bold.ttf",
    "DC-Sans-I":   "InstrumentSans-Italic.ttf",
    "DC-Mono":     "IBMPlexMono-Regular.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#132745"),   # navy
    primary_dark = HexColor("#0C1B33"),
    accent       = HexColor("#B08734"),   # gold
    accent_tint  = HexColor("#F2E9CD"),
    paper        = HexColor("#FDFBF4"),   # warm cream
    cream        = HexColor("#F9F3DF"),
    ink          = HexColor("#141414"),
    ink_mid      = HexColor("#4B4E58"),
    ink_lt       = HexColor("#868A95"),
    rule         = HexColor("#CBCEC5"),
)

FONTS = Fonts(
    display = "DC-Display",
    serif   = "DC-Serif",
    serif_b = "DC-Serif-B",
    serif_i = "DC-Serif-I",
    sans    = "DC-Sans",
    sans_b  = "DC-Sans-B",
    sans_i  = "DC-Sans-I",
    mono    = "DC-Mono",
)


def draw_frame(canv, doc, intake, theme):
    """Navy crest band at top with gold hairline + seal square."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Background
    canv.setFillColor(p.paper)
    canv.rect(0, 0, pw, ph, fill=1, stroke=0)
    # Navy crest band (thin — 0.38")
    band_h = 0.38 * inch
    canv.setFillColor(p.primary)
    canv.rect(0, ph - band_h, pw, band_h, fill=1, stroke=0)
    # Gold hairline underneath
    canv.setFillColor(p.accent)
    canv.rect(0, ph - band_h - 2, pw, 1.2, fill=1, stroke=0)
    # Seal square — small gold block left of center
    seal = 10
    canv.setFillColor(p.accent)
    canv.rect(0.6 * inch, ph - band_h + (band_h - seal) / 2, seal, seal, fill=1, stroke=0)
    # Kicker white on navy
    canv.setFont(theme.fonts.sans_b, 8)
    canv.setFillColor(p.paper)
    canv.drawString(0.88 * inch, ph - band_h + 0.13 * inch,
                    f"GCC  ·  {PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}")
    # Right proposal no
    canv.setFont(theme.fonts.mono, 8)
    canv.drawRightString(pw - 0.6 * inch, ph - band_h + 0.13 * inch, intake.get("proposal_no", ""))
    # Footer rule — gold hairline
    canv.setFillColor(p.accent)
    canv.rect(0.6 * inch, 0.60 * inch, pw - 1.2 * inch, 0.8, fill=1, stroke=0)
    canv.setFont(theme.fonts.serif_i, 9)
    canv.setFillColor(p.ink_mid)
    canv.drawString(0.6 * inch, 0.42 * inch,
                    f"{intake.get('proposal_no','')}  ·  Issued {fmt_date(intake.get('issue_date'))}  ·  Board-ready")
    canv.setFont(theme.fonts.mono, 8)
    canv.setFillColor(p.ink_lt)
    canv.drawRightString(pw - 0.6 * inch, 0.42 * inch, f"Page {doc.page}")
    canv.restoreState()


THEME = Theme(
    name       = "district-crest",
    label      = "District Crest",
    philosophy = "Navy + gold on cream. Board-packet grammar — K-12, municipal, public work.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
