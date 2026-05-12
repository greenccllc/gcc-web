#!/bin/bash
# GCC variant of setup_adc.sh (https://storage.googleapis.com/cloud-samples-data/adc/setup_adc.sh)
# - Non-interactive (no read -p, no OAuth browser prompts)
# - Uses the existing SA ADC (GOOGLE_APPLICATION_CREDENTIALS) instead of `gcloud auth application-default login`
# - Hard-codes project to micro-enigma-494403-d0
# - Verifies Vertex AI access by calling Gemini 2.5-flash with the SA token

set -e
PROJECT_ID="${GCC_GCP_PROJECT_ID:-micro-enigma-494403-d0}"
SA_KEY="${GOOGLE_APPLICATION_CREDENTIALS:-/c/ProgramData/GCC/secrets/gcc-claude-sa.json}"

echo "================================================================"
echo "   GCC ADC setup (Vertex AI smoke test)"
echo "   Project:  $PROJECT_ID"
echo "   SA key:   $SA_KEY"
echo "================================================================"

# --- Step 1: Locate or install gcloud ---
EXISTING_SDK_ROOT=$(gcloud info --format='value(installation.sdk_root)' 2>/dev/null || true)
if [ -n "$EXISTING_SDK_ROOT" ]; then
    GCLOUD_BIN="$EXISTING_SDK_ROOT/bin/gcloud"
    echo "✅ gcloud detected at: $GCLOUD_BIN"
else
    SDK_PATH="$HOME/google-cloud-sdk"
    GCLOUD_BIN="$SDK_PATH/bin/gcloud"
    if [ ! -f "$GCLOUD_BIN" ] && [ ! -f "$SDK_PATH/bin/gcloud.cmd" ]; then
        echo "⬇️  Installing gcloud to $SDK_PATH (silent)..."
        curl -sSL https://sdk.cloud.google.com > /tmp/gcloud_install.sh
        bash /tmp/gcloud_install.sh --disable-prompts --install-dir="$HOME" || true
        rm -f /tmp/gcloud_install.sh
    else
        echo "✅ gcloud found at: $GCLOUD_BIN"
    fi
fi

# Re-resolve gcloud binary in case the install just placed it
if [ -f "$HOME/google-cloud-sdk/bin/gcloud" ]; then
    GCLOUD_BIN="$HOME/google-cloud-sdk/bin/gcloud"
elif command -v gcloud >/dev/null 2>&1; then
    GCLOUD_BIN="gcloud"
fi

if [ -z "$GCLOUD_BIN" ] || ! "$GCLOUD_BIN" --version >/dev/null 2>&1; then
    echo "⚠️  gcloud not callable. Skipping gcloud config (SA ADC still works)."
    GCLOUD_BIN=""
else
    echo "gcloud version:"
    "$GCLOUD_BIN" --version | head -3 | sed 's/^/  /'

    # --- Step 2: Set project + quota project for any user-level gcloud use ---
    "$GCLOUD_BIN" config set project "$PROJECT_ID" 2>&1 | sed 's/^/  /'
    # Activate the SA so `gcloud auth print-access-token` works without OAuth.
    "$GCLOUD_BIN" auth activate-service-account --key-file="$SA_KEY" 2>&1 | sed 's/^/  /' || true
fi

# --- Step 3: Verify Vertex AI Gemini 2.5-flash via SA token ---
echo ""
echo "--- Verifying Vertex AI access (gemini-2.5-flash) ---"
# Prefer gcloud (it's now installed and SA is activated). Falls back to Python if not.
if [ -n "$GCLOUD_BIN" ]; then
    TOKEN=$("$GCLOUD_BIN" auth print-access-token 2>/dev/null)
else
    # Python fallback — convert /c/foo to C:\foo for Windows Python.
    SA_KEY_WIN=$(echo "$SA_KEY" | sed -E 's|^/([a-zA-Z])/|\1:\\|; s|/|\\|g')
    TOKEN=$(python -c "
from google.oauth2 import service_account
from google.auth.transport.requests import Request
c = service_account.Credentials.from_service_account_file(r'$SA_KEY_WIN', scopes=['https://www.googleapis.com/auth/cloud-platform'])
c.refresh(Request())
print(c.token)
")
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Could not mint SA token."
    exit 1
fi

RESP=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "https://aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/global/publishers/google/models/gemini-2.5-flash:generateContent" \
    -d '{ "contents": [{ "role": "user", "parts": [{ "text": "Reply ONLY with the word SUCCESS" }] }], "generationConfig": { "maxOutputTokens": 8, "temperature": 0, "thinkingConfig": { "thinkingBudget": 0 } } }')

if echo "$RESP" | grep -qi "SUCCESS"; then
    echo "🎉 SUCCESS — Vertex AI Gemini 2.5-flash works with the SA."
else
    echo "⚠️  Vertex API call did not return SUCCESS:"
    echo "$RESP" | head -40
fi
