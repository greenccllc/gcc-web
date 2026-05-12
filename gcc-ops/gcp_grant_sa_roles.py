"""
Grant the GCC service account the IAM roles it needs for new functionality.
Idempotent — re-runs are no-ops if a role is already granted.

Usage:
    python gcp_grant_sa_roles.py
"""
from __future__ import annotations
import os, sys
from pathlib import Path
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PROJECT_ID = os.environ.get("GCC_GCP_PROJECT_ID", "micro-enigma-494403-d0")
SA_KEY_PATH = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    r"C:\ProgramData\GCC\secrets\gcc-claude-sa.json",
)
SA_EMAIL = os.environ.get(
    "GCC_GCP_SA_EMAIL",
    "claude@micro-enigma-494403-d0.iam.gserviceaccount.com",
)

# Roles needed by the SA itself (so the gcc-api can call these services on its behalf).
DESIRED_ROLES = [
    "roles/secretmanager.admin",  # list/create/read/update secrets (replaces dbo.Settings)
    # Places/Geocoding APIs don't require per-SA roles when the API is enabled
    # at the project level. Calls auth via the SA's standard cloud-platform scope.
]

CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


def get_token() -> str:
    if not Path(SA_KEY_PATH).exists():
        print(f"[FATAL] SA key not found at {SA_KEY_PATH}", file=sys.stderr); sys.exit(2)
    creds = service_account.Credentials.from_service_account_file(SA_KEY_PATH, scopes=[CLOUD_PLATFORM_SCOPE])
    creds.refresh(Request())
    return creds.token


def main() -> int:
    print(f"Project: {PROJECT_ID}")
    print(f"SA email: {SA_EMAIL}")
    token = get_token()
    print("Auth: OK\n")

    # Get current IAM policy
    url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT_ID}:getIamPolicy"
    r = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json={})
    r.raise_for_status()
    policy = r.json()
    bindings = policy.get("bindings", [])

    member = f"serviceAccount:{SA_EMAIL}"
    changes = 0
    for role in DESIRED_ROLES:
        existing = next((b for b in bindings if b.get("role") == role), None)
        if existing and member in existing.get("members", []):
            print(f"  [OK]  {role} already granted to {SA_EMAIL}")
            continue
        if existing:
            existing.setdefault("members", []).append(member)
        else:
            bindings.append({"role": role, "members": [member]})
        print(f"  [+]   added {role} -> {SA_EMAIL}")
        changes += 1

    if changes == 0:
        print("\nAll roles already granted. No-op.")
        return 0

    # Set updated policy
    set_url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT_ID}:setIamPolicy"
    r = requests.post(set_url, headers={"Authorization": f"Bearer {token}"},
                      json={"policy": policy})
    if not r.ok:
        print(f"\n[FATAL] setIamPolicy failed: {r.status_code} {r.text}", file=sys.stderr)
        return 3
    print(f"\nApplied {changes} change(s). Effective immediately.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
