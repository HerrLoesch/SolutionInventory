// Shared "may I leave the currently active tab?" check (§4.5): any UI path
// that can change the active workspace tab — the tab bar (Workspace.vue) and
// the sidebar tree (TreeNav.vue) — must go through this, or a dirty catalog
// draft can be silently abandoned by clicking around it instead of on it.

import { useWorkspaceStore } from '../stores/workspaceStore'
import { useConfirm } from './useConfirm'

export function useWorkspaceTabGuard() {
  const store = useWorkspaceStore()
  const { confirm } = useConfirm()

  async function confirmLeavingDirtyCatalog(catalogId) {
    const choice = await confirm({
      title: 'Unsaved changes',
      message: 'This catalog has unsaved changes. Save them before leaving?',
      actions: [
        { label: 'Cancel', value: 'cancel', variant: 'text' },
        { label: 'Discard', value: 'discard', color: 'error', variant: 'text' },
        { label: 'Save', value: 'save', color: 'primary', variant: 'flat' }
      ]
    })
    if (choice === 'cancel') return false
    if (choice === 'save') {
      const result = store.saveCatalogDraft(catalogId)
      if (!result.ok) return false // validation failed — stay put so the user can fix it
    } else if (choice === 'discard') {
      store.discardCatalogDraft(catalogId)
    }
    return true
  }

  /** Resolves true if it's safe to navigate away from the current tab. */
  async function canLeaveActiveTab() {
    const currentId = store.activeWorkspaceTabId
    if (store.isCatalogTabId(currentId)) {
      const catalogId = store.fromCatalogTabId(currentId)
      if (store.isCatalogDraftDirty(catalogId)) {
        return confirmLeavingDirtyCatalog(catalogId)
      }
    }
    return true
  }

  return { canLeaveActiveTab, confirmLeavingDirtyCatalog }
}
