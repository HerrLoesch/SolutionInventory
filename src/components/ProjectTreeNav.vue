<template>
  <div class="project-tree-nav">
    <div class="tree-header">
      <div class="tree-title">Projects</div>
      <v-btn icon size="x-small" variant="text" @click="openProjectDialog">
        <v-icon>mdi-folder-plus</v-icon>
      </v-btn>
    </div>

    <v-list density="compact" class="tree-list">
      <v-list-item v-if="!localProjects.length" class="text-caption text--secondary">
        No projects yet.
      </v-list-item>

      <v-list-group
        v-for="project in localProjects"
        :key="project.id"
        v-model="project.expanded"
        class="project-group"
        @dragover.prevent="onDragOver(project.id)"
        @dragleave="onDragLeave(project.id)"
        @drop="onDrop(project.id)"
      >
        <template #activator="{ props }">
          <v-list-item v-bind="props" :class="{ 'drop-target': isDropTarget(project.id) }">
            <template #prepend>
              <v-icon size="18">mdi-folder</v-icon>
            </template>
            <v-list-item-title>{{ project.name }}</v-list-item-title>
            <template #append>
              <v-menu location="bottom end">
                <template #activator="{ props: menuProps }">
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    v-bind="menuProps"
                  >
                    <v-icon size="16">mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item @click="openQuestionnaireDialog(project.id)">
                    <template #prepend>
                      <v-icon size="16">mdi-file-plus</v-icon>
                    </template>
                    <v-list-item-title>New questionnaire</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="deleteProject(project.id)">
                    <template #prepend>
                      <v-icon size="16" color="error">mdi-delete</v-icon>
                    </template>
                    <v-list-item-title>Delete project</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </template>

        <v-list-item
          v-for="questionnaire in project.questionnaires"
          :key="questionnaire.id"
          class="questionnaire-item"
          draggable="true"
          @dragstart="onDragStart(project.id, questionnaire.id)"
          @dragend="onDragEnd"
        >
          <template #prepend>
            <v-icon size="16">mdi-file-document-outline</v-icon>
          </template>
          <v-list-item-title>{{ questionnaire.name }}</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="!project.questionnaires.length" density="compact">
          <v-list-item-title class="text-caption text--secondary">
            No questionnaires
          </v-list-item-title>
        </v-list-item>
      </v-list-group>
    </v-list>

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
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  props: {
    projects: {
      type: Array,
      required: true
    }
  },
  emits: ['update-projects', 'open-questionnaire'],
  setup(props, { emit }) {
    const localProjects = ref(cloneProjects(props.projects))
    const projectDialogOpen = ref(false)
    const questionnaireDialogOpen = ref(false)
    const newProjectName = ref('')
    const newQuestionnaireName = ref('')
    const targetProjectId = ref('')
    const dragState = ref(null)
    const activeDropTarget = ref('')

    watch(() => props.projects, (value) => {
      localProjects.value = cloneProjects(value)
    }, { deep: true })

    function cloneProjects(source) {
      return (source || []).map((project) => ({
        id: project.id,
        name: project.name,
        expanded: project.expanded ?? true,
        questionnaires: (project.questionnaires || []).map((item) => ({
          id: item.id,
          name: item.name
        }))
      }))
    }

    function emitProjects() {
      emit('update-projects', cloneProjects(localProjects.value))
    }

    function openProjectDialog() {
      newProjectName.value = ''
      projectDialogOpen.value = true
    }

    function closeProjectDialog() {
      projectDialogOpen.value = false
    }

    function createProject() {
      const name = newProjectName.value.trim()
      if (!name) return
      localProjects.value.push({
        id: createId('project'),
        name,
        expanded: true,
        questionnaires: []
      })
      projectDialogOpen.value = false
      emitProjects()
    }

    function deleteProject(projectId) {
      if (!confirm('Delete this project and its questionnaires?')) return
      localProjects.value = localProjects.value.filter((project) => project.id !== projectId)
      emitProjects()
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
      const project = localProjects.value.find((item) => item.id === targetProjectId.value)
      if (!project) return
      const newItem = {
        id: createId('questionnaire'),
        name
      }
      project.questionnaires = [...project.questionnaires, newItem]
      project.expanded = true
      localProjects.value = [...localProjects.value]
      questionnaireDialogOpen.value = false
      emitProjects()
      emit('open-questionnaire', { projectId: project.id, name: newItem.name })
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
      const fromProject = localProjects.value.find((item) => item.id === dragState.value.projectId)
      const toProject = localProjects.value.find((item) => item.id === projectId)
      if (!fromProject || !toProject) return
      const index = fromProject.questionnaires.findIndex((item) => item.id === dragState.value.questionnaireId)
      if (index === -1) return
      const [moved] = fromProject.questionnaires.splice(index, 1)
      toProject.questionnaires.push(moved)
      activeDropTarget.value = ''
      dragState.value = null
      emitProjects()
    }

    function isDropTarget(projectId) {
      return activeDropTarget.value === projectId
    }

    function createId(prefix) {
      return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
    }

    return {
      localProjects,
      projectDialogOpen,
      questionnaireDialogOpen,
      newProjectName,
      newQuestionnaireName,
      openProjectDialog,
      closeProjectDialog,
      createProject,
      deleteProject,
      openQuestionnaireDialog,
      closeQuestionnaireDialog,
      createQuestionnaire,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDrop,
      isDropTarget
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

.project-group :deep(.v-list-group__items) {
  margin-left: 12px;
}

.questionnaire-item :deep(.v-list-item__content) {
  font-size: 12px;
}

.drop-target {
  background: rgba(21, 101, 192, 0.08);
}
</style>
