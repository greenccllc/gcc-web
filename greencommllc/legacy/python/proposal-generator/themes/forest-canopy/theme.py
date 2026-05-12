"""
Forest Canopy — primary deep green with warm-gold accents.
Matches the GCC Company Profile: Liberation Serif headings, sans body,
forest #2E7D32 primary, gold #D4AF37 accent. The default and most
versatile theme in the library.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "FC-Serif":    "LiberationSerif-Regular.ttf",
    "FC-Serif-B":  "LiberationSerif-Bold.ttf",
    "FC-Serif-I":  "LiberationSerif-Italic.ttf",
    "FC-Sans":     "LiberationSans-Regular.ttf",
    "FC-Sans-B":   "LiberationSans-Bold.ttf",
    "FC-Sans-I":   "LiberationSans-Italic.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#2E7D32"),
    primary_dark = HexColor("#1E5622"),
    accent       = HexColor("#D4AF37"),
    accent_tint  = HexColor("#FAF3DC"),
    paper        = HexColor("#FDFBF4"),
    cream        = HexColor("#F1F8F1"),
    ink          = HexColor("#1A1A1A"),
    ink_mid      = HexColor("#455A64"),
    ink_lt       = HexColor("#788A93"),
    rule         = HexColor("#D8D8D8"),
)

FONTS = Fonts(
    display = "FC-Serif-B",
    serif   = "FC-Serif",
    serif_b = "FC-Serif-B",
    serif_i = "FC-Serif-I",
    sans    = "FC-Sans",
    sans_b  = "FC-Sans-B",
    sans_i  = "FC-Sans-I",
    mono    = "FC-Sans",
)


def draw_frame(canv, doc, intake, theme):
    """Gold-tick + kicker header; slate-light footer rule + page no."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Top rule
    canv.setFillColor(p.rule)
    canv.rect(0.6 * inch, ph - 0.6 * inch, pw - 1.2 * inch, 0.4, fill=1, stroke=0)
    # Gold square
    canv.setFillColor(p.accent)
    canv.rect(0.6 * inch, ph - 0.52 * inch, 6, 6, fill=1, stroke=0)
    # Left kicker
    canv.setFont(theme.fonts.sans_b, 8.5)
    canv.setFillColor(p.primary)
    canv.drawString(0.78 * inch, ph - 0.50 * inch,
                    f"GCC  ·  {PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}")
    # Right proposal no
    canv.setFont(theme.fonts.sans, 8.5)
    canv.setFillColor(p.ink_lt)
    canv.drawRightString(pw - 0.6 * inch, ph - 0.50 * inch, intake.get("proposal_no", ""))
    # Footer rule
    canv.setFillColor(p.rule)
    canv.rect(0.6 * inch, 0.55 * inch, pw - 1.2 * inch, 0.4, fill=1, stroke=0)
    # Footer text
    canv.setFont(theme.fonts.sans, 8.5)
    canv.setFillColor(p.ink_lt)
    canv.drawString(0.6 * inch, 0.35 * inch,
                    f"GCC LLC  ·  Proprietary & Confidential  ·  "
                    f"{intake.get('proposal_no','')}  ·  "
                    f"{fmt_date(intake.get('issue_date'))}")
    canv.drawRightString(pw - 0.6 * inch, 0.35 * inch, f"Page {doc.page}")
    canv.restoreState()


THEME = Theme(
    name       = "forest-canopy",
    label      = "Forest Canopy",
    philosophy = "Primary deep green with warm-gold accents. The GCC default.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
