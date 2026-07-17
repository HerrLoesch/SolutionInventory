import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import CatalogEditor from '../../src/components/catalog/CatalogEditor.vue'
import { createActivePinia, mountWithStore } from './helpers/mountWithStore'

// Vuetify isn't installed in these tests (see helpers/mountWithStore.js), so
// Vue logs "Failed to resolve component: v-xxx" warnings for every template
// tag. That's expected noise here since we only assert on exposed vm logic,
// not on rendered Vuetify markup.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

async function flush(wrapper) {
  await nextTick()
  await wrapper.vm.$nextTick()
}

// Seeds a store with an open catalog draft and mounts the editor against
// that same Pinia instance — see helpers/mountWithStore.js's docstring for
// why the store must be created/seeded before mounting, not after.
function setupEditor(name = 'Backend Assessment') {
  const pinia = createActivePinia()
  const store = useWorkspaceStore()
  const catalogId = store.addCatalog(name)
  store.openCatalogEditor(catalogId)
  const { wrapper } = mountWithStore(CatalogEditor, { pinia, props: { catalogId } })
  return { store, catalogId, wrapper }
}

describe('CatalogEditor — structure editing', () => {
  it('adding a category selects it and adds it to the draft', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    const before = wrapper.vm.draft.categories.length

    wrapper.vm.onAddCategory()
    await flush(wrapper)

    expect(wrapper.vm.draft.categories).toHaveLength(before + 1)
    expect(wrapper.vm.selectedCategory.title).toBe('New Category')
  })

  it('adding an entry to a category selects it', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.onAddCategory()
    const categoryId = wrapper.vm.selectedCategory.id

    wrapper.vm.onAddEntry(categoryId)
    await flush(wrapper)

    expect(wrapper.vm.selectedCategory.entries).toHaveLength(1)
    expect(wrapper.vm.selectedEntry.aspect).toBe('New Aspect')
  })

  it('duplicating a category inserts an independent copy right after the original', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.onAddCategory()
    const originalId = wrapper.vm.selectedCategory.id

    wrapper.vm.onDuplicate({ kind: 'category', categoryId: originalId })
    await flush(wrapper)

    const categories = wrapper.vm.draft.categories
    const originalIndex = categories.findIndex((c) => c.id === originalId)
    const copy = categories[originalIndex + 1]
    expect(copy.title).toBe('New Category (Copy)')
    expect(copy.id).not.toBe(originalId)

    // Independent copy — mutating one must not affect the other.
    copy.title = 'Mutated'
    expect(categories[originalIndex].title).toBe('New Category')
  })

  it('deleting a category removes it and offers an undo that restores it at the same position', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.onAddCategory()
    const categoryId = wrapper.vm.selectedCategory.id
    const countBefore = wrapper.vm.draft.categories.length

    wrapper.vm.onDelete({ kind: 'category', categoryId })
    await flush(wrapper)

    expect(wrapper.vm.draft.categories).toHaveLength(countBefore - 1)
    expect(wrapper.vm.draft.categories.some((c) => c.id === categoryId)).toBe(false)

    const { useUndoSnackbar } = await import('../../src/composables/useUndoSnackbar')
    const { state, undo } = useUndoSnackbar()
    expect(state.isOpen).toBe(true)
    undo()
    await flush(wrapper)

    expect(wrapper.vm.draft.categories).toHaveLength(countBefore)
    expect(wrapper.vm.draft.categories.some((c) => c.id === categoryId)).toBe(true)
  })

  it('moving a category up respects the top of the list (no-op past the boundary)', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.onAddCategory() // second category, after the metadata category
    const categoryId = wrapper.vm.selectedCategory.id

    wrapper.vm.onMove({ kind: 'category', categoryId, direction: -1 })
    await flush(wrapper)
    expect(wrapper.vm.draft.categories[0].id).toBe(categoryId)

    const countBefore = wrapper.vm.draft.categories.length
    wrapper.vm.onMove({ kind: 'category', categoryId, direction: -1 })
    await flush(wrapper)
    expect(wrapper.vm.draft.categories).toHaveLength(countBefore)
    expect(wrapper.vm.draft.categories[0].id).toBe(categoryId)
  })

  it('regenerating a category id changes the id but not other fields', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.onAddCategory()
    wrapper.vm.selectedCategory.title = 'Renamed Category'
    const oldId = wrapper.vm.selectedCategory.id

    wrapper.vm.onRegenerateCategoryId()
    await flush(wrapper)

    expect(wrapper.vm.selectedCategory.id).not.toBe(oldId)
    expect(wrapper.vm.selectedCategory.id).toBe('renamed-category')
    expect(wrapper.vm.selectedCategory.title).toBe('Renamed Category')
  })
})

describe('CatalogEditor — save / discard', () => {
  it('save() blocks on validation errors and leaves the saved catalog untouched', async () => {
    const { store, catalogId, wrapper } = setupEditor()
    await flush(wrapper)
    const metaId = wrapper.vm.draft.categories[0].id
    wrapper.vm.draft.categories.push({ id: metaId, title: 'Duplicate id', entries: [] })

    wrapper.vm.onSave()
    await flush(wrapper)

    expect(wrapper.vm.validationDialogOpen).toBe(true)
    expect(wrapper.vm.lastValidation.errors.length).toBeGreaterThan(0)
    expect(store.getCatalogById(catalogId).categories).toHaveLength(1)
  })

  it('save() persists a valid draft and clears the dirty flag', async () => {
    const { store, catalogId, wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.draft.name = 'Renamed Catalog'
    await flush(wrapper)
    expect(wrapper.vm.dirty).toBe(true)

    wrapper.vm.onSave()
    await flush(wrapper)

    expect(wrapper.vm.dirty).toBe(false)
    expect(store.getCatalogById(catalogId).name).toBe('Renamed Catalog')
  })

  it('discard() resets the draft back to the last saved catalog after confirmation', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.draft.name = 'Renamed Catalog'
    await flush(wrapper)

    const { useConfirm } = await import('../../src/composables/useConfirm')
    const { state, respond } = useConfirm()
    const discardPromise = wrapper.vm.onDiscard()
    expect(state.isOpen).toBe(true)
    respond('confirm')
    await discardPromise
    await flush(wrapper)

    expect(wrapper.vm.draft.name).toBe('Backend Assessment')
    expect(wrapper.vm.dirty).toBe(false)
  })

  it('discard() leaves the draft untouched when the user cancels', async () => {
    const { wrapper } = setupEditor()
    await flush(wrapper)
    wrapper.vm.draft.name = 'Renamed Catalog'
    await flush(wrapper)

    const { useConfirm } = await import('../../src/composables/useConfirm')
    const { respond } = useConfirm()
    const discardPromise = wrapper.vm.onDiscard()
    respond('cancel')
    await discardPromise
    await flush(wrapper)

    expect(wrapper.vm.draft.name).toBe('Renamed Catalog')
    expect(wrapper.vm.dirty).toBe(true)
  })
})
