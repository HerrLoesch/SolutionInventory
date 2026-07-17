// Snackbar with an optional Undo action, replacing window.alert() and ad-hoc
// confirm-before-delete flows (§4.5): destructive actions run immediately,
// this offers a short window to reverse them instead of asking first.
// Singleton state, same pattern as useConfirm.js.

import { reactive } from 'vue'

const state = reactive({
  isOpen: false,
  message: '',
  undoFn: null
})

let timeoutId = null

export function useUndoSnackbar() {
  /**
   * @param {string} message
   * @param {(() => void) | null} undoFn omit for a plain toast (e.g. "Catalog saved")
   * @param {number} duration ms before auto-dismiss
   */
  function show(message, undoFn = null, duration = 5000) {
    if (timeoutId) clearTimeout(timeoutId)
    state.message = message
    state.undoFn = undoFn
    state.isOpen = true
    timeoutId = setTimeout(() => {
      state.isOpen = false
      state.undoFn = null
    }, duration)
  }

  function undo() {
    if (timeoutId) clearTimeout(timeoutId)
    state.isOpen = false
    const fn = state.undoFn
    state.undoFn = null
    fn?.()
  }

  function dismiss() {
    if (timeoutId) clearTimeout(timeoutId)
    state.isOpen = false
    state.undoFn = null
  }

  return { state, show, undo, dismiss }
}
