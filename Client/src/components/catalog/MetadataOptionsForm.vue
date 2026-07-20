<template>
  <div>
    <v-alert type="info" density="compact" variant="tonal" class="mb-3">
      These option lists drive the dropdowns in the questionnaire's metadata form (Execution Type, Architectural Role)
      and the values available in <code>appliesTo</code>
      conditions. Adding a brand-new field here has no effect yet — the fill-in form only reads these two.
    </v-alert>

    <div v-for="field in fields" :key="field" class="field-block">
      <div class="d-flex justify-space-between align-center mb-2">
        <span class="text-subtitle-2">{{ prettify(field) }}</span>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addOption(field)">Add option</v-btn>
      </div>

      <div v-if="optionsFor(field).length" class="option-list">
        <div v-for="(option, index) in optionsFor(field)" :key="index" class="option-row">
          <v-text-field v-model="option.label" label="Label" density="compact" hide-details />
          <v-text-field v-model="option.description" label="Description" density="compact" hide-details />
          <v-btn icon size="x-small" variant="text" color="error" @click="removeOption(field, index)">
            <v-icon size="16">mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>
      <v-alert v-else type="info" density="compact" variant="tonal">No options yet.</v-alert>

      <v-divider class="my-4"></v-divider>
    </div>

    <v-alert v-if="!fields.length" type="info" density="compact" variant="tonal">
      This catalog's metadata category has no <code>metadataOptions</code> yet.
    </v-alert>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // The metadata category — mutated in place (live reference).
  category: {
    type: Object,
    required: true
  }
})

const model = computed(() => props.category)

const fields = computed(() => Object.keys(model.value.metadataOptions || {}))

function prettify(field) {
  return String(field || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function optionsFor(field) {
  if (!model.value.metadataOptions) model.value.metadataOptions = {}
  if (!Array.isArray(model.value.metadataOptions[field])) model.value.metadataOptions[field] = []
  return model.value.metadataOptions[field]
}

function addOption(field) {
  optionsFor(field).push({ label: '', description: '' })
}

function removeOption(field, index) {
  optionsFor(field).splice(index, 1)
}

defineExpose({ fields, optionsFor, addOption, removeOption })
</script>

<style scoped>
.field-block:last-child .my-4 {
  display: none;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}
</style>
