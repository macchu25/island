/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// e2e points the proxy at its own api port; dev uses the default. `vite preview` inherits server.proxy.
const apiUrl = process.env.CHEMIMON_API_URL ?? 'http://127.0.0.1:3101';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': apiUrl } },
  test: { environment: 'jsdom', globals: false, setupFiles: ['./test/setup.ts'] },
});
