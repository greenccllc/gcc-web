/* GCC estimator wizard — guided one-question-per-step popout that walks
 * a visitor through filling in the live estimator. On submit the modal
 * closes, the visitor's answers are written to the underlying form,
 * input events fire so the estimator's render() picks them up, and the
 * page scrolls to the result panel showing their populated estimate.
 *
 * Each estimator page (commercial + residential) declares
 *   <button data-estimator-wizard>...</button>
 * and a <script src="/assets/js/estimator-wizard.js"> below the
 * estimator's own JS so this initializer runs after the form is wired.
 */
(function () {
  'use strict';

  const PAGE_KIND = location.pathname.includes('residential') ? 'residential' : 'commercial';

  // Per-page step definitions. Each step renders a single question.
  // `id` matches the form field id; `mode` decides input shape:
  //   'text'    text/email input
  //   'number'  numeric stepper (defaults to 0)
  // `next` is an optional condition-aware label override.
  const COMMON_INTRO = [
    { id: 'wiz-name',   mode: 'text',  label: 'Your name',   placeholder: 'First and last',                hint: 'So we know who to address the quote to.' },
    { id: 'wiz-email',  mode: 'email', label: 'Email',       placeholder: 'you@yourcompany.com',           hint: 'We send the rough range here so it lands in your inbox.' },
    { id: 'wiz-company',mode: 'text',  label: 'Company / property name', placeholder: 'Optional',          hint: 'Helps us tag the estimate to the right project.' },
  ];

  const COMMERCIAL_STEPS = [
    ...COMMON_INTRO,
    { id: 'drops',       mode: 'number', label: 'Data drops',           hint: 'Cat6/6A — one per workstation, camera, AP, printer, door reader, TV.' },
    { id: 'cameras',     mode: 'number', label: 'IP cameras',           hint: 'Ubiquiti G6 or comparable. PoE-cabled to NVR.' },
    { id: 'doors',       mode: 'number', label: 'Access-control doors', hint: 'Hub + reader + maglock or strike + REX.' },
    { id: 'speakers',    mode: 'number', label: 'Ceiling speakers',     hint: '70V paging or background music. Skip if you don\'t need any.' },
    { id: 'fiberRuns',   mode: 'number', label: 'Fiber backbone runs',  hint: 'Strand count between MDF and IDFs (or 0 if all in one room).' },
    { id: 'serverRooms', mode: 'number', label: 'Telecom rooms',        hint: 'MDF + IDFs that need ladder rack + grounding.' },
  ];

  const RESIDENTIAL_STEPS = [
    ...COMMON_INTRO,
    { id: 'drops',         mode: 'number', label: 'Cat6 drops',          hint: 'One per office, TV, camera, AP. ~1 per room is typical.' },
    { id: 'aps',           mode: 'number', label: 'Wi-Fi 7 mesh APs',    hint: 'Plan ~1 per 1,500 sq ft.' },
    { id: 'camIn',         mode: 'number', label: 'Interior cameras',    hint: 'Living areas, garage, basement.' },
    { id: 'camOut',        mode: 'number', label: 'Exterior cameras',    hint: 'Doors, driveway, yard.' },
    { id: 'doorbell',      mode: 'number', label: 'Smart doorbells',     hint: 'UniFi G4 or Doorbird with chime.' },
    { id: 'smartSwitches', mode: 'number', label: 'Smart switches',      hint: 'Replaces wall switches/dimmers. Alexa or Google compatible.' },
    { id: 'smartLocks',    mode: 'number', label: 'Smart locks',         hint: 'Front, back, garage entry.' },
    { id: 'tvMount',       mode: 'number', label: 'TV mounts',           hint: 'Articulating + power kit. Skip if you don\'t need new mounts.' },
    { id: 'fence',         mode: 'number', label: 'Fence (linear ft)',   hint: 'Pressure-treated, composite, or shadowbox. Includes posts + gates.' },
    { id: 'deck',          mode: 'number', label: 'Deck (square ft)',    hint: 'Pressure-treated or composite.' },
  ];

  const STEPS = PAGE_KIND === 'residential' ? RESIDENTIAL_STEPS : COMMERCIAL_STEPS;

  let currentStep = 0;
  const answers = {};

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else if (k === 'innerHTML') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v != null) node.setAttribute(k, v);
    }
    for (const child of children) {
      if (child == null) continue;
      node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function buildModal() {
    const modal = el('div', { className: 'ew-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ew-title' });
    modal.innerHTML = `
      <div class="ew-backdrop" data-close></div>
      <div class="ew-card">
        <header class="ew-card-head">
          <span class="ew-eyebrow">${PAGE_KIND === 'residential' ? 'Residential' : 'Commercial'} estimator · Guided</span>
          <h2 id="ew-title">Let's get a real range.</h2>
          <p class="ew-sub">A few quick questions. Skip anything that doesn't apply — we just need a rough scope to build a budget against.</p>
          <button class="ew-close" data-close aria-label="Close wizard">&times;</button>
        </header>
        <div class="ew-progress" id="ew-progress"></div>
        <main class="ew-body" id="ew-body"></main>
        <footer class="ew-foot">
          <button class="ew-btn ew-btn-ghost" id="ew-back" type="button">← Back</button>
          <span class="ew-step-counter" id="ew-counter"></span>
          <button class="ew-btn ew-btn-primary" id="ew-next" type="button">Next →</button>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    modal.querySelector('#ew-back').addEventListener('click', goBack);
    modal.querySelector('#ew-next').addEventListener('click', goNext);
    document.addEventListener('keydown', onKey);
    return modal;
  }

  function onKey(e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && document.querySelector('.ew-modal')) {
      e.preventDefault();
      goNext();
    }
  }

  function renderStep() {
    const body = document.getElementById('ew-body');
    if (!body) return;
    const s = STEPS[currentStep];
    body.innerHTML = '';
    const wrap = el('div', { className: 'ew-step' });
    const label = el('label', { className: 'ew-label', htmlFor: 'ew-input' }, s.label);
    let input;
    if (s.mode === 'number') {
      const stepper = el('div', { className: 'ew-stepper' });
      const minus = el('button', { type: 'button', className: 'ew-stepper-btn', 'data-delta': '-1', 'aria-label': 'Decrease' }, '−');
      input = el('input', { type: 'number', id: 'ew-input', min: '0', max: '5000', inputmode: 'numeric',
                            value: answers[s.id] != null ? String(answers[s.id]) : '0' });
      const plus  = el('button', { type: 'button', className: 'ew-stepper-btn', 'data-delta': '+1', 'aria-label': 'Increase' }, '+');
      stepper.append(minus, input, plus);
      wrap.append(label, stepper);
      [minus, plus].forEach(b => b.addEventListener('click', () => {
        const cur = parseInt(input.value, 10) || 0;
        input.value = Math.max(0, cur + parseInt(b.dataset.delta, 10));
      }));
    } else {
      input = el('input', {
        type: s.mode === 'email' ? 'email' : 'text',
        id: 'ew-input',
        className: 'ew-input',
        placeholder: s.placeholder || '',
        value: answers[s.id] != null ? answers[s.id] : '',
        autocomplete: s.mode === 'email' ? 'email' : 'on',
      });
      wrap.append(label, input);
    }
    if (s.hint) wrap.append(el('p', { className: 'ew-hint' }, s.hint));
    body.appendChild(wrap);
    setTimeout(() => input.focus({ preventScroll: true }), 30);

    // Progress dots
    const prog = document.getElementById('ew-progress');
    prog.innerHTML = STEPS.map((_, i) => `<span class="ew-dot${i === currentStep ? ' is-active' : i < currentStep ? ' is-done' : ''}"></span>`).join('');

    // Counter + nav state
    document.getElementById('ew-counter').textContent = `Step ${currentStep + 1} of ${STEPS.length}`;
    document.getElementById('ew-back').disabled = currentStep === 0;
    document.getElementById('ew-next').textContent = currentStep === STEPS.length - 1 ? 'See my estimate →' : 'Next →';
  }

  function captureCurrent() {
    const input = document.getElementById('ew-input');
    if (!input) return true;
    const s = STEPS[currentStep];
    const v = input.value.trim();
    if (s.mode === 'email') {
      if (!v) { flashErr(input, 'Email lets us send the result.'); return false; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { flashErr(input, "That email doesn't look right."); return false; }
      answers[s.id] = v;
    } else if (s.mode === 'text') {
      // Optional fields can be blank
      answers[s.id] = v;
    } else {
      const n = parseInt(v, 10);
      answers[s.id] = isNaN(n) || n < 0 ? 0 : n;
    }
    return true;
  }

  function flashErr(input, msg) {
    let err = input.parentElement.parentElement.querySelector('.ew-err');
    if (!err) {
      err = el('p', { className: 'ew-err' });
      input.parentElement.parentElement.appendChild(err);
    }
    err.textContent = msg;
    input.classList.add('is-err');
    setTimeout(() => input.classList.remove('is-err'), 1500);
  }

  function goNext() {
    if (!captureCurrent()) return;
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      renderStep();
    } else {
      submit();
    }
  }
  function goBack() {
    if (currentStep === 0) return;
    captureCurrent();
    currentStep--;
    renderStep();
  }

  function submit() {
    // Write numeric answers into the estimator form fields
    for (const s of STEPS) {
      if (s.mode !== 'number') continue;
      const target = document.getElementById(s.id);
      if (!target) continue;
      target.value = String(answers[s.id] || 0);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Stash contact info on window for the save-to-account flow if present
    window.__gccEstimateContact = {
      name:    answers['wiz-name']    || '',
      email:   answers['wiz-email']   || '',
      company: answers['wiz-company'] || '',
    };
    closeModal();
    // Scroll to the result panel
    const target = document.querySelector('#est-result, #res-est-result, .est-result');
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    }
  }

  function closeModal() {
    const m = document.querySelector('.ew-modal');
    if (m) m.remove();
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('ew-locked');
  }

  function openModal() {
    if (document.querySelector('.ew-modal')) return;
    document.body.classList.add('ew-locked');
    currentStep = 0;
    buildModal();
    renderStep();
  }

  // Wire up the trigger button(s)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-estimator-wizard]');
    if (!t) return;
    e.preventDefault();
    openModal();
  });
})();
