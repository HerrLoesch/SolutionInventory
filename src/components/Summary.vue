<template>
  <div>
    <v-card class="mb-4">
      <v-card-title>Solution Description</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="6" v-if="metadata.productName">
            <strong>Software Product:</strong> {{ metadata.productName }}
          </v-col>
          <v-col cols="12" md="6" v-if="metadata.company">
            <strong>Company:</strong> {{ metadata.company }}
          </v-col>
          <v-col cols="12" md="6" v-if="metadata.department">
            <strong>Department:</strong> {{ metadata.department }}
          </v-col>
          <v-col cols="12" md="6" v-if="metadata.contactPerson">
            <strong>Contact Person:</strong> {{ metadata.contactPerson }}
          </v-col>
          <v-col cols="12" v-if="metadata.description">
            <strong>Description:</strong>
            <p>{{ metadata.description }}</p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" v-for="category in regularCategories" :key="category.id">
      <v-card-title>{{ category.title }}</v-card-title>
      <v-card-subtitle class="px-4">{{ category.desc }}</v-card-subtitle>
      <v-card-text>
        <div v-if="category.entries && category.entries.length === 0" class="text--secondary">
          No answers provided.
        </div>
        <v-expansion-panels v-else>
          <v-expansion-panel v-for="entry in category.entries" :key="entry.id">
            <template v-slot:title>
              <div>
                <strong>{{ entry.aspect }}</strong>
                <v-chip
                  v-for="(answer, idx) in entry.answers"
                  :key="idx"
                  size="small"
                  class="ml-2"
                  :color="getStatusColor(answer.status)"
                >
                  {{ answer.technology }}
                </v-chip>
              </div>
            </template>

            <template v-slot:text>
              <div class="px-4">
                <div class="mb-3">
                  <strong>Examples:</strong> {{ entry.examples }}
                </div>

                <div v-for="(answer, aIdx) in entry.answers" :key="aIdx" class="mb-4 pa-3 border-l-4 border-info">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <div class="text-h6 font-weight-bold">{{ answer.technology }}</div>
                    <v-chip :color="getStatusColor(answer.status)" text-color="white">
                      {{ answer.status }}
                    </v-chip>
                  </div>
                  <div v-if="answer.comments" class="text--secondary">
                    <strong>Comments:</strong> {{ answer.comments }}
                  </div>
                </div>
              </div>
            </template>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  props: {
    categories: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const metadata = computed(() => {
      const metaCategory = props.categories.find(c => c.isMetadata)
      return metaCategory?.metadata || {}
    })

    const regularCategories = computed(() => {
      return props.categories.filter(c => !c.isMetadata)
    })

    function getStatusColor(status) {
      const colors = {
        'Adopt': 'success',
        'Assess': 'info',
        'Hold': 'warning',
        'Retire': 'error'
      }
      return colors[status] || 'grey'
    }

    return { metadata, regularCategories, getStatusColor }
  }
}
</script>

<style scoped>
.border-l-4 {
  border-left: 4px solid;
}

.border-info {
  border-color: #2196f3;
}

.d-flex {
  display: flex;
}

.justify-space-between {
  justify-content: space-between;
}

.align-center {
  align-items: center;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 1rem;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.pa-3 {
  padding: 1rem;
}

.px-4 {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.text-h6 {
  font-size: 1.25rem;
}
</style>
