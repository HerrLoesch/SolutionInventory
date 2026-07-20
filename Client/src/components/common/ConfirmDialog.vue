<template>
  <v-dialog :model-value="state.isOpen" max-width="440" persistent @update:model-value="onBackdrop">
    <v-card>
      <v-card-title>{{ state.title }}</v-card-title>
      <v-card-text v-if="state.message">{{ state.message }}</v-card-text>
      <v-card-actions class="gap-3">
        <v-spacer />
        <v-btn
          v-for="action in state.actions"
          :key="action.value"
          :color="action.color"
          :variant="action.variant || 'text'"
          @click="respond(action.value)"
        >
          {{ action.label }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useConfirm } from '../../composables/useConfirm'

const { state, respond } = useConfirm()

function onBackdrop(value) {
  // Vuetify still emits update:model-value on ESC/backdrop even though the
  // dialog is `persistent`; treat that the same as the dialog's own Cancel
  // action so callers always get a resolved promise.
  if (!value) respond('cancel')
}
</script>
