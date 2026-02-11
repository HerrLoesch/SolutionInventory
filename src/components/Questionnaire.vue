  <template>
  <div>
    <v-row>
      <v-col cols="12" md="3">
        <v-list two-line>
          <v-list-item
            v-for="cat in categories"
            :key="cat.id"
            :active="cat.id === activeCategory"
            @click="selectCategory(cat.id)"
          >
            <v-list-item-content>
              <v-list-item-title>{{ cat.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ cat.desc }}</v-list-item-subtitle>
            </v-list-item-content>
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
                    <div v-if="entry.description" class="text-body-2 mt-1">{{ entry.description }}</div>
                    <div class="text--secondary text-sm mt-1"><strong>Examples:</strong> {{ entry.examples }}</div>
                  </div>
                  <div class="ml-4" style="min-width: 190px;">
                    <v-select
                      v-model="entry.applicability"
                      :items="applicabilityOptions"
                      density="compact"
                      variant="plain"
                      hide-details
                      @update:model-value="setApplicability(entry, $event)"
                    />
                  </div>
                </div>

                <!-- Antworten pro Entry -->
                <div v-if="isEntryApplicable(entry)">
                <div v-for="(answer, aIdx) in entry.answers" :key="aIdx" class="mt-4 pa-2 border-l-4 border-info">
                  <v-row dense>
                    <v-col cols="12" md="4">
                      <v-text-field label="Solution" v-model="answer.technology" clearable />
                    </v-col>

                    <v-col cols="12" md="2">
                      <v-tooltip :text="getStatusTooltip(answer.status)" location="top">
                        <template v-slot:activator="{ props }">
                          <v-select
                            label="Status"
                            :items="statusOptions"
                            item-title="label"
                            item-value="label"
                            v-model="answer.status"
                            v-bind="props"
                          />
                        </template>
                      </v-tooltip>
                    </v-col>

                    <v-col cols="12" md="5">
                      <v-textarea label="Comment" v-model="answer.comments" rows="1" auto-grow />
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
                  </v-row>
                </div>

                <!-- Button für neue Antwort -->
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
import { ref, computed, watch } from 'vue'

export default {
  props: {
    categories: {
      type: Array,
      required: true
    }
  },
  emits: ['update-categories'],
  setup (props, { emit }) {
    const activeCategory = ref(props.categories[0].id)

    watch(() => props.categories, (newCategories) => {
      normalizeCategories(newCategories)
      if (newCategories.length > 0 && !newCategories.find(c => c.id === activeCategory.value)) {
        activeCategory.value = newCategories[0].id
      }
    })

    const currentCategory = computed(() => props.categories.find(c => c.id === activeCategory.value))

    const statusOptions = [
      { label: 'Adopt', description: 'We use this and recommend it.' },
      { label: 'Assess', description: 'We are currently evaluating/testing this.' },
      { label: 'Hold', description: 'We use this, but do not recommend it for new features.' },
      { label: 'Retire', description: 'We are actively replacing or removing this.' }
    ]

    const applicabilityOptions = ['applicable', 'not applicable', 'unknown']

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function selectCategory(id) {
      activeCategory.value = id
      scrollToTop()
    }

    function getStatusTooltip(status) {
      const opt = statusOptions.find(s => s.label === status)
      return opt ? opt.description : ''
    }

    function nextCategory() {
      const idx = props.categories.findIndex(c => c.id === activeCategory.value)
      if (idx < props.categories.length - 1) {
        activeCategory.value = props.categories[idx + 1].id
        scrollToTop()
      }
    }

    function prevCategory() {
      const idx = props.categories.findIndex(c => c.id === activeCategory.value)
      if (idx > 0) {
        activeCategory.value = props.categories[idx - 1].id
        scrollToTop()
      }
    }

    const hasNext = computed(() => props.categories.findIndex(c => c.id === activeCategory.value) < props.categories.length - 1)
    const hasPrev = computed(() => props.categories.findIndex(c => c.id === activeCategory.value) > 0)

    function addAnswer(entryId) {
      const entry = findEntry(entryId)
      console.log('Adding answer to entry:', entryId, entry)
      if (entry && isEntryApplicable(entry)) {
        entry.answers = [...entry.answers, { technology: '', status: '', comments: '' }]
        emit('update-categories', props.categories)
      }
    }

    function deleteAnswer(entryId, answerIdx) {
      const entry = findEntry(entryId)
      if (entry && entry.answers.length > 1) {
        entry.answers = entry.answers.filter((_, idx) => idx !== answerIdx)
        emit('update-categories', props.categories)
      }
    }

    function findEntry(entryId) {
      console.log('Finding entry with ID:', entryId)
      console.log('Categories:', props.categories)

      for (const cat of props.categories) {
        console.log('Checking category:', cat.id)
        
        if (!cat.entries) continue // Skip categories without entries

        for (const e of cat.entries) {
          console.log('Checking entry:', e.id)
          
          if (e.id === entryId) return e
        }
      }
      return null
    }

    function isEntryApplicable(entry) {
      return (entry.applicability || 'applicable') === 'applicable'
    }

    function setApplicability(entry, value) {
      if (!applicabilityOptions.includes(value)) {
        entry.applicability = 'applicable'
        return
      }

      entry.applicability = value

      if (['does not apply', 'unknown'].includes(value)) {
        entry.answers = [{ technology: value, status: '', comments: '' }]
      } else {
        const filteredAnswers = (entry.answers || []).filter(
          (answer) => !['does not apply', 'unknown'].includes(answer.technology)
        )
        entry.answers = filteredAnswers.length > 0
          ? filteredAnswers
          : [{ technology: '', status: '', comments: '' }]
      }

      emit('update-categories', props.categories)
    }

    function normalizeCategories(categories) {
      categories.forEach((category) => {
        if (!category.entries) return
        category.entries.forEach((entry) => {
          if (!entry.applicability) {
            entry.applicability = 'applicable'
          }
          if (['does not apply', 'unknown'].includes(entry.applicability)) {
            entry.answers = [{ technology: entry.applicability, status: '', comments: '' }]
            return
          }
          if (!entry.answers || entry.answers.length === 0) {
            entry.answers = [{ technology: '', status: '', comments: '' }]
          }
        })
      })
    }

    function exportJSON() {
      const exportData = { categories: props.categories }
      const data = JSON.stringify(exportData, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'solution_inventory.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    function importJSON(data) {
      if (Array.isArray(data)) {
        emit('update-categories', data)
        activeCategory.value = data[0]?.id || ''
        scrollToTop()
      } else {
        alert('Invalid JSON format: Expected array of categories')
      }
    }

    normalizeCategories(props.categories)

    return {
      activeCategory,
      currentCategory,
      selectCategory,
      nextCategory,
      prevCategory,
      hasNext,
      hasPrev,
      statusOptions,
      applicabilityOptions,
      getStatusTooltip,
      isEntryApplicable,
      setApplicability,
      addAnswer,
      deleteAnswer,
      exportJSON,
      importJSON
    }
  }
}
</script>

<style scoped>
.font-weight-medium { font-weight: 500; }
</style>
