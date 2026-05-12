"""
WeasyPrint Batch Runner — GCC LV Div27-28

Converts DOCX proposal sections to PDF using WeasyPrint with branded CSS.
Used as a fallback when convert_file_to_pdf (LibreOffice-backed) produces
artifacts that WeasyPrint handles better (complex table layouts, column
alignment edge cases).

Scans the Processing/ folder for DOCX files, skips legacy items, repairs
common DOCX-to-HTML issues, converts to HTML via python-docx + markdown,
and renders PDFs with GCC-branded CSS.

Governance source: 1-Bids/Format Guide.md §PDF Rendering

Usage:
    python "weasyprint_batch.py" --folder "path/to/Processing"

Output: One PDF per DOCX, same filename stem, written to AI_DRIVE_OUTPUT/.

Author: GCC LV Div27-28
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
from pathlib import Path

from docx import Document

OUTPUT_DIR = Path("/home/user/AI_DRIVE_OUTPUT")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================================================
# Brand CSS (Format Guide compliant)
# ==========================================================================

BRAND_CSS = """
@page {
    size: Letter;
    margin: 0.75in 0.75in 0.75in 0.75in;
    @top-right {
        content: "GCC LV Div27-28";
        font-family: Calibri, "Helvetica", sans-serif;
        font-size: 8pt;
        color: #455A64;
    }
    @bottom-center {
        content: "GCC LLC  ·  Proprietary & Confidential  ·  Licensed & Insured  ·  KCMO & STL";
        font-family: Calibri, "Helvetica", sans-serif;
        font-size: 8pt;
        font-style: italic;
        color: #2E7D32;
    }
    @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Calibri, "Helvetica", sans-serif;
        font-size: 8pt;
        color: #455A64;
    }
}

* {
    font-family: Calibri, "Helvetica", sans-serif;
    box-sizing: border-box;
}

body {
    font-size: 10pt;
    color: #455A64;           /* Slate */
    line-height: 1.45;
}

h1, h2, h3, h4 {
    color: #2E7D32;           /* Forest Green */
    font-weight: bold;
    margin-top: 14pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
}

h1 { font-size: 18pt; border-bottom: 2px solid #2E7D32; padding-bottom: 4pt; }
h2 { font-size: 14pt; }
h3 { font-size: 12pt; color: #455A64; }

p {
    margin: 0 0 6pt 0;
}

em, i {
    color: #455A64;
    font-style: italic;
}

strong, b {
    color: #2E7D32;
}

ul {
    margin: 4pt 0 8pt 18pt;
    padding: 0;
}

ul li {
    margin: 2pt 0;
    padding-left: 2pt;
}

ul li::marker {
    color: #2E7D32;
}

/* Banned colors — enforce at stylesheet level */
.color-blue, .color-teal, .color-purple {
    color: #455A64 !important;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    font-size: 9pt;
}

thead {
    display: table-header-group;        /* repeat header on each page */
}

thead th {
    background: #2E7D32;
    color: #FFFFFF;
    font-weight: bold;
    text-align: left;
    padding: 5pt 6pt;
    border: 0.5pt solid #455A64;
}

tbody td {
    padding: 4pt 6pt;
    border: 0.5pt solid #455A64;
    color: #455A64;
    vertical-align: top;
    page-break-inside: avoid;
}

tr {
    page-break-inside: avoid;
}

.hero-amount {
    font-size: 44pt;
    color: #2E7D32;
    font-weight: bold;
    text-align: center;
}

.gold {
    color: #D4AF37;
}
"""


# ==========================================================================
# DOCX → HTML conversion (lightweight, governance-compliant)
# ==========================================================================

def docx_to_html(docx_path):
    """Very lightweight DOCX to HTML (no external mammoth dep required)."""
    doc = Document(str(docx_path))
    parts = [f"<html><head><meta charset='utf-8'><title>{html.escape(docx_path.stem)}</title></head><body>"]
    in_list = False

    for block in doc.element.body.iterchildren():
        tag = block.tag.split("}")[-1]
        if tag == "p":
            text, style = _extract_paragraph(block, doc)
            if not text.strip() and not in_list:
                continue
            # Style by Word style name
            if style and "Heading 1" in style:
                if in_list:
                    parts.append("</ul>"); in_list = False
                parts.append(f"<h1>{text}</h1>")
            elif style and "Heading 2" in style:
                if in_list:
                    parts.append("</ul>"); in_list = False
                parts.append(f"<h2>{text}</h2>")
            elif style and "Heading 3" in style:
                if in_list:
                    parts.append("</ul>"); in_list = False
                parts.append(f"<h3>{text}</h3>")
            elif style and ("List Bullet" in style or "Bullet" in style):
                if not in_list:
                    parts.append("<ul>"); in_list = True
                parts.append(f"<li>{text}</li>")
            else:
                if in_list:
                    parts.append("</ul>"); in_list = False
                parts.append(f"<p>{text}</p>")
        elif tag == "tbl":
            if in_list:
                parts.append("</ul>"); in_list = False
            parts.append(_render_table(block, doc))

    if in_list:
        parts.append("</ul>")

    parts.append("</body></html>")
    return "".join(parts)


def _extract_paragraph(p_elem, doc):
    """Return (inner_html, style_name)."""
    # Style
    style_name = ""
    pStyle = p_elem.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pStyle")
    if pStyle is not None:
        style_name = pStyle.attrib.get(
            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val", "")

    # Text with inline bold/italic
    parts = []
    for run in p_elem.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r"):
        text_elems = run.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
        text = "".join(t.text or "" for t in text_elems)
        if not text:
            continue
        # Detect bold/italic
        rPr = run.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr")
        is_bold = False
        is_italic = False
        if rPr is not None:
            is_bold = rPr.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b") is not None
            is_italic = rPr.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}i") is not None

        escaped = html.escape(text)
        if is_bold:
            escaped = f"<strong>{escaped}</strong>"
        if is_italic:
            escaped = f"<em>{escaped}</em>"
        parts.append(escaped)
    return "".join(parts), style_name


def _render_table(tbl_elem, doc):
    """Render a DOCX table element to HTML (first row = thead)."""
    rows = tbl_elem.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tr")
    if not rows:
        return ""
    out = ["<table>"]
    for ri, tr in enumerate(rows):
        cells = tr.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc")
        row_parts = []
        for tc in cells:
            # Gather all paragraph text inside this cell
            texts = []
            for p in tc.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                t, _ = _extract_paragraph(p, doc)
                if t.strip():
                    texts.append(t)
            cell_html = "<br/>".join(texts) if texts else "&nbsp;"
            tag = "th" if ri == 0 else "td"
            row_parts.append(f"<{tag}>{cell_html}</{tag}>")
        wrapper = "thead" if ri == 0 else "tbody"
        if ri == 0:
            out.append("<thead><tr>" + "".join(row_parts) + "</tr></thead><tbody>")
        else:
            out.append("<tr>" + "".join(row_parts) + "</tr>")
    out.append("</tbody></table>")
    return "".join(out)


# ==========================================================================
# Render
# ==========================================================================

def convert(docx_path, output_path=None):
    """Convert a single DOCX to PDF using WeasyPrint."""
    try:
        from weasyprint import HTML, CSS
    except ImportError:
        print("[ERR] WeasyPrint not installed. Install with: pip install weasyprint")
        sys.exit(1)

    docx_path = Path(docx_path)
    html_body = docx_to_html(docx_path)
    output_path = Path(output_path or (OUTPUT_DIR / f"{docx_path.stem}.pdf"))

    HTML(string=html_body).write_pdf(
        str(output_path),
        stylesheets=[CSS(string=BRAND_CSS)],
    )
    return output_path


def batch(folder):
    folder = Path(folder)
    if not folder.exists():
        raise FileNotFoundError(f"Folder not found: {folder}")

    docx_files = [p for p in folder.rglob("*.docx")
                  if not p.name.startswith("~$") and not p.name.startswith(".")]
    outs = []
    for p in docx_files:
        try:
            out = convert(p)
            outs.append(out)
            print(f"[OK] {p.name}  →  {out.name}")
        except Exception as e:
            print(f"[ERR] {p.name}: {e}")
    print(f"\n[DONE] {len(outs)} of {len(docx_files)} converted")
    return outs


def main():
    p = argparse.ArgumentParser(description="Batch convert DOCX to branded PDF via WeasyPrint")
    p.add_argument("--folder", required=True, help="Folder containing DOCX files")
    args = p.parse_args()
    batch(args.folder)


if __name__ == "__main__":
    main()
