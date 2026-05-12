"""
Shop Apron — plainspoken tradesman feel. Canvas tan, safety orange,
masking-tape yellow kickers. Condensed display, Lora body.

NOTE: this is the VISUAL theme only — the bundler's voice is unchanged.
Prose stays standard-GCC; the humor lives in the design language.
"""
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from theming import Theme, Palette, Fonts


FONT_MAP = {
    "SA-Display":  "BigShoulders-Bold.ttf",
    "SA-Display-R":"BigShoulders-Regular.ttf",
    "SA-Serif":    "Lora-Regular.ttf",
    "SA-Serif-B":  "Lora-Bold.ttf",
    "SA-Serif-I":  "Lora-Italic.ttf",
    "SA-Sans":     "WorkSans-Regular.ttf",
    "SA-Sans-B":   "WorkSans-Bold.ttf",
    "SA-Sans-I":   "WorkSans-Italic.ttf",
    "SA-Mono":     "GeistMono-Regular.ttf",
}

PALETTE = Palette(
    primary      = HexColor("#E75B1E"),   # safety orange
    primary_dark = HexColor("#B24113"),
    accent       = HexColor("#F4D35E"),   # masking tape
    accent_tint  = HexColor("#F9E49E"),
    paper        = HexColor("#F4EAD1"),   # canvas
    cream        = HexColor("#E8DCC0"),
    ink          = HexColor("#1D1A14"),
    ink_mid      = HexColor("#47432F"),
    ink_lt       = HexColor("#8F8569"),
    rule         = HexColor("#C8BC9C"),
)

FONTS = Fonts(
    display = "SA-Display",
    serif   = "SA-Serif",
    serif_b = "SA-Serif-B",
    serif_i = "SA-Serif-I",
    sans    = "SA-Sans",
    sans_b  = "SA-Sans-B",
    sans_i  = "SA-Sans-I",
    mono    = "SA-Mono",
)


def draw_frame(canv, doc, intake, theme):
    """Masking-tape kicker top-left, orange spine left gutter, plainspoken footer."""
    from build_proposal import PROPOSAL_TYPE_LABEL, fmt_date
    p = theme.palette
    pw, ph = 8.5 * inch, 11 * inch

    canv.saveState()
    # Background
    canv.setFillColor(p.paper)
    canv.rect(0, 0, pw, ph, fill=1, stroke=0)
    # Orange spine — thin vertical line just inside left margin
    canv.setStrokeColor(p.primary)
    canv.setLineWidth(2.2)
    canv.line(0.58 * inch, 0.75 * inch, 0.58 * inch, ph - 0.75 * inch)
    # Masking-tape kicker at top
    label = f"GCC · {PROPOSAL_TYPE_LABEL.get(intake['proposal_type'], 'PROPOSAL')}"
    tape_w = 2.2 * inch
    tape_y = ph - 0.68 * inch
    canv.setFillColor(p.accent)
    canv.rect(0.75 * inch, tape_y, tape_w, 15, fill=1, stroke=0)
    # Torn edges (darker yellow)
    canv.setFillColor(HexColor("#E6C14E"))
    canv.rect(0.75 * inch, tape_y, 2.5, 15, fill=1, stroke=0)
    canv.rect(0.75 * inch + tape_w - 2.5, tape_y, 2.5, 15, fill=1, stroke=0)
    canv.setFont(theme.fonts.sans_b, 8)
    canv.setFillColor(p.ink)
    canv.drawString(0.85 * inch, tape_y + 4, label.upper())
    # Right proposal no
    canv.setFont(theme.fonts.mono, 8.5)
    canv.setFillColor(p.ink)
    canv.drawRightString(pw - 0.60 * inch, tape_y + 4, intake.get("proposal_no", ""))
    # Footer orange dot + plainspoken line
    canv.setFillColor(p.primary)
    canv.circle(0.63 * inch, 0.44 * inch, 2.5, fill=1, stroke=0)
    canv.setFont(theme.fonts.serif_i, 9)
    canv.setFillColor(p.ink_mid)
    canv.drawString(0.72 * inch, 0.41 * inch,
                    f"{intake.get('proposal_no','')}  ·  issued {fmt_date(intake.get('issue_date'))}")
    canv.setFont(theme.fonts.mono, 7.5)
    canv.setFillColor(p.ink_lt)
    canv.drawRightString(pw - 0.60 * inch, 0.41 * inch, f"pg {doc.page}")
    canv.restoreState()


THEME = Theme(
    name       = "shop-apron",
    label      = "Shop Apron",
    philosophy = "Canvas + safety orange + masking-tape yellow. Plainspoken tradesman feel.",
    palette    = PALETTE,
    fonts      = FONTS,
    draw_frame = draw_frame,
)
