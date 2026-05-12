"""
Bid Overview Builder — GCC LV Div27-28

Fills the 02 Bid Overview template with job-specific values.

Architecture: template-filler. Opens 1-Bids/Templates/Standard/02 Bid Overview.docx,
replaces {{TOKEN}} placeholders with job data, saves to AI_DRIVE_OUTPUT/.

The 02 Bid Overview is the 1-page executive summary that shows:
  · Base Bid hero (48pt Forest Green)
  · Scope snapshot (quantities)
  · Why GCC (4 gold-dot bullets including Cat6A baseline)
  · Schedule (mobilize, substantial completion, final)
  · Key terms (payment, warranty, cable spec)
  · Alternates included reference

Usage:
    from Bid_Overview_Builder import build_bid_overview

    build_bid_overview(job_data={
        "PROJECT_NAME": "Springhill Suites Marriott",
        "PROJECT_CITY_STATE": "Lee's Summit, MO",
        "GC_NAME": "McCarthy Building Companies",
        "BID_DATE": "April 20, 2026",
        "BASE_BID": "248,500",
        "MS_TIER": "Team",
        "SCOPE_DATA_DROPS": "170",
        "SCOPE_WAPS": "28",
        "SCOPE_CAMERAS": "12",
        "SCOPE_ACS_DOORS": "6",
        "SCOPE_FIBER_STRANDS": "24",
        "SCOPE_MDF_IDFS": "1 MDF + 2 IDF",
        "MOBILIZE_DATE": "2026-06-15",
        "SUBSTANTIAL_COMPLETION": "2026-09-30",
        "FINAL_COMPLETION": "2026-10-15",
    })

Governance source: 1-Bids/Format Guide.md §02 Bid Overview
Template: 1-Bids/Templates/Standard/02 Bid Overview.docx
Output: AI_DRIVE_OUTPUT/02 Bid Overview - {PROJECT_NAME}.docx

Author: GCC LV Div27-28
"""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

# Locate Template Filler module (sibling script)
_THIS_DIR = Path(__file__).parent if "__file__" in dir() else Path(".")
_TEMPLATE_FILLER_PATH = _THIS_DIR / "Template Filler.py"

# Fallback for execution contexts where __file__ is undefined
if not _TEMPLATE_FILLER_PATH.exists():
    _candidates = [
        Path("1-Bids/Templates/Scripts/Template Filler.py"),
        Path("/home/user/1-Bids/Templates/Scripts/Template Filler.py"),
        Path.cwd() / "Template Filler.py",
    ]
    for c in _candidates:
        if c.exists():
            _TEMPLATE_FILLER_PATH = c
            break


def _import_template_filler():
    spec = importlib.util.spec_from_file_location("template_filler", _TEMPLATE_FILLER_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build_bid_overview(job_data, template_path=None, output_name=None):
    """
    Fill 02 Bid Overview template with job_data.

    Args:
        job_data: Dict with tokens to fill. Required tokens:
            PROJECT_NAME, PROJECT_CITY_STATE, GC_NAME, BID_DATE, BASE_BID,
            MS_TIER, SCOPE_DATA_DROPS, SCOPE_WAPS, SCOPE_CAMERAS,
            SCOPE_ACS_DOORS, SCOPE_FIBER_STRANDS, SCOPE_MDF_IDFS,
            MOBILIZE_DATE, SUBSTANTIAL_COMPLETION, FINAL_COMPLETION.
        template_path: Override default template location.
        output_name: Override default output filename.

    Returns:
        Path to filled .docx.
    """
    if template_path is None:
        template_path = "1-Bids/Templates/Standard/02 Bid Overview.docx"

    if output_name is None:
        proj = job_data.get("PROJECT_NAME", "UNTITLED").replace("/", "-")
        output_name = f"02 Bid Overview - {proj}.docx"

    tf = _import_template_filler()

    # Validate required tokens
    required = {
        "PROJECT_NAME", "PROJECT_CITY_STATE", "GC_NAME", "BID_DATE", "BASE_BID",
        "MS_TIER", "SCOPE_DATA_DROPS", "SCOPE_WAPS", "SCOPE_CAMERAS",
        "SCOPE_ACS_DOORS", "SCOPE_FIBER_STRANDS", "SCOPE_MDF_IDFS",
        "MOBILIZE_DATE", "SUBSTANTIAL_COMPLETION", "FINAL_COMPLETION",
    }
    missing = required - set(job_data.keys())
    if missing:
        print(f"[WARN] job_data missing required tokens: {', '.join(sorted(missing))}")
        print(f"       Template will render with these unresolved.")

    out = tf.fill_template(template_path, job_data, output_name)
    print(f"[OK] 02 Bid Overview built for: {job_data.get('PROJECT_NAME', '?')}")
    return out


if __name__ == "__main__":
    # Demo fill
    demo = {
        "PROJECT_NAME": "DEMO Project",
        "PROJECT_CITY_STATE": "DEMO City, ST",
        "GC_NAME": "DEMO GC",
        "BID_DATE": "2026-01-01",
        "BASE_BID": "100,000",
        "MS_TIER": "Team",
        "SCOPE_DATA_DROPS": "100",
        "SCOPE_WAPS": "12",
        "SCOPE_CAMERAS": "6",
        "SCOPE_ACS_DOORS": "4",
        "SCOPE_FIBER_STRANDS": "24",
        "SCOPE_MDF_IDFS": "1 MDF + 1 IDF",
        "MOBILIZE_DATE": "2026-01-01",
        "SUBSTANTIAL_COMPLETION": "2026-03-31",
        "FINAL_COMPLETION": "2026-04-15",
    }
    build_bid_overview(demo)
