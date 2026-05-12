import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /auth and /api proxy to the local Express server (apps/web-server :3001)
// EXCEPT /api/webhooks, which proxies to the live .NET GccApi at api.greencommllc.com
// since that's the canonical home for the Thumbtack webhook endpoint.
//
// In production builds, set VITE_API_BASE=https://api.greencommllc.com and the
// LeadsTab will hit that directly with no proxy.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Production builds are served from greencommllc.com/admin/console/ — base
  // path tells Vite to emit relative asset URLs and absolute hrefs prefixed
  // accordingly so the SPA can sit under that subpath.
  const base = command === 'build' ? '/admin/console/' : '/';
  return {
    base,
    plugins: [react()],
    define: {
      'import.meta.env.VITE_WEBHOOKS_API': JSON.stringify(
        env.VITE_WEBHOOKS_API || 'https://api.greencommllc.com',
      ),
    },
    server: {
      port: 5174,
      proxy: {
        // These endpoints all live on the .NET API in prod — proxy to live there
        // in dev too so Leads + Settings show the same data as production.
        '/api/webhooks': {
          target: 'https://api.greencommllc.com',
          changeOrigin: true,
          secure: true,
        },
        '/api/gbp': {
          target: 'https://api.greencommllc.com',
          changeOrigin: true,
          secure: true,
        },
        '/auth': 'http://localhost:3001',
        '/api':  'http://localhost:3001',
      },
    },
  };
});
