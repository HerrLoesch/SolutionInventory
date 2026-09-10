<template>
  <div class="workspace">
    <div v-if="workspaceTabs.length" class="workspace-actions"></div>

    <v-tabs v-if="workspaceTabs.length" v-model="activeTab" density="compact" show-arrows class="workspace-tabs">
      <v-tab
        v-for="tab in workspaceTabs"
        :key="tab.id"
        :value="tab.id"
        class="workspace-tab"
        :class="{ 'tab-active': tab.id === activeTab }"
      >
        <v-icon v-if="tab.type === 'workspace-comparison'" size="16" class="mr-2">mdi-compare-horizontal</v-icon>
        <v-icon v-else-if="tab.type === 'project-summary'" size="16" class="mr-2">mdi-folder</v-icon>
        <v-icon v-else-if="tab.type === 'catalog-editor'" size="16" class="mr-2">mdi-file-tree-outline</v-icon>
        <v-icon v-else size="16" class="mr-2">mdi-file-document-outline</v-icon>
        <span class="tab-title">{{ tab.label }}</span>
        <span v-if="tab.type === 'catalog-editor' && tab.dirty" class="tab-dirty-dot" title="Unsaved changes"></span>
        <v-btn icon size="x-small" variant="text" class="tab-close" @click.stop="closeTab(tab.id)">
          <v-icon size="14">mdi-close</v-icon>
        </v-btn>
      </v-tab>
    </v-tabs>

    <div v-if="!workspaceTabs.length" class="workspace-empty">
      Please select a project or create a questionnaire to get started.
    </div>

    <v-window v-else v-model="activeTab">
      <v-window-item v-for="tab in workspaceTabs" :key="tab.id" :value="tab.id">
        <ProjectComparison v-if="tab.type === 'workspace-comparison'" />
        <ProjectSummary v-else-if="tab.type === 'project-summary'" :project-id="tab.projectId" />
        <CatalogEditor v-else-if="tab.type === 'catalog-editor'" :catalog-id="tab.catalogId" />
        <Questionnaire
          v-else
          :categories="tab.categories"
          :questionnaire-id="tab.id"
          @update-categories="updateQuestionnaire(tab.id, $event)"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Questionnaire from '../questionaire/Questionnaire.vue'
import ProjectSummary from '../projects/ProjectSummary.vue'
import ProjectComparison from './ProjectComparison.vue'
import CatalogEditor from '../catalog/CatalogEditor.vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useWorkspaceTabGuard } from '../../composables/useWorkspaceTabGuard'

export default {
  components: { Questionnaire, ProjectSummary, ProjectComparison, CatalogEditor },
  setup() {
    const store = useWorkspaceStore()
    const { workspaceTabs, activeWorkspaceTabId } = storeToRefs(store)
    const { canLeaveActiveTab, confirmLeavingDirtyCatalog } = useWorkspaceTabGuard()

    const activeTab = computed({
      get: () => activeWorkspaceTabId.value,
      set: (value) => guardedSwitchTab(value)
    })

    watch(
      () => [workspaceTabs.value, activeWorkspaceTabId.value],
      ([tabs, activeId]) => {
        if (!tabs.length) return
        if (!activeId) {
          store.setActiveWorkspaceTab(tabs[0].id)
        }
      },
      { immediate: true, deep: true }
    )

    function updateQuestionnaire(questionnaireId, newCategories) {
      store.updateQuestionnaireCategories(questionnaireId, newCategories)
    }

    async function guardedSwitchTab(tabId) {
      if (tabId === activeWorkspaceTabId.value) return
      const canLeave = await canLeaveActiveTab()
      if (!canLeave) return
      store.setActiveWorkspaceTab(tabId)
    }

    // Closing a dirty catalog tab is a different check than switching away
    // from one — here the tab being closed is the one at risk, whether or
    // not it's currently active.
    async function closeTab(tabId) {
      if (store.isCatalogTabId(tabId)) {
        const catalogId = store.fromCatalogTabId(tabId)
        if (store.isCatalogDraftDirty(catalogId)) {
          const canLeave = await confirmLeavingDirtyCatalog(catalogId)
          if (!canLeave) return
        }
      }
      store.closeWorkspaceTab(tabId)
    }

    return {
      workspaceTabs,
      activeTab,
      updateQuestionnaire,
      closeTab
    }
  }
}
</script>

<style scoped>
.workspace {
  min-height: 60vh;
}

.workspace-actions {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.workspace-tabs {
  border-bottom: 1px solid #eceff1;
  margin-bottom: 16px;
}

.workspace-empty {
  padding: 32px 12px;
  text-align: center;
  color: #607d8b;
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

.tab-dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-warning));
  flex-shrink: 0;
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
