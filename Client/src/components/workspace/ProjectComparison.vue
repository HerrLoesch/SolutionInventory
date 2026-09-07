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

      <!-- Summary card. Renders metrics only — it computes nothing itself. -->
      <v-card variant="outlined" class="mt-4 summary-card">
        <v-card-text>
          <div class="summary-grid">
            <div class="summary-block">
              <div class="summary-heading">Vocabulary</div>
              <div>
                Coverage <strong>{{ metrics.vocabulary.percent }} %</strong>
                <span class="text-medium-emphasis">◌ {{ metrics.vocabulary.unresolved }} unresolved</span>
              </div>
            </div>

            <div class="summary-block">
              <div class="summary-heading">Coverage</div>
              <div>
                Total terms <strong>{{ metrics.total }}</strong>
              </div>
              <div>
                ◉ In all projects <strong>{{ metrics.all }}</strong> ({{ metrics.allPercent }} %)
              </div>
              <div>
                ◐ Partial <strong>{{ metrics.partial }}</strong>
              </div>
              <div>
                ◑ Unique <strong>{{ metrics.unique }}</strong>
              </div>
            </div>

            <div class="summary-block">
              <div class="summary-heading">Agreement</div>
              <div>
                Compared <strong>{{ metrics.compared }}</strong>
              </div>
              <div>
                Excluded <strong>{{ metrics.excluded }}</strong>
                <span class="text-medium-emphasis">
                  ⊘ {{ metrics.unset }} · ⚠ {{ metrics.inconsistent }} · ✎ {{ metrics.accepted }}
                </span>
              </div>
              <div>
                Comparable <strong>{{ metrics.comparable }}</strong>
              </div>
              <div class="mt-1">
                ✓ Matches <strong>{{ metrics.matches }}</strong>
              </div>
              <div>
                ▲ Minor <strong>{{ metrics.minor }}</strong>
              </div>
              <div>
                ▲▲ Significant <strong>{{ metrics.significant }}</strong>
              </div>
              <div>
                ▲▲▲ Critical <strong>{{ metrics.critical }}</strong>
              </div>
              <div class="mt-1">
                Agreement <strong>{{ metrics.agreementPercent }} %</strong>
                <span class="text-medium-emphasis">{{ metrics.agreementLevel }}</span>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

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

      <!-- Comparison matrix: one row per term, one column per selected project. -->
      <v-card variant="outlined" class="mt-4">
        <v-card-title class="text-subtitle-2">Comparison matrix</v-card-title>
        <v-card-text>
          <div class="matrix-toolbar">
            <v-text-field
              v-model="search"
              label="Search"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 240px"
            />
            <v-select
              v-model="sortBy"
              :items="[
                { value: 'term', title: 'Term' },
                { value: 'coverage', title: 'Coverage' },
                { value: 'delta', title: 'Divergence' }
              ]"
              label="Sort by"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 180px"
            />
            <v-select
              v-model="coverageFilter"
              :items="[
                { value: '', title: 'Any coverage' },
                { value: 'all', title: '◉ all' },
                { value: 'partial', title: '◐ partial' },
                { value: 'unique', title: '◑ unique' }
              ]"
              label="Coverage"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 180px"
            />
            <v-select
              v-model="deltaFilter"
              :items="[
                { value: '', title: 'Any Δ' },
                { value: 'deviating', title: 'Deviations only' },
                { value: 'critical', title: '▲▲▲ critical' },
                { value: 'inconsistent', title: '⚠ inconsistent' },
                { value: 'unset', title: '⊘ unset' },
                { value: 'accepted', title: '✎ accepted' }
              ]"
              label="Δ Status"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 200px"
            />
            <v-checkbox v-model="unresolvedOnly" label="◌ unresolved only" density="compact" hide-details />
          </div>

          <div class="matrix-scroll">
            <table class="comparison-matrix">
              <thead>
                <tr>
                  <th>Term</th>
                  <th v-for="project in selectedProjects" :key="project.id">{{ project.name }}</th>
                  <th>Coverage</th>
                  <th>Δ Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleRows" :key="row.key">
                  <td class="matrix-term">
                    <span v-if="!row.resolved" class="unresolved-marker" title="Not in the vocabulary">◌</span>
                    {{ row.name }}
                    <span
                      v-if="row.possibleFalseDifference"
                      class="false-difference-marker"
                      title="Possible false difference — name not in the vocabulary"
                      >⁉</span
                    >
                  </td>
                  <td
                    v-for="project in selectedProjects"
                    :key="project.id"
                    class="matrix-cell"
                    @click="openProjectRadar(project.id)"
                  >
                    <template v-if="cellFor(row, project.id)">
                      <div v-for="(value, index) in cellFor(row, project.id).values" :key="index">
                        <span class="status-chip" :class="`status-chip--${(value.status || 'unset').toLowerCase()}`">
                          {{ value.status || '⊘ unset' }}
                        </span>
                        <span
                          v-if="cellFor(row, project.id).values.length > 1"
                          class="text-caption text-medium-emphasis"
                        >
                          ↳{{ value.origin.entryTitle }} ("{{ value.origin.rawName }}")
                        </span>
                      </div>
                    </template>
                    <span v-else class="text-medium-emphasis">—</span>
                  </td>
                  <td>{{ coverageLabel(row.coverage) }}</td>
                  <td class="matrix-delta">
                    <span class="delta-badge" :class="`delta-badge--${row.delta}`" :title="row.reasons.join(', ')">
                      {{ deltaLabel(row.delta) }}
                    </span>
                    <v-btn
                      v-if="row.canOverride"
                      size="x-small"
                      variant="text"
                      :title="row.override ? 'Edit the manual classification' : 'Set a manual classification'"
                      @click="openOverrideDialog(row)"
                    >
                      {{ row.override ? 'Edit' : 'Override' }}
                    </v-btn>
                    <span v-if="row.override && row.overrideStale" class="text-caption text-medium-emphasis">
                      manually set — context has changed
                    </span>
                  </td>
                </tr>
                <tr v-if="!visibleRows.length">
                  <td :colspan="selectedProjects.length + 3" class="text-caption text-medium-emphasis">
                    No terms match these filters.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card-text>
      </v-card>

      <div class="d-flex justify-end mt-3" style="gap: 8px">
        <v-btn size="small" variant="text" prepend-icon="mdi-code-json" @click="exportJson">Export JSON</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-language-html5" @click="exportHtml">Export HTML</v-btn>
      </div>

      <!-- Radar overlay: the compared projects on one chart, laid out by a
           chosen reference project (design §5.4). -->
      <v-card variant="outlined" class="mt-4">
        <v-card-title class="text-subtitle-2 d-flex align-center justify-space-between">
          <span>Radar overlay</span>
          <v-select
            v-model="referenceProjectId"
            :items="selectedProjects"
            item-title="name"
            item-value="id"
            label="Reference project"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 220px"
          />
        </v-card-title>
        <v-card-text>
          <svg
            :viewBox="`0 0 ${OVERLAY_SIZE} ${OVERLAY_SIZE}`"
            class="overlay-svg"
            role="img"
            aria-label="Radar overlay"
          >
            <circle
              v-for="(radius, index) in overlayRings"
              :key="index"
              :cx="OVERLAY_SIZE / 2"
              :cy="OVERLAY_SIZE / 2"
              :r="radius"
              class="overlay-ring"
            />
            <line :x1="OVERLAY_SIZE / 2" y1="0" :x2="OVERLAY_SIZE / 2" :y2="OVERLAY_SIZE" class="overlay-axis" />
            <line x1="0" :y1="OVERLAY_SIZE / 2" :x2="OVERLAY_SIZE" :y2="OVERLAY_SIZE / 2" class="overlay-axis" />

            <line
              v-for="(line, index) in overlayLines"
              :key="`line-${index}`"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              class="overlay-conflict"
              :class="`overlay-conflict--${line.kind}`"
            />

            <circle
              v-for="(point, index) in overlayPoints"
              :key="`point-${index}`"
              :cx="point.x"
              :cy="point.y"
              r="4"
              :fill="projectColor(point.projectId)"
              class="overlay-point"
              :class="{
                'overlay-point--unresolved': point.unresolved,
                'overlay-point--unassigned': point.unassignedKind
              }"
            >
              <title>{{ point.name }} — {{ projectNamesOf([point.projectId]) }} — {{ point.status }}</title>
            </circle>
          </svg>

          <div class="d-flex flex-wrap mt-2" style="gap: 12px">
            <span v-for="project in selectedProjects" :key="project.id" class="d-flex align-center" style="gap: 4px">
              <span class="overlay-legend-dot" :style="{ background: projectColor(project.id) }" />
              <span class="text-caption">{{ project.name }}</span>
            </span>
          </div>

          <div v-if="overlay.withoutStatus.length" class="text-caption text-medium-emphasis mt-2">
            ⊘ Without status, not plotted: {{ overlay.withoutStatus.map((entry) => entry.name).join(', ') }}
          </div>
        </v-card-text>
      </v-card>

      <v-dialog v-model="overrideDialog" max-width="520">
        <v-card v-if="overrideRow">
          <v-card-title class="text-subtitle-2">Manual classification — {{ overrideRow.name }}</v-card-title>
          <v-card-text>
            <v-radio-group v-model="overrideLevel" density="compact" hide-details>
              <v-radio value="accepted" label="Mark as accepted (drops out of Comparable)" />
              <v-radio value="critical" label="Raise to Critical (stays in Comparable)" />
            </v-radio-group>
            <v-textarea
              v-model="overrideComment"
              label="Reason"
              density="compact"
              variant="outlined"
              rows="3"
              hide-details
              class="mt-3"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="overrideRow.override" size="small" variant="text" @click="clearOverride(overrideRow)">
              Remove
            </v-btn>
            <v-spacer />
            <v-btn size="small" variant="text" @click="overrideDialog = false">Cancel</v-btn>
            <v-btn size="small" variant="tonal" @click="saveOverride">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { buildAliasIndex } from '../../services/vocabulary'
import { buildComparisonExport, downloadComparisonJson, downloadComparisonHtml } from '../../utils/comparisonExport'
import {
  buildComparison,
  coverageByProject,
  unresolvedNames,
  suggestionsForName,
  exactMatchGroups,
  overrideContextOf,
  buildRadarOverlay,
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

    // One call does the whole pipeline. The kind filter narrows the rows, so
    // every metric except vocabulary coverage recomputes on the active selection
    // (design §4.2); coverage is computed from the unfiltered units inside
    // buildComparison (design §5.1).
    const comparison = computed(() =>
      buildComparison(store.workspace, selectedProjectIds.value, {
        source: dataSource.value,
        visibleKinds: visibleKinds.value,
        aliasIndex: aliasIndex.value
      })
    )

    const allUnits = computed(() => comparison.value.allUnits)
    const units = computed(() => comparison.value.units)
    const rows = computed(() => comparison.value.rows)
    const metrics = computed(() => comparison.value.metrics)

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

    // ── Matrix: sorting, filtering, search ───────────────────────────────────
    //
    // The view may reorder and hide rows; it must not recompute any of them.

    const sortBy = ref('term')
    const coverageFilter = ref('')
    // Filters on the *visible* badge, i.e. the one that won the precedence in
    // design §5.3 — never on a condition that was outranked.
    const deltaFilter = ref('')
    const unresolvedOnly = ref(false)
    const search = ref('')

    const DELTA_ORDER = ['none', 'match', 'accepted', 'unset', 'inconsistent', 'minor', 'significant', 'critical']
    const COVERAGE_ORDER = ['unique', 'partial', 'all']

    const visibleRows = computed(() => {
      const term = search.value.trim().toLowerCase()
      const filtered = rows.value.filter((row) => {
        if (coverageFilter.value && row.coverage !== coverageFilter.value) return false
        if (deltaFilter.value === 'deviating' && ['match', 'none'].includes(row.delta)) return false
        else if (deltaFilter.value && deltaFilter.value !== 'deviating' && row.delta !== deltaFilter.value) return false
        if (unresolvedOnly.value && row.resolved) return false
        if (!term) return true
        // Searches the term, its aliases and the entry provenance.
        const haystack = [
          row.name,
          ...(row.term?.aliases || []),
          ...[...row.cells.values()].flatMap((cell) =>
            cell.values.flatMap((value) => [value.origin.rawName, value.origin.entryTitle, value.origin.categoryTitle])
          )
        ]
        return haystack.some((text) =>
          String(text || '')
            .toLowerCase()
            .includes(term)
        )
      })

      return [...filtered].sort((a, b) => {
        if (sortBy.value === 'coverage') {
          const byCoverage = COVERAGE_ORDER.indexOf(b.coverage) - COVERAGE_ORDER.indexOf(a.coverage)
          if (byCoverage !== 0) return byCoverage
        } else if (sortBy.value === 'delta') {
          const byDelta = DELTA_ORDER.indexOf(b.delta) - DELTA_ORDER.indexOf(a.delta)
          if (byDelta !== 0) return byDelta
        }
        return a.name.localeCompare(b.name)
      })
    })

    const COVERAGE_LABELS = { all: '◉ all', partial: '◐ partial', unique: '◑ unique' }
    const DELTA_LABELS = {
      none: '—',
      match: '✓ match',
      minor: '▲ minor',
      significant: '▲▲ significant',
      critical: '▲▲▲ critical',
      inconsistent: '⚠ inconsistent',
      unset: '⊘ unset',
      accepted: '✎ accepted'
    }

    function coverageLabel(coverage) {
      return COVERAGE_LABELS[coverage] || coverage
    }

    function deltaLabel(delta) {
      return DELTA_LABELS[delta] || delta
    }

    function cellFor(row, projectId) {
      return row.cells.get(projectId) || null
    }

    /** Jumps into the radar of the project whose cell was clicked. */
    function openProjectRadar(projectId) {
      store.openProjectSummary(projectId)
    }

    // ── Export (Phase 6) ─────────────────────────────────────────────────────

    function exportData() {
      return buildComparisonExport({
        workspace: store.workspace,
        projects: projects.value,
        projectIds: selectedProjectIds.value,
        rows: rows.value,
        metrics: metrics.value,
        dataSource: dataSource.value,
        visibleKinds: visibleKinds.value
      })
    }

    function exportJson() {
      return downloadComparisonJson(exportData())
    }

    function exportHtml() {
      return downloadComparisonHtml(exportData())
    }

    // ── Radar overlay (Todo 5.3) ─────────────────────────────────────────────
    //
    // Quadrant layout is configured per project, so one reference project gives
    // the chart its shape; anything it does not know goes to "Other".

    const OVERLAY_SIZE = 320
    const OVERLAY_RADIUS = 150
    // Five rings, one per status on the scale.
    const overlayRings = [1, 2, 3, 4, 5].map((step) => (OVERLAY_RADIUS / 5) * step)
    const PROJECT_COLORS = ['#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#c62828']

    const referenceProjectId = ref('')
    const referenceProject = computed(
      () =>
        projects.value.find((project) => project.id === referenceProjectId.value) ||
        projects.value.find((project) => selectedProjectIds.value.includes(project.id)) ||
        null
    )

    const overlay = computed(() => buildRadarOverlay(rows.value, selectedProjectIds.value, referenceProject.value))

    function projectColor(projectId) {
      const index = selectedProjectIds.value.indexOf(projectId)
      return PROJECT_COLORS[(index < 0 ? 0 : index) % PROJECT_COLORS.length]
    }

    // Places a point in the middle of its ring band, spread inside its quadrant
    // so overlapping projects stay distinguishable.
    function positionOf(point, offsetIndex = 0) {
      const bandWidth = OVERLAY_RADIUS / 5
      const radius = bandWidth * point.ring + bandWidth / 2
      const quadrantStart = (Math.PI / 2) * point.quadrant
      const spread = 0.18 + ((offsetIndex + selectedProjectIds.value.indexOf(point.projectId) + 1) % 5) * 0.12
      const angle = quadrantStart + (Math.PI / 2) * spread
      return {
        x: OVERLAY_SIZE / 2 + radius * Math.cos(angle),
        y: OVERLAY_SIZE / 2 + radius * Math.sin(angle)
      }
    }

    const overlayPoints = computed(() =>
      overlay.value.points.map((point, index) => ({ ...point, ...positionOf(point, index) }))
    )

    const overlayLines = computed(() =>
      overlay.value.conflicts.flatMap((conflict) => {
        const placed = conflict.points.map((point, index) => positionOf(point, index))
        const segments = []
        for (let i = 0; i < placed.length - 1; i++) {
          segments.push({
            kind: conflict.kind,
            x1: placed[i].x,
            y1: placed[i].y,
            x2: placed[i + 1].x,
            y2: placed[i + 1].y
          })
        }
        return segments
      })
    )

    // ── Criticality override (Todo 4.7) ──────────────────────────────────────

    const overrideDialog = ref(false)
    const overrideRow = ref(null)
    const overrideLevel = ref('accepted')
    const overrideComment = ref('')

    function openOverrideDialog(row) {
      // On a ◌ row the UI offers the assignment first — an override on a
      // spelling that disappears a moment later would be orphaned (DE-5).
      if (!row.canOverride) return false
      overrideRow.value = row
      overrideLevel.value = row.override?.level || 'accepted'
      overrideComment.value = row.override?.comment || ''
      overrideDialog.value = true
      return true
    }

    function saveOverride() {
      const row = overrideRow.value
      if (!row?.canOverride) return false
      const context = overrideContextOf(row, selectedProjectIds.value)
      const saved = store.setComparisonOverride(row.term.id, {
        level: overrideLevel.value,
        comment: overrideComment.value,
        ...context
      })
      overrideDialog.value = false
      return saved
    }

    function clearOverride(row) {
      if (!row?.term?.id) return false
      const cleared = store.clearComparisonOverride(row.term.id)
      overrideDialog.value = false
      return cleared
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
      dismissSuggestion,
      sortBy,
      coverageFilter,
      deltaFilter,
      unresolvedOnly,
      search,
      visibleRows,
      coverageLabel,
      deltaLabel,
      cellFor,
      openProjectRadar,
      exportData,
      exportJson,
      exportHtml,
      OVERLAY_SIZE,
      overlayRings,
      referenceProjectId,
      referenceProject,
      overlay,
      overlayPoints,
      overlayLines,
      projectColor,
      overrideDialog,
      overrideRow,
      overrideLevel,
      overrideComment,
      openOverrideDialog,
      saveOverride,
      clearOverride
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

.summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  font-size: 0.875rem;
}

.summary-heading {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.matrix-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.matrix-scroll {
  overflow-x: auto;
}

.comparison-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.comparison-matrix th,
.comparison-matrix td {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: top;
}

.matrix-cell {
  cursor: pointer;
}

.unresolved-marker,
.false-difference-marker {
  color: rgb(var(--v-theme-warning));
  margin-right: 2px;
}

/* Status chips take the radar's colours … */
.status-chip--adopt {
  color: #2e7d32;
}
.status-chip--trial {
  color: #1565c0;
}
.status-chip--assess {
  color: #ef6c00;
}
.status-chip--hold {
  color: #616161;
}
.status-chip--retire {
  color: #c62828;
}

/* … while the Δ badges get a palette of their own, so a red Retire chip and a
   red critical badge in the same row stay distinguishable (design §5.3). */
.delta-badge {
  font-weight: 600;
}
.delta-badge--match {
  color: #00695c;
}
.delta-badge--minor {
  color: #7b1fa2;
}
.delta-badge--significant {
  color: #4527a0;
}
.delta-badge--critical {
  color: #ad1457;
}
.delta-badge--inconsistent,
.delta-badge--unset,
.delta-badge--accepted,
.delta-badge--none {
  color: #546e7a;
}

.overlay-svg {
  width: 100%;
  max-width: 360px;
}

.overlay-ring,
.overlay-axis {
  fill: none;
  stroke: rgba(var(--v-border-color), var(--v-border-opacity));
  stroke-width: 1;
}

/* The four special cases look different rather than all being dimmed. */
.overlay-point--unresolved {
  stroke: currentColor;
  stroke-dasharray: 2 2;
  stroke-width: 1.5;
}

.overlay-point--unassigned {
  opacity: 0.45;
}

.overlay-conflict {
  stroke-width: 1.5;
}

.overlay-conflict--cross-project {
  stroke: #c62828;
}

.overlay-conflict--internal {
  stroke: #ef6c00;
}

.overlay-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>
