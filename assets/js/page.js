// ============================================================
// Helpers for role-gated portal pages.
// ============================================================
(function () {
  'use strict';

  // Block page render until /api/clients/me succeeds + has required role.
  // Usage in <script>: window.gccPage.requireRole(['staff','admin']).then(renderPage);
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
          // Not logged in — go to client login
          window.location.href = '/clients/?next=' + encodeURIComponent(location.pathname);
          throw err;
        }
        throw err;
      }
    },

    redirectByRole(me) {
      if (me.role === 'admin' || me.role === 'staff') {
        window.location.href = '/staff/';
      } else if (me.clientType === 'residential') {
        window.location.href = '/clients/dashboard.html';
      } else {
        window.location.href = '/clients/dashboard.html';
      }
    },

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
