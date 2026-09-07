// Storage I/O for the workspace: localStorage (web) and the Electron-managed
// data file. Deliberately thin and side-effect-scoped so the store can decide
// what to do with success/failure (seed, show workspaceLoadError, etc.) —
// see the "B1 fix" block in tests/unit/storageCompat.spec.js for why that
// decision must not default to silently overwriting unreadable data.

export function buildSnapshot({
  version,
  appVersion,
  workspace,
  activeQuestionnaireId,
  openQuestionnaireIds,
  activeWorkspaceTabId,
  openProjectSummaryIds,
  questionnaireHiddenEntries
}) {
  return {
    version,
    // The app release (package.json version) that wrote this file — lets you
    // look at a stored workspace and know which program version was leading
    // for its data model, independent of the storage-format `version` above.
    // Absent on files written before this field existed (app <= 1.11.0).
    appVersion,
    timestamp: new Date().toISOString(),
    workspace,
    activeQuestionnaireId,
    openQuestionnaireIds,
    activeWorkspaceTabId,
    openProjectSummaryIds,
    questionnaireHiddenEntries
  }
}

/**
 * @returns {{ present: false } | { present: true, data: object } | { present: true, corrupt: true, error: Error }}
 */
export function readFromLocalStorage(storageKey) {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return { present: false }
  try {
    return { present: true, data: JSON.parse(raw) }
  } catch (error) {
    return { present: true, corrupt: true, error }
  }
}

export function writeToLocalStorage(storageKey, snapshot) {
  localStorage.setItem(storageKey, JSON.stringify(snapshot))
}

/**
 * @returns {Promise<{success: boolean, notFound?: boolean, data?: object, error?: string}>}
 */
export function readFromElectronFile(electronAPI) {
  return electronAPI.readDataFile()
}

export function writeToElectronFile(electronAPI, snapshot) {
  return electronAPI.writeDataFile(JSON.stringify(snapshot, null, 2))
}

export function writeToElectronFileAt(electronAPI, dirPath, snapshot) {
  return electronAPI.writeDataFileTo(dirPath, JSON.stringify(snapshot, null, 2))
}
