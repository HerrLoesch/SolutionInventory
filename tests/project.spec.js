import { test, expect } from '@playwright/test'

const TEST_PROJECT_NAME = 'Playwright Test Project'

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
})
