// ============================================================
// GCC Client-portal Residential Estimator — full breakdown.
// All home-related GCC services with internal pricing detail.
// ============================================================
(function () {
  'use strict';

  const PRICE = {
    // Networking
    drops:       { min: 175, mid: 240, max: 350, label: 'Cat6 drop(s)' },
    aps:         { min: 285, mid: 425, max: 600, label: 'Wi-Fi 7 AP(s)' },
    fiber:       { min: 425, mid: 750, max: 1500, label: 'Fiber to house run(s)' },
    switchq:     { min: 425, mid: 700, max: 1200, label: 'Network switch(es) (PoE)' },
    ups:         { min: 425, mid: 700, max: 1200, label: 'UPS unit(s)' },
    rack:        { min: 850, mid: 1400, max: 2400, label: 'Wiring closet(s)/rack' },
    // Security
    camIn:       { min: 425, mid: 650, max: 900, label: 'Interior camera(s)' },
    camOut:      { min: 525, mid: 800, max: 1100, label: 'Exterior camera(s)' },
    doorbell:    { min: 425, mid: 650, max: 900, label: 'Smart doorbell(s)' },
    smartLocks:  { min: 425, mid: 600, max: 850, label: 'Smart lock(s)' },
    alarm:       { min: 350, mid: 525, max: 800, label: 'Alarm panel(s)' },
    sensor:      { min: 95, mid: 145, max: 215, label: 'Door/window sensor(s)' },
    // Smart Home / AV
    smartSwitches: { min: 145, mid: 215, max: 295, label: 'Smart switch(es)/dimmer(s)' },
    smartPlug:   { min: 65, mid: 95, max: 145, label: 'Smart plug(s)' },
    tvMount:     { min: 350, mid: 525, max: 800, label: 'TV mount(s)' },
    speaker:     { min: 285, mid: 425, max: 650, label: 'In-wall speaker(s)' },
    hdmi:        { min: 285, mid: 400, max: 575, label: 'HDMI drop(s)' },
    thermo:      { min: 285, mid: 400, max: 575, label: 'Smart thermostat(s)' },
    // HVAC / Electrical
    miniSplit:   { min: 2800, mid: 4200, max: 6500, label: 'Mini-split zone(s)' },
    furnace:     { min: 4500, mid: 6500, max: 9500, label: 'Furnace replacement' },
    ceilingFan:  { min: 285, mid: 425, max: 650, label: 'Ceiling fan(s)' },
    fixture:     { min: 175, mid: 265, max: 400, label: 'Fixture install(s)' },
    outlet:      { min: 225, mid: 325, max: 500, label: 'New outlet(s)/circuit(s)' },
    panel:       { min: 2800, mid: 3800, max: 5500, label: 'Panel upgrade' },
    // Renovations (per project)
    bath: {
      small:  { min: 4500, mid: 7500, max: 12000, label: 'Small bathroom (powder)' },
      medium: { min: 9500, mid: 15000, max: 22000, label: 'Medium bathroom (full)' },
      large:  { min: 18000, mid: 28000, max: 45000, label: 'Large bathroom (master)' }
    },
    kitchen: {
      small:  { min: 8000, mid: 14000, max: 22000, label: 'Cosmetic kitchen update' },
      medium: { min: 22000, mid: 35000, max: 55000, label: 'Full kitchen update' },
      large:  { min: 45000, mid: 75000, max: 125000, label: 'Full kitchen gut' }
    },
    basement: {
      small:  { min: 12000, mid: 18000, max: 26000, label: 'Partial basement finish' },
      medium: { min: 28000, mid: 45000, max: 70000, label: 'Full basement finish' }
    },
    // Per-unit rates
    addition:    { min: 145, mid: 185, max: 245, label: 'Addition' },     // per sq ft
    fence:       { min: 38, mid: 55, max: 85, label: 'Fencing' },         // per LF
    deck:        { min: 45, mid: 65, max: 95, label: 'Decking' },         // per sq ft
    patio:       { min: 18, mid: 28, max: 45, label: 'Patio' },           // per sq ft
    gate:        { min: 425, mid: 700, max: 1200, label: 'Gate(s)' },
    // Modifiers
    rushMult:    1.10,
    oldHomeMult: 1.15,   // pre-1980, more demo/abatement risk
    finishedMult: 1.12,  // finished basement = drywall removal access
    hoaMult:     1.04,   // admin overhead for HOA review
    permitFlat:  { min: 350, mid: 600, max: 1100 },
    mobFlat:     { min: 250, mid: 500, max: 950 }
  };

  const ITEM_KEYS = ['drops','aps','fiber','switchq','ups','rack','camIn','camOut','doorbell','smartLocks','alarm','sensor','smartSwitches','smartPlug','tvMount','speaker','hdmi','thermo','miniSplit','furnace','ceilingFan','fixture','outlet','panel','addition','fence','deck','patio','gate'];

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  function getInputs() {
    const form = $('#cest-form');
    const data = {};
    ITEM_KEYS.forEach(k => {
      const v = parseInt(form.querySelector('#' + k).value, 10);
      data[k] = isNaN(v) || v < 0 ? 0 : v;
    });
    data.bath     = (form.querySelector('input[name="bath"]:checked') || {}).value || '0';
    data.kitchen  = (form.querySelector('input[name="kitchen"]:checked') || {}).value || '0';
    data.basement = (form.querySelector('input[name="basement"]:checked') || {}).value || '0';
    ['metro','rush','permit','oldHome','finished','hoa'].forEach(k => {
      data[k] = form.querySelector('#' + k).checked;
    });
    return data;
  }

  function compute(d) {
    const lines = [];
    ITEM_KEYS.forEach(k => {
      const qty = d[k];
      if (qty <= 0) return;
      const t = PRICE[k];
      lines.push({ name: `${qty} × ${t.label}`, min: t.min * qty, mid: t.mid * qty, max: t.max * qty });
    });
    if (d.bath !== '0' && PRICE.bath[d.bath]) {
      const t = PRICE.bath[d.bath];
      lines.push({ name: t.label, min: t.min, mid: t.mid, max: t.max });
    }
    if (d.kitchen !== '0' && PRICE.kitchen[d.kitchen]) {
      const t = PRICE.kitchen[d.kitchen];
      lines.push({ name: t.label, min: t.min, mid: t.mid, max: t.max });
    }
    if (d.basement !== '0' && PRICE.basement[d.basement]) {
      const t = PRICE.basement[d.basement];
      lines.push({ name: t.label, min: t.min, mid: t.mid, max: t.max });
    }
    if (d.permit && lines.length > 0) {
      lines.push({ name: 'Permit fees + admin', min: PRICE.permitFlat.min, mid: PRICE.permitFlat.mid, max: PRICE.permitFlat.max });
    }
    if (d.metro && lines.length > 0) {
      lines.push({ name: 'Mobilization (outside KCMO+STL)', min: PRICE.mobFlat.min, mid: PRICE.mobFlat.mid, max: PRICE.mobFlat.max });
    }

    let mn = lines.reduce((a,l) => a + l.min, 0);
    let mid = lines.reduce((a,l) => a + l.mid, 0);
    let mx = lines.reduce((a,l) => a + l.max, 0);

    const mods = [];
    const apply = (mult, label) => { mn *= mult; mid *= mult; mx *= mult; mods.push(`${label} ×${mult}`); };
    if (d.rush) apply(PRICE.rushMult, 'Rush');
    if (d.oldHome) apply(PRICE.oldHomeMult, 'Pre-1980');
    if (d.finished) apply(PRICE.finishedMult, 'Finished basement');
    if (d.hoa) apply(PRICE.hoaMult, 'HOA');

    return { lines, minTotal: mn, midTotal: mid, maxTotal: mx, mods };
  }

  function render() {
    const d = getInputs();
    const { lines, minTotal, midTotal, maxTotal, mods } = compute(d);
    if (lines.length === 0) {
      $('#cest-range').textContent = '$0';
      $('#cest-mid').textContent = 'Add quantities to begin';
      $('#cest-lines').innerHTML = '<div style="color: rgba(255,255,255,0.55); font-style: italic; padding: 8px 0;">Pick categories on the left</div>';
    } else {
      $('#cest-range').textContent = `${fmt(minTotal)} – ${fmt(maxTotal)}`;
      let basis = `Midpoint: ${fmt(midTotal)}`;
      if (mods.length) basis += ` · ${mods.join(', ')}`;
      $('#cest-mid').textContent = basis;
      $('#cest-lines').innerHTML = lines.map(l => `<div class="sl"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`).join('') +
        `<div class="sl tot"><span class="lbl">Midpoint subtotal</span><span>${fmt(midTotal)}</span></div>`;
    }
    ITEM_KEYS.forEach(k => {
      const pill = document.querySelector(`.cat-pill input#${k}`)?.closest('.cat-pill');
      if (!pill) return;
      const v = parseInt(document.getElementById(k).value, 10) || 0;
      pill.classList.toggle('has-value', v > 0);
    });
  }

  const form = $('#cest-form');
  if (!form) return;
  form.addEventListener('input', render);
  form.addEventListener('change', render);

  $('#cest-export')?.addEventListener('click', () => alert('PDF export coming soon. For now, copy the breakdown panel.'));
  $('#cest-save')?.addEventListener('click', () => {
    try {
      localStorage.setItem('gcc-cest-res-session', JSON.stringify({ ...getInputs(), ts: Date.now() }));
      alert('Saved. Refresh to confirm — values reload.');
    } catch (e) { alert('Save failed: ' + e.message); }
  });
  $('#cest-handoff')?.addEventListener('click', () => {
    const d = getInputs();
    const r = compute(d);
    const summary = r.lines.map(l => l.name + ' = ' + fmt(l.mid)).join('\n');
    const subject = encodeURIComponent('GCC Residential Estimator: ' + fmt(r.midTotal));
    const body = encodeURIComponent(`Residential estimator session\n\nRange: ${fmt(r.minTotal)} – ${fmt(r.maxTotal)}\nMidpoint: ${fmt(r.midTotal)}\n\nLine items:\n${summary}`);
    window.location.href = `mailto:info@greencommllc.com?subject=${subject}&body=${body}`;
  });

  // Restore session
  try {
    const saved = JSON.parse(localStorage.getItem('gcc-cest-res-session') || 'null');
    if (saved) {
      ITEM_KEYS.forEach(k => { if (saved[k] != null) form.querySelector('#' + k).value = saved[k]; });
      ['metro','rush','permit','oldHome','finished','hoa'].forEach(k => {
        const el = form.querySelector('#' + k);
        if (el && saved[k] != null) el.checked = saved[k];
      });
      ['bath','kitchen','basement'].forEach(k => {
        if (!saved[k]) return;
        const radio = form.querySelector(`input[name="${k}"][value="${saved[k]}"]`);
        if (radio) radio.checked = true;
      });
    }
  } catch (_) {}

  const clientId = localStorage.getItem('gcc-client-id') || 'guest';
  const idEl = document.getElementById('client-id');
  if (idEl) idEl.textContent = clientId;
  document.getElementById('logout')?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('gcc-cest-res-session');
    localStorage.removeItem('gcc-client-id');
    localStorage.removeItem('gcc-client-type');
    window.location.href = '/clients/';
  });

  render();

  // ─ Save/Load integration ─────────────────────────────────
  if (window.gccEstimator) {
    gccEstimator.attach({
      source: 'client-residential',
      clientType: 'residential',
      getPayload: function () {
        var d = getInputs();
        var r = compute(d);
        return {
          form: d,
          lines: r.lines,
          min: r.minTotal,
          mid: r.midTotal,
          max: r.maxTotal,
          projectName: null
        };
      },
      applyPayload: function (payload) {
        if (!payload || !payload.form) return;
        var d = payload.form;
        ITEM_KEYS.forEach(function (k) {
          if (d[k] != null) form.querySelector('#' + k).value = d[k];
        });
        ['metro','rush','permit','oldHome','finished','hoa'].forEach(function (k) {
          if (d[k] != null) form.querySelector('#' + k).checked = !!d[k];
        });
        ['bath','kitchen','basement'].forEach(function (k) {
          if (!d[k]) return;
          var r = form.querySelector('input[name="' + k + '"][value="' + d[k] + '"]');
          if (r) r.checked = true;
        });
        render();
      }
    });
  }
})();
