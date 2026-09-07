<template>
  <div class="project-tree-nav">
    <div class="tree-header">
      <div class="tree-title">Question Catalogs</div>
      <div class="tree-actions">
        <v-btn icon size="x-small" variant="text" aria-label="New catalog" @click="openCatalogDialog">
          <v-icon>mdi-plus</v-icon>
          <v-tooltip activator="parent" location="bottom">New catalog</v-tooltip>
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon size="x-small" variant="text" aria-label="Schema" v-bind="menuProps">
              <v-icon>mdi-file-code-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">Schema for catalog authoring</v-tooltip>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click.stop="copyAiSchema">
              <template #prepend>
                <v-icon size="16">mdi-clipboard-text-outline</v-icon>
              </template>
              <v-list-item-title>Copy to clipboard</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="downloadAiSchema">
              <template #prepend>
                <v-icon size="16">mdi-download</v-icon>
              </template>
              <v-list-item-title>Download as .md</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <div v-if="!catalogs.length" class="tree-list">
      <div class="text-caption text--secondary px-2 py-2">No catalogs yet.</div>
    </div>

    <div v-else class="catalog-list tree-list">
      <div v-for="catalog in catalogs" :key="catalog.id" class="catalog-item" @click="openCatalog(catalog.id)">
        <v-icon size="16" class="mr-1">mdi-file-tree-outline</v-icon>
        <span class="catalog-title">{{ catalog.name }}</span>
        <span class="catalog-summary text-caption text-medium-emphasis">{{ catalogSummaryText(catalog) }}</span>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon size="x-small" variant="text" class="item-menu" v-bind="menuProps" @click.stop>
              <v-icon size="16">mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click.stop="openCatalog(catalog.id)">
              <template #prepend>
                <v-icon size="16">mdi-pencil-box-outline</v-icon>
              </template>
              <v-list-item-title>Open</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="duplicateCatalogAction(catalog.id)">
              <template #prepend>
                <v-icon size="16">mdi-content-copy</v-icon>
              </template>
              <v-list-item-title>Duplicate</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="downloadCatalog(catalog.id)">
              <template #prepend>
                <v-icon size="16">mdi-download</v-icon>
              </template>
              <v-list-item-title>Export</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click.stop="openRenameCatalogDialog(catalog)">
              <template #prepend>
                <v-icon size="16">mdi-pencil</v-icon>
              </template>
              <v-list-item-title>Rename</v-list-item-title>
            </v-list-item>
            <v-list-item @click.stop="deleteCatalogAction(catalog.id)">
              <template #prepend>
                <v-icon size="16" color="error">mdi-delete</v-icon>
              </template>
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <v-divider class="nav-divider"></v-divider>

    <div class="tree-header">
      <div class="tree-title">Projects</div>
      <div class="tree-actions">
        <v-btn icon size="x-small" variant="text" aria-label="New project" @click="openProjectDialog">
          <v-icon>mdi-plus</v-icon>
          <v-tooltip activator="parent" location="bottom">New project</v-tooltip>
        </v-btn>
        <v-btn icon size="x-small" variant="text" aria-label="Import project" @click="openImportDialog">
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
        <span
          class="tree-click-prepend"
          :class="{ 'drag-handle': item.type === 'questionnaire' }"
          :draggable="item.type === 'questionnaire'"
          @click="onNodeClick(item)"
          @dragstart="item.type === 'questionnaire' && onDragStart(item.projectId, item.id)"
          @dragend="item.type === 'questionnaire' && onDragEnd()"
          @dragover.prevent="item.type === 'project' && onDragOver(item.id)"
          @dragleave="item.type === 'project' && onDragLeave(item.id)"
          @drop.prevent="item.type === 'project' && onDrop(item.id)"
        >
          <v-icon v-if="item.type === 'project'" size="18">mdi-folder</v-icon>
          <v-icon v-else size="16">mdi-file-document-outline</v-icon>
        </span>
      </template>

      <template #append="{ item }">
        <v-menu v-if="item.type === 'project'" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon size="x-small" variant="text" class="item-menu" v-bind="menuProps" @click.stop>
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
            <v-list-item @click.stop="openCatalogImportDialog(item.id)">
              <template #prepend>
                <v-icon size="16">mdi-robot-outline</v-icon>
              </template>
              <v-list-item-title>Import catalog (AI)</v-list-item-title>
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
            <v-btn icon size="x-small" variant="text" class="item-menu" v-bind="menuProps" @click.stop>
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
        <div
          class="tree-click-title"
          :class="{
            'drop-target': item.type === 'project' && isDropTarget(item.id),
            'drag-handle': item.type === 'questionnaire'
          }"
          :draggable="item.type === 'questionnaire'"
          @click="onNodeClick(item)"
          @dragstart="item.type === 'questionnaire' && onDragStart(item.projectId, item.id)"
          @dragend="item.type === 'questionnaire' && onDragEnd()"
          @dragover.prevent="item.type === 'project' && onDragOver(item.id)"
          @dragleave="item.type === 'project' && onDragLeave(item.id)"
          @drop.prevent="item.type === 'project' && onDrop(item.id)"
        >
          {{ item.title }}
        </div>
      </template>
    </v-treeview>

    <!-- Standalone / Unassigned Questionnaires -->
    <template v-if="standaloneQuestionnaires.length || isDragging">
      <div class="tree-header mt-3">
        <div class="tree-title">Unassigned</div>
      </div>
      <div
        class="standalone-list"
        :class="{ 'drop-target': unassignDropTarget }"
        @dragover.prevent="onDragOverUnassigned"
        @dragleave="onDragLeaveUnassigned"
        @drop.prevent="onDropUnassigned"
      >
        <div
          v-if="!standaloneQuestionnaires.length"
          class="text-caption px-2 py-2"
          :class="isDragging ? 'drop-hint-text' : 'text-medium-emphasis'"
        >
          {{ isDragging ? 'Drop to unassign from project' : 'No questionnaires' }}
        </div>

        <div
          v-for="q in standaloneQuestionnaires"
          :key="q.id"
          class="standalone-item"
          :class="{ 'reorder-target': isReorderTarget(q.id) }"
          draggable="true"
          @click="openQuestionnaire(q.id)"
          @dragstart.stop="onDragStart(null, q.id)"
          @dragend="onDragEnd()"
          @dragover.prevent.stop="onDragOverQuestionnaire(null, q.id)"
          @dragleave="onDragLeaveQuestionnaire(q.id)"
          @drop.prevent.stop="onDropOnStandaloneItem(q.id)"
        >
          <v-icon size="16" class="mr-1">mdi-file-document-outline</v-icon>
          <span class="standalone-title">{{ q.name }}</span>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn icon size="x-small" variant="text" class="item-menu" v-bind="menuProps" @click.stop>
                <v-icon size="16">mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click.stop="downloadQuestionnaire(q.id)">
                <template #prepend><v-icon size="16">mdi-download</v-icon></template>
                <v-list-item-title>Download</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click.stop="openRenameQuestionnaireDialog(q)">
                <template #prepend><v-icon size="16">mdi-pencil</v-icon></template>
                <v-list-item-title>Rename</v-list-item-title>
              </v-list-item>
              <v-list-item @click.stop="deleteQuestionnaire(q)">
                <template #prepend><v-icon size="16" color="error">mdi-delete</v-icon></template>
                <v-list-item-title>Delete</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </template>

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
          <v-select
            v-model="newProjectCatalogId"
            label="Default catalog"
            :items="catalogs"
            item-title="name"
            item-value="id"
            density="compact"
            class="mt-3"
            hide-details
          />
          <div v-if="newProjectCatalogSummary" class="text-caption text-medium-emphasis mt-1 ml-1">
            {{ newProjectCatalogSummary }}
          </div>
          <v-checkbox
            v-model="newProjectCreateQuestionnaire"
            label="Create first questionnaire from catalog"
            density="compact"
            hide-details
            class="mt-2"
          />
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn variant="text" @click="closeProjectDialog">Cancel</v-btn>
          <v-btn color="primary" @click="createProject">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="catalogDialogOpen" max-width="420">
      <v-card>
        <v-card-title>New catalog</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newCatalogName"
            label="Catalog name"
            density="compact"
            autofocus
            @keyup.enter="createCatalog"
          />
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn variant="text" @click="closeCatalogDialog">Cancel</v-btn>
          <v-btn color="primary" @click="createCatalog">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameCatalogDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Rename catalog</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameCatalogName"
            label="Catalog name"
            density="compact"
            autofocus
            @keyup.enter="confirmRenameCatalog"
          />
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn variant="text" @click="closeRenameCatalogDialog">Cancel</v-btn>
          <v-btn color="primary" @click="confirmRenameCatalog">Rename</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteCatalogBlockedDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Catalog in use</v-card-title>
        <v-card-text>
          <p class="mb-2">
            This catalog can't be deleted because the following project{{
              deleteCatalogBlockedProjects.length > 1 ? 's use' : ' uses'
            }}
            it as their default catalog:
          </p>
          <ul class="mb-0">
            <li v-for="name in deleteCatalogBlockedProjects" :key="name">{{ name }}</li>
          </ul>
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn color="primary" @click="closeDeleteCatalogBlockedDialog">Close</v-btn>
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
        <v-card-actions class="gap-3">
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
        <v-card-actions class="gap-3">
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
        <v-card-actions class="gap-3">
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
        <v-card-actions class="gap-3">
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
        <v-card-actions class="gap-3">
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
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn variant="text" @click="closeQuestionnaireNameDialog">Cancel</v-btn>
          <v-btn color="primary" @click="confirmQuestionnaireImport">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteProjectDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Delete project</v-card-title>
        <v-card-text>
          This project contains questionnaires. Are you sure you want to delete it and all its questionnaires?
        </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteProjectDialog">Cancel</v-btn>
          <v-btn color="error" @click="confirmDeleteProject">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteQuestionnaireDialogOpen" max-width="420">
      <v-card>
        <v-card-title>Delete questionnaire</v-card-title>
        <v-card-text> Are you sure you want to delete this questionnaire? </v-card-text>
        <v-card-actions class="gap-3">
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteQuestionnaireDialog">Cancel</v-btn>
          <v-btn color="error" @click="confirmDeleteQuestionnaire">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CatalogImportDialog
      v-model="catalogImportDialogOpen"
      :project-id="catalogImportProjectId"
      @imported="onCatalogImported"
      @notify="showSnackbar"
    />

    <v-snackbar v-model="snackbar" :timeout="3000" location="bottom">{{ snackbarText }}</v-snackbar>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { summarizeCatalog } from '../services/catalogService'
import { buildCatalogAuthoringPackage } from '../schema/catalogAiSchema'
import { useWorkspaceTabGuard } from '../composables/useWorkspaceTabGuard'
import CatalogImportDialog from './catalog/CatalogImportDialog.vue'

export default {
  components: { CatalogImportDialog },
  setup() {
    const store = useWorkspaceStore()
    const { canLeaveActiveTab } = useWorkspaceTabGuard()
    const projects = computed(() => store.workspace.projects || [])
    const catalogs = computed(() => store.workspace.catalogs || [])

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
    const newProjectCatalogId = ref('')
    const newProjectCreateQuestionnaire = ref(true)
    const catalogDialogOpen = ref(false)
    const newCatalogName = ref('')
    const renameCatalogDialogOpen = ref(false)
    const renameCatalogId = ref('')
    const renameCatalogName = ref('')
    const deleteCatalogBlockedDialogOpen = ref(false)
    const deleteCatalogBlockedProjects = ref([])
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
    const deleteProjectDialogOpen = ref(false)
    const pendingDeleteProjectId = ref('')
    const deleteQuestionnaireDialogOpen = ref(false)
    const pendingDeleteQuestionnaire = ref(null)
    const dragState = ref(null)
    const activeDropTarget = ref('')
    const reorderTarget = ref('')
    const unassignDropTarget = ref(false)
    const catalogImportDialogOpen = ref(false)
    const catalogImportProjectId = ref('')
    const snackbar = ref(false)
    const snackbarText = ref('')

    const standaloneQuestionnaires = computed(() => {
      const assigned = new Set()
      projects.value.forEach((p) => (p.questionnaireIds || []).forEach((id) => assigned.add(id)))
      return (store.workspace.questionnaires || []).filter((q) => !assigned.has(q.id))
    })

    const isDragging = computed(() => !!dragState.value)

    function catalogSummaryText(catalog) {
      const { categoryCount, entryCount } = summarizeCatalog(catalog)
      return `${categoryCount} categories · ${entryCount} questions`
    }

    const newProjectCatalogSummary = computed(() => {
      const catalog = catalogs.value.find((c) => c.id === newProjectCatalogId.value)
      return catalog ? catalogSummaryText(catalog) : ''
    })

    function openProjectDialog() {
      newProjectName.value = ''
      newProjectCatalogId.value = catalogs.value[0]?.id || ''
      newProjectCreateQuestionnaire.value = true
      projectDialogOpen.value = true
    }

    function openCatalogDialog() {
      newCatalogName.value = ''
      catalogDialogOpen.value = true
    }

    async function openCatalog(catalogId) {
      if (store.toCatalogTabId(catalogId) !== store.activeWorkspaceTabId && !(await canLeaveActiveTab())) return
      store.openCatalogEditor(catalogId)
    }

    function closeCatalogDialog() {
      catalogDialogOpen.value = false
    }

    function createCatalog() {
      const name = newCatalogName.value.trim()
      if (!name) return
      store.addCatalog(name)
      catalogDialogOpen.value = false
    }

    function duplicateCatalogAction(catalogId) {
      store.duplicateCatalog(catalogId)
    }

    function downloadCatalog(catalogId) {
      store.exportCatalog(catalogId)
    }

    function showSnackbar(text) {
      snackbarText.value = text
      snackbar.value = true
    }

    async function copyAiSchema() {
      const pkg = buildCatalogAuthoringPackage()
      try {
        await navigator.clipboard.writeText(pkg)
        showSnackbar('AI schema copied to clipboard.')
      } catch {
        downloadAiSchema()
        showSnackbar('Clipboard unavailable — downloaded the schema instead.')
      }
    }

    function downloadAiSchema() {
      const blob = new Blob([buildCatalogAuthoringPackage()], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'question-catalog-ai-schema.md'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    function openCatalogImportDialog(projectId) {
      catalogImportProjectId.value = projectId
      catalogImportDialogOpen.value = true
    }

    function onCatalogImported() {
      showSnackbar('Catalog imported and set as the project default.')
    }

    function openRenameCatalogDialog(catalog) {
      renameCatalogId.value = catalog.id
      renameCatalogName.value = catalog.name
      renameCatalogDialogOpen.value = true
    }

    function closeRenameCatalogDialog() {
      renameCatalogDialogOpen.value = false
      renameCatalogId.value = ''
      renameCatalogName.value = ''
    }

    function confirmRenameCatalog() {
      const name = renameCatalogName.value.trim()
      if (!renameCatalogId.value || !name) return
      store.renameCatalog(renameCatalogId.value, name)
      closeRenameCatalogDialog()
    }

    function deleteCatalogAction(catalogId) {
      const result = store.deleteCatalog(catalogId)
      if (!result.ok) {
        deleteCatalogBlockedProjects.value = result.referencingProjects
        deleteCatalogBlockedDialogOpen.value = true
      }
    }

    function closeDeleteCatalogBlockedDialog() {
      deleteCatalogBlockedDialogOpen.value = false
      deleteCatalogBlockedProjects.value = []
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
      const catalogId = newProjectCatalogId.value
      const projectId = store.addProject(name, catalogId)
      if (newProjectCreateQuestionnaire.value && catalogId) {
        // Name it after the catalog, not the project — a project can hold
        // several questionnaires, so reusing the project's own name here
        // would make the first one indistinguishable from the project node
        // itself in the tree/tabs.
        const catalog = store.getCatalogById(catalogId)
        store.addQuestionnaire(catalog?.name || 'New questionnaire', null, projectId)
      }
      projectDialogOpen.value = false
    }

    function deleteProject(projectId) {
      const project = projects.value.find((p) => p.id === projectId)
      const hasQuestionnaires = project && (project.questionnaireIds || []).length > 0
      if (hasQuestionnaires) {
        pendingDeleteProjectId.value = projectId
        deleteProjectDialogOpen.value = true
      } else {
        store.deleteProject(projectId)
      }
    }

    function closeDeleteProjectDialog() {
      deleteProjectDialogOpen.value = false
      pendingDeleteProjectId.value = ''
    }

    function confirmDeleteProject() {
      store.deleteProject(pendingDeleteProjectId.value)
      closeDeleteProjectDialog()
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
          const radarData = {
            radar: Array.isArray(data?.project?.radar) ? data.project.radar : [],
            radarRefs: Array.isArray(data?.project?.radarRefs) ? data.project.radarRefs : [],
            radarOverrides: Array.isArray(data?.project?.radarOverrides) ? data.project.radarOverrides : [],
            radarCategoryOrder: Array.isArray(data?.project?.radarCategoryOrder) ? data.project.radarCategoryOrder : [],
            radarExportSettings:
              data?.project?.radarExportSettings && typeof data.project.radarExportSettings === 'object'
                ? data.project.radarExportSettings
                : undefined
          }
          store.importProject(projectName, questionnaires, radarData)
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
      pendingDeleteQuestionnaire.value = questionnaire
      deleteQuestionnaireDialogOpen.value = true
    }

    function closeDeleteQuestionnaireDialog() {
      deleteQuestionnaireDialogOpen.value = false
      pendingDeleteQuestionnaire.value = null
    }

    function confirmDeleteQuestionnaire() {
      store.deleteQuestionnaire(pendingDeleteQuestionnaire.value.id)
      closeDeleteQuestionnaireDialog()
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

    async function openQuestionnaire(questionnaireId) {
      if (!(await canLeaveActiveTab())) return
      store.openQuestionnaire(questionnaireId)
    }

    async function openProjectSummary(projectId) {
      if (!(await canLeaveActiveTab())) return
      store.openProjectSummary(projectId)
    }

    function onNodeClick(item) {
      if (!item) return
      if (item.type === 'project') {
        openProjectSummary(item.id)
        return
      }
      if (item.type === 'questionnaire') {
        openQuestionnaire(item.id)
      }
    }

    function treeItemProps(item) {
      if (item.type === 'questionnaire') {
        return {
          class: ['questionnaire-item', { 'reorder-target': isReorderTarget(item.id) }],
          draggable: true,
          onDragstart: (e) => {
            e.stopPropagation()
            onDragStart(item.projectId, item.id)
          },
          onDragend: () => onDragEnd(),
          onDragover: (e) => {
            e.preventDefault()
            e.stopPropagation()
            onDragOverQuestionnaire(item.projectId, item.id)
          },
          onDragleave: () => onDragLeaveQuestionnaire(item.id),
          onDrop: (e) => {
            e.preventDefault()
            e.stopPropagation()
            onDropOnQuestionnaire(item.projectId, item.id)
          }
        }
      }
      if (item.type === 'project') {
        return {
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
      return {}
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

      store.addQuestionnaire(name, questionnaireImportData.value.categories, questionnaireImportProjectId.value)

      closeQuestionnaireNameDialog()
    }

    let dragLeaveTimer = null
    let dragLeaveQuestionnaireTimer = null

    function onDragStart(projectId, questionnaireId) {
      dragState.value = { projectId, questionnaireId }
    }

    function onDragEnd() {
      if (dragLeaveTimer) {
        clearTimeout(dragLeaveTimer)
        dragLeaveTimer = null
      }
      if (dragLeaveQuestionnaireTimer) {
        clearTimeout(dragLeaveQuestionnaireTimer)
        dragLeaveQuestionnaireTimer = null
      }
      dragState.value = null
      activeDropTarget.value = ''
      reorderTarget.value = ''
      unassignDropTarget.value = false
    }

    function onDragOver(projectId) {
      if (!dragState.value) return
      if (dragLeaveTimer) {
        clearTimeout(dragLeaveTimer)
        dragLeaveTimer = null
      }
      activeDropTarget.value = projectId
    }

    function onDragLeave(projectId) {
      dragLeaveTimer = setTimeout(() => {
        if (activeDropTarget.value === projectId) activeDropTarget.value = ''
        dragLeaveTimer = null
      }, 60)
    }

    function onDrop(projectId) {
      if (dragLeaveTimer) {
        clearTimeout(dragLeaveTimer)
        dragLeaveTimer = null
      }
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

    function onDragOverQuestionnaire(projectId, questionnaireId) {
      if (!dragState.value) return
      if (dragLeaveQuestionnaireTimer) {
        clearTimeout(dragLeaveQuestionnaireTimer)
        dragLeaveQuestionnaireTimer = null
      }
      // Clear project-level highlight – we're over a sibling, not the folder
      activeDropTarget.value = ''
      reorderTarget.value = questionnaireId
    }

    function onDragLeaveQuestionnaire(questionnaireId) {
      dragLeaveQuestionnaireTimer = setTimeout(() => {
        if (reorderTarget.value === questionnaireId) reorderTarget.value = ''
        dragLeaveQuestionnaireTimer = null
      }, 60)
    }

    function onDropOnQuestionnaire(projectId, beforeQuestionnaireId) {
      if (dragLeaveQuestionnaireTimer) {
        clearTimeout(dragLeaveQuestionnaireTimer)
        dragLeaveQuestionnaireTimer = null
      }
      if (!dragState.value) return
      const { projectId: fromProjectId, questionnaireId: draggedId } = dragState.value
      if (draggedId === beforeQuestionnaireId) {
        // Dropped on itself – no-op
      } else if (fromProjectId === null) {
        // Standalone → assign to project, then reorder before target
        store.assignQuestionnaireToProject(projectId, draggedId)
        store.reorderQuestionnaire(projectId, draggedId, beforeQuestionnaireId)
      } else if (fromProjectId === projectId) {
        // Same project – reorder
        store.reorderQuestionnaire(projectId, draggedId, beforeQuestionnaireId)
      } else {
        // Cross-project: move first, then insert before target
        store.moveQuestionnaire(fromProjectId, projectId, draggedId)
        store.reorderQuestionnaire(projectId, draggedId, beforeQuestionnaireId)
      }
      reorderTarget.value = ''
      activeDropTarget.value = ''
      dragState.value = null
    }

    let unassignDragLeaveTimer = null

    function onDragOverUnassigned() {
      if (!dragState.value) return
      if (unassignDragLeaveTimer) {
        clearTimeout(unassignDragLeaveTimer)
        unassignDragLeaveTimer = null
      }
      activeDropTarget.value = ''
      unassignDropTarget.value = true
    }

    function onDragLeaveUnassigned() {
      unassignDragLeaveTimer = setTimeout(() => {
        unassignDropTarget.value = false
        unassignDragLeaveTimer = null
      }, 60)
    }

    function onDropUnassigned() {
      if (unassignDragLeaveTimer) {
        clearTimeout(unassignDragLeaveTimer)
        unassignDragLeaveTimer = null
      }
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
      if (dragLeaveQuestionnaireTimer) {
        clearTimeout(dragLeaveQuestionnaireTimer)
        dragLeaveQuestionnaireTimer = null
      }
      if (!dragState.value) return
      const { projectId: fromProjectId, questionnaireId: draggedId } = dragState.value
      if (draggedId !== beforeId && fromProjectId !== null) {
        store.unassignQuestionnaire(draggedId)
      }
      reorderTarget.value = ''
      unassignDropTarget.value = false
      dragState.value = null
    }

    function projectQuestionnaires(project) {
      return store.getProjectQuestionnaires(project)
    }

    function isDropTarget(projectId) {
      return activeDropTarget.value === projectId
    }

    function isReorderTarget(questionnaireId) {
      return reorderTarget.value === questionnaireId
    }

    // React to menu actions dispatched from the Electron menu bar
    watch(
      () => store.pendingMenuAction,
      (pending) => {
        if (!pending) return
        const { action, payload } = pending
        if (action === 'new-project') {
          openProjectDialog()
          store.clearMenuAction()
        } else if (action === 'import-project') {
          openImportDialog()
          store.clearMenuAction()
        } else if (action === 'new-questionnaire') {
          questionnaireImportProjectId.value = payload?.projectId || ''
          targetProjectId.value = payload?.projectId || ''
          newQuestionnaireName.value = ''
          questionnaireDialogOpen.value = true
          store.clearMenuAction()
        } else if (action === 'import-questionnaire') {
          openQuestionnaireImportDialog(payload?.projectId || '')
          store.clearMenuAction()
        }
      },
      { deep: true }
    )

    return {
      projects,
      catalogs,
      catalogSummaryText,
      newProjectCatalogId,
      newProjectCatalogSummary,
      newProjectCreateQuestionnaire,
      catalogDialogOpen,
      newCatalogName,
      openCatalogDialog,
      openCatalog,
      closeCatalogDialog,
      createCatalog,
      duplicateCatalogAction,
      downloadCatalog,
      copyAiSchema,
      downloadAiSchema,
      openCatalogImportDialog,
      onCatalogImported,
      catalogImportDialogOpen,
      catalogImportProjectId,
      showSnackbar,
      snackbar,
      snackbarText,
      renameCatalogDialogOpen,
      renameCatalogName,
      openRenameCatalogDialog,
      closeRenameCatalogDialog,
      confirmRenameCatalog,
      deleteCatalogAction,
      deleteCatalogBlockedDialogOpen,
      deleteCatalogBlockedProjects,
      closeDeleteCatalogBlockedDialog,
      treeItems,
      opened,
      treeItemProps,
      onNodeClick,
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
      deleteProjectDialogOpen,
      closeDeleteProjectDialog,
      confirmDeleteProject,
      deleteQuestionnaireDialogOpen,
      closeDeleteQuestionnaireDialog,
      confirmDeleteQuestionnaire,
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
      onDragOverQuestionnaire,
      onDragLeaveQuestionnaire,
      onDropOnQuestionnaire,
      onDragOverUnassigned,
      onDragLeaveUnassigned,
      onDropUnassigned,
      onDropOnStandaloneItem,
      isDropTarget,
      isReorderTarget,
      projectQuestionnaires,
      standaloneQuestionnaires,
      isDragging,
      unassignDropTarget
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
  color: #78909c;
}

.tree-list {
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
  background: rgba(21, 101, 192, 0.12);
  border-radius: 3px;
  outline: 1px dashed rgba(21, 101, 192, 0.4);
}

.tree-click-title {
  width: 100%;
  cursor: pointer;
}

.tree-click-prepend {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.drag-handle {
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.tree-list :deep(.reorder-target) {
  border-top: 2px solid rgb(21, 101, 192) !important;
}

.standalone-list {
  min-height: 32px;
  border-radius: 4px;
  padding: 2px 0;
  transition:
    background 0.15s,
    outline 0.15s;
  margin-bottom: 8px;
}

.standalone-list.drop-target {
  background: rgba(21, 101, 192, 0.08);
  outline: 1px dashed rgba(21, 101, 192, 0.5);
}

.standalone-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  user-select: none;
  cursor: grab;
}

.standalone-item:active {
  cursor: grabbing;
}

.standalone-item:hover {
  background: rgba(0, 0, 0, 0.06);
}

.standalone-item:hover .item-menu {
  opacity: 1;
  pointer-events: auto;
}

.standalone-item.reorder-target {
  border-top: 2px solid rgb(21, 101, 192);
}

.standalone-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drop-hint-text {
  color: rgb(21, 101, 192);
  font-style: italic;
}

.catalog-list {
  display: flex;
  flex-direction: column;
}

.catalog-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}

.catalog-item:hover {
  background: rgba(0, 0, 0, 0.06);
}

.catalog-item:hover .item-menu {
  opacity: 1;
  pointer-events: auto;
}

.catalog-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
  margin-right: 4px;
}
</style>
