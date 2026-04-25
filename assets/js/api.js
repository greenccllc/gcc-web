// ============================================================
// GCC API client wrapper. Handles base URL, JSON, cookies.
// ============================================================
(function () {
  'use strict';

  // Detect environment. In dev/LAN we hit the API directly on :5099.
  // In prod (HTTPS), we'll switch to api.greencommllc.com.
  function pickBase() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:5099';
    if (location.protocol === 'https:') return 'https://api.' + h.replace(/^www\./, '');
    return 'http://' + h.replace(/^www\./, '') + ':5099';
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
