"""
Bark Indigo — oyster paper with indigo and walnut.
Bound-folio aesthetic. Baskerville display, Crimson body, Atlantic trading-
house grammar. Reads senior/enterprise.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "BI-Display":  "LibreBaskerville-Regular.ttf",
    "BI-Serif":    "CrimsonPro-Regular.ttf",
    "BI-Serif-B":  "CrimsonPro-Bold.ttf",
    "BI-Serif-I":  "CrimsonPro-Italic.ttf",
    "BI-Sans":     "InstrumentSans-Regular.ttf",
    "BI-Sans-B":   "InstrumentSans-Bold.ttf",
    "BI-Sans-I":   "InstrumentSans-Italic.ttf",
    "BI-Mono":     "IBMPlexMono-Regular.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#1B2B48"),   # indigo
    primary_dark = HexColor("#11203A"),
    accent       = HexColor("#6B4A2E"),   # walnut
    accent_tint  = HexColor("#E7DFC9"),
    paper        = HexColor("#F1EBDC"),   # oyster
    cream        = HexColor("#EAE2CE"),
    ink          = HexColor("#171412"),
    ink_mid      = HexColor("#524A3B"),
    ink_lt       = HexColor("#8B8472"),
    rule         = HexColor("#C9BFA3"),
)

FONTS = Fonts(
    display = "BI-Display",
    serif   = "BI-Serif",
    serif_b = "BI-Serif-B",
    serif_i = "BI-Serif-I",
    sans    = "BI-Sans",
    sans_b  = "BI-Sans-B",
    sans_i  = "BI-Sans-I",
    mono    = "BI-Mono",
)


def draw_frame(canv, doc, intake, theme):
    """Folio border just inside the page margin with a double hairline at top."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Background
    canv.setFillColor(p.paper)
    canv.rect(0, 0, pw, ph, fill=1, stroke=0)
    # Folio border
    canv.setStrokeColor(p.primary_dark)
    canv.setLineWidth(0.5)
    canv.rect(0.50 * inch, 0.50 * inch, pw - 1.0 * inch, ph - 1.0 * inch, fill=0, stroke=1)
    # Inner hairline — double rule at top
    canv.setLineWidth(0.3)
    canv.line(0.60 * inch, ph - 0.72 * inch, pw - 0.60 * inch, ph - 0.72 * inch)
    # Kicker (small caps feel via spaced letters)
    canv.setFont(theme.fonts.sans_b, 7)
    canv.setFillColor(p.primary_dark)
    label = f"GCC  ·  {PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}"
    canv.drawString(0.70 * inch, ph - 0.62 * inch, "  ".join(list(label)))
    # Right proposal no
    canv.setFont(theme.fonts.serif_i, 10)
    canv.setFillColor(p.accent)
    canv.drawRightString(pw - 0.70 * inch, ph - 0.62 * inch, intake.get("proposal_no", ""))
    # Footer
    canv.setStrokeColor(p.rule)
    canv.setLineWidth(0.3)
    canv.line(0.70 * inch, 0.72 * inch, pw - 0.70 * inch, 0.72 * inch)
    canv.setFont(theme.fonts.serif_i, 9)
    canv.setFillColor(p.ink_mid)
    canv.drawString(0.70 * inch, 0.58 * inch,
                    f"{intake.get('proposal_no','')}  ·  issued {fmt_date(intake.get('issue_date'))}")
    canv.setFont(theme.fonts.mono, 8)
    canv.setFillColor(p.ink_lt)
    canv.drawRightString(pw - 0.70 * inch, 0.58 * inch, f"— {doc.page} —")
    canv.restoreState()


THEME = Theme(
    name       = "bark-indigo",
    label      = "Bark Indigo",
    philosophy = "Oyster paper, indigo ink, walnut accent. Senior-partner folio grammar.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
