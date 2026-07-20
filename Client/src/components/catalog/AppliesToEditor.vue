<template>
  <div class="applies-to-editor">
    <button type="button" class="applies-to-toggle" @click="expanded = !expanded">
      <v-icon size="16">{{ expanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
      <span class="text-subtitle-2">Visibility (appliesTo)</span>
      <span class="text-caption text-medium-emphasis ml-2">
        {{ conditions.length }} condition{{ conditions.length === 1 ? '' : 's' }}
      </span>
    </button>

    <div v-if="expanded" class="applies-to-body">
      <v-alert v-if="!availableFields.length" type="info" density="compact" variant="tonal">
        No metadata fields with options are defined yet — add options in the metadata category first.
      </v-alert>
      <template v-else>
        <div v-for="condition in conditions" :key="condition.field" class="condition-row">
          <v-select
            :model-value="condition.field"
            :items="fieldChoices(condition.field)"
            item-title="title"
            item-value="value"
            label="Field"
            density="compact"
            hide-details
            class="condition-field"
            @update:model-value="(value) => setConditionField(condition.field, value)"
          />
          <v-select
            :model-value="condition.values"
            :items="optionsFor(condition.field)"
            label="Allowed values"
            density="compact"
            hide-details
            multiple
            chips
            closable-chips
            class="condition-values"
            @update:model-value="(value) => setConditionValues(condition.field, value)"
          />
          <v-btn icon size="x-small" variant="text" color="error" @click="removeCondition(condition.field)">
            <v-icon size="16">mdi-delete</v-icon>
          </v-btn>
        </div>

        <v-btn size="small" variant="text" prepend-icon="mdi-plus" :disabled="!hasUnusedField" @click="addCondition">
          Add condition
        </v-btn>

        <div v-if="conditions.length" class="text-caption text-medium-emphasis mt-2">Preview: {{ previewText }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // The category or entry whose `appliesTo` is being edited — mutated in
  // place (live reference), same pattern as CategoryForm.vue/EntryForm.vue.
  target: {
    type: Object,
    required: true
  },
  // The metadata category's `metadataOptions`: { fieldName: [{label, description}] }.
  metadataOptions: {
    type: Object,
    default: () => ({})
  }
})

const model = computed(() => props.target)
const expanded = ref(false)

function prettifyField(field) {
  return String(field || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

const availableFields = computed(() => Object.keys(props.metadataOptions || {}))

const conditions = computed(() => {
  const appliesTo = model.value.appliesTo
  if (!appliesTo || typeof appliesTo !== 'object') return []
  return Object.entries(appliesTo).map(([field, value]) => ({
    field,
    values: Array.isArray(value) ? value : [value]
  }))
})

const hasUnusedField = computed(() => {
  const used = new Set(conditions.value.map((c) => c.field))
  return availableFields.value.some((field) => !used.has(field))
})

function fieldChoices(currentField) {
  const used = new Set(conditions.value.map((c) => c.field))
  return availableFields.value
    .filter((field) => field === currentField || !used.has(field))
    .map((field) => ({ title: prettifyField(field), value: field }))
}

function optionsFor(field) {
  return (props.metadataOptions[field] || []).map((option) => (typeof option === 'string' ? option : option.label))
}

function addCondition() {
  const used = new Set(conditions.value.map((c) => c.field))
  const nextField = availableFields.value.find((field) => !used.has(field))
  if (!nextField) return
  if (!model.value.appliesTo) model.value.appliesTo = {}
  model.value.appliesTo[nextField] = []
}

function removeCondition(field) {
  delete model.value.appliesTo[field]
  if (Object.keys(model.value.appliesTo).length === 0) {
    delete model.value.appliesTo
  }
}

function setConditionField(oldField, newField) {
  if (oldField === newField) return
  const values = model.value.appliesTo[oldField]
  delete model.value.appliesTo[oldField]
  model.value.appliesTo[newField] = values
}

function setConditionValues(field, values) {
  model.value.appliesTo[field] = values
}

const previewText = computed(() => {
  return (
    'Visible when ' +
    conditions.value
      .filter((c) => c.values.length)
      .map((c) => `${prettifyField(c.field)} = ${c.values.join(' or ')}`)
      .join(' and ')
  )
})

defineExpose({
  expanded,
  conditions,
  availableFields,
  hasUnusedField,
  addCondition,
  removeCondition,
  setConditionField,
  setConditionValues,
  previewText
})
</script>

<style scoped>
.applies-to-editor {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eceff1;
}

.applies-to-toggle {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 100%;
  text-align: left;
}

.applies-to-body {
  margin-top: 8px;
}

.condition-row {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
</style>
