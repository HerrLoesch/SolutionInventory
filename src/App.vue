<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>
      <v-spacer />
      
      <v-btn @click="saveJSON" class="mr-2">
        💾 JSON Speichern
        <v-tooltip activator="parent" location="bottom">Eingaben als JSON speichern</v-tooltip>
      </v-btn>

      <v-btn @click="importJSON" class="mr-2">
        📂 JSON Laden
        <v-tooltip activator="parent" location="bottom">JSON Datei importieren</v-tooltip>
      </v-btn>

      <v-btn @click="exportData">
        Excel Export
        <v-tooltip activator="parent" location="bottom">Excel exportieren</v-tooltip>
      </v-btn>

      <!-- Hidden file input for import -->
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleFileUpload"
      />
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
    const fileInput = ref(null)

    function exportData() {
      if (questionnaireRef.value) {
        questionnaireRef.value.exportXLSX()
      }
    }

    function saveJSON() {
      if (questionnaireRef.value) {
        questionnaireRef.value.exportJSON()
      }
    }

    function importJSON() {
      if (fileInput.value) {
        fileInput.value.click()
      }
    }

    function handleFileUpload(event) {
      const file = event.target.files?.[0]
      if (file && questionnaireRef.value) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result)
            questionnaireRef.value.importJSON(data)
          } catch (err) {
            alert('Fehler beim Lesen der JSON-Datei: ' + err.message)
          }
        }
        reader.readAsText(file)
      }
      // Reset file input
      event.target.value = ''
    }

    return { questionnaireRef, exportData, saveJSON, importJSON, handleFileUpload, fileInput }
  }
}
</script>

<style>
/* small global styles */
body { font-family: Roboto, Arial, sans-serif; }
</style>
