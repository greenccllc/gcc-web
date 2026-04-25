// ============================================================
// GCC shared role-aware header.
// Mounts itself into <div id="gcc-header"></div> on every page.
// Loads /api/clients/me to determine identity + capabilities,
// then renders the right nav for: anonymous | client | staff | admin.
// ============================================================
(function () {
  'use strict';

  // ── Brand mark (consistent across roles) ──────────────────
  const BRAND = `
    <a href="/" class="brand-mark" aria-label="GCC LLC home">
      <span class="monogram" aria-hidden="true">GC</span>
      <span class="brand-stack">
        <span class="brand-name">GCC LLC</span>
        <span class="brand-tag" id="hdr-tag">Div 27 / 28 Contractor</span>
      </span>
    </a>`;

  // ── Nav item generators ───────────────────────────────────
  function navAnonymous() {
    return [
      { href: '/',                 label: 'Home' },
      { href: '/services.html',    label: 'Services' },
      { href: '/estimator.html',   label: 'Estimator' },
      { href: '/about.html',       label: 'About' },
      { href: '/contact.html',     label: 'Contact' },
      // Always-visible Register CTA top-right (per request)
      { href: '/clients/#signup',  label: 'Register Account', cta: true }
    ];
  }

  function navClient(me) {
    // Residential gets "Quotes", commercial gets "Estimator"
    const estLabel = me.clientType === 'residential' ? 'Quotes' : 'Estimator';
    const estHref  = me.clientType === 'residential' ? '/clients/estimator-residential.html'
                                                     : '/clients/estimator.html';
    return [
      { href: '/clients/dashboard.html', label: 'Home' },
      { href: estHref,                   label: estLabel },
      { href: '/clients/sessions.html',  label: 'Prior Sessions' },
      { href: '/clients/invoices.html',  label: 'Invoices' },
      { href: '/clients/profile.html',   label: 'Profile' },
      { href: '/clients/settings.html',  label: 'Settings', cta: true }
    ];
  }

  function navStaff(me, isAdmin) {
    const items = [
      { href: '/staff/',             label: 'Dashboard' },
      { href: '/staff/leads.html',   label: 'Leads' },
      { href: '/staff/prospects.html', label: 'Prospects' },
      { href: '/staff/proposals.html', label: 'Proposals' },
      { href: '/staff/clients.html', label: 'Clients' },
      { href: 'http://proposal.greencommllc.com/', label: 'Generator', external: true },
      { href: '/staff/calendar.html',label: 'Calendar' },
      { href: '/staff/files.html',   label: 'Files' }
    ];
    if (isAdmin) {
      items.push(
        { href: '/admin/financials.html', label: 'Financials' },
        { href: '/admin/pipeline.html',   label: 'Pipeline' }
      );
    }
    items.push({ href: '#', label: 'Sign out', cta: true, action: 'signout' });
    return items;
  }

  // ── Render ────────────────────────────────────────────────
  function renderNav(items, currentPath) {
    return items.map(it => {
      let cls = '';
      if (it.cta) cls += ' cta';
      const here = currentPath === it.href || (it.href !== '/' && currentPath && currentPath.startsWith(it.href.split('#')[0]));
      if (here) cls += ' active';
      const ext = it.external ? ' target="_blank" rel="noopener"' : '';
      const dataAct = it.action ? ` data-action="${it.action}"` : '';
      return `<li><a href="${it.href}" class="${cls.trim()}"${ext}${dataAct}>${it.label}</a></li>`;
    }).join('');
  }

  function mount(items, badgeText) {
    const host = document.getElementById('gcc-header');
    if (!host) return;
    if (badgeText) {
      // Update the brand tag for staff / admin
      const tag = host.querySelector('#hdr-tag');
      if (tag) tag.textContent = badgeText;
    }
    const path = location.pathname.replace(/\/$/, '/') || '/';
    host.innerHTML = `
      <header class="site-header">
        <div class="container">
          ${BRAND}
          <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
          <nav class="site-nav" aria-label="Primary"><ul>${renderNav(items, path)}</ul></nav>
        </div>
      </header>`;

    // Mobile menu
    const t = host.querySelector('.menu-toggle');
    const n = host.querySelector('.site-nav');
    if (t && n) t.addEventListener('click', () => {
      n.classList.toggle('is-open');
      t.setAttribute('aria-expanded', n.classList.contains('is-open') ? 'true' : 'false');
    });

    // Wire signout
    const signoutLink = host.querySelector('a[data-action="signout"]');
    if (signoutLink) {
      signoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try { if (window.gccApi) await gccApi.signout(); } catch (_) {}
        localStorage.removeItem('gcc-client-id');
        localStorage.removeItem('gcc-client-type');
        window.location.href = '/';
      });
    }

    // Override the brand link target for clients (goes to dashboard) and staff
    const brandLink = host.querySelector('.brand-mark');
    if (brandLink) {
      const t2 = badgeText;
      if (t2 === 'Client Portal') brandLink.setAttribute('href', '/clients/dashboard.html');
      else if (t2 === 'Staff Portal' || t2 === 'Admin') brandLink.setAttribute('href', '/staff/');
    }
  }

  // ── Boot ──────────────────────────────────────────────────
  async function boot() {
    // Default to anonymous; upgrade if auth check succeeds.
    let items = navAnonymous();
    let badge = null;

    if (window.gccApi) {
      try {
        const me = await gccApi.me();
        if (me.role === 'admin') {
          items = navStaff(me, true);
          badge = 'Admin';
        } else if (me.role === 'staff') {
          items = navStaff(me, false);
          badge = 'Staff Portal';
        } else {
          items = navClient(me);
          badge = 'Client Portal';
        }
        // Make user info available to the page
        window.__gccMe = me;
      } catch (err) {
        // Not signed in or API unreachable — keep anonymous
      }
    }
    mount(items, badge);
  }

  // Wait for api.js + DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
