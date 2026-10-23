/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/photo-diary/',
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
