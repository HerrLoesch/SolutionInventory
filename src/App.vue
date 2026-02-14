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
      <v-divider class="nav-divider" />
      <v-list density="compact" nav class="nav-footer">
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
          title="Configuration"
          :active="configOpen"
          @click="openConfig"
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
        </v-window>
      </v-container>
    </v-main>

    <WizardDialog
      v-model="wizardOpen"
      :categories="activeCategories"
      @update-categories="updateCategories"
    />

    <v-dialog v-model="configOpen" max-width="1200">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Configuration</span>
          <v-btn icon variant="text" @click="configOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <QuestionnaireConfig
            :categories="activeCategories"
            @update-categories="updateCategories"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import QuestionnaireWorkspace from './components/QuestionnaireWorkspace.vue'
import ProjectTreeNav from './components/ProjectTreeNav.vue'
import QuestionnaireConfig from './components/QuestionnaireConfig.vue'
import WizardDialog from './components/WizardDialog.vue'
import { useWorkspaceStore } from './stores/workspaceStore'

export default {
  components: { QuestionnaireWorkspace, QuestionnaireConfig, WizardDialog, ProjectTreeNav },
  setup() {
    const activeTab = ref('questionnaire')
    const configOpen = ref(false)
    const wizardOpen = ref(false)
    const store = useWorkspaceStore()
    const { activeCategories, lastSaved, activeQuestionnaireId, workspace } = storeToRefs(store)

    // Beim Start versuchen, gespeicherte Daten zu laden
    onMounted(() => {
      store.initFromStorage()
      store.startAutoSave()
    })

    watch(activeQuestionnaireId, (value) => {
      if (value && activeTab.value !== 'config') {
        activeTab.value = 'questionnaire'
      }
    })

    function openConfig() {
      if (!activeQuestionnaireId.value) {
        const firstId = workspace.value.questionnaires?.[0]?.id
        if (firstId) {
          store.openQuestionnaire(firstId)
        }
      }
      configOpen.value = true
    }

    function updateCategories(newCategories) {
      store.updateQuestionnaireCategories(activeQuestionnaireId.value, newCategories)
    }

    return { 
      activeTab, 
      activeCategories,
      lastSaved,
      configOpen,
      wizardOpen,
      openConfig,
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
  display: flex;
  flex-direction: column;
}

.side-nav .project-tree-nav {
  flex: 1 1 auto;
  overflow-y: auto;
}

.nav-divider {
  margin: 8px 12px;
}

.nav-footer {
  margin-top: auto;
}

.nav-header {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #78909C;
}
</style>
