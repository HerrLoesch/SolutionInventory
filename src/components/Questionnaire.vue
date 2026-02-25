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
              <h2>{{ currentCategory.title }}</h2>
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
                    v-model="currentCategory.metadata.productName"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Company"
                    v-model="currentCategory.metadata.company"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Department"
                    v-model="currentCategory.metadata.department"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Contact Person"
                    v-model="currentCategory.metadata.contactPerson"
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
                    v-model="currentCategory.metadata.description"
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
              <div v-for="entry in visibleEntries" :key="entry.id" class="mb-6">
                <v-sheet class="pa-3" elevation="1">
                  <div class="d-flex justify-space-between align-start">
                    <div class="flex-grow-1">
                      <div class="text-h6 font-weight-bold">{{ entry.aspect }}</div>
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
                      v-model="entry.entryComment"
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
                        <v-col cols="12" md="9">
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
                            v-model="answer.comments"
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
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../stores/workspaceStore'

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
      const filteredByMetadata = entries.filter((entry) => appliesToMatches(entry.appliesTo, metadataValue.value))
      
      if (applicabilityFilter.value === 'all') {
        return filteredByMetadata
      }
      
      return filteredByMetadata.filter((entry) => {
        const entryApplicability = entry.applicability || 'applicable'
        return entryApplicability === applicabilityFilter.value
      })
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
      scrollToTop()
    }

    function nextCategory() {
      const idx = visibleCategories.value.findIndex((category) => category.id === activeCategoryId.value)
      if (idx < visibleCategories.value.length - 1) {
        activeCategoryId.value = visibleCategories.value[idx + 1].id
        scrollToTop()
      }
    }

    function prevCategory() {
      const idx = visibleCategories.value.findIndex((category) => category.id === activeCategoryId.value)
      if (idx > 0) {
        activeCategoryId.value = visibleCategories.value[idx - 1].id
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
      isReference,
      parentProject,
      toggleReference
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
</style>
