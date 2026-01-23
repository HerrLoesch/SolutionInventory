<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>
      <v-spacer />
      <v-btn icon @click="exportData">
        <v-icon>mdi-file-excel</v-icon>
        <v-tooltip activator="parent" location="bottom">Excel exportieren</v-tooltip>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container class="pa-4">
        <Questionnaire ref="questionnaireRef" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { ref } from 'vue'
import Questionnaire from './components/Questionnaire.vue'

export default {
  components: { Questionnaire },
  setup() {
    const questionnaireRef = ref(null)

    function exportData() {
      if (questionnaireRef.value) {
        questionnaireRef.value.exportXLSX()
      }
    }

    return { questionnaireRef, exportData }
  }
}
</script>

<style>
/* small global styles */
body { font-family: Roboto, Arial, sans-serif; }
</style>
