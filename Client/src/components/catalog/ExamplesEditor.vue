<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-2">
      <span class="text-subtitle-2">Examples</span>
      <div>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addExample('practice')">
          Add practice
        </v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addExample('tool')">Add tool</v-btn>
      </div>
    </div>

    <div v-if="items.length" class="example-list">
      <div v-for="(example, index) in items" :key="index" class="example-row">
        <div class="example-move">
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
        <v-text-field v-model="example.description" label="Description" density="compact" hide-details />
        <v-btn icon size="x-small" variant="text" color="error" @click="removeExample(index)">
          <v-icon size="16">mdi-delete</v-icon>
        </v-btn>
      </div>
    </div>
    <v-alert v-else type="info" density="compact" variant="tonal">No examples yet.</v-alert>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

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

defineExpose({
  items,
  typeOptions,
  addExample,
  removeExample,
  move
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
