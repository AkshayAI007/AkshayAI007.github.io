import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

/**
 * Tests run against the production build in dist/, served with GitHub Pages'
 * URL rules (scripts/serve.mjs). Build first: `pnpm build && pnpm test`.
 * Visual parity against a baseline build lives in scripts/visual-parity.mjs.
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /a11y/ },
  ],
  webServer: {
    command: `node scripts/serve.mjs dist ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
