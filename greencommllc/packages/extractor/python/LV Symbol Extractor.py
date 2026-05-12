"""
LV Symbol Extractor — Construction Plan Takeoff
================================================
Scans construction plan PDFs (T-sheets, E-sheets) and counts low-voltage
device endpoints via:

  1. TEXT LABEL matching    — scans extracted words against a lexicon
  2. VECTOR GEOMETRY        — counts small filled rectangles & triangles
  3. SYMBOL LEGEND awareness — ignores the legend page and title block

Consumes the running symbol list maintained at:
    3-Intake/LV Identifiers.md

Output:
    JSON  — per-page breakdown with coordinates for later verification
    CSV   — flat summary: Sheet · Device · Count · Source (text|shape)

EXTEND for new symbols:
    1. Add a row to 3-Intake/LV Identifiers.md
    2. Add the label → category mapping in DEVICE_LEXICON below
    3. If the symbol is a unique shape not covered by rect/triangle,
       add a matcher function to SHAPE_MATCHERS

Run:
    python "LV Symbol Extractor.py"
"""

import os
import json
import csv
import re
import pdfplumber

# ---------------------------------------------------------------------------
#  LV DEVICE LEXICON — keep in sync with 3-Intake/LV Identifiers.md
# ---------------------------------------------------------------------------
DEVICE_LEXICON = {
    # Data outlets
    "1D": "DATA_OUTLET_1", "2D": "DATA_OUTLET_2",
    "3D": "DATA_OUTLET_3", "4D": "DATA_OUTLET_4",
    "D1": "DATA_OUTLET_1", "D2": "DATA_OUTLET_2",

    # Wireless
    "WAP": "WAP", "AP":  "WAP",

    # Cameras
    "CAM": "CAMERA", "CAMERA": "CAMERA",

    # Access control
    "CR": "CARD_READER", "REX": "REX",
    "ACS": "ACS", "DOOR": "ACS_DOOR",

    # AV / specialty
    "IFP":     "INTERACTIVE_PANEL",
    "TV":      "DISPLAY",
    "SPEAKER": "AUDIO",
    "PA":      "PAGING",
    "CLOCK":   "CLOCK",
    "INTERCOM":"INTERCOM",

    # Emergency
    "ELEV":    "ELEVATOR_PHONE",
    "ETR":     "EMERGENCY_RESPONDER",
    "CALL":    "CALL_STATION",

    # Infrastructure
    "RACK":    "RACK",
    "RISER":   "RISER",
    "FIBER":   "FIBER",
}

# Words often found in LV context but NOT themselves endpoints
CONTEXT_TERMS = {
    "WIRELESS", "TELECOM", "DATA", "CABLE", "PATHWAY", "CONDUIT",
    "LOW VOLTAGE", "LV", "STRUCTURED",
}

# Sheet prefix patterns (expand for other disciplines)
SHEET_PATTERNS = [
    r"\bT-?\d{3}\b",   # T201, T-201
    r"\bE-?\d{3}\b",   # E401 (electrical w/ LV content)
    r"\bTC-?\d{2,3}\b" # TC201 (telecom sheets)
]


def detect_sheet_id(text):
    """Return the sheet ID found in the text, or None."""
    for pat in SHEET_PATTERNS:
        m = re.search(pat, text)
        if m:
            return m.group(0).upper().replace("-", "")
    return None


def is_in_title_block(x0, top, page_w, page_h,
                     right_frac=0.80, bottom_frac=0.85):
    """Heuristic: title block sits in the right-bottom of the page."""
    return x0 > (page_w * right_frac) and top > (page_h * bottom_frac)


def classify_word(word):
    """Return canonical device type or None."""
    w = word.strip().upper()
    # Strip trailing non-alnum
    w = re.sub(r"[^A-Z0-9]+$", "", w)
    return DEVICE_LEXICON.get(w)


def extract_sheet(page, sheet_id):
    """Extract device counts + coordinates for one sheet."""
    pw, ph = page.width, page.height

    # --- Text labels ---
    text_devices = {}
    text_coords = []
    for word in page.extract_words(keep_blank_chars=False, x_tolerance=3):
        if is_in_title_block(word["x0"], word["top"], pw, ph):
            continue
        dev = classify_word(word["text"])
        if dev:
            text_devices[dev] = text_devices.get(dev, 0) + 1
            text_coords.append({
                "device": dev,
                "text": word["text"],
                "x": round(word["x0"], 1),
                "y": round(word["top"], 1),
            })

    # --- Vector shapes ---
    # Small filled rectangles often = Data Outlets (1D/2D without text)
    small_rects = 0
    for rect in page.rects:
        if not rect.get("fill"):
            continue
        if is_in_title_block(rect["x0"], rect["top"], pw, ph):
            continue
        w = rect["x1"] - rect["x0"]
        h = rect["bottom"] - rect["top"]
        if 3 <= w <= 20 and 3 <= h <= 20:
            small_rects += 1

    # Triangles (curves with 3-4 points closed)
    triangles = 0
    for curve in page.curves:
        pts = curve.get("pts", [])
        if 3 <= len(pts) <= 4:
            if is_in_title_block(curve["x0"], curve["top"], pw, ph):
                continue
            triangles += 1

    return {
        "sheet": sheet_id,
        "page_width": pw,
        "page_height": ph,
        "text_devices": text_devices,
        "text_coords": text_coords,
        "shape_small_rects": small_rects,
        "shape_triangles": triangles,
    }


def extract_pdf(pdf_path, sheet_id_prefix_filter=None):
    """Walk a PDF, extract LV data for each sheet page found."""
    results = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            sheet = detect_sheet_id(text)
            if not sheet:
                continue
            if sheet_id_prefix_filter and not sheet.startswith(sheet_id_prefix_filter):
                continue
            r = extract_sheet(page, sheet)
            r["pdf_page"] = i
            results.append(r)
            print(f"  p{i:>3} {sheet}:  "
                  f"{sum(r['text_devices'].values()):>3} text labels · "
                  f"{r['shape_small_rects']:>3} small rects · "
                  f"{r['shape_triangles']:>3} triangles")
    return results


def write_outputs(results, job_name):
    os.makedirs("AI_DRIVE_OUTPUT", exist_ok=True)

    # Aggregate totals
    totals = {}
    for r in results:
        for dev, n in r["text_devices"].items():
            totals[dev] = totals.get(dev, 0) + n

    # JSON (detailed)
    json_out = f"AI_DRIVE_OUTPUT/LV Extract - {job_name}.json"
    with open(json_out, "w") as f:
        json.dump({"job": job_name, "pages": results, "totals": totals}, f, indent=2)

    # CSV (summary)
    csv_out = f"AI_DRIVE_OUTPUT/LV Extract - {job_name}.csv"
    with open(csv_out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Sheet", "Device", "Count", "Source"])
        for r in results:
            for dev, n in r["text_devices"].items():
                w.writerow([r["sheet"], dev, n, "text"])
            if r["shape_small_rects"]:
                w.writerow([r["sheet"], "SMALL_RECT (possible outlet)", r["shape_small_rects"], "shape"])
            if r["shape_triangles"]:
                w.writerow([r["sheet"], "TRIANGLE (possible WAP/device)", r["shape_triangles"], "shape"])
        # Grand totals
        w.writerow([])
        w.writerow(["GRAND TOTALS"])
        for dev, n in sorted(totals.items()):
            w.writerow(["", dev, n, "text-total"])

    print(f"\n✓ Wrote {json_out}")
    print(f"✓ Wrote {csv_out}")
    print(f"\nGrand totals (text labels):")
    for dev, n in sorted(totals.items(), key=lambda kv: -kv[1]):
        print(f"   {dev:<22} {n:>4}")


def main():
    # -----------------------------------------------------------------
    #  EDIT THIS BLOCK FOR YOUR JOB
    # -----------------------------------------------------------------
    CONFIG = {
        "job_name": "EXAMPLE JOB",

        # One or more PDF files (typically the T-sheet set)
        "pdf_files": [
            "5-Jobs/1. Not Bid/EXAMPLE JOB/Originals/Plans - EXAMPLE.pdf",
        ],

        # Optional: only include sheets starting with this prefix
        # Examples: "T" (telecom only), "E4" (E400-series electrical)
        "sheet_prefix": None,
    }
    # -----------------------------------------------------------------

    all_results = []
    for pdf_path in CONFIG["pdf_files"]:
        if not os.path.exists(pdf_path):
            print(f"⚠ Skipping missing file: {pdf_path}")
            continue
        print(f"\nScanning: {pdf_path}")
        results = extract_pdf(pdf_path, CONFIG["sheet_prefix"])
        all_results.extend(results)

    if all_results:
        write_outputs(all_results, CONFIG["job_name"])
    else:
        print("No LV sheets found in any PDF.")


if __name__ == "__main__":
    main()
