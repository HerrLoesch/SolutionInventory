<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-btn icon variant="text" @click="drawerOpen = !drawerOpen">
        <v-icon>mdi-menu</v-icon>
        <v-tooltip activator="parent" location="bottom">Toggle sidebar</v-tooltip>
      </v-btn>
      <v-img
        :src="baseUrl + 'Logo-small.png'"
        alt="Solution Inventory"
        width="28"
        height="28"
        class="ml-1 mr-1"
        style="flex: none;"
      />
      <v-toolbar-title>Solution Inventory</v-toolbar-title>

      <v-spacer />

      <v-btn class="mr-2" icon variant="text" size="small" @click="workspaceConfigOpen = true">
        <v-icon size="small">mdi-database-cog</v-icon>
        <v-tooltip activator="parent" location="bottom">Manage workspace</v-tooltip>
      </v-btn>

      <v-btn icon variant="text" size="small" href="https://github.com/HerrLoesch/SolutionInventory" target="_blank">
        <v-icon>mdi-github</v-icon>
        <v-tooltip activator="parent" location="bottom">GitHub Repository</v-tooltip>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawerOpen" app :width="drawerWidth" class="side-nav">
      <TreeNav />
      <div class="resize-handle" @mousedown.prevent="startResize" />
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-4 main-container">
        <v-window v-model="activeTab">
          <v-window-item value="questionnaire">
            <Workspace />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>


    <!-- Workspace Config Dialog -->
    <v-dialog v-model="workspaceConfigOpen" max-width="800" scrollable>
      <v-card>
        <v-card-title>Manage workspace</v-card-title>
        <v-divider />
        <v-card-text>
          <WorkspaceConfig @close="workspaceConfigOpen = false" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Electron: Set up workspace directory (first launch) -->
    <v-dialog v-if="isElectron" v-model="workspaceDirNeeded" persistent max-width="500">
      <v-card>
        <v-card-title class="text-h6">Set Up Workspace</v-card-title>
        <v-divider />
        <v-card-text>
          <p class="mb-4">
            Please choose a directory where your workspace data will be stored.
            The data will be saved as <code>solution-inventory-data.json</code> in that directory.
          </p>
          <v-text-field
            v-model="workspaceSetupDir"
            label="Workspace Directory"
            variant="outlined"
            readonly
            hide-details
            :placeholder="'No directory selected'"
          >
            <template #append-inner>
              <v-btn icon variant="text" size="small" @click="selectDirectory">
                <v-icon>mdi-folder-open</v-icon>
                <v-tooltip activator="parent" location="bottom">Choose directory</v-tooltip>
              </v-btn>
            </template>
          </v-text-field>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!workspaceSetupDir"
            @click="confirmWorkspace"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Workspace from './components/workspace/Workspace.vue'
import TreeNav from './components/TreeNav.vue'
import WorkspaceConfig from './components/workspace/WorkspaceConfig.vue'
import { useWorkspaceStore } from './stores/workspaceStore'

export default {
  components: { Workspace, TreeNav, WorkspaceConfig },
  setup() {
    const activeTab = ref('questionnaire')
    const drawerOpen = ref(true)
    const workspaceConfigOpen = ref(false)
    const drawerWidth = ref(parseInt(localStorage.getItem('sidebar-width') || '260', 10))

    let resizeStartX = 0
    let resizeStartWidth = 0

    function onResizeMove(e) {
      const delta = e.clientX - resizeStartX
      drawerWidth.value = Math.min(Math.max(resizeStartWidth + delta, 160), 640)
    }

    function stopResize() {
      document.removeEventListener('mousemove', onResizeMove)
      document.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem('sidebar-width', String(drawerWidth.value))
    }

    function startResize(e) {
      resizeStartX = e.clientX
      resizeStartWidth = drawerWidth.value
      document.addEventListener('mousemove', onResizeMove)
      document.addEventListener('mouseup', stopResize)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    onUnmounted(() => {
      document.removeEventListener('mousemove', onResizeMove)
      document.removeEventListener('mouseup', stopResize)
    })
    const store = useWorkspaceStore()
    const { lastSaved, workspaceDirNeeded } = storeToRefs(store)

    const isElectron = !!(window.electronAPI)
    const baseUrl = import.meta.env.BASE_URL
    const workspaceSetupDir = ref('')

    async function selectDirectory() {
      const dir = await window.electronAPI.selectWorkspaceDir()
      if (dir) workspaceSetupDir.value = dir
    }

    async function confirmWorkspace() {
      if (!workspaceSetupDir.value) return
      await store.setWorkspaceDir(workspaceSetupDir.value)
    }

    // Beim Start versuchen, gespeicherte Daten zu laden
    onMounted(async () => {
      await store.initFromStorage()
      store.startAutoSave()
    })

    return { 
      activeTab,
      lastSaved,
      drawerOpen,
      drawerWidth,
      startResize,
      workspaceConfigOpen,
      isElectron,
      baseUrl,
      workspaceDirNeeded,
      workspaceSetupDir,
      selectDirectory,
      confirmWorkspace
    }
  }
}
</script>

<style>
/* small global styles */
body { font-family: Roboto, Arial, sans-serif; }

.main-container {
  max-width: 1800px;
  margin: 0 auto;
}

.side-nav {
  border-right: 1px solid #ECEFF1;
  display: flex;
  flex-direction: column;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 200;
  transition: background 0.15s;
}

.resize-handle:hover {
  background: rgba(var(--v-theme-primary), 0.25);
}

.side-nav .project-tree-nav {
  flex: 1 1 auto;
  overflow-y: auto;
}

.nav-divider {
  margin: 8px 12px;
}

.nav-footer {
  margin-top: auto;
}

.nav-header {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #78909C;
}
</style>
