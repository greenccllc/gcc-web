// tabs.js — turns <div class="tabset" data-tabs> into tabs. Each child .tab-panel needs an id and a
// data-tab-label. Without this script every panel shows in order, so nothing is hidden from readers or search.
// A link to #panel-id opens that tab.
(function () {
  'use strict';
  function init(set) {
    var panels = Array.prototype.filter.call(set.children, function (c) { return c.classList.contains('tab-panel'); });
    if (panels.length < 2) return;
    var list = set.querySelector(':scope > .tab-list') || set.insertBefore(document.createElement('div'), panels[0]);
    list.className = 'tab-list';
    list.setAttribute('role', 'tablist');
    if (set.dataset.tabsLabel) list.setAttribute('aria-label', set.dataset.tabsLabel);
    list.innerHTML = '';
    var tabs = panels.map(function (p, i) {
      var t = document.createElement('button');
      t.type = 'button'; t.id = p.id + '-tab'; t.textContent = p.dataset.tabLabel || ('Tab ' + (i + 1));
      t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', p.id);
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', t.id); p.tabIndex = 0;
      list.appendChild(t);
      return t;
    });
    function show(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length;
        var j = k === 'ArrowRight' ? (i + 1) % n : k === 'ArrowLeft' ? (i - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
        if (j < 0) return;
        e.preventDefault(); show(j, true);
      });
    });
    set.classList.add('is-tabbed');
    function fromHash() {
      var h = location.hash.slice(1);
      var i = panels.findIndex(function (p) { return p.id === h || (h && p.querySelector('[id="' + h + '"]')); });
      return i;
    }
    var start = fromHash();
    show(start > -1 ? start : 0);
    window.addEventListener('hashchange', function () { var i = fromHash(); if (i > -1) show(i); });
  }
  function boot() { document.querySelectorAll('[data-tabs]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
