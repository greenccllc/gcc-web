import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// In production this app is mounted at /admin/console/ (vite base). Any
// fetch('/api/...') or fetch('/auth/...') from a tab is a RELATIVE URL —
// when the page is at https://www.greencommllc.com/admin/console/, it
// resolves to https://www.greencommllc.com/api/... which hits the IIS
// catchall and returns the SPA HTML instead of the express JSON. Wrap
// fetch so any path starting with /api/ or /auth/ gets the BASE_URL
// prefix automatically. In dev (base = '/'), this is a no-op.
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, ''); // "/admin/console" or ""
if (BASE) {
  const realFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    if (typeof input === 'string' && (input.startsWith('/api/') || input.startsWith('/auth/'))) {
      return realFetch(BASE + input, init);
    }
    if (input && typeof input === 'object' && typeof input.url === 'string' &&
        (input.url.startsWith('/api/') || input.url.startsWith('/auth/'))) {
      return realFetch(new Request(BASE + input.url, input), init);
    }
    return realFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
