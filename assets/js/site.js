// GCC site shared JS — minimal, no framework
(function () {
  'use strict';

  // Mobile menu toggle (works on the static anonymous header that ships in HTML).
  // header.js will call setupMobileMenu() again after a role-aware re-render.
  function setupMobileMenu(root) {
    root = root || document;
    var toggle = root.querySelector('.menu-toggle');
    var nav    = root.querySelector('.site-nav');
    if (!toggle || !nav || toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    function open()  { nav.classList.add('is-open');    toggle.setAttribute('aria-expanded', 'true');  document.body.classList.add('menu-open'); }
    function close() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav.classList.contains('is-open')) close(); else open();
    });

    // Close when a nav link is tapped (mobile flow)
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && !a.classList.contains('nav-trigger')) close();
    });

    // Close on outside tap
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      close();
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        close();
        toggle.focus();
      }
    });

    // Reset state if the user crosses the desktop breakpoint
    var mq = window.matchMedia('(min-width: 861px)');
    var onChange = function () { if (mq.matches) close(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
  }

  // Highlight current nav link (for the static-rendered anonymous nav)
  function markActive() {
    var path = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.site-nav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').replace(/\/$/, '');
      if (!href) return;
      if (href === path || (href === '/' && path === '/')) a.classList.add('active');
    });
  }

  // Smooth-scroll for in-page anchors (offsets sticky header). CSS scroll-behavior
  // covers most cases; this handler only intercepts to add the offset.
  function setupAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var t = document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      var rect = t.getBoundingClientRect();
      var y = window.pageYOffset + rect.top - 72; // header height
      window.scrollTo({ top: y, behavior: 'smooth' });
      // Update URL without jumping
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  function init() {
    setupMobileMenu();
    markActive();
    setupAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for header.js to re-attach after re-render
  window.gccSite = { setupMobileMenu: setupMobileMenu };
})();
