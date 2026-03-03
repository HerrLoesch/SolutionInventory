<template>
  <div>
    <!-- Storage Info -->
    <v-row class="mb-2">
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="primary">
          <v-card-text class="d-flex align-center gap-3">
            <v-icon size="32">mdi-database</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Speichergröße</div>
              <div class="text-h6 font-weight-bold">{{ storageSize }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="secondary">
          <v-card-text class="d-flex align-center gap-3">
            <v-icon size="32">mdi-folder-multiple</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Projekte</div>
              <div class="text-h6 font-weight-bold">{{ workspace.projects.length }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="success">
          <v-card-text class="d-flex align-center gap-3">
            <v-icon size="32">mdi-file-document-multiple</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Fragenkataloge</div>
              <div class="text-h6 font-weight-bold">{{ workspace.questionnaires.length }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Storage Metadata -->
    <v-card class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-information-outline</v-icon>Speicher-Details
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-table density="compact">
          <tbody>
            <tr>
              <td class="text-medium-emphasis" style="width: 200px">Storage Key</td>
              <td><code>{{ storageKey }}</code></td>
            </tr>
            <tr>
              <td class="text-medium-emphasis">Version</td>
              <td>{{ storageVersion }}</td>
            </tr>
            <tr>
              <td class="text-medium-emphasis">Zuletzt gespeichert</td>
              <td>{{ lastSavedFull || '–' }}</td>
            </tr>
            <tr>
              <td class="text-medium-emphasis">Workspace ID</td>
              <td><code>{{ workspace.id }}</code></td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Projects & Questionnaires -->
    <v-card class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-sitemap</v-icon>Struktur
        <span class="text-caption text-medium-emphasis ml-2">Fragenkataloge per Drag &amp; Drop verschieben</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-3">

        <div v-if="!workspace.projects.length && !workspace.questionnaires.length" class="pa-4 text-center text-medium-emphasis">
          <v-icon size="48">mdi-tray-remove</v-icon>
          <p class="mt-2">Keine Daten gespeichert</p>
        </div>

        <!-- Project Cards -->
        <div
          v-for="project in workspace.projects"
          :key="project.id"
          class="project-card mb-3"
          :class="{ 'drop-target': activeDropTarget === project.id }"
          @dragover.prevent="onDragOver($event, project.id)"
          @dragleave="onDragLeave(project.id)"
          @drop.prevent="onDrop(project.id)"
        >
          <div class="project-header">
            <v-icon size="18" class="mr-2">mdi-folder</v-icon>
            <strong>{{ project.name }}</strong>
            <span class="text-caption text-medium-emphasis ml-2">
              {{ projectQuestionnaires(project).length }} Katalog(e)
            </span>
          </div>

          <div class="questionnaire-list">
            <div
              v-for="q in projectQuestionnaires(project)"
              :key="q.id"
              class="q-row"
              :class="{ 'reorder-target': reorderTarget === q.id }"
              draggable="true"
              @dragstart.stop="onDragStart($event, project.id, q.id)"
              @dragend="onDragEnd"
              @dragover.prevent.stop="onDragOverItem($event, project.id, q.id)"
              @dragleave="onDragLeaveItem(q.id)"
              @drop.prevent.stop="onDropOnItem(project.id, q.id)"
            >
              <v-icon size="14" class="drag-icon mr-2">mdi-drag</v-icon>
              <v-icon size="14" class="mr-2">mdi-file-document-outline</v-icon>
              <span class="q-name">{{ q.name }}</span>
              <span class="text-caption text-medium-emphasis ml-2">{{ q.categories.length }} Kat.</span>
              <v-chip v-if="project.referenceQuestionnaireId === q.id" size="x-small" color="primary" class="ml-2">Referenz</v-chip>
            </div>

            <div
              v-if="!projectQuestionnaires(project).length"
              class="q-empty"
              :class="{ 'q-empty-active': activeDropTarget === project.id }"
            >
              {{ activeDropTarget === project.id ? 'Hier ablegen' : 'Keine Fragenkataloge' }}
            </div>
          </div>
        </div>

        <!-- Standalone / Unassigned -->
        <div
          class="project-card standalone-card"
          :class="{ 'drop-target': unassignDropTarget }"
          @dragover.prevent="onDragOverUnassigned($event)"
          @dragleave="onDragLeaveUnassigned"
          @drop.prevent="onDropUnassigned"
        >
          <div class="project-header">
            <v-icon size="18" class="mr-2">mdi-folder-off-outline</v-icon>
            <strong>Nicht zugeordnet</strong>
            <span class="text-caption text-medium-emphasis ml-2">{{ standaloneQuestionnaires.length }} Katalog(e)</span>
          </div>

          <div class="questionnaire-list">
            <div
              v-for="q in standaloneQuestionnaires"
              :key="q.id"
              class="q-row"
              :class="{ 'reorder-target': reorderTarget === q.id }"
              draggable="true"
              @dragstart.stop="onDragStart($event, null, q.id)"
              @dragend="onDragEnd"
              @dragover.prevent.stop="onDragOverItem($event, null, q.id)"
              @dragleave="onDragLeaveItem(q.id)"
              @drop.prevent.stop="onDropOnStandaloneItem(q.id)"
            >
              <v-icon size="14" class="drag-icon mr-2">mdi-drag</v-icon>
              <v-icon size="14" class="mr-2">mdi-file-document-outline</v-icon>
              <span class="q-name">{{ q.name }}</span>
              <span class="text-caption text-medium-emphasis ml-2">{{ q.categories.length }} Kat.</span>
            </div>

            <div v-if="!standaloneQuestionnaires.length" class="q-empty"
              :class="{ 'q-empty-active': unassignDropTarget }">
              {{ unassignDropTarget ? 'Hier ablegen zum Entfernen aus Projekt' : 'Keine nicht zugeordneten Kataloge' }}
            </div>
          </div>
        </div>

      </v-card-text>
    </v-card>

    <!-- Actions -->
    <div class="d-flex gap-2 flex-wrap">
      <v-btn color="primary" @click="exportAll">
        <v-icon class="mr-1">mdi-download</v-icon>Alles exportieren
      </v-btn>
      <v-btn color="error" variant="outlined" @click="confirmClear = true">
        <v-icon class="mr-1">mdi-delete-sweep</v-icon>Lokale Daten löschen
      </v-btn>
    </div>

    <!-- Clear Confirmation Dialog -->
    <v-dialog v-model="confirmClear" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center gap-2">
          <v-icon color="error">mdi-alert</v-icon> Daten löschen
        </v-card-title>
        <v-card-text>
          Alle lokal gespeicherten Daten werden unwiderruflich gelöscht. Die Anwendung wird danach neu initialisiert.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmClear = false">Abbrechen</v-btn>
          <v-btn color="error" @click="clearStorage">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '../../stores/workspaceStore'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 1

export default {
  emits: ['close'],
  setup(_, { emit }) {
    const store = useWorkspaceStore()
    const { workspace, lastSaved } = storeToRefs(store)
    const confirmClear = ref(false)

    const storageKey = STORAGE_KEY
    const storageVersion = STORAGE_VERSION

    const storageSize = computed(() => {
      const raw = localStorage.getItem(STORAGE_KEY) || ''
      const bytes = new Blob([raw]).size
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    })

    const lastSavedFull = computed(() => {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      try {
        const data = JSON.parse(raw)
        if (!data.timestamp) return null
        return new Date(data.timestamp).toLocaleString('de-DE')
      } catch {
        return null
      }
    })

    const assignedQuestionnaireIds = computed(() => {
      const ids = new Set()
      workspace.value.projects.forEach((p) => {
        ;(p.questionnaireIds || []).forEach((id) => ids.add(id))
      })
      return ids
    })

    const standaloneQuestionnaires = computed(() => {
      return workspace.value.questionnaires.filter(
        (q) => !assignedQuestionnaireIds.value.has(q.id)
      )
    })

    function projectQuestionnaires(project) {
      return (project.questionnaireIds || [])
        .map((id) => workspace.value.questionnaires.find((q) => q.id === id))
        .filter(Boolean)
    }

    // --- Drag & Drop ---
    const dragState = ref(null)          // { projectId: string|null, questionnaireId: string }
    const activeDropTarget = ref('')     // project id being hovered as drop zone
    const unassignDropTarget = ref(false)
    const reorderTarget = ref('')        // questionnaire id showing insert-before indicator

    let dragLeaveTimer = null
    let dragLeaveItemTimer = null
    let unassignLeaveTimer = null

    function onDragStart(e, projectId, questionnaireId) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', questionnaireId)
      dragState.value = { projectId, questionnaireId }
    }

    function onDragEnd() {
      clearAllTimers()
      dragState.value = null
      activeDropTarget.value = ''
      unassignDropTarget.value = false
      reorderTarget.value = ''
    }

    function clearAllTimers() {
      if (dragLeaveTimer) { clearTimeout(dragLeaveTimer); dragLeaveTimer = null }
      if (dragLeaveItemTimer) { clearTimeout(dragLeaveItemTimer); dragLeaveItemTimer = null }
      if (unassignLeaveTimer) { clearTimeout(unassignLeaveTimer); unassignLeaveTimer = null }
    }

    function onDragOver(e, projectId) {
      e.dataTransfer.dropEffect = 'move'
      if (!dragState.value) return
      if (dragLeaveTimer) { clearTimeout(dragLeaveTimer); dragLeaveTimer = null }
      activeDropTarget.value = projectId
      unassignDropTarget.value = false
    }

    function onDragLeave(projectId) {
      dragLeaveTimer = setTimeout(() => {
        if (activeDropTarget.value === projectId) activeDropTarget.value = ''
        dragLeaveTimer = null
      }, 60)
    }

    function onDrop(projectId) {
      if (dragLeaveTimer) { clearTimeout(dragLeaveTimer); dragLeaveTimer = null }
      if (!dragState.value) return
      const { projectId: fromProjectId, questionnaireId: draggedId } = dragState.value
      if (fromProjectId === null) {
        store.assignQuestionnaireToProject(projectId, draggedId)
      } else if (fromProjectId !== projectId) {
        store.moveQuestionnaire(fromProjectId, projectId, draggedId)
      }
      activeDropTarget.value = ''
      reorderTarget.value = ''
      dragState.value = null
    }

    function onDragOverItem(e, projectId, questionnaireId) {
      e.dataTransfer.dropEffect = 'move'
      if (!dragState.value) return
      if (dragLeaveItemTimer) { clearTimeout(dragLeaveItemTimer); dragLeaveItemTimer = null }
      activeDropTarget.value = ''
      reorderTarget.value = questionnaireId
    }

    function onDragLeaveItem(questionnaireId) {
      dragLeaveItemTimer = setTimeout(() => {
        if (reorderTarget.value === questionnaireId) reorderTarget.value = ''
        dragLeaveItemTimer = null
      }, 60)
    }

    function onDropOnItem(projectId, beforeId) {
      if (dragLeaveItemTimer) { clearTimeout(dragLeaveItemTimer); dragLeaveItemTimer = null }
      if (!dragState.value) return
      const { projectId: fromProjectId, questionnaireId: draggedId } = dragState.value
      if (draggedId === beforeId) { /* no-op */ }
      else if (fromProjectId === null) {
        store.assignQuestionnaireToProject(projectId, draggedId)
        store.reorderQuestionnaire(projectId, draggedId, beforeId)
      } else if (fromProjectId === projectId) {
        store.reorderQuestionnaire(projectId, draggedId, beforeId)
      } else {
        store.moveQuestionnaire(fromProjectId, projectId, draggedId)
        store.reorderQuestionnaire(projectId, draggedId, beforeId)
      }
      reorderTarget.value = ''
      activeDropTarget.value = ''
      dragState.value = null
    }

    function onDragOverUnassigned(e) {
      e.dataTransfer.dropEffect = 'move'
      if (!dragState.value) return
      if (unassignLeaveTimer) { clearTimeout(unassignLeaveTimer); unassignLeaveTimer = null }
      activeDropTarget.value = ''
      unassignDropTarget.value = true
    }

    function onDragLeaveUnassigned() {
      unassignLeaveTimer = setTimeout(() => {
        unassignDropTarget.value = false
        unassignLeaveTimer = null
      }, 60)
    }

    function onDropUnassigned() {
      if (unassignLeaveTimer) { clearTimeout(unassignLeaveTimer); unassignLeaveTimer = null }
      if (!dragState.value) return
      const { projectId: fromProjectId, questionnaireId: draggedId } = dragState.value
      if (fromProjectId !== null) {
        store.unassignQuestionnaire(draggedId)
      }
      unassignDropTarget.value = false
      reorderTarget.value = ''
      dragState.value = null
    }

    function onDropOnStandaloneItem(beforeId) {
      if (dragLeaveItemTimer) { clearTimeout(dragLeaveItemTimer); dragLeaveItemTimer = null }
      if (!dragState.value) return
      const { projectId: fromProjectId, questionnaireId: draggedId } = dragState.value
      if (draggedId !== beforeId && fromProjectId !== null) {
        store.unassignQuestionnaire(draggedId)
      }
      reorderTarget.value = ''
      unassignDropTarget.value = false
      dragState.value = null
    }

    function exportAll() {
      const data = JSON.stringify(
        { version: STORAGE_VERSION, workspace: workspace.value },
        null,
        2
      )
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workspace-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    function clearStorage() {
      localStorage.removeItem(STORAGE_KEY)
      confirmClear.value = false
      emit('close')
      location.reload()
    }

    return {
      workspace,
      lastSaved,
      lastSavedFull,
      storageKey,
      storageVersion,
      storageSize,
      standaloneQuestionnaires,
      projectQuestionnaires,
      exportAll,
      clearStorage,
      confirmClear,
      activeDropTarget,
      unassignDropTarget,
      reorderTarget,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDrop,
      onDragOverItem,
      onDragLeaveItem,
      onDropOnItem,
      onDragOverUnassigned,
      onDragLeaveUnassigned,
      onDropUnassigned,
      onDropOnStandaloneItem
    }
  }
}
</script>

<style scoped>
code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}

.project-card {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

.project-card.drop-target {
  border-color: rgb(21, 101, 192);
  background: rgba(21, 101, 192, 0.06);
  outline: 1px dashed rgba(21, 101, 192, 0.5);
}

.standalone-card {
  border-style: dashed;
  border-color: rgba(0, 0, 0, 0.2);
}

.project-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 13px;
}

.questionnaire-list {
  padding: 4px 0;
}

.q-row {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  font-size: 13px;
  cursor: grab;
  user-select: none;
  transition: background 0.1s;
}

.q-row:active {
  cursor: grabbing;
}

.q-row:hover {
  background: rgba(0, 0, 0, 0.04);
}

.q-row.reorder-target {
  border-top: 2px solid rgb(21, 101, 192);
}

.drag-icon {
  opacity: 0.35;
}

.q-row:hover .drag-icon {
  opacity: 0.7;
}

.q-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.q-empty {
  padding: 8px 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  font-style: italic;
}

.q-empty-active {
  color: rgb(21, 101, 192);
  font-style: normal;
  font-weight: 500;
}
</style>
