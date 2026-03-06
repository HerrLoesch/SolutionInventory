'use strict'

const { Given, When, Then } = require('@cucumber/cucumber')
const { expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, '..', 'data')

/**
 * Access the Pinia workspace store inside the browser context without any UI
 * interaction. In Vue 3, the mounted root element exposes __vue_app__, giving
 * us access to globalProperties.$pinia and therefore all registered stores.
 */
function getPiniaStore(page) {
  return page.evaluate(() => {
    const appEl = document.querySelector('#app')
    const pinia =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia ?? window.__pinia__
    if (!pinia) throw new Error('Pinia instance not found on page.')
    const store = pinia._s.get('workspace')
    if (!store) throw new Error('"workspace" store not found in Pinia.')
    return store
  })
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

Given('I have the store available', async function () {
  await this.page.goto(this.baseURL)
  await this.page.waitForLoadState('networkidle')
  // Start every scenario with a clean, empty workspace
  await this.page.evaluate(() => localStorage.clear())
  await this.page.reload()
  await this.page.waitForLoadState('networkidle')
})

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('I import the {string} file', async function (filename) {
  const filePath = path.join(DATA_DIR, filename)
  const importData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  // Validate the file format – mirrors the check in TreeNav.vue confirmImport()
  const projectName =
    importData?.project?.name ?? importData?.projectName ?? importData?.name
  if (!projectName) throw new Error('Import file is missing a project name.')
  if (!Array.isArray(importData.questionnaires))
    throw new Error('Import file is missing a questionnaires array.')
  importData.questionnaires.forEach((q) => {
    if (!Array.isArray(q?.categories))
      throw new Error('Each questionnaire must include a categories array.')
  })

  // Remember for subsequent assertion steps
  this.importProjectName = projectName

  this.projectCountBefore = await this.page.evaluate(() => {
    const appEl = document.querySelector('#app')
    const store =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s.get('workspace')
    return store?.workspace?.projects?.length ?? 0
  })

  // Call the store action directly – no UI interaction required
  await this.page.evaluate((data) => {
    const appEl = document.querySelector('#app')
    const pinia =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia ?? window.__pinia__
    if (!pinia) throw new Error('Pinia instance not found on page.')
    const store = pinia._s.get('workspace')
    if (!store) throw new Error('"workspace" store not found in Pinia.')

    const questionnaires = (data.questionnaires ?? []).map((q) => ({
      name: q.name || 'Imported questionnaire',
      categories: q.categories,
    }))
    store.importProject(data.project.name, questionnaires)
  }, importData)
})

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the project should be imported successfully', async function () {
  const projectCountNow = await this.page.evaluate(() => {
    const appEl = document.querySelector('#app')
    const store =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s.get('workspace')
    return store?.workspace?.projects?.length ?? 0
  })
  expect(projectCountNow).toBeGreaterThan(this.projectCountBefore)
})

Then('the project should be available in the store', async function () {
  const found = await this.page.evaluate((projectName) => {
    const appEl = document.querySelector('#app')
    const store =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s.get('workspace')
    return store?.workspace?.projects?.some((p) => p.name === projectName) ?? false
  }, this.importProjectName)
  expect(found).toBe(true)
})

Then('the project schould have one questionnaire', async function () {
  const questionnaireCount = await this.page.evaluate((projectName) => {
    const appEl = document.querySelector('#app')
    const store =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s.get('workspace')
    const project = store?.workspace?.projects?.find((p) => p.name === projectName)
    return project?.questionnaireIds?.length ?? 0
  }, this.importProjectName)
  expect(questionnaireCount).toBe(1)
})

When('I export the project', async function () {
  // Call the real store.exportProject() but intercept the Blob/download
  // mechanism so no actual file is written to disk.
  this.exportedData = await this.page.evaluate((projectName) => {
    const appEl = document.querySelector('#app')
    const store =
      appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s.get('workspace')
    const project = store?.workspace?.projects?.find((p) => p.name === projectName)
    if (!project) throw new Error(`Project "${projectName}" not found in store.`)

    // --- intercept download mechanics ---
    let capturedJson = null

    const OrigBlob = window.Blob
    window.Blob = function (parts, options) {
      if (options?.type === 'application/json') capturedJson = parts[0]
      return new OrigBlob(parts, options)
    }

    const origCreateObjectURL = URL.createObjectURL
    URL.createObjectURL = () => 'blob:mock'

    const origRevokeObjectURL = URL.revokeObjectURL
    URL.revokeObjectURL = () => {}

    const origClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {}

    try {
      // ← calls the real store method
      store.exportProject(project.id)
    } finally {
      window.Blob = OrigBlob
      URL.createObjectURL = origCreateObjectURL
      URL.revokeObjectURL = origRevokeObjectURL
      HTMLAnchorElement.prototype.click = origClick
    }

    if (!capturedJson) throw new Error('exportProject() did not produce JSON data.')
    return JSON.parse(capturedJson)
  }, this.importProjectName)
})

Then('the exported file should be available', async function () {
  expect(this.exportedData, 'Export data should not be null').not.toBeNull()
  expect(this.exportedData.project, 'Export should have a project object').toBeTruthy()
  expect(
    Array.isArray(this.exportedData.questionnaires),
    'Export should have a questionnaires array',
  ).toBe(true)
})

Then('the exported data should match the data from {string}', async function (referenceFilename) {
  const referencePath = path.join(DATA_DIR, referenceFilename)
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf-8'))

  // Project name must match
  expect(this.exportedData.project.name).toBe(reference.project.name)

  // Same number of questionnaires
  expect(this.exportedData.questionnaires.length).toBe(reference.questionnaires.length)

  for (const refQuestionnaire of reference.questionnaires) {
    const actualQuestionnaire = this.exportedData.questionnaires.find(
      (q) => q.name === refQuestionnaire.name,
    )
    expect(
      actualQuestionnaire,
      `Questionnaire "${refQuestionnaire.name}" should be present in export`,
    ).toBeTruthy()

    // Same number of categories
    expect(actualQuestionnaire.categories.length).toBe(refQuestionnaire.categories.length)

    for (const refCategory of refQuestionnaire.categories) {
      const actualCategory = actualQuestionnaire.categories.find((c) => c.id === refCategory.id)
      expect(
        actualCategory,
        `Category "${refCategory.id}" should be present in exported questionnaire`,
      ).toBeTruthy()

      // Compare metadata for metadata-type categories
      if (refCategory.metadata && actualCategory.metadata) {
        for (const [key, expectedValue] of Object.entries(refCategory.metadata)) {
          expect(actualCategory.metadata[key]).toBe(expectedValue)
        }
      }

      // Compare answers entry by entry
      for (const refEntry of refCategory.entries ?? []) {
        const actualEntry = (actualCategory.entries ?? []).find((e) => e.id === refEntry.id)
        expect(
          actualEntry,
          `Entry "${refEntry.id}" in category "${refCategory.id}" should exist in export`,
        ).toBeTruthy()

        for (let i = 0; i < (refEntry.answers ?? []).length; i++) {
          const refAnswer = refEntry.answers[i]
          const actualAnswer = actualEntry.answers?.[i]
          expect(
            actualAnswer,
            `Answer ${i} of entry "${refEntry.id}" should exist in export`,
          ).toBeTruthy()
          expect(actualAnswer.technology).toBe(refAnswer.technology)
          expect(actualAnswer.status).toBe(refAnswer.status)
          expect(actualAnswer.comments).toBe(refAnswer.comments)
        }
      }
    }
  }
})

Then(
  'the data from the questionnaire should match the data from {string}',
  async function (referenceFilename) {
    const referencePath = path.join(DATA_DIR, referenceFilename)
    const reference = JSON.parse(fs.readFileSync(referencePath, 'utf-8'))

    const actualCategories = await this.page.evaluate((projectName) => {
      const appEl = document.querySelector('#app')
      const store =
        appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s.get('workspace')
      const project = store?.workspace?.projects?.find((p) => p.name === projectName)
      if (!project?.questionnaireIds?.length) return null
      const questionnaire = store.workspace.questionnaires.find(
        (q) => q.id === project.questionnaireIds[0],
      )
      return questionnaire?.categories ?? null
    }, this.importProjectName)

    expect(actualCategories, 'Imported questionnaire categories must not be null').not.toBeNull()

    for (const refCategory of reference.categories) {
      const actualCategory = actualCategories.find((c) => c.id === refCategory.id)
      expect(
        actualCategory,
        `Category "${refCategory.id}" should be present after import`,
      ).toBeTruthy()

      // Verify metadata fields for metadata-type categories (e.g. solution-desc)
      if (refCategory.metadata) {
        for (const [key, expectedValue] of Object.entries(refCategory.metadata)) {
          expect(actualCategory.metadata?.[key]).toBe(expectedValue)
        }
      }

      // Verify the first answer of each referenced entry
      for (const refEntry of refCategory.entries ?? []) {
        const actualEntry = (actualCategory.entries ?? []).find(
          (e) => e.id === refEntry.id,
        )
        expect(
          actualEntry,
          `Entry "${refEntry.id}" in category "${refCategory.id}" should exist`,
        ).toBeTruthy()

        const refAnswer = refEntry.answers?.[0]
        const actualAnswer = actualEntry?.answers?.[0]
        if (refAnswer) {
          expect(actualAnswer?.technology).toBe(refAnswer.technology)
          expect(actualAnswer?.status).toBe(refAnswer.status)
          expect(actualAnswer?.comments).toBe(refAnswer.comments)
        }
      }
    }
  },
)
