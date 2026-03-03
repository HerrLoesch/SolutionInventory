<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-btn icon variant="text" @click="drawerOpen = !drawerOpen">
        <v-icon>mdi-menu</v-icon>
        <v-tooltip activator="parent" location="bottom">Toggle sidebar</v-tooltip>
      </v-btn>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>

      <v-spacer />

      <!-- Auto-save Indikator -->
      <v-chip v-if="lastSaved" size="x-small" class="mr-2" variant="text">
        <v-icon size="small" class="mr-1">mdi-content-save</v-icon>
        {{ lastSaved }}
      </v-chip>

      <v-btn class="mr-2" variant="text" size="small" @click="loadSample">
        <v-icon size="small" class="mr-1">mdi-flask-outline</v-icon>
        Sample
      </v-btn>

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
  </v-app>
</template>

<script>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Workspace from './components/workspace/Workspace.vue'
import TreeNav from './components/TreeNav.vue'
import WorkspaceConfig from './components/workspace/WorkspaceConfig.vue'
import { useWorkspaceStore } from './stores/workspaceStore'
import sampleData from '../data/sample_export.json'

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
    const { lastSaved } = storeToRefs(store)

    // Beim Start versuchen, gespeicherte Daten zu laden
    onMounted(() => {
      store.initFromStorage()
      store.startAutoSave()
    })

    function loadSample() {
      store.addQuestionnaireFromCategories('Sample', sampleData.categories)
    }

    return { 
      activeTab,
      lastSaved,
      drawerOpen,
      drawerWidth,
      startResize,
      loadSample,
      workspaceConfigOpen
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
