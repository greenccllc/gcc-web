/* GCC staff-auth gate — load BEFORE any other /staff/* script.
 *
 * Restricts /staff/* pages to operators with a verified
 * @greencommllc.com Google identity. On load:
 *   1. Look for `gccStaffAuth` in sessionStorage. If present + not
 *      expired + matches the allowed domain, allow the page to render.
 *   2. Otherwise, hide the page body + redirect to /staff/login.html
 *      with `?next=<original-url>`.
 *
 * The session blob is { email, hd, exp } (exp = unix-seconds). We use
 * sessionStorage (not localStorage) so closing the browser ends the
 * session — adequate for shared workstations.
 *
 * SECURITY MODEL: this is a CLIENT-SIDE gate. It keeps casual visitors
 * + public web crawlers off the staff pages. The real security boundary
 * is gcc-api's X-Gcc-Admin-Secret check on every /api/admin/* and
 * /api/google/admin/* call — those endpoints will 401/403 a user who
 * hasn't been issued the secret regardless of whether they bypass this
 * gate. For a hardened EDGE gate, set up Cloudflare Access on
 * staff.greencommllc.com per docs/runbook-cloudflare-access.md.
 */
(function () {
  'use strict';

  // Skip the gate on the login page itself + on any URL with ?secret=
  // (admin tray launcher passes the API secret directly; presence of
  // a valid secret implies operator status).
  var path = location.pathname || '';
  if (path === '/staff/login.html' || path.endsWith('/login.html')) return;
  var qs = new URLSearchParams(location.search);
  if (qs.get('secret')) {
    // Mark the session as authenticated for 12 hours so subsequent
    // navigations within the staff tree don't bounce to login.
    try {
      sessionStorage.setItem('gccStaffAuth', JSON.stringify({
        email: 'tray-launcher',
        hd:    'greencommllc.com',
        exp:   Math.floor(Date.now() / 1000) + 12 * 3600,
      }));
    } catch (_) { /* sessionStorage unavailable -- fall through */ }
    return;
  }

  function readSession() {
    try {
      var raw = sessionStorage.getItem('gccStaffAuth');
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.exp || s.exp < Math.floor(Date.now() / 1000)) return null;
      if (s.hd !== 'greencommllc.com') return null;
      return s;
    } catch (_) { return null; }
  }

  if (readSession()) return;

  // Hide the page so partial UI doesn't flash before the redirect.
  // Inline style rather than a class so this works even if /assets/css/
  // hasn't loaded yet (script runs in <head> before any link[rel=stylesheet]
  // applies).
  var style = document.createElement('style');
  style.textContent = 'html,body{visibility:hidden!important;background:#FBFAF5}';
  document.documentElement.appendChild(style);

  // Redirect after the next paint to avoid a same-frame loop in Safari.
  var next = encodeURIComponent(location.pathname + location.search + location.hash);
  setTimeout(function () {
    location.replace('/staff/login.html?next=' + next);
  }, 0);
})();
