"""
Enable the Google Cloud APIs the GCC admin connector needs, using the
service account at $env:GOOGLE_APPLICATION_CREDENTIALS.

Idempotent — re-runs are no-ops for already-enabled services.

Usage:
    python gcp_enable_apis.py [--list-only]
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PROJECT_ID = os.environ.get("GCC_GCP_PROJECT_ID", "micro-enigma-494403-d0")
SA_KEY_PATH = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    r"C:\ProgramData\GCC\secrets\gcc-claude-sa.json",
)

# APIs the connector needs. Order is irrelevant — enable is idempotent.
TARGET_APIS = [
    "serviceusage.googleapis.com",          # required to enable others
    "iam.googleapis.com",                   # IAM ops
    "iamcredentials.googleapis.com",        # short-lived creds / impersonation
    "cloudresourcemanager.googleapis.com",  # project / IAM-policy ops
    "aiplatform.googleapis.com",            # Vertex AI (Gemini + Claude on Vertex)
    "generativelanguage.googleapis.com",    # public Gemini API
    "drive.googleapis.com",                 # Drive (admin uploads, sharing)
    "sheets.googleapis.com",                # Sheets (catalog, submission log)
    "docs.googleapis.com",                  # Docs (proposal export targets)
    "gmail.googleapis.com",                 # Gmail send-as (DWD scenarios)
    "calendar-json.googleapis.com",         # Calendar
    "admin.googleapis.com",                 # Workspace Admin SDK (needs DWD)
    "groupssettings.googleapis.com",        # Workspace groups
    "compute.googleapis.com",               # general infra (just in case)
    "storage.googleapis.com",               # GCS for proposal artifact storage
    "secretmanager.googleapis.com",         # Secret Manager — replaces dbo.Settings for integration secrets
    "places.googleapis.com",                # Places API (New) — server-side address autocomplete via SA OAuth
    "geocoding-backend.googleapis.com",     # Geocoding API — forward/reverse geocoding
    "documentai.googleapis.com",            # Document AI — RFP/spec/W9/COI/contract structured extraction
    "vision.googleapis.com",                # Cloud Vision — OCR for image-only PDFs and scanned plan sheets
    "language.googleapis.com",              # Cloud Natural Language — entity / classification extraction
    "pubsub.googleapis.com",                # Pub/Sub — event bus for upload→extract→proposal pipeline
    "run.googleapis.com",                   # Cloud Run Jobs — extraction workers
    "bigquery.googleapis.com",              # BigQuery — historical bid/extraction analytics
]

CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


def get_token() -> str:
    if not Path(SA_KEY_PATH).exists():
        print(f"[FATAL] SA key not found at {SA_KEY_PATH}", file=sys.stderr)
        sys.exit(2)
    creds = service_account.Credentials.from_service_account_file(
        SA_KEY_PATH, scopes=[CLOUD_PLATFORM_SCOPE]
    )
    creds.refresh(Request())
    return creds.token


def list_enabled(token: str) -> set[str]:
    enabled: set[str] = set()
    page_token = ""
    while True:
        url = (
            f"https://serviceusage.googleapis.com/v1/projects/{PROJECT_ID}"
            f"/services?filter=state:ENABLED&pageSize=200"
        )
        if page_token:
            url += f"&pageToken={page_token}"
        r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
        if r.status_code != 200:
            print(f"[ERR] list services: {r.status_code} {r.text}", file=sys.stderr)
            sys.exit(3)
        body = r.json()
        for svc in body.get("services", []):
            name = svc.get("config", {}).get("name") or svc.get("name", "").split("/")[-1]
            if name:
                enabled.add(name)
        page_token = body.get("nextPageToken", "")
        if not page_token:
            break
    return enabled


def enable_one(token: str, api: str) -> tuple[bool, str]:
    url = (
        f"https://serviceusage.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/services/{api}:enable"
    )
    r = requests.post(url, headers={"Authorization": f"Bearer {token}"}, timeout=60)
    if r.status_code in (200, 201):
        body = r.json()
        # Long-running operation; poll briefly.
        op_name = body.get("name")
        if not op_name or body.get("done"):
            return True, "enabled"
        for _ in range(30):
            time.sleep(2)
            op = requests.get(
                f"https://serviceusage.googleapis.com/v1/{op_name}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            if op.status_code != 200:
                return False, f"poll {op.status_code} {op.text[:200]}"
            ob = op.json()
            if ob.get("done"):
                if "error" in ob:
                    return False, f"op error: {ob['error']}"
                return True, "enabled"
        return False, "op timeout"
    if r.status_code == 403:
        return False, f"403 forbidden — SA lacks serviceusage.services.enable. {r.text[:200]}"
    return False, f"{r.status_code} {r.text[:300]}"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--list-only", action="store_true", help="Just print currently enabled APIs and exit")
    args = p.parse_args()

    print(f"Project: {PROJECT_ID}")
    print(f"SA key:  {SA_KEY_PATH}")
    token = get_token()
    print("Auth:    OK\n")

    enabled = list_enabled(token)
    print(f"Currently enabled: {len(enabled)} APIs")
    target_status = {api: (api in enabled) for api in TARGET_APIS}
    for api, on in target_status.items():
        print(f"  {'[ON ]' if on else '[off]'} {api}")

    if args.list_only:
        return 0

    todo = [api for api, on in target_status.items() if not on]
    if not todo:
        print("\nAll target APIs already enabled. No-op.")
        return 0

    print(f"\nEnabling {len(todo)} API(s):")
    failures = []
    for api in todo:
        print(f"  -> {api} ... ", end="", flush=True)
        ok, msg = enable_one(token, api)
        print(msg)
        if not ok:
            failures.append((api, msg))

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for api, msg in failures:
            print(f"  - {api}: {msg}")
        return 1
    print("\nAll target APIs enabled.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
