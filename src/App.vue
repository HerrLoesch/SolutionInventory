<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>
      
      <v-tabs v-model="activeTab" class="ml-6">
        <v-tab value="questionnaire">Questionnaire</v-tab>
        <v-tab value="summary">Summary</v-tab>
      </v-tabs>

      <v-spacer />
      
      <v-btn @click="saveJSON" class="mr-2">
        💾 Save JSON
        <v-tooltip activator="parent" location="bottom">Save entries as JSON</v-tooltip>
      </v-btn>

      <v-btn @click="importJSON" class="mr-2">
        📂 Load JSON
        <v-tooltip activator="parent" location="bottom">Import JSON file</v-tooltip>
      </v-btn>

      <v-btn @click="loadSample" class="mr-2">
        📋 Load Sample
        <v-tooltip activator="parent" location="bottom">Load sample data</v-tooltip>
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
        <v-window v-model="activeTab">
          <v-window-item value="questionnaire">
            <Questionnaire ref="questionnaireRef" :categories="categories" @update-categories="updateCategories" />
          </v-window-item>

          <v-window-item value="summary">
            <Summary :categories="categories" />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { ref } from 'vue'
import Questionnaire from './components/Questionnaire.vue'
import Summary from './components/Summary.vue'
import { getCategoriesData } from './services/categoriesService'
import sampleData from '../data/sample_export.json'

export default {
  components: { Questionnaire, Summary },
  setup() {
    const questionnaireRef = ref(null)
    const fileInput = ref(null)
    const activeTab = ref('questionnaire')
    const categories = ref(getCategoriesData())

    function updateCategories(newCategories) {
      categories.value = newCategories
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
            // Support both formats: array or object with categories property
            const categoriesData = Array.isArray(data) ? data : data.categories
            if (!categoriesData) {
              throw new Error('Invalid format: Expected categories array or object with categories property')
            }
            questionnaireRef.value.importJSON(categoriesData)
            categories.value = categoriesData
          } catch (err) {
            alert('Error reading JSON file: ' + err.message)
          }
        }
        reader.readAsText(file)
      }
      // Reset file input
      event.target.value = ''
    }

    function loadSample() {
      if (questionnaireRef.value) {
        questionnaireRef.value.importJSON(sampleData.categories)
        categories.value = sampleData.categories
      }
    }

    return { questionnaireRef, activeTab, categories, updateCategories, saveJSON, importJSON, handleFileUpload, loadSample, fileInput }
  }
}
</script>

<style>
/* small global styles */
body { font-family: Roboto, Arial, sans-serif; }
</style>
