<template>
  <v-snackbar :model-value="state.isOpen" :timeout="-1" color="grey-darken-3" @update:model-value="onVisibilityChange">
    {{ state.message }}
    <template #actions>
      <v-btn v-if="state.undoFn" variant="text" color="primary" @click="undo">Undo</v-btn>
      <v-btn variant="text" icon="mdi-close" size="small" @click="dismiss"></v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { useUndoSnackbar } from '../../composables/useUndoSnackbar'

const { state, undo, dismiss } = useUndoSnackbar()

function onVisibilityChange(value) {
  if (!value) dismiss()
}
</script>
