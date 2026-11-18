import { defineConfig, devices } from '@playwright/test';

// Rendu réel dans Chromium (jsdom ne calcule aucune mise en page) sur le
// build de production : `npm run build` doit avoir été lancé avant.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
