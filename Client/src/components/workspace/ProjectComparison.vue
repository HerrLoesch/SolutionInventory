<template>
  <div class="project-comparison">
    <v-alert v-if="projects.length < 2" type="info" density="compact" variant="tonal">
      At least two projects are needed to compare.
    </v-alert>
    <div v-else class="text-caption text-medium-emphasis">
      Comparing {{ selectedProjectIds.length }} of {{ projects.length }} projects.
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'

// The workspace comparison tab. Renders what services/comparison.js returns and
// computes nothing of its own (plan §5) — anything that looks like arithmetic
// here belongs back in the engine.
export default {
  setup() {
    const store = useWorkspaceStore()
    const projects = computed(() => store.workspace.projects || [])

    // All projects are selected to begin with: the first useful question is
    // "where does this workspace disagree with itself", not "pick two".
    const selectedProjectIds = ref(projects.value.map((project) => project.id))

    return { projects, selectedProjectIds }
  }
}
</script>

<style scoped>
.project-comparison {
  padding: 8px 4px;
}
</style>
