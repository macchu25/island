import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { E2E_API_PORT, E2E_API_URL, E2E_DATABASE_URL, E2E_WEB_PORT, E2E_WEB_URL } from './env';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * `pnpm e2e` = db:up, then this config. The api webServer first migrates chemimon_test, truncates
 * the player tables and seeds the real reviewed catalog (drafts off, as in a release), so "first discoverer"
 * is deterministic.
 * The web runs as a production build under `vite preview`, which inherits the /api proxy.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  // A retry would replay the loop after the first attempt already claimed First Discovery of H2O.
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  reporter: [['list']],
  outputDir: '../test-results',
  use: {
    baseURL: E2E_WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Headless has no GPU: render WebGL with SwiftShader (software) so the R3F canvas can start.
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: [
    {
      name: 'api',
      cwd: repoRoot,
      command: [
        'pnpm --filter @chemimon/api db:generate',
        'pnpm --filter @chemimon/api db:deploy',
        'pnpm --filter @chemimon/api db:seed -- --reset-players',
        'pnpm --filter @chemimon/api start',
      ].join(' && '),
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        PORT: String(E2E_API_PORT),
        BREEDING_TIME_SCALE: '0',
        EXTRACTOR_COOLDOWN_SCALE: '0',
        // Explicit 0 so a CONTENT_INCLUDE_DRAFTS=1 exported in the shell cannot leak into the test stack.
        CONTENT_INCLUDE_DRAFTS: '0',
      },
      url: `${E2E_API_URL}/api/catalog`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      name: 'web',
      cwd: repoRoot,
      command: `pnpm --filter @chemimon/web build && pnpm --filter @chemimon/web preview --port ${E2E_WEB_PORT} --strictPort`,
      env: { CHEMIMON_API_URL: E2E_API_URL },
      url: E2E_WEB_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
