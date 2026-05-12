import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
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
  test: {
    include: ['tests/**/*.test.ts']
  }
});
