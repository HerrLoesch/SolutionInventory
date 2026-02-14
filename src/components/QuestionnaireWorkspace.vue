<template>
  <div class="questionnaire-workspace">
    <div v-if="openTabs.length" class="workspace-actions">
      <v-btn
        size="small"    
        variant="text"    
        icon
        @click="saveActiveQuestionnaire"
      >
        <v-icon size="16">mdi-content-save</v-icon>
        <v-tooltip activator="parent" location="bottom">Save</v-tooltip>
      </v-btn>

      <v-btn
        variant="text"
        size="small"        
        icon
        @click="triggerLoad"
      >
        <v-icon size="16">mdi-folder-open</v-icon>
        <v-tooltip activator="parent" location="bottom">Load</v-tooltip>
      </v-btn>
      <v-spacer />
      <v-btn
        variant="text"
        size="small"        
        color="error"
        icon
        :disabled="!activeQuestionnaire"
        @click="openDeleteDialog"
      >
        <v-icon size="16">mdi-delete</v-icon>
        <v-tooltip activator="parent" location="bottom">Delete questionnaire</v-tooltip>
      </v-btn>
    </div>
        
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileUpload"
    />

    <v-tabs v-if="openTabs.length" v-model="activeTab" density="compact" show-arrows class="workspace-tabs">
      <v-tab
        v-for="tab in openTabs"
        :key="tab.id"
        :value="tab.id"
        class="workspace-tab"
        :class="{ 'tab-active': tab.id === activeTab }"
      >
        <v-icon size="16" class="mr-2">mdi-file-document-outline</v-icon>
        <span class="tab-title">{{ tab.label }}</span>
        <v-btn
          icon
          size="x-small"
          variant="text"
          class="tab-close"
          @click.stop="closeTab(tab.id)"
        >
          <v-icon size="14">mdi-close</v-icon>
        </v-btn>
      </v-tab>
    </v-tabs>

    <div v-if="!openTabs.length" class="workspace-empty">
      Please select or create a questionnaire to get started.
    </div>

    <v-window v-else v-model="activeTab">
      <v-window-item
        v-for="tab in openTabs"
        :key="tab.id"
        :value="tab.id"
      >
        <Questionnaire
          :categories="tab.categories"
          @update-categories="updateQuestionnaire(tab.id, $event)"
          @open-wizard="openWizard"
        />
      </v-window-item>
    </v-window>

    <v-dialog v-model="deleteDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Delete questionnaire</v-card-title>
        <v-card-text>
          Do you really want to delete the questionnaire "{{ deleteTargetName }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Questionnaire from './Questionnaire.vue'
import { useWorkspaceStore } from '../stores/workspaceStore'

export default {
  components: { Questionnaire },
  emits: ['open-wizard'],
  setup(props, { emit }) {
    const fileInput = ref(null)
    const deleteDialogOpen = ref(false)
    const deleteTargetId = ref('')
    const deleteTargetName = ref('')
    const store = useWorkspaceStore()
    const { openTabs, activeQuestionnaire, activeQuestionnaireId } = storeToRefs(store)

    const activeTab = computed({
      get: () => activeQuestionnaireId.value,
      set: (value) => store.setActiveQuestionnaire(value)
    })


    function updateQuestionnaire(questionnaireId, newCategories) {
      store.updateQuestionnaireCategories(questionnaireId, newCategories)
    }

    function saveActiveQuestionnaire() {
      store.saveActiveQuestionnaire()
    }

    function triggerLoad() {
      fileInput.value?.click()
    }

    function handleFileUpload(event) {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          const categoriesData = Array.isArray(data) ? data : data.categories
          if (!categoriesData) {
            throw new Error('Invalid format: Expected categories array or object with categories property')
          }
          store.addQuestionnaireFromCategories('Loaded questionnaire', categoriesData)
        } catch (err) {
          alert('Error reading JSON file: ' + err.message)
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    }


    function openWizard() {
      emit('open-wizard')
    }

    function openDeleteDialog() {
      const questionnaire = activeQuestionnaire.value
      if (!questionnaire) return
      deleteTargetId.value = questionnaire.id
      deleteTargetName.value = questionnaire.name || 'questionnaire'
      deleteDialogOpen.value = true
    }

    function closeDeleteDialog() {
      deleteDialogOpen.value = false
      deleteTargetId.value = ''
      deleteTargetName.value = ''
    }

    function confirmDelete() {
      const targetId = deleteTargetId.value || activeQuestionnaireId.value
      closeDeleteDialog()
      if (!targetId) return
      store.deleteQuestionnaire(targetId)
    }

    function closeTab(questionnaireId) {
      store.closeQuestionnaire(questionnaireId)
    }
    return {
      openTabs,
      activeTab,
      activeQuestionnaire,
      saveActiveQuestionnaire,
      deleteDialogOpen,
      deleteTargetName,
      openDeleteDialog,
      closeDeleteDialog,
      confirmDelete,
      triggerLoad,
      handleFileUpload,
      updateQuestionnaire,
      openWizard,
      closeTab
    }
  }
}
</script>

<style scoped>
.questionnaire-workspace {
  min-height: 60vh;
}

.workspace-actions {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.workspace-tabs {
  border-bottom: 1px solid #ECEFF1;
  margin-bottom: 16px;
}

.workspace-empty {
  padding: 32px 12px;
  text-align: center;
  color: #607D8B;
  font-size: 14px;
}

.workspace-tab {
  text-transform: none;
  font-weight: 600;
  color: #263238;
  min-height: 36px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-title {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  opacity: 0;
  pointer-events: none;
  margin-left: 4px;
}

.workspace-tab:hover .tab-close,
.workspace-tab.tab-active .tab-close {
  opacity: 1;
  pointer-events: auto;
}
</style>
