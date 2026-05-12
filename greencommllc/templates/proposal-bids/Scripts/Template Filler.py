"""
Template Filler — GCC LV Div27-28

Universal job-data placeholder replacement tool for GCC bid templates.

Takes a DOCX template from 1-Bids/Templates/Standard/ or Conditional/ and a
job-data dict (or JSON file), replaces {{TOKEN}} placeholders at the XML level
(preserving all formatting), and writes the filled document to AI_DRIVE_OUTPUT/.

Unlike python-docx text replacement (which breaks on fragmented runs), this
operates on the raw word/*.xml files inside the DOCX zip to bypass formatting
run boundaries.

Usage:
    from Template_Filler import fill_template

    job_data = {
        "PROJECT_NAME": "Springhill Suites Marriott",
        "PROJECT_CITY_STATE": "Lee's Summit, MO",
        "GC_NAME": "McCarthy Building Companies",
        "BASE_BID": "248,500",
        "MS_TIER": "Team",
        "BID_DATE": "April 20, 2026",
    }

    fill_template(
        template_path="1-Bids/Templates/Standard/02 Bid Overview.docx",
        job_data=job_data,
        output_name="02 Bid Overview - Springhill.docx",
    )

Also runnable from CLI:
    python "Template Filler.py" template.docx job_data.json -o filled.docx

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


# --------------------------------------------------------------------------
# Data loading
# --------------------------------------------------------------------------

def _load_job_data(data):
    """Accept dict or path to JSON file; return dict."""
    if isinstance(data, dict):
        return data
    path = Path(data)
    if not path.exists():
        raise FileNotFoundError(f"Job data file not found: {data}")
    return json.loads(path.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------
# Token normalization (handles XML-fragmented tokens)
# --------------------------------------------------------------------------

def _collapse_fragmented_tokens(xml: str) -> str:
    """
    Word sometimes splits {{TOKEN}} across multiple <w:r> runs, e.g.:

        <w:r><w:t>{{BASE</w:t></w:r>
        <w:r><w:t>_BID}}</w:t></w:r>

    Regex-based replacement fails on these. This helper rejoins any text run
    that sits inside a pair of {{ }} braces, so the resulting XML contains
    the full {{TOKEN}} string in a single <w:t> element that str.replace can
    find and substitute.
    """
    # Look for {{ ... }} sequences that may span run boundaries.
    pattern = re.compile(
        r'\{\{(?:[^]|\{(?!\{)|\}(?!\}))*?\}\}',
        flags=re.DOTALL,
    )

    def collapse(match):
        inner = match.group(0)
        # Strip run-break XML inside the token body.
        inner = re.sub(
            r'</w:t>\s*</w:r>\s*<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?\s*<w:t[^>]*>',
            '',
            inner,
            flags=re.DOTALL,
        )
        return inner

    # We need a broader search because the pattern above can't span all run
    # breaks. Do two passes: broader pre-scan, then precise collapse.
    broad = re.compile(
        r'\{\{(?:(?!\{\{|\}\}).)*?\}\}',
        flags=re.DOTALL,
    )
    for _ in range(5):  # Up to 5 passes for deeply fragmented tokens.
        new_xml = broad.sub(collapse, xml)
        if new_xml == xml:
            break
        xml = new_xml
    return xml


# --------------------------------------------------------------------------
# Core fill
# --------------------------------------------------------------------------

TARGET_XML_PARTS = [
    'word/document.xml',
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/endnotes.xml', 'word/footnotes.xml',
]


def fill_template(template_path, job_data, output_name=None):
    """
    Replace {{TOKEN}} placeholders in a DOCX template with job values.

    Args:
        template_path: Path to .docx template file.
        job_data: Dict of {"TOKEN": value} OR path to JSON file.
                  Keys should be the bare token name WITHOUT braces
                  (e.g., "BASE_BID", not "{{BASE_BID}}").
        output_name: Output filename. Defaults to template stem + ' - FILLED.docx'.

    Returns:
        Path to filled DOCX in AI_DRIVE_OUTPUT/.
    """
    template_path = Path(template_path)
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")

    data = _load_job_data(job_data)
    output_path = OUTPUT_DIR / (output_name or f"{template_path.stem} - FILLED.docx")

    # Copy template to output path so we never mutate the source.
    shutil.copy(template_path, output_path)

    # Pull each target XML file, collapse fragmented tokens, replace.
    with zipfile.ZipFile(output_path, 'r') as zin:
        all_names = zin.namelist()
        xml_contents = {
            n: zin.read(n).decode('utf-8')
            for n in TARGET_XML_PARTS
            if n in all_names
        }

    total_replacements = 0
    per_token_counts = {}

    for name, xml in list(xml_contents.items()):
        xml = _collapse_fragmented_tokens(xml)
        for token, value in data.items():
            needle = '{{' + token + '}}'
            count = xml.count(needle)
            if count:
                xml = xml.replace(needle, _xml_escape(str(value)))
                total_replacements += count
                per_token_counts[token] = per_token_counts.get(token, 0) + count
        xml_contents[name] = xml

    # Rewrite the DOCX with patched XML parts; preserve every other file.
    tmp_path = output_path.with_suffix('.docx.tmp')
    with zipfile.ZipFile(output_path, 'r') as zin:
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename in xml_contents:
                    zout.writestr(item, xml_contents[item.filename])
                else:
                    zout.writestr(item, zin.read(item.filename))
    shutil.move(tmp_path, output_path)

    # Report.
    unresolved = _find_unresolved_tokens(xml_contents)
    unused_data = [k for k in data if k not in per_token_counts]

    print(f"[OK] Filled: {output_path.name}")
    print(f"     {total_replacements} replacements  ·  {len(per_token_counts)} unique tokens")
    if unresolved:
        print(f"     [WARN] Unresolved tokens in output: {', '.join(sorted(unresolved))}")
    if unused_data:
        print(f"     [INFO] Data keys not present in template: {', '.join(sorted(unused_data))}")

    return output_path


def _xml_escape(value: str) -> str:
    """Escape XML special chars so values cannot break the document."""
    return (value
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;'))


def _find_unresolved_tokens(xml_contents):
    """Find any {{TOKEN}} still present in the output XML."""
    joined = ' '.join(xml_contents.values())
    return list(set(re.findall(r'\{\{[A-Z][A-Z0-9_]*\}\}', joined)))


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(
        description="Fill a GCC bid template (.docx) with job data.",
    )
    p.add_argument("template", help="Path to .docx template file")
    p.add_argument("job_data", help="Path to job data JSON file")
    p.add_argument("-o", "--output", help="Output filename")
    args = p.parse_args()

    out = fill_template(args.template, args.job_data, args.output)
    print(f"\n[DONE] Output saved to: {out}")


if __name__ == "__main__":
    main()
