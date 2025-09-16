import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for AI Self-Healing library testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in parallel */
  fullyParallel: true,
  /* Forbid tests in production CI */
  forbidOnly: !!process.env.CI,
  /* Retry on failure in CI */
  retries: process.env.CI ? 2 : 0,
  /* Limit worker processes in CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter configuration */
  reporter: 'html',
  /* Global settings for all projects */
  use: {
    /* Base URL for tests */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace on retry */
    trace: 'on-first-retry',

    /* Settings for demonstration */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for different browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Additional settings for Google tests
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },

    /* Mobile tests */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        ignoreHTTPSErrors: true,
      },
    },

    /* Branded browsers */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run local dev server before tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
