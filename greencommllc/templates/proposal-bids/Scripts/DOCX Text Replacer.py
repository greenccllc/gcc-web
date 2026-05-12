"""
DOCX Text Replacer — GCC LV Div27-28

XML-level bulk search-and-replace for Microsoft Word .docx files.

Bypasses python-docx formatting limits (which cannot safely replace text that
spans multiple formatting runs) by operating directly on word/document.xml,
word/header*.xml, and word/footer*.xml. Handles XML fragmentation automatically
so tokens like {{BASE_BID}} that Word split across runs still match.

Supports plain string replacement and regex replacement. Reports counts per
replacement and warns on zero-match cases (usually indicates fragmented text).

Usage (programmatic):
    from DOCX_Text_Replacer import replace_in_docx

    replacements = [
        {"find": "OLD NAME", "replace": "NEW NAME"},
        {"find": r"Project:\\s*TBD", "replace": "Project: Live", "regex": True},
    ]
    replace_in_docx("input.docx", replacements, "output.docx")

Usage (CLI):
    python "DOCX Text Replacer.py" input.docx output.docx replacements.json

Author: GCC LV Div27-28
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import zipfile
from pathlib import Path

OUTPUT_DIR = Path("/home/user/AI_DRIVE_OUTPUT")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


TARGET_XML_PARTS = [
    'word/document.xml',
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/endnotes.xml', 'word/footnotes.xml',
]


# --------------------------------------------------------------------------
# Run-collapse helper (identical purpose to Template Filler)
# --------------------------------------------------------------------------

def _collapse_runs_around(xml: str, needle: str) -> str:
    """
    For a plain string needle, aggressively remove XML run-boundary tags
    inside regions where the needle might be fragmented. We do this only
    when a literal .count() of the needle yields zero hits, so we don't
    disturb XML structure unnecessarily.
    """
    if xml.count(needle) > 0:
        return xml

    # Build a regex that allows run-boundary XML between every character of the needle.
    # This lets re.sub collapse fragmented occurrences back into the literal text.
    boundary = r'(?:</w:t>\s*</w:r>\s*<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?\s*<w:t[^>]*>)?'
    parts = [re.escape(c) + boundary for c in needle[:-1]] + [re.escape(needle[-1])]
    pattern = re.compile(''.join(parts), flags=re.DOTALL)

    def coalesce(match):
        return needle

    return pattern.sub(coalesce, xml)


# --------------------------------------------------------------------------
# Core replace
# --------------------------------------------------------------------------

def replace_in_docx(input_path, replacements, output_name=None):
    """
    Perform bulk replacements inside a DOCX.

    Args:
        input_path: Path to source .docx
        replacements: List of dicts. Each dict:
            {"find": "needle", "replace": "value"}            # plain string
            {"find": r"regex", "replace": "value", "regex": True}  # regex
        output_name: Output filename (defaults to input stem + ' - patched.docx')

    Returns:
        (output_path, list_of_report_entries)

    Report entry format:
        {"find": "...", "replace": "...", "regex": bool, "count": int, "parts": {xml_name: count}}
    """
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(f"Input not found: {input_path}")

    output_path = OUTPUT_DIR / (output_name or f"{input_path.stem} - patched.docx")
    shutil.copy(input_path, output_path)

    # Read XML parts.
    with zipfile.ZipFile(output_path, 'r') as zin:
        all_names = zin.namelist()
        xml_contents = {
            n: zin.read(n).decode('utf-8')
            for n in TARGET_XML_PARTS
            if n in all_names
        }

    # Apply each replacement.
    report = []
    for r in replacements:
        find = r["find"]
        replace_val = r["replace"]
        is_regex = bool(r.get("regex", False))
        entry = {"find": find, "replace": replace_val, "regex": is_regex, "count": 0, "parts": {}}

        for name, xml in list(xml_contents.items()):
            if is_regex:
                new_xml, n = re.subn(find, replace_val, xml, flags=re.DOTALL)
            else:
                # Try literal first; if zero, collapse runs and try again.
                literal_count = xml.count(find)
                if literal_count == 0:
                    xml = _collapse_runs_around(xml, find)
                    literal_count = xml.count(find)
                new_xml = xml.replace(find, replace_val) if literal_count else xml
                n = literal_count

            if n:
                xml_contents[name] = new_xml
                entry["count"] += n
                entry["parts"][name] = n

        report.append(entry)

    # Rewrite the DOCX.
    tmp_path = output_path.with_suffix('.docx.tmp')
    with zipfile.ZipFile(output_path, 'r') as zin:
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename in xml_contents:
                    zout.writestr(item, xml_contents[item.filename])
                else:
                    zout.writestr(item, zin.read(item.filename))
    shutil.move(tmp_path, output_path)

    return output_path, report


def print_report(report):
    """Pretty-print a report list from replace_in_docx."""
    print("\nReplacement Report")
    print("-" * 70)
    for r in report:
        kind = "regex" if r["regex"] else "string"
        head = r["find"][:48] + "..." if len(r["find"]) > 48 else r["find"]
        if r["count"] == 0:
            print(f"  [WARN] 0 matches ({kind}): '{head}'")
            print("         Text may be XML-fragmented beyond collapse threshold,")
            print("         or the source text differs from the literal passed in.")
        else:
            print(f"  [OK]   {r['count']} match(es) ({kind}): '{head}'")
            for part, n in r["parts"].items():
                print(f"         · {part}: {n}")
    print("-" * 70)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description="XML-level bulk replace inside a DOCX")
    p.add_argument("input", help="Path to input .docx")
    p.add_argument("output_name", help="Output filename (will be placed in AI_DRIVE_OUTPUT/)")
    p.add_argument("replacements", help="Path to JSON file: list of {find, replace[, regex]}")
    args = p.parse_args()

    rlist = json.loads(Path(args.replacements).read_text(encoding="utf-8"))
    out, report = replace_in_docx(args.input, rlist, args.output_name)
    print_report(report)
    print(f"\n[DONE] Output saved to: {out}")


if __name__ == "__main__":
    main()
