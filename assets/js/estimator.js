// ============================================================
// GCC Public Instant Estimator
// 6 categories: data drops, cameras, door access, speakers,
// fiber backbones, server rooms. Pricing benchmarked against
// industry data (Apr 2026) + GCC's 2026 Business Plan §5.4.
// ============================================================
(function () {
  'use strict';

  // ── Pricing constants ──────────────────────────────────────
  // Sources (industry benchmarks, Apr 2026):
  // - Cat6 commercial drop: $100-$250 industry mid; GCC $214/drop bundler
  // - IP camera (full install): $700-$1500 (HW + labor + cabling)
  // - Access door full system: $3K-$5K typical, low-end $1K-$3K
  // - 70V ceiling speaker installed: $200-$500 each
  // - Fiber run (100-200 ft commercial): $450-$1500 incl term
  // - Server room/IDF build: $3.5K-$8K (GCC: 16-24 hrs @ $120/hr)
  const PRICE = {
    dropCommercial:    { min: 214, mid: 300, max: 425 },
    dropResidential:   { min: 175, mid: 240, max: 325 },
    dropMixed:         { min: 195, mid: 270, max: 375 },
    cameraIp:          { min: 700, mid: 1050, max: 1400 },
    doorAccess:        { min: 1800, mid: 2700, max: 3500 },
    speaker70v:        { min: 220, mid: 350, max: 500 },
    fiberRun:          { min: 450, mid: 850, max: 1500 },
    serverRoom:        { min: 3500, mid: 5500, max: 8000 },
    pwMultiplier:      1.55,
    afterHoursMult:    1.05,
    mobilizationFlat:  { min: 500, mid: 1200, max: 2500 },
    closeoutFlat:      { min: 250, mid: 500, max: 900 }
  };

  // ── Helpers ─────────────────────────────────────────────────
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  function getInputs() {
    const form = $('#estimator-form');
    const data = { projectType: 'commercial' };
    const t = form.querySelector('input[name="projectType"]:checked');
    if (t) data.projectType = t.value;
    ['drops','cameras','doors','speakers','fiberRuns','serverRooms'].forEach(k => {
      const v = parseInt(form.querySelector('#' + k).value, 10);
      data[k] = isNaN(v) || v < 0 ? 0 : v;
    });
    ['pw','testing','asBuilts','afterHours','metro'].forEach(k => {
      data[k] = form.querySelector('#' + k).checked;
    });
    return data;
  }

  function computeTotals(d) {
    const isResi = d.projectType === 'residential';
    const isMixed = d.projectType === 'mixed';
    const lines = [];

    if (d.drops > 0) {
      const tier = isResi ? PRICE.dropResidential : (isMixed ? PRICE.dropMixed : PRICE.dropCommercial);
      lines.push({ name: `${d.drops} data drop${d.drops === 1 ? '' : 's'} (Cat6/6A)`, min: tier.min * d.drops, mid: tier.mid * d.drops, max: tier.max * d.drops });
    }
    if (d.cameras > 0) {
      lines.push({ name: `${d.cameras} IP camera${d.cameras === 1 ? '' : 's'} (full install)`, min: PRICE.cameraIp.min * d.cameras, mid: PRICE.cameraIp.mid * d.cameras, max: PRICE.cameraIp.max * d.cameras });
    }
    if (d.doors > 0) {
      lines.push({ name: `${d.doors} access-controlled door${d.doors === 1 ? '' : 's'}`, min: PRICE.doorAccess.min * d.doors, mid: PRICE.doorAccess.mid * d.doors, max: PRICE.doorAccess.max * d.doors });
    }
    if (d.speakers > 0) {
      lines.push({ name: `${d.speakers} 70V speaker${d.speakers === 1 ? '' : 's'} + amp/zone wiring`, min: PRICE.speaker70v.min * d.speakers, mid: PRICE.speaker70v.mid * d.speakers, max: PRICE.speaker70v.max * d.speakers });
    }
    if (d.fiberRuns > 0) {
      lines.push({ name: `${d.fiberRuns} fiber backbone run${d.fiberRuns === 1 ? '' : 's'}`, min: PRICE.fiberRun.min * d.fiberRuns, mid: PRICE.fiberRun.mid * d.fiberRuns, max: PRICE.fiberRun.max * d.fiberRuns });
    }
    if (d.serverRooms > 0) {
      lines.push({ name: `${d.serverRooms} server room${d.serverRooms === 1 ? '' : 's'} / IDF build`, min: PRICE.serverRoom.min * d.serverRooms, mid: PRICE.serverRoom.mid * d.serverRooms, max: PRICE.serverRoom.max * d.serverRooms });
    }
    if (d.asBuilts && lines.length > 0) {
      lines.push({ name: 'As-builts + closeout package', min: PRICE.closeoutFlat.min, mid: PRICE.closeoutFlat.mid, max: PRICE.closeoutFlat.max });
    }
    if (d.metro && lines.length > 0) {
      lines.push({ name: 'Mobilization (outside KCMO+STL)', min: PRICE.mobilizationFlat.min, mid: PRICE.mobilizationFlat.mid, max: PRICE.mobilizationFlat.max });
    }

    let minTotal = lines.reduce((a, l) => a + l.min, 0);
    let midTotal = lines.reduce((a, l) => a + l.mid, 0);
    let maxTotal = lines.reduce((a, l) => a + l.max, 0);

    const modifiers = [];
    if (d.pw && lines.length > 0) {
      minTotal *= PRICE.pwMultiplier; midTotal *= PRICE.pwMultiplier; maxTotal *= PRICE.pwMultiplier;
      modifiers.push(`Prevailing wage ×${PRICE.pwMultiplier}`);
    }
    if (d.afterHours && lines.length > 0) {
      minTotal *= PRICE.afterHoursMult; midTotal *= PRICE.afterHoursMult; maxTotal *= PRICE.afterHoursMult;
      modifiers.push(`Weekend/night ×${PRICE.afterHoursMult}`);
    }

    return { lines, minTotal, midTotal, maxTotal, modifiers };
  }

  function render() {
    const data = getInputs();
    const { lines, minTotal, midTotal, maxTotal, modifiers } = computeTotals(data);
    const result = $('#est-result');
    const rangeEl = $('#est-range');
    const basisEl = $('#est-basis');
    const breakdownEl = $('#est-breakdown');
    const linesEl = $('#est-lines');

    if (lines.length === 0) {
      result.classList.add('empty');
      rangeEl.textContent = 'Add something to the form →';
      basisEl.textContent = "We'll show the range as you fill it in.";
      breakdownEl.style.display = 'none';
      // clear has-value highlights
      $$('.cat-row.has-value').forEach(r => r.classList.remove('has-value'));
      return;
    }

    result.classList.remove('empty');
    rangeEl.textContent = `${fmt(minTotal)} – ${fmt(maxTotal)}`;

    let basis = `Typical midpoint: ${fmt(midTotal)}`;
    if (modifiers.length) basis += ` · ${modifiers.join(', ')}`;
    basisEl.textContent = basis;

    linesEl.innerHTML = lines.map(l => `<div class="line"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`).join('') +
      `<div class="line total"><span class="lbl">Midpoint total</span><span>${fmt(midTotal)}</span></div>`;
    breakdownEl.style.display = '';

    // Highlight cat-rows that have non-zero values
    ['drops','cameras','doors','speakers','fiberRuns','serverRooms'].forEach(k => {
      const row = document.querySelector(`.cat-row[data-cat="${k}"]`);
      if (!row) return;
      const v = parseInt(document.getElementById(k).value, 10) || 0;
      row.classList.toggle('has-value', v > 0);
    });
  }

  // ── Wire events ────────────────────────────────────────────
  const form = $('#estimator-form');
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

  $$('input[name="projectType"]').forEach(r => {
    r.addEventListener('change', () => {
      $$('.choice').forEach(c => c.classList.remove('selected'));
      if (r.checked) r.closest('.choice').classList.add('selected');
    });
  });
  const checkedType = form.querySelector('input[name="projectType"]:checked');
  if (checkedType) checkedType.closest('.choice').classList.add('selected');

  const cta = $('#est-cta');
  if (cta) {
    const origHref = cta.getAttribute('href');
    cta.addEventListener('click', () => {
      const d = getInputs();
      const r = computeTotals(d);
      if (r.lines.length > 0) {
        const params = new URLSearchParams({
          source: 'estimator',
          estimate: `${fmt(r.minTotal)} - ${fmt(r.maxTotal)}`,
          drops: d.drops, cameras: d.cameras, doors: d.doors,
          speakers: d.speakers, fibers: d.fiberRuns, servers: d.serverRooms,
          type: d.projectType
        });
        cta.setAttribute('href', origHref + '?' + params.toString());
      }
    });
  }

  render();
})();
