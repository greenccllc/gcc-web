// ============================================================
// GCC API client wrapper. Handles base URL, JSON, cookies.
// ============================================================
(function () {
  'use strict';

  // Detect environment. In dev/LAN we hit the API directly on :5099.
  //
  // MULTI-DOMAIN AUTH: the GCC session/auth backend is ONE canonical host
  // (api.greencommllc.com), even though the platform now accepts logins from
  // several trusted alias domains (greencommllc.com / appmajic.ai /
  // majicholdings.com all resolve to the same profile server-side). The API
  // host must therefore be PINNED to api.greencommllc.com and NOT derived from
  // whatever alias domain happens to be serving the page — otherwise a page
  // served under appmajic.ai would call api.appmajic.ai (the LLM tunnel) and a
  // page under majicholdings.com would call api.majicholdings.com (the dispatch
  // API), neither of which is the GCC backend. The gcc_sess cookie is issued by
  // the API for the .greencommllc.com domain and travels with credentials:'include'.
  var GCC_API_HOST = 'api.greencommllc.com';

  // Hosts that ARE the GCC backend's own zone — when the site is served from
  // one of these (or a www. variant), keep deriving api.<zone> so staging /
  // alternate GCC subdomains still work. Any other host (an alias domain) falls
  // through to the pinned canonical GCC API host above.
  var GCC_ZONE_RE = /(^|\.)greencommllc\.com$/i;

  function pickBase() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:5099';
    var bare = h.replace(/^www\./, '');
    if (location.protocol === 'https:') {
      // Served from the GCC zone -> api.<that zone>; served from an alias
      // domain (appmajic.ai / majicholdings.com / etc.) -> pinned GCC API host.
      return GCC_ZONE_RE.test(bare) ? ('https://api.' + bare) : ('https://' + GCC_API_HOST);
    }
    // Plain-HTTP LAN/dev: only derive :5099 for the GCC zone; otherwise pin.
    return GCC_ZONE_RE.test(bare) ? ('http://' + bare + ':5099') : ('https://' + GCC_API_HOST);
  }

  var BASE = pickBase();

  async function call(method, path, body) {
    var opts = {
      method: method,
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    var r = await fetch(BASE + path, opts);
    var data = null;
    var ct = r.headers.get('content-type') || '';
    if (ct.indexOf('application/json') >= 0) {
      try { data = await r.json(); } catch (_) {}
    } else {
      try { data = await r.text(); } catch (_) {}
    }
    if (!r.ok) {
      var err = new Error((data && data.error) || ('HTTP ' + r.status));
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.gccApi = {
    base: BASE,
    health: function () { return call('GET', '/api/health'); },

    submitLead: function (payload) { return call('POST', '/api/leads', payload); },

    signup: function (payload) { return call('POST', '/api/clients/signup', payload); },
    signin: function (payload) { return call('POST', '/api/clients/signin', payload); },
    signout: function ()       { return call('POST', '/api/clients/signout'); },
    me: function ()            { return call('GET',  '/api/clients/me'); },

    saveEstimate: function (payload) { return call('POST', '/api/estimates', payload); },
    listMyEstimates: function ()     { return call('GET',  '/api/clients/me/estimates'); },
    deleteEstimate: function (id)    { return call('DELETE', '/api/estimates/' + encodeURIComponent(id)); }
  };
})();
