<template>
  <v-card flat>
    <v-card-text>
      <v-text-field v-model="model.aspect" label="Aspect" density="compact" class="mb-3" />

      <div class="d-flex align-center gap-2 mb-3">
        <v-text-field :model-value="model.id" label="ID" density="compact" readonly hide-details class="flex-grow-1" />
        <v-btn size="small" variant="tonal" @click="onRegenerateId">
          <v-icon size="16" class="mr-1">mdi-refresh</v-icon>
          New ID
        </v-btn>
      </div>

      <v-textarea v-model="model.description" label="Description" rows="2" density="compact" class="mb-3" />

      <v-divider class="my-4"></v-divider>

      <ExamplesEditor :entry="model" />

      <AppliesToEditor :target="model" :metadata-options="metadataOptions" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useConfirm } from '../../composables/useConfirm'
import ExamplesEditor from './ExamplesEditor.vue'
import AppliesToEditor from './AppliesToEditor.vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  },
  metadataOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['regenerate-id'])

const { confirm } = useConfirm()

// Alias, not a copy — see the identical comment in CategoryForm.vue.
const model = computed(() => props.entry)

async function onRegenerateId() {
  const choice = await confirm({
    title: 'Generate a new ID?',
    message:
      'Anything referencing this entry by its current ID (hidden entries, pending navigation, comparisons) may stop matching it. This does not affect already-saved answers.',
    actions: [
      { label: 'Cancel', value: 'cancel', variant: 'text' },
      { label: 'Generate new ID', value: 'confirm', color: 'warning', variant: 'flat' }
    ]
  })
  if (choice === 'confirm') emit('regenerate-id')
}
</script>
