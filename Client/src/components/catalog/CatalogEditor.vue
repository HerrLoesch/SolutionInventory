<template>
  <div v-if="draft" class="catalog-editor">
    <div class="catalog-editor-header">
      <div class="d-flex align-center gap-2">
        <h3 class="mb-0">{{ draft.name }}</h3>
        <span class="text-medium-emphasis text-body-2">v{{ draft.version }}</span>
        <v-chip v-if="dirty" size="small" color="warning" variant="flat">unsaved</v-chip>
      </div>
      <div class="d-flex align-center gap-2">
        <v-btn icon variant="text" :disabled="!canUndo" title="Undo (Ctrl/Cmd+Z)" @click="undo">
          <v-icon>mdi-undo</v-icon>
        </v-btn>
        <v-btn icon variant="text" :disabled="!canRedo" title="Redo (Ctrl/Cmd+Shift+Z)" @click="redo">
          <v-icon>mdi-redo</v-icon>
        </v-btn>
        <v-btn color="primary" @click="onSave">Save</v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon variant="text" v-bind="menuProps">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click="jsonDialogOpen = true">
              <v-list-item-title>View JSON</v-list-item-title>
            </v-list-item>
            <v-list-item @click="onExport">
              <v-list-item-title>Export</v-list-item-title>
            </v-list-item>
            <v-list-item @click="onValidationReport">
              <v-list-item-title>Validation report</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item :disabled="!dirty" @click="onDiscard">
              <v-list-item-title>Reset all changes</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <v-row class="catalog-editor-body" no-gutters>
      <v-col cols="12" md="4">
        <EditorTree
          :categories="draft.categories"
          :selected-id="selectedEntryId || selectedCategoryId"
          @select="onSelect"
          @add-category="onAddCategory"
          @add-entry="onAddEntry"
          @duplicate="onDuplicate"
          @delete="onDelete"
          @move="onMove"
        />
      </v-col>
      <v-col cols="12" md="8" class="editor-detail-col">
        <CategoryForm
          v-if="selectedCategory && !selectedEntry"
          :category="selectedCategory"
          :metadata-options="metadataOptions"
          @regenerate-id="onRegenerateCategoryId"
          @add-entry="onAddEntry(selectedCategory.id)"
          @select-entry="(entryId) => (selectedEntryId = entryId)"
        />
        <EntryForm
          v-else-if="selectedEntry"
          :entry="selectedEntry"
          :metadata-options="metadataOptions"
          @regenerate-id="onRegenerateEntryId"
        />
        <div v-else class="editor-empty text-medium-emphasis">Select a category or entry to edit.</div>
      </v-col>
    </v-row>

    <ValidationPanel :errors="liveValidation.errors" :warnings="liveValidation.warnings" />

    <v-dialog v-model="jsonDialogOpen" max-width="900">
      <v-card>
        <v-card-title>Catalog JSON</v-card-title>
        <v-card-text>
          <v-sheet class="pa-3" color="grey-lighten-4" style="max-height: 70vh; overflow-y: auto">
            <pre style="font-size: 11px; line-height: 1.4">{{ jsonPreview }}</pre>
          </v-sheet>
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn color="primary" @click="jsonDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="validationDialogOpen" max-width="600">
      <v-card>
        <v-card-title>Validation report</v-card-title>
        <v-card-text>
          <template v-if="lastValidation">
            <div v-if="lastValidation.errors.length" class="mb-3">
              <div class="text-subtitle-2 text-error mb-1">Errors ({{ lastValidation.errors.length }})</div>
              <ul class="mb-0">
                <li v-for="(finding, index) in lastValidation.errors" :key="`e-${index}`">
                  <code>{{ finding.path }}</code> — {{ finding.message }}
                </li>
              </ul>
            </div>
            <div v-if="lastValidation.warnings.length">
              <div class="text-subtitle-2 text-warning mb-1">Warnings ({{ lastValidation.warnings.length }})</div>
              <ul class="mb-0">
                <li v-for="(finding, index) in lastValidation.warnings" :key="`w-${index}`">
                  <code>{{ finding.path }}</code> — {{ finding.message }}
                </li>
              </ul>
            </div>
            <v-alert
              v-if="!lastValidation.errors.length && !lastValidation.warnings.length"
              type="success"
              density="compact"
              variant="tonal"
            >
              No issues found.
            </v-alert>
          </template>
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn color="primary" @click="validationDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { generateSlugId } from '../../stores/workspaceFactories'
import { validateCatalog } from '../../schema/catalogValidation'
import { useConfirm } from '../../composables/useConfirm'
import { useUndoSnackbar } from '../../composables/useUndoSnackbar'
import EditorTree from './EditorTree.vue'
import CategoryForm from './CategoryForm.vue'
import EntryForm from './EntryForm.vue'
import ValidationPanel from './ValidationPanel.vue'

const props = defineProps({
  catalogId: {
    type: String,
    required: true
  }
})

const store = useWorkspaceStore()
const { confirm } = useConfirm()
const { show: showUndo } = useUndoSnackbar()

const draft = computed(() => store.getCatalogDraft(props.catalogId))
const dirty = computed(() => store.isCatalogDraftDirty(props.catalogId))

const selectedCategoryId = ref('')
const selectedEntryId = ref('')

const selectedCategory = computed(
  () => draft.value?.categories.find((category) => category.id === selectedCategoryId.value) || null
)
const selectedEntry = computed(
  () => selectedCategory.value?.entries?.find((entry) => entry.id === selectedEntryId.value) || null
)

const metadataOptions = computed(() => {
  const metaCategory = draft.value?.categories.find((category) => category.isMetadata)
  return metaCategory?.metadataOptions || {}
})

// Recomputed on every draft change — this is what makes the ValidationPanel
// "live" (§4.5) rather than only checked on demand via the menu.
const liveValidation = computed(() => (draft.value ? validateCatalog(draft.value) : { errors: [], warnings: [] }))

const jsonDialogOpen = ref(false)
const validationDialogOpen = ref(false)
const lastValidation = ref(null)

const jsonPreview = computed(() => JSON.stringify(draft.value, null, 2))

// --- Undo/Redo history (§5.5 Phase 5) ---
// Session-only, local to this open editor tab (not persisted, not shared
// with the store's dirty-flag — that one only tracks "differs from last
// save", this tracks "can I step backward/forward through recent edits").
// A JSON-snapshot stack of `draft.categories` rather than a command list:
// every mutation in this file (add/duplicate/delete/move) already ends with
// a consistent categories tree, and EditorTree.vue's drag & drop mutates the
// same tree directly — snapshotting after the fact covers all of them
// uniformly with no per-action bookkeeping.
const HISTORY_DEBOUNCE_MS = 500
const HISTORY_LIMIT = 50

function snapshotCategories() {
  return JSON.parse(JSON.stringify(draft.value.categories))
}

// Seeded synchronously at setup time: each open catalog tab gets its own
// persistent CatalogEditor instance (keyed by tab id in Workspace.vue), so
// `props.catalogId` never changes across this instance's lifetime — no need
// to watch it.
const historyStack = ref(draft.value ? [snapshotCategories()] : [])
const historyIndex = ref(historyStack.value.length ? 0 : -1)
let historyTimer = null

// Comparison-based rather than a "who triggered this" flag: only records a
// new step if the content actually differs from the most recent one. This
// makes it safe to call unconditionally after every draft change, including
// the ones undo()/redo() themselves cause (they land back on a snapshot's
// exact content, so this naturally no-ops instead of needing a re-entrancy
// guard timed against Vue's watch/nextTick flush order).
function pushHistorySnapshotIfChanged() {
  if (!draft.value) return
  const currentJson = JSON.stringify(draft.value.categories)
  const lastJson = historyIndex.value >= 0 ? JSON.stringify(historyStack.value[historyIndex.value]) : undefined
  if (currentJson === lastJson) return
  historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
  historyStack.value.push(JSON.parse(currentJson))
  if (historyStack.value.length > HISTORY_LIMIT) historyStack.value.shift()
  historyIndex.value = historyStack.value.length - 1
}

// Debounced: rapid edits (typing) coalesce into one history step per pause
// in activity, so Undo reverts a meaningful chunk of work rather than one
// keystroke at a time.
watch(
  () => draft.value?.categories,
  () => {
    clearTimeout(historyTimer)
    historyTimer = setTimeout(pushHistorySnapshotIfChanged, HISTORY_DEBOUNCE_MS)
  },
  { deep: true }
)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

// If the jump lands on a tree that no longer has the selected category/entry
// (e.g. undoing past its creation), clear the selection rather than showing
// a blank detail pane bound to a stale id — same defensive pattern as
// onDelete below.
function reconcileSelectionAfterHistoryJump() {
  const category = draft.value.categories.find((c) => c.id === selectedCategoryId.value)
  if (!category) {
    selectedCategoryId.value = ''
    selectedEntryId.value = ''
    return
  }
  if (selectedEntryId.value && !(category.entries || []).some((e) => e.id === selectedEntryId.value)) {
    selectedEntryId.value = ''
  }
}

function undo() {
  if (!canUndo.value) return
  clearTimeout(historyTimer)
  historyIndex.value -= 1
  draft.value.categories = JSON.parse(JSON.stringify(historyStack.value[historyIndex.value]))
  reconcileSelectionAfterHistoryJump()
}

function redo() {
  if (!canRedo.value) return
  clearTimeout(historyTimer)
  historyIndex.value += 1
  draft.value.categories = JSON.parse(JSON.stringify(historyStack.value[historyIndex.value]))
  reconcileSelectionAfterHistoryJump()
}

// --- Keyboard flows (§5.5 Phase 5): Cmd/Ctrl+S saves, Cmd/Ctrl+Z / +Shift+Z
// (or +Y) undo/redo. Guarded to this tab's own catalog being the active
// workspace tab, since Vuetify's v-window keeps every open tab's
// CatalogEditor mounted (just visually hidden) — without this guard, a
// background catalog tab would also react to the shortcut.
function isEditableElement(el) {
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

function onKeydown(event) {
  if (store.activeWorkspaceTabId !== store.toCatalogTabId(props.catalogId)) return
  if (!(event.metaKey || event.ctrlKey)) return

  const key = event.key.toLowerCase()
  if (key === 's') {
    event.preventDefault()
    onSave()
    return
  }
  // Leave the browser's native per-field undo/redo alone while typing in a
  // text field — only take over Z/Shift+Z when focus is elsewhere in the
  // editor (e.g. right after clicking a tree node).
  if (isEditableElement(document.activeElement)) return
  if (key === 'z' && event.shiftKey) {
    event.preventDefault()
    redo()
  } else if (key === 'z') {
    event.preventDefault()
    undo()
  } else if (key === 'y') {
    event.preventDefault()
    redo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(historyTimer)
})

function onSelect({ kind, categoryId, entryId }) {
  selectedCategoryId.value = categoryId
  selectedEntryId.value = kind === 'entry' ? entryId : ''
}

function onAddCategory() {
  const existingIds = draft.value.categories.map((c) => c.id)
  const title = 'New Category'
  const category = { id: generateSlugId(title, existingIds), title, desc: '', isMetadata: false, entries: [] }
  draft.value.categories.push(category)
  selectedCategoryId.value = category.id
  selectedEntryId.value = ''
}

function onAddEntry(categoryId) {
  const category = draft.value.categories.find((c) => c.id === categoryId)
  if (!category) return
  if (!Array.isArray(category.entries)) category.entries = []
  const existingIds = category.entries.map((e) => e.id)
  const aspect = 'New Aspect'
  const entry = { id: generateSlugId(`${category.id}-${aspect}`, existingIds), aspect, examples: [] }
  category.entries.push(entry)
  selectedCategoryId.value = categoryId
  selectedEntryId.value = entry.id
}

function onDuplicate({ kind, categoryId, entryId }) {
  if (kind === 'category') {
    const index = draft.value.categories.findIndex((c) => c.id === categoryId)
    if (index === -1) return
    const existingIds = draft.value.categories.map((c) => c.id)
    const copy = JSON.parse(JSON.stringify(draft.value.categories[index]))
    copy.title = `${copy.title} (Copy)`
    copy.id = generateSlugId(copy.title, existingIds)
    draft.value.categories.splice(index + 1, 0, copy)
    selectedCategoryId.value = copy.id
    selectedEntryId.value = ''
    return
  }
  const category = draft.value.categories.find((c) => c.id === categoryId)
  if (!category || !Array.isArray(category.entries)) return
  const index = category.entries.findIndex((e) => e.id === entryId)
  if (index === -1) return
  const existingIds = category.entries.map((e) => e.id)
  const source = category.entries[index]
  const copy = JSON.parse(JSON.stringify(source))
  copy.id = generateSlugId(`${category.id}-${source.aspect}-copy`, existingIds)
  category.entries.splice(index + 1, 0, copy)
  selectedCategoryId.value = categoryId
  selectedEntryId.value = copy.id
}

function onDelete({ kind, categoryId, entryId }) {
  if (kind === 'category') {
    const index = draft.value.categories.findIndex((c) => c.id === categoryId)
    if (index === -1) return
    const [removed] = draft.value.categories.splice(index, 1)
    if (selectedCategoryId.value === categoryId) {
      selectedCategoryId.value = ''
      selectedEntryId.value = ''
    }
    const entryCount = Array.isArray(removed.entries) ? removed.entries.length : 0
    const entryNote = entryCount > 0 ? ` (contains ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'})` : ''
    showUndo(`Deleted category "${removed.title}"${entryNote}`, () => {
      draft.value.categories.splice(index, 0, removed)
    })
    return
  }
  const category = draft.value.categories.find((c) => c.id === categoryId)
  if (!category || !Array.isArray(category.entries)) return
  const index = category.entries.findIndex((e) => e.id === entryId)
  if (index === -1) return
  const [removed] = category.entries.splice(index, 1)
  if (selectedEntryId.value === entryId) selectedEntryId.value = ''
  showUndo(`Deleted entry "${removed.aspect}"`, () => {
    category.entries.splice(index, 0, removed)
  })
}

function onMove({ kind, categoryId, entryId, direction }) {
  const list =
    kind === 'category' ? draft.value.categories : draft.value.categories.find((c) => c.id === categoryId)?.entries
  if (!Array.isArray(list)) return
  const id = kind === 'category' ? categoryId : entryId
  const index = list.findIndex((item) => item.id === id)
  const target = index + direction
  if (index === -1 || target < 0 || target >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
}

function onRegenerateCategoryId() {
  const category = selectedCategory.value
  if (!category) return
  const existingIds = draft.value.categories.filter((c) => c.id !== category.id).map((c) => c.id)
  category.id = generateSlugId(category.title, existingIds)
  // Follow the rename — selectedCategoryId still holds the old id, which no
  // longer matches anything, so the detail pane would otherwise go blank.
  selectedCategoryId.value = category.id
}

function onRegenerateEntryId() {
  const category = selectedCategory.value
  const entry = selectedEntry.value
  if (!category || !entry) return
  const existingIds = (category.entries || []).filter((e) => e.id !== entry.id).map((e) => e.id)
  entry.id = generateSlugId(`${category.id}-${entry.aspect}`, existingIds)
  selectedEntryId.value = entry.id
}

function onSave() {
  const result = store.saveCatalogDraft(props.catalogId)
  if (!result.ok) {
    lastValidation.value = result
    validationDialogOpen.value = true
    return
  }
  showUndo('Catalog saved', null, 3000)
  if (result.warnings.length) {
    lastValidation.value = result
  }
}

async function onDiscard() {
  if (!dirty.value) return
  const choice = await confirm({
    title: 'Discard changes?',
    message: 'All unsaved edits to this catalog will be lost.',
    actions: [
      { label: 'Keep editing', value: 'cancel', variant: 'text' },
      { label: 'Discard', value: 'confirm', color: 'error', variant: 'flat' }
    ]
  })
  if (choice !== 'confirm') return
  store.discardCatalogDraft(props.catalogId)
  selectedCategoryId.value = ''
  selectedEntryId.value = ''
}

function onExport() {
  store.exportCatalog(props.catalogId)
}

function onValidationReport() {
  lastValidation.value = validateCatalog(draft.value)
  validationDialogOpen.value = true
}

defineExpose({
  draft,
  dirty,
  metadataOptions,
  liveValidation,
  selectedCategoryId,
  selectedEntryId,
  selectedCategory,
  selectedEntry,
  lastValidation,
  validationDialogOpen,
  jsonDialogOpen,
  onSelect,
  onAddCategory,
  onAddEntry,
  onDuplicate,
  onDelete,
  onMove,
  onRegenerateCategoryId,
  onRegenerateEntryId,
  onSave,
  onDiscard,
  onExport,
  onValidationReport,
  historyStack,
  historyIndex,
  canUndo,
  canRedo,
  undo,
  redo,
  pushHistorySnapshotIfChanged,
  onKeydown
})
</script>

<style scoped>
.catalog-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eceff1;
}

.catalog-editor-body {
  min-height: 400px;
}

.editor-detail-col {
  padding-left: 16px;
}

.editor-empty {
  padding: 48px 16px;
  text-align: center;
}
</style>
