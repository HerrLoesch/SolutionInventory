<template>
  <div>
    <v-row>
      <v-col cols="12" md="3">
        <v-list two-line>
          <v-list-item
            v-for="cat in categories"
            :key="cat.id"
            :active="cat.id === currentCategory.id"
            @click="selectCategory(cat.id)"
          >
            <v-list-item-title>{{ cat.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ cat.desc }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-col>

      <v-col cols="12" md="9">
        <v-card>
          <v-card-title><h2>{{ currentCategory.title }}</h2></v-card-title>
          <v-card-subtitle class="px-4">{{ currentCategory.desc }}</v-card-subtitle>
          <v-card-text>
            <!-- Solution Description Metadata Form -->
            <div v-if="currentCategory.isMetadata" class="mt-4">
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
              </v-row>
            </div>

            <!-- Regular entries for other categories -->
            <div v-else>
              <div v-for="entry in currentCategory.entries" :key="entry.id" class="mb-6">
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

                  <!-- Antworten pro Entry -->
                  <div v-if="isEntryApplicable(entry)">
                    <div v-for="(answer, aIdx) in entry.answers" :key="aIdx" class="mt-4 pa-2 border-l-4 border-info">
                      <v-row dense>
                        <v-col cols="12" md="9">
                          <v-text-field label="Solution" v-model="answer.technology" clearable />
                        </v-col>

                        <v-col cols="12" md="3">
                          <v-select
                            label="Status"
                            :items="statusOptions"
                            item-title="label"
                            item-value="label"
                            v-model="answer.status"
                          >
                            <template #item="{ props, item }">
                              <v-list-item v-bind="props">
                                <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                              </v-list-item>
                            </template>
                          </v-select>
                        </v-col>

                        <v-col cols="12" md="1" class="d-flex align-center justify-end">
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
    }
  },
  setup (props) {
    const store = useWorkspaceStore()
    const applicabilityDescriptions = {
      applicable: 'Entry applies and should be filled in.',
      'not applicable': 'Entry does not apply to this solution.',
      unknown: 'Applicability is not known yet.'
    }
    const activeCategoryId = ref(props.categories[0]?.id || '')

    watch(() => props.categories, (value) => {
      if (!value.length) {
        activeCategoryId.value = ''
        return
      }
      if (!value.find((category) => category.id === activeCategoryId.value)) {
        activeCategoryId.value = value[0].id
      }
    })

    const currentCategory = computed(() => {
      return props.categories.find((category) => category.id === activeCategoryId.value) || {
        title: '',
        desc: '',
        isMetadata: false,
        entries: []
      }
    })

    const applicabilityItems = computed(() => {
      return store.applicabilityOptions.map((label) => ({
        label,
        description: applicabilityDescriptions[label] || ''
      }))
    })

    const hasNext = computed(() => {
      return props.categories.findIndex((category) => category.id === activeCategoryId.value) < props.categories.length - 1
    })

    const hasPrev = computed(() => {
      return props.categories.findIndex((category) => category.id === activeCategoryId.value) > 0
    })

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function selectCategory(id) {
      activeCategoryId.value = id
      scrollToTop()
    }

    function nextCategory() {
      const idx = props.categories.findIndex((category) => category.id === activeCategoryId.value)
      if (idx < props.categories.length - 1) {
        activeCategoryId.value = props.categories[idx + 1].id
        scrollToTop()
      }
    }

    function prevCategory() {
      const idx = props.categories.findIndex((category) => category.id === activeCategoryId.value)
      if (idx > 0) {
        activeCategoryId.value = props.categories[idx - 1].id
        scrollToTop()
      }
    }

    return {
      categories: props.categories,
      currentCategory,
      hasNext,
      hasPrev,
      statusOptions: store.statusOptions,
      applicabilityItems,
      getStatusTooltip: store.getStatusTooltip,
      renderTextWithLinks: store.renderTextWithLinks,
      getExampleItems: store.getExampleItems,
      isEntryApplicable: store.isEntryApplicable,
      setApplicability: store.setApplicability,
      addAnswer: store.addAnswer,
      deleteAnswer: store.deleteAnswer,
      selectCategory,
      nextCategory,
      prevCategory
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
