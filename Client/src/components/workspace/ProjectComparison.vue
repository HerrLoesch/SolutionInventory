<template>
  <div class="project-comparison">
    <v-alert v-if="projects.length < 2" type="info" density="compact" variant="tonal">
      At least two projects are needed to compare.
    </v-alert>

    <template v-else>
      <!-- Selection, kind filter and data source -->
      <div class="comparison-toolbar">
        <v-select
          v-model="selectedProjectIds"
          :items="projectItems"
          item-title="name"
          item-value="id"
          label="Projects"
          density="compact"
          variant="outlined"
          multiple
          chips
          hide-details
          class="toolbar-projects"
        />

        <v-btn-toggle v-model="visibleKinds" density="compact" variant="outlined" divided multiple rounded="lg">
          <v-btn value="tool" size="small">
            <v-icon start size="14">mdi-puzzle</v-icon>
            Tools
          </v-btn>
          <v-btn value="practice" size="small">
            <v-icon start size="14">mdi-lightbulb-outline</v-icon>
            Practices
          </v-btn>
          <v-btn value="unassigned" size="small">
            <v-icon start size="14">mdi-help-circle-outline</v-icon>
            Unassigned
          </v-btn>
        </v-btn-toggle>

        <v-select
          v-model="dataSource"
          :items="dataSourceItems"
          item-title="label"
          item-value="value"
          label="Data source"
          density="compact"
          variant="outlined"
          hide-details
          class="toolbar-source"
        />
      </div>

      <v-alert v-if="selectedProjectIds.length < 2" type="info" density="compact" variant="tonal" class="mt-3">
        Select at least two projects to compare.
      </v-alert>

      <!-- DE-4: a selected project without entries in the active selection is a
           warning, not a reason to switch the whole comparison to another source. -->
      <v-alert
        v-for="project in projectsWithoutEntries"
        :key="project.id"
        type="info"
        density="compact"
        variant="tonal"
        class="mt-3 empty-project-banner"
      >
        {{ project.name }} has no entries in this selection and appears as an empty column.
        <template #append>
          <v-btn v-if="dataSource === 'radar'" size="x-small" variant="text" @click="dataSource = 'answers'">
            Include all questionnaire answers
          </v-btn>
          <v-btn size="x-small" variant="text" @click="deselectProject(project.id)">
            Deselect {{ project.name }}
          </v-btn>
        </template>
      </v-alert>

      <div class="text-caption text-medium-emphasis mt-3">
        {{ rows.length }} terms · {{ metrics.compared }} compared · vocabulary coverage
        {{ metrics.vocabulary.percent }} %
      </div>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { buildAliasIndex } from '../../services/vocabulary'
import { collectUnits, buildRows, computeMetrics, vocabularyCoverage, DATA_SOURCES } from '../../services/comparison'

// The workspace comparison tab. Renders what services/comparison.js returns and
// computes nothing of its own (plan §5) — anything that looks like arithmetic
// here belongs back in the engine.
export default {
  setup() {
    const store = useWorkspaceStore()
    const projects = computed(() => store.workspace.projects || [])

    // All projects and all kinds are on to begin with: the first useful question
    // is "where does this workspace disagree with itself", not "pick a subset".
    const selectedProjectIds = ref(projects.value.map((project) => project.id))
    const visibleKinds = ref(['tool', 'practice', 'unassigned'])
    const dataSource = ref('radar')

    const dataSourceItems = [
      { value: 'radar', label: 'Radar' },
      { value: 'answers', label: 'All questionnaire answers' }
    ]

    // Projects can be added or deleted while the tab is open; a stale id would
    // silently count as a missing column, and a new project would never join.
    // Watching the id list rather than the array keeps this from firing on every
    // unrelated edit inside a project.
    watch(
      () => projects.value.map((project) => project.id).join('|'),
      () => {
        const currentIds = projects.value.map((project) => project.id)
        const existing = new Set(currentIds)
        const kept = selectedProjectIds.value.filter((id) => existing.has(id))
        const added = currentIds.filter((id) => !selectedProjectIds.value.includes(id))
        selectedProjectIds.value = [...kept, ...added]
      }
    )

    const projectItems = computed(() => projects.value.map((project) => ({ id: project.id, name: project.name })))

    const aliasIndex = computed(() => buildAliasIndex(store.workspace.vocabulary || []).index)

    const allUnits = computed(() =>
      collectUnits(store.workspace, selectedProjectIds.value, {
        source: dataSource.value,
        aliasIndex: aliasIndex.value
      })
    )

    // The kind filter narrows the rows, so every metric except vocabulary
    // coverage recomputes on the active selection (design §4.2).
    const units = computed(() => allUnits.value.filter((unit) => visibleKinds.value.includes(unit.kind)))

    const rows = computed(() => buildRows(units.value, aliasIndex.value))

    const metrics = computed(() =>
      computeMetrics(rows.value, selectedProjectIds.value, {
        overrides: store.workspace.comparisonOverrides || {},
        // Coverage ignores the kind filter but follows the data source, so it is
        // computed from the *unfiltered* units (design §5.1).
        vocabulary: vocabularyCoverage(allUnits.value, aliasIndex.value)
      })
    )

    // DE-4: warn, stay in the current source. One unmaintained project must not
    // tip the whole comparison into noise mode.
    const projectsWithoutEntries = computed(() => {
      const withEntries = new Set(units.value.map((unit) => unit.projectId))
      return projects.value.filter(
        (project) => selectedProjectIds.value.includes(project.id) && !withEntries.has(project.id)
      )
    })

    function deselectProject(projectId) {
      selectedProjectIds.value = selectedProjectIds.value.filter((id) => id !== projectId)
    }

    return {
      projects,
      projectItems,
      selectedProjectIds,
      visibleKinds,
      dataSource,
      dataSourceItems,
      dataSources: DATA_SOURCES,
      units,
      rows,
      metrics,
      projectsWithoutEntries,
      deselectProject
    }
  }
}
</script>

<style scoped>
.project-comparison {
  padding: 8px 4px;
}

.comparison-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-projects {
  max-width: 380px;
}

.toolbar-source {
  max-width: 240px;
}
</style>
