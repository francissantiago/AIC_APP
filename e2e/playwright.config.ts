import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:83';
const slowMo = Number(process.env.E2E_SLOW_MO_MS ?? '0');
const authFile = path.join(__dirname, '.auth', 'admin.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
  ],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      testIgnore: [/demo\//, /.*\.setup\.ts/],
    },
    {
      name: 'demo',
      testMatch: /demo\/.*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      retries: 1,
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        trace: 'on',
        launchOptions: { slowMo: slowMo || 300 },
        viewport: { width: 1440, height: 900 },
      },
      timeout: 3_600_000,
    },
  ],
  outputDir: 'test-results/artifacts',
});
