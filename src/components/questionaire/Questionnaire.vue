<template>
  <div>
    <v-row>
      <v-col cols="12" md="3">
        <v-list two-line>
          <v-list-item
            v-for="cat in visibleCategories"
            :key="cat.id"
            :active="cat.id === currentCategory.id"
            :disabled="!categoryHasVisibleEntries(cat)"
            :class="{ 'text--disabled': !categoryHasVisibleEntries(cat) }"
            @click="selectCategory(cat.id)"
          >
            <v-list-item-title>{{ cat.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ cat.desc }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <div class="px-4 mt-3">
          <v-select
            v-model="applicabilityFilter"
            :items="applicabilityFilterOptions"
            label="Filter by Applicability"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>
      </v-col>

      <v-col cols="12" md="9">
        <v-card>
          <v-card-title>
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center gap-2">
                <h2>{{ currentCategory.title }}</h2>
                <v-chip
                  v-if="currentCategoryHiddenCount > 0"
                  size="x-small"
                  variant="text"
                  class="hidden-entries-chip"
                  @click.stop="showAllEntries"
                >
                  <v-icon start size="12">mdi-eye-off-outline</v-icon>
                  {{ currentCategoryHiddenCount }} hidden
                </v-chip>
                <v-btn
                  v-if="currentCategory.isMetadata"
                  icon
                  size="small"
                  variant="text"
                  @click="$emit('open-config')"
                >
                  <v-icon>mdi-cog</v-icon>
                  <v-tooltip activator="parent" location="bottom">Configuration</v-tooltip>
                </v-btn>
              </div>
              <v-select
                v-if="!currentCategory.isMetadata && visibleEntries.length > 0"
                :items="applicabilityItems"
                item-title="label"
                item-value="label"
                label="Set all to"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 220px;"
                @update:model-value="setAllApplicability"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </div>
          </v-card-title>
          <v-card-subtitle class="px-4">{{ currentCategory.desc }}</v-card-subtitle>
          <v-card-text>
            <!-- Solution Description Metadata Form -->
            <div v-if="currentCategory.isMetadata" class="mt-4">
              <v-alert
                v-if="!architecturalRoleValue"
                type="info"
                variant="tonal"
                class="mb-4"
              >
                Please select an Architectural Role to unlock the remaining categories.
              </v-alert>
              <v-row dense>
                <v-col cols="12">
                  <v-text-field
                    label="Software Product"
                    :model-value="currentCategory.metadata.productName"
                    @blur="currentCategory.metadata.productName = $event.target.value"
                    @click:clear="currentCategory.metadata.productName = ''"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Company"
                    :model-value="currentCategory.metadata.company"
                    @blur="currentCategory.metadata.company = $event.target.value"
                    @click:clear="currentCategory.metadata.company = ''"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Department"
                    :model-value="currentCategory.metadata.department"
                    @blur="currentCategory.metadata.department = $event.target.value"
                    @click:clear="currentCategory.metadata.department = ''"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Contact Person"
                    :model-value="currentCategory.metadata.contactPerson"
                    @blur="currentCategory.metadata.contactPerson = $event.target.value"
                    @click:clear="currentCategory.metadata.contactPerson = ''"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-select
                    label="Execution Type"
                    :items="currentCategory.metadataOptions?.executionType || []"
                    item-title="label"
                    item-value="label"
                    v-model="currentCategory.metadata.executionType"
                    clearable
                  >
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props">
                        <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12">
                  <v-select
                    label="Architectural Role"
                    :items="currentCategory.metadataOptions?.architecturalRole || []"
                    item-title="label"
                    item-value="label"
                    v-model="currentCategory.metadata.architecturalRole"
                    clearable
                  >
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props">
                        <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    label="Description"
                    :model-value="currentCategory.metadata.description"
                    @blur="currentCategory.metadata.description = $event.target.value"
                    placeholder="Brief description of the software product..."
                    rows="4"
                    auto-grow
                  />
                </v-col>
                <v-col v-if="parentProject" cols="12">
                  <v-divider class="mb-3" />
                  <v-switch
                    :model-value="isReference"
                    color="primary"
                    hide-details
                    density="compact"
                    label="Referenzkatalog für Projektvergleich"
                    @update:model-value="toggleReference"
                  />
                  <div class="text-caption text-medium-emphasis mt-1">
                    Wird dieser Fragenkatalog als Referenz markiert, werden alle anderen Kataloge
                    im Projektvergleich gegen diesen verglichen.
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Regular entries for other categories -->
            <div v-else>
              <div class="d-flex align-center mb-4">
                <v-text-field
                  v-model="entrySearch"
                  prepend-inner-icon="mdi-magnify"
                  label="Search questions"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  class="flex-grow-1"
                />
                <v-btn
                  :color="entrySort ? 'primary' : 'default'"
                  variant="text"
                  size="small"
                  class="ml-3"
                  @click="cycleSort"
                >
                  <v-icon>{{ entrySort === 'asc' ? 'mdi-sort-alphabetical-ascending' : entrySort === 'desc' ? 'mdi-sort-alphabetical-descending' : 'mdi-sort-variant' }}</v-icon>
                  <v-tooltip activator="parent" location="bottom">{{ entrySort === 'asc' ? 'Sorted A→Z (click for Z→A)' : entrySort === 'desc' ? 'Sorted Z→A (click to reset)' : 'Sort alphabetically' }}</v-tooltip>
                </v-btn>
              </div>
              <div v-for="entry in visibleEntries" :key="entry.id" :data-entry-id="entry.id" class="mb-6">
                <v-sheet class="pa-3" elevation="1">
                  <div class="d-flex justify-space-between align-start">
                    <div class="flex-grow-1">
                      <div class="d-flex align-center entry-title-row">
                        <span class="text-h6 font-weight-bold">{{ entry.aspect }}</span>
                        <v-tooltip text="Hide this entry" location="top">
                          <template #activator="{ props: hideTipProps }">
                            <v-btn
                              v-bind="hideTipProps"
                              size="x-small"
                              variant="text"
                              icon
                              class="entry-hide-btn ml-1"
                              @click.stop="hideEntry(entry.id)"
                            >
                              <v-icon size="14">mdi-eye-off-outline</v-icon>
                            </v-btn>
                          </template>
                        </v-tooltip>
                      </div>
                      <div v-if="entry.description" class="text-body-2 mt-1" v-html="renderTextWithLinks(entry.description)"></div>
                      <div v-if="getExampleItems(entry.examples).length" class="text--secondary text-sm mt-1">
                        <strong>Examples: </strong>
                        <span v-for="(example, eIdx) in getExampleItems(entry.examples)" :key="`${entry.id}-ex-${eIdx}`">
                          <v-tooltip v-if="example.description" :text="example.description" location="top">
                            <template v-slot:activator="{ props }">
                              <span v-bind="props" class="example-item">{{ example.label }}</span>
                            </template>
                          </v-tooltip>
                          <span v-else class="example-item">{{ example.label }}</span>
                          <span v-if="eIdx < getExampleItems(entry.examples).length - 1">, </span>
                        </span>
                      </div>
                    </div>
                    <div class="ml-4" style="min-width: 190px;">
                      <v-select
                        v-model="entry.applicability"
                        :items="applicabilityItems"
                        item-title="label"
                        item-value="label"
                        density="compact"
                        variant="plain"
                        hide-details
                        @update:model-value="setApplicability(entry, $event)"
                      >
                        <template #item="{ props, item }">
                          <v-list-item v-bind="props">
                            <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                          </v-list-item>
                        </template>
                      </v-select>
                    </div>
                  </div>

                  <!-- Entry-Level Comment (always visible) -->
                  <div class="mt-4">
                    <v-textarea
                      label="General Comment"
                      :model-value="entry.entryComment"
                      @blur="entry.entryComment = $event.target.value"
                      rows="2"
                      density="compact"
                      variant="outlined"
                      placeholder="Add a general comment for this subcategory..."
                      class="resizable-textarea"
                    />
                  </div>

                  <!-- Divider before answers -->
                  <v-divider v-if="isEntryApplicable(entry)" class="my-4"></v-divider>

                  <!-- Antworten pro Entry -->
                  <div v-if="isEntryApplicable(entry)">
                    <div class="text-subtitle-2 mb-3 text--secondary">Answers</div>
                    <div v-for="(answer, aIdx) in entry.answers" :key="aIdx" class="mt-4 pa-2 border-l-4 border-info">
                      <v-row dense>
                        <v-col cols="12" md="2">
                          <v-select
                            label="Type"
                            v-model="answer.answerType"
                            :items="answerTypeOptions"
                            item-title="label"
                            item-value="value"
                            clearable
                            hide-details
                          >
                            <template #item="{ props, item }">
                              <v-list-item v-bind="props">
                                <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                              </v-list-item>
                            </template>
                          </v-select>
                        </v-col>

                        <v-col cols="12" md="7">
                          <v-combobox
                            label="Solution"
                            v-model="answer.technology"
                            :items="getSuggestions(entry)"
                            clearable
                            hide-details
                          />
                        </v-col>

                        <v-col cols="12" md="3">
                          <div class="d-flex align-center gap-2">
                            <v-select
                              label="Status"
                              :items="statusOptions"
                              item-title="label"
                              item-value="label"
                              v-model="answer.status"
                              class="flex-grow-1"
                              hide-details
                            >
                              <template #item="{ props, item }">
                                <v-list-item v-bind="props">
                                  <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                                </v-list-item>
                              </template>
                            </v-select>
                            <v-btn
                              size="small"
                              color="error"
                              variant="text"
                              icon
                              @click="deleteAnswer(entry.id, aIdx)"
                              v-if="entry.answers.length > 1"
                            >
                              <v-icon>mdi-delete</v-icon>
                            </v-btn>
                          </div>
                        </v-col>

                        <v-col cols="12">
                          <v-textarea
                            label="Comment"
                            :model-value="answer.comments"
                            @blur="answer.comments = $event.target.value"
                            rows="2"
                            class="resizable-textarea"
                          />
                        </v-col>
                      </v-row>
                    </div>

                    <!-- Button fuer neue Antwort -->
                    <div class="mt-3">
                      <v-btn size="small" color="secondary" @click="addAnswer(entry.id)">
                        + Add Answer
                      </v-btn>
                    </div>
                  </div>
                </v-sheet>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn icon color="primary" @click="prevCategory" :disabled="!hasPrev">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <v-spacer />
            <v-btn icon color="primary" @click="nextCategory" :disabled="!hasNext">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'

export default {
  props: {
    categories: {
      type: Array,
      required: true
    },
    questionnaireId: {
      type: String,
      default: ''
    }
  },
  emits: ['update-categories', 'open-config'],
  setup (props) {
    const store = useWorkspaceStore()

    const parentProject = computed(() => {
      if (!props.questionnaireId) return null
      return (store.workspace.projects || []).find((p) =>
        (p.questionnaireIds || []).includes(props.questionnaireId)
      ) || null
    })

    const isReference = computed(() => {
      return parentProject.value?.referenceQuestionnaireId === props.questionnaireId
    })

    function toggleReference() {
      if (!parentProject.value || !props.questionnaireId) return
      store.setReferenceQuestionnaire(parentProject.value.id, props.questionnaireId)
    }
    const applicabilityDescriptions = {
      applicable: 'Entry applies and should be filled in.',
      'not applicable': 'Entry does not apply to this solution.',
      unknown: 'Applicability is not known yet.'
    }
    const metadataCategory = computed(() => props.categories.find((category) => category.isMetadata) || null)
    const metadataValue = computed(() => metadataCategory.value?.metadata || null)
    const architecturalRoleValue = computed(() => metadataValue.value?.architecturalRole || '')
    const activeCategoryId = ref('')
    const applicabilityFilter = ref('all')
    const entrySearch = ref('')
    const entrySort = ref('')

    const hiddenEntries = computed(() =>
      props.questionnaireId ? store.getQuestionnaireHiddenEntries(props.questionnaireId) : new Set()
    )

    function hideEntry(entryId) {
      if (!props.questionnaireId) return
      const updated = new Set([...hiddenEntries.value, entryId])
      store.setQuestionnaireHiddenEntries(props.questionnaireId, updated)
    }

    function showAllEntries() {
      if (!props.questionnaireId) return
      store.setQuestionnaireHiddenEntries(props.questionnaireId, new Set())
    }

    function cycleSort() {
      if (entrySort.value === '') entrySort.value = 'asc'
      else if (entrySort.value === 'asc') entrySort.value = 'desc'
      else entrySort.value = ''
    }

    function toArray(value) {
      if (!value) return []
      return Array.isArray(value) ? value : [value]
    }

    function appliesToMatches(appliesTo, metadata) {
      if (!appliesTo) return true
      if (!metadata) return false

      return Object.entries(appliesTo).every(([key, allowed]) => {
        const metadataValue = metadata[key]
        if (!metadataValue) return false
        if (metadataValue === 'Not specified') return true
        const allowedValues = toArray(allowed)
        return allowedValues.includes(metadataValue)
      })
    }

    const visibleCategories = computed(() => {
      const allCategories = Array.isArray(props.categories) ? props.categories : []
      if (!architecturalRoleValue.value) {
        return metadataCategory.value ? [metadataCategory.value] : allCategories.slice(0, 1)
      }

      return allCategories.filter((category) => {
        if (category.isMetadata) return true
        return appliesToMatches(category.appliesTo, metadataValue.value)
      })
    })

    watch(visibleCategories, (value) => {
      if (!value.length) {
        activeCategoryId.value = ''
        return
      }
      if (!value.find((category) => category.id === activeCategoryId.value)) {
        activeCategoryId.value = value[0].id
      }
    }, { immediate: true })

    const currentCategory = computed(() => {
      return visibleCategories.value.find((category) => category.id === activeCategoryId.value) || {
        title: '',
        desc: '',
        isMetadata: false,
        entries: []
      }
    })

    const visibleEntries = computed(() => {
      const entries = Array.isArray(currentCategory.value.entries) ? currentCategory.value.entries : []
      let result = entries.filter((entry) => appliesToMatches(entry.appliesTo, metadataValue.value))

      if (applicabilityFilter.value !== 'all') {
        result = result.filter((entry) => {
          const entryApplicability = entry.applicability || 'applicable'
          return entryApplicability === applicabilityFilter.value
        })
      }

      if (entrySearch.value && entrySearch.value.trim()) {
        const q = entrySearch.value.trim().toLowerCase()
        result = result.filter((entry) =>
          (entry.aspect || '').toLowerCase().includes(q) ||
          (entry.description || '').toLowerCase().includes(q)
        )
      }

      if (entrySort.value === 'asc') {
        result = [...result].sort((a, b) => (a.aspect || '').localeCompare(b.aspect || ''))
      } else if (entrySort.value === 'desc') {
        result = [...result].sort((a, b) => (b.aspect || '').localeCompare(a.aspect || ''))
      }

      return result.filter((entry) => !hiddenEntries.value.has(entry.id))
    })

    const currentCategoryHiddenCount = computed(() => {
      const entries = Array.isArray(currentCategory.value.entries) ? currentCategory.value.entries : []
      let result = entries.filter((entry) => appliesToMatches(entry.appliesTo, metadataValue.value))
      if (applicabilityFilter.value !== 'all') {
        result = result.filter((entry) => (entry.applicability || 'applicable') === applicabilityFilter.value)
      }
      return result.filter((entry) => hiddenEntries.value.has(entry.id)).length
    })

    const applicabilityFilterOptions = computed(() => {
      return [
        { title: 'All', value: 'all' },
        ...store.applicabilityOptions.map((label) => ({
          title: label.charAt(0).toUpperCase() + label.slice(1),
          value: label
        }))
      ]
    })

    const applicabilityItems = computed(() => {
      return store.applicabilityOptions.map((label) => ({
        label,
        description: applicabilityDescriptions[label] || ''
      }))
    })

    const hasNext = computed(() => {
      return visibleCategories.value.findIndex((category) => category.id === activeCategoryId.value) < visibleCategories.value.length - 1
    })

    const hasPrev = computed(() => {
      return visibleCategories.value.findIndex((category) => category.id === activeCategoryId.value) > 0
    })

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function selectCategory(id) {
      activeCategoryId.value = id
      entrySearch.value = ''
      entrySort.value = ''
      scrollToTop()
    }

    // Navigate to a specific entry triggered from suggestions view
    function applyPendingNavigation(nav) {
      if (!nav || nav.questionnaireId !== props.questionnaireId) return
      activeCategoryId.value = nav.categoryId
      function tryScroll(attempts) {
        nextTick(() => {
          const el = document.querySelector(`[data-entry-id="${nav.entryId}"]`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.add('entry-highlighted')
            setTimeout(() => el.classList.remove('entry-highlighted'), 2000)
            store.clearPendingNavigation()
          } else if (attempts > 0) {
            setTimeout(() => tryScroll(attempts - 1), 80)
          } else {
            store.clearPendingNavigation()
          }
        })
      }
      tryScroll(10)
    }

    watch(() => store.pendingNavigation, applyPendingNavigation)

    onMounted(() => {
      if (store.pendingNavigation) applyPendingNavigation(store.pendingNavigation)
    })

    function nextCategory() {
      const idx = visibleCategories.value.findIndex((category) => category.id === activeCategoryId.value)
      if (idx < visibleCategories.value.length - 1) {
        activeCategoryId.value = visibleCategories.value[idx + 1].id
        entrySearch.value = ''
        entrySort.value = ''
        scrollToTop()
      }
    }

    function prevCategory() {
      const idx = visibleCategories.value.findIndex((category) => category.id === activeCategoryId.value)
      if (idx > 0) {
        activeCategoryId.value = visibleCategories.value[idx - 1].id
        entrySearch.value = ''
        entrySort.value = ''
        scrollToTop()
      }
    }

    function categoryHasVisibleEntries(category) {
      if (category.isMetadata) return true
      
      const entries = Array.isArray(category.entries) ? category.entries : []
      const filteredByMetadata = entries.filter((entry) => appliesToMatches(entry.appliesTo, metadataValue.value))
      
      if (applicabilityFilter.value === 'all') {
        return filteredByMetadata.length > 0
      }
      
      const filteredByApplicability = filteredByMetadata.filter((entry) => {
        const entryApplicability = entry.applicability || 'applicable'
        return entryApplicability === applicabilityFilter.value
      })
      
      return filteredByApplicability.length > 0
    }

    function setAllApplicability(value) {
      if (!value || currentCategory.value.isMetadata) return
      
      const entries = Array.isArray(currentCategory.value.entries) ? currentCategory.value.entries : []
      const entriesToUpdate = entries.filter((entry) => appliesToMatches(entry.appliesTo, metadataValue.value))
      
      entriesToUpdate.forEach((entry) => {
        store.setApplicability(entry, value)
      })
    }

    function getSuggestions(entry) {
      if (!entry.examples || !Array.isArray(entry.examples)) {
        return []
      }

      const suggestions = []
      
      entry.examples.forEach((example) => {
        // Add the example label
        if (example.label) {
          suggestions.push(example.label)
        }
        
        // Add all tools from the example
        if (Array.isArray(example.tools)) {
          example.tools.forEach((tool) => {
            if (tool && !suggestions.includes(tool)) {
              suggestions.push(tool)
            }
          })
        }
      })
      
      return suggestions.sort()
    }

    const answerTypeOptions = [
      { label: 'Tool', value: 'Tool', description: 'A concrete library, framework, or technology.' },
      { label: 'Practice', value: 'Practice', description: 'A methodology, pattern, or approach.' }
    ]

    return {
      categories: props.categories,
      visibleCategories,
      currentCategory,
      visibleEntries,
      hasNext,
      hasPrev,
      architecturalRoleValue,
      statusOptions: store.statusOptions,
      applicabilityItems,
      applicabilityFilter,
      applicabilityFilterOptions,
      getStatusTooltip: store.getStatusTooltip,
      renderTextWithLinks: store.renderTextWithLinks,
      getExampleItems: store.getExampleItems,
      isEntryApplicable: store.isEntryApplicable,
      setApplicability: store.setApplicability,
      addAnswer: store.addAnswer,
      deleteAnswer: store.deleteAnswer,
      selectCategory,
      nextCategory,
      prevCategory,
      categoryHasVisibleEntries,
      setAllApplicability,
      getSuggestions,
      answerTypeOptions,
      isReference,
      parentProject,
      toggleReference,
      entrySearch,
      entrySort,
      cycleSort,
      hideEntry,
      showAllEntries,
      currentCategoryHiddenCount
    }
  }
}
</script>

<style scoped>
.font-weight-medium { font-weight: 500; }
.example-item {
  cursor: help;
  text-decoration: underline dotted;
}

.resizable-textarea :deep(textarea) {
  resize: vertical;
}

.entry-title-row {
  flex-wrap: nowrap;
}

.entry-hide-btn {
  opacity: 0;
  transition: opacity 0.12s;
  flex-shrink: 0;
}
.entry-title-row:hover .entry-hide-btn {
  opacity: 0.5;
}
.entry-hide-btn:hover {
  opacity: 1 !important;
}

.hidden-entries-chip {
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s;
  font-size: 11px !important;
}
.hidden-entries-chip:hover {
  opacity: 0.85;
}

.entry-highlighted {
  animation: entry-flash 2s ease-out;
  border-radius: 4px;
}

@keyframes entry-flash {
  0%   { outline: 2px solid rgba(var(--v-theme-primary), 0.9); background: rgba(var(--v-theme-primary), 0.08); }
  60%  { outline: 2px solid rgba(var(--v-theme-primary), 0.4); background: rgba(var(--v-theme-primary), 0.04); }
  100% { outline: 2px solid transparent; background: transparent; }
}
</style>
