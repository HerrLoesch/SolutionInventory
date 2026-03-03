import { test, expect } from '@playwright/test'

const TEST_PROJECT_NAME = 'Playwright Test Project'
const TEST_QUESTIONNAIRE_NAME = 'Playwright Test Questionnaire'

/** Creates a project and waits until it is visible in the tree. */
async function createProject(page, name = TEST_PROJECT_NAME) {
  await page.locator('.tree-actions button').first().click()
  await expect(page.getByLabel('Project name')).toBeVisible()
  await page.getByLabel('Project name').fill(name)
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

/** Opens the project context menu and clicks the given menu item label. */
async function openProjectMenu(page, projectName, menuItemLabel) {
  const projectItem = page.locator('.v-treeview-item').filter({ hasText: projectName })
  await projectItem.hover()
  await projectItem.locator('.item-menu').click()
  await page.getByRole('listitem').filter({ hasText: menuItemLabel }).click()
}

test.describe('Project management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // -------------------------------------------------------------------------
  // Create a project
  // -------------------------------------------------------------------------
  test('can create a new project', async ({ page }) => {
    // Click the "New project" (+) button in the tree header
    await page.locator('.tree-actions button').first().click()

    // Wait for the dialog's text field to appear (v-card-title is a <div>, not a heading)
    const projectNameField = page.getByLabel('Project name')
    await expect(projectNameField).toBeVisible()

    // Fill in the project name
    await projectNameField.fill(TEST_PROJECT_NAME)

    // Confirm creation
    await page.getByRole('button', { name: 'Create' }).click()

    // The dialog text field should be gone and the project should appear in the tree
    await expect(projectNameField).not.toBeVisible()
    await expect(page.getByText(TEST_PROJECT_NAME)).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Delete a project
  // -------------------------------------------------------------------------
  test('can delete a project', async ({ page }) => {
    // First create the project we want to delete
    await page.locator('.tree-actions button').first().click()
    await page.getByLabel('Project name').fill(TEST_PROJECT_NAME)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(TEST_PROJECT_NAME)).toBeVisible()

    // Accept the native confirm dialog that pops up when deleting
    page.on('dialog', (dialog) => dialog.accept())

    // Hover over the project item to reveal the context menu button
    const projectItem = page.locator('.v-treeview-item').filter({ hasText: TEST_PROJECT_NAME })
    await projectItem.hover()

    // Click the "..." context menu button
    await projectItem.locator('.item-menu').click()

    // Click "Delete" in the dropdown
    await page.getByRole('listitem').filter({ hasText: 'Delete' }).click()

    // The project should no longer be visible in the tree
    await expect(page.getByText(TEST_PROJECT_NAME)).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Add a questionnaire to a project
  // -------------------------------------------------------------------------
  test('can add a questionnaire to a project', async ({ page }) => {
    await createProject(page)

    // Open project context menu and click "Add"
    await openProjectMenu(page, TEST_PROJECT_NAME, 'Add')

    // Wait for the questionnaire name field
    const questionnaireNameField = page.getByLabel('Questionnaire name')
    await expect(questionnaireNameField).toBeVisible()

    // Fill in the questionnaire name and confirm
    await questionnaireNameField.fill(TEST_QUESTIONNAIRE_NAME)
    await page.getByRole('button', { name: 'Create' }).click()

    // The dialog should close and the questionnaire should appear in the tree
    await expect(questionnaireNameField).not.toBeVisible()
    await expect(
      page.locator('.project-tree-nav .tree-click-title', { hasText: TEST_QUESTIONNAIRE_NAME })
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Delete a questionnaire from a project
  // -------------------------------------------------------------------------
  test('can delete a questionnaire from a project', async ({ page }) => {
    // Create the project and questionnaire first
    await createProject(page)
    await openProjectMenu(page, TEST_PROJECT_NAME, 'Add')
    await page.getByLabel('Questionnaire name').fill(TEST_QUESTIONNAIRE_NAME)
    await page.getByRole('button', { name: 'Create' }).click()
    const questionnaireTreeItem = page.locator(
      '.project-tree-nav .tree-click-title', { hasText: TEST_QUESTIONNAIRE_NAME }
    )
    await expect(questionnaireTreeItem).toBeVisible()

    // Accept the native confirm dialog that pops up when deleting
    page.on('dialog', (dialog) => dialog.accept())

    // Open the questionnaire context menu and click "Delete"
    const questionnaireItem = page.locator('.v-treeview-item').filter({ hasText: TEST_QUESTIONNAIRE_NAME })
    await questionnaireItem.hover()
    await questionnaireItem.locator('.item-menu').click()
    await page.getByRole('listitem').filter({ hasText: 'Delete' }).click()

    // The questionnaire should no longer be visible in the tree
    await expect(questionnaireTreeItem).not.toBeVisible()
  })
})
