<template>
  <v-card-text>
    <v-alert v-if="!project" type="warning" density="compact" variant="tonal">
      Project not found.
    </v-alert>

    <div v-else>
      <v-alert v-if="!questionnaires.length" type="info" density="compact" variant="tonal">
        No questionnaires in this project.
      </v-alert>

      <div v-else class="summary-table-wrapper mt-2">
        <div class="d-flex align-center mb-3" style="gap: 8px;">
          <v-btn-toggle
            v-model="answerTypeFilter"
            density="compact"
            variant="outlined"
            divided
            mandatory
            rounded="lg"
            class="mx-2"
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
          <v-tooltip text="Expand all" location="top">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                size="small"
                variant="text"
                icon="mdi-unfold-more-horizontal"
                @click="expandAll"
              />
            </template>
          </v-tooltip>
          <v-tooltip text="Collapse all" location="top">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                size="small"
                variant="text"
                icon="mdi-unfold-less-horizontal"
                @click="collapseAll"
              />
            </template>
          </v-tooltip>
        </div>

        <v-expansion-panels v-model="openPanels" variant="accordion" multiple>
          <v-expansion-panel
            v-for="group in categoryGroups"
            :key="group.title"
            :value="group.title"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100">
                <div class="d-flex align-center" style="gap: 6px;">
                  <v-icon v-if="categoryHasViolation(group.title)" size="15" color="error">mdi-exclamation-thick</v-icon>
                  <span class="text-body-2 font-weight-bold">{{ group.title }}</span>
                </div>
                <v-chip size="x-small" variant="tonal">{{ group.count }}</v-chip>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <v-data-table
                :headers="headers"
                :items="itemsForCategory(group.title)"
                :search="search"
                item-key="id"
                density="compact"
                class="project-summary-table"
                :items-per-page="-1"
                hide-default-footer
              >
                <template #item="{ item, columns }">
                  <tr :class="{ 'row-muted': isUnanswered(rowFromItem(item).id), 'row-violation': isViolation(rowFromItem(item)) }">
                    <td
                      v-for="col in columns"
                      :key="col.key"
                      :class="{ 'sticky-col': col.key === 'subcategory' }"
                    >
                      <template v-if="col.key === 'subcategory'">
                        <div class="row-title">{{ rowFromItem(item).title }}</div>
                      </template>

                      <template v-else>
                        <div v-if="cellLinesByKey(col.key, rowFromItem(item).id).length" class="cell-lines">
                          <template
                            v-for="(line, idx) in cellLinesByKey(col.key, rowFromItem(item).id)"
                            :key="idx"
                          >
                            <v-tooltip v-if="line.comment" :text="line.comment" location="top">
                              <template #activator="{ props }">
                                <div
                                  class="cell-line"
                                  :class="{ 'cell-line--radar': isProjectRadarRef(projectId, rowFromItem(item).id, line.option) }"
                                  v-bind="props"
                                >
                                  <v-btn
                                    size="x-small"
                                    variant="text"
                                    :color="isProjectRadarRef(projectId, rowFromItem(item).id, line.option) ? 'primary' : 'default'"
                                    icon
                                    class="cell-radar-btn"
                                    @click.stop="toggleProjectRadarRef(projectId, rowFromItem(item).id, line.option, col.key)"
                                  >
                                    <v-icon size="12">mdi-radar</v-icon>
                                  </v-btn>
                                  <v-tooltip text="Jump to entry in questionnaire" location="top">
                                    <template #activator="{ props: navProps }">
                                      <v-btn
                                        v-bind="navProps"
                                        size="x-small"
                                        variant="text"
                                        icon
                                        class="cell-nav-btn"
                                        @click.stop="navigateToCellEntry(col.key, rowFromItem(item).categoryId, rowFromItem(item).id)"
                                      >
                                        <v-icon size="12">mdi-open-in-new</v-icon>
                                      </v-btn>
                                    </template>
                                  </v-tooltip>
                                  <span class="cell-option">{{ line.option }}</span>
                                  <v-chip
                                    v-if="line.status"
                                    size="x-small"
                                    variant="tonal"
                                    :color="statusChipColor(line.status)"
                                    class="ml-2"
                                  >
                                    {{ line.status }}
                                  </v-chip>
                                  <v-icon
                                    size="14"
                                    class="ml-1 comment-indicator"
                                    aria-label="Has comment"
                                  >
                                    mdi-comment-text-outline
                                  </v-icon>
                                </div>
                              </template>
                            </v-tooltip>
                            <div
                              v-else
                              class="cell-line"
                              :class="{ 'cell-line--radar': isProjectRadarRef(projectId, rowFromItem(item).id, line.option) }"
                            >
                              <v-btn
                                size="x-small"
                                variant="text"
                                :color="isProjectRadarRef(projectId, rowFromItem(item).id, line.option) ? 'primary' : 'default'"
                                icon
                                class="cell-radar-btn"
                              @click.stop="toggleProjectRadarRef(projectId, rowFromItem(item).id, line.option, col.key)"
                              >
                                <v-icon size="12">mdi-radar</v-icon>
                              </v-btn>
                              <v-tooltip text="Jump to entry in questionnaire" location="top">
                                <template #activator="{ props: navProps }">
                                  <v-btn
                                    v-bind="navProps"
                                    size="x-small"
                                    variant="text"
                                    icon
                                    class="cell-nav-btn"
                                    @click.stop="navigateToCellEntry(col.key, rowFromItem(item).categoryId, rowFromItem(item).id)"
                                  >
                                    <v-icon size="12">mdi-open-in-new</v-icon>
                                  </v-btn>
                                </template>
                              </v-tooltip>
                              <span class="cell-option">{{ line.option }}</span>
                              <v-chip
                                v-if="line.status"
                                size="x-small"
                                variant="tonal"
                                :color="statusChipColor(line.status)"
                                class="ml-2"
                              >
                                {{ line.status }}
                              </v-chip>
                            </div>
                          </template>
                        </div>
                        <span v-else class="cell-empty">–</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </v-data-table>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>
  </v-card-text>

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
    deviationSettings: {
      type: Object,
      default: () => ({})
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
    const answerTypeFilter = ref('all')

    const project = computed(() =>
      (store.workspace.projects || []).find((p) => p.id === props.projectId) || null
    )

    const questionnaires = computed(() => {
      if (!project.value) return []
      return store.getProjectQuestionnaires(project.value)
    })

    const rows = computed(() => {
      const result = []
      const seen = new Set()
      questionnaires.value.forEach((questionnaire) => {
        const categories = Array.isArray(questionnaire?.categories) ? questionnaire.categories : []
        categories
          .filter((category) => !category?.isMetadata)
          .forEach((category) => {
            const entries = Array.isArray(category?.entries) ? category.entries : []
            entries.forEach((entry) => {
              const id = String(entry?.id || '').trim()
              if (!id || seen.has(id)) return
              seen.add(id)
              result.push({
                id,
                title: String(entry?.aspect || entry?.title || id),
                category: String(category?.title || ''),
                categoryId: String(category?.id || '')
              })
            })
          })
      })
      return result.sort((a, b) =>
        String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' })
      )
    })

    const deviationSettings = computed(() => props.deviationSettings)
    const visibilitySettings = computed(() => props.visibilitySettings)

    function isEntryVisible (row) {
      const settings = visibilitySettings.value
      if (row.id in settings) return settings[row.id]
      if (row.categoryId in settings) return settings[row.categoryId]
      return true
    }

    const visibleRows = computed(() => rows.value.filter((row) => isEntryVisible(row)))

    const matrix = computed(() => {
      const out = {}
      questionnaires.value.forEach((questionnaire) => {
        const qId = questionnaire.id
        out[qId] = {}
        const categories = Array.isArray(questionnaire?.categories) ? questionnaire.categories : []
        categories
          .filter((category) => !category?.isMetadata)
          .forEach((category) => {
            const entries = Array.isArray(category?.entries) ? category.entries : []
            entries.forEach((entry) => {
              const entryId = String(entry?.id || '').trim()
              if (!entryId) return
              out[qId][entryId] = extractLines(entry)
            })
          })
      })
      return out
    })

    function extractLines (entry) {
      const answers = Array.isArray(entry?.answers) ? entry.answers : []
      const lines = answers
        .map((answer) => ({
          option: String(answer?.technology || '').trim(),
          status: String(answer?.status || '').trim(),
          comment: String(answer?.comments || '').trim(),
          answerType: String(answer?.answerType || '').trim()
        }))
        .filter((line) => Boolean(line.option))
      lines.sort((a, b) => a.option.localeCompare(b.option, undefined, { sensitivity: 'base' }))
      return lines
    }

    function cellLines (questionnaireId, entryId) {
      const lines = matrix.value?.[questionnaireId]?.[entryId] || []
      if (answerTypeFilter.value === 'all') return lines
      return lines.filter((line) => line.answerType === answerTypeFilter.value)
    }

    function toQuestionnaireKey (questionnaireId) {
      return `q_${questionnaireId}`
    }

    function fromQuestionnaireKey (key) {
      return String(key || '').startsWith('q_') ? String(key).slice(2) : ''
    }

    function cellLinesByKey (columnKey, entryId) {
      const questionnaireId = fromQuestionnaireKey(columnKey)
      if (!questionnaireId) return []
      return cellLines(questionnaireId, entryId)
    }

    function cellSearchText (questionnaireId, entryId) {
      const lines = cellLines(questionnaireId, entryId)
      if (!lines.length) return ''
      return lines
        .map((line) => {
          const parts = [line.option]
          if (line.status) parts.push(line.status)
          if (line.comment) parts.push(line.comment)
          return parts.join(' ')
        })
        .join('\n')
    }

    const headers = computed(() => {
      const base = [{ title: '', key: 'subcategory', sortable: false }]
      const qHeaders = questionnaires.value.map((q) => ({
        title: q.name,
        key: toQuestionnaireKey(q.id),
        sortable: false
      }))
      return [...base, ...qHeaders]
    })

    const items = computed(() => {
      return rows.value.map((row) => {
        const item = {
          id: row.id,
          title: row.title,
          category: row.category || '',
          categoryId: row.categoryId || '',
          subcategory: row.title
        }
        questionnaires.value.forEach((q) => {
          item[toQuestionnaireKey(q.id)] = cellSearchText(q.id, row.id)
        })
        return item
      })
    })

    function matchesSearch (item) {
      if (!search.value) return true
      const term = search.value.toLowerCase()
      return Object.values(item).some((v) => String(v).toLowerCase().includes(term))
    }

    function entryHasFilteredAnswers (entryId) {
      if (answerTypeFilter.value === 'all') return true
      return questionnaires.value.some((q) => cellLines(q.id, entryId).length > 0)
    }

    const categoryGroups = computed(() => {
      const counts = new Map()
      visibleRows.value.forEach((row) => {
        if (!entryHasFilteredAnswers(row.id)) return
        const key = String(row.category || '').trim() || 'Other'
        counts.set(key, 0)
      })
      items.value.forEach((item) => {
        if (!entryHasFilteredAnswers(item.id)) return
        if (matchesSearch(item)) {
          const key = String(item.category || '').trim() || 'Other'
          if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1)
        }
      })
      return Array.from(counts.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => a.title.localeCompare(b.title))
    })

    function itemsForCategory (categoryTitle) {
      const key = String(categoryTitle || '').trim() || 'Other'
      return items.value
        .filter((item) => (String(item.category || '').trim() || 'Other') === key)
        .filter((item) => isEntryVisible(item))
        .filter((item) => entryHasFilteredAnswers(item.id))
        .slice()
        .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }))
    }

    function rowFromItem (item) {
      return item?.raw || item
    }

    function isDeviationAllowed (row) {
      const settings = deviationSettings.value
      if (row.id in settings) return !settings[row.id]
      if (row.categoryId in settings) return !settings[row.categoryId]
      return true
    }

    function hasDeviation (entryId) {
      const refId = project.value?.referenceQuestionnaireId
      const refQuestionnaire = refId ? questionnaires.value.find((q) => q.id === refId) : null

      if (refQuestionnaire) {
        const refLines = cellLines(refQuestionnaire.id, entryId)
        if (!refLines.length) return false
        const refMap = new Map(refLines.map((l) => [l.option, l.status]))
        return questionnaires.value
          .filter((q) => q.id !== refQuestionnaire.id)
          .some((q) => {
            const qLines = cellLines(q.id, entryId)
            if (!qLines.length) return false
            for (const line of qLines) {
              if (refMap.has(line.option) && refMap.get(line.option) !== line.status) return true
            }
            if (qLines.some((l) => !refMap.has(l.option))) return true
            return false
          })
      }

      const techStatusMap = new Map()
      for (const q of questionnaires.value) {
        for (const line of cellLines(q.id, entryId)) {
          if (!techStatusMap.has(line.option)) {
            techStatusMap.set(line.option, line.status)
          } else if (techStatusMap.get(line.option) !== line.status) {
            return true
          }
        }
      }
      return false
    }

    function isViolation (row) {
      if (!row?.id) return false
      if (isDeviationAllowed(row)) return false
      return hasDeviation(row.id)
    }

    const categoryHasViolation = (categoryTitle) => {
      const key = String(categoryTitle || '').trim() || 'Other'
      return visibleRows.value
        .filter((r) => (String(r.category || '').trim() || 'Other') === key)
        .some((r) => isViolation(r))
    }

    function isUnanswered (entryId) {
      if (!entryId) return true
      return questionnaires.value.every((q) => cellLines(q.id, entryId).length === 0)
    }

    watch(search, (val) => {
      if (val) openPanels.value = categoryGroups.value.map((g) => g.title)
    })

    function expandAll () {
      openPanels.value = categoryGroups.value.map((g) => g.title)
    }

    function collapseAll () {
      openPanels.value = []
    }

    function statusChipColor (status) {
      const normalized = String(status || '').trim().toLowerCase()
      if (normalized === 'adopt') return 'success'
      if (normalized === 'retire') return 'error'
      if (!normalized) return undefined
      return 'warning'
    }

    function navigateToCellEntry (columnKey, categoryId, entryId) {
      const questionnaireId = fromQuestionnaireKey(columnKey)
      if (!questionnaireId) return
      store.navigateToEntry(questionnaireId, categoryId, entryId)
    }

    return {
      project,
      questionnaires,
      headers,
      items,
      categoryGroups,
      itemsForCategory,
      search,
      openPanels,
      expandAll,
      collapseAll,
      cellLinesByKey,
      rowFromItem,
      isUnanswered,
      statusChipColor,
      isViolation,
      categoryHasViolation,
      answerTypeFilter,
      toggleProjectRadarRef: (projectId, entryId, option, columnKey) =>
        store.toggleProjectRadarRef(projectId, entryId, option, fromQuestionnaireKey(columnKey)),
      isProjectRadarRef: store.isProjectRadarRef,
      navigateToCellEntry
    }
  }
}
</script>

<style scoped>
.summary-table-wrapper {
  overflow: auto;
  border: 1px solid #ECEFF1;
  border-radius: 6px;
}

.project-summary-table :deep(.v-data-table__tr--header th),
.project-summary-table :deep(.v-data-table__th) {
  font-weight: 700 !important;
  background: rgb(var(--v-theme-surface)) !important;
  border-bottom: 2px solid rgba(var(--v-theme-on-surface), 0.16) !important;
}

.project-summary-table :deep(.v-data-table-header__content) {
  font-weight: 700 !important;
}

.project-summary-table :deep(.v-data-table__tr--header th:first-child) {
  min-width: 240px;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: rgb(var(--v-theme-surface));
  z-index: 1;
  min-width: 240px;
  max-width: 360px;
}

.row-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
}

.cell-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cell-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.cell-line--radar {
  background: rgba(var(--v-theme-primary), 0.07);
  outline: 1px solid rgba(var(--v-theme-primary), 0.22);
  border-radius: 3px;
  padding: 1px 2px;
}

.cell-radar-btn {
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.12s;
  width: 18px !important;
  height: 18px !important;
}
.cell-radar-btn:hover,
.cell-line--radar .cell-radar-btn {
  opacity: 1;
}

.cell-nav-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s;
  width: 18px !important;
  height: 18px !important;
}
.cell-line:hover .cell-nav-btn {
  opacity: 0.7;
}
.cell-nav-btn:hover {
  opacity: 1 !important;
}

.cell-option {
  font-size: 13px;
}

.cell-empty {
  color: #90A4AE;
}

.row-muted {
  opacity: 0.45;
}

.project-summary-table :deep(tr.row-violation td) {
  background: rgba(255, 152, 0, 0.15) !important;
}
</style>
