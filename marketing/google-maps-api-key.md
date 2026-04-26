# Google Maps — server-side via service account (no API key needed)

> **As of 2026-04-26 there is no Maps API key to manage.** Address autocomplete
> on the contact form and customer profile pages is served by gcc-api endpoints
> that authenticate to Google as the GCC service account
> (`claude@micro-enigma-494403-d0.iam.gserviceaccount.com`). The browser never
> sees a Maps key, and there's nothing to paste into Settings.

## How the integration works

| Layer | What it does |
|---|---|
| **Browser** | `/assets/js/address-autocomplete.js` listens on any `<input class="addr-autocomplete">`. As the user types it POSTs to `/api/maps/autocomplete` (debounced) and renders our own dropdown. On selection it GETs `/api/maps/place/{placeId}` to populate hidden city/state/zip/lat/lng fields. |
| **API** | `gcc-api` proxies the calls to Google Places API (New) at `places.googleapis.com/v1/places:autocomplete` and `/v1/places/{id}`, authenticating with the SA's OAuth token (cloud-platform scope). See `GooglePlaces.cs` in `gcc-api`. |
| **GCP** | Project `micro-enigma-494403-d0` has `places.googleapis.com` enabled. The SA has no per-API role — Places permits any caller in the project once billing + the API are on. |

## What you'd actually need to do

Nothing. Both `contact.html` and `clients/profile.html` already work today.
If autocomplete ever stops working:

1. Check `https://api.greencommllc.com/api/maps/place/ChIJOz7SUaXa3ocRfefTlUfXexY` — should return JSON with `formattedAddress: "603 Seib Dr, O'Fallon, MO 63366, USA"`.
2. If 502 or empty: gcc-api is down or the SA lost cloud-platform scope.
3. If 401/403: SA key got rotated and the new file isn't at `C:\ProgramData\GCC\secrets\gcc-claude-sa.json` — re-run `setup_adc_gcc.sh` from `gcc-ops`.
4. If 429: Places API quota — bump quota in GCP Console or reduce `DEBOUNCE_MS` / `MIN_CHARS` in `address-autocomplete.js`.

## Cost control

Places API (New) charges per session (one autocomplete + one details = one
session). Our frontend issues a fresh `sessionToken` on each form interaction
and keeps it through the final selection, so the math is simple: ~1 session
per address typed.

The first $200/mo is free as part of Google's Maps Platform free tier; we
won't see a bill until we exceed about 11k autocompletes/month, which the
contact form alone won't do.

## History

The previous version of this doc described setting up a public API key in
GCP Console with HTTP-referrer restrictions, then pasting the key into
`/clients/settings.html` as `google-maps-api-key`. That whole flow is
obsolete — the key has been removed from `dbo.Settings`/Secret Manager and
the frontend no longer loads the Google Maps JS SDK at all.

The cutover commit:

- `gcc-api`: `b234855` "Settings: dbo.Settings fallback when Secret Manager is unreachable"
- `gcc-site`: `2fd2853` "Switch address-autocomplete.js to server-side /api/maps/* proxy"
