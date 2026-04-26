// ============================================================
// GCC Client-portal Estimator — full 20-category breakdown.
// Pricing reflects internal GCC bundler model, with industry
// benchmarks (Apr 2026) cross-referenced.
// ============================================================
(function () {
  'use strict';

  // ── 20-category pricing (per-unit min/mid/max) ─────────────
  const PRICE = {
    // Cabling drops
    data:     { min: 214, mid: 300, max: 425, label: 'Data drops (Cat6/6A)' },
    fiber:    { min: 65,  mid: 95,  max: 150, label: 'Fiber strand runs (per term)' },
    fiberEnc: { min: 425, mid: 650, max: 950, label: 'Fiber enclosure (LIU)' },
    fiberPp:  { min: 285, mid: 425, max: 650, label: 'Fiber patch panel' },
    coax:     { min: 175, mid: 240, max: 325, label: 'Coax (RG6/RG11) drops' },
    hdmi:     { min: 285, mid: 400, max: 575, label: 'HDMI drops (active)' },
    // Endpoints
    tv:       { min: 425, mid: 650, max: 950, label: 'TV mount + drop' },
    iot:      { min: 185, mid: 275, max: 400, label: 'IoT device (sensor/relay)' },
    aps:      { min: 285, mid: 400, max: 575, label: 'Wi-Fi access points' },
    intercom: { min: 850, mid: 1200, max: 1750, label: 'Intercom stations' },
    camInt:   { min: 700, mid: 1050, max: 1400, label: 'Interior IP cameras' },
    camExt:   { min: 850, mid: 1200, max: 1650, label: 'Exterior IP cameras (weatherized)' },
    doors:    { min: 1800, mid: 2700, max: 3500, label: 'Access-controlled doors' },
    elevator: { min: 1100, mid: 1600, max: 2200, label: 'Elevator phones' },
    ups:      { min: 850, mid: 1400, max: 2200, label: 'UPS units (rack-mount)' },
    // Infrastructure
    mdf:      { min: 4500, mid: 6500, max: 9500, label: 'MDF (main distribution frame)' },
    idf:      { min: 3500, mid: 5500, max: 8000, label: 'IDF rooms' },
    switchq:  { min: 850, mid: 1400, max: 2400, label: 'Network switches (PoE+)' },
    patch:    { min: 285, mid: 425, max: 650, label: 'Patch panels (24/48-port)' },
    ladder:   { min: 22,  mid: 38,  max: 60,  label: 'Ladder rack (per linear ft)' },
    // Conditions multipliers
    pwMultiplier:     1.55,
    afterHoursMult:   1.05,
    unionMult:        1.18,
    bondMult:         1.04,
    liftMult:         1.08,
    closeoutFlat:     { min: 350, mid: 700, max: 1300 },
    mobilizationFlat: { min: 500, mid: 1200, max: 2500 }
  };

  const CATS = ['data','fiber','fiberEnc','fiberPp','coax','hdmi','tv','iot','aps','intercom','camInt','camExt','doors','elevator','ups','mdf','idf','switchq','patch','ladder'];

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  function getInputs() {
    const form = $('#cest-form');
    const data = { projectType: 'commercial' };
    const t = form.querySelector('input[name="projectType"]:checked');
    if (t) data.projectType = t.value;
    CATS.forEach(c => {
      const v = parseInt(form.querySelector('#' + c).value, 10);
      data[c] = isNaN(v) || v < 0 ? 0 : v;
    });
    ['pw','testing','asBuilts','afterHours','metro','union','bond','liftReq'].forEach(k => {
      data[k] = form.querySelector('#' + k).checked;
    });
    return data;
  }

  function compute(d) {
    const isResi = d.projectType === 'residential';
    const isMixed = d.projectType === 'mixed';
    const lines = [];
    const resiAdjust = (range) => isResi ? { min: range.min * 0.85, mid: range.mid * 0.85, max: range.max * 0.85 } : (isMixed ? { min: range.min * 0.93, mid: range.mid * 0.93, max: range.max * 0.93 } : range);

    CATS.forEach(c => {
      const qty = d[c];
      if (qty <= 0) return;
      const tier = resiAdjust(PRICE[c]);
      lines.push({
        cat: c,
        name: `${qty} × ${PRICE[c].label}`,
        min: tier.min * qty, mid: tier.mid * qty, max: tier.max * qty
      });
    });

    if (d.asBuilts && lines.length > 0) {
      lines.push({ cat: 'closeout', name: 'As-builts + closeout package', min: PRICE.closeoutFlat.min, mid: PRICE.closeoutFlat.mid, max: PRICE.closeoutFlat.max });
    }
    if (d.metro && lines.length > 0) {
      lines.push({ cat: 'mob', name: 'Mobilization (outside KCMO+STL)', min: PRICE.mobilizationFlat.min, mid: PRICE.mobilizationFlat.mid, max: PRICE.mobilizationFlat.max });
    }

    let mn = lines.reduce((a, l) => a + l.min, 0);
    let mid = lines.reduce((a, l) => a + l.mid, 0);
    let mx = lines.reduce((a, l) => a + l.max, 0);

    const mods = [];
    if (d.pw) { mn *= PRICE.pwMultiplier; mid *= PRICE.pwMultiplier; mx *= PRICE.pwMultiplier; mods.push(`PW ×${PRICE.pwMultiplier}`); }
    if (d.union) { mn *= PRICE.unionMult; mid *= PRICE.unionMult; mx *= PRICE.unionMult; mods.push(`Union ×${PRICE.unionMult}`); }
    if (d.afterHours) { mn *= PRICE.afterHoursMult; mid *= PRICE.afterHoursMult; mx *= PRICE.afterHoursMult; mods.push(`After-hours ×${PRICE.afterHoursMult}`); }
    if (d.bond) { mn *= PRICE.bondMult; mid *= PRICE.bondMult; mx *= PRICE.bondMult; mods.push(`Bonded ×${PRICE.bondMult}`); }
    if (d.liftReq) { mn *= PRICE.liftMult; mid *= PRICE.liftMult; mx *= PRICE.liftMult; mods.push(`Lift ×${PRICE.liftMult}`); }

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
      $('#cest-lines').innerHTML = lines.map(l =>
        `<div class="sl"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`
      ).join('') + `<div class="sl tot"><span class="lbl">Midpoint subtotal</span><span>${fmt(midTotal)}</span></div>`;
    }

    // Highlight pills with non-zero values
    CATS.forEach(c => {
      const pill = document.querySelector(`.cat-pill input#${c}`)?.closest('.cat-pill');
      if (!pill) return;
      const v = parseInt(document.getElementById(c).value, 10) || 0;
      pill.classList.toggle('has-value', v > 0);
    });
  }

  // ── Wire events ────────────────────────────────────────────
  const form = $('#cest-form');
  if (!form) return;
  form.addEventListener('input', render);
  form.addEventListener('change', render);

  $$('input[name="projectType"]').forEach(r => {
    r.addEventListener('change', () => {
      $$('.choice').forEach(c => c.classList.remove('selected'));
      if (r.checked) r.closest('.choice').classList.add('selected');
    });
  });
  const checkedType = form.querySelector('input[name="projectType"]:checked');
  if (checkedType) checkedType.closest('.choice').classList.add('selected');

  // PDF export — opens a print-styled window with the line-item table
  // and triggers the browser's print dialog. User saves to PDF or prints.
  $('#cest-export')?.addEventListener('click', () => {
    if (!window.gccEstimatorPDF) { alert('PDF helper not loaded. Refresh the page and try again.'); return; }
    const d = getInputs();
    const r = compute(d);
    window.gccEstimatorPDF.exportToPDF(r, {
      title: 'Commercial estimator handoff',
      subtitle: d.projectType ? ('Project type: ' + d.projectType) : '',
      inputs: d
    });
  });
  $('#cest-save')?.addEventListener('click', () => {
    try {
      const d = getInputs();
      localStorage.setItem('gcc-cest-session', JSON.stringify({ ...d, ts: Date.now() }));
      alert('Saved to this browser. Refresh to confirm — values will reload.');
    } catch (e) { alert('Could not save: ' + e.message); }
  });
  $('#cest-handoff')?.addEventListener('click', () => {
    const d = getInputs();
    const r = compute(d);
    const summary = r.lines.map(l => l.name + ' = ' + fmt(l.mid)).join('\n');
    const subject = encodeURIComponent('GCC Estimator handoff: ' + fmt(r.midTotal) + ' midpoint');
    const body = encodeURIComponent(`Estimator session\n\nRange: ${fmt(r.minTotal)} – ${fmt(r.maxTotal)}\nMidpoint: ${fmt(r.midTotal)}\n\nLine items:\n${summary}\n\nProject type: ${d.projectType}`);
    window.location.href = `mailto:info@greencommllc.com?subject=${subject}&body=${body}`;
  });

  // Restore last session
  try {
    const saved = JSON.parse(localStorage.getItem('gcc-cest-session') || 'null');
    if (saved) {
      CATS.forEach(c => { if (saved[c] != null) form.querySelector('#' + c).value = saved[c]; });
      ['pw','testing','asBuilts','afterHours','metro','union','bond','liftReq'].forEach(k => {
        const el = form.querySelector('#' + k);
        if (el && saved[k] != null) el.checked = saved[k];
      });
      const radio = form.querySelector(`input[name="projectType"][value="${saved.projectType}"]`);
      if (radio) radio.checked = true;
    }
  } catch (_) {}

  // Soft client-id placeholder (real auth later)
  const clientId = localStorage.getItem('gcc-client-id') || sessionStorage.getItem('gcc-client-id') || 'guest';
  const idEl = document.getElementById('client-id');
  if (idEl) idEl.textContent = clientId;
  document.getElementById('logout')?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('gcc-cest-session');
    localStorage.removeItem('gcc-client-id');
    window.location.href = '/clients/';
  });

  render();

  // ─ Save/Load integration ─────────────────────────────────
  if (window.gccEstimator) {
    gccEstimator.attach({
      source: 'client-commercial',
      clientType: 'commercial',
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
        CATS.forEach(function (c) {
          if (d[c] != null) form.querySelector('#' + c).value = d[c];
        });
        ['pw','testing','asBuilts','afterHours','metro','union','bond','liftReq'].forEach(function (k) {
          if (d[k] != null) form.querySelector('#' + k).checked = !!d[k];
        });
        var r = form.querySelector('input[name="projectType"][value="' + (d.projectType || 'commercial') + '"]');
        if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
        render();
      }
    });
  }
})();
