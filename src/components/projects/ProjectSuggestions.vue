<template>
  <div>
    <!-- Toolbar -->
    <div class="d-flex align-center mb-3" style="gap: 8px;">
      <v-btn-toggle
        v-model="answerTypeFilter"
        density="compact"
        variant="outlined"
        divided
        mandatory
        rounded="lg"
        class="mr-2"
        style="white-space: nowrap;"
      >
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="Tool" size="small">
          <v-icon start size="14">mdi-puzzle</v-icon>
          Tools
        </v-btn>
        <v-btn value="Practice" size="small">
          <v-icon start size="14">mdi-map-marker-path</v-icon>
          Practices
        </v-btn>
      </v-btn-toggle>

      <v-text-field
        v-model="search"
        label="Search"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
      />

      <v-select
        v-if="allQuestionnaires.length > 1"
        v-model="selectedQuestionnaireIds"
        :items="allQuestionnaires"
        item-title="name"
        item-value="id"
        label="Questionnaires"
        density="compact"
        variant="outlined"
        hide-details
        multiple
        style="max-width:220px; flex-shrink:0;"
      >
        <template #selection="{ index }">
          <span v-if="index === 0" class="text-caption text-truncate">
            <template v-if="selectedQuestionnaireIds.length === allQuestionnaires.length">All</template>
            <template v-else-if="selectedQuestionnaireIds.length === 1">{{ allQuestionnaires.find(q => q.id === selectedQuestionnaireIds[0])?.name }}</template>
            <template v-else>{{ selectedQuestionnaireIds.length }} selected</template>
          </span>
        </template>
        <template #item="{ item, props: itemProps }">
          <v-list-item v-bind="itemProps" :title="item.title">
            <template #prepend="{ isSelected }">
              <v-checkbox-btn :model-value="isSelected" tabindex="-1" />
            </template>
          </v-list-item>
        </template>
      </v-select>

      <v-tooltip text="Expand all" location="top">
        <template #activator="{ props }">
          <v-btn v-bind="props" size="small" variant="text" icon="mdi-unfold-more-horizontal" @click="expandAll" />
        </template>
      </v-tooltip>
      <v-tooltip text="Collapse all" location="top">
        <template #activator="{ props }">
          <v-btn v-bind="props" size="small" variant="text" icon="mdi-unfold-less-horizontal" @click="collapseAll" />
        </template>
      </v-tooltip>
    </div>

    <!-- Content -->
    <v-expansion-panels v-model="openPanels" variant="accordion" multiple>
      <v-expansion-panel
        v-for="group in visibleCategoryGroups"
        :key="group.categoryTitle"
        :value="group.categoryTitle"
      >
        <v-expansion-panel-title>
          <div class="d-flex align-center justify-space-between w-100">
            <span class="text-body-2 font-weight-bold">{{ group.categoryTitle }}</span>
            <v-chip size="x-small" variant="tonal">{{ group.entryCount }}</v-chip>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <div class="entries-grid">
            <v-card
              v-for="entry in group.entries"
              :key="entry.entryId"
              variant="outlined"
              class="entry-card"
            >
              <v-card-title
                class="entry-card-title d-flex align-center justify-space-between"
                @click="toggleEntry(group.categoryTitle, entry.entryId)"
              >
                <span class="text-subtitle-2 font-weight-medium">{{ entry.entryTitle }}</span>
                <div class="d-flex align-center" style="gap: 6px;">
                  <v-chip size="x-small" variant="tonal">{{ entry.answers.length }}</v-chip>
                  <v-icon size="18">
                    {{ isEntryOpen(group.categoryTitle, entry.entryId) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </v-icon>
                </div>
              </v-card-title>

              <v-expand-transition>
                <div v-if="isEntryOpen(group.categoryTitle, entry.entryId)">
                  <v-divider />
                  <v-card-text class="pt-2 pb-3">
                    <div v-if="entry.answers.length" class="suggestions-list">
                      <div
                        v-for="(answer, idx) in entry.answers"
                        :key="idx"
                        class="suggestion-row"
                        :class="{ 'suggestion-row--radar': isProjectRadarRef(projectId, entry.entryId, answer.option) }"
                      >
                        <v-tooltip :text="isProjectRadarRef(projectId, entry.entryId, answer.option) ? 'Remove from Tech Radar' : 'Add to Tech Radar'" location="top">
                          <template #activator="{ props: tProps }">
                            <v-btn
                              v-bind="tProps"
                              size="x-small"
                              variant="text"
                              :color="isProjectRadarRef(projectId, entry.entryId, answer.option) ? 'primary' : 'default'"
                              icon
                              class="radar-toggle-btn"
                              @click.stop="toggleProjectRadarRef(projectId, entry.entryId, answer.option, answer.questionnaireRefs[0]?.id)"
                            >
                              <v-icon size="14">mdi-radar</v-icon>
                            </v-btn>
                          </template>
                        </v-tooltip>
                        <v-chip
                          v-if="answer.answerType && answerTypeFilter === 'all'"
                          size="x-small"
                          :color="answer.answerType === 'Tool' ? 'blue' : 'green'"
                          variant="tonal"
                          class="type-chip"
                        >
                          <v-icon start size="11">{{ answer.answerType === 'Tool' ? 'mdi-puzzle' : 'mdi-map-marker-path' }}</v-icon>
                          {{ answer.answerType }}
                        </v-chip>
                        <span class="suggestion-option">{{ answer.option }}</span>
                        <v-chip
                          v-if="answer.status"
                          size="x-small"
                          variant="tonal"
                          :color="statusChipColor(answer.status)"
                        >
                          {{ answer.status }}
                        </v-chip>
                        <v-tooltip v-if="answer.comment" :text="answer.comment" location="top">
                          <template #activator="{ props }">
                            <v-icon v-bind="props" size="14" class="comment-icon">mdi-comment-text-outline</v-icon>
                          </template>
                        </v-tooltip>
                        <v-chip
                          v-for="q in answer.questionnaireRefs"
                          :key="q.id"
                          size="x-small"
                          variant="outlined"
                          class="questionnaire-chip questionnaire-chip--link"
                          @click.stop="navigateToEntry(q.id, group.categoryId, entry.entryId)"
                        >
                          <v-icon start size="10">mdi-open-in-new</v-icon>
                          {{ q.name }}
                        </v-chip>
                      </div>
                    </div>
                    <span v-else class="text-caption text-medium-emphasis">No answers.</span>
                  </v-card-text>
                </div>
              </v-expand-transition>
            </v-card>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <div v-if="!visibleCategoryGroups.length" class="text-body-2 text-medium-emphasis pa-4 text-center">
      No results match the current filter.
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'

export default {
  props: {
    projectId: {
      type: String,
      required: true
    },
    visibilitySettings: {
      type: Object,
      default: () => ({})
    }
  },
  setup (props) {
    const store = useWorkspaceStore()
    const search = ref('')
    const openPanels = ref([])
    const openSubPanels = ref({}) // categoryTitle -> Set<entryId>
    const answerTypeFilter = ref('all')
    const selectedQuestionnaireIds = ref([])

    function isEntryOpen (categoryTitle, entryId) {
      return openSubPanels.value[categoryTitle]?.has(entryId) ?? false
    }

    function toggleEntry (categoryTitle, entryId) {
      if (!openSubPanels.value[categoryTitle]) {
        openSubPanels.value[categoryTitle] = new Set()
      }
      const set = openSubPanels.value[categoryTitle]
      if (set.has(entryId)) {
        set.delete(entryId)
      } else {
        set.add(entryId)
      }
      // trigger reactivity
      openSubPanels.value = { ...openSubPanels.value }
    }

    const project = computed(() =>
      (store.workspace.projects || []).find((p) => p.id === props.projectId) || null
    )

    const questionnaires = computed(() => {
      if (!project.value) return []
      return store.getProjectQuestionnaires(project.value)
    })

    const allQuestionnaires = computed(() =>
      questionnaires.value.map((q) => ({ id: q.id, name: q.name || q.id }))
    )

    // Keep selectedQuestionnaireIds in sync when questionnaires change
    watch(allQuestionnaires, (qs) => {
      const currentSet = new Set(selectedQuestionnaireIds.value)
      qs.forEach((q) => { if (!currentSet.has(q.id)) selectedQuestionnaireIds.value.push(q.id) })
      selectedQuestionnaireIds.value = selectedQuestionnaireIds.value.filter((id) => qs.some((q) => q.id === id))
    }, { immediate: true })

    // Build: [{ categoryTitle, entries: [{ entryId, entryTitle, answers: [{option,status,comment,answerType,questionnaireName}] }] }]
    const categoryGroups = computed(() => {
      const catMap = new Map() // categoryTitle -> Map<entryId, { entryTitle, answers[] }>

      questionnaires.value.forEach((questionnaire) => {
        const categories = Array.isArray(questionnaire?.categories) ? questionnaire.categories : []
        categories
          .filter((c) => !c?.isMetadata)
          .forEach((category) => {
            const catTitle = String(category?.title || '')
            const catId = String(category?.id || '').trim()
            if (!catMap.has(catTitle)) catMap.set(catTitle, { id: catId, entries: new Map() })
            const entryMap = catMap.get(catTitle).entries

            const entries = Array.isArray(category?.entries) ? category.entries : []
            entries.forEach((entry) => {
              const entryId = String(entry?.id || '').trim()
              if (!entryId) return
              if (!entryMap.has(entryId)) {
                entryMap.set(entryId, {
                  entryTitle: String(entry?.aspect || entry?.title || entryId),
                  answers: []
                })
              }
              const entryData = entryMap.get(entryId)
              const answers = Array.isArray(entry?.answers) ? entry.answers : []
              const SKIP = new Set(['unknown', 'does not apply'])
              answers.forEach((answer) => {
                const option = String(answer?.technology || '').trim()
                if (!option || SKIP.has(option.toLowerCase())) return
                entryData.answers.push({
                  option,
                  status: String(answer?.status || '').trim(),
                  comment: String(answer?.comments || '').trim(),
                  answerType: String(answer?.answerType || '').trim(),
                  questionnaireRef: { id: questionnaire.id, name: questionnaire.name || questionnaire.id }
                })
              })
            })
          })
      })

      return Array.from(catMap.entries())
        .map(([categoryTitle, catData]) => ({
          categoryTitle,
          categoryId: catData.id,
          entries: Array.from(catData.entries.entries())
            .map(([entryId, data]) => {
              // Deduplicate: merge questionnaire names for same option+status
              const deduped = new Map() // `${option}||${status}` -> merged answer
              data.answers.forEach((a) => {
                const key = `${a.option.toLowerCase()}||${a.status.toLowerCase()}`
                if (deduped.has(key)) {
                  const existing = deduped.get(key)
                  if (!existing.questionnaireRefs.find((r) => r.id === a.questionnaireRef.id)) {
                    existing.questionnaireRefs.push(a.questionnaireRef)
                  }
                  if (a.comment && !existing.comment) existing.comment = a.comment
                } else {
                  deduped.set(key, { ...a, questionnaireRefs: [a.questionnaireRef] })
                }
              })
              return { entryId, entryTitle: data.entryTitle, answers: Array.from(deduped.values()) }
            })
            .sort((a, b) => a.entryTitle.localeCompare(b.entryTitle))
        }))
        .sort((a, b) => a.categoryTitle.localeCompare(b.categoryTitle))
    })

    const visibleCategoryGroups = computed(() => {
      const term = search.value?.toLowerCase() || ''
      const visSettings = props.visibilitySettings

      return categoryGroups.value
        .filter((group) => {
          // Hide category if explicitly set to false in visibility settings
          if (group.categoryId in visSettings) return visSettings[group.categoryId]
          return true
        })
        .map((group) => {
          const filteredEntries = group.entries
            .filter((entry) => {
              // Hide entry if explicitly set to false in visibility settings
              if (entry.entryId in visSettings) return visSettings[entry.entryId]
              return true
            })
            .map((entry) => {
              let answers = entry.answers

              // Apply questionnaire filter
              if (selectedQuestionnaireIds.value.length < allQuestionnaires.value.length) {
                const selSet = new Set(selectedQuestionnaireIds.value)
                answers = answers.filter((a) => a.questionnaireRefs.some((r) => selSet.has(r.id)))
              }

              // Apply type filter
              if (answerTypeFilter.value !== 'all') {
                answers = answers.filter((a) => a.answerType === answerTypeFilter.value)
              }

              // Apply search
              if (term) {
                answers = answers.filter((a) =>
                  [a.option, a.status, a.comment, a.answerType, ...a.questionnaireRefs.map((r) => r.name)]
                    .some((v) => v.toLowerCase().includes(term))
                  || entry.entryTitle.toLowerCase().includes(term)
                )
              }

              return { ...entry, answers }
            })
            .filter((entry) => {
              // When filter/search active, hide entries with no matching answers
              const hasFilter = answerTypeFilter.value !== 'all' || Boolean(term)
              return hasFilter ? entry.answers.length > 0 : true
            })

          return { ...group, entries: filteredEntries, entryCount: filteredEntries.length }
        })
        .filter((group) => group.entries.length > 0)
    })

    watch(search, (val) => {
      if (val) {
        openPanels.value = visibleCategoryGroups.value.map((g) => g.categoryTitle)
        const next = {}
        visibleCategoryGroups.value.forEach((g) => {
          next[g.categoryTitle] = new Set(g.entries.map((e) => e.entryId))
        })
        openSubPanels.value = next
      }
    })

    watch(answerTypeFilter, (val) => {
      if (val !== 'all') {
        openPanels.value = visibleCategoryGroups.value.map((g) => g.categoryTitle)
        const next = {}
        visibleCategoryGroups.value.forEach((g) => {
          next[g.categoryTitle] = new Set(g.entries.map((e) => e.entryId))
        })
        openSubPanels.value = next
      }
    })

    function expandAll () {
      openPanels.value = visibleCategoryGroups.value.map((g) => g.categoryTitle)
      const next = {}
      visibleCategoryGroups.value.forEach((g) => {
        next[g.categoryTitle] = new Set(g.entries.map((e) => e.entryId))
      })
      openSubPanels.value = next
    }

    function collapseAll () {
      openPanels.value = []
      openSubPanels.value = {}
    }

    function statusChipColor (status) {
      const s = String(status || '').trim().toLowerCase()
      if (s === 'adopt') return 'success'
      if (s === 'retire') return 'error'
      if (!s) return undefined
      return 'warning'
    }

    function navigateToEntry (questionnaireId, categoryId, entryId) {
      store.navigateToEntry(questionnaireId, categoryId, entryId)
    }

    function toggleProjectRadarRef (projectId, entryId, option) {
      store.toggleProjectRadarRef(projectId, entryId, option)
    }

    function isProjectRadarRef (projectId, entryId, option) {
      return store.isProjectRadarRef(projectId, entryId, option)
    }

    return {
      search,
      openPanels,
      openSubPanels,
      answerTypeFilter,
      allQuestionnaires,
      selectedQuestionnaireIds,
      visibleCategoryGroups,
      expandAll,
      collapseAll,
      statusChipColor,
      isEntryOpen,
      toggleEntry,
      navigateToEntry,
      toggleProjectRadarRef,
      isProjectRadarRef
    }
  }
}
</script>

<style scoped>
.entries-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 100%;
  gap: 10px;
  padding: 8px 0;
}

@media (max-width: 1100px) {
  .entries-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .entries-grid {
    grid-template-columns: 1fr;
  }
}

.entry-card {
  display: flex;
  flex-direction: column;
}

.entry-card-title {
  cursor: pointer;
  user-select: none;
  padding: 8px 12px !important;
  font-size: 0.875rem !important;
  min-height: unset !important;
}

.entry-card-title:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.entry-panel-title {
  min-height: 36px !important;
  padding: 6px 16px !important;
}

.entry-panel-title :deep(.v-expansion-panel-title__overlay) {
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.suggestion-row--radar {
  background: rgba(var(--v-theme-primary), 0.07);
  outline: 1px solid rgba(var(--v-theme-primary), 0.25);
}

.radar-toggle-btn {
  flex-shrink: 0;
  opacity: 0.55;
  transition: opacity 0.15s;
}
.radar-toggle-btn:hover,
.suggestion-row--radar .radar-toggle-btn {
  opacity: 1;
}

.suggestion-option {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
}

.type-chip {
  flex-shrink: 0;
}

.questionnaire-chip {
  flex-shrink: 0;
  opacity: 0.75;
}

.questionnaire-chip--link {
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.15s;
}

.questionnaire-chip--link:hover {
  opacity: 1;
}

.comment-icon {
  opacity: 0.6;
  cursor: help;
}
</style>
