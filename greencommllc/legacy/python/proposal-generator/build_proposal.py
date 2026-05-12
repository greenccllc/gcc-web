"""
GCC LLC — Proposal PDF Generator (Themed)

Usage:
    python3 build_proposal.py intakes/<intake>.yaml
    python3 build_proposal.py examples/bid-example.yaml --theme forest-canopy
    python3 build_proposal.py examples/bid-example.yaml --theme district-crest

Produces a branded PDF in out/<proposal_no>_<client-slug>_<type>[_theme].pdf
and prints an enforcement report to stdout.

Theme system (see theming.py + themes/<name>/theme.py):
  - forest-canopy       Primary deep green + gold (default)
  - forest-ledger       Reorganized green, dashboard-forward
  - bark-indigo         Oyster + indigo + walnut, senior folio
  - bone-editorial      Warm bone + ember, magazine editorial
  - district-crest      Navy + gold on cream, board-ready (K-12/public)
  - shop-apron          Canvas + safety orange, plainspoken
  - graphite-and-copper Dark editorial, copper accents

Content, numbers, scope, warranty, exclusions, and voice are identical
across themes. Only palette, typography, and page chrome change.

Hard rules enforced (see rules.md):
  §1.1 Cat6A plenum on every data drop
  §1.2 Mandatory MSP alternate
  §1.3 Loyalty discount (visible line) if is_repeat_client
  §1.4 Standard warranty language verbatim
  §1.5 No REQUESTS / no-access-holds
  §1.6 Standard exclusions auto-append
  §2.3 Forbidden-phrase grep
"""
import argparse
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import yaml
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak, FrameBreak,
)
from reportlab.platypus.flowables import HRFlowable

from theming import load_theme, Theme

# =====================================================================
# THEME-BOUND GLOBALS
# =====================================================================
# These are populated by apply_theme() from the chosen Theme. They remain
# available at module scope so the existing content builders (which use
# these names) keep working with zero changes.
FOREST = FOREST_DARK = SLATE = SLATE_LIGHT = GOLD = GOLD_TINT = None
CREAM = INK = WHITE = GREEN_TINT = RULE = None

WHITE = HexColor("#FFFFFF")  # invariant

# Font role names (mapped to theme fonts)
_FONT_ROLES = ("Serif", "Serif-B", "Serif-I", "Sans", "Sans-B", "Sans-I", "Mono", "Display")

# Theme currently in effect — set by apply_theme()
ACTIVE_THEME: Theme = None  # type: ignore[assignment]


def apply_theme(theme: Theme) -> None:
    """Install theme palette, fonts, and styles into module globals.

    After this call, all S_* paragraph styles and color constants point at
    the chosen theme. Safe to call repeatedly (e.g. if the bundler is used
    as a library and switches themes between builds).
    """
    global FOREST, FOREST_DARK, SLATE, SLATE_LIGHT, GOLD, GOLD_TINT
    global CREAM, INK, GREEN_TINT, RULE, ACTIVE_THEME
    global S_TITLE, S_SUB, S_KICKER, S_H1, S_H2, S_BODY, S_BODY_I, S_LEAD
    global S_SMALL, S_META, S_CELL, S_CELL_B, S_CELL_N, S_CELL_C
    global S_TOTAL, S_TOTAL_N, S_SIG, S_WARRANTY

    ACTIVE_THEME = theme
    p = theme.palette
    f = theme.fonts

    # Map theme palette to legacy names used throughout the builders.
    FOREST      = p.primary
    FOREST_DARK = p.primary_dark
    SLATE       = p.ink_mid
    SLATE_LIGHT = p.ink_lt
    GOLD        = p.accent
    GOLD_TINT   = p.accent_tint
    CREAM       = p.paper
    INK         = p.ink
    GREEN_TINT  = p.cream
    RULE        = p.rule

    # Rebuild paragraph styles against the theme's font roster. We alias
    # the theme font names to the short role names expected by the
    # renderers by registering per-call ParagraphStyle fontNames directly.
    def _s(name, **kw):
        base = dict(
            name=name, fontName=f.sans, fontSize=10, leading=13,
            textColor=INK, alignment=0, spaceBefore=0, spaceAfter=0,
        )
        base.update(kw)
        return ParagraphStyle(**base)

    S_TITLE    = _s("title",  fontName=f.display, fontSize=28, leading=32, textColor=FOREST_DARK)
    S_SUB      = _s("sub",    fontName=f.serif_i, fontSize=14, leading=17, textColor=SLATE)
    S_KICKER   = _s("kick",   fontName=f.sans_b,  fontSize=9,  leading=11, textColor=FOREST)
    S_H1       = _s("h1",     fontName=f.display, fontSize=18, leading=22, textColor=FOREST_DARK, spaceBefore=14, spaceAfter=6)
    S_H2       = _s("h2",     fontName=f.serif_b, fontSize=13, leading=16, textColor=FOREST_DARK, spaceBefore=8,  spaceAfter=4)
    S_BODY     = _s("body",   leading=14)
    S_BODY_I   = _s("bodyi",  fontName=f.sans_i,  leading=14, textColor=SLATE)
    S_LEAD     = _s("lead",   fontName=f.serif,   fontSize=11, leading=15, textColor=INK)
    S_SMALL    = _s("small",  fontSize=8.5, leading=11, textColor=SLATE)
    S_META     = _s("meta",   fontSize=9,   leading=12, textColor=SLATE_LIGHT)
    S_CELL     = _s("cell",   fontSize=9.5, leading=12)
    S_CELL_B   = _s("cellB",  fontName=f.sans_b,  fontSize=9.5, leading=12)
    S_CELL_N   = _s("cellN",  fontName=f.mono,    fontSize=9.5, leading=12, alignment=2)
    S_CELL_C   = _s("cellC",  fontSize=9.5, leading=12, alignment=1)
    S_TOTAL    = _s("total",  fontName=f.sans_b,  fontSize=11, leading=14, textColor=FOREST_DARK)
    S_TOTAL_N  = _s("totalN", fontName=f.sans_b,  fontSize=11, leading=14, textColor=FOREST_DARK, alignment=2)
    S_SIG      = _s("sig",    fontName=f.serif,   fontSize=11, leading=14)
    S_WARRANTY = _s("warr",   fontName=f.serif_i, fontSize=11, leading=16, textColor=FOREST_DARK, alignment=0)


# Module-level S_* placeholders — populated by apply_theme() before any
# content is built. Declared here so imports succeed at module load.
S_TITLE = S_SUB = S_KICKER = S_H1 = S_H2 = S_BODY = S_BODY_I = None
S_LEAD = S_SMALL = S_META = S_CELL = S_CELL_B = S_CELL_N = S_CELL_C = None
S_TOTAL = S_TOTAL_N = S_SIG = S_WARRANTY = None

# =====================================================================
# HARD-CODED LEGAL TEXT (§1.4 — must appear verbatim)
# =====================================================================
WARRANTY_TEXT = (
    "Lifetime workmanship warranty on all GCC-installed cable and "
    "terminations, transferable with the property. Manufacturer "
    "warranties pass through on equipment. Five-year coverage on "
    "GCC-furnished hardware."
)

STANDARD_EXCLUDED_SCOPES = [
    "Fire alarm — FAC / NICET-certified systems",
    "Emergency responder radio — ERCES / BDA / DAS",
    "Lighting control & shade automation",
    "Building management systems / HVAC controls",
    "Mass notification beyond standard PA speakers",
    "Line-voltage electrical work",
]

FORBIDDEN_PHRASES = [
    "best in class", "cutting-edge", "cutting edge", "world-class", "world class",
    "synergy", "synergies", "turnkey solution", "ecosystem", "industry-leading",
    "industry leading", "seamless", "robust", "low-hanging fruit", "value-add",
    "value add", "touch base", "circle back", "deep dive",
]

# =====================================================================
# STYLE HELPERS (bullets, etc. — need a font role, use the active theme)
# =====================================================================
def _bullet_style():
    f = ACTIVE_THEME.fonts
    return ParagraphStyle(
        name="bul", fontName=f.sans_b, fontSize=9, leading=11, textColor=FOREST
    )


# =====================================================================
# HELPERS
# =====================================================================
def money(x):
    try:
        return f"${float(x):,.2f}"
    except Exception:
        return str(x)

def slugify(s):
    s = re.sub(r"[^\w\s-]", "", s or "").strip().lower()
    return re.sub(r"[\s_]+", "-", s)[:40]

def load_yaml(p):
    with open(p) as f:
        return yaml.safe_load(f)

def fmt_date(d):
    if isinstance(d, (date, datetime)):
        return d.strftime("%B %d, %Y")
    if isinstance(d, str):
        try:
            return datetime.strptime(d, "%Y-%m-%d").strftime("%B %d, %Y")
        except Exception:
            return d
    return ""

def addr_one_line(a):
    if not a:
        return ""
    parts = [a.get("street"), f"{a.get('city','')}, {a.get('state','')} {a.get('zip','')}".strip(", ")]
    return " · ".join(p for p in parts if p)

# =====================================================================
# HARD-RULE ENFORCEMENT
# =====================================================================
class Enforcement:
    def __init__(self):
        self.applied = []
        self.warnings = []
        self.errors = []

    def apply(self, msg):  self.applied.append(msg)
    def warn(self, msg):   self.warnings.append(msg)
    def error(self, msg):  self.errors.append(msg)

    def report(self):
        lines = ["\n=== GCC Proposal Hard-Rule Enforcement Report ===\n"]
        lines.append(f"  APPLIED ({len(self.applied)}):")
        for m in self.applied: lines.append(f"    + {m}")
        if self.warnings:
            lines.append(f"\n  WARNINGS ({len(self.warnings)}):")
            for m in self.warnings: lines.append(f"    ! {m}")
        if self.errors:
            lines.append(f"\n  ERRORS ({len(self.errors)}):")
            for m in self.errors: lines.append(f"    ✗ {m}")
        else:
            lines.append("\n  ERRORS: none — proposal passed QA gate.")
        return "\n".join(lines)

def enforce_rules(intake, enf):
    # §1.1 — Cat6A baseline on data drops
    for line in intake.get("scope_lines", []):
        desc = (line.get("description") or "").lower()
        cat = line.get("category")
        if cat == "cabling" and ("drop" in desc or "outlet" in desc or "run" in desc):
            if "cat6a" not in desc and "fiber" not in desc and "coax" not in desc:
                enf.warn(f"§1.1: cabling line '{line.get('description')}' does not mention Cat6A — review before sending.")
    enf.apply("§1.1 Cat6A baseline — reviewed")

    # §1.2 — MSP alternate present
    alts = intake.get("alternates") or []
    has_msp = any("managed" in (a.get("name","").lower()) or "msp" in (a.get("name","").lower()) for a in alts)
    if intake["proposal_type"] != "change-order":
        if not has_msp:
            # auto-insert default MSP line
            intake.setdefault("alternates", []).append({
                "name": "Managed Services — Monthly",
                "monthly": 0.00,
                "annual": None,
                "description": (
                    "Monitoring & remote support, MAC labor allowance, "
                    "warranty administration, on-site response with "
                    "drive-time billed T&M."
                ),
            })
            enf.apply("§1.2 MSP alternate auto-inserted (was missing)")
        else:
            enf.apply("§1.2 MSP alternate present")
    else:
        enf.apply("§1.2 MSP alternate skipped (change-order)")

    # §1.3 — Loyalty discount applied if repeat
    if intake.get("client", {}).get("is_repeat_client") and intake["proposal_type"] != "change-order":
        pct = intake.get("loyalty_discount_pct", 0)
        if pct == 0:
            intake["loyalty_discount_pct"] = 3
            enf.apply("§1.3 Loyalty discount auto-applied at 3% (repeat client, was 0)")
        else:
            enf.apply(f"§1.3 Loyalty discount applied at {pct}% (repeat client)")
    else:
        enf.apply("§1.3 Loyalty discount not applicable")

    # §1.4 — Warranty verbatim (generator always writes WARRANTY_TEXT)
    enf.apply("§1.4 Standard warranty language verbatim (injected by generator)")

    # §1.5 — NO REQUESTS check
    all_text = yaml.dump(intake).lower()
    if re.search(r"\bgcc\s+requests?\b", all_text):
        enf.error("§1.5 Found 'GCC requests' language in intake — remove before sending")
    else:
        enf.apply("§1.5 No REQUESTS language found")

    # §1.6 — Standard exclusions auto-append if auto_flag set
    excl = intake.setdefault("exclusions", {})
    if excl.get("standard_excluded_auto", False):
        enf.apply("§1.6 Standard exclusions (fire alarm, ERCES/BDA/DAS, lighting control, BMS, mass notification, line voltage) will be auto-included")

    # §2.3 — Forbidden phrases
    text = yaml.dump(intake).lower()
    found = [p for p in FORBIDDEN_PHRASES if p in text]
    if found:
        enf.error(f"§2.3 Forbidden phrase(s) found: {', '.join(found)} — remove before sending")
    else:
        enf.apply("§2.3 No forbidden phrases in intake")

    # §3.4 — Approver required if total > 25k or public work
    total = sum(float(l.get("line_total") or 0) for l in intake.get("scope_lines", []))
    if total > 25000 or intake.get("project", {}).get("is_public_work"):
        if not intake.get("approved_by"):
            intake["approved_by"] = {"name": "Kaitlyn Lim Morris", "title": "CEO"}
            enf.apply(f"§3.4 Approver auto-set (total ${total:,.0f}, public work? {bool(intake.get('project',{}).get('is_public_work'))})")
        else:
            enf.apply("§3.4 Approver specified")

    return intake

# =====================================================================
# DOCUMENT FRAME — shared header/footer
# =====================================================================
PROPOSAL_TYPE_LABEL = {
    "formal-bid":        "BID PROPOSAL",
    "direct-quote":      "QUOTE",
    "residential-quote": "HOME PROJECT QUOTE",
    "change-order":      "CHANGE ORDER",
}

def draw_frame(canv, doc, intake):
    """Delegate to the active theme's chrome renderer."""
    ACTIVE_THEME.draw_frame(canv, doc, intake, ACTIVE_THEME)


# =====================================================================
# CONTENT BUILDERS
# =====================================================================
def h1(text):
    return Paragraph(text, S_H1)

def h2(text):
    return Paragraph(text, S_H2)

def kick(text):
    return Paragraph(text, S_KICKER)

def body(text):
    return Paragraph(text, S_BODY)

def lead(text):
    return Paragraph(text, S_LEAD)

def small(text):
    return Paragraph(text, S_SMALL)

def meta(text):
    return Paragraph(text, S_META)

def gold_rule(width=2.0*inch, thickness=1.5):
    from reportlab.platypus import Flowable
    class Rule(Flowable):
        def __init__(self, w, t, color):
            super().__init__()
            self.width = w; self.height = t; self.color = color
        def draw(self):
            self.canv.setFillColor(self.color)
            self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)
    return Rule(width, thickness, GOLD)

def facts_block(rows):
    """Two-col key/value table."""
    data = []
    for k, v in rows:
        if v is None or v == "": continue
        data.append([
            Paragraph(k.upper(), S_KICKER),
            Paragraph(str(v), S_BODY),
        ])
    t = Table(data, colWidths=[1.4*inch, 5.6*inch])
    t.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
    ]))
    return t

def scope_table(scope_lines, show_labor_split=False):
    """Main pricing table."""
    header = ["Qty", "Unit", "Description", "Unit Price", "Line Total"]
    data = [[Paragraph(h, S_CELL_B) for h in header]]
    for l in scope_lines:
        data.append([
            Paragraph(str(l.get("qty","")), S_CELL_C),
            Paragraph(l.get("unit",""), S_CELL_C),
            Paragraph(l.get("description",""), S_CELL),
            Paragraph(money(l.get("unit_price",0)), S_CELL_N),
            Paragraph(money(l.get("line_total",0)), S_CELL_N),
        ])
    t = Table(data, colWidths=[0.45*inch, 0.45*inch, 3.65*inch, 0.95*inch, 1.0*inch],
              repeatRows=1)
    style = [
        ("BACKGROUND",  (0,0), (-1,0), FOREST_DARK),
        ("TEXTCOLOR",   (0,0), (-1,0), CREAM),
        ("FONTNAME",    (0,0), (-1,0), ACTIVE_THEME.fonts.sans_b),
        ("VALIGN",      (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING",(0,0), (-1,-1), 6),
        ("TOPPADDING",  (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LINEBELOW",   (0,0), (-1,0), 1.5, GOLD),
        ("LINEBELOW",   (0,1), (-1,-1), 0.25, RULE),
    ]
    # alt-row tint
    for i in range(1, len(data)):
        if i % 2 == 1:
            style.append(("BACKGROUND", (0,i), (-1,i), GREEN_TINT))
    t.setStyle(TableStyle(style))
    return t

def totals_block(subtotal, loyalty_pct, total, msp_monthly=None):
    rows = []
    rows.append([Paragraph("Subtotal", S_CELL_B),
                 Paragraph(money(subtotal), S_CELL_N)])
    if loyalty_pct and loyalty_pct > 0:
        disc = subtotal * (loyalty_pct / 100.0)
        rows.append([Paragraph(f"GCC Loyalty Discount — Repeat Client ({loyalty_pct}%)", S_CELL),
                     Paragraph(f"−{money(disc)}", S_CELL_N)])
    rows.append([Paragraph("<b>TOTAL</b>", S_TOTAL),
                 Paragraph(f"<b>{money(total)}</b>", S_TOTAL_N)])
    if msp_monthly is not None:
        rows.append([Paragraph("<i>Optional Managed Services — per month</i>", S_CELL),
                     Paragraph(f"<i>{money(msp_monthly)}/mo</i>", S_CELL_N)])
    t = Table(rows, colWidths=[5.5*inch, 1.5*inch])
    styl = [
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LINEABOVE",    (0,-2 if msp_monthly is not None else -1), (-1,-2 if msp_monthly is not None else -1), 1.5, FOREST_DARK),
        ("BACKGROUND",   (0,-2 if msp_monthly is not None else -1), (-1,-2 if msp_monthly is not None else -1), GOLD_TINT),
    ]
    t.setStyle(TableStyle(styl))
    return t

def exclusions_block(intake):
    ex = intake.get("exclusions") or {}
    items = []
    if ex.get("standard_excluded_auto"):
        items.extend(STANDARD_EXCLUDED_SCOPES)
    items.extend(ex.get("extra") or [])
    if not items:
        return None
    data = []
    for it in items:
        data.append([
            Paragraph("▪", _bullet_style()),
            Paragraph(it, S_BODY),
        ])
    t = Table(data, colWidths=[0.25*inch, 6.75*inch])
    t.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING",(0,0), (-1,-1), 2),
        ("TOPPADDING",   (0,0), (-1,-1), 2),
    ]))
    return t

def warranty_block():
    return Table(
        [[Paragraph(WARRANTY_TEXT, S_WARRANTY)]],
        colWidths=[7.0*inch],
        style=TableStyle([
            ("BACKGROUND",   (0,0), (-1,-1), GREEN_TINT),
            ("LEFTPADDING",  (0,0), (-1,-1), 14),
            ("RIGHTPADDING", (0,0), (-1,-1), 14),
            ("TOPPADDING",   (0,0), (-1,-1), 12),
            ("BOTTOMPADDING",(0,0), (-1,-1), 12),
            ("LINEBEFORE",   (0,0), (0,-1), 3, GOLD),
        ]),
    )

def signature_block(intake):
    """Signature block. Always renders a CLIENT ACCEPTANCE row at the
    bottom -- earlier versions skipped it whenever an internal
    approver (Kaitlyn) was on the proposal, which silently removed
    the client's only place to sign. Layout:

      PREPARED BY               |  APPROVED BY (or CLIENT ACCEPTANCE)
      ------------------------  |  ------------------------
      Nathan Morris             |  Kaitlyn Lim Morris
      CTO                       |  CEO
      email + phone             |
      ----- spacer if appr -----+
      CLIENT ACCEPTANCE                           (full-width row)
      ------------------------------------------
      Date / Signature
    """
    prep = intake.get("prepared_by") or {}
    appr = intake.get("approved_by") or {}

    def _hline(w="95%"):
        return HRFlowable(width=w, thickness=0.7, color=INK,
                          spaceBefore=2, spaceAfter=4)

    left = [
        Paragraph("PREPARED BY", S_KICKER),
        Spacer(1, 26),
        _hline(),
        Paragraph(f"<b>{prep.get('name','')}</b>", S_SIG),
        Paragraph(prep.get("title",""), S_BODY_I),
        Spacer(1, 4),
        Paragraph(prep.get("email",""), S_SMALL),
        Paragraph(prep.get("phone","") or "", S_SMALL),
    ]

    if appr:
        # Internal authorship row: Nathan + Kaitlyn side-by-side
        right = [
            Paragraph("APPROVED BY", S_KICKER),
            Spacer(1, 26),
            _hline(),
            Paragraph(f"<b>{appr.get('name','')}</b>", S_SIG),
            Paragraph(appr.get("title",""), S_BODY_I),
        ]
    else:
        # No internal approver — collapse the right column into the
        # client-acceptance signature directly so the page doesn't
        # waste vertical space.
        right = [
            Paragraph("CLIENT ACCEPTANCE", S_KICKER),
            Spacer(1, 26),
            _hline(),
            Spacer(1, 14),
            _hline("70%"),
            Paragraph("Date / Signature", S_BODY_I),
        ]

    data = [[left, right]]
    t = Table(data, colWidths=[3.4*inch, 3.4*inch])
    t.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ]))

    # If we used the internal authorship row above, add a separate
    # full-width CLIENT ACCEPTANCE row below so the client always has
    # a place to sign.
    if appr:
        client_block = [
            Spacer(1, 18),
            Paragraph("CLIENT ACCEPTANCE", S_KICKER),
            Spacer(1, 22),
            _hline("60%"),
            Paragraph("Authorized signature / Date", S_BODY_I),
        ]
        return KeepTogether([t] + client_block)
    return t

def alternate_block(intake):
    alts = intake.get("alternates") or []
    if not alts:
        return None
    rows = [[
        Paragraph("ALTERNATE", S_CELL_B),
        Paragraph("DESCRIPTION", S_CELL_B),
        Paragraph("MONTHLY", S_CELL_B),
    ]]
    for a in alts:
        rows.append([
            Paragraph(f"<b>{a.get('name','')}</b>", S_CELL),
            Paragraph(a.get("description","") or "", S_CELL),
            Paragraph(money(a.get("monthly", 0)) + "/mo", S_CELL_N),
        ])
    t = Table(rows, colWidths=[2.0*inch, 3.8*inch, 1.2*inch], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), FOREST),
        ("TEXTCOLOR",    (0,0), (-1,0), CREAM),
        ("FONTNAME",     (0,0), (-1,0), ACTIVE_THEME.fonts.sans_b),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LINEBELOW",    (0,0), (-1,0), 1.5, GOLD),
        ("BACKGROUND",   (0,1), (-1,-1), GOLD_TINT),
    ]))
    return t

def terms_block(intake):
    terms = intake.get("terms") or {}
    rows = [
        ("Payment",    terms.get("payment","Net 30 from invoice date")),
        ("Deposit",    terms.get("deposit","25% mobilization deposit, balance at invoice")),
        ("Changes",    terms.get("change_order_policy","Any scope change documented via CO, priced T&M or lump-sum")),
        ("Insurance",  terms.get("insurance","GL $2M · Auto $1M · WC $1M. Certificate furnished on request.")),
        ("Licensure",  terms.get("licensure","Licensed & insured in MO.")),
        ("Validity",   f"Pricing firm through {fmt_date((datetime.strptime(str(intake['issue_date']), '%Y-%m-%d') + timedelta(days=intake.get('validity_days',30))).date())}"),
    ]
    return facts_block(rows)

# =====================================================================
# STORY BUILDERS BY PROPOSAL TYPE
# =====================================================================
def build_cover(intake):
    story = []
    # kicker
    story.append(kick(PROPOSAL_TYPE_LABEL.get(intake["proposal_type"],"PROPOSAL")))
    story.append(Spacer(1, 4))
    # project name (title)
    story.append(Paragraph(intake.get("project",{}).get("name","Proposal"), S_TITLE))
    story.append(Spacer(1, 4))
    # gold rule
    story.append(gold_rule(1.5*inch))
    story.append(Spacer(1, 8))
    # for/from
    client = intake.get("client",{})
    proj = intake.get("project",{})
    rows = [
        ("Prepared for", client.get("name","")),
        ("Contact",      f"{client.get('contact','')} · {client.get('email','')}"),
        ("Project site", addr_one_line(proj.get("address"))),
        ("Issued",       fmt_date(intake.get("issue_date"))),
        ("Valid for",    f"{intake.get('validity_days',30)} days"),
        ("Proposal no.", intake.get("proposal_no","")),
    ]
    if intake.get("project",{}).get("bid_due_date"):
        rows.insert(3, ("Bid due",   fmt_date(intake["project"]["bid_due_date"])))
    if intake.get("project",{}).get("bid_number"):
        rows.insert(4, ("Bid no.",   intake["project"]["bid_number"]))
    story.append(facts_block(rows))
    story.append(Spacer(1, 14))
    return story

def build_transmittal(intake):
    """Opening narrative — tuned by proposal type."""
    t = intake["proposal_type"]
    client = intake.get("client",{}).get("contact") or intake.get("client",{}).get("name")
    proj = intake.get("project",{})
    desc = (proj.get("description") or "").strip()

    if t == "formal-bid":
        opener = (
            f"Please find attached GCC's bid for the <b>{proj.get('name','')}</b> "
            f"low-voltage scope. Pricing is submitted per the bid documents and "
            f"held firm through the validity window stated on the cover. "
            f"All work will be performed in compliance with the project specifications, "
            f"the General Contract, and — where applicable — prevailing-wage requirements."
        )
    elif t == "direct-quote":
        opener = (
            f"{client}, thanks for reaching out. This quote covers the "
            f"<b>{proj.get('name','')}</b> scope we discussed. Pricing is held firm "
            f"through the date on the cover, and every cable we install carries our "
            f"standard lifetime workmanship warranty."
        )
    elif t == "residential-quote":
        opener = (
            f"Thanks for letting us quote <b>{proj.get('name','')}</b>. Below is "
            f"what we're proposing, what it costs, and what you can expect. "
            f"If anything here isn't clear, call or email me directly — no question "
            f"is too small."
        )
    elif t == "change-order":
        co = intake.get("change_order") or {}
        opener = (
            f"This change order <b>{co.get('co_number','')}</b> documents added "
            f"scope against the original project <b>{co.get('original_proposal','')}</b>. "
            f"All terms, warranties, and exclusions from the original proposal remain in force "
            f"except as specifically modified here."
        )
    else:
        opener = ""

    story = [h1(_opening_title(t)), lead(opener)]
    if desc:
        story.append(Spacer(1, 6))
        story.append(lead(desc.replace("\n\n", "<br/><br/>")))
    return story

def _opening_title(t):
    return {
        "formal-bid":        "Bid transmittal.",
        "direct-quote":      "What this quote covers.",
        "residential-quote": "Your project at a glance.",
        "change-order":      "Change order summary.",
    }.get(t, "Summary.")

def build_scope_narrative(intake):
    """Short narrative before the table — tuned by type."""
    t = intake["proposal_type"]
    if t == "formal-bid":
        return [h1("Scope of work."),
                lead("The following line items constitute GCC's base bid. "
                     "Quantities, descriptions, and unit prices are per the "
                     "attached schedule. Labor is priced to include all "
                     "mobilization, testing, and closeout. All Fluke DSX-8000 "
                     "certification testing and LinkWare PDF delivery are "
                     "included at no additional cost.")]
    if t == "direct-quote":
        return [h1("What we'll do."),
                lead("The scope below lays out the work line by line. "
                     "Prices are rolled up — labor and materials together — "
                     "so you see one price per line item. Fluke DSX-8000 "
                     "testing is included; you get the LinkWare PDF report "
                     "at closeout.")]
    if t == "residential-quote":
        return [h1("What's included."),
                lead("Here's what we're proposing, written out line by line. "
                     "Everything's priced at a single number per item — no "
                     "hidden labor charges, no surprise invoicing. Your "
                     "quote includes Fluke DSX-8000 certification on every "
                     "data drop, so you know the network is good before we "
                     "leave.")]
    if t == "change-order":
        return [h1("Added scope."),
                lead("The following items are being added to the original "
                     "contract. Unit prices are consistent with the original "
                     "proposal wherever scope matches.")]
    return []

def build_schedule(intake):
    proj = intake.get("project",{})
    start = fmt_date(proj.get("target_start"))
    finish = fmt_date(proj.get("target_finish"))
    if not (start or finish):
        return []
    rows = []
    if start:  rows.append(("Target start",  start))
    if finish: rows.append(("Target finish", finish))
    if proj.get("bid_due_date"):
        rows.append(("Bid due", fmt_date(proj["bid_due_date"])))
    return [h1("Schedule."), facts_block(rows)]

def build_notes(intake):
    notes = intake.get("notes") or []
    if not notes: return []
    items = []
    for n in notes:
        items.append([
            Paragraph("▪", _bullet_style()),
            Paragraph(n, S_BODY_I),
        ])
    t = Table(items, colWidths=[0.25*inch, 6.75*inch])
    t.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("BOTTOMPADDING",(0,0),(-1,-1),2),
        ("TOPPADDING",(0,0),(-1,-1),2),
    ]))
    return [h1("Project notes."), t]


def build_co_delta(intake):
    co = intake.get("change_order") or {}
    subtotal = sum(float(l.get("line_total") or 0) for l in intake.get("scope_lines") or [])
    revised = float(co.get("original_contract") or 0) + subtotal
    rows = [
        ("CO number",         co.get("co_number","")),
        ("Original proposal", co.get("original_proposal","")),
        ("Original contract", money(co.get("original_contract",0))),
        ("This CO total",     money(subtotal)),
        ("Revised contract",  money(revised)),
        ("Schedule impact",   f"+{co.get('schedule_impact_days',0)} days"),
    ]
    return [h1("Contract impact."), facts_block(rows)]

# =====================================================================
# MAIN
# =====================================================================
def build(intake_path, theme_name: str = "forest-canopy", out_dir: Path = None):
    theme = load_theme(theme_name)
    apply_theme(theme)

    intake = load_yaml(intake_path)
    enf = Enforcement()
    intake = enforce_rules(intake, enf)

    # --- filename
    if out_dir is None:
        out_dir = Path(__file__).parent / "out"
    out_dir.mkdir(exist_ok=True)
    slug_c = slugify(intake.get("client",{}).get("name","client"))
    theme_tag = f"_{theme_name}" if theme_name != "forest-canopy" else ""
    fn = f"{intake.get('proposal_no','proposal')}_{slug_c}_{intake['proposal_type']}{theme_tag}.pdf"
    out_path = out_dir / fn

    # --- document
    doc = BaseDocTemplate(
        str(out_path),
        pagesize=LETTER,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.85*inch, bottomMargin=0.85*inch,
        title=f"{intake.get('proposal_no','')} — {intake.get('project',{}).get('name','')}",
        author="GCC LLC",
    )
    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        doc.width, doc.height, id="normal",
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="std", frames=[frame],
        onPage=lambda c,d: draw_frame(c, d, intake))])

    story = []

    # --- COVER / TRANSMITTAL
    story.extend(build_cover(intake))
    story.extend(build_transmittal(intake))
    story.append(Spacer(1, 8))

    # --- SCOPE
    story.extend(build_scope_narrative(intake))
    story.append(Spacer(1, 6))
    story.append(scope_table(intake.get("scope_lines") or []))
    story.append(Spacer(1, 10))

    # --- TOTALS
    subtotal = sum(float(l.get("line_total") or 0) for l in intake.get("scope_lines") or [])
    pct = intake.get("loyalty_discount_pct", 0) or 0
    discount = subtotal * (pct/100.0)
    total = subtotal - discount
    msp_monthly = None
    for a in (intake.get("alternates") or []):
        if "managed" in (a.get("name","").lower()):
            msp_monthly = a.get("monthly")
            break
    story.append(totals_block(subtotal, pct, total, msp_monthly=msp_monthly))
    story.append(Spacer(1, 10))

    # --- EXCLUSIONS
    excl = exclusions_block(intake)
    if excl:
        story.append(h1("What we're not including."))
        story.append(excl)
        story.append(Spacer(1, 10))

    # --- ALTERNATES (MSP always — §1.2)
    alt = alternate_block(intake)
    if alt:
        story.append(h1("Optional — Managed Services alternate."))
        story.append(lead(
            "Monthly service beyond commissioning. Priced separately and not "
            "included in the total above. Accept or decline — if declined, "
            "please acknowledge in writing."
        ))
        story.append(Spacer(1, 6))
        story.append(alt)
        story.append(Spacer(1, 10))

    # --- WARRANTY (§1.4 verbatim) — keep heading with block
    story.append(KeepTogether([
        h1("Warranty."),
        warranty_block(),
    ]))
    story.append(Spacer(1, 10))

    # --- SCHEDULE
    sch = build_schedule(intake)
    if sch:
        story.extend(sch)
        story.append(Spacer(1, 10))

    # --- CHANGE-ORDER DELTA
    if intake["proposal_type"] == "change-order":
        story.extend(build_co_delta(intake))
        story.append(Spacer(1, 10))

    # --- NOTES
    nt = build_notes(intake)
    if nt:
        story.extend(nt)
        story.append(Spacer(1, 10))

    # --- TERMS
    story.append(h1("Terms."))
    story.append(terms_block(intake))
    story.append(Spacer(1, 14))

    # --- SIGNATURES
    story.append(h1("Acceptance."))
    story.append(signature_block(intake))

    doc.build(story)
    return out_path, enf, intake

def main():
    from theming import available_themes
    theme_choices = sorted(available_themes().keys()) or ["forest-canopy"]

    ap = argparse.ArgumentParser(
        description="Generate a themed GCC proposal PDF from a YAML intake.",
    )
    ap.add_argument("intake", help="Path to YAML intake file")
    ap.add_argument(
        "--theme", choices=theme_choices, default="forest-canopy",
        help=f"Visual theme to apply (default: forest-canopy). Choices: {', '.join(theme_choices)}"
    )
    ap.add_argument(
        "--out-dir", default=None,
        help="Output directory (default: proposal-generator/out)"
    )
    args = ap.parse_args()

    out_dir = Path(args.out_dir) if args.out_dir else None
    out_path, enf, intake = build(args.intake, theme_name=args.theme, out_dir=out_dir)
    print(f"OK: {out_path}")
    print(f"Size: {out_path.stat().st_size:,} bytes")
    print(f"Theme: {ACTIVE_THEME.label} — {ACTIVE_THEME.philosophy}")
    print(enf.report())
    if enf.errors:
        sys.exit(1)

if __name__ == "__main__":
    main()
