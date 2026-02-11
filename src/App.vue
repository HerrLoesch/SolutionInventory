<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>
      
      <v-tabs v-model="activeTab" class="ml-6">
        <v-tab value="questionnaire">Questionnaire</v-tab>
        <v-tab value="summary">Summary</v-tab>
        <v-tab value="config">Configuration</v-tab>
      </v-tabs>

      <v-spacer />

      <!-- Auto-save Indikator -->
      <v-chip v-if="lastSaved" size="x-small" class="mr-2" variant="text">
        <v-icon size="small" class="mr-1">mdi-content-save</v-icon>
        {{ lastSaved }}
      </v-chip>
      
      <v-btn @click="saveJSON" class="mr-2">
        <v-icon>mdi-content-save</v-icon>
        <span class="ml-2">Save JSON</span>
        <v-tooltip activator="parent" location="bottom">Save entries as JSON</v-tooltip>
      </v-btn>

      <v-btn @click="importJSON" class="mr-2">
        <v-icon>mdi-folder-open</v-icon>
        <span class="ml-2">Load JSON</span>
        <v-tooltip activator="parent" location="bottom">Import JSON file</v-tooltip>
      </v-btn>

      <v-btn @click="loadSample" class="mr-2">
        <v-icon>mdi-file-document-outline</v-icon>
        <span class="ml-2">Load Sample</span>
        <v-tooltip activator="parent" location="bottom">Load sample data</v-tooltip>
      </v-btn>

      <v-btn @click="clearStorage" class="mr-2" variant="text" size="small">
        <v-icon>mdi-delete</v-icon>
        <v-tooltip activator="parent" location="bottom">Clear saved data</v-tooltip>
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
      <v-container fluid class="pa-4 main-container">
        <v-window v-model="activeTab">
          <v-window-item value="questionnaire">
            <Questionnaire ref="questionnaireRef" :categories="categories" @update-categories="updateCategories" />
          </v-window-item>

          <!-- <v-window-item value="summary">
            <Summary :categories="categories" />
          </v-window-item> -->

          <v-window-item value="config">
            <QuestionnaireConfig :categories="categories" @update-categories="updateCategories" />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import Questionnaire from './components/Questionnaire.vue'
import Summary from './components/Summary.vue'
import QuestionnaireConfig from './components/QuestionnaireConfig.vue'
import { getCategoriesData } from './services/categoriesService'
import sampleData from '../data/sample_export.json'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 1

export default {
  components: { Questionnaire, Summary, QuestionnaireConfig },
  setup() {
    const questionnaireRef = ref(null)
    const fileInput = ref(null)
    const activeTab = ref('questionnaire')
    const categories = ref(getCategoriesData())
    const lastSaved = ref('')

    // LocalStorage Funktionen
    function saveToLocalStorage() {
      try {
        const dataToSave = {
          version: STORAGE_VERSION,
          timestamp: new Date().toISOString(),
          categories: categories.value
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
        
        // Update last saved indicator
        const now = new Date()
        lastSaved.value = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        
        console.log('Data saved to localStorage')
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    }

    function loadFromLocalStorage() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const data = JSON.parse(saved)
          if (data.version === STORAGE_VERSION && data.categories) {
            categories.value = data.categories
            
            // Update last saved indicator with loaded timestamp
            const savedDate = new Date(data.timestamp)
            lastSaved.value = savedDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            
            console.log('Data loaded from localStorage (saved:', data.timestamp, ')')
            return true
          }
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error)
      }
      return false
    }

    function clearStorage() {
      if (confirm('Möchten Sie wirklich alle gespeicherten Daten löschen?')) {
        localStorage.removeItem(STORAGE_KEY)
        categories.value = getCategoriesData()
        lastSaved.value = ''
        console.log('localStorage cleared')
      }
    }

    // Beim Start versuchen, gespeicherte Daten zu laden
    onMounted(() => {
      loadFromLocalStorage()
    })

    // Automatisches Speichern bei Änderungen
    watch(categories, () => {
      saveToLocalStorage()
    }, { deep: true })

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

    return { 
      questionnaireRef, 
      activeTab, 
      categories,
      lastSaved,
      updateCategories, 
      saveJSON, 
      importJSON, 
      handleFileUpload, 
      loadSample, 
      clearStorage,
      fileInput 
    }
  }
}
</script>

<style>
/* small global styles */
body { font-family: Roboto, Arial, sans-serif; }

.main-container {
  max-width: 1800px;
  margin: 0 auto;
}
</style>
