"""
End-to-end smoke test for the GCC Google admin SA.

Proves the SA can:
  - mint an access token for cloud-platform + generative-language
  - call Gemini API and get a response back
  - read the project IAM policy
  - list Drive files
"""
from __future__ import annotations

import json
import os
import sys

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PROJECT_ID  = os.environ.get("GCC_GCP_PROJECT_ID", "micro-enigma-494403-d0")
SA_KEY_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", r"C:\ProgramData\GCC\secrets\gcc-claude-sa.json")
SCOPES_ALL  = ["https://www.googleapis.com/auth/cloud-platform"]
SCOPES_GENAI = ["https://www.googleapis.com/auth/generative-language"]

def section(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

def main() -> int:
    section("Auth")
    creds = service_account.Credentials.from_service_account_file(SA_KEY_PATH, scopes=SCOPES_ALL)
    creds.refresh(Request())
    print(f"  SA: {creds.service_account_email}")
    print(f"  token: {creds.token[:24]}... (len {len(creds.token)})")

    section("Gemini generateContent (gemini-2.5-flash)")
    creds_genai = service_account.Credentials.from_service_account_file(SA_KEY_PATH, scopes=SCOPES_GENAI)
    creds_genai.refresh(Request())
    r = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        headers={"Authorization": f"Bearer {creds_genai.token}", "Content-Type": "application/json"},
        json={
            "contents": [{"role": "user", "parts": [{"text": "In 8 words, what is BICSI?"}]}],
            "generationConfig": {"maxOutputTokens": 60, "temperature": 0.2},
        },
        timeout=30,
    )
    print(f"  HTTP {r.status_code}")
    if r.ok:
        body = r.json()
        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"  Gemini said: {text!r}")
        except (KeyError, IndexError):
            print(f"  Unexpected shape: {json.dumps(body)[:300]}")
    else:
        print(f"  ERR: {r.text[:400]}")

    section(f"IAM getIamPolicy (projects/{PROJECT_ID})")
    r = requests.post(
        f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT_ID}:getIamPolicy",
        headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"},
        json={},
        timeout=30,
    )
    print(f"  HTTP {r.status_code}")
    if r.ok:
        body = r.json()
        print(f"  bindings: {len(body.get('bindings', []))}")
        for b in body.get("bindings", [])[:5]:
            print(f"    {b['role']} -> {len(b.get('members', []))} members")
    else:
        print(f"  ERR: {r.text[:400]}")

    section("Drive list (first 5 files SA can see)")
    creds_drive = service_account.Credentials.from_service_account_file(
        SA_KEY_PATH, scopes=["https://www.googleapis.com/auth/drive"]
    )
    creds_drive.refresh(Request())
    r = requests.get(
        "https://www.googleapis.com/drive/v3/files?pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true",
        headers={"Authorization": f"Bearer {creds_drive.token}"},
        timeout=30,
    )
    print(f"  HTTP {r.status_code}")
    if r.ok:
        body = r.json()
        files = body.get("files", [])
        if not files:
            print("  (no files visible to SA — expected; share a Drive folder with the SA email to populate)")
        for f in files:
            print(f"    {f.get('id')}  {f.get('name')}")
    else:
        print(f"  ERR: {r.text[:400]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
