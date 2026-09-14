import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(root, 'reports/playwright/test-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(root, 'reports/playwright/html'), open: 'never' }],
    ['json', { outputFile: path.join(root, 'reports/playwright/results.json') }],
    ['junit', { outputFile: path.join(root, 'reports/playwright/junit.xml') }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [{ name: 'chromium-critical', use: { ...devices['Desktop Chrome'] } }],
});
