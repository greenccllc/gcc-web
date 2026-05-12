import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@':        fileURLToPath(new URL('./src', import.meta.url)),
      '@models':  fileURLToPath(new URL('./src/types', import.meta.url)),
      '@viz':     fileURLToPath(new URL('./src/viz', import.meta.url)),
      '@pricing': fileURLToPath(new URL('./src/pricing', import.meta.url)),
      '@risk':    fileURLToPath(new URL('./src/risk', import.meta.url)),
      '@brand':   fileURLToPath(new URL('./src/brand', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
    proxy: {
      '/api/gemini': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    // The whole app still fits comfortably in one bundle — we're at ~340KB
    // today. When it grows past ~500KB, uncomment manualChunks.
    // rollupOptions: {
    //   output: {
    //     manualChunks: {
    //       mermaid: ['mermaid'],
    //       pdf: ['pdf-lib']
    //     }
    //   }
    // }
  }
});
