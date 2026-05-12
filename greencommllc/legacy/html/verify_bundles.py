#!/usr/bin/env python3
"""verify_bundles.py

Decomposes the estimator's composite per-unit bundle rates into the atomic
SKUs that live in the Master Catalog, recomputes each bundle buildup from
Sheet 1 (Equipment), Sheet 2 (Materials), and Sheet 3 (Services) actuals,
and reports the delta vs. the calculator's hard-coded planning rate.

Source:
  estimate-calculator.html  → RATES  (planning rate, ALL-IN per unit)
  3-Intake/4-Company/Pricing/Master Catalog.md  →  atomic sale prices

PASS bands (the calculator's planning rates include a 0.85x…1.20x range):
  green     | buildup is within +/- 10 % of the bundle rate
  yellow    | buildup drifts 10-20 % either direction
  red       | buildup drifts > 20 % — re-baseline the bundle

Run:
  python build_proposal_pdf.py   # unrelated
  python verify_bundles.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

# ---------------------------------------------------------------------------
# Atomic sale prices pulled from the Master Catalog (Forest Green sheet).
# Every number below is the SALE price (not the internal cost basis). All
# per-foot cable prices are computed from the $/1000 ft published unit.
# ---------------------------------------------------------------------------

CATALOG = {
    # --- Sheet 2: Materials --------------------------------------------------
    "CAT6A_PLENUM_FT":       0.595,   # Belden 10GXS12 — $595/1000 ft sale
    "CAT6A_JACK":           12.00,    # NKP6X88MY* — shielded keystone jack
    "CAT6A_FACEPLATE_2PORT": 7.00,    # CFP2SY — allocated at 1/2 per drop
    "CAT6A_PATCHCORD_3FT":   9.00,    # UTP28X3BU — jack-side patch
    "CAT6A_PATCHCORD_7FT":  12.00,    # UTP28X7BU — switch-side patch
    "CAT6A_PP48":          555.00,    # NKPP48Y-6A — 48-port shielded panel

    "OS2_SMF_12_FT":         0.975,   # Corning AW2012 — $975/1000 ft sale
    "OM4_MMF_12_FT":         1.255,   # Corning AE2212 — $1255/1000 ft sale
    "LC_ADAPTER_24":       135.00,    # FAP24WBUDLCZ — 24-port LC adapter
    "FIBER_WALL_ENCL":     415.00,    # FWME2 — 6-adapter wall enclosure
    "LC_LC_OS2_3M":         22.00,    # FJLCOS2-03 — duplex patch cord
    "LC_PIGTAIL_SM":        31.00,    # FOTP7Y-01.5 — LC pigtail SM 1.5m

    # --- Sheet 1: Equipment --------------------------------------------------
    "USW_PRO_48_POE":     1535.00,    # switch — 48-port PoE L3
    "U7_PRO":              265.00,    # ceiling WiFi 7 AP
    "U7_PRO_MAX":          389.00,    # 8-stream ceiling WiFi 7 AP
    "G6_PRO_BULLET":       669.00,    # 4K AI bullet — commercial default
    "G6_BULLET":           279.00,    # 4K AI bullet — value tier
    "UNVR":                419.00,    # 4-bay NVR
    "UNVR_PRO":            699.00,    # 7-bay NVR
    "UA_HUB":              388.00,    # 4-door access hub
    "UA_G3":               223.00,    # reader G3
    "UA_KEYPAD":           279.00,    # PIN keypad
    "UA_INTERCOM":         555.00,    # outdoor video intercom
    "UA_INTERCOM_VIEWER":  279.00,    # indoor answering station
    "DOOR_CONTACT":         18.00,    # Honeywell/GRI recessed contact (allowance)
    "MOTION_PIR":           58.00,    # dual-tech PIR (allowance)
    "GLASSBREAK":           72.00,    # acoustic glassbreak (allowance)
    "AV_WALLPLATE_HDMI":    85.00,    # HDMI wall plate allowance
    "REX_PIR":              89.00,    # request-to-exit (allowance)

    # --- Sheet 3: Services ---------------------------------------------------
    "SVC_DATA_DROP":       100.00,    # Cat6A Data Drop complete
    "SVC_CAM_DROP":        150.00,    # Cat6A Camera Drop complete
    "SVC_WAP_DROP":        125.00,    # Cat6A WAP Drop complete
    "SVC_ACS_DOOR":        250.00,    # ACS door cable composite
    "SVC_CAM_INSTALL":     225.00,    # Camera mount + aim + configure
    "SVC_AV_DROP":         100.00,    # HDMI active drop
    "SVC_TERM_PORT":         8.30,    # per-port termination
    "SVC_FLUKE_CERT":        8.30,    # per-port Fluke cert
    "SVC_FIBER_FUSION":     25.00,    # per-strand fusion splice
    "SVC_OTDR":             50.00,    # per-run OTDR cert
    "SVC_MDF":            2000.00,    # MDF full buildout
    "SVC_IDF":             800.00,    # IDF buildout
    "SVC_RACK_42U":        800.00,    # 42U rack assembly
    "SVC_CLOSEOUT":        750.00,    # closeout package
}

# Shorthand for nicer buildup expressions
C = CATALOG


# ---------------------------------------------------------------------------
# Bundle definitions.  Each bundle mirrors one line in estimate-calculator.html
# RATES.  The `lines` list is what the calculator sale rate is PAYING FOR —
# expressed atomically.  `rate` is the calculator's hard-coded per-unit rate.
# ---------------------------------------------------------------------------

@dataclass
class Line:
    sku: str
    qty: float
    unit: str
    unit_sale: float

    @property
    def line_total(self) -> float:
        return round(self.qty * self.unit_sale, 2)


@dataclass
class Bundle:
    key: str                 # matches RATES key, e.g. "div27.data"
    label: str
    unit: str
    rate: float              # calculator's per-unit planning rate
    lines: List[Line] = field(default_factory=list)
    note: str = ""

    @property
    def buildup(self) -> float:
        return round(sum(l.line_total for l in self.lines), 2)

    @property
    def delta(self) -> float:
        return round(self.buildup - self.rate, 2)

    @property
    def delta_pct(self) -> float:
        return round((self.buildup - self.rate) / self.rate * 100, 1)

    @property
    def status(self) -> str:
        pct = abs(self.delta_pct)
        if pct <= 10:
            return "PASS"
        if pct <= 20:
            return "REVIEW"
        return "FLAG"


def build_bundles() -> List[Bundle]:
    bundles: List[Bundle] = []

    # ---- DIV 27 ------------------------------------------------------------
    # Data Drop — ~125 LF run, keystone jack at the wall, patch cord at the
    # switch, half of a 2-port faceplate allocated, 1/48th of a 48-port
    # patch panel allocated, plus the Cat6A Data Drop service (pull + term
    # + test + label), plus an allocated switch port (1/48th of a Pro 48 PoE).
    bundles.append(Bundle(
        key="div27.data",
        label="Data Drop (per drop, all-in)",
        unit="drop",
        rate=225.00,
        note="Bundle assumes 125 LF Cat6A plenum + jack + faceplate share + patch cords + patch-panel allocation + switch-port allocation + install labor.",
        lines=[
            Line("CAT6A_PLENUM_FT",     125,    "ft",  C["CAT6A_PLENUM_FT"]),
            Line("CAT6A_JACK",          1,      "ea",  C["CAT6A_JACK"]),
            Line("CAT6A_FACEPLATE_2PORT", 0.5,  "ea",  C["CAT6A_FACEPLATE_2PORT"]),
            Line("CAT6A_PATCHCORD_3FT", 1,      "ea",  C["CAT6A_PATCHCORD_3FT"]),
            Line("CAT6A_PATCHCORD_7FT", 1,      "ea",  C["CAT6A_PATCHCORD_7FT"]),
            Line("CAT6A_PP48_ALLOC",    1/48,   "port", C["CAT6A_PP48"]),
            Line("USW_PRO_48_POE_ALLOC", 1/48,  "port", C["USW_PRO_48_POE"]),
            Line("SVC_DATA_DROP",       1,      "drop", C["SVC_DATA_DROP"]),
        ],
    ))

    # Fiber run — 100 LF of OS2 12-strand, fusion splice both ends, LC patch
    # pair, allocated share of a wall enclosure + LC adapter panel, plus one
    # OTDR cert per run.  Note: "fiber" in the calculator is per RUN, not per
    # strand.  A 12-strand run typically fans out into 12 strands of splice.
    bundles.append(Bundle(
        key="div27.fiber",
        label="Fiber Run (per run, all-in)",
        unit="run",
        rate=550.00,
        note="Bundle assumes 100 LF OS2 12-strand plenum + 12-strand fusion at both ends + LC pigtails + allocated share of wall enclosure + adapter panel + OTDR cert.",
        lines=[
            Line("OS2_SMF_12_FT",       100,    "ft",    C["OS2_SMF_12_FT"]),
            Line("LC_PIGTAIL_SM",       4,      "ea",    C["LC_PIGTAIL_SM"]),   # 2 pigtails x 2 ends
            Line("LC_LC_OS2_3M",        2,      "ea",    C["LC_LC_OS2_3M"]),    # 2 patch cords
            Line("LC_ADAPTER_24_ALLOC", 0.125,  "panel", C["LC_ADAPTER_24"]),   # 3 of 24 ports
            Line("FIBER_WALL_ENCL_ALLOC", 0.25, "encl",  C["FIBER_WALL_ENCL"]), # 1 enclosure / 4 runs
            Line("SVC_FIBER_FUSION",    4,      "strand", C["SVC_FIBER_FUSION"]), # 2 strand pairs x 2 ends
            Line("SVC_OTDR",            1,      "run",   C["SVC_OTDR"]),
        ],
    ))

    # TR Room — full MDF buildout, a 48-port switch, 2x patch panels, rack,
    # fiber enclosure + adapter, closeout share, ground/bonding incidentals.
    bundles.append(Bundle(
        key="div27.tr",
        label="TR / MDF Buildout (per room)",
        unit="tr",
        rate=13_000.00,
        note="Bundle assumes 42U rack + 1x 48-port switch + 1x UDM-Pro-Max + 2x 48-port patch panels + fiber enclosure + adapter + MDF buildout labor + closeout share. Does NOT include UPS, PDU, firewall — those bid as line items.",
        lines=[
            Line("RACK_42U_ASSEMBLY",   1,      "rack",  C["SVC_RACK_42U"]),
            Line("SVC_MDF",             1,      "mdf",   C["SVC_MDF"]),
            Line("USW_PRO_48_POE",      1,      "ea",    C["USW_PRO_48_POE"]),
            Line("UDM_PRO_MAX",         1,      "ea",    825.00),   # from catalog line 24
            Line("CAT6A_PP48",          2,      "ea",    C["CAT6A_PP48"]),
            Line("LC_ADAPTER_24",       1,      "ea",    C["LC_ADAPTER_24"]),
            Line("FIBER_WALL_ENCL",     1,      "ea",    C["FIBER_WALL_ENCL"]),
            Line("RACK_PDU",            1,      "ea",    275.00),    # AP9571A
            Line("RACK_UPS_2U",         1,      "ea",    1255.00),   # SMT1500RM2UC
            Line("GROUND_BAR",          1,      "ea",    135.00),    # RGRB19U
            Line("SVC_CLOSEOUT_ALLOC",  0.5,    "pkg",   C["SVC_CLOSEOUT"]),
            Line("RACK_CABLE_MGR_ALLOW", 1,     "lot",   400.00),    # J-hooks + ladder tray allowance
            # Headroom — PM, test windows, RCDD review time, etc.
            Line("ENGINEERING_ALLOW",   1,      "lot",   1500.00),
            Line("MATERIALS_MARKUP",    1,      "lot",   600.00),    # 10% on hardware
        ],
    ))

    # WAP — Cat6A WAP drop + ceiling AP + mount labor + tuning share.
    # NOTE: the WAP drop service INCLUDES AP mount + ceiling access + test,
    # so we don't add separate install labor on top.
    bundles.append(Bundle(
        key="div27.wap",
        label="Wireless AP (per AP, all-in)",
        unit="wap",
        rate=550.00,
        note="Bundle assumes Cat6A WAP drop (100 LF) + UniFi U7 Pro ceiling AP + mount + ceiling access + tuning. Controller priced at the TR level.",
        lines=[
            Line("CAT6A_PLENUM_FT",     100,    "ft",    C["CAT6A_PLENUM_FT"]),
            Line("CAT6A_JACK",          1,      "ea",    C["CAT6A_JACK"]),
            Line("CAT6A_PATCHCORD_7FT", 1,      "ea",    C["CAT6A_PATCHCORD_7FT"]),
            Line("CAT6A_PP48_ALLOC",    1/48,   "port",  C["CAT6A_PP48"]),
            Line("USW_PRO_48_POE_ALLOC", 1/48,  "port",  C["USW_PRO_48_POE"]),
            Line("U7_PRO",              1,      "ea",    C["U7_PRO"]),
            Line("SVC_WAP_DROP",        1,      "drop",  C["SVC_WAP_DROP"]),
        ],
    ))

    # AV endpoint — HDMI active drop + wall plate + display controller share.
    # Does NOT include the display itself (FF&E).
    bundles.append(Bundle(
        key="div27.av",
        label="AV Endpoint (per endpoint, all-in)",
        unit="av",
        rate=2_200.00,
        note="Bundle assumes HDMI active drop + dual Cat6A for control + HDMI wall plate + speaker allowance + rack-ear controller share + trim labor. Does NOT include displays, speakers bigger than budget, or processors.",
        lines=[
            Line("CAT6A_PLENUM_FT",     150,    "ft",    C["CAT6A_PLENUM_FT"]),
            Line("CAT6A_PLENUM_FT_2",   150,    "ft",    C["CAT6A_PLENUM_FT"]),  # second data for control
            Line("CAT6A_JACK",          2,      "ea",    C["CAT6A_JACK"]),
            Line("CAT6A_PATCHCORD_7FT", 2,      "ea",    C["CAT6A_PATCHCORD_7FT"]),
            Line("AV_WALLPLATE_HDMI",   1,      "ea",    C["AV_WALLPLATE_HDMI"]),
            Line("SVC_AV_DROP",         1,      "drop",  C["SVC_AV_DROP"]),
            Line("SVC_DATA_DROP",       1,      "drop",  C["SVC_DATA_DROP"]),
            # Controller, DSP, amplifier, speaker allowance and trim labor
            Line("AV_CONTROLLER_ALLOW", 1,      "lot",   650.00),
            Line("AV_SPEAKER_ALLOW",    1,      "lot",   350.00),
            Line("AV_TRIM_LABOR",       4,      "hr",    100.00),   # 4 hrs program + verify
        ],
    ))

    # ---- DIV 28 ------------------------------------------------------------
    # Camera — Cat6A camera drop + camera + install labor + NVR allocation.
    # A $1,200 per-camera all-in planning rate.
    bundles.append(Bundle(
        key="div28.cam",
        label="IP Camera (per camera, all-in)",
        unit="camera",
        rate=1_200.00,
        note="Bundle assumes Cat6A camera drop (150 LF) + G6 Pro Bullet + mount + aim + configure + 1/24th NVR + 1/48th patch panel + 1/48th PoE port.",
        lines=[
            Line("CAT6A_PLENUM_FT",     150,    "ft",    C["CAT6A_PLENUM_FT"]),  # plenum green
            Line("CAT6A_JACK",          1,      "ea",    C["CAT6A_JACK"]),
            Line("CAT6A_PATCHCORD_7FT", 1,      "ea",    C["CAT6A_PATCHCORD_7FT"]),
            Line("CAT6A_PP48_ALLOC",    1/48,   "port",  C["CAT6A_PP48"]),
            Line("USW_PRO_48_POE_ALLOC", 1/48,  "port",  C["USW_PRO_48_POE"]),
            Line("G6_PRO_BULLET",       1,      "ea",    C["G6_PRO_BULLET"]),
            Line("UNVR_PRO_ALLOC",      1/24,   "slot",  C["UNVR_PRO"]),
            Line("SVC_CAM_DROP",        1,      "drop",  C["SVC_CAM_DROP"]),
            Line("SVC_CAM_INSTALL",     1,      "cam",   C["SVC_CAM_INSTALL"]),
        ],
    ))

    # Access-controlled door — reader + hub allocation + door hardware
    # allowance (strike, REX, contact, EOLs) + ACS-door cable composite
    # (reader prep already in the service).
    bundles.append(Bundle(
        key="div28.acd",
        label="Access-Controlled Door (per door, all-in)",
        unit="door",
        rate=2_900.00,
        note="Bundle assumes UA Hub allocation (1/4 of 4-door hub) + UA G3 reader + REX + 2x contact + electric strike allowance + door hardware labor + ACS composite.",
        lines=[
            Line("UA_HUB_ALLOC",        0.25,   "hub",   C["UA_HUB"]),
            Line("UA_G3",               1,      "ea",    C["UA_G3"]),
            Line("REX_PIR",             1,      "ea",    C["REX_PIR"]),
            Line("DOOR_CONTACT",        1,      "ea",    C["DOOR_CONTACT"]),
            Line("CAT6A_PLENUM_FT",     100,    "ft",    C["CAT6A_PLENUM_FT"]),
            Line("CAT6A_JACK",          1,      "ea",    C["CAT6A_JACK"]),
            Line("CAT6A_PP48_ALLOC",    1/48,   "port",  C["CAT6A_PP48"]),
            Line("USW_PRO_48_POE_ALLOC", 1/48,  "port",  C["USW_PRO_48_POE"]),
            Line("SVC_ACS_DOOR",        1,      "door",  C["SVC_ACS_DOOR"]),
            # Lock/strike + door closer + power supply allowance
            Line("DOOR_LOCK_ALLOW",     1,      "lot",   650.00),
            Line("ACS_PS_ALLOC",        1/4,    "ps",    500.00),   # 4-door PSU allocated
            Line("ACS_PROGRAM_LABOR",   2,      "hr",    100.00),   # credentials + rules
            Line("DOOR_HW_LABOR",       4,      "hr",    100.00),   # install door hardware
            # Materials markup share
            Line("MATERIALS_MARKUP",    1,      "lot",   200.00),
        ],
    ))

    # Intrusion zone — contact or glassbreak + 125 LF homerun + term + cert
    # + zone-share of panel.  Zones are the CHEAPEST line item in the
    # calculator because they're almost all contacts.
    bundles.append(Bundle(
        key="div28.intru",
        label="Intrusion Zone (per zone, all-in)",
        unit="zone",
        rate=300.00,
        note="Bundle assumes contact OR motion OR glassbreak (contact default) + 125 LF 22/4 cable + 2x EOL resistors + 1/16th share of an 8-zone panel + 5 min term + 5 min cert.",
        lines=[
            Line("DOOR_CONTACT",        1,      "ea",    C["DOOR_CONTACT"]),
            # 22/4 is cheaper than Cat6A; approximate from catalog absence
            # using Cat6A riser as conservative stand-in
            Line("LV_CABLE_125FT",      125,    "ft",    0.40),   # 22/4 shielded alarm cable
            Line("EOL_RESISTORS",       2,      "ea",    1.50),
            Line("PANEL_ZONE_ALLOC",    1/16,   "zone",  1400.00),   # DSC/Bosch 16-zone panel
            Line("SVC_TERM_PORT",       2,      "port",  C["SVC_TERM_PORT"]),
            Line("SVC_FLUKE_CERT",      1,      "port",  C["SVC_FLUKE_CERT"]),
            # Mount + program labor
            Line("INTRUSION_LABOR",     1.5,    "hr",    100.00),
        ],
    ))

    # Intercom station — UniFi Access Intercom + indoor viewer + two data
    # drops (outside + inside) + programming.  Power via PoE from switch.
    bundles.append(Bundle(
        key="div28.intercom",
        label="Intercom Station (per station, all-in)",
        unit="station",
        rate=1_200.00,
        note="Bundle assumes UA Intercom + UA Intercom Viewer + 2x Cat6A drops + PoE from existing switch + programming.",
        lines=[
            Line("UA_INTERCOM",         1,      "ea",    C["UA_INTERCOM"]),
            Line("UA_INTERCOM_VIEWER",  1,      "ea",    C["UA_INTERCOM_VIEWER"]),
            Line("CAT6A_PLENUM_FT",     200,    "ft",    C["CAT6A_PLENUM_FT"]),   # 2x 100 LF
            Line("CAT6A_JACK",          2,      "ea",    C["CAT6A_JACK"]),
            Line("CAT6A_PATCHCORD_7FT", 2,      "ea",    C["CAT6A_PATCHCORD_7FT"]),
            Line("SVC_DATA_DROP",       2,      "drop",  C["SVC_DATA_DROP"]),
            Line("INTERCOM_PROGRAM",    1,      "hr",    100.00),
        ],
    ))

    return bundles


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def fmt_money(x: float) -> str:
    return f"${x:,.2f}"


def render(bundles: List[Bundle]) -> str:
    out = []
    out.append("=" * 92)
    out.append("GCC Estimator — Bundle Math Verification")
    out.append("Built from /3-Intake/4-Company/Pricing/Master Catalog.md (sale prices)")
    out.append("Calculator rates from estimator/estimate-calculator.html")
    out.append("PASS band: delta within +/- 10 %   |  REVIEW: 10-20 %  |  FLAG: > 20 %")
    out.append("=" * 92)
    out.append("")

    # Summary first
    out.append(f"{'bundle key':<18} {'rate':>10}  {'buildup':>10}  {'delta':>10}  {'%':>7}  status")
    out.append("-" * 92)
    for b in bundles:
        pct = b.delta_pct
        sign = "+" if pct >= 0 else ""
        out.append(
            f"{b.key:<18} {fmt_money(b.rate):>10}  {fmt_money(b.buildup):>10}  "
            f"{fmt_money(b.delta):>10}  {sign}{pct:>5.1f}%  {b.status}"
        )
    out.append("")
    out.append("=" * 92)
    out.append("")

    # Detail per bundle
    for b in bundles:
        out.append(f"### {b.label}   [{b.key}]   {b.unit}")
        if b.note:
            out.append(f"    note: {b.note}")
        out.append(f"    {'SKU':<28} {'qty':>8}  {'unit':<8} {'unit sale':>10}  {'line total':>12}")
        out.append(f"    {'-' * 72}")
        for ln in b.lines:
            out.append(
                f"    {ln.sku:<28} {ln.qty:>8.3g}  {ln.unit:<8} "
                f"{fmt_money(ln.unit_sale):>10}  {fmt_money(ln.line_total):>12}"
            )
        out.append(f"    {'buildup total':<28} {' ' * 8}  {' ' * 8} {' ' * 10}  "
                   f"{fmt_money(b.buildup):>12}")
        out.append(f"    calc rate = {fmt_money(b.rate)}  |  delta = {fmt_money(b.delta)}  "
                   f"({b.delta_pct:+.1f} %)  |  {b.status}")
        out.append("")

    # Summary + recommendations
    total_bundles = len(bundles)
    passing = sum(1 for b in bundles if b.status == "PASS")
    reviews = sum(1 for b in bundles if b.status == "REVIEW")
    flags   = sum(1 for b in bundles if b.status == "FLAG")
    out.append("=" * 92)
    out.append(f"Verified {total_bundles} bundles.  PASS: {passing}   REVIEW: {reviews}   FLAG: {flags}")
    out.append("")
    if flags:
        out.append("Action: FLAG bundles drift > 20 %.  Re-baseline the calculator rate.")
    if reviews:
        out.append("Action: REVIEW bundles drift 10-20 %.  Acceptable if customer range (0.85x-1.20x)")
        out.append("        still spans the catalog buildup; otherwise bump the rate at the next refresh.")
    if not flags and not reviews:
        out.append("All bundles within the green band. Ship as-is.")
    out.append("=" * 92)
    return "\n".join(out)


def main() -> None:
    bundles = build_bundles()
    report = render(bundles)
    print(report)


if __name__ == "__main__":
    main()
