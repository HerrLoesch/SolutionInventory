<template>
  <div>
    <v-row>
      <!-- Left Side: Category List -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Categories</span>
            <v-btn color="primary" size="small" icon @click="addCategory">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-0">
            <v-list>
              <v-list-item
                v-for="(category, catIdx) in localCategories"
                :key="category.id"
                :active="selectedCategoryIndex === catIdx"
                @click="selectCategory(catIdx)"
              >
                <v-list-item-title>{{ category.title }}</v-list-item-title>
                <v-list-item-subtitle v-if="category.isMetadata">(Metadata)</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right Side: Category Editor -->
      <v-col cols="12" md="9">
        <v-card v-if="selectedCategory">
          <v-card-title class="d-flex justify-space-between align-center">
            <h3>Edit Category: {{ selectedCategory.title }}</h3>
            <v-btn
              icon
              size="small"
              color="error"
              variant="text"
              @click="deleteCategory(selectedCategoryIndex)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <!-- Category Basics -->
            <v-text-field
              label="Title"
              v-model="selectedCategory.title"
              @update:model-value="updateCategoryId"
              class="mb-3"
            />
            <v-textarea
              label="Description"
              v-model="selectedCategory.desc"
              rows="2"
              class="mb-3"
            />
            <v-checkbox
              label="Is Metadata Category"
              v-model="selectedCategory.isMetadata"
              class="mb-3"
            />

            <v-divider class="my-4" />

            <!-- Entries Section (only for non-metadata categories) -->
            <div v-if="!selectedCategory.isMetadata">
              <div class="d-flex justify-space-between align-center mb-3">
                <h4>Entries (Aspects)</h4>
                <v-btn color="secondary" size="small" @click="addEntry">
                  <v-icon>mdi-plus</v-icon> Add Entry
                </v-btn>
              </div>

              <div v-for="(entry, entryIdx) in selectedCategory.entries" :key="entryIdx" class="mb-4 pa-3 border rounded">
                <div class="d-flex justify-space-between align-center mb-2">
                  <strong>Entry {{ entryIdx + 1 }}</strong>
                  <v-btn
                    icon
                    size="x-small"
                    color="error"
                    variant="text"
                    @click="deleteEntry(entryIdx)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
                <v-text-field
                  label="Aspect"
                  v-model="entry.aspect"
                  @update:model-value="updateEntryId(entryIdx)"
                  density="compact"
                  class="mb-2"
                />

                <div class="d-flex justify-space-between align-center mb-2">
                  <strong>Examples</strong>
                  <v-btn size="x-small" variant="text" @click="addExample(entryIdx)">
                    <v-icon size="16">mdi-plus</v-icon>
                    Add example
                  </v-btn>
                </div>

                <div v-if="entry.examples && entry.examples.length" class="example-list">
                  <div
                    v-for="(example, exampleIdx) in entry.examples"
                    :key="exampleIdx"
                    class="example-row"
                  >
                    <v-text-field
                      label="Label"
                      v-model="example.label"
                      density="compact"
                    />
                    <v-text-field
                      label="Description"
                      v-model="example.description"
                      density="compact"
                    />
                    <v-btn
                      icon
                      size="x-small"
                      color="error"
                      variant="text"
                      @click="deleteExample(entryIdx, exampleIdx)"
                    >
                      <v-icon size="16">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>

                <v-alert v-else type="info" density="compact">
                  No examples yet. Click "Add example" to create one.
                </v-alert>
              </div>

              <v-alert v-if="!selectedCategory.entries || selectedCategory.entries.length === 0" type="info" density="compact">
                No entries yet. Click "Add Entry" to create one.
              </v-alert>
            </div>

            <!-- Metadata Fields Info -->
            <div v-else>
              <v-alert type="info" density="compact">
                This is a metadata category. Metadata fields are: productName, company, department, contactPerson, description
              </v-alert>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-else>
          <v-card-text class="text-center pa-8">
            <v-icon size="64" color="grey">mdi-file-document-outline</v-icon>
            <p class="text-h6 mt-4">Select a category to edit</p>
          </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <div class="mt-4 d-flex gap-2">
          <v-btn color="success" @click="saveChanges">
            <v-icon>mdi-content-save</v-icon> Save Changes
          </v-btn>
          <v-btn color="warning" @click="resetChanges">
            <v-icon>mdi-refresh</v-icon> Reset
          </v-btn>
          <v-btn color="info" @click="showJsonDialog = true">
            <v-icon>mdi-code-json</v-icon> View JSON
          </v-btn>
          <v-btn color="info" @click="exportStructure">
            <v-icon>mdi-download</v-icon> Export Structure
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- JSON Preview Dialog -->
    <v-dialog v-model="showJsonDialog" max-width="900px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <h3>JSON Structure</h3>
          <v-btn icon variant="text" @click="showJsonDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-sheet class="pa-3" color="grey-lighten-4" style="max-height: 70vh; overflow-y: auto;">
            <pre style="font-size: 11px; line-height: 1.4;">{{ jsonPreview }}</pre>
          </v-sheet>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showJsonDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  setup(props, { emit }) {
    // Deep clone categories for local editing
    const localCategories = ref(JSON.parse(JSON.stringify(props.categories)))
    const selectedCategoryIndex = ref(0)
    const showJsonDialog = ref(false)

    // Watch for external changes
    watch(() => props.categories, (newCategories) => {
      if (JSON.stringify(newCategories) !== JSON.stringify(localCategories.value)) {
        localCategories.value = JSON.parse(JSON.stringify(newCategories))
      }
    }, { deep: true })

    const selectedCategory = computed(() => {
      if (selectedCategoryIndex.value < localCategories.value.length) {
        return localCategories.value[selectedCategoryIndex.value]
      }
      return null
    })

    const jsonPreview = computed(() => {
      return JSON.stringify(localCategories.value, null, 2)
    })

    // Generate ID from title
    function generateId(text) {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 50)
    }

    function selectCategory(index) {
      selectedCategoryIndex.value = index
      const category = localCategories.value[index]
      if (category && Array.isArray(category.entries)) {
        category.entries.forEach((entry) => normalizeEntryExamples(entry))
      }
    }

    function addCategory() {
      const title = 'New Category'
      localCategories.value.push({
        id: generateId(title),
        title: title,
        desc: 'Description for new category',
        isMetadata: false,
        entries: []
      })
      selectedCategoryIndex.value = localCategories.value.length - 1
    }

    function deleteCategory(catIdx) {
      if (confirm('Are you sure you want to delete this category?')) {
        localCategories.value.splice(catIdx, 1)
        if (selectedCategoryIndex.value >= localCategories.value.length) {
          selectedCategoryIndex.value = Math.max(0, localCategories.value.length - 1)
        }
      }
    }

    function updateCategoryId() {
      if (selectedCategory.value) {
        selectedCategory.value.id = generateId(selectedCategory.value.title)
      }
    }

    function addEntry() {
      if (selectedCategory.value) {
        if (!selectedCategory.value.entries) {
          selectedCategory.value.entries = []
        }
        const aspect = 'New Aspect'
        selectedCategory.value.entries.push({
          id: generateId(`${selectedCategory.value.id}-${aspect}`),
          aspect: aspect,
          examples: [],
          applicability: 'applicable',
          answers: [
            { technology: '', status: '', comments: '' }
          ]
        })
      }
    }

    function normalizeEntryExamples(entry) {
      if (!entry) return []
      if (Array.isArray(entry.examples)) {
        entry.examples = entry.examples
          .map((example) => {
            if (typeof example === 'string') {
              const label = example.trim()
              return label ? { label, description: '' } : null
            }
            if (example && typeof example === 'object') {
              const label = String(example.label || '').trim()
              if (!label) return null
              return { label, description: example.description || '' }
            }
            return null
          })
          .filter(Boolean)
        return entry.examples
      }

      if (typeof entry.examples === 'string') {
        entry.examples = entry.examples
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((label) => ({ label, description: '' }))
        return entry.examples
      }

      entry.examples = []
      return entry.examples
    }

    function addExample(entryIdx) {
      const entry = selectedCategory.value?.entries?.[entryIdx]
      if (!entry) return
      const examples = normalizeEntryExamples(entry)
      entry.examples = [...examples, { label: '', description: '' }]
    }

    function deleteExample(entryIdx, exampleIdx) {
      const entry = selectedCategory.value?.entries?.[entryIdx]
      if (!entry) return
      const examples = normalizeEntryExamples(entry)
      entry.examples = examples.filter((_, idx) => idx !== exampleIdx)
    }

    function deleteEntry(entryIdx) {
      if (selectedCategory.value && confirm('Are you sure you want to delete this entry?')) {
        selectedCategory.value.entries.splice(entryIdx, 1)
      }
    }

    function updateEntryId(entryIdx) {
      if (selectedCategory.value && selectedCategory.value.entries[entryIdx]) {
        const entry = selectedCategory.value.entries[entryIdx]
        entry.id = generateId(`${selectedCategory.value.id}-${entry.aspect}`)
      }
    }

    function saveChanges() {
      // Emit the updated categories
      emit('update-categories', JSON.parse(JSON.stringify(localCategories.value)))
      alert('Changes saved successfully!')
    }

    function resetChanges() {
      if (confirm('Are you sure you want to reset all changes?')) {
        localCategories.value = JSON.parse(JSON.stringify(props.categories))
        selectedCategoryIndex.value = 0
      }
    }

    function exportStructure() {
      const dataStr = JSON.stringify(localCategories.value, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'questionnaire-structure.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    return {
      localCategories,
      selectedCategoryIndex,
      selectedCategory,
      showJsonDialog,
      jsonPreview,
      selectCategory,
      addCategory,
      deleteCategory,
      updateCategoryId,
      addEntry,
      deleteEntry,
      updateEntryId,
      addExample,
      deleteExample,
      saveChanges,
      resetChanges,
      exportStructure
    }
  }
}
</script>

<style scoped>
.border {
  border: 2px solid #90A4AE;
}

.rounded {
  border-radius: 4px;
}

.gap-2 {
  gap: 8px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: start;
}
</style>
