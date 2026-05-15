import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /auth and /api proxy to the local Express server (apps/web-server :3001).
// /api/gbp proxies to the live .NET GccApi at api.greencommllc.com so Settings
// shows the same data as production.
//
// In production builds, set VITE_API_BASE=https://api.greencommllc.com and the
// SPA will hit that directly with no proxy.
export default defineConfig(({ command }) => {
  // Production builds are served from greencommllc.com/admin/console/ — base
  // path tells Vite to emit relative asset URLs and absolute hrefs prefixed
  // accordingly so the SPA can sit under that subpath.
  const base = command === 'build' ? '/admin/console/' : '/';
  return {
    base,
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
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
