/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backend = 'http://127.0.0.1:3000';
const proxied = [
  '/ask',
  '/context',
  '/auth',
  '/me',
  '/api',
  '/web-reader',
  '/mcp',
  '/mock-ent',
];

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(proxied.map((path) => [path, backend])),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
