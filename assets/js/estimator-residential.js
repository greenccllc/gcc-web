// ============================================================
// GCC Public Residential Estimator
// Every price lives in PRICE below. Change it here and nowhere
// else; the page copy does not repeat any of these figures.
// Ranges are wider than commercial because homes vary more
// (older construction, finished basements, attic access).
// ============================================================
(function () {
  'use strict';

  const PRICE = {
    // Networking
    drops:         { min: 210, mid: 250, max: 300 },   // one wired run, terminated and tested
    aps:           { min: 450, mid: 550, max: 750 },   // Wi-Fi 7 access point with its run
    // Security
    camIn:         { min: 450, mid: 495, max: 600 },   // camera with its run and mount
    camOut:        { min: 495, mid: 550, max: 700 },
    doorbell:      { min: 495, mid: 650, max: 850 },
    // Smart home / AV
    smartSwitches: { min: 145, mid: 215, max: 295 },
    smartLocks:    { min: 425, mid: 600, max: 850 },
    tvMount:       { min: 350, mid: 525, max: 800 },
    // Outdoor (per unit)
    fence:         { min: 38, mid: 55, max: 85 },     // per linear foot
    deck:          { min: 45, mid: 65, max: 95 },     // per square foot
    // Light electrical
    ceilingFan:    { min: 285, mid: 425, max: 650 },
    outlet:        { min: 225, mid: 325, max: 500 },
    // Modifiers
    rushMult:      1.10,
    permitFlat:    { min: 350, mid: 600, max: 1100 }
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

  function getInputs() {
    const form = $('#res-est-form');
    const data = {};
    ['drops','aps','camIn','camOut','doorbell','smartSwitches','smartLocks','tvMount','ceilingFan','outlet','fence','deck'].forEach(k => {
      const v = parseInt(form.querySelector('#' + k).value, 10);
      data[k] = isNaN(v) || v < 0 ? 0 : v;
    });
    ['ownGear','metro','rush','permit'].forEach(k => { const el = form.querySelector('#' + k); data[k] = !!(el && el.checked); });
    return data;
  }

  function compute(d) {
    const lines = [];
    const add = (qty, unitTier, name) => {
      if (qty <= 0) return;
      lines.push({ name: name.replace('{n}', qty), min: unitTier.min * qty, mid: unitTier.mid * qty, max: unitTier.max * qty });
    };
    // With the customer's own gear, a camera, access point or doorbell is
    // priced as its wired run; the device itself is theirs.
    const dev = tier => d.ownGear ? PRICE.drops : tier;
    add(d.drops, PRICE.drops, '{n} wired drop(s), Cat6A');
    add(d.aps, dev(PRICE.aps), d.ownGear ? '{n} access point run(s), your APs' : '{n} Wi-Fi 7 access point(s)');
    add(d.camIn, dev(PRICE.camIn), d.ownGear ? '{n} interior camera run(s), your cameras' : '{n} interior camera(s)');
    add(d.camOut, dev(PRICE.camOut), d.ownGear ? '{n} exterior camera run(s), your cameras' : '{n} exterior camera(s)');
    add(d.doorbell, dev(PRICE.doorbell), d.ownGear ? '{n} doorbell run(s), your doorbell' : '{n} smart doorbell(s)');
    add(d.smartSwitches, PRICE.smartSwitches, '{n} smart switch(es)/dimmer(s)');
    add(d.smartLocks, PRICE.smartLocks, '{n} smart lock(s)');
    add(d.tvMount, PRICE.tvMount, '{n} TV mount(s)');
    add(d.ceilingFan, PRICE.ceilingFan, '{n} ceiling fan(s) / fixture(s)');
    add(d.outlet, PRICE.outlet, '{n} new outlet(s)/circuit(s)');

    if (d.fence > 0) {
      lines.push({ name: `${d.fence} LF of fencing`, min: PRICE.fence.min * d.fence, mid: PRICE.fence.mid * d.fence, max: PRICE.fence.max * d.fence });
    }
    if (d.deck > 0) {
      lines.push({ name: `${d.deck} sq ft of decking`, min: PRICE.deck.min * d.deck, mid: PRICE.deck.mid * d.deck, max: PRICE.deck.max * d.deck });
    }
    if (d.permit && lines.length > 0) {
      lines.push({ name: 'Permit fees + admin', min: PRICE.permitFlat.min, mid: PRICE.permitFlat.mid, max: PRICE.permitFlat.max });
    }

    let mn = lines.reduce((a, l) => a + l.min, 0);
    let mid = lines.reduce((a, l) => a + l.mid, 0);
    let mx = lines.reduce((a, l) => a + l.max, 0);

    const mods = [];
    const notes = [];
    if (lines.length > 0) {
      if (d.rush) {
        mn *= PRICE.rushMult; mid *= PRICE.rushMult; mx *= PRICE.rushMult;
        mods.push('rush scheduling');
      }
      if (d.ownGear) notes.push('You supply the cameras, access points and doorbell. We run, terminate and test the cable to each one.');
      if (d.metro) notes.push('Travel outside the St. Louis and Kansas City metros is priced with your quote.');
    }

    return { lines, minTotal: mn, midTotal: mid, maxTotal: mx, mods, notes };
  }

  function render() {
    const d = getInputs();
    const { lines, minTotal, midTotal, maxTotal, mods, notes } = compute(d);
    const result = $('#res-est-result');
    const rangeEl = $('#res-est-range');
    const basisEl = $('#res-est-basis');
    const breakdownEl = $('#res-est-breakdown');
    const linesEl = $('#res-est-lines');
    const notesEl = $('#res-est-notes');

    if (lines.length === 0) {
      result.classList.add('empty');
      rangeEl.textContent = 'Add something to begin →';
      basisEl.textContent = "We'll show the range as you fill it in.";
      breakdownEl.style.display = 'none';
      if (notesEl) notesEl.innerHTML = '';
      $$('.cat-row.has-value, .lf-row.has-value').forEach(r => r.classList.remove('has-value'));
      return;
    }

    result.classList.remove('empty');
    rangeEl.textContent = `${fmt(minTotal)} – ${fmt(maxTotal)}`;
    let basis = `Typical: ${fmt(midTotal)}`;
    if (mods.length) basis += ` · includes ${mods.join(', ')}`;
    basisEl.textContent = basis;
    linesEl.innerHTML = lines.map(l => `<div class="line"><span class="lbl">${l.name}</span><span>${fmt(l.mid)}</span></div>`).join('') +
      `<div class="line total"><span class="lbl">Typical total</span><span>${fmt(midTotal)}</span></div>`;
    breakdownEl.style.display = '';
    if (notesEl) notesEl.innerHTML = notes.map(n => `<p class="est-note">${n}</p>`).join('');

    // Highlight rows
    ['drops','aps','camIn','camOut','doorbell','smartSwitches','smartLocks','tvMount','ceilingFan','outlet'].forEach(k => {
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
          drops: d.drops, aps: d.aps, cameras: d.camIn + d.camOut, doorbell: d.doorbell,
          ownGear: d.ownGear ? 1 : 0,
          smartHome: d.smartSwitches + d.smartLocks,
          fence: d.fence, deck: d.deck
        });
        cta.setAttribute('href', origHref + '?' + params.toString());
      }
    });
  }

  render();

  // ─ Save/Load integration ─────────────────────────────────
  if (window.gccEstimator) {
    gccEstimator.attach({
      source: 'public-residential',
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
        ['drops','aps','camIn','camOut','doorbell','smartSwitches','smartLocks','tvMount','ceilingFan','outlet','fence','deck'].forEach(function (k) {
          var input = form.querySelector('#' + k);
          if (input && d[k] != null) input.value = d[k];
        });
        ['ownGear','metro','rush','permit'].forEach(function (k) {
          var input = form.querySelector('#' + k);
          if (input && d[k] != null) input.checked = !!d[k];
        });
        render();
      }
    });
  }
})();
