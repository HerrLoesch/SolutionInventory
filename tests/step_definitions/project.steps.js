const { Given, When, Then } = require('@cucumber/cucumber')
const { expect } = require('@playwright/test')

// ---------------------------------------------------------------------------
// Background / navigation
// ---------------------------------------------------------------------------

Given('I open the application', async function () {
  await this.page.goto(this.baseURL)
})

// ---------------------------------------------------------------------------
// Project – Given (precondition helpers)
// ---------------------------------------------------------------------------

Given('a project {string} exists', async function (name) {
  await this.page.locator('.tree-actions button').first().click()
  await expect(this.page.getByLabel('Project name')).toBeVisible()
  await this.page.getByLabel('Project name').fill(name)
  await this.page.getByRole('button', { name: 'Create' }).click()
  await expect(this.page.getByText(name)).toBeVisible()
})

Given('a questionnaire {string} exists in project {string}', async function (questName, projName) {
  const projectItem = this.page.locator('.v-treeview-item').filter({ hasText: projName })
  await projectItem.hover()
  await projectItem.locator('.item-menu').click()
  await this.page.getByRole('listitem').filter({ hasText: 'Add' }).click()
  await expect(this.page.getByLabel('Questionnaire name')).toBeVisible()
  await this.page.getByLabel('Questionnaire name').fill(questName)
  await this.page.getByRole('button', { name: 'Create' }).click()
  await expect(
    this.page.locator('.project-tree-nav .tree-click-title', { hasText: questName })
  ).toBeVisible()
})

// ---------------------------------------------------------------------------
// When – UI interactions
// ---------------------------------------------------------------------------

When('I click the "New project" button', async function () {
  await this.page.locator('.tree-actions button').first().click()
})

When('I fill in the project name {string}', async function (name) {
  await expect(this.page.getByLabel('Project name')).toBeVisible()
  await this.page.getByLabel('Project name').fill(name)
})

When('I fill in the questionnaire name {string}', async function (name) {
  await expect(this.page.getByLabel('Questionnaire name')).toBeVisible()
  await this.page.getByLabel('Questionnaire name').fill(name)
})

When('I confirm with {string}', async function (buttonLabel) {
  await this.page.getByRole('button', { name: buttonLabel }).click()
})

When('I open the context menu for {string}', async function (name) {
  const item = this.page.locator('.v-treeview-item').filter({ hasText: name })
  await item.hover()
  await item.locator('.item-menu').click()
})

When('I open the context menu for questionnaire {string}', async function (name) {
  const item = this.page.locator('.v-treeview-item').filter({ hasText: name })
  await item.hover()
  await item.locator('.item-menu').click()
})

When('I click {string} in the context menu', async function (label) {
  await this.page.getByRole('listitem').filter({ hasText: label }).click()
})

// ---------------------------------------------------------------------------
// Then – assertions
// ---------------------------------------------------------------------------

Then('the project {string} should be visible in the tree', async function (name) {
  await expect(this.page.getByText(name)).toBeVisible()
})

Then('the project {string} should not be visible in the tree', async function (name) {
  await expect(this.page.getByText(name)).not.toBeVisible()
})

Then('the project name dialog should be closed', async function () {
  await expect(this.page.getByLabel('Project name')).not.toBeVisible()
})

Then('the questionnaire {string} should be visible in the tree', async function (name) {
  await expect(
    this.page.locator('.project-tree-nav .tree-click-title', { hasText: name })
  ).toBeVisible()
})

Then('the questionnaire {string} should not be visible in the tree', async function (name) {
  await expect(
    this.page.locator('.project-tree-nav .tree-click-title', { hasText: name })
  ).not.toBeVisible()
})

Then('the questionnaire name dialog should be closed', async function () {
  await expect(this.page.getByLabel('Questionnaire name')).not.toBeVisible()
})
