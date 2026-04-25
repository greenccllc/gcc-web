// ============================================================
// Shared "Save to my account" / "Load saved" UX for estimators.
// Auto-POSTs estimator state to /api/estimates and shows the
// last 5 saved sessions in a popover for one-click resume.
// ============================================================
(function () {
  'use strict';

  // Each estimator page registers itself by calling:
  //   gccEstimator.attach({
  //     source: 'public-commercial' | 'client-residential' | ...,
  //     clientType: 'commercial' | 'residential',
  //     getPayload: () => ({ form: {...}, lines: [...], min, mid, max }),
  //     applyPayload: (payload) => { /* restore form */ }
  //   });
  window.gccEstimator = {
    attach: function (cfg) {
      attachUI(cfg);
    }
  };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'style') for (var s in attrs.style) n.style[s] = attrs.style[s];
      else if (k === 'className') n.className = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) {
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function dt(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

  function attachUI(cfg) {
    if (!window.gccApi) {
      console.warn('[gcc-estimator] api.js not loaded');
      return;
    }

    // Toolbar that floats above the result panel
    var bar = el('div', {
      style: {
        position: 'fixed', top: '88px', right: '20px', zIndex: '40',
        background: 'white', border: '1px solid rgba(16,24,40,0.16)',
        borderRadius: '14px', padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(16,24,40,0.10)',
        display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px',
        fontFamily: 'inherit'
      }
    });

    var statusEl = el('span', { style: { color: 'rgb(74,85,104)', minWidth: '120px' } });
    statusEl.textContent = 'Checking sign-in...';

    var saveBtn = el('button', {
      style: {
        padding: '6px 14px', background: '#1E4D2B', color: 'white',
        border: 'none', borderRadius: '8px', fontWeight: '700',
        cursor: 'pointer', fontSize: '13px'
      },
      onclick: handleSave
    }, ['💾 Save to my account']);

    var loadBtn = el('button', {
      style: {
        padding: '6px 14px', background: 'white', color: '#1E4D2B',
        border: '1px solid rgba(16,24,40,0.16)', borderRadius: '8px',
        fontWeight: '600', cursor: 'pointer', fontSize: '13px'
      },
      onclick: openLoadMenu
    }, ['📂 My estimates']);

    bar.appendChild(statusEl);
    bar.appendChild(saveBtn);
    bar.appendChild(loadBtn);
    document.body.appendChild(bar);

    var loadMenu = null;

    // Check sign-in status and reflect in the bar
    gccApi.me().then(function (me) {
      statusEl.textContent = '👤 ' + (me.email || me.name || 'signed in');
      bar.dataset.signedIn = '1';
    }).catch(function () {
      statusEl.textContent = '🔒 Not signed in';
      bar.dataset.signedIn = '0';
    });

    async function handleSave() {
      if (bar.dataset.signedIn !== '1') {
        if (confirm('Sign in to save estimates server-side? You can keep working without signing in — values stay in this browser.')) {
          window.location.href = '/clients/?next=' + encodeURIComponent(location.pathname);
        }
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        var payload = cfg.getPayload();
        if (!payload || (payload.lines && payload.lines.length === 0)) {
          alert('Add at least one line item before saving.');
          return;
        }
        var resp = await gccApi.saveEstimate({
          Source: cfg.source,
          ClientType: cfg.clientType,
          ProjectName: payload.projectName || null,
          Email: null,
          EstimateMin: payload.min || 0,
          EstimateMid: payload.mid || 0,
          EstimateMax: payload.max || 0,
          LineItemCount: (payload.lines || []).length,
          PayloadJson: JSON.stringify(payload)
        });
        saveBtn.textContent = '✓ Saved (#' + resp.id + ')';
        setTimeout(function () { saveBtn.textContent = '💾 Save to my account'; saveBtn.disabled = false; }, 2500);
      } catch (err) {
        saveBtn.textContent = '✗ Failed';
        console.error('save failed', err);
        setTimeout(function () { saveBtn.textContent = '💾 Save to my account'; saveBtn.disabled = false; }, 2500);
      }
    }

    async function openLoadMenu() {
      if (loadMenu) { loadMenu.remove(); loadMenu = null; return; }
      if (bar.dataset.signedIn !== '1') {
        alert('Sign in to see your saved estimates.');
        return;
      }
      loadMenu = el('div', {
        style: {
          position: 'absolute', top: '52px', right: '0',
          background: 'white', border: '1px solid rgba(16,24,40,0.16)',
          borderRadius: '12px', boxShadow: '0 12px 28px rgba(16,24,40,0.10)',
          padding: '8px', minWidth: '320px', maxHeight: '400px', overflowY: 'auto'
        }
      });
      bar.appendChild(loadMenu);
      loadMenu.innerHTML = '<div style="padding:12px; color:rgb(160,174,192);">Loading...</div>';
      try {
        var ests = await gccApi.listMyEstimates();
        if (!ests.length) {
          loadMenu.innerHTML = '<div style="padding:14px 16px; color:rgb(160,174,192); font-size:13px;">No saved estimates yet.</div>';
          return;
        }
        loadMenu.innerHTML = '';
        ests.slice(0, 15).forEach(function (e) {
          var row = el('div', {
            style: {
              padding: '10px 12px', borderBottom: '1px solid rgba(16,24,40,0.08)',
              cursor: 'pointer', fontSize: '13px', borderRadius: '6px'
            },
            onmouseenter: function () { row.style.background = 'rgba(30,77,43,0.05)'; },
            onmouseleave: function () { row.style.background = 'transparent'; },
            onclick: function () {
              try {
                var payload = JSON.parse(e.payloadJson);
                if (cfg.applyPayload) cfg.applyPayload(payload);
                loadMenu.remove(); loadMenu = null;
              } catch (err) { alert('Failed to load: ' + err.message); }
            }
          }, [
            el('div', { style: { fontWeight: '700', color: '#1A202C' } }, [e.source + ' · ' + fmt(e.estimateMid)]),
            el('div', { style: { color: 'rgb(74,85,104)', fontSize: '12px', marginTop: '2px' } }, [
              dt(e.createdAt) + ' · ' + e.lineItemCount + ' line(s)'
            ])
          ]);
          loadMenu.appendChild(row);
        });
      } catch (err) {
        loadMenu.innerHTML = '<div style="padding:14px 16px; color:rgb(245,101,101); font-size:13px;">Failed to load: ' + err.message + '</div>';
      }
    }

    
    // If URL has ?load=N, fetch that estimate and apply it on attach.
    var params = new URLSearchParams(location.search);
    var loadId = params.get('load');
    if (loadId) {
      fetch(gccApi.base + '/api/estimates/' + encodeURIComponent(loadId), { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (row) {
          if (!row) return;
          try {
            var payload = JSON.parse(row.payloadJson);
            if (cfg.applyPayload) cfg.applyPayload(payload);
            statusEl.textContent = '📂 Loaded #' + loadId;
          } catch (e) { console.warn('load failed', e); }
        });
    }
    // Close load menu on outside click
    document.addEventListener('click', function (e) {
      if (loadMenu && !bar.contains(e.target)) {
        loadMenu.remove(); loadMenu = null;
      }
    });
  }
})();
