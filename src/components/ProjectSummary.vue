<template>
  <div class="project-summary">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon size="18" class="mr-2">mdi-folder</v-icon>
          <span>{{ project?.name || 'Project' }}</span>
        </div>
        <v-chip size="x-small" variant="tonal">
          {{ questionnaires.length }} questionnaires
        </v-chip>
      </v-card-title>

      <v-divider />

      <v-card-text>
        <v-alert v-if="!project" type="warning" density="compact" variant="tonal">
          Project not found.
        </v-alert>

        <div v-else>
          <v-alert v-if="!questionnaires.length" type="info" density="compact" variant="tonal">
            No questionnaires in this project.
          </v-alert>

          <div v-else class="summary-table-wrapper mt-2">
            <v-text-field
              v-model="search"
              label="Search"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              prepend-inner-icon="mdi-magnify"
              class="mb-3"
            />

            <v-expansion-panels variant="accordion" multiple>
              <v-expansion-panel
                v-for="group in categoryGroups"
                :key="group.title"
                :value="group.title"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100">
                    <span class="text-body-2 font-weight-bold">{{ group.title }}</span>
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
                      <tr :class="{ 'row-muted': isUnanswered(rowFromItem(item).id) }">
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
                                    <div class="cell-line" v-bind="props">
                                      <span class="cell-option">{{ line.option }}</span>
                                      <v-chip
                                        v-if="line.status"
                                        size="x-small"
                                        variant="tonal"
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
                                <div v-else class="cell-line">
                                  <span class="cell-option">{{ line.option }}</span>
                                  <v-chip
                                    v-if="line.status"
                                    size="x-small"
                                    variant="tonal"
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
    </v-card>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../stores/workspaceStore'

export default {
  props: {
    projectId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const store = useWorkspaceStore()
    const search = ref('')

    const project = computed(() => {
      return (store.workspace.projects || []).find((p) => p.id === props.projectId) || null
    })

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
                category: String(category?.title || '')
              })
            })
          })
      })

      return result
    })

    const headers = computed(() => {
      const base = [{ title: 'Subcategory', key: 'subcategory', sortable: true }]
      const questionnaireHeaders = questionnaires.value.map((questionnaire) => ({
        title: questionnaire.name,
        key: toQuestionnaireKey(questionnaire.id),
        sortable: false
      }))
      return [...base, ...questionnaireHeaders]
    })

    const items = computed(() => {
      return rows.value.map((row) => {
        const item = {
          id: row.id,
          title: row.title,
          category: row.category || '',
          subcategory: row.title
        }

        questionnaires.value.forEach((questionnaire) => {
          item[toQuestionnaireKey(questionnaire.id)] = cellSearchText(questionnaire.id, row.id)
        })

        return item
      })
    })

    const categoryGroups = computed(() => {
      const counts = new Map()
      rows.value.forEach((row) => {
        const key = String(row.category || '').trim() || 'Other'
        counts.set(key, (counts.get(key) || 0) + 1)
      })

      return Array.from(counts.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => a.title.localeCompare(b.title))
    })

    function itemsForCategory(categoryTitle) {
      const key = String(categoryTitle || '').trim() || 'Other'
      return items.value
        .filter((item) => (String(item.category || '').trim() || 'Other') === key)
        .slice()
        .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }))
    }

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

    function extractLines(entry) {
      const answers = Array.isArray(entry?.answers) ? entry.answers : []
      const lines = answers
        .map((answer) => ({
          option: String(answer?.technology || '').trim(),
          status: String(answer?.status || '').trim(),
          comment: String(answer?.comments || '').trim()
        }))
        .filter((line) => Boolean(line.option))

      lines.sort((a, b) => a.option.localeCompare(b.option, undefined, { sensitivity: 'base' }))
      return lines
    }

    function cellLines(questionnaireId, entryId) {
      return matrix.value?.[questionnaireId]?.[entryId] || []
    }

    function toQuestionnaireKey(questionnaireId) {
      return `q_${questionnaireId}`
    }

    function fromQuestionnaireKey(key) {
      return String(key || '').startsWith('q_') ? String(key).slice(2) : ''
    }

    function cellLinesByKey(columnKey, entryId) {
      const questionnaireId = fromQuestionnaireKey(columnKey)
      if (!questionnaireId) return []
      return cellLines(questionnaireId, entryId)
    }

    function cellSearchText(questionnaireId, entryId) {
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

    function rowFromItem(item) {
      // v-data-table passes a DataTableItem where the original object is in item.raw
      return item?.raw || item
    }

    function isUnanswered(entryId) {
      if (!entryId) return true
      return questionnaires.value.every((questionnaire) => {
        return cellLines(questionnaire.id, entryId).length === 0
      })
    }

    return {
      project,
      questionnaires,
      rows,
      headers,
      items,
      categoryGroups,
      itemsForCategory,
      search,
      cellLinesByKey,
      rowFromItem,
      isUnanswered
    }
  }
}
</script>

<style scoped>
.project-summary {
  min-height: 60vh;
}

.summary-table-wrapper {
  overflow: auto;
  border: 1px solid #ECEFF1;
  border-radius: 6px;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
  min-width: 240px;
  max-width: 360px;
}

.row-title {
  font-weight: 600;
}

.row-category {
  font-size: 12px;
  color: #607D8B;
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

.cell-option {
  font-size: 13px;
}

.cell-empty {
  color: #90A4AE;
}

.row-muted {
  opacity: 0.45;
}

.comment-indicator {
  opacity: 0.85;
}
</style>
