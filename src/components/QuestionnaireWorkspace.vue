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
          @open-wizard="$emit('open-wizard')"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import Questionnaire from './Questionnaire.vue'
import { getCategoriesData } from '../services/categoriesService'
import { createQuestionnaire } from '../models/projectModels'
import sampleData from '../../data/sample_export.json'

export default {
  components: { Questionnaire },
  props: {
    workspace: {
      type: Object,
      required: true
    },
    activeQuestionnaireId: {
      type: String,
      default: ''
    }
  },
  emits: ['update-workspace', 'update-active-questionnaire', 'open-wizard'],
  setup(props, { emit, expose }) {
    const fileInput = ref(null)
    const localWorkspace = ref(cloneWorkspace(props.workspace))
    const activeTab = ref(props.activeQuestionnaireId || localWorkspace.value.questionnaires[0]?.id || '')
    const openTabIds = ref(activeTab.value ? [activeTab.value] : [])

    watch(() => props.workspace, (value) => {
      localWorkspace.value = cloneWorkspace(value)
      syncOpenTabs()
    }, { deep: true })

    watch(() => props.activeQuestionnaireId, (value) => {
      if (!value) return
      openTab(value)
    })

    watch(activeTab, (value) => {
      if (!value) return
      emit('update-active-questionnaire', value)
    })

    const openTabs = computed(() => {
      return openTabIds.value
        .map((id) => getQuestionnaireById(id))
        .filter(Boolean)
        .map((questionnaire) => ({
          id: questionnaire.id,
          label: getTabLabel(questionnaire),
          categories: questionnaire.categories
        }))
    })

    function cloneWorkspace(source) {
      return {
        id: source?.id || 'workspace-local',
        projects: (source?.projects || []).map((project) => ({
          id: project.id,
          name: project.name,
          expanded: project.expanded ?? true,
          questionnaireIds: Array.isArray(project.questionnaireIds)
            ? [...project.questionnaireIds]
            : []
        })),
        questionnaires: (source?.questionnaires || []).map((item) => ({
          id: item.id,
          name: item.name,
          categories: Array.isArray(item.categories)
            ? JSON.parse(JSON.stringify(item.categories))
            : []
        }))
      }
    }

    function addQuestionnaire() {
      const questionnaire = createQuestionnaire('New questionnaire', getCategoriesData())
      localWorkspace.value.questionnaires.push(questionnaire)
      emitWorkspace()
      openTab(questionnaire.id)
    }

    function openQuestionnaireTab(questionnaireId) {
      openTab(questionnaireId)
    }

    function updateQuestionnaire(questionnaireId, newCategories) {
      const questionnaire = getQuestionnaireById(questionnaireId)
      if (!questionnaire) return
      questionnaire.categories = newCategories
      emitWorkspace()
    }

    function saveActiveQuestionnaire() {
      const questionnaire = getQuestionnaireById(activeTab.value)
      if (!questionnaire) return
      const exportData = { categories: questionnaire.categories }
      const data = JSON.stringify(exportData, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFilename(questionnaire.name || 'questionnaire')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
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
          const questionnaire = createQuestionnaire('Loaded questionnaire', categoriesData)
          localWorkspace.value.questionnaires.push(questionnaire)
          emitWorkspace()
          openTab(questionnaire.id)
        } catch (err) {
          alert('Error reading JSON file: ' + err.message)
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    }

    function loadSample() {
      const questionnaire = createQuestionnaire('Sample', sampleData.categories)
      localWorkspace.value.questionnaires.push(questionnaire)
      emitWorkspace()
      openTab(questionnaire.id)
    }

    function getTabLabel(questionnaire) {
      const productName = getProjectName(questionnaire.categories)
      return productName || questionnaire.name || 'New questionnaire'
    }

    function getProjectName(categoriesData) {
      if (!categoriesData || !categoriesData.length) return ''
      const metaCategory = categoriesData.find((category) => category.isMetadata)
      return metaCategory?.metadata?.productName || ''
    }

    function getQuestionnaireById(questionnaireId) {
      return localWorkspace.value.questionnaires.find((item) => item.id === questionnaireId)
    }

    function openTab(questionnaireId) {
      if (!questionnaireId || !getQuestionnaireById(questionnaireId)) return
      if (!openTabIds.value.includes(questionnaireId)) {
        openTabIds.value.push(questionnaireId)
      }
      activeTab.value = questionnaireId
      emit('update-active-questionnaire', questionnaireId)
    }

    function syncOpenTabs() {
      openTabIds.value = openTabIds.value.filter((id) => getQuestionnaireById(id))
      if (activeTab.value && !getQuestionnaireById(activeTab.value)) {
        activeTab.value = openTabIds.value[0] || localWorkspace.value.questionnaires[0]?.id || ''
      }
      if (activeTab.value) {
        emit('update-active-questionnaire', activeTab.value)
      }
    }

    function emitWorkspace() {
      emit('update-workspace', cloneWorkspace(localWorkspace.value))
    }

    function sanitizeFilename(value) {
      return String(value || 'questionnaire')
        .trim()
        .replace(/[^a-zA-Z0-9-_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
    }

    expose({ saveActiveQuestionnaire, openQuestionnaireTab })

    return {
      openTabs,
      activeTab,
      addQuestionnaire,
      openQuestionnaireTab,
      saveActiveQuestionnaire,
      triggerLoad,
      handleFileUpload,
      loadSample,
      updateQuestionnaire
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
