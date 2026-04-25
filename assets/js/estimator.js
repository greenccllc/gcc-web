// ============================================================
// GCC Instant Estimator
// Public-facing simplified version of the bundler pricing logic.
// Pricing baselines pulled from the 2026 Business Plan §5.4 +
// in-bundler rules: $120/hr commercial labor, $214/drop full
// install, 30% material markup. Ranges are intentionally wide
// (±20%) because we don't have site conditions from a form.
// ============================================================
(function () {
  'use strict';

  // ── Pricing constants ──────────────────────────────────────
  const PRICE = {
    // Per-drop (termination + labor + low-voltage cabling on per-drop basis)
    // Bundler auto-clamps turnkey per-drop to $250-$500; we midpoint to $214-$425
    dropCommercial:    { min: 214, mid: 300, max: 425 },
    dropResidential:   { min: 175, mid: 240, max: 325 },
    // Fiber backbone run (per-run, plus termination both ends)
    fiberRun:          { min: 450, mid: 750, max: 1200 },
    // Telecom room build-out (rack, patch panels, ladder, grounding)
    telecomRoomSmall:  { min: 3500, mid: 5500, max: 8000 },   // ~16-24 hrs @ $120
    // IP camera (hardware + labor + mount)
    cameraIp:          { min: 425, mid: 600, max: 850 },
    // Access-controlled door (hub, reader, mag/strike, intercom-prep)
    doorAccess:        { min: 1400, mid: 2000, max: 2800 },
    // Wi-Fi AP (AP hardware + ceiling mount + cabling already counted in drops)
    accessPoint:       { min: 285, mid: 400, max: 575 },
    // Multipliers
    pwMultiplier:      1.55,   // Prevailing wage bump
    afterHoursMult:    1.05,   // Weekend/night surcharge
    mobilizationFlat:  { min: 500, mid: 1200, max: 2500 },
    // Closeout package (small flat) if as-builts requested
    closeoutFlat:      { min: 250, mid: 500, max: 900 }
  };

  // ── Helpers ─────────────────────────────────────────────────
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  function getInputs() {
    const form = $('#estimator-form');
    const data = { projectType: 'commercial' };
    const typeInput = form.querySelector('input[name="projectType"]:checked');
    if (typeInput) data.projectType = typeInput.value;
    ['drops','fiberRuns','telecomRooms','cameras','doors','aps'].forEach(k => {
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

    // Cabling drops
    if (d.drops > 0) {
      const tier = isResi ? PRICE.dropResidential
                   : isMixed ? { min:195, mid:270, max:375 }
                   : PRICE.dropCommercial;
      lines.push({
        name: `${d.drops} data drop${d.drops === 1 ? '' : 's'} (Cat6/6A)`,
        min: tier.min * d.drops, mid: tier.mid * d.drops, max: tier.max * d.drops
      });
    }
    // Fiber
    if (d.fiberRuns > 0) {
      lines.push({
        name: `${d.fiberRuns} fiber backbone run${d.fiberRuns === 1 ? '' : 's'}`,
        min: PRICE.fiberRun.min * d.fiberRuns, mid: PRICE.fiberRun.mid * d.fiberRuns, max: PRICE.fiberRun.max * d.fiberRuns
      });
    }
    // Telecom rooms
    if (d.telecomRooms > 0) {
      lines.push({
        name: `${d.telecomRooms} telecom room${d.telecomRooms === 1 ? '' : 's'} / IDF`,
        min: PRICE.telecomRoomSmall.min * d.telecomRooms, mid: PRICE.telecomRoomSmall.mid * d.telecomRooms, max: PRICE.telecomRoomSmall.max * d.telecomRooms
      });
    }
    // Cameras
    if (d.cameras > 0) {
      lines.push({
        name: `${d.cameras} IP camera${d.cameras === 1 ? '' : 's'} (Ubiquiti G6)`,
        min: PRICE.cameraIp.min * d.cameras, mid: PRICE.cameraIp.mid * d.cameras, max: PRICE.cameraIp.max * d.cameras
      });
    }
    // Access doors
    if (d.doors > 0) {
      lines.push({
        name: `${d.doors} access-controlled door${d.doors === 1 ? '' : 's'}`,
        min: PRICE.doorAccess.min * d.doors, mid: PRICE.doorAccess.mid * d.doors, max: PRICE.doorAccess.max * d.doors
      });
    }
    // APs
    if (d.aps > 0) {
      lines.push({
        name: `${d.aps} Wi-Fi 7 access point${d.aps === 1 ? '' : 's'}`,
        min: PRICE.accessPoint.min * d.aps, mid: PRICE.accessPoint.mid * d.aps, max: PRICE.accessPoint.max * d.aps
      });
    }
    // As-builts
    if (d.asBuilts && lines.length > 0) {
      lines.push({
        name: 'As-builts + closeout package',
        min: PRICE.closeoutFlat.min, mid: PRICE.closeoutFlat.mid, max: PRICE.closeoutFlat.max
      });
    }
    // Mobilization
    if (d.metro && lines.length > 0) {
      lines.push({
        name: 'Mobilization (outside KCMO+STL)',
        min: PRICE.mobilizationFlat.min, mid: PRICE.mobilizationFlat.mid, max: PRICE.mobilizationFlat.max
      });
    }

    // Subtotals
    let minTotal = lines.reduce((a,l) => a + l.min, 0);
    let midTotal = lines.reduce((a,l) => a + l.mid, 0);
    let maxTotal = lines.reduce((a,l) => a + l.max, 0);

    // Multipliers
    const modifiers = [];
    if (d.pw && lines.length > 0) {
      minTotal *= PRICE.pwMultiplier;
      midTotal *= PRICE.pwMultiplier;
      maxTotal *= PRICE.pwMultiplier;
      modifiers.push(`Prevailing wage ×${PRICE.pwMultiplier}`);
    }
    if (d.afterHours && lines.length > 0) {
      minTotal *= PRICE.afterHoursMult;
      midTotal *= PRICE.afterHoursMult;
      maxTotal *= PRICE.afterHoursMult;
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
      basisEl.textContent = 'We\'ll show the range as you fill it in.';
      breakdownEl.style.display = 'none';
      return;
    }

    result.classList.remove('empty');
    rangeEl.textContent = `${fmt(minTotal)} – ${fmt(maxTotal)}`;

    let basis = `Typical midpoint: ${fmt(midTotal)}`;
    if (modifiers.length) basis += ` · ${modifiers.join(', ')}`;
    basisEl.textContent = basis;

    linesEl.innerHTML = lines.map(l =>
      `<div class="line"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`
    ).join('') + `<div class="line total"><span class="lbl">Midpoint total</span><span>${fmt(midTotal)}</span></div>`;
    breakdownEl.style.display = '';
  }

  // ── Wire events ────────────────────────────────────────────
  const form = $('#estimator-form');
  if (!form) return;

  // +/- stepper buttons
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

  // Any change
  form.addEventListener('input', render);
  form.addEventListener('change', render);

  // Radio-button visual selection
  $$('input[name="projectType"]').forEach(r => {
    r.addEventListener('change', () => {
      $$('.choice').forEach(c => c.classList.remove('selected'));
      if (r.checked) r.closest('.choice').classList.add('selected');
    });
  });
  // Init selection state
  const checkedType = form.querySelector('input[name="projectType"]:checked');
  if (checkedType) checkedType.closest('.choice').classList.add('selected');

  // Pass current estimate to contact page via query string
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
          drops: d.drops, cameras: d.cameras, doors: d.doors, aps: d.aps, fibers: d.fiberRuns, trooms: d.telecomRooms,
          type: d.projectType
        });
        cta.setAttribute('href', origHref + '?' + params.toString());
      }
    });
  }

  // Initial render
  render();
})();
