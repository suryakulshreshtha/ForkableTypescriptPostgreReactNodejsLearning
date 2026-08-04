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
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
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
