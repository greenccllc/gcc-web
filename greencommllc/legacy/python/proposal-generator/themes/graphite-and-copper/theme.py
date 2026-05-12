"""
Graphite & Copper — dark editorial with copper tick accents.
Deep charcoal paper, cream ink, copper rule and ticks. Swiss grid,
mono numerics. Reads senior / enterprise / architectural.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "GC-Display":  "InstrumentSerif-Regular.ttf",
    "GC-Serif":    "InstrumentSerif-Regular.ttf",
    "GC-Serif-B":  "InstrumentSerif-Regular.ttf",
    "GC-Serif-I":  "InstrumentSerif-Italic.ttf",
    "GC-Sans":     "InstrumentSans-Regular.ttf",
    "GC-Sans-B":   "InstrumentSans-Bold.ttf",
    "GC-Sans-I":   "InstrumentSans-Italic.ttf",
    "GC-Mono":     "IBMPlexMono-Regular.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#C77A3A"),   # copper
    primary_dark = HexColor("#8A5524"),
    accent       = HexColor("#E8A868"),   # light copper
    accent_tint  = HexColor("#3A342D"),
    paper        = HexColor("#1E1C19"),   # dark graphite
    cream        = HexColor("#2A2622"),
    ink          = HexColor("#F2EDE2"),   # cream on dark
    ink_mid      = HexColor("#C2BBA9"),
    ink_lt       = HexColor("#8A8472"),
    rule         = HexColor("#4A443B"),
)

FONTS = Fonts(
    display = "GC-Display",
    serif   = "GC-Serif",
    serif_b = "GC-Serif-B",
    serif_i = "GC-Serif-I",
    sans    = "GC-Sans",
    sans_b  = "GC-Sans-B",
    sans_i  = "GC-Sans-I",
    mono    = "GC-Mono",
)


def draw_frame(canv, doc, intake, theme):
    """Copper tick at top, thin rule, mono meta. Dark ground throughout."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Dark background
    canv.setFillColor(p.paper)
    canv.rect(0, 0, pw, ph, fill=1, stroke=0)
    # Copper tick top left
    canv.setFillColor(p.primary)
    canv.rect(0.60 * inch, ph - 0.58 * inch, 0.22 * inch, 3, fill=1, stroke=0)
    # Kicker
    canv.setFont(theme.fonts.sans_b, 7.5)
    canv.setFillColor(p.primary)
    label = f"GCC  ·  {PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}"
    canv.drawString(0.88 * inch, ph - 0.55 * inch, "  ".join(list(label)))
    # Right proposal no
    canv.setFont(theme.fonts.mono, 8)
    canv.setFillColor(p.ink_mid)
    canv.drawRightString(pw - 0.60 * inch, ph - 0.55 * inch, intake.get("proposal_no", ""))
    # Top rule
    canv.setStrokeColor(p.rule)
    canv.setLineWidth(0.3)
    canv.line(0.60 * inch, ph - 0.72 * inch, pw - 0.60 * inch, ph - 0.72 * inch)
    # Footer
    canv.line(0.60 * inch, 0.72 * inch, pw - 0.60 * inch, 0.72 * inch)
    canv.setFont(theme.fonts.mono, 7.5)
    canv.setFillColor(p.ink_lt)
    canv.drawString(0.60 * inch, 0.50 * inch,
                    f"{intake.get('proposal_no','')} — {fmt_date(intake.get('issue_date'))}")
    canv.drawRightString(pw - 0.60 * inch, 0.50 * inch, f"{doc.page:03d}")
    canv.restoreState()


THEME = Theme(
    name       = "graphite-and-copper",
    label      = "Graphite & Copper",
    philosophy = "Dark editorial — graphite paper, cream ink, copper ticks. Swiss grid.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
