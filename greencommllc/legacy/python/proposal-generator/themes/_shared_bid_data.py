"""Shared bid data for theme showcases — single source of truth."""

PROPOSAL_NO = "GCC-2026-0101"
ISSUE_DATE = "April 20, 2026"
BID_DUE = "May 08, 2026"
VALIDITY = "60 days"

CLIENT = {
    "name":    "Straub Construction Co.",
    "contact": "Alan Brooks",
    "title":   "Senior Project Manager",
    "email":   "abrooks@straubconstruction.com",
    "phone":   "+1 913 555 0142",
}

PROJECT = {
    "title":   "William Chrisman High School",
    "subtitle":"2026 Renovations — Low-Voltage Package",
    "addr":    "1223 N Noland Rd. · Independence, MO 64050",
    "vertical":"K-12 · Public Work",
    "bid_no":  "ISD-2026-014",
    "start":   "Jun 09, 2026",
    "finish":  "Aug 15, 2026",
}

SCOPE = [
    (480, "ea", "Cat6A plenum data drops",           "classroom & admin outlets",            86.50,  41520.00),
    (6,   "ls", "MDF / IDF rack buildout",           "6 closets · 45U racks + cable mgmt", 15200.00, 91200.00),
    (6,   "ls", "Inter-closet fiber backbone",       "12-strand OS2 single-mode · MDF→IDFs", 6200.00, 37200.00),
    (42,  "ea", "IP CCTV rough-in",                  "Cat6A home-runs · terminated",         215.00,  9030.00),
    (18,  "ea", "Access-control rough-in",           "DPS / REX / reader / strike",          485.00,  8730.00),
    (1,   "ls", "Fluke DSX-8000 certification",      "all data & fiber · LinkWare PDF",      4200.00, 4200.00),
]
SUBTOTAL = sum(row[5] for row in SCOPE)
TOTAL    = SUBTOTAL   # no discount on public-work bid
MSP_MO   = 985.00
MSP_YR   = 11820.00

PREPARED_BY = ("Nathan Morris", "CTO", "nmorris@greencommllc.com", "636-224-8192")
APPROVED_BY = ("Kaitlyn Lim Morris", "CEO")

FONT_DIR = "/sessions/gifted-compassionate-gates/mnt/.claude/skills/canvas-design/canvas-fonts"


def money(n):
    return f"${n:,.2f}"
