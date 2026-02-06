  <template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
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

      <v-col cols="12" md="8">
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
                    <div class="text--secondary text-sm mt-1"><strong>Examples:</strong> {{ entry.examples }}</div>
                  </div>
                </div>

                <!-- Antworten pro Entry -->
                <div v-for="(answer, aIdx) in entry.answers" :key="aIdx" class="mt-4 pa-2 border-l-4 border-info">
                  <v-row dense>
                    <v-col cols="12" md="4">
                      <v-text-field label="Technology" v-model="answer.technology" clearable />
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
                            clearable
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
                        @click="deleteAnswer(entry.id, aIdx)"
                        v-if="entry.answers.length > 1"
                      >
                        Delete
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
              </v-sheet>
            </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="prevCategory" :disabled="!hasPrev">Back</v-btn>
            <v-spacer />
            <v-btn color="primary" @click="nextCategory" :disabled="!hasNext">Next</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { exportToExcel } from '../utils/exportExcel'
import { getCategoriesData } from '../services/categoriesService'

export default {
  setup () {
    const categories = ref(getCategoriesData())

    const activeCategory = ref(categories.value[0].id)

    const currentCategory = computed(() => categories.value.find(c => c.id === activeCategory.value))

    const statusOptions = [
      { label: 'Adopt', description: 'We use this and recommend it.' },
      { label: 'Assess', description: 'We are currently evaluating/testing this.' },
      { label: 'Hold', description: 'We use this, but do not recommend it for new features.' },
      { label: 'Retire', description: 'We are actively replacing or removing this.' }
    ]

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
      const idx = categories.value.findIndex(c => c.id === activeCategory.value)
      if (idx < categories.value.length - 1) {
        activeCategory.value = categories.value[idx + 1].id
        scrollToTop()
      }
    }

    function prevCategory() {
      const idx = categories.value.findIndex(c => c.id === activeCategory.value)
      if (idx > 0) {
        activeCategory.value = categories.value[idx - 1].id
        scrollToTop()
      }
    }

    const hasNext = computed(() => categories.value.findIndex(c => c.id === activeCategory.value) < categories.value.length - 1)
    const hasPrev = computed(() => categories.value.findIndex(c => c.id === activeCategory.value) > 0)

    function exportXLSX() {
      // Start with metadata rows
      const rows = []
      
      // Add Solution Description metadata at the top
      const metadata = categories.value[0]?.metadata
      if (metadata) {
        rows.push({
          'Category': 'Solution Description',
          'Question / Aspect': 'Software Product',
          'Examples & Options': '',
          'Technology Used': metadata.productName || '',
          'Status': '',
          'Comments / Notes': ''
        })
        rows.push({
          'Category': 'Solution Description',
          'Question / Aspect': 'Company',
          'Examples & Options': '',
          'Technology Used': metadata.company || '',
          'Status': '',
          'Comments / Notes': ''
        })
        rows.push({
          'Category': 'Solution Description',
          'Question / Aspect': 'Department',
          'Examples & Options': '',
          'Technology Used': metadata.department || '',
          'Status': '',
          'Comments / Notes': ''
        })
        rows.push({
          'Category': 'Solution Description',
          'Question / Aspect': 'Contact Person',
          'Examples & Options': '',
          'Technology Used': metadata.contactPerson || '',
          'Status': '',
          'Comments / Notes': ''
        })
        if (metadata.description) {
          rows.push({
            'Category': 'Solution Description',
            'Question / Aspect': 'Description',
            'Examples & Options': '',
            'Technology Used': metadata.description || '',
            'Status': '',
            'Comments / Notes': ''
          })
        }
      }
      
      // Add regular category entries
      for (const cat of categories.value) {
        if (cat.isMetadata) continue // Skip metadata category in regular entries
        for (const e of cat.entries) {
          if (e.answers && e.answers.length > 0) {
            for (const ans of e.answers) {
              rows.push({
                'Category': cat.title,
                'Question / Aspect': e.aspect,
                'Examples & Options': e.examples,
                'Technology Used': ans.technology || '',
                'Status': ans.status || '',
                'Comments / Notes': ans.comments || ''
              })
            }
          }
        }
      }
      exportToExcel(rows, 'solution_inventory.xlsx')
    }

    function addAnswer(entryId) {
      const entry = findEntry(entryId)
      console.log('Adding answer to entry:', entryId, entry)
      if (entry) {
        entry.answers = [...entry.answers, { technology: '', status: '', comments: '' }]
      }
    }

    function deleteAnswer(entryId, answerIdx) {
      const entry = findEntry(entryId)
      if (entry && entry.answers.length > 1) {
        entry.answers = entry.answers.filter((_, idx) => idx !== answerIdx)
      }
    }

    function findEntry(entryId) {
      console.log('Finding entry with ID:', entryId)
      console.log('Categories:', categories.value)

      for (const cat of categories.value) {
        console.log('Checking category:', cat.id)
        
        if (!cat.entries) continue // Skip categories without entries

        for (const e of cat.entries) {
          console.log('Checking entry:', e.id)
          
          if (e.id === entryId) return e
        }
      }
      return null
    }

    function exportJSON() {
      const data = JSON.stringify(categories.value, null, 2)
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
        categories.value = data
        activeCategory.value = categories.value[0]?.id || ''
        scrollToTop()
      } else {
        alert('Invalid JSON format: Expected array of categories')
      }
    }

    return { categories, activeCategory, currentCategory, selectCategory, nextCategory, prevCategory, hasNext, hasPrev, exportXLSX, statusOptions, getStatusTooltip, addAnswer, deleteAnswer, exportJSON, importJSON }
  }
}
</script>

<style scoped>
.font-weight-medium { font-weight: 500; }
</style>
