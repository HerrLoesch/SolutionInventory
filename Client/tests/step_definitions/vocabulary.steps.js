const { Given, When, Then } = require('@cucumber/cucumber')
const { expect } = require('@playwright/test')

// Walks the path a user actually takes: fill in an answer, put it on the radar,
// turn it into a vocabulary term from the blip detail, then meet it again as a
// suggestion in a second project.
//
// Vuetify's overlays swallow clicks aimed at the inner <input>, so selects are
// opened through their .v-field wrapper. Everything else hangs off the stable
// class hooks the components already carry (.radar-toggle-btn, .legend-row).

async function openSelect(page, label) {
  await page.locator('.v-input', { hasText: label }).filter({ visible: true }).locator('.v-field').first().click()
}

// Open questionnaire tabs stay mounted, so a plain text lookup can resolve
// against a hidden copy belonging to another project.
function visibleText(page, text) {
  return page.getByText(text, { exact: true }).filter({ visible: true }).first()
}

// A questionnaire starts locked on its metadata category: the remaining
// categories only appear once an Architectural Role is chosen.
Given('the questionnaire is unlocked for questions', async function () {
  await openSelect(this.page, 'Architectural Role')
  await this.page.getByRole('option').nth(1).click()
  await expect(visibleText(this.page, 'Architecture')).toBeVisible()
})

Given('I open the category {string}', async function (category) {
  await visibleText(this.page, category).click()
  await expect(this.page.getByLabel('Solution', { exact: true }).filter({ visible: true }).first()).toBeVisible()
})

Given('I answer the first entry with the tool {string}', async function (technology) {
  await openSelect(this.page, 'Type')
  await this.page.getByRole('option', { name: 'Tool', exact: false }).first().click()
  const solution = this.page.getByLabel('Solution', { exact: true }).filter({ visible: true }).first()
  await solution.fill(technology)
  // v-combobox commits its model on Enter/blur, not on every keystroke.
  await solution.press('Enter')
  await solution.blur()
  await expect(solution).toHaveValue(technology)
  // A status is needed for the blip to be plotted at all: since Todo 5.2 a blip
  // without any status is listed below the radar instead of sitting on the Hold
  // ring. This scenario is about the vocabulary, so it uses an assessed blip.
  await openSelect(this.page, 'Status')
  await this.page.getByRole('option', { name: 'Adopt', exact: false }).first().click()
})

When('I add {string} to the tech radar of {string}', async function (technology, projectName) {
  await this.page.locator('.project-tree-nav .tree-click-title', { hasText: projectName }).first().click()
  await this.page.getByRole('tab', { name: 'All Suggestions' }).click()
  // ProjectSummary keeps all three panes in the DOM, so everything below is
  // scoped to the visible one. Waiting for it first avoids resolving against a
  // hidden copy while the tab transition is still running.
  const pane = this.page.locator('.project-suggestions').filter({ visible: true })
  await expect(pane).toBeVisible()
  // Two nested accordions: category, then entry.
  await pane.locator('.v-expansion-panel-title', { hasText: 'Architecture' }).first().click()
  // The card title's own click target is covered by its children; the title
  // span is the element that actually receives the toggle.
  await pane.locator('.entry-card-title', { hasText: 'High-Level Pattern' }).first().locator('.text-subtitle-2').click()
  const row = pane.locator('.suggestion-row', { hasText: technology }).first()
  await expect(row).toBeVisible()
  await row.locator('.radar-toggle-btn').click()
  await expect(row).toHaveClass(/suggestion-row--radar/)
})

When('I open the tech radar of {string}', async function (projectName) {
  await this.page.locator('.project-tree-nav .tree-click-title', { hasText: projectName }).first().click()
  await this.page.getByRole('tab', { name: 'Tech Radar' }).click()
})

When('I open the details of the blip {string}', async function (name) {
  const legendRow = this.page.locator('.legend-row', { hasText: name }).first()
  await expect(legendRow).toBeVisible()
  await legendRow.click()
})

When('I create the blip as its own vocabulary term', async function () {
  const createButton = this.page.getByRole('button', { name: 'Create as its own term' })
  await expect(createButton).toBeEnabled()
  await createButton.click()
})

Then('the blip should be shown as part of the vocabulary {string}', async function (name) {
  const field = this.page.locator('.detail-field', { hasText: 'Vocabulary' }).first()
  await expect(field).toContainText(name)
  await expect(field).not.toContainText('Not in the vocabulary')
})

When('I close the blip details', async function () {
  await this.page.keyboard.press('Escape')
  await expect(this.page.locator('.detail-header')).toHaveCount(0)
})

When('I open the solution suggestions of the first entry', async function () {
  await openSelect(this.page, 'Solution')
})

Then('{string} should be offered as a suggestion', async function (name) {
  await expect(this.page.getByRole('option', { name, exact: true }).first()).toBeVisible()
})
