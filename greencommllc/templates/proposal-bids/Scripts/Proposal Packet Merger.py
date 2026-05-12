"""
Proposal Packet Merger — GCC LV Div27-28

Merges every PDF section from a job's Client/Proposal/v#/ folder into a single
client-ready Proposal Packet PDF. Output is doc 00 of the packet. PDF bookmarks
generated per section serve as the navigable Table of Contents — no standalone
TOC document is produced.

Naming convention (governance-mandated):
    GCC LV Div27-28 - {GC Name} Proposal Packet - {Site Name}.pdf

Merge order (per Format Guide §Packet Order):
    01 Cover Letter
    02 Bid Overview
    03 Bid Proposal
    04 Statement of Work
    05 Qualifications
    06 Standards
    07+ (any conditional sections present, numbered in filename)

Governance source: 1-Bids/Format Guide.md §Proposal Packet Merge,
                   memory ## Proposal Packet Rules

Usage:
    python "Proposal Packet Merger.py" --folder "5-Jobs/2. In Progress - #/<job>/Client/Proposal/v1" --gc "McCarthy" --site "Springhill Suites"

Author: GCC LV Div27-28
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from pypdf import PdfWriter, PdfReader

OUTPUT_DIR = Path("/home/user/AI_DRIVE_OUTPUT")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================================================
# Naming
# ==========================================================================

def build_packet_filename(gc_name, site_name):
    """Enforce governance naming: GCC LV Div27-28 - {GC} Proposal Packet - {Site}.pdf"""
    gc_name = gc_name.strip().replace("/", "-")
    site_name = site_name.strip().replace("/", "-")
    return f"GCC LV Div27-28 - {gc_name} Proposal Packet - {site_name}.pdf"


# ==========================================================================
# Section discovery
# ==========================================================================

SECTION_NUMBER_RE = re.compile(r"^(\d{2})\s+(.+?)\.pdf$", re.IGNORECASE)


def discover_sections(folder):
    """
    Return ordered list of (section_num, pretty_name, path) for PDFs in folder.
    Ignores: existing Proposal Packet PDFs, any non-numbered PDFs, Past Versions.
    """
    folder = Path(folder)
    if not folder.exists():
        raise FileNotFoundError(f"Proposal folder not found: {folder}")

    sections = []
    for item in sorted(folder.iterdir()):
        # Skip subfolders (incl. Past Versions)
        if item.is_dir():
            continue
        # Skip non-PDFs
        if item.suffix.lower() != ".pdf":
            continue
        # Skip any existing Proposal Packet (prefix starts with GCC LV Div27-28)
        if item.name.startswith("GCC LV Div27-28"):
            continue

        match = SECTION_NUMBER_RE.match(item.name)
        if not match:
            # Skip PDFs that aren't section-numbered
            continue
        num = match.group(1)
        pretty = match.group(2).strip()
        sections.append((num, pretty, item))

    return sections


# ==========================================================================
# Merge with bookmarks
# ==========================================================================

def merge_with_bookmarks(sections, output_path):
    """
    Merge each section PDF into one output, adding a top-level bookmark per
    section using its section number + pretty name as the label.
    """
    writer = PdfWriter()
    for num, pretty, path in sections:
        reader = PdfReader(str(path))
        first_page_index = len(writer.pages)
        for page in reader.pages:
            writer.add_page(page)
        label = f"{num}  {pretty}"
        writer.add_outline_item(label, first_page_index)

    # Metadata
    writer.add_metadata({
        "/Title": output_path.stem,
        "/Author": "GCC LV Div27-28",
        "/Producer": "GCC Proposal Packet Merger",
    })

    with open(output_path, "wb") as f:
        writer.write(f)


# ==========================================================================
# Main
# ==========================================================================

def merge_packet(folder, gc_name, site_name, output_path=None):
    sections = discover_sections(folder)
    if not sections:
        raise RuntimeError(f"No section PDFs found in {folder}")

    # Warn if sections 01-06 not all present (governance requires all 6)
    required_nums = {"01", "02", "03", "04", "05", "06"}
    present_nums = {n for n, _, _ in sections}
    missing = required_nums - present_nums
    if missing:
        print(f"[WARN] Missing required section(s): {', '.join(sorted(missing))}")
        print(f"       Per governance, all of 01-06 should be present at merge time.")

    output_path = output_path or (OUTPUT_DIR / build_packet_filename(gc_name, site_name))
    output_path = Path(output_path)

    merge_with_bookmarks(sections, output_path)

    print(f"[OK] Proposal Packet merged: {output_path.name}")
    print(f"     {len(sections)} sections merged with bookmarks:")
    for num, pretty, path in sections:
        print(f"       · {num}  {pretty}")
    print(f"     Saved to: {output_path}")
    return output_path


def main():
    p = argparse.ArgumentParser(description="Merge GCC proposal section PDFs into one Packet")
    p.add_argument("--folder", required=True, help="Path to Client/Proposal/v#/ folder")
    p.add_argument("--gc", required=True, help="GC name for filename (e.g. 'McCarthy')")
    p.add_argument("--site", required=True, help="Site name for filename (e.g. 'Springhill Suites')")
    p.add_argument("-o", "--output", help="Override output path (defaults to governance-compliant name in AI_DRIVE_OUTPUT)")
    args = p.parse_args()

    merge_packet(args.folder, args.gc, args.site, args.output)


if __name__ == "__main__":
    main()
