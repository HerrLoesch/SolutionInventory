<template>
  <v-dialog :model-value="modelValue" max-width="680" @update:model-value="close">
    <v-card>
      <v-card-title>Import catalog (AI)</v-card-title>
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption text-medium-emphasis">
            Paste the AI-generated catalog JSON, or choose a file.
          </span>
          <v-btn size="x-small" variant="tonal" prepend-icon="mdi-clipboard-text-outline" @click="copySchema">
            Copy AI schema
          </v-btn>
        </div>

        <v-textarea
          v-model="sourceText"
          label="Catalog JSON"
          rows="7"
          density="compact"
          auto-grow
          spellcheck="false"
          class="import-json"
        />

        <v-file-input
          v-model="file"
          label="…or select a JSON file"
          accept=".json,application/json"
          density="compact"
          prepend-icon="mdi-file-upload"
          hide-details
          class="mb-2"
          @update:model-value="onFileSelected"
        />

        <v-alert v-if="parseError" type="error" density="compact" class="mt-2">
          {{ parseError }}
        </v-alert>

        <template v-if="parsedCatalog">
          <ValidationPanel :errors="validation.errors" :warnings="validation.warnings" />

          <div v-if="comparison" class="compare-report mt-3">
            <div class="compare-header">
              <v-icon size="16">mdi-compare-horizontal</v-icon>
              <span>Comparison vs. project catalog “{{ referenceCatalog?.name }}”</span>
            </div>

            <div v-if="comparison.summary.identical" class="text-caption text-medium-emphasis mt-1">
              Identical structure — no differences from the project catalog.
            </div>

            <div v-else class="compare-body mt-1">
              <div class="compare-chips">
                <v-chip v-if="comparison.summary.categoriesAdded" size="x-small" color="success" variant="tonal">
                  +{{ comparison.summary.categoriesAdded }} categories
                </v-chip>
                <v-chip v-if="comparison.summary.categoriesRemoved" size="x-small" color="error" variant="tonal">
                  −{{ comparison.summary.categoriesRemoved }} categories
                </v-chip>
                <v-chip v-if="comparison.summary.entriesAdded" size="x-small" color="success" variant="tonal">
                  +{{ comparison.summary.entriesAdded }} questions
                </v-chip>
                <v-chip v-if="comparison.summary.entriesRemoved" size="x-small" color="error" variant="tonal">
                  −{{ comparison.summary.entriesRemoved }} questions
                </v-chip>
                <v-chip v-if="comparison.summary.entriesChanged" size="x-small" color="warning" variant="tonal">
                  ~{{ comparison.summary.entriesChanged }} changed
                </v-chip>
                <v-chip
                  size="x-small"
                  :color="comparison.summary.metadataChanges ? 'warning' : 'success'"
                  variant="tonal"
                >
                  metadata: {{ comparison.summary.metadataChanges ? 'differs' : 'compatible' }}
                </v-chip>
              </div>

              <ul class="compare-list">
                <li v-for="c in comparison.categoriesAdded" :key="`ca-${c.id}`" class="added">
                  + Category “{{ c.title || c.id }}” (new)
                </li>
                <li v-for="c in comparison.categoriesRemoved" :key="`cr-${c.id}`" class="removed">
                  − Category “{{ c.title || c.id }}” (missing in import)
                </li>
                <template v-for="c in comparison.categoriesChanged" :key="`cc-${c.id}`">
                  <li class="changed">~ Category “{{ c.title || c.id }}”</li>
                  <li v-for="e in c.entriesAdded" :key="`ea-${c.id}-${e.id}`" class="added nested">
                    + Question “{{ e.aspect || e.id }}”
                  </li>
                  <li v-for="e in c.entriesRemoved" :key="`er-${c.id}-${e.id}`" class="removed nested">
                    − Question “{{ e.aspect || e.id }}”
                  </li>
                  <li v-for="e in c.entriesChanged" :key="`ec-${c.id}-${e.id}`" class="changed nested">
                    ~ Question “{{ e.aspect || e.id }}” ({{ e.changes.join(', ') }})
                  </li>
                </template>
                <li v-for="f in comparison.metadata.fieldsAdded" :key="`mfa-${f}`" class="added">
                  + Metadata field “{{ f }}”
                </li>
                <li v-for="f in comparison.metadata.fieldsRemoved" :key="`mfr-${f}`" class="removed">
                  − Metadata field “{{ f }}”
                </li>
                <li v-for="v in comparison.metadata.valuesChanged" :key="`mvc-${v.field}`" class="changed">
                  ~ Metadata “{{ v.field }}” options changed
                </li>
              </ul>
            </div>
          </div>

          <v-alert type="info" density="compact" variant="tonal" class="mt-3">
            The imported catalog will be added to your library and set as the default catalog of project “{{
              projectName
            }}”. Existing questionnaires are not changed — only new ones use it.
          </v-alert>
        </template>
      </v-card-text>

      <v-card-actions class="gap-3">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :disabled="!canImport" @click="confirmImport">Import</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { getCategoriesData } from '../../services/categoriesService'
import { parseCatalogImport, prepareImportedCatalog } from '../../services/catalogImport'
import { compareCatalogs } from '../../services/catalogCompare'
import { validateCatalog } from '../../schema/catalogValidation'
import { buildCatalogAuthoringPackage } from '../../schema/catalogAiSchema'
import ValidationPanel from './ValidationPanel.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'imported', 'notify'])

const store = useWorkspaceStore()

const sourceText = ref('')
const file = ref(null)

// Reset the form whenever the dialog is (re)opened.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      sourceText.value = ''
      file.value = null
    }
  }
)

const projectName = computed(() => {
  const project = (store.workspace.projects || []).find((p) => p.id === props.projectId)
  return project?.name || 'this project'
})

const referenceCatalog = computed(() => store.getProjectDefaultCatalog(props.projectId))

// Single source of truth: parse the pasted/loaded text. Returns either the raw
// catalog or a human-readable error; never throws out of the computed.
const parseResult = computed(() => {
  if (!sourceText.value.trim()) return { catalog: null, error: '' }
  try {
    return { catalog: parseCatalogImport(sourceText.value), error: '' }
  } catch (err) {
    return { catalog: null, error: err.message }
  }
})

const parseError = computed(() => parseResult.value.error)

// Validate and compare the *prepared* catalog (defaults filled, examples typed),
// so omitted-but-defaultable fields (schemaVersion, statusOptions, …) don't
// wrongly gate the import — only genuine structural problems do.
const preparedCatalog = computed(() => {
  if (!parseResult.value.catalog) return null
  try {
    return prepareImportedCatalog(parseResult.value.catalog, getCategoriesData())
  } catch {
    return null
  }
})

const parsedCatalog = computed(() => preparedCatalog.value)

const validation = computed(() =>
  preparedCatalog.value ? validateCatalog(preparedCatalog.value) : { errors: [], warnings: [] }
)

const comparison = computed(() =>
  preparedCatalog.value ? compareCatalogs(preparedCatalog.value, referenceCatalog.value) : null
)

const canImport = computed(() => !!preparedCatalog.value && validation.value.errors.length === 0)

function onFileSelected(value) {
  const selected = Array.isArray(value) ? value[0] : value
  if (!selected) return
  const reader = new FileReader()
  reader.onload = (e) => {
    sourceText.value = String(e.target?.result || '')
  }
  reader.readAsText(selected)
}

async function copySchema() {
  const pkg = buildCatalogAuthoringPackage()
  try {
    await navigator.clipboard.writeText(pkg)
    emit('notify', 'AI schema copied to clipboard.')
  } catch {
    emit('notify', 'Could not copy to clipboard.')
  }
}

function confirmImport() {
  if (!canImport.value) return
  const result = store.importCatalogToProject(props.projectId, parseResult.value.catalog)
  if (result?.catalogId) {
    emit('imported', { catalogId: result.catalogId, name: preparedCatalog.value.name })
  }
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.import-json :deep(textarea) {
  font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 12px;
}

.compare-report {
  border-top: 1px solid #eceff1;
  padding-top: 10px;
  font-size: 13px;
}

.compare-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.compare-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.compare-list {
  list-style: none;
  padding-left: 4px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
}

.compare-list li {
  font-size: 12.5px;
  line-height: 1.4;
}

.compare-list li.nested {
  padding-left: 18px;
}

.compare-list li.added {
  color: rgb(var(--v-theme-success));
}

.compare-list li.removed {
  color: rgb(var(--v-theme-error));
}

.compare-list li.changed {
  color: rgb(var(--v-theme-warning));
}
</style>
