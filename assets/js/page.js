// ============================================================
// Helpers for role-gated portal pages.
//
// Public surface:
//   gccPage.requireRole([roles]) -> Promise<me>   blocks page until auth ok
//   gccPage.run([roles], async fn) -> void        full lifecycle: auth + loading + error UI
//   gccPage.toast(message, type?)                 transient bottom-right toast
//   gccPage.skeleton(target, opts?)               render a skeleton inside `target`
//   gccPage.errorBanner(target, msg, opts?)       inline retryable error
//   gccPage.money/date/datetime                   formatters
//   gccPage.escapeHtml                            shared text-safe HTML escape
// ============================================================
(function () {
  'use strict';

  // ── Inject one-time stylesheet for toast/skeleton/error primitives ───
  function injectStyles() {
    if (document.getElementById('gcc-page-css')) return;
    const s = document.createElement('style');
    s.id = 'gcc-page-css';
    s.textContent = `
      .gcc-toast-wrap {
        position: fixed; bottom: 24px; right: 24px;
        display: flex; flex-direction: column; gap: 8px;
        z-index: 9999; max-width: min(420px, 90vw); pointer-events: none;
      }
      .gcc-toast {
        background: var(--ink, #15201a); color: #fff;
        padding: 10px 14px; border-radius: var(--r-md, 12px);
        box-shadow: var(--shadow-lg, 0 16px 40px rgba(0,0,0,.18));
        font: 14px/1.4 var(--font-ui, system-ui);
        pointer-events: auto;
        animation: gcc-toast-in 180ms cubic-bezier(.2,.7,.3,1);
      }
      .gcc-toast.success { background: var(--forest, #1E4D2B); }
      .gcc-toast.error   { background: #B71C1C; }
      .gcc-toast.warn    { background: var(--gold-dark, #A8842F); color: #fff; }
      @keyframes gcc-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .gcc-skeleton {
        background: linear-gradient(90deg,
          rgba(0,0,0,0.06) 0%,
          rgba(0,0,0,0.10) 50%,
          rgba(0,0,0,0.06) 100%);
        background-size: 200% 100%;
        animation: gcc-skel 1.4s ease-in-out infinite;
        border-radius: var(--r-sm, 8px);
      }
      @keyframes gcc-skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .gcc-skeleton-stack > * + * { margin-top: 10px; }
      .gcc-error-banner {
        background: #FFF3F2; border: 1px solid #F5C6C6; color: #7A1F1F;
        padding: 14px 16px; border-radius: var(--r-md, 12px);
        font: 14px/1.5 var(--font-ui, system-ui);
        display: flex; gap: 12px; align-items: flex-start;
      }
      .gcc-error-banner .gcc-error-icon { font-size: 18px; line-height: 1; padding-top: 2px; }
      .gcc-error-banner .gcc-error-body { flex: 1; }
      .gcc-error-banner .gcc-error-actions { margin-top: 8px; display: flex; gap: 8px; }
      .gcc-error-banner button {
        background: #fff; color: #7A1F1F; border: 1px solid #F5C6C6;
        padding: 4px 10px; border-radius: 3px; font: inherit; cursor: pointer;
      }
      .gcc-error-banner button:hover { background: #FBE9E7; }
    `;
    document.head.appendChild(s);
  }

  // ── Toast ────────────────────────────────────────────────────────────
  function toast(message, type = 'info', durationMs = 2500) {
    injectStyles();
    let wrap = document.getElementById('gcc-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'gcc-toast-wrap';
      wrap.className = 'gcc-toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'gcc-toast ' + type;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (_) {} }, durationMs);
  }

  // ── Skeleton ─────────────────────────────────────────────────────────
  function skeleton(target, opts = {}) {
    injectStyles();
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    const rows  = opts.rows  || 4;
    const heights = opts.heights || ['18px', '14px', '14px', '14px'];
    el.innerHTML = '<div class="gcc-skeleton-stack">' +
      Array.from({length: rows}, (_, i) =>
        `<div class="gcc-skeleton" style="height: ${heights[i] || '14px'}; width: ${i === 0 ? '50%' : (90 - i * 10) + '%'};"></div>`
      ).join('') + '</div>';
  }

  // ── Error banner ─────────────────────────────────────────────────────
  function errorBanner(target, message, opts = {}) {
    injectStyles();
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    const safeMsg = String(message || 'Something went wrong.')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const retryLabel = opts.retryLabel || 'Retry';
    const onRetry    = typeof opts.onRetry === 'function' ? opts.onRetry : null;
    el.innerHTML = `
      <div class="gcc-error-banner" role="alert">
        <span class="gcc-error-icon" aria-hidden="true">!</span>
        <div class="gcc-error-body">
          <div><strong>${opts.title || 'Couldn’t load'}</strong></div>
          <div>${safeMsg}</div>
          ${onRetry ? `<div class="gcc-error-actions"><button type="button" id="gcc-err-retry">${retryLabel}</button></div>` : ''}
        </div>
      </div>`;
    if (onRetry) {
      const btn = el.querySelector('#gcc-err-retry');
      if (btn) btn.addEventListener('click', onRetry, { once: true });
    }
  }

  // ── HTML-safe text helper (used everywhere) ──────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.gccPage = {
    async requireRole(allowedRoles) {
      if (!window.gccApi) throw new Error('api.js not loaded');
      try {
        const me = await gccApi.me();
        window.__gccMe = me;
        if (!allowedRoles.includes(me.role)) {
          // Wrong role — bounce them to their own portal
          this.redirectByRole(me);
          throw new Error('forbidden');
        }
        return me;
      } catch (err) {
        if (err.status === 401 || !err.status) {
          // Not logged in — go to client login, preserve full URL incl. subdomain.
          const next = encodeURIComponent(location.href);
          window.location.href = '/clients/?next=' + next;
          throw err;
        }
        throw err;
      }
    },

    redirectByRole(me) {
      if (me.role === 'admin' || me.role === 'staff') {
        window.location.href = '/admin/';
      } else if (me.clientType === 'residential') {
        window.location.href = '/clients/dashboard.html';
      } else {
        window.location.href = '/clients/dashboard.html';
      }
    },

    /**
     * Full page lifecycle: gate by role, show optional skeleton, run page fn,
     * surface errors. Replaces the requireRole().then(renderPage) boilerplate.
     *
     * Usage:
     *   gccPage.run(['staff','admin'], async (me) => {
     *     await loadDashboard();
     *   }, { loading: '#page-loading', content: '#page-content' });
     */
    async run(allowedRoles, fn, opts = {}) {
      const loadingEl = opts.loading && document.querySelector(opts.loading);
      const contentEl = opts.content && document.querySelector(opts.content);
      try {
        const me = await this.requireRole(allowedRoles);
        if (loadingEl) loadingEl.hidden = true;
        if (contentEl) contentEl.hidden = false;
        await fn(me);
      } catch (err) {
        if (err && err.message === 'forbidden') return;          // already redirected
        if (err && (err.status === 401 || !err.status)) return;  // already redirected
        console.error('Page error:', err);
        if (contentEl) {
          contentEl.hidden = false;
          errorBanner(contentEl, err && err.message ? err.message : 'Page failed to load.', {
            onRetry: () => location.reload(),
          });
        } else {
          toast('Page failed to load: ' + (err && err.message || ''), 'error', 4500);
        }
      }
    },

    toast,
    skeleton,
    errorBanner,
    escapeHtml,

    money(n) {
      if (n == null) return '—';
      return '$' + Math.round(Number(n)).toLocaleString('en-US');
    },
    date(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleDateString(); } catch { return '—'; }
    },
    datetime(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleString(); } catch { return '—'; }
    }
  };
})();
