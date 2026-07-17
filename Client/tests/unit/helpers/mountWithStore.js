import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

/**
 * Creates a fresh Pinia instance and makes it the active one, so that a
 * `useWorkspaceStore()` call made *before* mounting a component (e.g. to seed
 * data) attaches to the same instance the component will use once mounted.
 */
export function createActivePinia () {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Mounts a component with a Pinia instance active.
 * Vuetify is intentionally NOT installed: these components are tested for
 * their business logic (exposed via `wrapper.vm`), not their rendered
 * markup, so unresolved `<v-*>` tags are harmless and just render as plain
 * (unstyled) custom elements.
 *
 * Pass `options.pinia` to reuse a store instance that was already seeded via
 * `createActivePinia()` + `useWorkspaceStore()` before mounting.
 */
export function mountWithStore (Component, options = {}) {
  const pinia = options.pinia || createActivePinia()
  setActivePinia(pinia)
  const wrapper = mount(Component, {
    global: {
      plugins: [pinia],
      ...options.global
    },
    ...options
  })
  return { wrapper, pinia }
}
