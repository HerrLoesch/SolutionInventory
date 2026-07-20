<template>
  <v-card flat>
    <v-card-text>
      <v-text-field v-model="model.title" label="Title" density="compact" class="mb-3" />

      <div class="d-flex align-center gap-2 mb-3">
        <v-text-field :model-value="model.id" label="ID" density="compact" readonly hide-details class="flex-grow-1" />
        <v-btn size="small" variant="tonal" @click="onRegenerateId">
          <v-icon size="16" class="mr-1">mdi-refresh</v-icon>
          New ID
        </v-btn>
      </div>

      <v-textarea v-model="model.desc" label="Description" rows="2" density="compact" class="mb-3" />

      <v-checkbox v-model="model.isMetadata" label="Is metadata category" density="compact" hide-details class="mb-3" />

      <v-divider class="my-4"></v-divider>

      <MetadataOptionsForm v-if="model.isMetadata" :category="model" />
      <div v-else>
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-subtitle-2">Entries ({{ entries.length }})</span>
          <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="$emit('add-entry')">Add entry</v-btn>
        </div>
        <v-list v-if="entries.length" density="compact">
          <v-list-item v-for="entry in entries" :key="entry.id" @click="$emit('select-entry', entry.id)">
            <v-list-item-title>{{ entry.aspect }}</v-list-item-title>
          </v-list-item>
        </v-list>
        <v-alert v-else type="info" density="compact" variant="tonal">No entries yet.</v-alert>

        <AppliesToEditor :target="model" :metadata-options="metadataOptions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useConfirm } from '../../composables/useConfirm'
import MetadataOptionsForm from './MetadataOptionsForm.vue'
import AppliesToEditor from './AppliesToEditor.vue'

const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  metadataOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['regenerate-id', 'add-entry', 'select-entry'])

const { confirm } = useConfirm()

// Alias, not a copy: same object as the `category` prop (a live reference
// into the catalog draft in the store). Named differently on purpose so
// direct field edits below don't read as prop mutation to the linter —
// mutating this draft in place is the intended design, mirrored from the
// same pattern in Questionnaire.vue (`currentCategory`).
const model = computed(() => props.category)

const entries = computed(() => (Array.isArray(model.value.entries) ? model.value.entries : []))

async function onRegenerateId() {
  const choice = await confirm({
    title: 'Generate a new ID?',
    message:
      'Anything referencing this category by its current ID (hidden entries, pending navigation, comparisons) may stop matching it. This does not affect already-saved answers.',
    actions: [
      { label: 'Cancel', value: 'cancel', variant: 'text' },
      { label: 'Generate new ID', value: 'confirm', color: 'warning', variant: 'flat' }
    ]
  })
  if (choice === 'confirm') emit('regenerate-id')
}
</script>
