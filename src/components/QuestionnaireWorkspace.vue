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
        v-for="tab in tabs"
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
        v-for="tab in tabs"
        :key="tab.id"
        :value="tab.id"
      >
        <Questionnaire
          :categories="tab.categories"
          @update-categories="updateTabCategories(tab.id, $event)"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import Questionnaire from './Questionnaire.vue'
import { getCategoriesData } from '../services/categoriesService'
import sampleData from '../../data/sample_export.json'

export default {
  components: { Questionnaire },
  props: {
    categories: {
      type: Array,
      required: true
    }
  },
  emits: ['update-categories'],
  setup(props, { emit, expose }) {
    const fileInput = ref(null)
    const tabs = ref([
      {
        id: 'current',
        label: 'Current questionnaire',
        categories: JSON.parse(JSON.stringify(props.categories))
      }
    ])
    const activeTab = ref('current')

    watch(() => props.categories, (newCategories) => {
      const currentTab = tabs.value.find((tab) => tab.id === 'current')
      if (currentTab) {
        currentTab.categories = JSON.parse(JSON.stringify(newCategories))
      }
    }, { deep: true })

    function addQuestionnaire() {
      addTabWithCategories(getCategoriesData(), 'New questionnaire')
    }

    function addTabWithCategories(categoriesData, fallbackLabel) {
      const id = `questionnaire-${Math.random().toString(36).slice(2, 10)}`
      const label = getTabLabel(categoriesData, fallbackLabel)
      tabs.value.push({
        id,
        label,
        categories: JSON.parse(JSON.stringify(categoriesData))
      })
      activeTab.value = id
    }

    function updateTabCategories(tabId, newCategories) {
      const tab = tabs.value.find((item) => item.id === tabId)
      if (!tab) return
      tab.categories = newCategories
      if (tabId === 'current') {
        emit('update-categories', newCategories)
      }
    }

    function saveActiveQuestionnaire() {
      const tab = tabs.value.find((item) => item.id === activeTab.value)
      if (!tab) return
      const exportData = { categories: tab.categories }
      const data = JSON.stringify(exportData, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFilename(tab.label || 'questionnaire')}.json`
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
          addTabWithCategories(categoriesData, 'Loaded questionnaire')
        } catch (err) {
          alert('Error reading JSON file: ' + err.message)
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    }

    function loadSample() {
      addTabWithCategories(sampleData.categories, 'Sample')
    }

    function getTabLabel(categoriesData, fallbackLabel) {
      const productName = getProjectName(categoriesData)
      return productName || fallbackLabel || 'New questionnaire'
    }

    function getProjectName(categoriesData) {
      if (!categoriesData || !categoriesData.length) return ''
      const metaCategory = categoriesData.find((category) => category.isMetadata)
      return metaCategory?.metadata?.productName || ''
    }

    function sanitizeFilename(value) {
      return String(value || 'questionnaire')
        .trim()
        .replace(/[^a-zA-Z0-9-_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
    }

    expose({ saveActiveQuestionnaire })

    return {
      tabs,
      activeTab,
      addQuestionnaire,
      saveActiveQuestionnaire,
      triggerLoad,
      handleFileUpload,
      loadSample,
      updateTabCategories
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
