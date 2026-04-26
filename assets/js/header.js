// ============================================================
// GCC shared role-aware header.
// Mounts itself into <div id="gcc-header"></div> on every page.
// Loads /api/clients/me to determine identity + capabilities,
// then renders the right nav for: anonymous | client | staff | admin.
//
// Nav items can be either:
//   { href, label, cta?, action?, external? }              ── leaf link
//   { label, group: [ {href,label}, ... ] }                ── dropdown
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

  // ── Inline CSS for dropdowns (scoped under .site-nav so it doesn't leak) ──
  const NAV_CSS = `
    <style id="gcc-nav-css">
      .site-nav .nav-group { position: relative; }
      .site-nav .nav-group > .nav-trigger {
        display: flex; align-items: center; gap: 4px;
        padding: 8px 12px;
        background: transparent; border: 0;
        font: inherit; font-size: 14px; font-weight: 600;
        color: var(--slate);
        border-radius: var(--r-sm);
        cursor: pointer;
        font-family: inherit;
      }
      .site-nav .nav-group > .nav-trigger .caret {
        font-size: 10px; opacity: 0.6; transition: transform 0.15s var(--ease);
      }
      .site-nav .nav-group:hover > .nav-trigger,
      .site-nav .nav-group > .nav-trigger:focus-visible,
      .site-nav .nav-group.is-open > .nav-trigger {
        background: rgba(30, 77, 43, 0.07); color: var(--forest);
      }
      .site-nav .nav-group.has-active > .nav-trigger {
        background: rgba(30, 77, 43, 0.10); color: var(--forest);
      }
      .site-nav .nav-group:hover > .nav-trigger .caret,
      .site-nav .nav-group.is-open > .nav-trigger .caret {
        transform: rotate(180deg);
      }
      .site-nav .nav-dropdown {
        position: absolute; top: calc(100% + 6px); left: 0;
        min-width: 200px;
        background: white;
        border: 1px solid var(--hairline);
        border-radius: var(--r-md);
        box-shadow: var(--shadow-md);
        padding: 6px;
        opacity: 0; pointer-events: none; transform: translateY(-4px);
        transition: opacity 0.15s var(--ease), transform 0.15s var(--ease);
        z-index: 50;
        list-style: none; margin: 0;
      }
      .site-nav .nav-dropdown.right-anchor { left: auto; right: 0; }
      .site-nav .nav-group:hover > .nav-dropdown,
      .site-nav .nav-group.is-open > .nav-dropdown {
        opacity: 1; pointer-events: auto; transform: translateY(0);
      }
      .site-nav .nav-dropdown li { display: block; }
      .site-nav .nav-dropdown a {
        display: block; padding: 9px 14px;
        font-size: 13px; font-weight: 500;
        color: var(--ink); border-radius: 6px;
        white-space: nowrap;
      }
      .site-nav .nav-dropdown a:hover {
        background: rgba(30, 77, 43, 0.08); color: var(--forest);
      }
      .site-nav .nav-dropdown a.active {
        background: rgba(30, 77, 43, 0.12); color: var(--forest); font-weight: 600;
      }
      .site-nav .nav-dropdown .divider {
        height: 1px; background: var(--hairline); margin: 4px 6px;
      }
      .site-nav .nav-dropdown .group-label {
        font-size: 10px; font-weight: 700; color: var(--slate-light);
        text-transform: uppercase; letter-spacing: 0.06em;
        padding: 8px 14px 4px;
      }
      .site-nav .spacer { flex: 1; }

      @media (max-width: 860px) {
        .site-nav .nav-group > .nav-trigger {
          width: 100%; padding: 12px 14px; justify-content: space-between;
          border-radius: 0;
        }
        .site-nav .nav-dropdown {
          position: static; opacity: 1; pointer-events: auto; transform: none;
          box-shadow: none; border: 0; border-radius: 0;
          padding: 0 0 6px 14px; min-width: auto;
          display: none;
        }
        .site-nav .nav-group.is-open > .nav-dropdown { display: block; }
        .site-nav .nav-group:hover > .nav-dropdown { display: none; }
        .site-nav .nav-group.is-open:hover > .nav-dropdown { display: block; }
        .site-nav .nav-dropdown a { padding: 8px 14px; }
        .site-nav .spacer { display: none; }
      }
    </style>`;

  // ── Nav definitions ───────────────────────────────────────
  function navAnonymous() {
    return [
      { href: '/',                 label: 'Home' },
      { href: '/services.html',    label: 'Services' },
      { href: '/estimator.html',   label: 'Estimator' },
      { href: '/about.html',       label: 'About' },
      { href: '/contact.html',     label: 'Contact' },
      { spacer: true },
      { href: '/clients/#signup',  label: 'Register Account', cta: true }
    ];
  }

  function navClient(me) {
    const estLabel = me.clientType === 'residential' ? 'Quotes' : 'Estimator';
    const estHref  = me.clientType === 'residential' ? '/clients/estimator-residential.html'
                                                     : '/clients/estimator.html';
    return [
      { href: '/clients/dashboard.html', label: 'Home' },
      { href: estHref,                   label: estLabel },
      { href: '/clients/sessions.html',  label: 'Prior Sessions' },
      { href: '/clients/invoices.html',  label: 'Invoices' },
      { spacer: true },
      { label: 'Account', anchor: 'right', group: [
          { href: '/clients/profile.html',  label: 'Profile' },
          { href: '/clients/settings.html', label: 'Settings' },
          { divider: true },
          { href: '#', label: 'Sign out', action: 'signout' }
      ]}
    ];
  }

  function navStaff(me, isAdmin) {
    const items = [
      { href: '/staff/', label: 'Dashboard' },
      { label: 'Sales', group: [
          { href: '/staff/leads.html',     label: 'Leads' },
          { href: '/staff/prospects.html', label: 'Prospects' },
          { href: '/staff/proposals.html', label: 'Proposals' },
          { href: '/staff/clients.html',   label: 'Clients' }
      ]},
      { label: 'Tools', group: [
          { href: '/staff/proposalgen.html',           label: 'Proposal Generator' },
          { href: 'https://proposal.greencommllc.com/', label: 'Open standalone bundler', external: true },
          { divider: true },
          { href: '/staff/calendar.html',              label: 'Calendar' },
          { href: '/staff/files.html',                 label: 'Files' }
      ]}
    ];
    if (isAdmin) {
      items.push({ label: 'Admin', group: [
          { href: '/admin/console/',        label: 'Console (beta)' },
          { divider: true },
          { href: '/admin/users.html',      label: 'Users' },
          { href: '/admin/financials.html', label: 'Financials' },
          { href: '/admin/pipeline.html',   label: 'Pipeline' },
          { href: '/admin/marketing.html',  label: 'Marketing' },
          { divider: true },
          { href: '/admin/settings.html',   label: 'Admin Settings' }
      ]});
    }
    items.push({ spacer: true });
    items.push({ label: (me.name || me.email || 'Account').split('@')[0].split(' ')[0], anchor: 'right', group: [
        { groupLabel: me.email || '' },
        { href: '/clients/profile.html',  label: 'Profile' },
        { href: '/clients/settings.html', label: 'Settings' },
        { divider: true },
        { href: '#', label: 'Sign out', action: 'signout' }
    ]});
    return items;
  }

  // ── Render ────────────────────────────────────────────────
  function isActive(href, currentPath) {
    if (!href || href === '#') return false;
    const cleanHref = href.split('#')[0].split('?')[0];
    if (cleanHref === currentPath) return true;
    if (cleanHref !== '/' && currentPath.startsWith(cleanHref)) return true;
    return false;
  }

  function renderLeaf(item, currentPath) {
    let cls = '';
    if (item.cta) cls += ' cta';
    if (isActive(item.href, currentPath)) cls += ' active';
    const ext = item.external ? ' target="_blank" rel="noopener"' : '';
    const dataAct = item.action ? ` data-action="${item.action}"` : '';
    return `<li><a href="${item.href}" class="${cls.trim()}"${ext}${dataAct}>${item.label}</a></li>`;
  }

  function renderGroup(item, currentPath, idx) {
    const hasActive = item.group.some(c => isActive(c.href, currentPath));
    const cls = 'nav-group' + (hasActive ? ' has-active' : '');
    const dropCls = 'nav-dropdown' + (item.anchor === 'right' ? ' right-anchor' : '');
    const inner = item.group.map(c => {
      if (c.divider) return '<li class="divider" aria-hidden="true"></li>';
      if (c.groupLabel) return `<li class="group-label">${c.groupLabel}</li>`;
      const subActive = isActive(c.href, currentPath);
      const ext = c.external ? ' target="_blank" rel="noopener"' : '';
      const dataAct = c.action ? ` data-action="${c.action}"` : '';
      return `<li><a href="${c.href}" class="${subActive ? 'active' : ''}"${ext}${dataAct}>${c.label}</a></li>`;
    }).join('');
    return `
      <li class="${cls}" data-group="${idx}">
        <button type="button" class="nav-trigger" aria-haspopup="true" aria-expanded="false">
          ${item.label}<span class="caret" aria-hidden="true">▾</span>
        </button>
        <ul class="${dropCls}" role="menu">${inner}</ul>
      </li>`;
  }

  function renderNav(items, currentPath) {
    return items.map((it, i) => {
      if (it.spacer) return '<li class="spacer" aria-hidden="true"></li>';
      if (it.group)  return renderGroup(it, currentPath, i);
      return renderLeaf(it, currentPath);
    }).join('');
  }

  function mount(items, badgeText) {
    const host = document.getElementById('gcc-header');
    if (!host) return;
    const path = location.pathname;
    host.innerHTML = NAV_CSS + `
      <header class="site-header">
        <div class="container">
          ${BRAND}
          <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
          <nav class="site-nav" aria-label="Primary"><ul>${renderNav(items, path)}</ul></nav>
        </div>
      </header>`;

    // Update brand tag for staff/admin
    if (badgeText) {
      const tag = host.querySelector('#hdr-tag');
      if (tag) tag.textContent = badgeText;
    }

    // Mobile menu toggle
    const t = host.querySelector('.menu-toggle');
    const n = host.querySelector('.site-nav');
    if (t && n) t.addEventListener('click', () => {
      n.classList.toggle('is-open');
      t.setAttribute('aria-expanded', n.classList.contains('is-open') ? 'true' : 'false');
    });

    // Dropdown groups: click-to-toggle (works on touch + keyboard)
    host.querySelectorAll('.nav-group').forEach(g => {
      const trigger = g.querySelector('.nav-trigger');
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = g.classList.contains('is-open');
        // Close all other open groups
        host.querySelectorAll('.nav-group.is-open').forEach(x => {
          if (x !== g) { x.classList.remove('is-open'); x.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false'); }
        });
        g.classList.toggle('is-open', !wasOpen);
        trigger.setAttribute('aria-expanded', String(!wasOpen));
      });
      // Keyboard: Escape closes
      g.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          g.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      });
    });
    // Click-outside closes any open group
    document.addEventListener('click', () => {
      host.querySelectorAll('.nav-group.is-open').forEach(g => {
        g.classList.remove('is-open');
        g.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false');
      });
    });

    // Sign-out wiring
    host.querySelectorAll('a[data-action="signout"]').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        try { if (window.gccApi) await gccApi.signout(); } catch (_) {}
        localStorage.removeItem('gcc-client-id');
        localStorage.removeItem('gcc-client-type');
        window.location.href = '/';
      });
    });

    // Brand link target depending on role
    const brandLink = host.querySelector('.brand-mark');
    if (brandLink) {
      if (badgeText === 'Client Portal') brandLink.setAttribute('href', '/clients/dashboard.html');
      else if (badgeText === 'Staff Portal' || badgeText === 'Admin') brandLink.setAttribute('href', '/staff/');
    }
  }

  // ── Enhance an already-rendered static nav (anon users only) ─
  // The HTML files now ship with a static anonymous header. For signed-out
  // visitors we don't need to re-render — we just attach the JS handlers
  // (mobile menu toggle). For signed-in users we replace the whole header
  // via mount() so the role-aware nav appears.
  function enhanceStatic(host) {
    const t = host.querySelector('.menu-toggle');
    const n = host.querySelector('.site-nav');
    if (t && n) t.addEventListener('click', () => {
      n.classList.toggle('is-open');
      t.setAttribute('aria-expanded', n.classList.contains('is-open') ? 'true' : 'false');
    });
  }

  // ── Boot ──────────────────────────────────────────────────
  async function boot() {
    let items = navAnonymous();
    let badge = null;
    let isAnon = true;

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
        window.__gccMe = me;
        isAnon = false;
      } catch (err) {
        // Not signed in — anonymous nav (the static one already in the DOM is fine)
      }
    }

    const host = document.getElementById('gcc-header');
    const hasStatic = host && host.querySelector('.site-header');
    if (isAnon && hasStatic) {
      enhanceStatic(host);
    } else {
      mount(items, badge);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
