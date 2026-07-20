<template>
  <div ref="rootEl">
    <div class="d-flex justify-space-between align-center mb-2">
      <span class="text-subtitle-2">Examples</span>
      <div>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addExample('practice')">
          Add practice
        </v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addExample('tool')">Add tool</v-btn>
      </div>
    </div>

    <draggable
      v-if="items.length"
      :list="items"
      :item-key="keyFor"
      tag="div"
      class="example-list"
      handle=".drag-handle"
    >
      <template #item="{ element: example, index }">
        <div class="example-row">
          <div class="example-move">
            <v-icon size="16" class="drag-handle">mdi-drag-vertical</v-icon>
            <v-btn icon size="x-small" variant="text" :disabled="index === 0" @click="move(index, -1)">
              <v-icon size="16">mdi-chevron-up</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" :disabled="index === items.length - 1" @click="move(index, 1)">
              <v-icon size="16">mdi-chevron-down</v-icon>
            </v-btn>
          </div>
          <v-select
            v-model="example.type"
            :items="typeOptions"
            item-title="title"
            item-value="value"
            label="Type"
            density="compact"
            hide-details
            class="example-type"
          />
          <v-text-field v-model="example.label" label="Label" density="compact" hide-details />
          <v-text-field
            v-model="example.description"
            label="Description"
            density="compact"
            hide-details
            @keydown.enter.prevent="onDescriptionEnter(index)"
          />
          <v-btn icon size="x-small" variant="text" color="error" @click="removeExample(index)">
            <v-icon size="16">mdi-delete</v-icon>
          </v-btn>
        </div>
      </template>
    </draggable>
    <v-alert v-else type="info" density="compact" variant="tonal">No examples yet.</v-alert>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const rootEl = ref(null)

// Same live-reference alias pattern as CategoryForm.vue/EntryForm.vue — this
// mutates the entry's `examples` array in place, it is not a local copy.
const model = computed(() => props.entry)

// By the time this component mounts inside the Catalog Editor, `examples`
// has already been normalized to the typed shape (workspaceStore.js
// openCatalogEditor, via catalogService.js migrateCategoriesExamplesToTyped)
// — every item here is { type: 'practice' | 'tool', label, description }.
const items = computed(() => (Array.isArray(model.value.examples) ? model.value.examples : []))

const typeOptions = [
  { title: 'Practice', value: 'practice' },
  { title: 'Tool', value: 'tool' }
]

// Stable per-object key for <draggable>'s item-key — example objects have no
// natural id, and keying by field content would remount (and drop focus of)
// a row's inputs on every keystroke. Object identity is stable across edits
// (fields are mutated in place) and only changes on add/remove/reorder.
const exampleKeys = new WeakMap()
let nextKeySeq = 0
function keyFor(example) {
  if (!exampleKeys.has(example)) exampleKeys.set(example, `ex-${nextKeySeq++}`)
  return exampleKeys.get(example)
}

function addExample(type) {
  if (!Array.isArray(model.value.examples)) model.value.examples = []
  model.value.examples.push({ type, label: '', description: '' })
}

function removeExample(index) {
  items.value.splice(index, 1)
}

function move(index, direction) {
  const target = index + direction
  if (target < 0 || target >= items.value.length) return
  const [item] = items.value.splice(index, 1)
  items.value.splice(target, 0, item)
}

// Enter in the last row's Description field appends a new row of the same
// type and focuses its Label field — a fast "type, Enter, type, Enter…"
// authoring flow (docs/spec-fragenkataloge.md §5.5 Phase 5, Tastatur-Flows).
function onDescriptionEnter(index) {
  if (index !== items.value.length - 1) return
  addExample(items.value[index]?.type || 'practice')
  nextTick(() => {
    const rows = rootEl.value?.querySelectorAll('.example-row')
    const lastRow = rows?.[rows.length - 1]
    lastRow?.querySelector('input')?.focus()
  })
}

defineExpose({
  items,
  typeOptions,
  addExample,
  removeExample,
  move,
  keyFor,
  onDescriptionEnter
})
</script>

<style scoped>
.example-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.example-row {
  display: grid;
  grid-template-columns: auto 130px 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #eceff1;
}

.example-row:last-child {
  border-bottom: none;
}

.example-move {
  display: flex;
  flex-direction: column;
}
</style>
