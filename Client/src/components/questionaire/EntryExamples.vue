<template>
  <div v-if="items.length" class="text--secondary text-sm mt-1">
    <strong>Examples: </strong>
    <span v-for="(example, eIdx) in items" :key="`ex-${eIdx}`">
      <v-tooltip v-if="example.description" :text="example.description" location="top">
        <template #activator="{ props }">
          <span v-bind="props" class="example-item">{{ example.label }}</span>
        </template>
      </v-tooltip>
      <span v-else class="example-item">{{ example.label }}</span>
      <span v-if="eIdx < items.length - 1">, </span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { expandExamplesToTyped } from '../../services/catalogService'

const props = defineProps({
  examples: {
    type: [Array, String],
    default: null
  },
  entryId: {
    type: String,
    required: true
  }
})

// Memoized: computed once per entry, not 3 times
const items = computed(() => {
  if (!props.examples) return []

  if (Array.isArray(props.examples)) {
    // expandExamplesToTyped tolerantly reads both the typed
    // { type, label, description } shape and legacy { label, tools[] }
    // examples, flattening each into its own displayed item — see
    // expandExamplesToTyped in catalogService.js.
    return expandExamplesToTyped(props.examples)
      .map((example) => {
        const label = String(example.label || '').trim()
        return label ? { label, description: example.description || '' } : null
      })
      .filter(Boolean)
  }

  if (typeof props.examples === 'string') {
    return props.examples
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ label, description: '' }))
  }

  return []
})
</script>

<style scoped>
.example-item {
  cursor: help;
  text-decoration: underline dotted;
}
</style>
