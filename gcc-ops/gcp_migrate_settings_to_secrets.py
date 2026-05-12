"""
One-shot migration: dbo.Settings -> Google Cloud Secret Manager.

Reads every distinct (Scope, Key) row from GCCWeb.dbo.Settings (taking the
most recent ValueJson when multiple ClientIds have the same key — these
are company-global secrets, not per-user), and creates/updates a secret
in the GCP project named `{scope}-{key}` (e.g. "bundler-anthropic-api-key",
"infra-cloudflare-api-token").

The secret value is the **raw inner value** (the .value field from the
existing JSON envelope), NOT the envelope. Notes are stored as Secret
Manager annotations under "gcc.note".

Idempotent: re-runs add a new version only if the value changed.

Usage:
    python gcp_migrate_settings_to_secrets.py [--dry-run] [--verbose]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Optional

import pyodbc
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PROJECT_ID = os.environ.get("GCC_GCP_PROJECT_ID", "micro-enigma-494403-d0")
SA_KEY_PATH = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    r"C:\ProgramData\GCC\secrets\gcc-claude-sa.json",
)
DB_CONN = os.environ.get(
    "GCC_DB_CONN",
    r"DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost\GCCLLC;DATABASE=GCCWeb;Trusted_Connection=yes",
)

CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
SM_BASE = f"https://secretmanager.googleapis.com/v1/projects/{PROJECT_ID}"


def get_token() -> str:
    if not Path(SA_KEY_PATH).exists():
        print(f"[FATAL] SA key not found at {SA_KEY_PATH}", file=sys.stderr)
        sys.exit(2)
    creds = service_account.Credentials.from_service_account_file(SA_KEY_PATH, scopes=[CLOUD_PLATFORM_SCOPE])
    creds.refresh(Request())
    return creds.token


def secret_name(scope: str, key: str) -> str:
    """Map (scope, key) -> Secret Manager secret ID. Lowercase, hyphens only."""
    s = f"{scope}-{key}".lower()
    # Secret IDs allow only [A-Za-z0-9_-] and must start with a letter. Sanitize.
    s = "".join(c if (c.isalnum() or c in "-_") else "-" for c in s)
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-")


def fetch_settings_from_db() -> list[dict[str, Any]]:
    """Return one row per distinct (Scope, Key) — most recent ValueJson wins."""
    sql = """
    WITH ranked AS (
        SELECT Scope, [Key], ValueJson, IsSecret, UpdatedAt,
               ROW_NUMBER() OVER (PARTITION BY Scope, [Key] ORDER BY UpdatedAt DESC) AS rn
        FROM dbo.Settings
    )
    SELECT Scope, [Key], ValueJson, IsSecret, UpdatedAt
      FROM ranked
     WHERE rn = 1
     ORDER BY Scope, [Key];
    """
    out = []
    with pyodbc.connect(DB_CONN, autocommit=True) as cn:
        with cn.cursor() as cur:
            cur.execute(sql)
            for row in cur.fetchall():
                out.append({
                    "scope": row.Scope,
                    "key": row.Key,
                    "valueJson": row.ValueJson,
                    "isSecret": bool(row.IsSecret),
                    "updatedAt": row.UpdatedAt,
                })
    return out


def extract_inner(value_json: str) -> tuple[str, Optional[str]]:
    """ValueJson is shape {"value":"...","note":"..."}. Return (value, note)."""
    if not value_json:
        return "", None
    try:
        d = json.loads(value_json)
        if isinstance(d, dict):
            return str(d.get("value", "") or ""), d.get("note")
        # Plain scalar
        return str(d), None
    except Exception:
        return value_json, None


def get_existing_secret(token: str, name: str) -> Optional[dict]:
    r = requests.get(f"{SM_BASE}/secrets/{name}", headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def get_existing_value(token: str, name: str) -> Optional[str]:
    r = requests.get(
        f"{SM_BASE}/secrets/{name}/versions/latest:access",
        headers={"Authorization": f"Bearer {token}"},
    )
    if r.status_code == 404:
        return None
    r.raise_for_status()
    payload = r.json().get("payload", {})
    data_b64 = payload.get("data", "")
    if not data_b64:
        return None
    import base64
    return base64.b64decode(data_b64).decode("utf-8")


def create_secret(token: str, name: str, labels: dict[str, str], note: Optional[str]) -> None:
    body: dict[str, Any] = {
        "replication": {"automatic": {}},
        "labels": labels,
    }
    if note:
        body["annotations"] = {"gcc.note": note[:1000]}
    r = requests.post(
        f"{SM_BASE}/secrets?secretId={name}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=body,
    )
    if r.status_code == 409:
        return  # already exists
    r.raise_for_status()


def add_version(token: str, name: str, value: str) -> None:
    import base64
    b64 = base64.b64encode(value.encode("utf-8")).decode("ascii")
    r = requests.post(
        f"{SM_BASE}/secrets/{name}:addVersion",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"payload": {"data": b64}},
    )
    r.raise_for_status()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="show what would change without writing")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    print(f"Project: {PROJECT_ID}")
    print(f"DB:      {DB_CONN.split(';SERVER=')[1].split(';')[0] if 'SERVER=' in DB_CONN else '?'}")
    print(f"SA:      {SA_KEY_PATH}")
    print()

    token = get_token()
    rows = fetch_settings_from_db()
    print(f"Found {len(rows)} distinct (scope, key) pairs in dbo.Settings\n")

    n_created = 0
    n_updated = 0
    n_noop    = 0
    for r in rows:
        scope = r["scope"]
        key = r["key"]
        sname = secret_name(scope, key)
        value, note = extract_inner(r["valueJson"])
        labels = {
            "scope": scope.lower(),
            "key": key.lower().replace(".", "-"),
            "is_secret": "true" if r["isSecret"] else "false",
        }

        existing_meta = get_existing_secret(token, sname)
        existing_val  = get_existing_value(token, sname) if existing_meta else None

        if existing_meta is None:
            action = "CREATE"
            if not args.dry_run:
                create_secret(token, sname, labels, note)
                add_version(token, sname, value)
            n_created += 1
        elif existing_val != value:
            action = "ADD-VERSION"
            if not args.dry_run:
                add_version(token, sname, value)
            n_updated += 1
        else:
            action = "noop"
            n_noop += 1

        masked = value[:6] + "..." if len(value) > 8 and r["isSecret"] else value
        if args.verbose or action != "noop":
            print(f"  [{action:11}] {sname:50}  {masked}")

    print(f"\nSummary: {n_created} created, {n_updated} updated, {n_noop} no-op")
    print(f"Total in Secret Manager: {n_created + n_updated + n_noop}")
    if args.dry_run:
        print("\n(dry-run — no actual writes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
