// ============================================================
// GCC LLC — Server-side address autocomplete (Google Places via SA)
//
// All Google API calls go through gcc-api authenticated as the GCC
// service account. The browser never sees a Maps API key. The Google
// Maps JavaScript SDK is NOT loaded — we render our own dropdown UI.
//
// Backend endpoints (see GooglePlaces.cs + Program.cs):
//   POST /api/maps/autocomplete   { input, sessionToken } -> suggestions[]
//   GET  /api/maps/place/{id}?sessionToken=...           -> details
//
// Drop-in: any input with class="addr-autocomplete" gets enhanced.
//
// Per-input options (data-* attributes — same as the prior SDK version):
//   data-target-street, data-target-city, data-target-state,
//   data-target-zip, data-target-country, data-target-formatted,
//   data-target-lat, data-target-lng
//
// Page-side hook: listen for the `gcc:addr-selected` event on the input.
// ============================================================

(function () {
  'use strict';

  var API_BASE = (window.gccApi && gccApi.base) || '';
  var DEBOUNCE_MS = 300;
  var MIN_CHARS = 3;

  // --------------------------------------------------------------------
  // Session token: groups one autocomplete + one details call into a
  // single billable session. Reset after each successful selection.
  function newSessionToken() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // --------------------------------------------------------------------
  // Backend calls
  async function fetchSuggestions(input, sessionToken) {
    var r = await fetch(API_BASE + '/api/maps/autocomplete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: input, sessionToken: sessionToken })
    });
    if (!r.ok) return [];
    var data = await r.json();
    var arr = (data && data.suggestions) || [];
    // Normalize: extract { placeId, mainText, secondaryText, formattedText }
    return arr.map(function (s) {
      var p = (s && s.placePrediction) || {};
      var t = (p.text && p.text.text) || '';
      var sf = p.structuredFormat || {};
      var main = (sf.mainText && sf.mainText.text) || t;
      var sec  = (sf.secondaryText && sf.secondaryText.text) || '';
      return { placeId: p.placeId, mainText: main, secondaryText: sec, formatted: t };
    }).filter(function (s) { return !!s.placeId; });
  }

  async function fetchDetails(placeId, sessionToken) {
    var url = API_BASE + '/api/maps/place/' + encodeURIComponent(placeId);
    if (sessionToken) url += '?sessionToken=' + encodeURIComponent(sessionToken);
    var r = await fetch(url, { credentials: 'include' });
    if (!r.ok) return null;
    return await r.json();
  }

  // --------------------------------------------------------------------
  function parseComponents(details) {
    // Places API New shape: { addressComponents: [{longText,shortText,types:[...]}], formattedAddress, location:{latitude,longitude} }
    var byType = {};
    var comps = (details && details.addressComponents) || [];
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      for (var j = 0; j < (c.types || []).length; j++) {
        var t = c.types[j];
        if (!(t in byType)) byType[t] = c;
      }
    }
    function val(key, useShort) {
      var c = byType[key];
      if (!c) return '';
      return useShort ? (c.shortText || c.longText || '') : (c.longText || c.shortText || '');
    }
    var streetNumber = val('street_number');
    var route = val('route');
    return {
      street:    (streetNumber + ' ' + route).trim(),
      city:      val('locality') || val('sublocality') || val('postal_town'),
      state:     val('administrative_area_level_1', true),
      zip:       val('postal_code', true),
      country:   val('country'),
      formatted: (details && details.formattedAddress) || '',
      lat: (details && details.location) ? details.location.latitude  : null,
      lng: (details && details.location) ? details.location.longitude : null
    };
  }

  function setTargetValue(input, key, value) {
    var attr = 'target' + key.charAt(0).toUpperCase() + key.slice(1);
    var sel = input.dataset[attr];
    if (!sel) return;
    var el = null;
    try { el = document.querySelector(sel); } catch (_) {}
    if (!el) el = document.getElementById(sel);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // --------------------------------------------------------------------
  // Inject scoped styles for the dropdown once.
  function injectStyles() {
    if (document.getElementById('gcc-addr-css')) return;
    var css = '' +
      '.gcc-addr-wrap { position: relative; }' +
      '.gcc-addr-list { position: absolute; left: 0; right: 0; top: 100%; z-index: 9999;' +
      '  background: white; border: 1px solid var(--hairline-strong, #d1d5db);' +
      '  border-radius: var(--r-sm, 6px); box-shadow: 0 4px 16px rgba(16,24,40,0.10);' +
      '  margin-top: 4px; max-height: 320px; overflow-y: auto; font-size: 14px; }' +
      '.gcc-addr-list[hidden] { display: none; }' +
      '.gcc-addr-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--hairline, #f1f5f9); }' +
      '.gcc-addr-item:last-child { border-bottom: none; }' +
      '.gcc-addr-item:hover, .gcc-addr-item[aria-selected="true"] { background: rgba(30,77,43,0.06); }' +
      '.gcc-addr-item .main { color: var(--ink, #0f172a); font-weight: 500; }' +
      '.gcc-addr-item .sec  { color: var(--slate, #64748b); font-size: 12px; margin-top: 2px; }' +
      '.gcc-addr-attribution { padding: 6px 12px; font-size: 11px; color: var(--slate-light, #94a3b8);' +
      '  border-top: 1px solid var(--hairline, #f1f5f9); text-align: right; }';
    var style = document.createElement('style');
    style.id = 'gcc-addr-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --------------------------------------------------------------------
  function attach(input) {
    if (input.dataset.addrAttached === '1') return;
    input.dataset.addrAttached = '1';
    input.setAttribute('autocomplete', 'off');  // browser autocomplete fights with ours
    input.placeholder = input.placeholder || 'Start typing an address...';

    // Wrap the input so we can absolutely-position the dropdown relative to it
    var wrap = document.createElement('div');
    wrap.className = 'gcc-addr-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var list = document.createElement('div');
    list.className = 'gcc-addr-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.appendChild(list);

    var sessionToken = newSessionToken();
    var debounceTimer = null;
    var lastQuery = '';
    var suggestions = [];
    var selectedIndex = -1;

    function render() {
      list.innerHTML = '';
      if (suggestions.length === 0) { list.hidden = true; return; }
      suggestions.forEach(function (s, i) {
        var div = document.createElement('div');
        div.className = 'gcc-addr-item';
        div.setAttribute('role', 'option');
        div.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
        div.dataset.idx = String(i);
        div.innerHTML = '<div class="main"></div><div class="sec"></div>';
        div.querySelector('.main').textContent = s.mainText || s.formatted;
        div.querySelector('.sec').textContent  = s.secondaryText || '';
        div.addEventListener('mousedown', function (e) {
          // mousedown so it fires before input's blur clears the list
          e.preventDefault();
          selectByIndex(i);
        });
        list.appendChild(div);
      });
      var attrib = document.createElement('div');
      attrib.className = 'gcc-addr-attribution';
      attrib.textContent = 'Powered by Google';
      list.appendChild(attrib);
      list.hidden = false;
    }

    async function selectByIndex(i) {
      if (i < 0 || i >= suggestions.length) return;
      var s = suggestions[i];
      list.hidden = true;
      input.value = s.formatted || s.mainText;
      try {
        var details = await fetchDetails(s.placeId, sessionToken);
        if (details) {
          var parts = parseComponents(details);
          input.value = parts.formatted || input.value;
          setTargetValue(input, 'street',    parts.street);
          setTargetValue(input, 'city',      parts.city);
          setTargetValue(input, 'state',     parts.state);
          setTargetValue(input, 'zip',       parts.zip);
          setTargetValue(input, 'country',   parts.country);
          setTargetValue(input, 'formatted', parts.formatted);
          setTargetValue(input, 'lat',       parts.lat);
          setTargetValue(input, 'lng',       parts.lng);
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new CustomEvent('gcc:addr-selected', {
            bubbles: true, detail: parts
          }));
        }
      } catch (e) {
        console.warn('[gcc-addr] details failed', e);
      }
      // New session for the next address
      sessionToken = newSessionToken();
      suggestions = [];
      selectedIndex = -1;
    }

    async function runQuery(q) {
      lastQuery = q;
      var s = await fetchSuggestions(q, sessionToken);
      if (q !== lastQuery) return; // a newer query is in flight; ignore stale results
      suggestions = s;
      selectedIndex = -1;
      render();
    }

    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (q.length < MIN_CHARS) {
        suggestions = [];
        list.hidden = true;
        return;
      }
      debounceTimer = setTimeout(function () { runQuery(q); }, DEBOUNCE_MS);
    });

    input.addEventListener('keydown', function (e) {
      if (list.hidden || suggestions.length === 0) {
        if (e.key === 'Enter') e.preventDefault();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(suggestions.length - 1, selectedIndex + 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(-1, selectedIndex - 1);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) selectByIndex(selectedIndex);
      } else if (e.key === 'Escape') {
        list.hidden = true;
      }
    });

    input.addEventListener('blur', function () {
      // Defer so a click on a list item still fires
      setTimeout(function () { list.hidden = true; }, 150);
    });

    input.addEventListener('focus', function () {
      if (suggestions.length > 0) list.hidden = false;
    });
  }

  // --------------------------------------------------------------------
  function init() {
    injectStyles();
    var inputs = document.querySelectorAll('input.addr-autocomplete:not([data-addr-attached="1"])');
    inputs.forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for dynamic re-init after JS-rendered forms
  window.gccAddr = { init: init };
})();
