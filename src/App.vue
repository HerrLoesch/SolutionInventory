<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>

      <v-spacer />

      <!-- Auto-save Indikator -->
      <v-chip v-if="lastSaved" size="x-small" class="mr-2" variant="text">
        <v-icon size="small" class="mr-1">mdi-content-save</v-icon>
        {{ lastSaved }}
      </v-chip>
      
      <v-btn @click="clearStorage" class="mr-2" variant="text" size="small">
        <v-icon>mdi-delete</v-icon>
        <v-tooltip activator="parent" location="bottom">Clear saved data</v-tooltip>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer app permanent width="260" class="side-nav">
      <v-list density="compact" nav>
        <v-list-subheader class="nav-header">Workspace</v-list-subheader>
        <v-list-item
          title="Questionnaire"
          :active="activeTab === 'questionnaire'"
          @click="activeTab = 'questionnaire'"
        >
          <template #prepend>
            <v-icon>mdi-clipboard-text</v-icon>
          </template>
        </v-list-item>
        <v-list-item
          title="Summary"
          :active="activeTab === 'summary'"
          @click="activeTab = 'summary'"
        >
          <template #prepend>
            <v-icon>mdi-chart-donut</v-icon>
          </template>
        </v-list-item>
        <v-list-item
          title="Configuration"
          :active="activeTab === 'config'"
          @click="activeTab = 'config'"
        >
          <template #prepend>
            <v-icon>mdi-cog</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-4 main-container">
        <v-window v-model="activeTab">
          <v-window-item value="questionnaire">
            <QuestionnaireWorkspace
              :categories="categories"
              @update-categories="updateCategories"
              @open-wizard="wizardOpen = true"
            />
          </v-window-item>

         <v-window-item value="summary">
            <Summary :categories="categories" />
          </v-window-item>

          <v-window-item value="config">
            <QuestionnaireConfig :categories="categories" @update-categories="updateCategories" />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>

    <WizardDialog
      v-model="wizardOpen"
      :categories="categories"
      @update-categories="updateCategories"
    />
  </v-app>
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import QuestionnaireWorkspace from './components/QuestionnaireWorkspace.vue'
import Summary from './components/Summary.vue'
import QuestionnaireConfig from './components/QuestionnaireConfig.vue'
import WizardDialog from './components/WizardDialog.vue'
import { getCategoriesData } from './services/categoriesService'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 1

export default {
  components: { QuestionnaireWorkspace, Summary, QuestionnaireConfig, WizardDialog },
  setup() {
    const activeTab = ref('questionnaire')
    const categories = ref(getCategoriesData())
    const lastSaved = ref('')
    const wizardOpen = ref(false)

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

    return { 
      activeTab, 
      categories,
      lastSaved,
      wizardOpen,
      updateCategories, 
      clearStorage
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

.side-nav {
  border-right: 1px solid #ECEFF1;
}

.nav-header {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #78909C;
}
</style>
