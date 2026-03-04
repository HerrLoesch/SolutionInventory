<template>
  <div class="project-summary">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-tooltip text="Category Settings" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                size="small"
                variant="text"
                icon="mdi-cog"
                class="mr-1"
                @click="categorySettingsOpen = true"
              />
            </template>
          </v-tooltip>
          <v-icon size="18" class="mr-2">mdi-folder</v-icon>
          <span>{{ project?.name || 'Project' }}</span>
        </div>
        <v-chip size="x-small" variant="tonal">
          {{ questionnaires.length }} questionnaires
        </v-chip>
      </v-card-title>

      <v-divider />

      <v-tabs v-model="activeTab" density="compact">
        <v-tab value="matrix">
          <v-icon start size="16">mdi-table</v-icon>
          Matrix
        </v-tab>
        <v-tab value="suggestions">
          <v-icon start size="16">mdi-lightbulb-on-outline</v-icon>
          All Suggestions
        </v-tab>
        <v-tab value="radar">
          <v-icon start size="16">mdi-radar</v-icon>
          Tech Radar
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-tabs-window v-model="activeTab">
        <v-tabs-window-item value="matrix">
          <ProjectMatrix
            :project-id="projectId"
            :deviation-settings="deviationSettings"
            :visibility-settings="visibilitySettings"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="suggestions">
          <v-card-text>
            <v-alert v-if="!project" type="warning" density="compact" variant="tonal">
              Project not found.
            </v-alert>
            <v-alert v-else-if="!questionnaires.length" type="info" density="compact" variant="tonal">
              No questionnaires in this project.
            </v-alert>
            <ProjectSuggestions v-else :project-id="projectId" :visibility-settings="visibilitySettings" />
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item value="radar">
          <v-card-text>
            <v-alert v-if="!project" type="warning" density="compact" variant="tonal">
              Project not found.
            </v-alert>
            <v-alert v-else-if="!questionnaires.length" type="info" density="compact" variant="tonal">
              No questionnaires in this project.
            </v-alert>
            <TechRadar v-else :project-id="projectId" />
          </v-card-text>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>
  </div>

  <!-- Category Settings Dialog -->
  <v-dialog v-model="categorySettingsOpen" max-width="620" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center" style="gap: 8px;">
        <v-icon size="18">mdi-cog</v-icon>
        Category Settings
      </v-card-title>
      <v-divider />
      <v-card-text>
        <CategorySettings
          :categories="categoriesForSettings"
          :model-value="deviationSettings"
          :visibility-settings="visibilitySettings"
          @update:model-value="saveDeviationSettings"
          @update:visibility-settings="saveVisibilitySettings"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="gap-3">
        <v-spacer />
        <v-btn variant="text" @click="categorySettingsOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import ProjectMatrix from './ProjectMatrix.vue'
import ProjectSuggestions from './ProjectSuggestions.vue'
import CategorySettings from './CategorySettings.vue'
import TechRadar from './TechRadar.vue'

export default {
  components: { ProjectMatrix, ProjectSuggestions, CategorySettings, TechRadar },
  props: {
    projectId: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const store = useWorkspaceStore()
    const activeTab = ref('matrix')
    const categorySettingsOpen = ref(false)

    const project = computed(() =>
      (store.workspace.projects || []).find((p) => p.id === props.projectId) || null
    )

    const questionnaires = computed(() => {
      if (!project.value) return []
      return store.getProjectQuestionnaires(project.value)
    })

    const categoriesForSettings = computed(() => {
      const catMap = new Map()
      questionnaires.value.forEach((questionnaire) => {
        const cats = Array.isArray(questionnaire?.categories) ? questionnaire.categories : []
        cats.filter((c) => !c?.isMetadata).forEach((cat) => {
          const catId = String(cat?.id || '').trim()
          if (!catId) return
          if (!catMap.has(catId)) {
            catMap.set(catId, { id: catId, title: cat.title || catId, entries: new Map() })
          }
          const catData = catMap.get(catId)
          ;(Array.isArray(cat.entries) ? cat.entries : []).forEach((entry) => {
            const eid = String(entry?.id || '').trim()
            if (eid && !catData.entries.has(eid)) {
              catData.entries.set(eid, { id: eid, aspect: String(entry?.aspect || entry?.title || eid) })
            }
          })
        })
      })
      return Array.from(catMap.values()).map((c) => ({
        ...c,
        entries: Array.from(c.entries.values())
      }))
    })

    const deviationSettings = computed(() => project.value?.deviationSettings || {})
    const visibilitySettings = computed(() => project.value?.visibilitySettings || {})

    function saveDeviationSettings (settings) {
      store.updateProjectDeviationSettings(props.projectId, settings)
    }

    function saveVisibilitySettings (settings) {
      store.updateProjectVisibilitySettings(props.projectId, settings)
    }

    return {
      project,
      questionnaires,
      activeTab,
      categorySettingsOpen,
      categoriesForSettings,
      deviationSettings,
      visibilitySettings,
      saveDeviationSettings,
      saveVisibilitySettings
    }
  }
}
</script>

<style scoped>
.project-summary {
  min-height: 60vh;
}
</style>
