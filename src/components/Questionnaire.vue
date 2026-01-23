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
            <div v-for="entry in currentCategory.entries" :key="entry.id" class="mb-6">
              <v-sheet class="pa-3" elevation="1">
                <div class="d-flex justify-space-between align-start">
                  <div class="flex-grow-1">
                    <div class="text-h6 font-weight-bold">{{ entry.aspect }}</div>
                    <div class="text--secondary text-sm mt-1"><strong>Beispiele:</strong> {{ entry.examples }}</div>
                  </div>
                </div>

                <!-- Antworten pro Entry -->
                <div v-for="(answer, aIdx) in entry.answers" :key="aIdx" class="mt-4 pa-2 border-l-4 border-info">
                  <v-row dense>
                    <v-col cols="12" md="4">
                      <v-text-field label="Technologie" v-model="answer.technology" clearable />
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
                      <v-textarea label="Kommentar" v-model="answer.comments" rows="1" auto-grow />
                    </v-col>

                    <v-col cols="12" md="1" class="d-flex align-center justify-end">
                      <v-btn
                        size="small"
                        color="error"
                        variant="text"
                        @click="deleteAnswer(entry.id, aIdx)"
                        v-if="entry.answers.length > 1"
                      >
                        Löschen
                      </v-btn>
                    </v-col>
                  </v-row>
                </div>

                <!-- Button für neue Antwort -->
                <div class="mt-3">
                  <v-btn size="small" color="secondary" @click="addAnswer(entry.id)">
                    + Neue Antwort
                  </v-btn>
                </div>
              </v-sheet>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="prevCategory" :disabled="!hasPrev">Zurück</v-btn>
            <v-spacer />
            <v-btn color="primary" @click="nextCategory" :disabled="!hasNext">Weiter</v-btn>
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
            id: 'arch-hlp',
            aspect: 'High-Level Pattern',
            examples: 'Layered, Hexagonal, Clean Arch, Plugin-Based',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-eh',
            aspect: 'Error Handling Strategy',
            examples: 'Global Handler, Result Pattern, Crash-Report',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-res',
            aspect: 'Resilience Patterns',
            examples: 'Retry, Circuit Breaker (Polly), Fallback',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-off',
            aspect: 'Offline Capability',
            examples: 'Online-Only, Local-First, Sync-on-Connect',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-dpr',
            aspect: 'Data Privacy (At Rest)',
            examples: 'OS Encrypt, App Encrypt (DPAPI), Plaintext',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-dpt',
            aspect: 'Data Privacy (In Transit)',
            examples: 'TLS 1.3, mTLS, VPN only',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-audit',
            aspect: 'Audit & Compliance',
            examples: 'Full Audit Trail, Critical Ops only',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'arch-dep',
            aspect: 'Dependency Management',
            examples: 'Strict Vetting, Allowed List, Free Choice',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      },
      {
        id: 'frontend',
        title: 'Front-End',
        desc: 'Client-side frameworks, UI libraries and patterns',
        entries: [
          {
            id: 'fe-apptype',
            aspect: 'App Type & Stack',
            examples: 'Angular, React, WPF, Qt, Electron',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'fe-state',
            aspect: 'State Management',
            examples: 'NgRx, Redux, MVVM, Local State',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'fe-complib',
            aspect: 'Component Library',
            examples: 'Syncfusion, Material, In-House, Native',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'fe-unittest',
            aspect: 'Unit Testing',
            examples: 'Jest, Jasmine, Karma, Vitest',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'fe-quality',
            aspect: 'Code Quality',
            examples: 'ESLint, Prettier, Stylelint',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'fe-logging',
            aspect: 'Logging',
            examples: 'Console, Sentry, AppInsights',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'fe-build',
            aspect: 'Build System',
            examples: 'Nx, Webpack, Vite, Angular CLI',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      },
      {
        id: 'backend',
        title: 'Back-End',
        desc: 'Server-side runtime, frameworks and patterns',
        entries: [
          {
            id: 'be-runtime',
            aspect: 'Runtime Environment',
            examples: '.NET Core, JVM, Node.js, C++',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'be-api',
            aspect: 'API / Interface',
            examples: 'REST, GraphQL, gRPC, WCF',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'be-dal',
            aspect: 'Data Access (DAL)',
            examples: 'EF Core, Dapper, Hibernate, SQL',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'be-unittest',
            aspect: 'Unit Testing',
            examples: 'xUnit, NUnit, MsTest, JUnit',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'be-integration',
            aspect: 'Integration Testing',
            examples: 'TestServer, RestAssured, Postman',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'be-perf',
            aspect: 'Performance',
            examples: 'Benchmark.Net, k6, JMeter',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'be-logging',
            aspect: 'Logging',
            examples: 'NLog, Serilog, Log4j',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      },
      {
        id: 'ops-security',
        title: 'Ops & Security',
        desc: 'Operational and security tooling and practices',
        entries: [
          {
            id: 'ops-deploy',
            aspect: 'Deployment Artifact',
            examples: 'Docker Image, MSI/Exe Installer, Portable Zip, Helm Chart',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-update',
            aspect: 'Update Mechanism',
            examples: 'Auto-Update (ClickOnce/Squirrel), Manual Install, Pull (K8s)',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-config',
            aspect: 'Configuration Mgmt',
            examples: 'appsettings.json, Env Vars, Registry, Central Config DB',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-backup',
            aspect: 'Backup Strategy',
            examples: 'Built-in Backup Job, External Script, DB Dump, VM Snapshot',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-remote',
            aspect: 'Remote Support',
            examples: 'VPN Access, TeamViewer, Remote Shell, Log Export Tool',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-telemetry',
            aspect: 'Telemetry / Crash Reports',
            examples: 'Automated (Sentry/AppCenter), User Prompt, None (Offline)',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-licensing',
            aspect: 'Licensing / DRM',
            examples: 'Hardware Dongle, License Key File, Online Activation, Floating Server',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-resources',
            aspect: 'Resource Constraints',
            examples: 'Fixed RAM/CPU limit, GPU required, Specific Disk IOPS',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-logging',
            aspect: 'Logging',
            examples: 'NLog, Serilog, Log4j, Graylog',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-auth',
            aspect: 'Authentication',
            examples: 'SAML2, OIDC, Windows Auth, LDAP',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'ops-secrets',
            aspect: 'Secret Management',
            examples: 'Env Vars, Vault, Credential Store',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      },
      {
        id: 'infra-data',
        title: 'Infrastructure & Data',
        desc: 'Databases, caches, queues and infra choices',
        entries: [
          {
            id: 'infra-database',
            aspect: 'Database Engine',
            examples: 'Oracle, Postgres, SQL Server',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'infra-schema',
            aspect: 'Schema Migration',
            examples: 'Liquibase, Flyway, EF Migrations',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'infra-orchestration',
            aspect: 'Orchestration',
            examples: 'K8s, Docker Compose, Windows Service',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      },
      {
        id: 'hardware-io',
        title: 'Hardware & IO',
        desc: 'Hardware interfaces, sensors, serial/USB, real-time IO',
        entries: [
          {
            id: 'hw-communication',
            aspect: 'Communication Patterns',
            examples: 'Polling, Interrupt, Event-Driven',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'hw-buffering',
            aspect: 'Data Buffering',
            examples: 'Ring-Buffer, FIFO, Double-Buffering',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'hw-realtime',
            aspect: 'Real-time Requirements',
            examples: 'Hard Realtime, Soft Realtime, Best Effort',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'hw-lifecycle',
            aspect: 'Connection Lifecycle',
            examples: 'Persistent, Session-Based, On-Demand',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'hw-driver',
            aspect: 'Driver Abstraction',
            examples: 'Vendor API, Native Driver (DLL), SCPI',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      },
      {
        id: 'qa-testing',
        title: 'General QA & Testing',
        desc: 'Test case management, traceability, and testing frameworks',
        entries: [
          {
            id: 'qa-testcase',
            aspect: 'Test Case Management',
            examples: 'Azure DevOps, Xray (jira)',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'qa-traceability',
            aspect: 'Traceability',
            examples: 'Built-in Link (ADO/Jira), Polarion',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'qa-e2e',
            aspect: 'E2E Testing',
            examples: 'Cypress, Playwright, Selenium, Ranorex',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          },
          {
            id: 'qa-performance',
            aspect: 'Performance Testing',
            examples: 'Benchmark.Net, JMeter, Gatling, k6',
            answers: [
              { technology: '', status: '', comments: '' }
            ]
          }
        ]
      }
    ])

    const activeCategory = ref(categories.value[0].id)

    const currentCategory = computed(() => categories.value.find(c => c.id === activeCategory.value))

    const statusOptions = [
      { label: 'Adopt', description: 'We use this and recommend it.' },
      { label: 'Assess', description: 'We are currently evaluating/testing this.' },
      { label: 'Hold', description: 'We use this, but do not recommend it for new features.' },
      { label: 'Retire', description: 'We are actively replacing or removing this.' }
    ]

    function selectCategory(id) { activeCategory.value = id }

    function getStatusTooltip(status) {
      const opt = statusOptions.find(s => s.label === status)
      return opt ? opt.description : ''
    }

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
      // Flatten entries with multiple answers into rows
      const rows = []
      for (const cat of categories.value) {
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
      for (const cat of categories.value) {
        for (const e of cat.entries) {
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
      } else {
        alert('Ungültiges JSON Format')
      }
    }

    return { categories, activeCategory, currentCategory, selectCategory, nextCategory, prevCategory, hasNext, hasPrev, exportXLSX, statusOptions, getStatusTooltip, addAnswer, deleteAnswer, exportJSON, importJSON }
  }
}
</script>

<style scoped>
.font-weight-medium { font-weight: 500; }
</style>
