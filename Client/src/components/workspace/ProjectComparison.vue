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

      <!-- Vocabulary: coverage per project and the work list of names the
           vocabulary does not know yet. Ignores the kind filter on purpose —
           following it would hide exactly the names that most need assigning. -->
      <v-card variant="outlined" class="mt-4">
        <v-card-title class="text-subtitle-2 d-flex align-center justify-space-between">
          <span>Vocabulary</span>
          <v-btn size="x-small" variant="tonal" :disabled="!exactMatches.length" @click="resolveAllExactMatches">
            Resolve all exact matches ({{ exactMatches.length }})
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="coverage-row">
            <span v-for="project in selectedProjects" :key="project.id" class="coverage-chip">
              {{ project.name }}
              <strong>{{ (coveragePerProject[project.id] || {}).percent }} %</strong>
              <span class="text-medium-emphasis">
                ({{ (coveragePerProject[project.id] || {}).unresolved }} unresolved)
              </span>
            </span>
          </div>

          <div v-if="!unresolved.length" class="text-caption text-medium-emphasis mt-2">
            Every name in this selection is in the vocabulary.
          </div>

          <div v-for="group in unresolved" :key="group.key" class="unresolved-group">
            <div class="unresolved-spellings">
              <span v-for="spelling in group.spellings" :key="spelling.rawName" class="text-body-2">
                "{{ spelling.rawName }}"
                <span class="text-caption text-medium-emphasis">{{ projectNamesOf(spelling.projectIds) }}</span>
              </span>
            </div>

            <div v-if="suggestionsFor(group).length" class="unresolved-actions">
              <template v-for="suggestion in suggestionsFor(group)" :key="suggestion.term.id">
                <v-chip size="small" variant="outlined" @click="assignGroup(group, suggestion.term.id)">
                  Assign to {{ suggestion.term.name }}
                </v-chip>
                <v-btn size="x-small" variant="text" @click="dismissSuggestion(group, suggestion.term)"> Later </v-btn>
              </template>
            </div>
            <div v-else class="text-caption text-medium-emphasis">No suggestion.</div>

            <div class="unresolved-actions">
              <v-select
                v-if="group.kind === 'unassigned'"
                :model-value="pendingKinds[group.key] || null"
                :items="['tool', 'practice']"
                label="Kind"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 150px"
                @update:model-value="pendingKinds[group.key] = $event"
              />
              <v-btn
                size="x-small"
                variant="tonal"
                :disabled="!canCreateTerm(group)"
                @click="createTermFromGroup(group)"
              >
                Create as its own term
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>

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
import {
  collectUnits,
  buildRows,
  computeMetrics,
  vocabularyCoverage,
  coverageByProject,
  unresolvedNames,
  suggestionsForName,
  exactMatchGroups,
  DATA_SOURCES
} from '../../services/comparison'

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

    // ── Vocabulary section ───────────────────────────────────────────────────
    //
    // The one section that ignores the kind filter: following it would hide the
    // names with neither term nor answerType — exactly the ones that most need
    // assigning (design §5.1). It does follow the data source.

    const selectedProjects = computed(() =>
      projects.value.filter((project) => selectedProjectIds.value.includes(project.id))
    )

    const coveragePerProject = computed(() =>
      coverageByProject(allUnits.value, aliasIndex.value, selectedProjectIds.value)
    )

    const unresolved = computed(() => unresolvedNames(allUnits.value, aliasIndex.value))
    const exactMatches = computed(() => exactMatchGroups(allUnits.value, aliasIndex.value))

    // Kind chosen by hand for a group whose units carry no answerType.
    const pendingKinds = ref({})

    function suggestionsFor(group) {
      return suggestionsForName(group.key, store.workspace.vocabulary || [], store.workspace.dismissedSuggestions || [])
    }

    function projectNamesOf(projectIds) {
      return projects.value
        .filter((project) => projectIds.includes(project.id))
        .map((project) => project.name)
        .join(' · ')
    }

    function kindFor(group) {
      return group.kind !== 'unassigned' ? group.kind : pendingKinds.value[group.key] || ''
    }

    function canCreateTerm(group) {
      return ['tool', 'practice'].includes(kindFor(group))
    }

    /** Hangs every spelling of the group onto an existing term. */
    function assignGroup(group, termId) {
      group.spellings.forEach((spelling) => store.addAlias(termId, spelling.rawName))
      return true
    }

    /**
     * Creates a term from the group. The first spelling becomes the canonical
     * name; the others are attached as aliases, so nothing keeps resolving by
     * text fallback alone.
     */
    function createTermFromGroup(group) {
      if (!canCreateTerm(group)) return ''
      const [first, ...rest] = group.spellings
      const termId = store.createTerm(first.rawName, kindFor(group))
      if (!termId) return ''
      rest.forEach((spelling) => store.addAlias(termId, spelling.rawName))
      delete pendingKinds.value[group.key]
      return termId
    }

    /**
     * Turns every pure spelling variant into a term at once. Does *not* change
     * the comparison result — those names already share a row through the
     * normalized text fallback (DE-2). What it changes is coverage.
     */
    function resolveAllExactMatches() {
      const created = []
      exactMatches.value.forEach((group) => {
        const termId = createTermFromGroup(group)
        if (termId) created.push(termId)
      })
      return created
    }

    function dismissSuggestion(group, term) {
      return store.dismissSuggestion(group.key, term.name)
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
      deselectProject,
      selectedProjects,
      coveragePerProject,
      unresolved,
      exactMatches,
      pendingKinds,
      suggestionsFor,
      projectNamesOf,
      canCreateTerm,
      assignGroup,
      createTermFromGroup,
      resolveAllExactMatches,
      dismissSuggestion
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

.coverage-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.coverage-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.unresolved-group {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 8px;
  margin-top: 8px;
}

.unresolved-spellings {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.unresolved-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
</style>
