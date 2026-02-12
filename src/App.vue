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
      <ProjectTreeNav
        :workspace="workspace"
        @update-workspace="updateWorkspace"
        @open-questionnaire="openQuestionnaireTab"
      />
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
              ref="questionnaireWorkspaceRef"
              :workspace="workspace"
              :active-questionnaire-id="activeQuestionnaireId"
              @update-workspace="updateWorkspace"
              @update-active-questionnaire="setActiveQuestionnaire"
              @open-wizard="wizardOpen = true"
            />
          </v-window-item>

         <v-window-item value="summary">
            <Summary :categories="activeCategories" />
          </v-window-item>

          <v-window-item value="config">
            <QuestionnaireConfig :categories="activeCategories" @update-categories="updateCategories" />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>

    <WizardDialog
      v-model="wizardOpen"
      :categories="activeCategories"
      @update-categories="updateCategories"
    />
  </v-app>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue'
import QuestionnaireWorkspace from './components/QuestionnaireWorkspace.vue'
import ProjectTreeNav from './components/ProjectTreeNav.vue'
import Summary from './components/Summary.vue'
import QuestionnaireConfig from './components/QuestionnaireConfig.vue'
import WizardDialog from './components/WizardDialog.vue'
import { getCategoriesData } from './services/categoriesService'
import { createQuestionnaire, createWorkspace } from './models/projectModels'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 1

export default {
  components: { QuestionnaireWorkspace, Summary, QuestionnaireConfig, WizardDialog, ProjectTreeNav },
  setup() {
    const questionnaireWorkspaceRef = ref(null)
    const activeTab = ref('questionnaire')
    const workspace = ref(createWorkspace())
    const activeQuestionnaireId = ref('')
    const lastSaved = ref('')
    const wizardOpen = ref(false)

    const activeQuestionnaire = computed(() => {
      return workspace.value.questionnaires.find((item) => item.id === activeQuestionnaireId.value) || null
    })

    const activeCategories = computed(() => {
      return activeQuestionnaire.value?.categories || []
    })

    // LocalStorage Funktionen
    function saveToLocalStorage() {
      try {
        const dataToSave = {
          version: STORAGE_VERSION,
          timestamp: new Date().toISOString(),
          workspace: workspace.value,
          activeQuestionnaireId: activeQuestionnaireId.value
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
          if (data.version === STORAGE_VERSION && data.workspace) {
            workspace.value = data.workspace
            activeQuestionnaireId.value = data.activeQuestionnaireId || data.workspace.questionnaires?.[0]?.id || ''
            
            // Update last saved indicator with loaded timestamp
            const savedDate = new Date(data.timestamp)
            lastSaved.value = savedDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            
            console.log('Data loaded from localStorage (saved:', data.timestamp, ')')
            return true
          }

          if (data.version === STORAGE_VERSION && data.categories) {
            const initialQuestionnaire = createQuestionnaire('Current questionnaire', data.categories)
            workspace.value = createWorkspace([], [initialQuestionnaire])
            activeQuestionnaireId.value = initialQuestionnaire.id

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
        const initialQuestionnaire = createQuestionnaire('Current questionnaire', getCategoriesData())
        workspace.value = createWorkspace([], [initialQuestionnaire])
        activeQuestionnaireId.value = initialQuestionnaire.id
        lastSaved.value = ''
        console.log('localStorage cleared')
      }
    }

    // Beim Start versuchen, gespeicherte Daten zu laden
    onMounted(() => {
      if (!loadFromLocalStorage()) {
        const initialQuestionnaire = createQuestionnaire('Current questionnaire', getCategoriesData())
        workspace.value = createWorkspace([], [initialQuestionnaire])
        activeQuestionnaireId.value = initialQuestionnaire.id
      }
    })

    // Automatisches Speichern bei Änderungen
    watch(workspace, () => {
      saveToLocalStorage()
    }, { deep: true })

    function updateCategories(newCategories) {
      if (!activeQuestionnaire.value) return
      activeQuestionnaire.value.categories = newCategories
    }

    function updateWorkspace(newWorkspace) {
      workspace.value = newWorkspace
      if (!workspace.value.questionnaires.find((item) => item.id === activeQuestionnaireId.value)) {
        activeQuestionnaireId.value = workspace.value.questionnaires[0]?.id || ''
      }
    }

    function openQuestionnaireTab(payload) {
      if (!payload?.questionnaireId) return
      questionnaireWorkspaceRef.value?.openQuestionnaireTab(payload.questionnaireId)
      activeTab.value = 'questionnaire'
    }

    function setActiveQuestionnaire(questionnaireId) {
      activeQuestionnaireId.value = questionnaireId
    }

    return { 
      activeTab, 
      questionnaireWorkspaceRef,
      workspace,
      activeQuestionnaireId,
      activeCategories,
      lastSaved,
      wizardOpen,
      updateCategories, 
      updateWorkspace,
      openQuestionnaireTab,
      setActiveQuestionnaire,
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
