// ============================================================
// GCC Public Instant Estimator (commercial)
// Seven categories: data drops, access points, cameras, door
// access, speakers, fiber backbones, telecom rooms.
// Every price lives in PRICE below. Change it here and nowhere
// else; the page copy does not repeat any of these figures.
// ============================================================
(function () {
  'use strict';

  // ── Pricing constants (2026) ───────────────────────────────
  // `furnished` = GCC supplies the device. `owner` = the customer
  // supplies it and GCC cables, mounts, aims and configures.
  const PRICE = {
    drop:        { min: 265, mid: 390, max: 475 },
    ap:          { furnished: { min: 585,  mid: 750,  max: 1100 }, owner: { min: 320, mid: 490,  max: 840 } },
    camera:      { furnished: { min: 850,  mid: 1050, max: 1280 }, owner: { min: 345, mid: 560,  max: 1020 } },
    door:        { furnished: { min: 1390, mid: 1875, max: 2950 }, owner: { min: 950, mid: 1235, max: 1460 } },
    speaker:     { min: 215, mid: 245, max: 275 },
    fiberRun:    { min: 1800, mid: 3000, max: 4800 },
    telecomRoom: { min: 2500, mid: 4500, max: 8000 },
    pwFactor: 1.12,          // prevailing-wage projects
    projectMinimum: 5000     // fixed-price commercial projects start here
  };

  const QTY_FIELDS  = ['drops', 'aps', 'cameras', 'doors', 'speakers', 'fiberRuns', 'serverRooms'];
  const FLAG_FIELDS = ['ownerDevices', 'pw', 'afterHours', 'metro'];

  // ── Helpers ─────────────────────────────────────────────────
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function getInputs() {
    const form = $('#estimator-form');
    const data = { projectType: 'commercial' };
    QTY_FIELDS.forEach(k => {
      const input = form.querySelector('#' + k);
      const v = input ? parseInt(input.value, 10) : 0;
      data[k] = isNaN(v) || v < 0 ? 0 : v;
    });
    FLAG_FIELDS.forEach(k => {
      const input = form.querySelector('#' + k);
      data[k] = !!(input && input.checked);
    });
    return data;
  }

  function computeTotals(d) {
    const lines = [];
    const mode = d.ownerDevices ? 'owner' : 'furnished';
    const add = (qty, tier, name) => {
      if (qty <= 0) return;
      lines.push({ name, min: tier.min * qty, mid: tier.mid * qty, max: tier.max * qty });
    };

    add(d.drops, PRICE.drop, `${plural(d.drops, 'Cat6A data drop', 'Cat6A data drops')}, certified`);
    add(d.aps, PRICE.ap[mode], d.ownerDevices
      ? `${plural(d.aps, 'access point location', 'access point locations')} (your APs)`
      : `${plural(d.aps, 'Wi-Fi access point', 'Wi-Fi access points')}, installed`);
    add(d.cameras, PRICE.camera[mode], d.ownerDevices
      ? `${plural(d.cameras, 'camera location', 'camera locations')} (your cameras)`
      : `${plural(d.cameras, 'IP camera', 'IP cameras')}, installed`);
    add(d.doors, PRICE.door[mode], d.ownerDevices
      ? `${plural(d.doors, 'door', 'doors')} cabled and installed (your hardware)`
      : `${plural(d.doors, 'access-controlled door', 'access-controlled doors')}, complete`);
    add(d.speakers, PRICE.speaker, plural(d.speakers, 'ceiling speaker', 'ceiling speakers'));
    add(d.fiberRuns, PRICE.fiberRun, plural(d.fiberRuns, 'fiber backbone', 'fiber backbones'));
    add(d.serverRooms, PRICE.telecomRoom, plural(d.serverRooms, 'telecom room build', 'telecom room builds'));

    let minTotal = lines.reduce((a, l) => a + l.min, 0);
    let midTotal = lines.reduce((a, l) => a + l.mid, 0);
    let maxTotal = lines.reduce((a, l) => a + l.max, 0);

    const notes = [];
    if (lines.length > 0) {
      if (d.pw) {
        minTotal *= PRICE.pwFactor; midTotal *= PRICE.pwFactor; maxTotal *= PRICE.pwFactor;
        lines.forEach(l => { l.min *= PRICE.pwFactor; l.mid *= PRICE.pwFactor; l.max *= PRICE.pwFactor; });
        notes.push('Prevailing-wage rates applied. Certified payroll is included at no charge.');
      }
      if (d.afterHours) notes.push('Nights and weekends carry no premium. Same price.');
      if (d.metro) notes.push('Travel outside the St. Louis and Kansas City metros is priced with your quote.');
      if (d.ownerDevices) notes.push('You supply the cameras, access points and door hardware. We cable, mount and configure them.');
    }

    const belowMinimum = lines.length > 0 && maxTotal < PRICE.projectMinimum;
    const flooredMin = Math.max(minTotal, PRICE.projectMinimum);
    const flooredMid = Math.max(midTotal, PRICE.projectMinimum);
    const flooredMax = Math.max(maxTotal, PRICE.projectMinimum);

    return {
      lines, notes, belowMinimum,
      rawMin: minTotal, rawMid: midTotal, rawMax: maxTotal,
      minTotal: lines.length ? flooredMin : 0,
      midTotal: lines.length ? flooredMid : 0,
      maxTotal: lines.length ? flooredMax : 0
    };
  }

  function rangeText(r) {
    if (r.belowMinimum) return `From ${fmt(PRICE.projectMinimum)}`;
    if (Math.round(r.minTotal) === Math.round(r.maxTotal)) return fmt(r.minTotal);
    return `${fmt(r.minTotal)} – ${fmt(r.maxTotal)}`;
  }

  function render() {
    const data = getInputs();
    const r = computeTotals(data);
    const result = $('#est-result');
    const rangeEl = $('#est-range');
    const basisEl = $('#est-basis');
    const breakdownEl = $('#est-breakdown');
    const linesEl = $('#est-lines');
    const notesEl = $('#est-notes');

    if (r.lines.length === 0) {
      result.classList.add('empty');
      rangeEl.textContent = 'Add something to the form →';
      basisEl.textContent = "We'll show the range as you fill it in.";
      breakdownEl.style.display = 'none';
      if (notesEl) notesEl.innerHTML = '';
      $$('.cat-row.has-value').forEach(row => row.classList.remove('has-value'));
      return;
    }

    result.classList.remove('empty');
    rangeEl.textContent = rangeText(r);
    basisEl.textContent = r.belowMinimum
      ? `Fixed-price commercial projects start at ${fmt(PRICE.projectMinimum)}. Smaller jobs usually run on time and materials at our hourly rates.`
      : `Typical: ${fmt(r.midTotal)}`;

    const floored = r.rawMid < PRICE.projectMinimum;
    linesEl.innerHTML = r.lines.map(l => `<div class="line"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`).join('') +
      (floored ? `<div class="line"><span class="lbl">Line items</span><span>${fmt(r.rawMid)}</span></div>` : '') +
      `<div class="line total"><span class="lbl">${floored ? 'Project minimum' : 'Typical total'}</span><span>${fmt(r.midTotal)}</span></div>`;
    breakdownEl.style.display = '';

    if (notesEl) {
      notesEl.innerHTML = r.notes.map(n => `<p class="est-note">${n}</p>`).join('');
    }

    QTY_FIELDS.forEach(k => {
      const row = document.querySelector(`.cat-row[data-cat="${k}"]`);
      if (!row) return;
      row.classList.toggle('has-value', data[k] > 0);
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
      if (!input) return;
      const cur = parseInt(input.value, 10) || 0;
      input.value = Math.max(0, cur + delta);
      render();
    });
  });

  form.addEventListener('input', render);
  form.addEventListener('change', render);

  const cta = $('#est-cta');
  if (cta) {
    const origHref = cta.getAttribute('href');
    cta.addEventListener('click', () => {
      const d = getInputs();
      const r = computeTotals(d);
      if (r.lines.length > 0) {
        const params = new URLSearchParams({
          source: 'estimator',
          estimate: rangeText(r).replace('–', '-'),
          drops: d.drops, aps: d.aps, cameras: d.cameras, doors: d.doors,
          speakers: d.speakers, fibers: d.fiberRuns, servers: d.serverRooms,
          ownerDevices: d.ownerDevices ? 1 : 0,
          pw: d.pw ? 1 : 0,
          afterHours: d.afterHours ? 1 : 0,
          outOfMetro: d.metro ? 1 : 0,
          type: d.projectType
        });
        cta.setAttribute('href', origHref + '?' + params.toString());
      }
    });
  }

  render();

  // ─ Save/Load integration ─────────────────────────────────
  if (window.gccEstimator) {
    gccEstimator.attach({
      source: 'public-commercial',
      clientType: 'commercial',
      getPayload: function () {
        var d = getInputs();
        var r = computeTotals(d);
        return {
          form: d,
          lines: r.lines,
          min: r.minTotal,
          mid: r.midTotal,
          max: r.maxTotal,
          projectName: null
        };
      },
      // Estimates saved before the Oct 2026 reprice carry fields that no
      // longer exist (testing, asBuilts); anything without a matching
      // input is skipped and the totals are recomputed at current prices.
      applyPayload: function (payload) {
        if (!payload || !payload.form) return;
        var d = payload.form;
        QTY_FIELDS.forEach(function (k) {
          var input = form.querySelector('#' + k);
          if (input && d[k] != null) input.value = d[k];
        });
        FLAG_FIELDS.forEach(function (k) {
          var input = form.querySelector('#' + k);
          if (input && d[k] != null) input.checked = !!d[k];
        });
        render();
      }
    });
  }
})();
