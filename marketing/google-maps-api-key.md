# Google Maps API key for address autocomplete

The contact form (Project site address) and the customer profile page
(Company address + Billing address) use Google Places Autocomplete to
suggest real addresses as users type. Without a configured API key,
those fields gracefully degrade to plain text inputs (still work, just
no suggestions).

## One-time setup (~10 min, free)

### 1. Create a Google Cloud project (or reuse an existing one)
https://console.cloud.google.com/projectcreate
- Project name: `greencommllc-maps` (anything works; this is internal)
- Skip the org selection if prompted

### 2. Enable the APIs
In your project, go to **APIs & Services → Library** and enable:
- **Maps JavaScript API**
- **Places API** *(legacy — needed for `Autocomplete`)*
- *(optional)* **Geocoding API** if you ever want server-side geocoding

### 3. Create an API key
**APIs & Services → Credentials → Create Credentials → API key.**
Copy the key. It will look like `AIzaSy...`.

### 4. Restrict the key (CRITICAL — otherwise anyone can use it on your dime)

**Application restrictions:** HTTP referrers
- Add: `https://greencommllc.com/*`
- Add: `https://www.greencommllc.com/*`
- Add: `https://*.greencommllc.com/*`
- *(optional, dev only)* `http://localhost:*/*`

**API restrictions:** Restrict key
- Maps JavaScript API
- Places API

### 5. Set a budget alert
**Billing → Budgets & alerts → Create Budget**
- Amount: $10/month is plenty (Places API is ~$17 per 1k autocomplete sessions; this site won't generate that volume).
- Notify yourself at 50% / 90% / 100%.

The first $200/mo is free as part of Google's Maps Platform free tier, so
unless you do > 11k autocomplete sessions in a month you'll never see a bill.

### 6. Save the key in our admin

Once you have the key string:
1. Sign in to greencommllc.com as admin
2. Open **Admin → Admin Settings** (or `/clients/settings.html` → Infrastructure section)
3. Add a new infra credential:
   - **Key**: `google-maps-api-key`
   - **Value**: paste the `AIzaSy...` key
   - **Secret**: yes (it's restricted by referrer but still treat as a secret)
4. Save.

The very next pageload of `/contact.html` or `/clients/profile.html` will
fetch the key from `/api/public/maps-config` and lazy-load the Google
Maps SDK. Address autocomplete activates automatically — no rebuild
required.

## How the integration works

| Layer | What it does |
|---|---|
| **Browser** | Loads `/assets/js/address-autocomplete.js`. Scans for `<input class="addr-autocomplete">`. Asks `/api/public/maps-config` for the key. If a key exists, lazy-loads the Maps SDK and attaches `google.maps.places.Autocomplete` to each input. If no key, leaves inputs as plain text. |
| **API** | `GET /api/public/maps-config` reads `dbo.Settings` for `Scope='infra' Key='google-maps-api-key'` and returns `{ apiKey: "..." }`. Public endpoint — security is enforced by the HTTP-referrer restrictions on the key itself, not by our auth. |
| **Database** | `dbo.Settings` row owned by an admin's profile. Marked secret so the value isn't echoed in non-admin contexts; the public-config endpoint reads it server-side and forwards only the key. |

## Testing

After saving the key, hard-refresh the contact form (Ctrl+F5) and start
typing an address into the **Project site address** field. You should
see Google's dropdown of suggestions. Selecting one fills the input
with the formatted address and populates the hidden `addr_city`,
`addr_state`, `addr_zip`, `addr_formatted`, `addr_lat`, `addr_lng` fields
which are submitted along with the rest of the form.

## Cost-control reminders

- HTTP referrer restrictions block the key from being abused if scraped from the page source.
- Budget alerts catch usage spikes before they become bills.
- `loading=async` + `defer` in the Maps SDK loader keeps the page fast
  even when the SDK is loading.
- The widget only loads the SDK once (cached promise) and only runs when
  there's at least one `.addr-autocomplete` input on the page.

## Future enhancements (not in scope today)

- **Server-side geocoding** for the contact form's `addr_lat` / `addr_lng`
  via the Geocoding API — would let us auto-categorize leads as in-area
  vs. out-of-area without the user typing anything.
- **Static Map preview** below the address field once selected — adds
  visual confirmation but uses an extra API call per page view.
- **Place IDs** stored alongside the address — Google's stable identifier
  for a location, useful if we ever build a "verified site visit" workflow.
