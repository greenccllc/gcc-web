// ============================================================
// GCC Public Residential Estimator
// Pricing based on GCC's 2026 residential model + 2026 industry
// benchmarks. Wider ranges than commercial because residential
// projects vary much more by site condition (older homes,
// finished basements, attic access, etc.).
// ============================================================
(function () {
  'use strict';

  const PRICE = {
    // Networking
    drops:         { min: 175, mid: 240, max: 350 },
    aps:           { min: 285, mid: 425, max: 600 },
    // Security
    camIn:         { min: 425, mid: 650, max: 900 },
    camOut:        { min: 525, mid: 800, max: 1100 },
    doorbell:      { min: 425, mid: 650, max: 900 },
    // Smart home / AV
    smartSwitches: { min: 145, mid: 215, max: 295 },
    smartLocks:    { min: 425, mid: 600, max: 850 },
    tvMount:       { min: 350, mid: 525, max: 800 },
    // Renovations (per project, based on tier)
    bath: {
      small:  { min: 4500, mid: 7500, max: 12000 },
      medium: { min: 9500, mid: 15000, max: 22000 },
      large:  { min: 18000, mid: 28000, max: 45000 }
    },
    kitchen: {
      small:  { min: 8000, mid: 14000, max: 22000 },
      medium: { min: 22000, mid: 35000, max: 55000 },
      large:  { min: 45000, mid: 75000, max: 125000 }
    },
    // Outdoor (per unit)
    fence:         { min: 38, mid: 55, max: 85 },     // per linear foot
    deck:          { min: 45, mid: 65, max: 95 },     // per square foot
    // HVAC & electrical
    miniSplit:     { min: 2800, mid: 4200, max: 6500 },
    ceilingFan:    { min: 285, mid: 425, max: 650 },
    outlet:        { min: 225, mid: 325, max: 500 },
    // Modifiers
    rushMult:      1.10,
    permitFlat:    { min: 350, mid: 600, max: 1100 },
    mobFlat:       { min: 250, mid: 500, max: 950 }
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  function getInputs() {
    const form = $('#res-est-form');
    const data = {};
    ['drops','aps','camIn','camOut','doorbell','smartSwitches','smartLocks','tvMount','miniSplit','ceilingFan','outlet','fence','deck'].forEach(k => {
      const v = parseInt(form.querySelector('#' + k).value, 10);
      data[k] = isNaN(v) || v < 0 ? 0 : v;
    });
    data.bath    = (form.querySelector('input[name="bath"]:checked') || {}).value || '0';
    data.kitchen = (form.querySelector('input[name="kitchen"]:checked') || {}).value || '0';
    ['metro','rush','permit'].forEach(k => { data[k] = form.querySelector('#' + k).checked; });
    return data;
  }

  function compute(d) {
    const lines = [];
    const add = (qty, unitTier, name) => {
      if (qty <= 0) return;
      lines.push({ name: name.replace('{n}', qty), min: unitTier.min * qty, mid: unitTier.mid * qty, max: unitTier.max * qty });
    };
    add(d.drops, PRICE.drops, '{n} Cat6 drop(s)');
    add(d.aps, PRICE.aps, '{n} Wi-Fi 7 mesh AP(s)');
    add(d.camIn, PRICE.camIn, '{n} interior camera(s)');
    add(d.camOut, PRICE.camOut, '{n} exterior camera(s)');
    add(d.doorbell, PRICE.doorbell, '{n} smart doorbell(s)');
    add(d.smartSwitches, PRICE.smartSwitches, '{n} smart switch(es)/dimmer(s)');
    add(d.smartLocks, PRICE.smartLocks, '{n} smart lock(s)');
    add(d.tvMount, PRICE.tvMount, '{n} TV mount(s)');
    add(d.miniSplit, PRICE.miniSplit, '{n} mini-split zone(s)');
    add(d.ceilingFan, PRICE.ceilingFan, '{n} ceiling fan(s) / fixture(s)');
    add(d.outlet, PRICE.outlet, '{n} new outlet(s)/circuit(s)');

    if (d.bath !== '0' && PRICE.bath[d.bath]) {
      const r = PRICE.bath[d.bath];
      lines.push({ name: `${d.bath[0].toUpperCase() + d.bath.slice(1)} bathroom remodel`, min: r.min, mid: r.mid, max: r.max });
    }
    if (d.kitchen !== '0' && PRICE.kitchen[d.kitchen]) {
      const r = PRICE.kitchen[d.kitchen];
      const lblMap = { small: 'Cosmetic kitchen update', medium: 'Full kitchen update', large: 'Full kitchen gut' };
      lines.push({ name: lblMap[d.kitchen], min: r.min, mid: r.mid, max: r.max });
    }
    if (d.fence > 0) {
      lines.push({ name: `${d.fence} LF of fencing`, min: PRICE.fence.min * d.fence, mid: PRICE.fence.mid * d.fence, max: PRICE.fence.max * d.fence });
    }
    if (d.deck > 0) {
      lines.push({ name: `${d.deck} sq ft of decking`, min: PRICE.deck.min * d.deck, mid: PRICE.deck.mid * d.deck, max: PRICE.deck.max * d.deck });
    }
    if (d.permit && lines.length > 0) {
      lines.push({ name: 'Permit fees + admin', min: PRICE.permitFlat.min, mid: PRICE.permitFlat.mid, max: PRICE.permitFlat.max });
    }
    if (d.metro && lines.length > 0) {
      lines.push({ name: 'Mobilization (outside KCMO+STL)', min: PRICE.mobFlat.min, mid: PRICE.mobFlat.mid, max: PRICE.mobFlat.max });
    }

    let mn = lines.reduce((a, l) => a + l.min, 0);
    let mid = lines.reduce((a, l) => a + l.mid, 0);
    let mx = lines.reduce((a, l) => a + l.max, 0);

    const mods = [];
    if (d.rush && lines.length > 0) {
      mn *= PRICE.rushMult; mid *= PRICE.rushMult; mx *= PRICE.rushMult;
      mods.push(`Rush ×${PRICE.rushMult}`);
    }

    return { lines, minTotal: mn, midTotal: mid, maxTotal: mx, mods };
  }

  function render() {
    const d = getInputs();
    const { lines, minTotal, midTotal, maxTotal, mods } = compute(d);
    const result = $('#res-est-result');
    const rangeEl = $('#res-est-range');
    const basisEl = $('#res-est-basis');
    const breakdownEl = $('#res-est-breakdown');
    const linesEl = $('#res-est-lines');

    if (lines.length === 0) {
      result.classList.add('empty');
      rangeEl.textContent = 'Add something to begin →';
      basisEl.textContent = "We'll show the range as you fill it in.";
      breakdownEl.style.display = 'none';
      $$('.cat-row.has-value, .lf-row.has-value').forEach(r => r.classList.remove('has-value'));
      return;
    }

    result.classList.remove('empty');
    rangeEl.textContent = `${fmt(minTotal)} – ${fmt(maxTotal)}`;
    let basis = `Typical midpoint: ${fmt(midTotal)}`;
    if (mods.length) basis += ` · ${mods.join(', ')}`;
    basisEl.textContent = basis;
    linesEl.innerHTML = lines.map(l => `<div class="line"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`).join('') +
      `<div class="line total"><span class="lbl">Midpoint total</span><span>${fmt(midTotal)}</span></div>`;
    breakdownEl.style.display = '';

    // Highlight rows
    ['drops','aps','camIn','camOut','doorbell','smartSwitches','smartLocks','tvMount','miniSplit','ceilingFan','outlet'].forEach(k => {
      const row = document.querySelector(`.cat-row[data-cat="${k}"]`);
      if (!row) return;
      const v = parseInt(document.getElementById(k).value, 10) || 0;
      row.classList.toggle('has-value', v > 0);
    });
    ['fence','deck'].forEach(k => {
      const row = document.querySelector(`.lf-row[data-cat="${k}"]`);
      if (!row) return;
      const v = parseInt(document.getElementById(k).value, 10) || 0;
      row.classList.toggle('has-value', v > 0);
    });
  }

  // Wire events
  const form = $('#res-est-form');
  if (!form) return;
  $$('.num-stepper button').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.step;
      const delta = parseInt(b.dataset.delta, 10);
      const input = form.querySelector('#' + id);
      const cur = parseInt(input.value, 10) || 0;
      input.value = Math.max(0, cur + delta);
      render();
    });
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);

  const cta = $('#res-est-cta');
  if (cta) {
    const origHref = cta.getAttribute('href');
    cta.addEventListener('click', () => {
      const d = getInputs();
      const r = compute(d);
      if (r.lines.length > 0) {
        const params = new URLSearchParams({
          source: 'estimator-res',
          estimate: `${fmt(r.minTotal)} - ${fmt(r.maxTotal)}`,
          drops: d.drops, cameras: d.camIn + d.camOut, doorbell: d.doorbell,
          smartHome: d.smartSwitches + d.smartLocks, bath: d.bath, kitchen: d.kitchen,
          fence: d.fence, deck: d.deck
        });
        cta.setAttribute('href', origHref + '?' + params.toString());
      }
    });
  }

  render();
})();
