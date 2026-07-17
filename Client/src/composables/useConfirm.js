// Promise-based confirm dialog, replacing window.confirm() (§4.5, §5.1).
// Singleton state: every call to useConfirm() shares the same reactive
// object, so a single <ConfirmDialog /> mounted once (App.vue) can serve
// confirm() calls from anywhere in the app.

import { reactive } from 'vue'

const state = reactive({
  isOpen: false,
  title: '',
  message: '',
  actions: [],
  resolve: null
})

const DEFAULT_ACTIONS = [
  { label: 'Cancel', value: 'cancel', variant: 'text' },
  { label: 'OK', value: 'ok', color: 'primary', variant: 'flat' }
]

export function useConfirm() {
  /**
   * @param {{ title: string, message?: string, actions?: Array<{label: string, value: string, color?: string, variant?: string}> }} options
   * @returns {Promise<string>} resolves with the chosen action's `value`
   */
  function confirm({ title, message = '', actions = DEFAULT_ACTIONS } = {}) {
    return new Promise((resolve) => {
      state.title = title
      state.message = message
      state.actions = actions
      state.resolve = resolve
      state.isOpen = true
    })
  }

  function respond(value) {
    state.isOpen = false
    const resolve = state.resolve
    state.resolve = null
    resolve?.(value)
  }

  return { state, confirm, respond }
}
