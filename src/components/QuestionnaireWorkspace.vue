<template>
  <div class="questionnaire-workspace">
    <div class="workspace-actions">
      <v-btn color="primary" size="small" @click="addQuestionnaire">
        <v-icon size="16" class="mr-2">mdi-plus</v-icon>
        New
      </v-btn>
      <v-btn size="small" variant="tonal" @click="saveActiveQuestionnaire">
        <v-icon size="16" class="mr-2">mdi-content-save</v-icon>
        Save
      </v-btn>
      <v-btn size="small" variant="tonal" @click="triggerLoad">
        <v-icon size="16" class="mr-2">mdi-folder-open</v-icon>
        Load
      </v-btn>
      <v-btn size="small" variant="tonal" @click="loadSample">
        <v-icon size="16" class="mr-2">mdi-flask-outline</v-icon>
        Sample
      </v-btn>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileUpload"
    />

    <v-tabs v-model="activeTab" density="compact" show-arrows class="workspace-tabs">
      <v-tab
        v-for="tab in openTabs"
        :key="tab.id"
        :value="tab.id"
        class="workspace-tab"
      >
        <v-icon size="16" class="mr-2">mdi-file-document-outline</v-icon>
        <span class="tab-title">{{ tab.label }}</span>
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
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
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Questionnaire from './Questionnaire.vue'
import { useWorkspaceStore } from '../stores/workspaceStore'
import sampleData from '../../data/sample_export.json'

export default {
  components: { Questionnaire },
  emits: ['open-wizard'],
  setup(props, { emit }) {
    const fileInput = ref(null)
    const store = useWorkspaceStore()
    const { openTabs, activeQuestionnaireId } = storeToRefs(store)

    const activeTab = computed({
      get: () => activeQuestionnaireId.value,
      set: (value) => store.setActiveQuestionnaire(value)
    })

    function addQuestionnaire() {
      store.addQuestionnaire('New questionnaire')
    }

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

    function loadSample() {
      store.addQuestionnaireFromCategories('Sample', sampleData.categories)
    }

    function openWizard() {
      emit('open-wizard')
    }

    return {
      openTabs,
      activeTab,
      addQuestionnaire,
      saveActiveQuestionnaire,
      triggerLoad,
      handleFileUpload,
      loadSample,
      updateQuestionnaire,
      openWizard
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

.workspace-tab {
  text-transform: none;
  font-weight: 600;
  color: #263238;
  min-height: 36px;
  padding: 0 10px;
}

.tab-title {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
