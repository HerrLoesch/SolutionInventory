<template>
  <div v-if="items.length" class="text--secondary text-sm mt-1">
    <strong>Examples: </strong>
    <span v-for="(example, eIdx) in items" :key="`ex-${eIdx}`">
      <v-tooltip v-if="example.description" :text="example.description" location="top">
        <template v-slot:activator="{ props }">
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
    return props.examples
      .map((example) => {
        if (typeof example === 'string') {
          const label = example.trim()
          return label ? { label, description: '' } : null
        }
        if (example && typeof example === 'object') {
          const label = String(example.label || '').trim()
          if (!label) return null
          
          let description = example.description || ''
          
          // Append tools in parentheses if tools array exists and has items
          if (Array.isArray(example.tools) && example.tools.length > 0) {
            const toolsText = example.tools.join(', ')
            description = description.trim()
            // Remove trailing period if present before adding tools
            if (description.endsWith('.')) {
              description = description.slice(0, -1)
            }
            description = `${description} (${toolsText}).`
          }
          
          return { label, description }
        }
        return null
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
