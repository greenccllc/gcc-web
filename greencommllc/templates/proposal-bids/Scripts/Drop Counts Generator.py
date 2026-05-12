"""
Drop Counts Generator — renders the job-specific Drop Counts PDF.

OUTPUT FORMAT (strict, matches 3-Intake/Templates/Drop Counts.md):
    **Label**
    **value**

    (blank line)
    **Next Label**
    **value**
    ...

USAGE:
    python "Drop Counts Generator.py" <job_folder>

INPUTS:
    - <job_folder>/Internal/Master Extraction - <job>.md   (source of counts)
    - <job_folder>/Internal/Job Brief - <job>.md           (cross-check + env)

OUTPUTS:
    - <job_folder>/Internal/Drop Counts - <job>.pdf        (branded PDF)
    - <job_folder>/Internal/Drop Counts - <job>.md         (raw markdown)

CATEGORY ORDER (20 counts + 1 context variable):
    0. Construction Environment     ← context variable, not a count
    --- endpoints: copper ---
    1. Data Drops
    --- endpoints: fiber family ---
    2. Fiber Runs
    3. Fiber Term Enclosures
    4. Fiber Patch Panel
    --- endpoints: media ---
    5. Coax
    6. HDMI
    --- endpoints: wireless + security + AV ---
    7. Wireless APs
    8. Cameras Interior
    9. Camera Exterior
    10. Access Control Doors - Strikes / Locks/REX / Sensors
    11. Intercoms/Speakers
    12. Elevator Endpoints
    13. TV / Display
    14. IoT (Smart)
    --- rooms ---
    15. MDF
    16. IDF
    --- rack equipment ---
    17. Switches
    18. Patch Panels
    19. UPS
    --- pathway ---
    20. Ladder Racks\\Trays

CONSTRUCTION ENVIRONMENT — valid values (single or comma-separated):
    - Drop Ceiling      (standard commercial suspended ceiling)
    - Raised Floor      (data center / computer room pattern)
    - Full Demo         (everything new; no existing pathway retained)
    - Retrofit          (mixed new + existing; re-use where feasible)
    - Use Existing      (leverage existing pathway / cabling plant where possible)

    Multiple envs allowed per job (e.g. "Drop Ceiling, Retrofit") — list dominant first.

PLACEHOLDER CONVENTION:
    — (em-dash)   = not yet determined (intake in flight)
    0             = confirmed NOT in scope (exclusion documented)
    integer       = confirmed count
"""

from __future__ import annotations
import sys
import re
import textwrap
from pathlib import Path

# -----------------------------------------------------------------------------
# Category schema — single source of truth
# -----------------------------------------------------------------------------

ENV_FIELD = "Construction Environment"

CATEGORIES: list[str] = [
    "Data Drops",
    "Fiber Runs",
    "Fiber Term Enclosures",
    "Fiber Patch Panel",
    "Coax",
    "HDMI",
    "Wireless APs",
    "Cameras Interior",
    "Camera Exterior",
    "Access Control Doors - Strikes / Locks/REX / Sensors",
    "Intercoms/Speakers",
    "Elevator Endpoints",
    "TV / Display",
    "IoT (Smart)",
    "MDF",
    "IDF",
    "Switches",
    "Patch Panels",
    "UPS",
    "Ladder Racks\\Trays",
]

VALID_ENVS = {
    "drop ceiling",
    "raised floor",
    "full demo",
    "retrofit",
    "use existing",
}

# -----------------------------------------------------------------------------
# Rendering
# -----------------------------------------------------------------------------

def render_markdown(env_value: str, counts: dict[str, str]) -> str:
    """Render the flat stacked markdown format."""
    lines: list[str] = []

    # Environment at top
    lines.append(f"**{ENV_FIELD}**")
    lines.append(f"**{env_value or '—'}**")
    lines.append("")

    # 20 category rows
    for cat in CATEGORIES:
        lines.append(f"**{cat}**")
        value = counts.get(cat, "—")
        lines.append(f"**{value}**")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_pdf(markdown: str, output_path: Path, job_name: str) -> None:
    """Render branded PDF (Calibri 10pt body, 9pt tables, forest green #2E7D32 accent)."""
    try:
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Image as RLImage,
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        print("reportlab not installed — writing markdown only.", file=sys.stderr)
        return

    FOREST = HexColor("#2E7D32")
    SLATE = HexColor("#455A64")

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle(
        name="Label",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=SLATE,
        alignment=TA_LEFT,
        spaceAfter=2,
    )
    value_style = ParagraphStyle(
        name="Value",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=FOREST,
        alignment=TA_LEFT,
        spaceAfter=8,
    )
    title_style = ParagraphStyle(
        name="Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=FOREST,
        alignment=TA_CENTER,
        spaceAfter=12,
    )

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title=f"Drop Counts — {job_name}",
    )

    story: list = [Paragraph(f"Drop Counts — {job_name}", title_style), Spacer(1, 0.1 * inch)]

    # Parse the markdown into label/value pairs
    pairs = re.findall(r"\*\*(.+?)\*\*\s*\n\*\*(.+?)\*\*", markdown)
    for label, value in pairs:
        story.append(Paragraph(label, label_style))
        story.append(Paragraph(value, value_style))

    doc.build(story)


# -----------------------------------------------------------------------------
# Extraction — pull counts from Master Extraction
# -----------------------------------------------------------------------------

def extract_counts_from_master(master_md: str) -> tuple[str, dict[str, str]]:
    """Best-effort parse of Master Extraction to harvest env + counts.

    Looks for lines like:
        Construction Environment: Drop Ceiling, Retrofit
        Data Drops: 37
        Wireless APs: 4
        ...

    Unmatched categories default to '—'.
    """
    env_value = "—"
    counts: dict[str, str] = {}

    # Try to find environment
    env_match = re.search(
        r"(?:Construction\s+Environment|Environment|Construction\s+Type)\s*[:\-]\s*(.+)",
        master_md,
        re.IGNORECASE,
    )
    if env_match:
        env_value = env_match.group(1).strip().rstrip(".,;")

    # Try to find each category
    for cat in CATEGORIES:
        # Escape regex special chars in category name
        cat_escaped = re.escape(cat)
        # Allow flexible label matching (slashes, dashes, etc.)
        pattern = rf"{cat_escaped}\s*[:\-]\s*([0-9]+|—|N/A|n/a|None|none)"
        m = re.search(pattern, master_md)
        if m:
            val = m.group(1).strip()
            counts[cat] = val if val not in ("N/A", "n/a", "None", "none") else "—"

    return env_value, counts


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1

    job_folder = Path(argv[1])
    if not job_folder.exists() or not job_folder.is_dir():
        print(f"Job folder not found: {job_folder}", file=sys.stderr)
        return 2

    job_name = job_folder.name
    internal = job_folder / "Internal"
    master_path = next(internal.glob("Master Extraction - *.md"), None)

    env_value = "—"
    counts: dict[str, str] = {}

    if master_path and master_path.exists():
        text = master_path.read_text(encoding="utf-8")
        env_value, counts = extract_counts_from_master(text)

    # Render outputs
    md_out = internal / f"Drop Counts - {job_name}.md"
    pdf_out = internal / f"Drop Counts - {job_name}.pdf"

    markdown = render_markdown(env_value, counts)
    md_out.write_text(markdown, encoding="utf-8")
    render_pdf(markdown, pdf_out, job_name)

    print(f"✅ Wrote {md_out}")
    print(f"✅ Wrote {pdf_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
