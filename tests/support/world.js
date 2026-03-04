const { setWorldConstructor, World, Before, After, setDefaultTimeout } = require('@cucumber/cucumber')
const { chromium } = require('@playwright/test')

// Cucumber's default timeout is 5 s – far too short for Playwright.
// 30 s per step matches the Playwright / Vite dev-server startup window.
setDefaultTimeout(30_000)

const BASE_URL = 'http://localhost:5173/SolutionInventory/'

// ---------------------------------------------------------------------------
// Custom World – holds the Playwright browser, context and page for each scenario
// ---------------------------------------------------------------------------
class PlaywrightWorld extends World {
  constructor(options) {
    super(options)
    this.browser = null
    this.context = null
    this.page = null
    this.baseURL = BASE_URL
  }
}

setWorldConstructor(PlaywrightWorld)

// ---------------------------------------------------------------------------
// Lifecycle hooks – launch a fresh browser context for every scenario
// ---------------------------------------------------------------------------
Before(async function () {
  this.browser = await chromium.launch()
  this.context = await this.browser.newContext({
    baseURL: BASE_URL,
    // Give Playwright assertions up to 10 s to find elements
    actionTimeout: 10_000,
  })
  this.page = await this.context.newPage()

  // Auto-accept native browser confirm/alert dialogs so tests don't hang
  this.page.on('dialog', (dialog) => dialog.accept())
})

After(async function () {
  await this.browser?.close()
})
