import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright drives the app through a real browser against the real
 * frontend (Vite dev server) and backend (Express + Postgres). It starts
 * both webServers automatically before running tests.
 *
 * Requires the databases created by backend/migrations to exist first —
 * see the root README "Running the E2E suite" section.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  // Every interaction in this app triggers a real network round trip
  // (click -> Express -> Postgres -> response -> React re-render), which is
  // slower and more variable on CI runners than local dev. Playwright's
  // defaults (5s action timeout, 5s expect timeout) can be tight for that
  // under CI load — widen both here rather than patching individual
  // assertions ad hoc, so any interaction gets the same safety margin.
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run dev --prefix ../backend',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev --prefix ../frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
