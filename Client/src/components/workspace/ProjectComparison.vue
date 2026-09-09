<template>
  <div class="project-comparison">
    <v-alert v-if="projects.length < 2" type="info" density="compact" variant="tonal">
      At least two projects are needed to compare.
    </v-alert>

    <template v-else>
      <div class="comparison-header">
        <div class="text-subtitle-1 font-weight-medium">📦 Workspace Comparison</div>
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" size="small" variant="tonal" append-icon="mdi-menu-down">Export</v-btn>
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-code-json" title="JSON" @click="exportJson" />
            <v-list-item prepend-icon="mdi-language-html5" title="Standalone HTML" @click="exportHtml" />
          </v-list>
        </v-menu>
      </div>

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
          <v-btn value="tool" size="small">📐 Tools</v-btn>
          <v-btn value="practice" size="small">🔷 Practices</v-btn>
          <v-btn value="unassigned" size="small">⬚ Unassigned</v-btn>
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

      <!-- Below two projects there is nothing to show, so the hint stands in
           place of the sections rather than on top of empty ones (design §4.2). -->
      <v-alert v-if="selectedProjectIds.length < 2" type="info" density="compact" variant="tonal" class="mt-3">
        Select at least two projects to compare.
      </v-alert>

      <template v-else>
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

        <!-- Vocabulary comes first: it answers whether the rest of the page can
             be trusted. Collapsed while everything resolves, opened by itself as
             soon as something does not (design §5.1). It ignores the kind filter
             on purpose — following it would hide exactly the names that most
             need assigning. -->
        <v-card variant="outlined" class="mt-4">
          <v-card-title class="section-title" @click="toggleSection('vocabulary')">
            <v-icon size="18">{{ openSections.vocabulary ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
            <span class="text-subtitle-2">Vocabulary</span>
            <span class="text-caption text-medium-emphasis">
              {{ metrics.vocabulary.percent }} % resolved
              <template v-if="metrics.vocabulary.unresolved">· ◌ {{ metrics.vocabulary.unresolved }} open</template>
            </span>
            <v-spacer />
            <v-btn size="x-small" variant="tonal" :disabled="!exactMatches.length" @click.stop="resolveAllExactMatches">
              Resolve all exact matches ({{ exactMatches.length }})
            </v-btn>
          </v-card-title>
          <v-expand-transition>
            <v-card-text v-if="openSections.vocabulary">
              <v-alert
                v-if="vocabularyError"
                type="warning"
                density="compact"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="vocabularyError = ''"
              >
                {{ vocabularyError }}
              </v-alert>

              <div class="coverage-row">
                <div v-for="project in selectedProjects" :key="project.id" class="coverage-item">
                  <div class="coverage-label">
                    <span>{{ project.name }}</span>
                    <strong>{{ coverageOf(project.id).percent }} %</strong>
                  </div>
                  <div class="coverage-track">
                    <div class="coverage-fill" :style="{ width: coverageOf(project.id).percent + '%' }" />
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ coverageOf(project.id).unresolved }} unresolved
                  </div>
                </div>
              </div>

              <v-alert
                v-if="metrics.vocabulary.unresolved"
                type="warning"
                density="compact"
                variant="tonal"
                class="mt-3"
              >
                {{ metrics.vocabulary.unresolved }} unresolved names can create false differences — affected rows are
                marked ◌.
              </v-alert>

              <div v-if="!unresolved.length" class="text-caption text-medium-emphasis mt-2">
                Every name in this selection is in the vocabulary.
              </div>

              <div v-for="group in visibleUnresolved" :key="group.key" class="unresolved-group">
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
                    <v-btn size="x-small" variant="text" @click="dismissSuggestion(group, suggestion.term)">
                      Later
                    </v-btn>
                  </template>
                </div>
                <div v-else class="text-caption text-medium-emphasis">No similar term suggested.</div>

                <!-- The similarity heuristic only ever *suggests*. Picking any
                     term by hand must stay possible, or a name it does not
                     recognise has no way into the vocabulary except as yet
                     another new entry. -->
                <div class="unresolved-actions">
                  <v-autocomplete
                    :model-value="null"
                    :items="termItems"
                    item-title="title"
                    item-value="id"
                    label="Assign to an existing term"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :disabled="!termItems.length"
                    style="min-width: 280px; max-width: 320px"
                    @update:model-value="(termId) => termId && assignGroup(group, termId)"
                  />

                  <v-select
                    v-if="group.kind === 'unassigned'"
                    :model-value="pendingKinds[group.key] || null"
                    :items="termKindItems"
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

              <!-- Only the visible part of the work list is rendered, and only
                   for it are suggestions computed: each one searches the whole
                   vocabulary, so a few hundred open names would otherwise cost a
                   full search per name on every redraw. -->
              <div v-if="unresolved.length > visibleUnresolved.length" class="unresolved-more">
                <span class="text-caption text-medium-emphasis">
                  Showing {{ visibleUnresolved.length }} of {{ unresolved.length }} open names
                </span>
                <v-btn size="x-small" variant="text" @click="showMoreUnresolved">Show more</v-btn>
              </div>

              <!-- The vocabulary itself, not just what it fails to resolve. A
                   term could be created here but never corrected here, which is
                   how a typo became permanent (F2). Renaming keeps the id, so
                   nothing that points at the term is lost. -->
              <v-divider class="my-4" />

              <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 12px">
                <span class="summary-heading">Terms in the vocabulary ({{ matchingTerms.length }})</span>
                <v-text-field
                  v-model="termSearch"
                  label="Find a term"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  style="max-width: 240px"
                />
              </div>

              <div v-if="!matchingTerms.length" class="text-caption text-medium-emphasis mt-2">
                {{ termSearch ? 'No term matches this search.' : 'The vocabulary is still empty.' }}
              </div>

              <div v-for="term in visibleTerms" :key="term.id" class="term-row">
                <v-text-field
                  :model-value="term.name"
                  label="Name"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 200px; max-width: 260px"
                  @change="renameVocabularyTerm(term, $event.target.value)"
                />
                <v-select
                  :model-value="term.kind"
                  :items="termKindItems"
                  label="Kind"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="max-width: 140px"
                  @update:model-value="(kind) => setVocabularyTermKind(term, kind)"
                />
                <v-text-field
                  :model-value="term.note || ''"
                  label="Note"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 180px; flex: 1 1 200px"
                  @change="setVocabularyTermNote(term, $event.target.value)"
                />
                <div class="term-aliases">
                  <v-chip
                    v-for="alias in term.aliases || []"
                    :key="alias"
                    size="x-small"
                    variant="outlined"
                    closable
                    :title="`Stop resolving &quot;${alias}&quot; to ${term.name}`"
                    @click:close="removeVocabularyAlias(term, alias)"
                  >
                    {{ alias }}
                  </v-chip>
                </div>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="error"
                  title="Delete the term. The projects keep their spellings; they simply stop resolving."
                  @click="deleteVocabularyTerm(term)"
                >
                  Delete
                </v-btn>
              </div>

              <div v-if="matchingTerms.length > visibleTerms.length" class="unresolved-more">
                <span class="text-caption text-medium-emphasis">
                  Showing {{ visibleTerms.length }} of {{ matchingTerms.length }} terms
                </span>
                <v-btn size="x-small" variant="text" @click="showMoreTerms">Show more</v-btn>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>

        <!-- Summary card. Renders metrics only — it computes nothing itself. -->
        <v-card variant="outlined" class="mt-4 summary-card">
          <v-card-title class="section-title" @click="toggleSection('summary')">
            <v-icon size="18">{{ openSections.summary ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
            <span class="text-subtitle-2">Comparison summary</span>
            <span class="text-caption text-medium-emphasis">
              {{ kindLabel }} · {{ selectedProjects.length }} projects ·
              <template v-if="inBaselineMode">against ◎ {{ activeBaseline.name }}</template>
              <template v-else>agreement {{ metrics.agreementPercent }} %</template>
            </span>
          </v-card-title>
          <v-expand-transition>
            <v-card-text v-if="openSections.summary">
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
                  <div v-if="metrics.ignored">
                    ⃠ Not important <strong>{{ metrics.ignored }}</strong>
                    <span class="text-medium-emphasis">
                      not counted in any figure here
                    </span>
                  </div>
                  <div>
                    ◉ In all projects <strong>{{ metrics.all }}</strong> ({{ metrics.allPercent }} %)
                  </div>
                  <div>
                    ◐ Partial <strong>{{ metrics.partial }}</strong>
                  </div>
                  <div>
                    ◑ Unique <strong>{{ metrics.unique }}</strong>
                    <span v-if="uniqueBreakdown" class="text-medium-emphasis">{{ uniqueBreakdown }}</span>
                  </div>
                </div>

                <div v-if="inBaselineMode" class="summary-block">
                  <div class="summary-heading">◎ {{ activeBaseline.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ Object.keys(activeBaseline.entries || {}).length }} terms in the reference ·
                    {{
                      activeBaseline.origin && activeBaseline.origin.kind === 'consensus'
                        ? 'taken from the consensus'
                        : `taken from ${projectNameOf(activeBaseline.origin && activeBaseline.origin.projectId)}`
                    }}
                  </div>
                  <div>
                    ⊙ Not in the reference <strong>{{ metrics.unlisted }}</strong>
                  </div>
                  <div>
                    ⊖ In the reference, unused <strong>{{ metrics.missing }}</strong>
                  </div>
                  <div v-if="baselineSkipped.length" class="text-caption text-medium-emphasis mt-1">
                    Left out when the reference was taken: {{ baselineSkipped.map((entry) => entry.name).join(', ') }}
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
                    <span v-if="metrics.silent" class="text-medium-emphasis">
                      ≈ {{ metrics.silent }} of them silently accepted
                    </span>
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
                  <div class="agreement-row mt-1">
                    Agreement <strong>{{ metrics.agreementPercent }} %</strong>
                    <span class="coverage-track agreement-track">
                      <span class="coverage-fill" :style="{ width: metrics.agreementPercent + '%' }" />
                    </span>
                    <span class="text-medium-emphasis">{{ metrics.agreementLevel }}</span>
                  </div>
                  <div v-if="metrics.silent || metrics.ignored" class="text-caption text-medium-emphasis">
                    <template v-if="metrics.silent">≈ {{ metrics.silent }} of it silently accepted</template>
                    <template v-if="metrics.silent && metrics.ignored"> · </template>
                    <template v-if="metrics.ignored">⃠ {{ metrics.ignored }} terms left out entirely</template>
                  </div>
                </div>
              </div>

              <!-- The single agreement figure says *that* the workspace
                   disagrees, never who with whom. These bars say who. Every one
                   of them carries the number of rows it rests on: 100 % out of
                   three rows is not 100 % out of three hundred. -->
              <div v-if="divergenceBars.length" class="mt-4">
                <div class="summary-heading">How far apart the projects are</div>
                <div
                  v-for="bar in divergenceBars"
                  :key="bar.key"
                  class="bar-row"
                  role="img"
                  :aria-label="bar.ariaLabel"
                >
                  <span class="bar-label">{{ bar.label }}</span>
                  <span class="coverage-track bar-track">
                    <span class="bar-fill" :class="`bar-fill--${bar.level}`" :style="{ width: bar.percent + '%' }" />
                  </span>
                  <strong class="bar-value">{{ bar.percent }} %</strong>
                  <span class="text-caption text-medium-emphasis">{{ bar.detail }}</span>
                </div>
              </div>
              <div v-else-if="selectedProjects.length > 1" class="text-caption text-medium-emphasis mt-4">
                No two projects rate the same term on the scale — there is no distance to measure yet.
              </div>

              <div v-if="inBaselineMode" class="mt-4">
                <div class="summary-heading">How closely each project follows ◎ {{ activeBaseline.name }}</div>
                <div
                  v-for="bar in baselineBars"
                  :key="bar.key"
                  class="bar-row"
                  role="img"
                  :aria-label="bar.ariaLabel"
                >
                  <span class="bar-label">{{ bar.label }}</span>
                  <span class="coverage-track bar-track">
                    <span class="bar-fill" :class="`bar-fill--${bar.level}`" :style="{ width: bar.percent + '%' }" />
                  </span>
                  <strong class="bar-value">{{ bar.percent }} %</strong>
                  <span class="text-caption text-medium-emphasis">{{ bar.detail }}</span>
                </div>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>

        <!-- Comparison matrix: one row per term, one column per selected project. -->
        <v-card variant="outlined" class="mt-4">
          <v-card-title class="section-title" @click="toggleSection('matrix')">
            <v-icon size="18">{{ openSections.matrix ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
            <span class="text-subtitle-2">Comparison matrix</span>
            <span class="text-caption text-medium-emphasis">{{ rows.length }} terms</span>
          </v-card-title>
          <v-expand-transition>
            <v-card-text v-if="openSections.matrix">
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
                  v-model="coverageFilter"
                  :items="coverageFilterItems"
                  label="Coverage"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="max-width: 180px"
                />
                <v-select
                  v-model="deltaFilter"
                  :items="deltaFilterItems"
                  label="Δ Status"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="max-width: 200px"
                />
                <v-checkbox v-model="unresolvedOnly" label="◌ unresolved only" density="compact" hide-details />
                <v-select
                  v-model="activeBaselineId"
                  :items="baselineItems"
                  label="Compare against"
                  placeholder="each other"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  style="max-width: 240px"
                  @click:clear="comparisonMode = 'peer'"
                />
                <v-btn size="small" variant="tonal" @click="openBaselineDialog('')">Take a reference…</v-btn>
                <template v-if="activeBaseline">
                  <v-btn size="x-small" variant="text" @click="openBaselineDialog(activeBaseline.id)">Edit</v-btn>
                  <v-btn size="x-small" variant="text" color="error" @click="deleteBaseline(activeBaseline.id)">
                    Delete
                  </v-btn>
                </template>
                <v-checkbox
                  v-if="metrics.ignored"
                  v-model="showIgnored"
                  :label="`⃠ show ${metrics.ignored} not important`"
                  density="compact"
                  hide-details
                />
              </div>

              <div class="matrix-scroll">
                <table class="comparison-matrix">
                  <thead>
                    <!-- Every header sorts. The first click gives the order that
                         column is worth reading in — widest coverage, worst
                         divergence, best status — the second turns it around. -->
                    <tr>
                      <th
                        v-for="header in sortHeaders"
                        :key="header.column"
                        role="button"
                        tabindex="0"
                        class="matrix-header"
                        :class="{ 'matrix-header--sorted': sort.column === header.column }"
                        :aria-sort="ariaSortOf(header.column)"
                        :title="`Sort by ${header.label}`"
                        @click="toggleSort(header.column)"
                        @keydown.enter.prevent="toggleSort(header.column)"
                        @keydown.space.prevent="toggleSort(header.column)"
                      >
                        {{ header.label }}
                        <span class="sort-marker" aria-hidden="true">{{ sortMarkerOf(header.column) }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in pagedRows" :key="row.key" :class="{ 'matrix-row--ignored': row.ignored }">
                      <td
                        class="matrix-term"
                        :class="{ 'matrix-term--drop-target': isDropTarget(row) }"
                        draggable="true"
                        title="Drag onto another term to merge the two"
                        @dragstart="startRowDrag(row, $event)"
                        @dragover="dragOverRow(row, $event)"
                        @dragleave="dropTargetKey = ''"
                        @dragend="endRowDrag"
                        @drop.prevent="dropOnRow(row)"
                      >
                        <span v-if="!row.resolved" class="unresolved-marker" title="Not in the vocabulary">◌</span>
                        <span
                          v-if="row.ignored"
                          class="ignored-marker"
                          :title="row.ignored.reason || 'Marked as not important — out of every figure'"
                          >⃠</span
                        >
                        {{ row.name }}
                        <span
                          v-if="row.possibleFalseDifference"
                          class="false-difference-marker"
                          title="Possible false difference — name not in the vocabulary"
                          >⁉</span
                        >
                        <v-btn
                          size="x-small"
                          variant="text"
                          class="row-action"
                          :title="
                            row.term
                              ? 'Rename this term. The old name keeps resolving.'
                              : 'Not in the vocabulary yet — give it a name and a kind.'
                          "
                          @click="openRenameDialog(row)"
                        >
                          {{ row.term ? 'Rename…' : 'Name…' }}
                        </v-btn>
                        <v-btn
                          size="x-small"
                          variant="text"
                          class="row-action"
                          title="Same thing under another name? Merge the two rows into one term."
                          @click="openMergeDialog(row)"
                        >
                          Merge…
                        </v-btn>
                        <v-btn
                          v-if="row.ignored"
                          size="x-small"
                          variant="text"
                          class="row-action"
                          title="Take this term back into the comparison"
                          @click="includeRow(row)"
                        >
                          Include again
                        </v-btn>
                        <v-btn
                          v-else
                          size="x-small"
                          variant="text"
                          class="row-action"
                          title="Take this term out of the comparison and out of every figure"
                          @click="openIgnoreDialog(row)"
                        >
                          Not important
                        </v-btn>
                      </td>
                      <td v-if="inBaselineMode" class="matrix-baseline">
                        <span v-if="row.baselineStatus" class="status-chip" :class="statusClass(row.baselineStatus)">
                          {{ statusLabel(row.baselineStatus) }}
                        </span>
                        <span v-else class="text-medium-emphasis" title="Not in the reference">—</span>
                      </td>
                      <td
                        v-for="project in selectedProjects"
                        :key="project.id"
                        class="matrix-cell"
                        :class="{ 'matrix-cell--accepted': isAcceptanceApplied(row, project.id) }"
                        :title="cellTitle(row, project.id)"
                        @click="openProjectRadar(project.id)"
                      >
                        <template v-if="cellFor(row, project.id)">
                          <div v-for="(value, index) in cellFor(row, project.id).values" :key="index">
                            <span
                              class="status-chip"
                              :class="statusClass(value.status)"
                            >
                              {{ statusLabel(value.status) }}
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

                        <!-- The decision is shown on the cell it was taken for,
                             marked ≈ and reversible from the same place. A
                             decision that no longer fits the data says so
                             instead of quietly disappearing. -->
                        <div v-if="acceptanceFor(row, project.id)" class="cell-acceptance">
                          <span
                            class="acceptance-marker"
                            :title="acceptanceTitle(row, project.id)"
                            >≈</span
                          >
                          <span class="text-caption text-medium-emphasis">
                            {{ acceptanceLabel(row, project.id) }}
                          </span>
                          <v-btn
                            size="x-small"
                            variant="text"
                            class="row-action"
                            title="Take the silent acceptance back"
                            @click.stop="clearAcceptance(row, project.id)"
                          >
                            Undo
                          </v-btn>
                        </div>
                        <v-btn
                          v-else-if="canOfferAcceptance(row, project.id)"
                          size="x-small"
                          variant="text"
                          class="row-action"
                          :title="
                            cellFor(row, project.id)
                              ? 'Take another project’s status here — the difference stops counting as one'
                              : 'No opinion of its own — go along with what the others say'
                          "
                          @click.stop="openAcceptDialog(row, project.id)"
                        >
                          ≈ accept
                        </v-btn>
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

              <!-- A few hundred blips per project make a few hundred rows, and
                   every one of them carries a cell per project. The table stays
                   paged rather than laying all of them into the DOM at once. -->
              <div v-if="visibleRows.length > pagedRows.length" class="unresolved-more">
                <span class="text-caption text-medium-emphasis">
                  Showing {{ pagedRows.length }} of {{ visibleRows.length }} rows
                </span>
                <v-btn size="x-small" variant="text" @click="showMoreRows">Show more</v-btn>
                <v-btn size="x-small" variant="text" @click="showAllRows">Show all</v-btn>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>

        <!-- Radar overlay: the compared projects on one chart, laid out by a
           chosen reference project (design §5.4). -->
        <v-card variant="outlined" class="mt-4">
          <v-card-title class="section-title" @click="toggleSection('overlay')">
            <v-icon size="18">{{ openSections.overlay ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
            <span class="text-subtitle-2">Radar overlay</span>
            <span class="text-caption text-medium-emphasis">{{ overlayPoints.length }} plotted</span>
            <v-spacer />
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
              @click.stop
            />
          </v-card-title>
          <v-expand-transition>
            <v-card-text v-if="openSections.overlay">
              <p class="text-caption text-medium-emphasis mb-3">
                One point is one project's take on one term. The <strong>ring</strong> is the status it gives that term,
                the <strong>quadrant</strong> is the category
                <strong>{{ referenceProject ? referenceProject.name : 'the reference project' }}</strong> files it under
                — quadrants are configured per project, so one project has to supply the layout. A
                <strong>line</strong> joins two takes that sit at least two rings apart. Click a point for the full row.
              </p>

              <svg
                :viewBox="`0 0 ${OVERLAY_SIZE} ${OVERLAY_SIZE}`"
                class="overlay-svg"
                role="img"
                :aria-label="overlayAriaLabel"
              >
                <!-- Ring bands, painted outside in so the inner ones stay visible. -->
                <circle
                  v-for="band in overlayBands"
                  :key="`band-${band.label}`"
                  :cx="overlayChart.center"
                  :cy="overlayChart.center"
                  :r="band.outer"
                  :fill="band.fill"
                />
                <circle
                  v-for="ring in overlayChart.rings"
                  :key="`ring-${ring.label}`"
                  :cx="overlayChart.center"
                  :cy="overlayChart.center"
                  :r="ring.outer"
                  class="overlay-ring"
                />

                <line
                  :x1="overlayChart.center"
                  :y1="overlayChart.center - overlayChart.radius"
                  :x2="overlayChart.center"
                  :y2="overlayChart.center + overlayChart.radius"
                  class="overlay-axis"
                />
                <line
                  :x1="overlayChart.center - overlayChart.radius"
                  :y1="overlayChart.center"
                  :x2="overlayChart.center + overlayChart.radius"
                  :y2="overlayChart.center"
                  class="overlay-axis"
                />

                <!-- Ring names on the upward axis, quadrant names in the corners:
                 without them the chart is a ring of dots that never says what
                 is being compared. -->
                <text
                  v-for="ring in overlayChart.rings"
                  :key="`ring-label-${ring.label}`"
                  :x="overlayChart.center"
                  :y="ring.labelY"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="overlay-ring-label"
                  :fill="ringColor(ring.label)"
                >
                  {{ ring.label }}
                </text>
                <text
                  v-for="(corner, index) in overlayChart.quadrantCorners"
                  :key="`quadrant-label-${index}`"
                  :x="corner.x"
                  :y="corner.y"
                  :text-anchor="corner.anchor"
                  class="overlay-quadrant-label"
                >
                  {{ quadrantLabels[index] }}
                </text>

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

                <g
                  v-for="point in overlayPoints"
                  :key="point.id"
                  class="overlay-point-group"
                  @click="selectOverlayPoint(point)"
                >
                  <path
                    :d="symbolPath(point)"
                    :fill="projectColor(point.projectId)"
                    class="overlay-point"
                    :class="{
                      'overlay-point--unresolved': point.unresolved,
                      'overlay-point--unassigned': point.unassignedKind,
                      'overlay-point--selected': point.key === selectedOverlayKey
                    }"
                  />
                  <title>
                    {{ point.name }} — {{ projectNamesOf([point.projectId]) }} — {{ statusLabel(point.status) }} ({{
                      point.origin.entryTitle
                    }})
                  </title>
                </g>
              </svg>

              <div class="overlay-legends">
                <div class="overlay-legend-group">
                  <span class="overlay-legend-title">Projects</span>
                  <button
                    v-for="project in selectedProjects"
                    :key="project.id"
                    type="button"
                    class="overlay-toggle"
                    :class="{ 'overlay-toggle--off': hiddenProjectIds.includes(project.id) }"
                    :title="hiddenProjectIds.includes(project.id) ? 'Show in the overlay' : 'Hide from the overlay'"
                    @click="toggleOverlayProject(project.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <path :d="symbolPathAt(project.id, 7, 7, 5)" :fill="projectColor(project.id)" />
                    </svg>
                    <span class="text-caption">{{ project.name }}</span>
                  </button>
                </div>

                <div class="overlay-legend-group">
                  <span class="overlay-legend-title">Rings, inside out</span>
                  <span v-for="ring in overlayChart.rings" :key="`key-${ring.label}`" class="overlay-legend-item">
                    <span class="overlay-legend-dot" :style="{ background: ringColor(ring.label) }" />
                    <span class="text-caption">{{ ring.label }}</span>
                  </span>
                </div>

                <div class="overlay-legend-group">
                  <span class="overlay-legend-title">Markers</span>
                  <span class="text-caption">◌ dashed outline — name not in the vocabulary</span>
                  <span class="text-caption">⬚ pale — kind unknown</span>
                  <span class="overlay-legend-item">
                    <span class="overlay-legend-line overlay-legend-line--internal" />
                    <span class="text-caption">one project rating a term twice, differently</span>
                  </span>
                  <span class="overlay-legend-item">
                    <span class="overlay-legend-line overlay-legend-line--cross-project" />
                    <span class="text-caption">projects at least two rings apart</span>
                  </span>
                </div>
              </div>

              <v-card v-if="selectedOverlayRow" variant="tonal" class="mt-3">
                <v-card-text class="py-2">
                  <div class="d-flex align-center justify-space-between">
                    <strong>{{ selectedOverlayRow.name }}</strong>
                    <v-btn size="x-small" variant="text" @click="selectedOverlayKey = ''">Close</v-btn>
                  </div>
                  <div v-for="project in selectedProjects" :key="project.id" class="text-body-2">
                    {{ project.name }}:
                    <template v-if="cellFor(selectedOverlayRow, project.id)">
                      <span v-for="(value, index) in cellFor(selectedOverlayRow, project.id).values" :key="index">
                        <span class="status-chip" :class="statusClass(value.status)">
                          {{ statusLabel(value.status) }}
                        </span>
                        <span class="text-caption text-medium-emphasis">
                          ↳ {{ value.origin.entryTitle }} · {{ value.origin.categoryTitle }} ("{{
                            value.origin.rawName
                          }}")
                        </span>
                      </span>
                    </template>
                    <span v-else class="text-medium-emphasis">—</span>
                  </div>
                  <div class="mt-1">
                    Δ
                    <span class="delta-badge" :class="`delta-badge--${selectedOverlayRow.delta}`">
                      {{ deltaLabel(selectedOverlayRow.delta) }}
                    </span>
                  </div>
                </v-card-text>
              </v-card>

              <div v-if="overlay.withoutStatus.length" class="mt-2">
                <div class="text-caption text-medium-emphasis">⊘ Without status, not plotted</div>
                <div class="d-flex flex-wrap mt-1" style="gap: 6px">
                  <v-chip
                    v-for="entry in withoutStatusChips"
                    :key="entry.id"
                    size="x-small"
                    variant="outlined"
                    :title="`${entry.projectName} · ${entry.origin.entryTitle}`"
                    @click="openProjectRadar(entry.projectId)"
                  >
                    {{ entry.name }}
                  </v-chip>
                </div>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>
      </template>

      <!-- Taking a reference: the target state is copied out of the matrix and
           held still. It has to be a copy — a reference that moved with the
           projects would be a mirror. -->
      <v-dialog v-model="baselineDialog" max-width="560">
        <v-card>
          <v-card-title class="text-subtitle-2">
            {{ baselineEditId ? 'Update the reference' : 'Take a reference from the matrix' }}
          </v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis">
              Every project is then measured against this target one at a time, instead of against the others. The
              statuses are copied as they stand now and stay put until you take the reference again.
            </p>
            <v-text-field
              v-model="baselineName"
              label="Name"
              density="compact"
              variant="outlined"
              hide-details
              class="mt-3"
            />
            <v-select
              v-model="baselineSource"
              :items="baselineSourceItems"
              label="Take it from"
              density="compact"
              variant="outlined"
              hide-details
              class="mt-3"
            />
            <p class="text-caption text-medium-emphasis mt-1">
              A term a project rates twice and differently is left out, and so is a tie in the consensus — a reference
              that freezes a contradiction is not a reference.
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" variant="text" @click="baselineDialog = false">Cancel</v-btn>
            <v-btn size="small" variant="tonal" :disabled="!canSaveBaseline" @click="confirmBaseline">
              {{ baselineEditId ? 'Update' : 'Take reference' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Silent acceptance: agreement reached rather than a difference waived.
           Unlike ✎ accepted the term stays in Comparable and counts as a match —
           the agreement figure must not fall the more people agree. -->
      <v-dialog v-model="acceptDialog" max-width="560">
        <v-card v-if="acceptRow">
          <v-card-title class="text-subtitle-2">
            {{ projectNameOf(acceptProjectId) }} accepts — {{ acceptRow.name }}
          </v-card-title>
          <v-card-text>
            <p v-if="acceptIsAbsence" class="text-caption text-medium-emphasis">
              {{ projectNameOf(acceptProjectId) }} says nothing about this term and goes along with what the other
              projects say. The term counts as agreed rather than as a gap.
            </p>
            <template v-else>
              <p class="text-caption text-medium-emphasis">
                {{ projectNameOf(acceptProjectId) }} keeps its own entry, but takes the status below as the one that
                counts. The projects still differ — the difference just stops being counted as one.
              </p>
              <v-select
                v-model="acceptFrom"
                :items="acceptSources"
                item-title="title"
                item-value="id"
                label="Take the status from"
                density="compact"
                variant="outlined"
                hide-details
                class="mt-3"
              />
            </template>
            <v-textarea
              v-model="acceptComment"
              label="Reason (optional)"
              density="compact"
              variant="outlined"
              rows="2"
              hide-details
              class="mt-3"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="acceptanceFor(acceptRow, acceptProjectId)"
              size="small"
              variant="text"
              @click="clearAcceptance(acceptRow, acceptProjectId), (acceptDialog = false)"
            >
              Remove
            </v-btn>
            <v-spacer />
            <v-btn size="small" variant="text" @click="acceptDialog = false">Cancel</v-btn>
            <v-btn size="small" variant="tonal" :disabled="!canAccept" @click="confirmAccept">Accept</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Rename: the id stays, so blips and overrides survive, and the old name
           stays an alias so data written under it keeps resolving. On a row the
           vocabulary does not resolve there is nothing to rename — the dialog
           creates the term instead, which needs a kind and never guesses one. -->
      <v-dialog v-model="renameDialog" max-width="520">
        <v-card v-if="renameRow">
          <v-card-title class="text-subtitle-2">
            {{ renameCreatesTerm ? 'Name' : 'Rename' }} "{{ renameRow.name }}"
          </v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis">
              <template v-if="renameCreatesTerm">
                "{{ renameRow.name }}" is not in the vocabulary yet. It becomes a term under the name you give here,
                and every spelling in this row becomes one of its aliases.
              </template>
              <template v-else>
                The term keeps its identity: every blip written under the old name keeps resolving to it, and any
                manual classification stays in force. This changes the workspace vocabulary, so it applies to every
                project — not just the ones compared here.
              </template>
            </p>
            <v-text-field
              v-model="renameName"
              label="Name"
              density="compact"
              variant="outlined"
              hide-details
              class="mt-3"
              @keydown.enter="confirmRename"
            />
            <template v-if="renameNeedsKind">
              <v-select
                v-model="renameKind"
                :items="termKindItems"
                label="Kind"
                density="compact"
                variant="outlined"
                hide-details
                class="mt-3"
                style="max-width: 200px"
              />
              <p class="text-caption text-medium-emphasis mt-1">
                A term needs a kind, and it is never guessed.
              </p>
            </template>
            <v-alert v-if="renameError" type="warning" density="compact" variant="tonal" class="mt-3">
              {{ renameError }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" variant="text" @click="renameDialog = false">Cancel</v-btn>
            <v-btn size="small" variant="tonal" :disabled="!canRename" @click="confirmRename">
              {{ renameCreatesTerm ? 'Create term' : 'Rename' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Not important: the row leaves the comparison and every figure on this
           page. A reason is optional but offered, because the next reader of the
           report is the one who has to trust the decision. -->
      <v-dialog v-model="ignoreDialog" max-width="520">
        <v-card v-if="ignoreRow">
          <v-card-title class="text-subtitle-2">Mark "{{ ignoreRow.name }}" as not important</v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis">
              The term drops out of the matrix and out of every number in the summary — it is not hidden, it is left
              out of the question. Nothing is deleted; you can take it back at any time.
            </p>
            <v-textarea
              v-model="ignoreReason"
              label="Reason (optional)"
              density="compact"
              variant="outlined"
              rows="2"
              hide-details
              class="mt-3"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" variant="text" @click="ignoreDialog = false">Cancel</v-btn>
            <v-btn size="small" variant="tonal" @click="confirmIgnore">Mark as not important</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Merge: the answer to "these two rows are the same thing". Assigning a
           spelling to a term and folding one term into another are one action
           from where the user stands, so they are one dialog (design §5.1). -->
      <v-dialog v-model="mergeDialog" max-width="560">
        <v-card v-if="mergeRow">
          <v-card-title class="text-subtitle-2">Merge "{{ mergeRow.name }}" into another term</v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis">
              Both rows become one. The target keeps its name and kind; "{{ mergeRow.name }}" becomes one of its
              spellings. This changes the workspace vocabulary, so it applies to every project — not just the ones
              compared here.
            </p>
            <v-autocomplete
              v-model="mergeTargetKey"
              :items="mergeTargets"
              item-title="title"
              item-value="key"
              label="Merge into"
              density="compact"
              variant="outlined"
              hide-details
              class="mt-3"
            />
            <template v-if="mergeNeedsKind">
              <v-select
                v-model="mergeKind"
                :items="termKindItems"
                label="Kind of the target term"
                density="compact"
                variant="outlined"
                hide-details
                class="mt-3"
                style="max-width: 200px"
              />
              <p class="text-caption text-medium-emphasis mt-1">
                The target is not in the vocabulary yet. Creating it needs a kind — it is never guessed.
              </p>
            </template>
            <v-alert v-if="mergeError" type="warning" density="compact" variant="tonal" class="mt-3">
              {{ mergeError }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" variant="text" @click="mergeDialog = false">Cancel</v-btn>
            <v-btn size="small" variant="tonal" :disabled="!canMerge" @click="confirmMerge">Merge</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

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
import { buildAliasIndex, normalize, TERM_KINDS } from '../../services/vocabulary'
import { buildComparisonExport, downloadComparisonJson, downloadComparisonHtml } from '../../utils/comparisonExport'
import {
  buildComparison,
  coverageByProject,
  unresolvedNames,
  suggestionsForName,
  exactMatchGroups,
  overrideContextOf,
  buildRadarOverlay,
  layoutRadarOverlay,
  quadrantLabelsOf,
  canonicalStatus,
  agreementLevel,
  buildBaselineFromProject,
  buildBaselineFromConsensus,
  sortRows,
  projectSortColumn,
  SORT_COLUMN,
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
    // ── Reference baselines (F7) ─────────────────────────────────────────────
    //
    // Two questions, one table: "do the projects agree with each other" and
    // "does each of them match the target". The mode says which one is being
    // asked; everything downstream follows from the engine's answer.

    const comparisonMode = ref('peer')
    const activeBaselineId = ref('')

    const baselines = computed(() => store.workspace.comparisonBaselines || [])
    const activeBaseline = computed(
      () => baselines.value.find((baseline) => baseline.id === activeBaselineId.value) || null
    )
    // Baseline mode without a baseline would silently be peer mode; the guard is
    // here rather than in the engine, which should never have to second-guess
    // what it was handed.
    const effectiveBaseline = computed(() => (comparisonMode.value === 'baseline' ? activeBaseline.value : null))
    const inBaselineMode = computed(() => Boolean(effectiveBaseline.value))

    const comparison = computed(() =>
      buildComparison(store.workspace, selectedProjectIds.value, {
        source: dataSource.value,
        visibleKinds: visibleKinds.value,
        aliasIndex: aliasIndex.value,
        baseline: effectiveBaseline.value
      })
    )

    const allUnits = computed(() => comparison.value.allUnits)
    const units = computed(() => comparison.value.units)
    const rows = computed(() => comparison.value.rows)
    // Rows marked "not important" (F1). They are out of `rows` and out of every
    // metric; the table can still show them on request so the mark can be taken
    // back without hunting for the term somewhere else.
    const ignoredRows = computed(() => comparison.value.ignoredRows)
    const metrics = computed(() => comparison.value.metrics)
    const baselineAgreement = computed(() => comparison.value.baselineAgreement)

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

    // ── Sections ─────────────────────────────────────────────────────────────
    //
    // Four foldable sections (design §5). Collapsed sections are removed from
    // the DOM rather than hidden, which is what makes folding the matrix away
    // actually cheap at a few hundred terms.

    const openSections = ref({ vocabulary: false, summary: true, matrix: true, overlay: true })

    function toggleSection(name) {
      openSections.value = { ...openSections.value, [name]: !openSections.value[name] }
      return openSections.value[name]
    }

    const kindLabel = computed(() => {
      const labels = { tool: '📐 Tools', practice: '🔷 Practices', unassigned: '⬚ Unassigned' }
      if (visibleKinds.value.length === 3) return 'all kinds'
      if (!visibleKinds.value.length) return 'no kinds'
      return visibleKinds.value.map((kind) => labels[kind] || kind).join(' · ')
    })

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

    function coverageOf(projectId) {
      return coveragePerProject.value[projectId] || { percent: 0, unresolved: 0, resolved: 0, total: 0 }
    }

    // The section stays folded while everything resolves and opens itself the
    // moment something does not (design §5.1) — but only on that transition, so
    // a user who folds it away keeps it folded.
    watch(
      () => unresolved.value.length,
      (count, previous) => {
        if (count > 0 && !previous) openSections.value = { ...openSections.value, vocabulary: true }
      },
      { immediate: true }
    )

    // Only the visible slice of the work list is rendered *and* only for it are
    // suggestions computed — each suggestion searches the whole vocabulary, so
    // a few hundred open names would otherwise mean a few hundred searches on
    // every redraw.
    const UNRESOLVED_PAGE = 25
    const unresolvedLimit = ref(UNRESOLVED_PAGE)

    // Only a changed data source starts the list over. Resetting it whenever
    // `unresolved` changes would send the user back to the top after every
    // single assignment — the one moment they are certainly still working.
    watch(dataSource, () => {
      unresolvedLimit.value = UNRESOLVED_PAGE
    })

    const visibleUnresolved = computed(() => unresolved.value.slice(0, unresolvedLimit.value))

    function showMoreUnresolved() {
      unresolvedLimit.value += UNRESOLVED_PAGE
      return unresolvedLimit.value
    }

    const suggestionsByGroup = computed(() => {
      const vocabulary = store.workspace.vocabulary || []
      const dismissed = store.workspace.dismissedSuggestions || []
      const byKey = new Map()
      visibleUnresolved.value.forEach((group) => {
        byKey.set(group.key, suggestionsForName(group.key, vocabulary, dismissed, { index: aliasIndex.value }))
      })
      return byKey
    })

    // Kind chosen by hand for a group whose units carry no answerType.
    const pendingKinds = ref({})

    // An alias that already belongs to a third term makes the store throw. That
    // is a conflict only a person can settle, so it is named rather than
    // swallowed (design §5.1).
    const vocabularyError = ref('')

    function guarded(action) {
      try {
        vocabularyError.value = ''
        return action()
      } catch (error) {
        vocabularyError.value = error?.message || String(error)
        return false
      }
    }

    // The kinds a term can have, straight from the vocabulary module so the
    // picker cannot drift from what the store accepts. A stable array for the
    // same reason as the filter lists above.
    const termKindItems = [...TERM_KINDS]

    /** Every term in the workspace, as options for assigning by hand. */
    const termItems = computed(() =>
      (store.workspace.vocabulary || [])
        .map((term) => ({ id: term.id, title: `${term.name} — ${term.kind}` }))
        .sort((a, b) => a.title.localeCompare(b.title))
    )

    function suggestionsFor(group) {
      const cached = suggestionsByGroup.value.get(group.key)
      if (cached) return cached
      return suggestionsForName(
        group.key,
        store.workspace.vocabulary || [],
        store.workspace.dismissedSuggestions || [],
        {
          index: aliasIndex.value
        }
      )
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
      return guarded(() => {
        group.spellings.forEach((spelling) => store.addAlias(termId, spelling.rawName))
        return true
      })
    }

    /**
     * Creates a term from the group. The first spelling becomes the canonical
     * name; the others are attached as aliases, so nothing keeps resolving by
     * text fallback alone.
     */
    function createTermFromGroup(group) {
      if (!canCreateTerm(group)) return ''
      return (
        guarded(() => {
          const [first, ...rest] = group.spellings
          const termId = store.createTerm(first.rawName, kindFor(group))
          if (!termId) return ''
          rest.forEach((spelling) => store.addAlias(termId, spelling.rawName))
          delete pendingKinds.value[group.key]
          return termId
        }) || ''
      )
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

    // Sorting is a column and a direction, set by clicking a header (F6). The
    // comparator itself is in the engine — "worst status this project gives the
    // term" is a statement about the comparison, not about the table.
    const sort = ref({ column: SORT_COLUMN.TERM, direction: 'asc' })
    const coverageFilter = ref('')
    // Filters on the *visible* badge, i.e. the one that won the precedence in
    // design §5.3 — never on a condition that was outranked.
    const deltaFilter = ref('')
    const unresolvedOnly = ref(false)
    const search = ref('')

    /** One entry per column of the matrix, in the order they are rendered. */
    const sortHeaders = computed(() => [
      { column: SORT_COLUMN.TERM, label: 'Term' },
      // The reference sits left of the projects, because it is what they are
      // being read against — not another column in the row of equals.
      ...(inBaselineMode.value ? [{ column: SORT_COLUMN.BASELINE, label: '◎ Reference' }] : []),
      ...selectedProjects.value.map((project) => ({
        column: projectSortColumn(project.id),
        label: project.name
      })),
      { column: SORT_COLUMN.COVERAGE, label: 'Coverage' },
      { column: SORT_COLUMN.DELTA, label: 'Δ Status' }
    ])

    // A click on the active column turns it around; a click on another column
    // starts it in its own natural order rather than inheriting the previous
    // direction, which would otherwise sort the new column backwards.
    function toggleSort(column) {
      sort.value =
        sort.value.column === column
          ? { column, direction: sort.value.direction === 'asc' ? 'desc' : 'asc' }
          : { column, direction: 'asc' }
      return sort.value
    }

    function ariaSortOf(column) {
      if (sort.value.column !== column) return 'none'
      return sort.value.direction === 'asc' ? 'ascending' : 'descending'
    }

    function sortMarkerOf(column) {
      if (sort.value.column !== column) return ''
      return sort.value.direction === 'asc' ? '▲' : '▼'
    }

    // A project that leaves the selection takes its column with it; the sort
    // would otherwise stay on a column nobody can see or click again.
    watch(sortHeaders, (headers) => {
      if (!headers.some((header) => header.column === sort.value.column)) {
        sort.value = { column: SORT_COLUMN.TERM, direction: 'asc' }
      }
    })

    // Item lists are built once here rather than as array literals in the
    // template: a literal is a fresh array on every render, so VSelect re-keys
    // its items under the open menu and the selection never sticks. Every select
    // in this tab that works takes its items from a constant or a computed.
    const coverageFilterItems = [
      { value: '', title: 'Any coverage' },
      { value: 'all', title: '◉ all' },
      { value: 'partial', title: '◐ partial' },
      { value: 'unique', title: '◑ unique' }
    ]
    const deltaFilterItems = [
      { value: '', title: 'Any Δ' },
      { value: 'deviating', title: 'Deviations only' },
      { value: 'critical', title: '▲▲▲ critical' },
      { value: 'inconsistent', title: '⚠ inconsistent' },
      { value: 'unset', title: '⊘ unset' },
      { value: 'accepted', title: '✎ accepted' },
      { value: 'silent', title: '≈ silently accepted' },
      { value: 'unlisted', title: '⊙ not in the reference' },
      { value: 'missing', title: '⊖ in the reference, unused' }
    ]

    // Ignored rows are shown only on request, and then still marked — the point
    // of the mark is that the row is out of the comparison, not that it is gone.
    const showIgnored = ref(false)

    const matrixRows = computed(() =>
      showIgnored.value ? [...rows.value, ...ignoredRows.value] : rows.value
    )

    const visibleRows = computed(() => {
      const term = search.value.trim().toLowerCase()
      const filtered = matrixRows.value.filter((row) => {
        if (coverageFilter.value && row.coverage !== coverageFilter.value) return false
        // A silent acceptance is agreement, so it is not a deviation; a row
        // with no target to match is not one either.
        if (deltaFilter.value === 'deviating' && ['match', 'none', 'silent', 'unlisted'].includes(row.delta))
          return false
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

      return sortRows(filtered, sort.value)
    })

    // Rows are paged for the same reason the work list is: one row carries a
    // cell per project, and a few hundred of them are a few thousand DOM nodes.
    const ROW_PAGE = 100
    const rowLimit = ref(ROW_PAGE)

    // A changed filter is a new question and starts at the top again; a rebuilt
    // comparison — someone saved an override — is not, and must not throw away
    // an expanded table.
    watch([search, coverageFilter, deltaFilter, unresolvedOnly, showIgnored], () => {
      rowLimit.value = ROW_PAGE
    })

    const pagedRows = computed(() => visibleRows.value.slice(0, rowLimit.value))

    function showMoreRows() {
      rowLimit.value += ROW_PAGE
      return rowLimit.value
    }

    function showAllRows() {
      rowLimit.value = Number.MAX_SAFE_INTEGER
      return rowLimit.value
    }

    // ── Summary bars (F8) ────────────────────────────────────────────────────
    //
    // The engine produces the figures; this only decides how to say them. Each
    // bar carries its number as text and an aria-label as well, so the picture
    // is never the only place the information lives.

    const pairwiseDivergence = computed(() => comparison.value.pairwiseDivergence)

    /** Green / amber / red on the same thresholds the agreement level uses. */
    function divergenceLevel(percent) {
      return agreementLevel(100 - percent)
    }

    function rowsDetail(comparedRows) {
      return comparedRows === 1 ? 'over 1 term' : `over ${comparedRows} terms`
    }

    const divergenceBars = computed(() =>
      pairwiseDivergence.value
        .filter((pair) => pair.comparedRows > 0)
        .map((pair) => {
          const label = `${projectNameOf(pair.a)} ↔ ${projectNameOf(pair.b)}`
          return {
            key: `${pair.a}::${pair.b}`,
            label,
            percent: pair.percent,
            level: divergenceLevel(pair.percent),
            detail: rowsDetail(pair.comparedRows),
            ariaLabel: `${label}: ${pair.percent} % apart ${rowsDetail(pair.comparedRows)}`
          }
        })
        // Worst first — the pair worth talking about should not be at the bottom.
        .sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label))
    )

    const baselineBars = computed(() =>
      selectedProjects.value
        .map((project) => {
          const agreement = agreementWith(project.id)
          return {
            key: project.id,
            label: project.name,
            percent: agreement.percent,
            level: agreementLevel(agreement.percent),
            detail: rowsDetail(agreement.comparedRows),
            ariaLabel: `${project.name}: follows the reference on ${agreement.percent} % ${rowsDetail(
              agreement.comparedRows
            )}`
          }
        })
        .sort((a, b) => a.percent - b.percent || a.label.localeCompare(b.label))
    )

    /** Unique terms per project, the breakdown design §5.2 asks for. */
    const uniqueBreakdown = computed(() => {
      const byProject = metrics.value.uniqueByProject || {}
      const parts = selectedProjects.value
        .map((project) => ({ name: project.name, count: byProject[project.id] || 0 }))
        .filter((entry) => entry.count > 0)
        .map((entry) => `${entry.name} ${entry.count}`)
      return parts.join(' · ')
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
      accepted: '✎ accepted',
      silent: '≈ silently accepted',
      unlisted: '⊙ not in the reference',
      missing: '⊖ in the reference, unused'
    }

    function coverageLabel(coverage) {
      return COVERAGE_LABELS[coverage] || coverage
    }

    function deltaLabel(delta) {
      return DELTA_LABELS[delta] || delta
    }

    /**
     * The status as the table shows it: one canonical spelling for the whole
     * matrix, whatever the projects happen to have stored (design F4). An empty
     * status is the `⊘ unset` marker rather than a blank cell — the difference
     * between "no status" and "no entry at all" has to stay readable.
     */
    function statusLabel(status) {
      return canonicalStatus(status) || '⊘ unset'
    }

    /** The chip colour, keyed off the normalized status so casing cannot miss. */
    function statusClass(status) {
      return `status-chip--${normalize(status) || 'unset'}`
    }

    function cellFor(row, projectId) {
      return row.cells.get(projectId) || null
    }

    /**
     * The cell's tooltip: where the value comes from, plus any Δ reason that the
     * single visible badge outranked. `↳` is only printed inline when a project
     * has more than one take on the term — for the single-take case the origin
     * lives here, which is design §5.3's "otherwise in the tooltip".
     */
    function cellTitle(row, projectId) {
      const cell = cellFor(row, projectId)
      const lines = []
      if (cell) {
        cell.values.forEach((value) => {
          const origin = [value.origin.entryTitle, value.origin.categoryTitle].filter(Boolean).join(' · ')
          // The canonical spelling is what the cell shows; the raw one is kept
          // right next to it, because that is what someone would search for in
          // the project data.
          lines.push(`${statusLabel(value.status)} ↳ ${origin} ("${value.origin.rawName}")`)
        })
      } else {
        lines.push('Not used in this project')
      }
      const other = (row.reasons || []).filter((reason) => reason !== row.delta)
      if (other.length) lines.push(`also applies: ${other.map((reason) => deltaLabel(reason)).join(', ')}`)
      return lines.join('\n')
    }

    // ── Silent acceptance (F3) ───────────────────────────────────────────────
    //
    // Two shapes of the same decision: a project with nothing to say goes along
    // with the others, or a project with something different to say takes
    // another project's status instead. Unlike the ✎ override this keeps the
    // term *in* Comparable and counts it as a match — agreement reached is
    // still agreement.

    const acceptDialog = ref(false)
    const acceptRow = ref(null)
    const acceptProjectId = ref('')
    const acceptFrom = ref('')
    const acceptComment = ref('')

    /** True while the dialog is about a project that says nothing about the term. */
    const acceptIsAbsence = computed(() => {
      const row = acceptRow.value
      if (!row || !acceptProjectId.value) return false
      return !cellFor(row, acceptProjectId.value)
    })

    /** The projects whose status the accepting one could take over. */
    const acceptSources = computed(() => {
      const row = acceptRow.value
      if (!row) return []
      return selectedProjects.value
        .filter((project) => project.id !== acceptProjectId.value && cellFor(row, project.id))
        .map((project) => ({
          id: project.id,
          title: `${project.name} — ${cellFor(row, project.id)
            .values.map((value) => statusLabel(value.status))
            .join(' / ')}`
        }))
    })

    const canAccept = computed(() => {
      if (!acceptRow.value || !acceptProjectId.value) return false
      return acceptIsAbsence.value || Boolean(acceptFrom.value)
    })

    function acceptanceFor(row, projectId) {
      return row?.acceptances?.[projectId] || null
    }

    function isAcceptanceApplied(row, projectId) {
      return Boolean(row?.appliedAcceptances?.get?.(projectId))
    }

    function isAcceptanceStale(row, projectId) {
      return Boolean(row?.staleAcceptances?.includes(projectId))
    }

    function openAcceptDialog(row, projectId) {
      acceptRow.value = row
      acceptProjectId.value = projectId
      const stored = acceptanceFor(row, projectId)
      acceptFrom.value = stored?.acceptedFrom || acceptSources.value[0]?.id || ''
      acceptComment.value = stored?.comment || ''
      acceptDialog.value = true
      return true
    }

    function confirmAccept() {
      const row = acceptRow.value
      if (!canAccept.value) return false
      // The same context an override records: which projects took part and what
      // each of them said. Without it a project could go on silently agreeing
      // with a statement nobody makes any more.
      const context = overrideContextOf(row, selectedProjectIds.value)
      const saved = store.setComparisonAcceptance(row.key, acceptProjectId.value, {
        mode: acceptIsAbsence.value ? 'absence' : 'status',
        acceptedFrom: acceptIsAbsence.value ? '' : acceptFrom.value,
        comment: acceptComment.value,
        ...context
      })
      acceptDialog.value = false
      return saved
    }

    function clearAcceptance(row, projectId) {
      return store.clearComparisonAcceptance(row.key, projectId)
    }

    /**
     * Whether the cell is even in a position to accept anything: somebody else
     * has to have said something, and the project must not already agree. There
     * is nothing silent to accept about a status two projects already share.
     */
    function canOfferAcceptance(row, projectId) {
      if (!row || row.ignored) return false
      const others = selectedProjects.value.filter(
        (project) => project.id !== projectId && cellFor(row, project.id)
      )
      if (!others.length) return false
      const own = cellFor(row, projectId)
      if (!own) return true
      if (own.values.length !== 1) return false
      return others.some((project) => {
        const values = cellFor(row, project.id).values
        return values.length === 1 && normalize(values[0].status) !== normalize(own.values[0].status)
      })
    }

    function projectNameOf(projectId) {
      return projects.value.find((project) => project.id === projectId)?.name || projectId
    }

    function acceptanceLabel(row, projectId) {
      const acceptance = acceptanceFor(row, projectId)
      if (!acceptance) return ''
      const base =
        acceptance.mode === 'absence'
          ? 'goes along with the others'
          : `takes ${projectNameOf(acceptance.acceptedFrom)}’s status`
      return isAcceptanceApplied(row, projectId) ? base : `${base} — no longer applies`
    }

    function acceptanceTitle(row, projectId) {
      const acceptance = acceptanceFor(row, projectId)
      if (!acceptance) return ''
      const lines = [acceptanceLabel(row, projectId)]
      if (acceptance.comment) lines.push(acceptance.comment)
      if (isAcceptanceStale(row, projectId)) lines.push('the situation has changed since — worth a look')
      if (acceptance.setAt) lines.push(acceptance.setAt)
      return lines.join('\n')
    }

    // ── Rename (F2) ──────────────────────────────────────────────────────────
    //
    // store.renameTerm keeps the id and turns the old name into an alias, so
    // every blip written under the old spelling keeps resolving and every
    // override keyed by the id stays in force. What it cannot do is rename a
    // row the vocabulary does not resolve: there is no term there, only text.
    // For those the dialog offers the one thing that *is* meaningful — making
    // the row a term under the chosen name, which needs a kind and never
    // guesses one.

    const renameDialog = ref(false)
    const renameRow = ref(null)
    const renameName = ref('')
    const renameKind = ref('')
    const renameError = ref('')

    /** True while the dialog would create a term rather than rename one. */
    const renameCreatesTerm = computed(() => Boolean(renameRow.value) && !renameRow.value.term)

    const renameNeedsKind = computed(() => renameCreatesTerm.value && renameRow.value?.kind === 'unassigned')

    const canRename = computed(() => {
      if (!renameRow.value || !renameName.value.trim()) return false
      return !renameNeedsKind.value || TERM_KINDS.includes(renameKind.value)
    })

    function openRenameDialog(row) {
      renameRow.value = row
      renameName.value = row?.name || ''
      renameKind.value = row?.kind !== 'unassigned' ? row?.kind || '' : ''
      renameError.value = ''
      renameDialog.value = true
      return true
    }

    function confirmRename() {
      const row = renameRow.value
      if (!canRename.value) return false
      const name = renameName.value.trim()
      try {
        renameError.value = ''
        if (row.term) {
          if (!store.renameTerm(row.term.id, name)) {
            renameError.value = `"${name}" already belongs to another term. Merge the two instead of renaming.`
            return false
          }
        } else {
          const kind = row.kind !== 'unassigned' ? row.kind : renameKind.value
          const termId = store.createTerm(name, kind)
          if (!termId) {
            renameError.value = 'The term could not be created. Pick another name.'
            return false
          }
          // Every spelling that landed in this row becomes an alias, or the row
          // would split into "the new term" and "the old text" at the next
          // redraw.
          rawNamesOf(row).forEach((rawName) => store.addAlias(termId, rawName))
          // Same row, new key — everything decided about it moves with it.
          carryRowDecisions(row.key, `term:${termId}`)
        }
        renameDialog.value = false
        return true
      } catch (error) {
        renameError.value = error?.message || String(error)
        return false
      }
    }

    // ── The vocabulary’s own terms (F2) ──────────────────────────────────────
    //
    // The section used to list only what the vocabulary could *not* resolve.
    // That is the work list; this is the vocabulary itself, and without it a
    // term could be created here but never corrected here.

    const termSearch = ref('')
    const TERM_PAGE = 25
    const termLimit = ref(TERM_PAGE)

    const matchingTerms = computed(() => {
      const needle = termSearch.value.trim().toLowerCase()
      return (store.workspace.vocabulary || [])
        .filter((term) => {
          if (!needle) return true
          return [term.name, ...(term.aliases || [])].some((text) =>
            String(text || '')
              .toLowerCase()
              .includes(needle)
          )
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    })

    const visibleTerms = computed(() => matchingTerms.value.slice(0, termLimit.value))

    watch(termSearch, () => {
      termLimit.value = TERM_PAGE
    })

    function showMoreTerms() {
      termLimit.value += TERM_PAGE
      return termLimit.value
    }

    function renameVocabularyTerm(term, name) {
      const canonical = String(name || '').trim()
      if (!canonical || canonical === term.name) return false
      return guarded(() => {
        if (!store.renameTerm(term.id, canonical)) {
          throw new Error(`"${canonical}" already belongs to another term. Merge the two instead of renaming.`)
        }
        return true
      })
    }

    function setVocabularyTermKind(term, kind) {
      return guarded(() => store.setTermKind(term.id, kind))
    }

    function setVocabularyTermNote(term, note) {
      return guarded(() => store.setTermNote(term.id, note))
    }

    function removeVocabularyAlias(term, alias) {
      return guarded(() => store.removeAlias(term.id, alias))
    }

    // Deleting a term does not delete any project data — the blips keep their
    // spelling and simply stop resolving, which is why this needs no more than
    // one confirmation.
    function deleteVocabularyTerm(term) {
      return guarded(() => store.deleteTerm(term.id))
    }

    // ── Not important (F1) ───────────────────────────────────────────────────

    const ignoreDialog = ref(false)
    const ignoreRow = ref(null)
    const ignoreReason = ref('')

    function openIgnoreDialog(row) {
      ignoreRow.value = row
      ignoreReason.value = row?.ignored?.reason || ''
      ignoreDialog.value = true
      return true
    }

    function confirmIgnore() {
      const row = ignoreRow.value
      if (!row) return false
      const marked = store.setComparisonIgnored(row.key, { reason: ignoreReason.value })
      ignoreDialog.value = false
      return marked
    }

    /** Takes the row back into the comparison. No dialog — nothing is lost. */
    function includeRow(row) {
      if (!row?.key) return false
      return store.clearComparisonIgnored(row.key)
    }

    /** Jumps into the radar of the project whose cell was clicked. */
    function openProjectRadar(projectId) {
      store.openProjectSummary(projectId)
    }

    // ── Merge (design §5.1) ──────────────────────────────────────────────────
    //
    // From the user's side there is one question — "aren't these two the same
    // thing?" — so there is one action, whichever side happens to be in the
    // vocabulary already:
    //
    //   term      into term      fold the source term into the target
    //   ◌ name    into term      hang the name on the target as an alias
    //   either    into ◌ name    the target becomes a term first, then as above
    //
    // Only the last case needs a kind, and only when the target row has none:
    // kind is mandatory on a term and is never guessed (§3.1).

    const mergeDialog = ref(false)
    const mergeRow = ref(null)
    const mergeTargetKey = ref('')
    const mergeKind = ref('')
    const mergeError = ref('')

    /** Every distinct raw spelling that landed in a row. */
    function rawNamesOf(row) {
      const names = new Set([row.name])
      row.cells.forEach((cell) => cell.values.forEach((value) => names.add(value.origin.rawName)))
      return [...names].filter(Boolean)
    }

    // Rows of the current comparison first — that is where the question comes
    // up — then terms the selection does not currently show, so an assignment
    // to an established term stays possible even when no project uses it here.
    const mergeTargets = computed(() => {
      const source = mergeRow.value
      if (!source) return []
      const targets = []
      const seen = new Set([source.key])

      rows.value.forEach((row) => {
        if (seen.has(row.key)) return
        seen.add(row.key)
        targets.push({ key: row.key, title: row.resolved ? row.name : `◌ ${row.name}`, row })
      })
      ;(store.workspace.vocabulary || []).forEach((term) => {
        const key = `term:${term.id}`
        if (seen.has(key)) return
        seen.add(key)
        targets.push({ key, title: `${term.name} — not used in this selection`, term })
      })

      return targets.sort((a, b) => a.title.localeCompare(b.title))
    })

    const mergeTarget = computed(() => mergeTargets.value.find((target) => target.key === mergeTargetKey.value) || null)

    const mergeNeedsKind = computed(() => {
      const target = mergeTarget.value
      if (!target || target.term || target.row?.term) return false
      return target.row?.kind === 'unassigned'
    })

    const canMerge = computed(() => {
      if (!mergeRow.value || !mergeTarget.value) return false
      return !mergeNeedsKind.value || ['tool', 'practice'].includes(mergeKind.value)
    })

    function openMergeDialog(row) {
      mergeRow.value = row
      mergeTargetKey.value = ''
      mergeKind.value = ''
      mergeError.value = ''
      mergeDialog.value = true
      return true
    }

    /** The target's term, created from an unresolved row when it has none yet. */
    function termIdOfTarget(target, kind) {
      const existing = target.term?.id || target.row?.term?.id || ''
      if (existing) return existing

      const row = target.row
      if (!row) return ''
      const targetKind = row.kind !== 'unassigned' ? row.kind : kind
      if (!['tool', 'practice'].includes(targetKind)) return ''
      const termId = store.createTerm(row.name, targetKind)
      if (!termId) return ''
      rawNamesOf(row).forEach((name) => store.addAlias(termId, name))
      return termId
    }

    /**
     * Merges `sourceRow` into `target`. Returns false and leaves a message when
     * the vocabulary refuses — a spelling owned by a third term is a conflict,
     * not something to overwrite.
     */
    function mergeRowInto(sourceRow, target, kind) {
      if (!sourceRow || !target) return false
      try {
        mergeError.value = ''
        const targetTermId = termIdOfTarget(target, kind)
        if (!targetTermId) {
          mergeError.value = 'The target term could not be created. Pick a kind, or choose another target.'
          return false
        }
        if (sourceRow.term) return store.mergeTerms(sourceRow.term.id, targetTermId)
        return rawNamesOf(sourceRow)
          .map((name) => store.addAlias(targetTermId, name))
          .some(Boolean)
      } catch (error) {
        mergeError.value = error?.message || String(error)
        return false
      }
    }

    function confirmMerge() {
      if (!canMerge.value) return false
      const source = mergeRow.value
      const targetKey = mergeTarget.value?.key || ''
      const merged = mergeRowInto(source, mergeTarget.value, mergeKind.value)
      if (merged) {
        carryRowDecisions(source.key, targetKey)
        mergeDialog.value = false
      }
      return merged
    }

    // ── Taking a reference (F7) ──────────────────────────────────────────────

    const baselineDialog = ref(false)
    const baselineName = ref('')
    const baselineSource = ref('')
    const baselineSkipped = ref([])
    const baselineEditId = ref('')

    const CONSENSUS_SOURCE = 'consensus'

    /** Where a reference can be taken from: any selected project, or the consensus. */
    const baselineSourceItems = computed(() => [
      { value: CONSENSUS_SOURCE, title: 'What the projects mostly say' },
      ...selectedProjects.value.map((project) => ({ value: project.id, title: project.name }))
    ])

    const baselineItems = computed(() =>
      baselines.value.map((baseline) => ({
        value: baseline.id,
        title: `${baseline.name} (${Object.keys(baseline.entries || {}).length} terms)`
      }))
    )

    function openBaselineDialog(baselineId = '') {
      const existing = baselines.value.find((baseline) => baseline.id === baselineId) || null
      baselineEditId.value = existing?.id || ''
      baselineName.value = existing?.name || ''
      baselineSource.value = existing?.origin?.projectId || selectedProjects.value[0]?.id || CONSENSUS_SOURCE
      baselineSkipped.value = []
      baselineDialog.value = true
      return true
    }

    /**
     * The rows a reference is taken from: always the peer-mode rows, never the
     * ones already measured against another reference. Taking a target from a
     * table that is itself relative to a target would be a copy of a copy.
     */
    function baselineSourceRows() {
      return buildComparison(store.workspace, selectedProjectIds.value, {
        source: dataSource.value,
        visibleKinds: visibleKinds.value,
        aliasIndex: aliasIndex.value
      }).rows
    }

    function buildBaselineEntries() {
      const sourceRows = baselineSourceRows()
      return baselineSource.value === CONSENSUS_SOURCE
        ? buildBaselineFromConsensus(sourceRows, selectedProjectIds.value)
        : buildBaselineFromProject(sourceRows, baselineSource.value)
    }

    const canSaveBaseline = computed(() => Boolean(baselineName.value.trim() && baselineSource.value))

    function confirmBaseline() {
      if (!canSaveBaseline.value) return false
      const { entries, skipped } = buildBaselineEntries()
      const origin = {
        kind: baselineSource.value === CONSENSUS_SOURCE ? 'consensus' : 'project',
        projectId: baselineSource.value === CONSENSUS_SOURCE ? '' : baselineSource.value,
        dataSource: dataSource.value
      }

      if (baselineEditId.value) {
        store.renameComparisonBaseline(baselineEditId.value, baselineName.value)
        store.updateComparisonBaseline(baselineEditId.value, entries, origin)
        activeBaselineId.value = baselineEditId.value
      } else {
        const id = store.createComparisonBaseline({ name: baselineName.value, origin, entries })
        if (!id) return false
        activeBaselineId.value = id
      }
      // What could not be taken over is named rather than quietly missing: a
      // reference with holes in it must say where they are.
      baselineSkipped.value = skipped
      comparisonMode.value = 'baseline'
      baselineDialog.value = false
      return true
    }

    function deleteBaseline(baselineId) {
      const deleted = store.deleteComparisonBaseline(baselineId)
      if (deleted && activeBaselineId.value === baselineId) {
        activeBaselineId.value = ''
        comparisonMode.value = 'peer'
      }
      return deleted
    }

    // Choosing a reference is what someone means by choosing one; and a
    // reference that is deleted or never chosen must not leave the table
    // claiming to measure against something.
    watch(activeBaselineId, (id) => {
      if (id) comparisonMode.value = 'baseline'
    })

    watch([comparisonMode, baselines], () => {
      if (comparisonMode.value === 'baseline' && !activeBaseline.value) {
        activeBaselineId.value = baselines.value[0]?.id || ''
        if (!activeBaselineId.value) comparisonMode.value = 'peer'
      }
    })

    function agreementWith(projectId) {
      return baselineAgreement.value[projectId] || { percent: 0, comparedRows: 0, byClass: {} }
    }

    /**
     * Moves everything recorded against one row key onto another.
     *
     * A row's key changes whenever its identity changes without its meaning
     * changing — a spelling becoming a term, two rows merging. The decisions
     * taken about it are about the thing, not about the key, so they travel
     * with it. Left behind, they would be inert at best and a phantom row in
     * the reference at worst.
     */
    function carryRowDecisions(fromKey, toKey) {
      if (!fromKey || !toKey || fromKey === toKey) return false
      store.moveComparisonIgnored(fromKey, toKey)
      store.moveComparisonAcceptances(fromKey, toKey)
      store.moveComparisonBaselineEntries(fromKey, toKey)
      return true
    }

    // ── Drag & drop merge (F5) ───────────────────────────────────────────────
    //
    // Dragging one term onto another is the shortest way to say "these two are
    // the same thing". It only *opens* the merge dialog: the merge changes the
    // workspace vocabulary for every project, so it is confirmed however it was
    // started. Only the term cell is draggable — the project cells already have
    // a click of their own.

    const dragSourceKey = ref('')
    const dropTargetKey = ref('')

    function startRowDrag(row, event) {
      dragSourceKey.value = row.key
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'link'
        // Some browsers refuse to start a drag without any payload.
        event.dataTransfer.setData('text/plain', row.name)
      }
      return row.key
    }

    function isDropTarget(row) {
      return Boolean(dragSourceKey.value) && dropTargetKey.value === row.key && dragSourceKey.value !== row.key
    }

    function dragOverRow(row, event) {
      if (!dragSourceKey.value || dragSourceKey.value === row.key) return false
      event?.preventDefault?.()
      if (event?.dataTransfer) event.dataTransfer.dropEffect = 'link'
      dropTargetKey.value = row.key
      return true
    }

    function endRowDrag() {
      dragSourceKey.value = ''
      dropTargetKey.value = ''
      return true
    }

    function dropOnRow(row) {
      const sourceKey = dragSourceKey.value
      endRowDrag()
      if (!sourceKey || sourceKey === row.key) return false
      // Looked up over every row the comparison knows, not just the ones the
      // table happens to show: a rebuild mid-drag must not lose the source.
      const source = [...rows.value, ...ignoredRows.value].find((entry) => entry.key === sourceKey)
      if (!source) return false
      openMergeDialog(source)
      mergeTargetKey.value = row.key
      return true
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
        visibleKinds: visibleKinds.value,
        ignoredRows: ignoredRows.value,
        baseline: effectiveBaseline.value,
        baselineAgreement: baselineAgreement.value,
        pairwiseDivergence: pairwiseDivergence.value,
        overlay: overlayExport()
      })
    }

    function exportJson() {
      return downloadComparisonJson(exportData())
    }

    function exportHtml() {
      return downloadComparisonHtml(exportData())
    }

    // ── Radar overlay (Todo 5.3, design §5.4) ────────────────────────────────
    //
    // Quadrant layout is configured per project, so one reference project gives
    // the chart its shape; anything it does not know goes to "Other". The
    // placement itself lives in the engine: it has to be a function of the data
    // alone, or the same blip moves whenever an unrelated row appears — and a
    // chart that never looks the same twice cannot be read.

    const OVERLAY_SIZE = 420
    const OVERLAY_RADIUS = 170
    const PROJECT_COLORS = ['#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#c62828']
    // One shape per project on top of the colour: the ring colours are already
    // spoken for by the status scale, so shape is what stays legible.
    const PROJECT_SHAPES = ['circle', 'square', 'triangle', 'diamond']
    // The ring colours of the single-project radar, so both charts read alike.
    const RING_COLORS = {
      Adopt: '#4caf50',
      Trial: '#2196f3',
      Assess: '#ff9800',
      Hold: '#9e9e9e',
      Retire: '#f44336'
    }
    const RING_FILLS = {
      Adopt: 'rgba(76, 175, 80, 0.07)',
      Trial: 'rgba(33, 150, 243, 0.07)',
      Assess: 'rgba(255, 152, 0, 0.07)',
      Hold: 'rgba(158, 158, 158, 0.08)',
      Retire: 'rgba(244, 67, 54, 0.06)'
    }

    const referenceProjectId = ref('')
    const referenceProject = computed(
      () =>
        projects.value.find((project) => project.id === referenceProjectId.value) ||
        projects.value.find((project) => selectedProjectIds.value.includes(project.id)) ||
        null
    )

    // Hiding a project means leaving it out of the overlay entirely, so the
    // remaining projects are laid out and their conflicts counted among
    // themselves — not drawn against a project nobody can see.
    const hiddenProjectIds = ref([])
    const overlayProjectIds = computed(() =>
      selectedProjectIds.value.filter((id) => !hiddenProjectIds.value.includes(id))
    )

    function toggleOverlayProject(projectId) {
      hiddenProjectIds.value = hiddenProjectIds.value.includes(projectId)
        ? hiddenProjectIds.value.filter((id) => id !== projectId)
        : [...hiddenProjectIds.value, projectId]
      return hiddenProjectIds.value
    }

    const overlay = computed(() => buildRadarOverlay(rows.value, overlayProjectIds.value, referenceProject.value))
    const overlayChart = computed(() =>
      layoutRadarOverlay(overlay.value, { size: OVERLAY_SIZE, radius: OVERLAY_RADIUS })
    )
    const overlayPoints = computed(() => overlayChart.value.points)
    const overlayLines = computed(() => overlayChart.value.segments)
    const quadrantLabels = computed(() => quadrantLabelsOf(referenceProject.value))
    // Outside in, so the inner bands stay visible on top of the outer ones.
    const overlayBands = computed(() =>
      [...overlayChart.value.rings].reverse().map((ring) => ({ ...ring, fill: RING_FILLS[ring.label] }))
    )

    const overlayAriaLabel = computed(
      () =>
        `Radar overlay of ${overlayProjectIds.value.length} projects, ${overlayPoints.value.length} plotted assessments`
    )

    function projectColor(projectId) {
      const index = selectedProjectIds.value.indexOf(projectId)
      return PROJECT_COLORS[(index < 0 ? 0 : index) % PROJECT_COLORS.length]
    }

    function projectShape(projectId) {
      const index = selectedProjectIds.value.indexOf(projectId)
      return PROJECT_SHAPES[(index < 0 ? 0 : index) % PROJECT_SHAPES.length]
    }

    function ringColor(label) {
      return RING_COLORS[label] || 'currentColor'
    }

    /** The project's symbol as an SVG path, used on the chart and in the key. */
    function symbolPathAt(projectId, x, y, radius) {
      switch (projectShape(projectId)) {
        case 'square':
          return `M ${x - radius} ${y - radius} H ${x + radius} V ${y + radius} H ${x - radius} Z`
        case 'triangle':
          return `M ${x} ${y - radius} L ${x + radius} ${y + radius * 0.85} L ${x - radius} ${y + radius * 0.85} Z`
        case 'diamond':
          return `M ${x} ${y - radius} L ${x + radius} ${y} L ${x} ${y + radius} L ${x - radius} ${y} Z`
        default:
          return `M ${x - radius} ${y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`
      }
    }

    function symbolPath(point) {
      return symbolPathAt(point.projectId, point.x, point.y, 5)
    }

    // Clicking a point answers the question the chart raises but cannot show:
    // what every project says about this term, and where those takes come from.
    const selectedOverlayKey = ref('')
    const selectedOverlayRow = computed(() => rows.value.find((row) => row.key === selectedOverlayKey.value) || null)

    // The ⊘ list is a way back to the blip, not just a sentence (design §5.4).
    const withoutStatusChips = computed(() =>
      overlay.value.withoutStatus.map((entry, index) => ({
        ...entry,
        id: `${entry.key}::${entry.projectId}::${index}`,
        projectName: projectNamesOf([entry.projectId])
      }))
    )

    /**
     * The overlay as plain data for the export: coordinates, colours and symbol
     * paths, exactly as drawn. The report shows the chart the user was looking
     * at rather than laying it out a second time (design §8).
     */
    function overlayExport() {
      const chart = overlayChart.value
      return {
        size: OVERLAY_SIZE,
        center: chart.center,
        radius: chart.radius,
        referenceProject: referenceProject.value?.name || '',
        rings: chart.rings.map((ring) => ({ ...ring, color: ringColor(ring.label) })),
        quadrants: chart.quadrantCorners.map((corner, index) => ({
          ...corner,
          label: quadrantLabels.value[index] || ''
        })),
        points: overlayPoints.value.map((point) => ({
          path: symbolPath(point),
          color: projectColor(point.projectId),
          name: point.name,
          status: statusLabel(point.status),
          project: projectNamesOf([point.projectId]),
          unresolved: point.unresolved,
          unassignedKind: point.unassignedKind
        })),
        segments: overlayLines.value,
        projects: selectedProjects.value.map((project) => ({
          name: project.name,
          color: projectColor(project.id),
          path: symbolPathAt(project.id, 7, 7, 5),
          hidden: hiddenProjectIds.value.includes(project.id)
        })),
        withoutStatus: overlay.value.withoutStatus.map((entry) => entry.name)
      }
    }

    function selectOverlayPoint(point) {
      selectedOverlayKey.value = selectedOverlayKey.value === point.key ? '' : point.key
      return selectedOverlayKey.value
    }

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
      openSections,
      toggleSection,
      kindLabel,
      selectedProjects,
      coveragePerProject,
      coverageOf,
      unresolved,
      exactMatches,
      pendingKinds,
      visibleUnresolved,
      showMoreUnresolved,
      suggestionsFor,
      projectNamesOf,
      projectNameOf,
      canCreateTerm,
      assignGroup,
      createTermFromGroup,
      resolveAllExactMatches,
      dismissSuggestion,
      vocabularyError,
      termItems,
      termKindItems,
      mergeDialog,
      mergeRow,
      mergeTargetKey,
      mergeTargets,
      mergeTarget,
      mergeKind,
      mergeNeedsKind,
      mergeError,
      canMerge,
      openMergeDialog,
      mergeRowInto,
      confirmMerge,
      carryRowDecisions,
      dragSourceKey,
      dropTargetKey,
      startRowDrag,
      dragOverRow,
      endRowDrag,
      dropOnRow,
      isDropTarget,
      comparisonMode,
      activeBaselineId,
      activeBaseline,
      inBaselineMode,
      baselines,
      baselineItems,
      baselineAgreement,
      agreementWith,
      pairwiseDivergence,
      divergenceBars,
      baselineBars,
      baselineDialog,
      baselineName,
      baselineSource,
      baselineSourceItems,
      baselineSkipped,
      baselineEditId,
      canSaveBaseline,
      openBaselineDialog,
      confirmBaseline,
      deleteBaseline,
      sort,
      sortHeaders,
      toggleSort,
      ariaSortOf,
      sortMarkerOf,
      coverageFilter,
      coverageFilterItems,
      deltaFilter,
      deltaFilterItems,
      unresolvedOnly,
      search,
      ignoredRows,
      showIgnored,
      matrixRows,
      acceptDialog,
      acceptRow,
      acceptProjectId,
      acceptFrom,
      acceptComment,
      acceptIsAbsence,
      acceptSources,
      canAccept,
      acceptanceFor,
      acceptanceLabel,
      acceptanceTitle,
      canOfferAcceptance,
      isAcceptanceApplied,
      isAcceptanceStale,
      openAcceptDialog,
      confirmAccept,
      clearAcceptance,
      renameDialog,
      renameRow,
      renameName,
      renameKind,
      renameError,
      renameCreatesTerm,
      renameNeedsKind,
      canRename,
      openRenameDialog,
      confirmRename,
      termSearch,
      matchingTerms,
      visibleTerms,
      showMoreTerms,
      renameVocabularyTerm,
      setVocabularyTermKind,
      setVocabularyTermNote,
      removeVocabularyAlias,
      deleteVocabularyTerm,
      ignoreDialog,
      ignoreRow,
      ignoreReason,
      openIgnoreDialog,
      confirmIgnore,
      includeRow,
      visibleRows,
      pagedRows,
      showMoreRows,
      showAllRows,
      uniqueBreakdown,
      coverageLabel,
      deltaLabel,
      statusLabel,
      statusClass,
      cellFor,
      cellTitle,
      openProjectRadar,
      exportData,
      exportJson,
      exportHtml,
      OVERLAY_SIZE,
      referenceProjectId,
      referenceProject,
      hiddenProjectIds,
      toggleOverlayProject,
      overlay,
      overlayChart,
      overlayBands,
      overlayPoints,
      overlayLines,
      overlayAriaLabel,
      quadrantLabels,
      projectColor,
      projectShape,
      ringColor,
      symbolPath,
      symbolPathAt,
      selectedOverlayKey,
      selectedOverlayRow,
      selectOverlayPoint,
      withoutStatusChips,
      overlayExport,
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

.comparison-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

/* Every section folds; the whole title row is the target, so the chevron is a
   hint rather than the only place that reacts. */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.coverage-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.coverage-item {
  min-width: 150px;
}

.coverage-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.875rem;
}

.coverage-track {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--v-border-color), 0.25);
  overflow: hidden;
  margin: 2px 0;
}

.coverage-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: rgb(var(--v-theme-primary));
}

.agreement-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agreement-track {
  width: 120px;
}

.term-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.term-aliases {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.unresolved-more {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
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

.matrix-header {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.matrix-header:hover,
.matrix-header:focus-visible {
  background: rgba(var(--v-theme-primary), 0.06);
}

.matrix-header--sorted {
  color: rgb(var(--v-theme-primary));
}

.sort-marker {
  font-size: 0.7rem;
  margin-left: 2px;
}

.matrix-term {
  cursor: grab;
}

.matrix-term--drop-target {
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8125rem;
}

.bar-label {
  min-width: 180px;
}

.bar-track {
  flex: 1 1 120px;
  max-width: 260px;
}

.bar-value {
  min-width: 44px;
  text-align: right;
}

/* The Δ palette, not the status palette: a red Retire chip and a red critical
   bar in the same card would be two different reds meaning two different
   things (design §5.3). */
.bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2e7d32;
}

.bar-fill--moderate {
  background: #ef6c00;
}

.bar-fill--low {
  background: #c62828;
}

.matrix-baseline {
  background: rgba(var(--v-theme-primary), 0.04);
}

.matrix-cell {
  cursor: pointer;
}

/* A cell whose value was set aside by a silent acceptance reads as settled
   rather than as data — the number it contributes is not the one shown. */
.matrix-cell--accepted .status-chip {
  text-decoration: line-through;
  opacity: 0.6;
}

.cell-acceptance {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.acceptance-marker {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
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

.delta-badge--silent {
  color: #00838f;
}

/* Visible on every row rather than revealed on hover: "these two are the same
   thing" is the question the matrix provokes, and an action nobody finds is the
   same as one that does not exist. */
.row-action {
  opacity: 0.5;
  transition: opacity 0.1s ease-in-out;
}

.comparison-matrix tr:hover .row-action,
.row-action:focus-visible {
  opacity: 1;
}

/* An ignored row that is being shown on request stays legible but reads as set
   aside — it is not part of any figure on this page. */
.matrix-row--ignored {
  opacity: 0.55;
}

.ignored-marker {
  color: rgb(var(--v-theme-secondary));
  margin-right: 2px;
}

.overlay-svg {
  width: 100%;
  max-width: 520px;
  display: block;
  margin: 0 auto;
}

.overlay-ring,
.overlay-axis {
  fill: none;
  stroke: rgba(var(--v-border-color), var(--v-border-opacity));
  stroke-width: 1;
}

.overlay-ring-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.overlay-quadrant-label {
  font-size: 11px;
  font-weight: 600;
  fill: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
}

.overlay-point-group {
  cursor: pointer;
}

.overlay-point--selected {
  stroke: rgb(var(--v-theme-on-surface));
  stroke-width: 2;
}

.overlay-legends {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 12px;
}

.overlay-legend-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overlay-legend-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.6;
}

.overlay-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.overlay-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 1px 0;
  cursor: pointer;
  color: inherit;
}

.overlay-toggle--off {
  opacity: 0.35;
  text-decoration: line-through;
}

.overlay-legend-line {
  display: inline-block;
  width: 18px;
  height: 0;
  border-top-width: 2px;
  border-top-style: solid;
}

.overlay-legend-line--internal {
  border-top-color: #ef6c00;
}

.overlay-legend-line--cross-project {
  border-top-color: #c62828;
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
