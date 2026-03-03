import { defineConfig, devices } from '@playwright/test'

// Run tests headless by default; use `npm run test:e2e:headed` for a visible browser.
export default defineConfig({
  testDir: './tests',

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry failed tests once on CI.
  retries: process.env.CI ? 1 : 0,

  use: {
    // Base URL for all page.goto('/') calls.
    baseURL: 'http://localhost:5173/SolutionInventory/',

    // Capture screenshot on test failure.
    screenshot: 'only-on-failure',

    // Record trace on first retry.
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start the Vite dev server before the tests.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/SolutionInventory/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
