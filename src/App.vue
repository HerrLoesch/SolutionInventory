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
      <ProjectTreeNav />
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
            <QuestionnaireWorkspace @open-wizard="wizardOpen = true" />
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
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import QuestionnaireWorkspace from './components/QuestionnaireWorkspace.vue'
import ProjectTreeNav from './components/ProjectTreeNav.vue'
import Summary from './components/Summary.vue'
import QuestionnaireConfig from './components/QuestionnaireConfig.vue'
import WizardDialog from './components/WizardDialog.vue'
import { useWorkspaceStore } from './stores/workspaceStore'

export default {
  components: { QuestionnaireWorkspace, Summary, QuestionnaireConfig, WizardDialog, ProjectTreeNav },
  setup() {
    const activeTab = ref('questionnaire')
    const wizardOpen = ref(false)
    const store = useWorkspaceStore()
    const { activeCategories, lastSaved, activeQuestionnaireId } = storeToRefs(store)

    // Beim Start versuchen, gespeicherte Daten zu laden
    onMounted(() => {
      store.initFromStorage()
      store.startAutoSave()
    })

    watch(activeQuestionnaireId, (value) => {
      if (value) {
        activeTab.value = 'questionnaire'
      }
    })

    function updateCategories(newCategories) {
      store.updateQuestionnaireCategories(activeQuestionnaireId.value, newCategories)
    }

    return { 
      activeTab, 
      activeCategories,
      lastSaved,
      wizardOpen,
      updateCategories, 
      clearStorage: store.clearStorage
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
