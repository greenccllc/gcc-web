"""
Forest Ledger — reorganized forest green. Dashboard-not-brochure.
Cream ground, conifer spine accent, mono numerics, 2×2 quad grid
replaces the narrative-first cover. Data-forward feel.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "FL-Display":  "WorkSans-Bold.ttf",
    "FL-Serif":    "Lora-Regular.ttf",
    "FL-Serif-B":  "Lora-Bold.ttf",
    "FL-Serif-I":  "Lora-Italic.ttf",
    "FL-Sans":     "WorkSans-Regular.ttf",
    "FL-Sans-B":   "WorkSans-Bold.ttf",
    "FL-Sans-I":   "WorkSans-Italic.ttf",
    "FL-Mono":     "JetBrainsMono-Regular.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#2E5544"),   # pine
    primary_dark = HexColor("#1F3A2E"),   # conifer
    accent       = HexColor("#7C8B5F"),   # moss
    accent_tint  = HexColor("#ECEAD6"),
    paper        = HexColor("#FBF8F0"),
    cream        = HexColor("#F6F2E8"),
    ink          = HexColor("#151510"),
    ink_mid      = HexColor("#525043"),
    ink_lt       = HexColor("#8C8772"),
    rule         = HexColor("#D4CDB7"),
)

FONTS = Fonts(
    display = "FL-Display",
    serif   = "FL-Serif",
    serif_b = "FL-Serif-B",
    serif_i = "FL-Serif-I",
    sans    = "FL-Sans",
    sans_b  = "FL-Sans-B",
    sans_i  = "FL-Sans-I",
    mono    = "FL-Mono",
)


def draw_frame(canv, doc, intake, theme):
    """Thin conifer spine along the gutter; small tracked kicker up top."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Background wash
    canv.setFillColor(p.paper)
    canv.rect(0, 0, pw, ph, fill=1, stroke=0)
    # Conifer spine — thin vertical rule inside left margin
    canv.setStrokeColor(p.primary_dark)
    canv.setLineWidth(0.6)
    canv.line(0.6 * inch, 0.75 * inch, 0.6 * inch, ph - 0.75 * inch)
    # Top tracked-out kicker
    canv.setFont(theme.fonts.sans_b, 7.5)
    canv.setFillColor(p.primary_dark)
    label = f"GCC  ·  {PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}"
    canv.drawString(0.75 * inch, ph - 0.55 * inch, "  ".join(list(label)))
    # Right proposal no — mono
    canv.setFont(theme.fonts.mono, 8)
    canv.setFillColor(p.ink)
    canv.drawRightString(pw - 0.6 * inch, ph - 0.55 * inch, intake.get("proposal_no", ""))
    # Footer mono timestamp + page no
    canv.setFont(theme.fonts.mono, 7.5)
    canv.setFillColor(p.ink_lt)
    canv.drawString(0.75 * inch, 0.40 * inch,
                    f"{intake.get('proposal_no','')}  /  {fmt_date(intake.get('issue_date'))}")
    canv.drawRightString(pw - 0.6 * inch, 0.40 * inch, f"{doc.page:02d}")
    canv.restoreState()


THEME = Theme(
    name       = "forest-ledger",
    label      = "Forest Ledger",
    philosophy = "Reorganized green. Dashboard not brochure — mono numerics, conifer spine.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
