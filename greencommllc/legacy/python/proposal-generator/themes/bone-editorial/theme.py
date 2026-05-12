"""
Bone Editorial — warm beige magazine feel.
Gloock display face + Lora body + Plex Serif mono-adjacent. Text-forward
with an ember accent. Reads architect-led, hospitality, boutique.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "BE-Display":  "Gloock-Regular.ttf",
    "BE-Serif":    "Lora-Regular.ttf",
    "BE-Serif-B":  "Lora-Bold.ttf",
    "BE-Serif-I":  "Lora-Italic.ttf",
    "BE-Sans":     "InstrumentSans-Regular.ttf",
    "BE-Sans-B":   "InstrumentSans-Bold.ttf",
    "BE-Sans-I":   "InstrumentSans-Italic.ttf",
    "BE-Mono":     "IBMPlexSerif-Regular.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#1B1814"),   # ink (main display)
    primary_dark = HexColor("#0F0D0A"),
    accent       = HexColor("#C55A2D"),   # ember
    accent_tint  = HexColor("#F4E0CF"),
    paper        = HexColor("#F9F2E4"),
    cream        = HexColor("#F3ECDE"),
    ink          = HexColor("#1B1814"),
    ink_mid      = HexColor("#5E4E38"),
    ink_lt       = HexColor("#9A8769"),
    rule         = HexColor("#D8CAAC"),
)

FONTS = Fonts(
    display = "BE-Display",
    serif   = "BE-Serif",
    serif_b = "BE-Serif-B",
    serif_i = "BE-Serif-I",
    sans    = "BE-Sans",
    sans_b  = "BE-Sans-B",
    sans_i  = "BE-Sans-I",
    mono    = "BE-Mono",
)


def draw_frame(canv, doc, intake, theme):
    """Editorial colophon — small caps kicker, ember tick, page no at bottom."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Background
    canv.setFillColor(p.paper)
    canv.rect(0, 0, pw, ph, fill=1, stroke=0)
    # Ember tick (top left)
    canv.setFillColor(p.accent)
    canv.rect(0.60 * inch, ph - 0.58 * inch, 0.18 * inch, 3, fill=1, stroke=0)
    # Kicker
    canv.setFont(theme.fonts.sans_b, 7)
    canv.setFillColor(p.ink)
    label = f"{PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}"
    canv.drawString(0.82 * inch, ph - 0.55 * inch, "  ".join(list(label)))
    # Right — proposal no + issue date as editorial slug
    canv.setFont(theme.fonts.serif_i, 9)
    canv.setFillColor(p.ink_mid)
    canv.drawRightString(pw - 0.60 * inch, ph - 0.55 * inch,
                         f"Green Communications  ·  {intake.get('proposal_no','')}")
    # Bottom thin rule
    canv.setStrokeColor(p.rule)
    canv.setLineWidth(0.3)
    canv.line(0.60 * inch, 0.58 * inch, pw - 0.60 * inch, 0.58 * inch)
    # Folio — centered page no in small caps
    canv.setFont(theme.fonts.serif_i, 9)
    canv.setFillColor(p.ink_mid)
    canv.drawCentredString(pw / 2, 0.40 * inch, f"— {doc.page} —")
    canv.setFont(theme.fonts.sans, 7.5)
    canv.setFillColor(p.ink_lt)
    canv.drawString(0.60 * inch, 0.40 * inch, f"Issued {fmt_date(intake.get('issue_date'))}")
    canv.drawRightString(pw - 0.60 * inch, 0.40 * inch, "GCC LLC")
    canv.restoreState()


THEME = Theme(
    name       = "bone-editorial",
    label      = "Bone Editorial",
    philosophy = "Warm bone with ember accent. Magazine editorial — text forward, display serif.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
