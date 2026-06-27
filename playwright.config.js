require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  globalSetup: require.resolve('./fixtures/global-setup.js'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: '**/auth/admin.setup.spec.js',
      use: {
        baseURL: process.env.ADMIN_URL,
      },
    },
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.js',
      // No browser — uses APIRequestContext only
    },
    {
      name: 'storefront',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STOREFRONT_URL,
      },
      testMatch: '**/storefront/**/*.spec.js',
    },
    {
      name: 'admin',
      dependencies: ['admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_URL,
        storageState: 'auth.json',
      },
      testMatch: '**/admin/**/*.spec.js',
    },
    {
      name: 'pact',
      testDir: './pact',
      testMatch: '**/*.spec.js',
      use: {
        baseURL: process.env.BACKEND_URL,
      },
    },
    {
      name: 'visual',
      testDir: './tests/visual',
      testMatch: '**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STOREFRONT_URL,
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'applitools',
      testDir: './tests/visual',
      testMatch: '**/applitools.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STOREFRONT_URL,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
