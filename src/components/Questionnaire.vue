  <template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-list two-line>
          <v-subheader>Kategorien</v-subheader>
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
          <v-card-title>{{ currentCategory.title }}</v-card-title>
          <v-card-subtitle class="px-4">{{ currentCategory.desc }}</v-card-subtitle>
          <v-card-text>
            <div v-for="entry in currentCategory.entries" :key="entry.id" class="mb-6">
              <v-sheet class="pa-3" elevation="1">
                <div class="d-flex justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ entry.aspect }}</div>
                    <div class="text--secondary text-sm">{{ entry.examples }}</div>
                  </div>
                </div>

                <v-row class="mt-4" dense>
                  <v-col cols="12" md="5">
                    <v-text-field label="Technology Used" v-model="entry.technology" clearable />
                  </v-col>

                  <v-col cols="12" md="3">
                    <v-select label="Status" :items="statusOptions" v-model="entry.status" clearable />
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-textarea label="Comments / Notes" v-model="entry.comments" rows="2" auto-grow />
                  </v-col>
                </v-row>
              </v-sheet>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="prevCategory" :disabled="!hasPrev">Zurück</v-btn>
            <v-spacer />
            <v-btn color="primary" @click="nextCategory" :disabled="!hasNext">Weiter</v-btn>
            <v-btn color="success" @click="exportXLSX">Excel export (.xlsx)</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { reactive, ref, computed } from 'vue'
import { exportToExcel } from '../utils/exportExcel'

export default {
  setup () {
    // New structure per user's spec
    // Each entry contains: aspect (Question / Aspect), examples (Examples & Options),
    // technology (Technology Used), status (Status), comments (Comments / Notes)
    const categories = ref([
      {
        id: 'architecture',
        title: 'Architecture',
        desc: 'Architectural decisions and capabilities',
        entries: [
          {
            id: 'a1',
            aspect: 'Do not edit. This specifies the technical capability or functional area being surveyed.',
            examples: 'E.g. Monolith, Microservices, Modular Hexagonal, Event-driven',
            technology: '',
            status: '',
            comments: ''
          },
          {
            id: 'a2',
            aspect: 'Do not edit. Read this question to understand the specific architectural decision, pattern, or tool we are asking about',
            examples: 'E.g. CQRS, ES, API Gateway, Service Mesh',
            technology: '',
            status: '',
            comments: ''
          }
        ]
      },
      {
        id: 'frontend',
        title: 'Front-End',
        desc: 'Client-side frameworks, UI libraries and patterns',
        entries: [
          {
            id: 'f1',
            aspect: 'Framework / Library used for UI',
            examples: 'Vue, React, Angular, Svelte, Plain HTML/CSS/JS',
            technology: '',
            status: '',
            comments: ''
          }
        ]
      },
      {
        id: 'backend',
        title: 'Back-End',
        desc: 'Server-side runtime, frameworks and patterns',
        entries: [
          {
            id: 'b1',
            aspect: 'Primary backend framework / runtime',
            examples: 'Node.js (Express/Nest), Java (Spring), .NET, Go, Python (Django/Flask)',
            technology: '',
            status: '',
            comments: ''
          }
        ]
      },
      {
        id: 'ops-security',
        title: 'Ops & Security',
        desc: 'Operational and security tooling and practices',
        entries: [
          {
            id: 'o1',
            aspect: 'Authentication / Authorization',
            examples: 'OAuth2, OIDC, Keycloak, LDAP, SAML, Custom',
            technology: '',
            status: '',
            comments: ''
          }
        ]
      },
      {
        id: 'infra-data',
        title: 'Infrastructure & Data',
        desc: 'Databases, caches, queues and infra choices',
        entries: [
          {
            id: 'd1',
            aspect: 'Primary datastore',
            examples: 'Postgres, MySQL, MongoDB, Cassandra, Redis',
            technology: '',
            status: '',
            comments: ''
          }
        ]
      },
      {
        id: 'hardware-io',
        title: 'Hardware & IO',
        desc: 'Hardware interfaces, sensors, serial/USB, real-time IO',
        entries: [
          {
            id: 'h1',
            aspect: 'Hardware / IO interfaces used',
            examples: 'Modbus, CAN, GPIO, Serial, USB, Custom protocols',
            technology: '',
            status: '',
            comments: ''
          }
        ]
      }
    ])

    const activeCategory = ref(categories.value[0].id)

    const currentCategory = computed(() => categories.value.find(c => c.id === activeCategory.value))

    const statusOptions = ['Strategic', 'Adopted', 'Experimental', 'Deprecated', 'None']

    function selectCategory(id) { activeCategory.value = id }

    function nextCategory() {
      const idx = categories.value.findIndex(c => c.id === activeCategory.value)
      if (idx < categories.value.length - 1) activeCategory.value = categories.value[idx + 1].id
    }

    function prevCategory() {
      const idx = categories.value.findIndex(c => c.id === activeCategory.value)
      if (idx > 0) activeCategory.value = categories.value[idx - 1].id
    }

    const hasNext = computed(() => categories.value.findIndex(c => c.id === activeCategory.value) < categories.value.length - 1)
    const hasPrev = computed(() => categories.value.findIndex(c => c.id === activeCategory.value) > 0)

    function exportXLSX() {
      // Flatten entries into rows following requested column order
      const rows = []
      for (const cat of categories.value) {
        for (const e of cat.entries) {
          rows.push({
            'Category': cat.title,
            'Question / Aspect': e.aspect,
            'Examples & Options': e.examples,
            'Technology Used': e.technology || '',
            'Status': e.status || '',
            'Comments / Notes': e.comments || ''
          })
        }
      }
      exportToExcel(rows, 'solution_inventory.xlsx')
    }

    return { categories, activeCategory, currentCategory, selectCategory, nextCategory, prevCategory, hasNext, hasPrev, exportXLSX }
  }
}
</script>

<style scoped>
.font-weight-medium { font-weight: 500; }
</style>
