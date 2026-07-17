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

      <v-divider class="my-4"></v-divider>

      <div class="d-flex justify-space-between align-center mb-2">
        <span class="text-subtitle-2">Examples</span>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addExample">Add example</v-btn>
      </div>

      <div v-if="examples.length" class="example-list">
        <div v-for="(example, index) in examples" :key="index" class="example-row">
          <v-text-field v-model="example.label" label="Label" density="compact" hide-details />
          <v-text-field v-model="example.description" label="Description" density="compact" hide-details />
          <v-btn icon size="x-small" variant="text" color="error" @click="removeExample(index)">
            <v-icon size="16">mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>
      <v-alert v-else type="info" density="compact" variant="tonal">No examples yet.</v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useConfirm } from '../../composables/useConfirm'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['regenerate-id'])

const { confirm } = useConfirm()

// Alias, not a copy — see the identical comment in CategoryForm.vue.
const model = computed(() => props.entry)

const examples = computed(() => (Array.isArray(model.value.examples) ? model.value.examples : []))

function addExample() {
  if (!Array.isArray(model.value.examples)) model.value.examples = []
  model.value.examples.push({ label: '', description: '' })
}

function removeExample(index) {
  examples.value.splice(index, 1)
}

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

<style scoped>
.example-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}
</style>
