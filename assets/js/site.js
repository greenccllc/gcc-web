// GCC site shared JS — minimal, no framework
(function () {
  'use strict';

  var DEFAULTS = {
    menuToggleSelector: '[data-nav-toggle], .menu-toggle',
    navContainerSelector: '[data-nav-container], .site-nav',
    navGroupSelector: '[data-nav-group], .nav-group',
    navTriggerSelector: '[data-nav-trigger], .nav-trigger',
    utilityNavSelector: '[data-nav-utility]',
    closeOnLinkClick: true,
    desktopBreakpoint: '(min-width: 861px)',
    anchorOffset: 72
  };

  function merge(a, b) {
    var out = {};
    Object.keys(a).forEach(function (k) { out[k] = a[k]; });
    Object.keys(b || {}).forEach(function (k) { out[k] = b[k]; });
    return out;
  }

  function setupMenuState(root, opts) {
    var toggle = root.querySelector(opts.menuToggleSelector);
    var nav = root.querySelector(opts.navContainerSelector);
    if (!toggle || !nav || toggle.dataset.navBound === '1') return null;
    toggle.dataset.navBound = '1';

    var lastFocus = null;

    function openMenu() {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    }

    function closeMenu(focusToggle) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      if (focusToggle) toggle.focus();
    }

    function closeAllGroups() {
      root.querySelectorAll(opts.navGroupSelector + '.is-open').forEach(function (group) {
        group.classList.remove('is-open');
        var trigger = group.querySelector(opts.navTriggerSelector);
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }

    function toggleGroup(group, trigger) {
      var isOpen = group.classList.contains('is-open');
      root.querySelectorAll(opts.navGroupSelector + '.is-open').forEach(function (other) {
        if (other === group) return;
        other.classList.remove('is-open');
        var otherTrigger = other.querySelector(opts.navTriggerSelector);
        if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
      });
      group.classList.toggle('is-open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav.classList.contains('is-open')) closeMenu(false); else openMenu();
    });

    if (opts.closeOnLinkClick) {
      nav.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (!a) return;
        if (a.matches(opts.navTriggerSelector)) return;
        closeMenu(false);
      });
    }

    root.querySelectorAll(opts.navGroupSelector).forEach(function (group) {
      var trigger = group.querySelector(opts.navTriggerSelector);
      if (!trigger || trigger.dataset.navBound === '1') return;
      trigger.dataset.navBound = '1';
      trigger.setAttribute('aria-expanded', trigger.getAttribute('aria-expanded') || 'false');
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        lastFocus = document.activeElement;
        toggleGroup(group, trigger);
      });
    });

    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) closeMenu(false);
      if (!root.contains(e.target)) closeAllGroups();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var hadOpenGroup = !!root.querySelector(opts.navGroupSelector + '.is-open');
      if (hadOpenGroup) {
        closeAllGroups();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      if (nav.classList.contains('is-open')) closeMenu(true);
    });

    var mq = window.matchMedia(opts.desktopBreakpoint);
    var onChange = function () { if (mq.matches) closeMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);

    return { openMenu: openMenu, closeMenu: closeMenu, closeAllGroups: closeAllGroups };
  }

  function markActiveLinks(root, opts) {
    var path = location.pathname.replace(/\/$/, '') || '/';
    var sel = opts.navContainerSelector + ' a, ' + opts.utilityNavSelector + ' a';
    root.querySelectorAll(sel).forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0].split('?')[0].replace(/\/$/, '');
      if (!href) return;
      if (href === path || (href === '/' && path === '/')) a.classList.add('active');
    });
  }

  function setupAnchorScrolling(root, opts) {
    if (document.body.dataset.anchorBound === '1') return;
    document.body.dataset.anchorBound = '1';
    root.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var t = document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      var y = window.pageYOffset + t.getBoundingClientRect().top - opts.anchorOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  function initNavigation(root, options) {
    var scope = root || document;
    var opts = merge(DEFAULTS, options || {});
    var menu = setupMenuState(scope, opts);
    markActiveLinks(scope, opts);
    setupAnchorScrolling(document, opts);
    return menu;
  }

  function init() { initNavigation(document); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.gccSite = {
    initNavigation: initNavigation,
    setupMenuState: setupMenuState,
    markActiveLinks: markActiveLinks,
    setupAnchorScrolling: setupAnchorScrolling
  };
})();
