// ============================================================
// GCC LLC — Google Places address autocomplete
//
// Drop-in enhancement for any address input. On load it:
//   1. Looks for inputs with class="addr-autocomplete"
//   2. Fetches the public Maps API key from /api/public/maps-config
//   3. If a key is configured, lazy-loads the Maps SDK and attaches
//      Google Places Autocomplete to each input
//   4. If no key is configured, leaves the input as a plain text field
//      (graceful degradation — site keeps working before key is set up)
//
// Per-input options (data-* attributes):
//   data-target-street   — selector or id of the street-line input to fill
//   data-target-city
//   data-target-state
//   data-target-zip
//   data-target-country
//   data-target-formatted — selector for a hidden input to receive the full
//                           formatted address string (good for back-end use)
//   data-target-lat       — selector for hidden lat input
//   data-target-lng       — selector for hidden lng input
//
// If only the autocomplete input itself is present (no targets), the input
// receives the full formatted address on selection.
// ============================================================

(function () {
  'use strict';

  let cachedKey = null;
  let mapsLoading = null; // Promise

  async function getApiKey() {
    if (cachedKey !== null) return cachedKey;
    try {
      const r = await fetch('/api/public/maps-config').then(r => r.ok ? r.json() : null);
      cachedKey = (r && r.apiKey) || '';
    } catch (_) { cachedKey = ''; }
    return cachedKey;
  }

  function loadMapsScript(apiKey) {
    if (mapsLoading) return mapsLoading;
    mapsLoading = new Promise((resolve, reject) => {
      window.__gccMapsReady = function () { resolve(); };
      const s = document.createElement('script');
      s.async = true;
      s.defer = true;
      s.src = 'https://maps.googleapis.com/maps/api/js' +
              '?key=' + encodeURIComponent(apiKey) +
              '&libraries=places' +
              '&loading=async' +
              '&callback=__gccMapsReady';
      s.onerror = function () { reject(new Error('Maps SDK failed to load')); };
      document.head.appendChild(s);
    });
    return mapsLoading;
  }

  function parseComponents(place) {
    const out = { street_number: '', route: '', locality: '', sublocality: '',
                  administrative_area_level_1: '', postal_code: '', country: '' };
    for (const c of (place.address_components || [])) {
      for (const t of c.types) {
        if (t in out) {
          out[t] = (t === 'administrative_area_level_1' || t === 'postal_code')
            ? c.short_name
            : c.long_name;
        }
      }
    }
    return {
      street: ((out.street_number || '') + ' ' + (out.route || '')).trim(),
      city: out.locality || out.sublocality || '',
      state: out.administrative_area_level_1 || '',
      zip: out.postal_code || '',
      country: out.country || '',
      formatted: place.formatted_address || '',
      lat: (place.geometry && place.geometry.location) ? place.geometry.location.lat() : null,
      lng: (place.geometry && place.geometry.location) ? place.geometry.location.lng() : null
    };
  }

  function setTargetValue(input, key, value) {
    const attr = 'target' + key.charAt(0).toUpperCase() + key.slice(1);
    const sel = input.dataset[attr];
    if (!sel) return;
    let el = null;
    try { el = document.querySelector(sel); } catch (_) {}
    if (!el) el = document.getElementById(sel);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function attach(input) {
    if (input.dataset.addrAttached === '1') return;
    const ac = new google.maps.places.Autocomplete(input, {
      fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      types: ['address'],
      componentRestrictions: { country: ['us'] }   // restrict to US; remove if you want global
    });
    ac.addListener('place_changed', function () {
      const place = ac.getPlace();
      if (!place || !place.address_components) return;
      const parts = parseComponents(place);
      // The autocomplete input itself shows the formatted address
      input.value = parts.formatted || parts.street;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Fan out to targets
      setTargetValue(input, 'street',    parts.street);
      setTargetValue(input, 'city',      parts.city);
      setTargetValue(input, 'state',     parts.state);
      setTargetValue(input, 'zip',       parts.zip);
      setTargetValue(input, 'country',   parts.country);
      setTargetValue(input, 'formatted', parts.formatted);
      setTargetValue(input, 'lat',       parts.lat);
      setTargetValue(input, 'lng',       parts.lng);
      // Custom event so pages can react
      input.dispatchEvent(new CustomEvent('gcc:addr-selected', {
        bubbles: true, detail: parts
      }));
    });
    // Prevent ENTER inside the autocomplete from submitting the form
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
    });
    input.dataset.addrAttached = '1';
    input.placeholder = input.placeholder || 'Start typing an address…';
  }

  async function init() {
    const inputs = document.querySelectorAll('input.addr-autocomplete:not([data-addr-attached])');
    if (inputs.length === 0) return;
    const apiKey = await getApiKey();
    if (!apiKey) {
      // No key configured — leave inputs as plain text but mark them
      inputs.forEach(function (el) {
        el.dataset.addrAttached = '0';
        if (!el.placeholder) el.placeholder = 'Type address';
      });
      return;
    }
    try {
      await loadMapsScript(apiKey);
      inputs.forEach(attach);
    } catch (e) {
      // SDK failed — leave plain text
      console.warn('[gcc-addr] Maps SDK load failed; inputs remain plain text', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for dynamic usage (e.g., re-init after rendering a form via JS)
  window.gccAddr = { init: init };
})();
