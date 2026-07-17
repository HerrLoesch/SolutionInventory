<template>
  <div class="validation-panel" :class="statusClass">
    <button type="button" class="validation-summary" @click="expanded = !expanded">
      <v-icon size="16">{{ icon }}</v-icon>
      <span>{{ summaryText }}</span>
      <v-icon size="16" class="ml-auto">{{ expanded ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
    </button>

    <div v-if="expanded && (errors.length || warnings.length)" class="validation-details">
      <div v-for="(finding, index) in errors" :key="`e-${index}`" class="validation-item validation-error">
        <v-icon size="14">mdi-alert-circle</v-icon>
        <code>{{ finding.path }}</code>
        <span>{{ finding.message }}</span>
      </div>
      <div v-for="(finding, index) in warnings" :key="`w-${index}`" class="validation-item validation-warning">
        <v-icon size="14">mdi-alert</v-icon>
        <code>{{ finding.path }}</code>
        <span>{{ finding.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  errors: {
    type: Array,
    default: () => []
  },
  warnings: {
    type: Array,
    default: () => []
  }
})

const expanded = ref(false)

const statusClass = computed(() => {
  if (props.errors.length) return 'is-error'
  if (props.warnings.length) return 'is-warning'
  return 'is-ok'
})

const icon = computed(() => {
  if (props.errors.length) return 'mdi-alert-circle'
  if (props.warnings.length) return 'mdi-alert'
  return 'mdi-check-circle'
})

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

const summaryText = computed(() => {
  const parts = []
  if (props.errors.length) parts.push(plural(props.errors.length, 'error'))
  if (props.warnings.length) parts.push(plural(props.warnings.length, 'warning'))
  return parts.length ? `Validation: ${parts.join(', ')}` : 'Validation: no issues'
})
</script>

<style scoped>
.validation-panel {
  margin-top: 12px;
  border-top: 1px solid #eceff1;
  font-size: 13px;
}

.validation-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 4px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.is-error .validation-summary {
  color: rgb(var(--v-theme-error));
}

.is-warning .validation-summary {
  color: rgb(var(--v-theme-warning));
}

.is-ok .validation-summary {
  color: rgb(var(--v-theme-success));
}

.validation-details {
  padding: 4px 4px 8px 28px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.validation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(0, 0, 0, 0.7);
}

.validation-error :deep(.v-icon) {
  color: rgb(var(--v-theme-error));
}

.validation-warning :deep(.v-icon) {
  color: rgb(var(--v-theme-warning));
}
</style>
