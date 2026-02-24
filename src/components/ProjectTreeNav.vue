<template>
  <div class="project-tree-nav">
    <div class="tree-header">
      <div class="tree-title">Projects</div>
      <div class="tree-actions">
        <v-btn icon size="x-small" variant="text" @click="openProjectDialog">
          <v-icon>mdi-plus</v-icon>
          <v-tooltip activator="parent" location="bottom">New project</v-tooltip>
        </v-btn>
        <v-btn icon size="x-small" variant="text" @click="openImportDialog">
          <v-icon>mdi-file-upload</v-icon>
          <v-tooltip activator="parent" location="bottom">Import project</v-tooltip>
        </v-btn>
      </div>
    </div>

    <div v-if="!projects.length" class="tree-list">
      <div class="text-caption text--secondary px-2 py-2">No projects yet.</div>
    </div>

    <v-treeview
      v-else
      v-model:opened="opened"
      :items="treeItems"
      item-title="title"
      item-value="id"
      item-children="children"
      density="compact"
      class="tree-list"
      :item-props="treeItemProps"
    >
      <template #prepend="{ item }">
        <v-icon v-if="item.type === 'project'" size="18">mdi-folder</v-icon>
        <v-icon v-else size="16">mdi-file-document-outline</v-icon>
      </template>

      <template #append="{ item }">
        <v-menu v-if="item.type === 'project'" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              icon
              size="x-small"
              variant="text"
              class="item-menu"
              v-bind="menuProps"
              @click.stop
            >
              <v-icon size="16">mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click.stop="openQuestionnaireDialog(item.id)">
              <template #prepend>
                <v-icon size="16">mdi-file-plus</v-icon>
              </template>
              <v-list-item-title>Add</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="openQuestionnaireImportDialog(item.id)">
              <template #prepend>
                <v-icon size="16">mdi-file-upload</v-icon>
              </template>
              <v-list-item-title>Import Questionnaire</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="downloadProject(item.id)">
              <template #prepend>
                <v-icon size="16">mdi-download</v-icon>
              </template>
              <v-list-item-title>Download</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click.stop="openRenameProjectDialog(item.project)">
              <template #prepend>
                <v-icon size="16">mdi-pencil</v-icon>
              </template>
              <v-list-item-title>Rename</v-list-item-title>
            </v-list-item>

            <v-list-item @click.stop="deleteProject(item.id)">
              <template #prepend>
                <v-icon size="16" color="error">mdi-delete</v-icon>
              </template>
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-menu v-else location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              icon
              size="x-small"
              variant="text"
              class="item-menu"
              v-bind="menuProps"
              @click.stop
            >
              <v-icon size="16">mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click.stop="downloadQuestionnaire(item.id)">
              <template #prepend>
                <v-icon size="16">mdi-download</v-icon>
              </template>
              <v-list-item-title>Download</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click.stop="openRenameQuestionnaireDialog(item.questionnaire)">
              <template #prepend>
                <v-icon size="16">mdi-pencil</v-icon>
              </template>
              <v-list-item-title>Rename</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="deleteQuestionnaire(item.questionnaire)">
              <template #prepend>
                <v-icon size="16" color="error">mdi-delete</v-icon>
              </template>
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <template #title="{ item }">
        <span :class="{ 'drop-target': item.type === 'project' && isDropTarget(item.id) }">
          {{ item.title }}
        </span>
      </template>
    </v-treeview>

    <v-dialog v-model="projectDialogOpen" max-width="420">
      <v-card>
        <v-card-title>New project</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newProjectName"
            label="Project name"
            density="compact"
            autofocus
            @keyup.enter="createProject"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeProjectDialog">Cancel</v-btn>
          <v-btn color="primary" @click="createProject">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="questionnaireDialogOpen" max-width="420">
      <v-card>
        <v-card-title>New questionnaire</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newQuestionnaireName"
            label="Questionnaire name"
            density="compact"
            autofocus
            @keyup.enter="createQuestionnaire"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeQuestionnaireDialog">Cancel</v-btn>
          <v-btn color="primary" @click="createQuestionnaire">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameProjectDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Rename project</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameProjectName"
            label="Project name"
            density="compact"
            autofocus
            @keyup.enter="confirmRenameProject"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeRenameProjectDialog">Cancel</v-btn>
          <v-btn color="primary" @click="confirmRenameProject">Rename</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameQuestionnaireDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Rename questionnaire</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameQuestionnaireName"
            label="Questionnaire name"
            density="compact"
            autofocus
            @keyup.enter="confirmRenameQuestionnaire"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeRenameQuestionnaireDialog">Cancel</v-btn>
          <v-btn color="primary" @click="confirmRenameQuestionnaire">Rename</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="importDialogOpen" max-width="520">
      <v-card>
        <v-card-title>Import project</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="importFile"
            label="Select JSON file"
            accept=".json"
            density="compact"
            prepend-icon="mdi-file-upload"
            @update:model-value="clearImportError"
          />
          <v-alert v-if="importError" type="error" density="compact" class="mt-2">
            {{ importError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeImportDialog">Cancel</v-btn>
          <v-btn color="primary" :disabled="!importFile" @click="confirmImport">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="questionnaireImportDialogOpen" max-width="520">
      <v-card>
        <v-card-title>Import questionnaire</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="questionnaireImportFile"
            label="Select JSON file"
            accept=".json"
            density="compact"
            prepend-icon="mdi-file-upload"
            @update:model-value="clearQuestionnaireImportError"
          />
          <v-alert v-if="questionnaireImportError" type="error" density="compact" class="mt-2">
            {{ questionnaireImportError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeQuestionnaireImportDialog">Cancel</v-btn>
          <v-btn color="primary" :disabled="!questionnaireImportFile" @click="proceedToNameDialog">Next</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="questionnaireNameDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Questionnaire name</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="questionnaireImportName"
            label="Questionnaire name"
            density="compact"
            autofocus
            @keyup.enter="confirmQuestionnaireImport"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeQuestionnaireNameDialog">Cancel</v-btn>
          <v-btn color="primary" @click="confirmQuestionnaireImport">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../stores/workspaceStore'

export default {
  setup() {
    const store = useWorkspaceStore()
    const projects = computed(() => store.workspace.projects || [])

    const treeItems = computed(() => {
      return projects.value.map((project) => ({
        id: project.id,
        title: project.name,
        type: 'project',
        project,
        children: projectQuestionnaires(project).map((questionnaire) => ({
          id: questionnaire.id,
          title: questionnaire.name,
          type: 'questionnaire',
          questionnaire,
          projectId: project.id
        }))
      }))
    })

    const opened = computed({
      get: () => projects.value.filter((p) => p.expanded).map((p) => p.id),
      set: (value) => {
        const openedSet = new Set(Array.isArray(value) ? value : [])
        projects.value.forEach((p) => {
          p.expanded = openedSet.has(p.id)
        })
      }
    })
    const projectDialogOpen = ref(false)
    const questionnaireDialogOpen = ref(false)
    const renameProjectDialogOpen = ref(false)
    const renameQuestionnaireDialogOpen = ref(false)
    const importDialogOpen = ref(false)
    const importFile = ref(null)
    const importError = ref('')
    const questionnaireImportDialogOpen = ref(false)
    const questionnaireNameDialogOpen = ref(false)
    const questionnaireImportFile = ref(null)
    const questionnaireImportError = ref('')
    const questionnaireImportName = ref('')
    const questionnaireImportData = ref(null)
    const questionnaireImportProjectId = ref('')
    const newProjectName = ref('')
    const newQuestionnaireName = ref('')
    const renameProjectId = ref('')
    const renameProjectName = ref('')
    const renameQuestionnaireId = ref('')
    const renameQuestionnaireName = ref('')
    const targetProjectId = ref('')
    const dragState = ref(null)
    const activeDropTarget = ref('')

    function openProjectDialog() {
      newProjectName.value = ''
      projectDialogOpen.value = true
    }

    function openImportDialog() {
      importError.value = ''
      importFile.value = null
      importDialogOpen.value = true
    }

    function closeImportDialog() {
      importDialogOpen.value = false
      importError.value = ''
      importFile.value = null
    }

    function clearImportError() {
      importError.value = ''
    }

    function closeProjectDialog() {
      projectDialogOpen.value = false
    }

    function createProject() {
      const name = newProjectName.value.trim()
      if (!name) return
      store.addProject(name)
      projectDialogOpen.value = false
    }

    function deleteProject(projectId) {
      if (!confirm('Delete this project and its questionnaires?')) return
      store.deleteProject(projectId)
    }

    function downloadProject(projectId) {
      store.exportProject(projectId)
    }

    function openRenameProjectDialog(project) {
      renameProjectId.value = project.id
      renameProjectName.value = project.name
      renameProjectDialogOpen.value = true
    }

    function closeRenameProjectDialog() {
      renameProjectDialogOpen.value = false
      renameProjectId.value = ''
      renameProjectName.value = ''
    }

    function confirmRenameProject() {
      const name = renameProjectName.value.trim()
      if (!renameProjectId.value || !name) return
      store.renameProject(renameProjectId.value, name)
      closeRenameProjectDialog()
    }

    function confirmImport() {
      const file = Array.isArray(importFile.value) ? importFile.value[0] : importFile.value
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          const projectName = data?.project?.name || data?.projectName || data?.name
          if (!projectName) {
            throw new Error('Missing project name.')
          }
          if (!Array.isArray(data.questionnaires)) {
            throw new Error('Missing questionnaires array.')
          }
          const questionnaires = data.questionnaires.map((item) => {
            if (!Array.isArray(item?.categories)) {
              throw new Error('Each questionnaire must include a categories array.')
            }
            return {
              name: item.name || 'Imported questionnaire',
              categories: item.categories
            }
          })
          store.importProject(projectName, questionnaires)
          closeImportDialog()
        } catch (err) {
          importError.value = `Import failed: ${err.message}`
        }
      }
      reader.readAsText(file)
    }

    function openRenameQuestionnaireDialog(questionnaire) {
      renameQuestionnaireId.value = questionnaire.id
      renameQuestionnaireName.value = questionnaire.name
      renameQuestionnaireDialogOpen.value = true
    }

    function closeRenameQuestionnaireDialog() {
      renameQuestionnaireDialogOpen.value = false
      renameQuestionnaireId.value = ''
      renameQuestionnaireName.value = ''
    }

    function confirmRenameQuestionnaire() {
      const name = renameQuestionnaireName.value.trim()
      const id = renameQuestionnaireId.value
      if (!id || !name) {
        closeRenameQuestionnaireDialog()
        return
      }
      store.renameQuestionnaire(id, name)
      closeRenameQuestionnaireDialog()
    }

    function deleteQuestionnaire(questionnaire) {
      const name = questionnaire.name || 'questionnaire'
      if (!confirm(`Delete questionnaire "${name}"?`)) return
      store.deleteQuestionnaire(questionnaire.id)
    }

    function downloadQuestionnaire(questionnaireId) {
      store.saveQuestionnaire(questionnaireId)
    }

    function openQuestionnaireDialog(projectId) {
      targetProjectId.value = projectId
      newQuestionnaireName.value = ''
      questionnaireDialogOpen.value = true
    }

    function closeQuestionnaireDialog() {
      questionnaireDialogOpen.value = false
    }

    function createQuestionnaire() {
      const name = newQuestionnaireName.value.trim()
      if (!name) return
      store.addQuestionnaire(name, null, targetProjectId.value)
      questionnaireDialogOpen.value = false
    }

    function openQuestionnaire(questionnaireId) {
      store.openQuestionnaire(questionnaireId)
    }

    function openProjectSummary(projectId) {
      store.openProjectSummary(projectId)
    }

    function treeItemProps(item) {
      if (item.type === 'project') {
        return {
          onClick: () => openProjectSummary(item.id),
          onDragover: (e) => {
            e.preventDefault()
            onDragOver(item.id)
          },
          onDragleave: () => onDragLeave(item.id),
          onDrop: (e) => {
            e.preventDefault()
            onDrop(item.id)
          }
        }
      }

      // questionnaire
      return {
        class: 'questionnaire-item',
        draggable: true,
        onClick: () => openQuestionnaire(item.id),
        onDragstart: () => onDragStart(item.projectId, item.id),
        onDragend: () => onDragEnd()
      }
    }

    function openQuestionnaireImportDialog(projectId) {
      questionnaireImportProjectId.value = projectId
      questionnaireImportFile.value = null
      questionnaireImportError.value = ''
      questionnaireImportDialogOpen.value = true
    }

    function closeQuestionnaireImportDialog() {
      questionnaireImportDialogOpen.value = false
      questionnaireImportFile.value = null
      questionnaireImportError.value = ''
      questionnaireImportData.value = null
    }

    function clearQuestionnaireImportError() {
      questionnaireImportError.value = ''
    }

    function proceedToNameDialog() {
      const file = Array.isArray(questionnaireImportFile.value) 
        ? questionnaireImportFile.value[0] 
        : questionnaireImportFile.value
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (!Array.isArray(data.categories)) {
            throw new Error('Invalid questionnaire format. Expected a categories array.')
          }
          questionnaireImportData.value = data
          questionnaireImportName.value = data.name || 'Imported questionnaire'
          questionnaireImportDialogOpen.value = false
          questionnaireNameDialogOpen.value = true
        } catch (err) {
          questionnaireImportError.value = `Import failed: ${err.message}`
        }
      }
      reader.readAsText(file)
    }

    function closeQuestionnaireNameDialog() {
      questionnaireNameDialogOpen.value = false
      questionnaireImportName.value = ''
      questionnaireImportData.value = null
      questionnaireImportFile.value = null
    }

    function confirmQuestionnaireImport() {
      const name = questionnaireImportName.value.trim()
      if (!name || !questionnaireImportData.value) return

      store.addQuestionnaire(
        name,
        questionnaireImportData.value.categories,
        questionnaireImportProjectId.value
      )

      closeQuestionnaireNameDialog()
    }

    function onDragStart(projectId, questionnaireId) {
      dragState.value = { projectId, questionnaireId }
    }

    function onDragEnd() {
      dragState.value = null
      activeDropTarget.value = ''
    }

    function onDragOver(projectId) {
      if (!dragState.value) return
      activeDropTarget.value = projectId
    }

    function onDragLeave(projectId) {
      if (activeDropTarget.value === projectId) {
        activeDropTarget.value = ''
      }
    }

    function onDrop(projectId) {
      if (!dragState.value) return
      if (dragState.value.projectId === projectId) return
      store.moveQuestionnaire(dragState.value.projectId, projectId, dragState.value.questionnaireId)
      activeDropTarget.value = ''
      dragState.value = null
    }

    function projectQuestionnaires(project) {
      return store.getProjectQuestionnaires(project)
    }

    function isDropTarget(projectId) {
      return activeDropTarget.value === projectId
    }

    return {
      projects,
      treeItems,
      opened,
      treeItemProps,
      projectDialogOpen,
      questionnaireDialogOpen,
      renameProjectDialogOpen,
      renameQuestionnaireDialogOpen,
      importDialogOpen,
      importFile,
      importError,
      questionnaireImportDialogOpen,
      questionnaireNameDialogOpen,
      questionnaireImportFile,
      questionnaireImportError,
      questionnaireImportName,
      newProjectName,
      newQuestionnaireName,
      renameProjectName,
      renameQuestionnaireName,
      openProjectDialog,
      openImportDialog,
      closeImportDialog,
      clearImportError,
      confirmImport,
      closeProjectDialog,
      createProject,
      deleteProject,
      downloadProject,
      openRenameProjectDialog,
      closeRenameProjectDialog,
      confirmRenameProject,
      openRenameQuestionnaireDialog,
      closeRenameQuestionnaireDialog,
      confirmRenameQuestionnaire,
      deleteQuestionnaire,
      downloadQuestionnaire,
      openQuestionnaireDialog,
      openQuestionnaireImportDialog,
      closeQuestionnaireImportDialog,
      clearQuestionnaireImportError,
      proceedToNameDialog,
      closeQuestionnaireNameDialog,
      confirmQuestionnaireImport,
      closeQuestionnaireDialog,
      createQuestionnaire,
      openQuestionnaire,
      openProjectSummary,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDrop,
      isDropTarget,
      projectQuestionnaires
    }
  }
}
</script>

<style scoped>
.project-tree-nav {
  padding: 8px 8px 0 8px;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.tree-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tree-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #78909C;
}

.tree-list {
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.questionnaire-item :deep(.v-list-item__content) {
  font-size: 12px;
}

.item-menu {
  opacity: 0;
  pointer-events: none;
}

.tree-list :deep(.v-list-item:hover .item-menu) {
  opacity: 1;
  pointer-events: auto;
}

.drop-target {
  background: rgba(21, 101, 192, 0.08);
}
</style>
