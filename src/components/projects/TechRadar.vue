<template>
  <div class="tech-radar">
    <!-- Empty state -->
    <v-alert v-if="!allBlips.length" type="info" variant="tonal" density="compact" class="ma-4">
      No radar references yet. In the <strong>Matrix</strong> or <strong>All Suggestions</strong> tab, click
      <v-icon size="14" class="mx-1">mdi-radar</v-icon>
      next to any entry to add it to the Tech Radar.
    </v-alert>

    <div v-else>
      <!-- Toolbar -->
      <div class="d-flex align-center mb-3" style="gap:8px;">
        <div class="d-flex align-center flex-wrap" style="gap:8px; flex:1;">
          <v-btn-toggle
            v-model="answerTypeFilter"
            density="compact"
            color="primary"
            variant="outlined"
            divided
            mandatory
            rounded="lg"
            style="white-space:nowrap;"
          >
            <v-btn value="all" size="small">All</v-btn>
            <v-btn value="Tool" size="small">
              <v-icon start size="14">mdi-puzzle</v-icon>
              Tools
            </v-btn>
            <v-btn value="Practice" size="small">
              <v-icon start size="14">mdi-map-marker-path</v-icon>
              Practices
            </v-btn>
          </v-btn-toggle>
          <v-text-field
            v-model="searchQuery"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            placeholder="Search"
            style="max-width:220px;"
            @click:clear="searchQuery = ''"
          />
        </div>
        <div class="d-flex align-center" style="gap:8px;">
          <v-tooltip v-if="unassignedCategories.length > 0" text="Open quadrant configuration" location="top">
            <template #activator="{ props: tipProps }">
              <v-chip
                v-bind="tipProps"
                size="small"
                variant="text"
                class="hidden-count-chip"
                @click="quadrantConfigDialog = true"
              >
                <v-icon start size="13">mdi-eye-off-outline</v-icon>
                {{ unassignedCategories.length }} hidden
              </v-chip>
            </template>
          </v-tooltip>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                size="small"
                variant="text"
                icon="mdi-dots-vertical"
              />
            </template>
          <v-list density="compact" min-width="200">
            <v-list-item
              prepend-icon="mdi-cog"
              title="Quadrant Configuration"
              @click="quadrantConfigDialog = true"
            />
            <v-divider />
            <v-list-item
              prepend-icon="mdi-code-json"
              title="Export as ThoughtWorks JSON"
              @click="exportRadarJson"
            />
            <v-list-item
              prepend-icon="mdi-download"
              title="Download as PNG"
              :disabled="isDownloading"
              @click="downloadRadar"
            />
          </v-list>
          </v-menu>
        </div>
      </div>

      <div ref="radarLayoutRef" class="radar-layout">
      <!-- Left legend: Q1 (top-left) + Q2 (bottom-left) -->
      <div class="radar-legend">
        <div v-for="group in leftGroups" :key="group.quadrant" class="mb-4">
          <div class="legend-quadrant-header text-caption font-weight-bold text-uppercase mb-1 legend-quadrant-header--editable" @click="quadrantConfigDialog = true">
            {{ group.label || `Quadrant ${group.quadrant + 1}` }}
            <v-icon class="legend-quadrant-edit-icon" size="12">mdi-pencil-outline</v-icon>
          </div>
          <div v-for="sg in group.statusGroups" :key="sg.ring">
            <div class="legend-status-header" :style="{ '--status-color': sg.color }">
              {{ sg.statusLabel }}
            </div>
            <div
              v-for="blip in sg.blips"
              :key="blip.key"
              class="legend-row"
              :class="{
                'legend-row--hovered': hoveredBlip?.key === blip.key,
                'legend-row--highlighted': highlightedBlipKeys?.has(blip.key),
                'legend-row--dimmed': (highlightedBlipKeys && !highlightedBlipKeys.has(blip.key)) || (hoveredBlip && hoveredBlip.key !== blip.key)
              }"
              @mouseenter="hoveredBlip = blip"
              @mouseleave="hoveredBlip = null"
              @click="openDetail(blip)"
            >
              <span class="legend-index" :style="{ background: blip.ringColor }">{{ blip.index }}</span>
              <div class="legend-info">
                <div class="text-body-2 font-weight-medium legend-name">
                  {{ blip.name }}
                  <v-icon v-if="blip.overrideStatus || blip.radarComment || blip.overrideCategoryTitle" size="10" class="ml-1 text-primary" style="vertical-align:middle;">mdi-pencil-circle</v-icon>
                </div>
              </div>
              <div class="legend-row-actions">
                <v-menu location="bottom end">
                  <template #activator="{ props: menuProps }">
                    <v-btn icon size="x-small" variant="text" v-bind="menuProps" @click.stop>
                      <v-icon size="14">mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list density="compact" min-width="140">
                    <v-list-item prepend-icon="mdi-pencil-outline" title="Edit" @click="openEdit(blip)" />
                    <v-list-item prepend-icon="mdi-delete-outline" title="Remove" @click="confirmRemove(blip)" />
                  </v-list>
                </v-menu>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: SVG + ring key -->
      <div class="radar-center">
      <!-- SVG Radar -->
      <div class="radar-svg-wrapper">
        <svg
          :viewBox="`0 0 ${SIZE} ${SIZE}`"
          class="radar-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Definitions -->
          <defs>
            <clipPath id="radar-clip">
              <circle :cx="CX" :cy="CY" :r="OUTER_R" />
            </clipPath>
          </defs>

          <!-- Background circle -->
          <circle :cx="CX" :cy="CY" :r="OUTER_R + 2" fill="var(--radar-bg)" />

          <!-- Ring fills (painted outside-in using full circles) -->
          <circle v-for="(ring, i) in ringsBg" :key="`rbg-${i}`"
            :cx="CX" :cy="CY" :r="ring.r"
            :fill="ring.fill"
          />

          <!-- Quadrant overlay tints -->
          <path v-for="(q, qi) in quadrantTints" :key="`qt-${qi}`"
            :d="q.path"
            :fill="q.fill"
            opacity="0.04"
          />

          <!-- Ring boundary circles (stroke only) -->
          <circle v-for="r in visibleRingRadii" :key="`rc-${r}`"
            :cx="CX" :cy="CY" :r="r"
            fill="none"
            stroke="var(--radar-line)"
            stroke-width="0.8"
          />

          <!-- Divider lines -->
          <line :x1="CX" :y1="CY - OUTER_R" :x2="CX" :y2="CY + OUTER_R"
            stroke="var(--radar-line)" stroke-width="1.2" />
          <line :x1="CX - OUTER_R" :y1="CY" :x2="CX + OUTER_R" :y2="CY"
            stroke="var(--radar-line)" stroke-width="1.2" />

          <!-- Ring labels (placed along the leftward horizontal axis, inside each ring) -->
          <text
            v-for="(label, i) in ringLabels" :key="`rl-${i}`"
            :x="label.x" :y="label.y"
            text-anchor="middle"
            dominant-baseline="middle"
            class="ring-label"
            :fill="label.color"
          >{{ label.text }}</text>

          <!-- Quadrant corner labels -->
          <text v-for="(ql, qi) in activeQuadrantLabels" :key="`ql-${qi}`"
            :x="ql.x" :y="ql.y"
            :text-anchor="ql.anchor"
            class="quadrant-label"
            fill="var(--radar-text-dim)"
          >{{ ql.text }}</text>

          <!-- Blip circles -->
          <g
            v-for="blip in positionedBlips"
            :key="blip.key"
            :opacity="(highlightedBlipKeys && !highlightedBlipKeys.has(blip.key)) || (hoveredBlip && hoveredBlip.key !== blip.key) ? 0.12 : 1"
          >
            <!-- Glow ring for search-matching blips -->
            <circle
              v-if="highlightedBlipKeys && highlightedBlipKeys.has(blip.key)"
              :cx="blip.x"
              :cy="blip.y"
              :r="BLIP_R + 7"
              :fill="blip.ringColor"
              opacity="0.35"
              class="blip-glow"
            />
            <circle
              :cx="blip.x"
              :cy="blip.y"
              :r="BLIP_R"
              :fill="blip.ringColor"
              stroke="white"
              stroke-width="1.2"
              class="blip-circle"
              @mouseenter="hoveredBlip = blip"
              @mouseleave="hoveredBlip = null"
              @click="openDetail(blip)"
            />
            <text
              :x="blip.x"
              :y="blip.y"
              text-anchor="middle"
              dominant-baseline="central"
              class="blip-label"
            >{{ blip.index }}</text>
          </g>

          <!-- Hover tooltip -->
          <g v-if="hoveredBlip" style="pointer-events:none">
            <rect
              :x="clampTooltipX(hoveredBlip.x + 10)"
              :y="clampTooltipY(hoveredBlip.y - 14)"
              :width="tooltipWidth"
              :height="76 + (hoveredBlip.entryTitle ? 14 : 0) + (hoveredBlip.radarComment ? 14 : 0)"
              rx="4"
              fill="var(--radar-tooltip-bg)"
              stroke="var(--radar-line)"
              stroke-width="0.8"
              opacity="0.97"
            />
            <text
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 16"
              class="tooltip-title"
              fill="var(--radar-tooltip-text)"
            >{{ truncate(hoveredBlip.name, 32) }}</text>
            <text
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 32"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text-dim)"
            >{{ hoveredBlip.typeLabel }}</text>
            <text
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 46"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text-dim)"
            >{{ truncate(hoveredBlip.categoryTitle || hoveredBlip.questionnaireName, 32) }}</text>
            <text
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 60"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text-dim)"
            >{{ truncate(hoveredBlip.questionnaireName, 32) }}</text>
            <text
              v-if="hoveredBlip.entryTitle"
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 74"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text-dim)"
            >{{ truncate(hoveredBlip.entryTitle, 32) }}</text>
            <text
              v-if="hoveredBlip.radarComment"
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + (hoveredBlip.entryTitle ? 88 : 74)"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text)"
              font-style="italic"
            >{{ truncate(hoveredBlip.radarComment, 32) }}</text>
          </g>
        </svg>
      </div>

      <!-- Ring key -->
      <div class="ring-key d-flex flex-wrap justify-center mt-2" style="gap:16px;">
        <v-tooltip 
          v-for="ring in RING_META" 
          :key="ring.label"
          :text="ring.description"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <div 
              v-bind="tooltipProps"
              class="ring-key-item d-flex align-center" 
              :class="{ 'ring-key-item--inactive': !isStatusVisible(ring.label) }"
              style="gap:6px; cursor:pointer; user-select:none;"
              @click="toggleStatusVisibility(ring.label)"
            >
              <span class="ring-dot" :style="{ background: ring.color }" />
              <span class="text-caption">{{ ring.label }}</span>
            </div>
          </template>
        </v-tooltip>
      </div>
      <div v-if="!positionedBlips.length" class="text-caption text-medium-emphasis text-center mt-2 px-4">
        <span v-if="answerTypeFilter === 'all'">No blips added yet.</span>
        <span v-else>No blips with type "{{ answerTypeFilter }}". Set the <strong>Type</strong> field on answers to classify them.</span>
      </div>
      </div>

      <!-- Right legend: Q0 (top-right) + Q3 (bottom-right) -->
      <div class="radar-legend">
        <div v-for="group in rightGroups" :key="group.quadrant" class="mb-4">
          <div class="legend-quadrant-header text-caption font-weight-bold text-uppercase mb-1 legend-quadrant-header--editable" @click="quadrantConfigDialog = true">
            {{ group.label || `Quadrant ${group.quadrant + 1}` }}
            <v-icon class="legend-quadrant-edit-icon" size="12">mdi-pencil-outline</v-icon>
          </div>
          <div v-for="sg in group.statusGroups" :key="sg.ring">
            <div class="legend-status-header" :style="{ '--status-color': sg.color }">
              {{ sg.statusLabel }}
            </div>
            <div
              v-for="blip in sg.blips"
              :key="blip.key"
              class="legend-row"
              :class="{
                'legend-row--hovered': hoveredBlip?.key === blip.key,
                'legend-row--highlighted': highlightedBlipKeys?.has(blip.key),
                'legend-row--dimmed': (highlightedBlipKeys && !highlightedBlipKeys.has(blip.key)) || (hoveredBlip && hoveredBlip.key !== blip.key)
              }"
              @mouseenter="hoveredBlip = blip"
              @mouseleave="hoveredBlip = null"
              @click="openDetail(blip)"
            >
              <span class="legend-index" :style="{ background: blip.ringColor }">{{ blip.index }}</span>
              <div class="legend-info">
                <div class="text-body-2 font-weight-medium legend-name">
                  {{ blip.name }}
                  <v-icon v-if="blip.overrideStatus || blip.radarComment || blip.overrideCategoryTitle" size="10" class="ml-1 text-primary" style="vertical-align:middle;">mdi-pencil-circle</v-icon>
                </div>
              </div>
              <div class="legend-row-actions">
                <v-menu location="bottom end">
                  <template #activator="{ props: menuProps }">
                    <v-btn icon size="x-small" variant="text" v-bind="menuProps" @click.stop>
                      <v-icon size="14">mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list density="compact" min-width="140">
                    <v-list-item prepend-icon="mdi-pencil-outline" title="Edit" @click="openEdit(blip)" />
                    <v-list-item prepend-icon="mdi-delete-outline" title="Remove" @click="confirmRemove(blip)" />
                  </v-list>
                </v-menu>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- Blip detail dialog -->
      <v-dialog v-model="detailDialog" max-width="500" scrollable>
        <v-card v-if="detailBlip">
          <!-- Header with colour bar -->
          <div class="detail-header" :style="{ borderTop: `4px solid ${detailBlip.ringColor}` }">
            <div class="d-flex align-center gap-3 px-4 pt-4 pb-2">
              <span class="detail-index" :style="{ background: detailBlip.ringColor }">{{ detailBlip.index }}</span>
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ detailBlip.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ detailBlip.categoryTitle }}</div>
              </div>
              <v-spacer />
              <v-btn icon size="small" variant="text" @click="detailDialog = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </div>

          <v-divider />

          <v-card-text class="pa-4">
            <!-- Status row -->
            <div class="detail-grid mb-4">
              <div class="detail-field">
                <div class="detail-label">Status</div>
                <v-chip size="small" :color="detailBlip.ringColor" variant="tonal">
                  {{ detailBlip.statusLabel }}
                </v-chip>
                <span v-if="detailBlip.overrideStatus" class="text-caption text-medium-emphasis ml-2">
                  <v-icon size="10">mdi-pencil-circle</v-icon> Radar override
                </span>
              </div>
              <div class="detail-field">
                <div class="detail-label">Type</div>
                <div class="text-body-2">{{ detailBlip.typeLabel || '—' }}</div>
              </div>
              <div class="detail-field">
                <div class="detail-label">Quadrant</div>
                <div class="text-body-2 d-flex align-center" style="gap:4px;">
                  {{ detailBlip.categoryTitle || '—' }}
                  <v-icon v-if="detailBlip.overrideCategoryTitle" size="10" class="text-primary" style="vertical-align:middle;">mdi-pencil-circle</v-icon>
                </div>
                <div v-if="detailBlip.overrideCategoryTitle" class="text-caption text-medium-emphasis">
                  <v-icon size="10">mdi-pencil-circle</v-icon> Radar override (default: {{ detailBlip.naturalCategoryTitle }})
                </div>
              </div>
              <div class="detail-field">
                <div class="detail-label">Sub-category</div>
                <div class="text-body-2">{{ detailBlip.entryTitle || '—' }}</div>
              </div>
              <div class="detail-field">
                <div class="detail-label">Questionnaire</div>
                <div class="text-body-2">{{ detailBlip.questionnaireName || '—' }}</div>
              </div>
            </div>

            <!-- Questionnaire comment -->
            <template v-if="detailBlip.comment">
              <div class="detail-label mb-1">Questionnaire comment</div>
              <v-sheet rounded="lg" color="surface-variant" class="pa-3 mb-4">
                <div class="text-body-2" style="white-space:pre-wrap;">{{ detailBlip.comment }}</div>
              </v-sheet>
            </template>

            <!-- Radar comment (override) -->
            <template v-if="detailBlip.radarComment">
              <div class="detail-label mb-1">
                <v-icon size="12" class="mr-1">mdi-pencil-circle</v-icon>
                Radar comment
              </div>
              <v-sheet rounded="lg" color="primary" variant="tonal" class="pa-3 mb-4">
                <div class="text-body-2" style="white-space:pre-wrap;">{{ detailBlip.radarComment }}</div>
              </v-sheet>
            </template>

            <div v-if="!detailBlip.comment && !detailBlip.radarComment" class="text-caption text-medium-emphasis">
              No comments available.
            </div>
          </v-card-text>

          <v-divider />
          <v-card-actions class="px-4 py-3">
            <v-btn variant="text" prepend-icon="mdi-pencil-outline" size="small" @click="() => { detailDialog = false; openEdit(detailBlip) }">
              Edit
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="detailDialog = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Confirm remove dialog -->
      <v-dialog v-model="confirmDialog" max-width="380">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold pt-4 px-4">Remove from Radar</v-card-title>
          <v-card-text class="pb-2">
            Remove <strong>{{ blipToRemove?.name }}</strong> from the Tech Radar?
          </v-card-text>
          <v-card-actions class="px-4 pb-3">
            <v-spacer />
            <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
            <v-btn color="error" variant="tonal" @click="executeRemove">Remove</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Edit blip dialog -->
      <v-dialog v-model="editDialog" max-width="440">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold pt-4 px-4">
            <v-icon start size="18">mdi-pencil-outline</v-icon>
            Edit Radar Entry
          </v-card-title>
          <v-card-subtitle class="px-4 pb-0">{{ blipToEdit?.name }}</v-card-subtitle>
          <v-card-text class="px-4 pt-3 pb-2">
            <v-select
              v-model="editForm.status"
              :items="RADAR_STATUS_OPTIONS"
              item-title="title"
              item-value="value"
              label="Status"
              density="compact"
              variant="outlined"
              clearable
              :hint="blipToEdit?.status && !editForm.status ? `Inherited from questionnaire: ${blipToEdit.status}` : ''"
              persistent-hint
              class="mb-3"
            />
            <v-select
              v-model="editForm.categoryOverride"
              :items="availableCategoriesForEdit"
              label="Category (Quadrant)"
              density="compact"
              variant="outlined"
              clearable
              :hint="editForm.categoryOverride && blipToEdit && editForm.categoryOverride !== blipToEdit.naturalCategoryTitle ? 'Overrides the questionnaire-defined quadrant' : (blipToEdit ? `Questionnaire default: ${blipToEdit.naturalCategoryTitle}` : '')"
              persistent-hint
              class="mb-3"
            />
            <v-textarea
              v-model="editForm.comment"
              label="Radar comment"
              density="compact"
              variant="outlined"
              rows="3"
              auto-grow
              hide-details
              placeholder="Notes specific to this radar entry…"
            />
          </v-card-text>
          <v-card-actions class="px-4 pb-3">
            <v-spacer />
            <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
            <v-btn color="primary" variant="tonal" @click="saveEdit">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Quadrant Configuration Dialog -->
      <v-dialog v-model="quadrantConfigDialog" max-width="700" scrollable>
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold pt-4 px-4">
            <v-icon start size="18">mdi-cog</v-icon>
            Quadrant Configuration
          </v-card-title>
          <v-divider />
          <v-card-text class="px-4 pt-4">
            <!-- Unassigned categories -->
            <div class="mb-6">
              <div class="text-caption font-weight-bold text-uppercase mb-2">Unassigned Categories</div>
              <div 
                class="d-flex align-center flex-wrap unassigned-zone" 
                style="gap:4px; min-height: 40px; padding: 8px; border: 2px dashed #ccc; border-radius: 4px; background: rgba(0,0,0,0.02);"
                @dragover.prevent="handleUnassignedDragOver"
                @drop="handleUnassignedDrop"
              >
                <v-chip
                  v-for="cat in unassignedCategories"
                  :key="cat"
                  size="small"
                  variant="tonal"
                  color="grey"
                  class="category-badge"
                  style="cursor:grab;"
                  draggable="true"
                  @dragstart="handleCategoryDragStart($event, cat)"
                  @dragend="handleCategoryDragEnd"
                  @click.stop="toggleCategory(cat)"
                >{{ cat }}</v-chip>
                <span v-if="unassignedCategories.length === 0" class="text-caption text-disabled">(drag categories here to unassign)</span>
              </div>
            </div>

            <!-- Quadrant chips with assigned categories -->
            <div v-for="q in quadrants" :key="q.index" class="mb-4">
              <div class="text-caption font-weight-bold text-uppercase mb-2">{{ q.label }}</div>
              <v-text-field
                v-model="quadrantLabelForm[q.index]"
                :placeholder="autoQuadrantLabel(q.index)"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                label="Legend label (optional)"
                class="mb-2"
                @update:modelValue="updateQuadrantLabel(q.index, $event)"
                @click:clear="updateQuadrantLabel(q.index, '')"
              />
              <div
                class="d-flex align-center flex-wrap"
                style="gap:4px; min-height: 40px; padding: 8px; border: 2px dashed #ccc; border-radius: 4px; background: rgba(0,0,0,0.02);"
                @dragover.prevent="handleQuadrantDragOver($event, q.index)"
                @drop="handleQuadrantDrop($event, q.index)"
              >
                <v-chip
                  v-for="cat in q.categories"
                  :key="cat"
                  size="small"
                  variant="tonal"
                  color="blue-grey-lighten-2"
                  class="category-badge"
                  style="cursor:grab;"
                  draggable="true"
                  @dragstart="handleCategoryDragStart($event, cat)"
                  @dragend="handleCategoryDragEnd"
                  @click.stop="toggleCategory(cat)"
                >{{ cat }}</v-chip>
                <span v-if="q.categories.length === 0" class="text-caption text-disabled">(drag categories here)</span>
              </div>
            </div>


          </v-card-text>
          <v-divider />
          <v-card-actions class="px-4 py-3">
            <v-spacer />
            <v-btn color="primary" variant="text" @click="quadrantConfigDialog = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { useWorkspaceStore } from '../../stores/workspaceStore'

// ── Radar geometry constants ─────────────────────────────────────────────────
const SIZE = 720
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 30  // 330

// Ring outer radii (innermost to outermost): adopt / trial / assess / hold / retire
// Adopt gets the largest inner ring so frequently-used blips have more room
const RINGS = [0, 132, 188, 236, 282, OUTER_R]

const BLIP_R = 12
const TOOLTIP_W = 220

// Quadrant angle ranges [a1, a2] in SVG radians (y-down, clockwise is positive)
// Q0 top-right:   -π/2 → 0
// Q1 top-left:    -π   → -π/2
// Q2 bottom-left:  π/2 → π
// Q3 bottom-right: 0   → π/2
const Q_ANGLES = [
  { a1: -Math.PI / 2, a2: 0 },
  { a1: -Math.PI, a2: -Math.PI / 2 },
  { a1: Math.PI / 2, a2: Math.PI },
  { a1: 0, a2: Math.PI / 2 }
]

const RING_META = [
  { label: 'Adopt', color: '#4caf50', description: 'We use this and recommend it.' },
  { label: 'Trial', color: '#2196f3', description: 'We are testing this in selected production scenarios.' },
  { label: 'Assess', color: '#ff9800', description: 'We are currently evaluating/testing this.' },
  { label: 'Hold', color: '#9e9e9e', description: 'We use this, but do not recommend it for new features.' },
  { label: 'Retire', color: '#f44336', description: 'We are actively replacing or removing this.' }
]

// ── Sector path builder ──────────────────────────────────────────────────────
function arcPath (cx, cy, innerR, outerR, a1, a2) {
  const cos1 = Math.cos(a1), sin1 = Math.sin(a1)
  const cos2 = Math.cos(a2), sin2 = Math.sin(a2)
  if (innerR <= 0) {
    // Pie sector
    return [
      `M ${cx},${cy}`,
      `L ${cx + outerR * cos1} ${cy + outerR * sin1}`,
      `A ${outerR},${outerR} 0 0,1 ${cx + outerR * cos2} ${cy + outerR * sin2}`,
      'Z'
    ].join(' ')
  }
  return [
    `M ${cx + innerR * cos1} ${cy + innerR * sin1}`,
    `A ${innerR},${innerR} 0 0,1 ${cx + innerR * cos2} ${cy + innerR * sin2}`,
    `L ${cx + outerR * cos2} ${cy + outerR * sin2}`,
    `A ${outerR},${outerR} 0 0,0 ${cx + outerR * cos1} ${cy + outerR * sin1}`,
    'Z'
  ].join(' ')
}

// ── Slot position pre-computation ────────────────────────────────────────────
function computeSlots (qIdx, rIdx, rings) {
  const { a1, a2 } = Q_ANGLES[qIdx]
  const innerR = rings[rIdx]
  const outerR = rings[rIdx + 1]
  const marginA = 0.14   // ~8°
  const marginR = 7
  const effA1 = a1 + marginA
  const effA2 = a2 - marginA
  const effInner = Math.max(innerR + marginR, BLIP_R + 2)
  const effOuter = outerR - marginR
  const midR = (innerR + outerR) / 2

  const positions = []
  const rStep = 26
  const nR = Math.max(1, Math.round((effOuter - effInner) / rStep))

  for (let ri = 0; ri < nR; ri++) {
    // Center the row grid around the true ring midpoint so that blips always
    // sit in the visual middle of their band regardless of how many rows exist.
    const r = nR === 1
      ? midR
      : Math.max(effInner, Math.min(effOuter, midR + (ri - (nR - 1) / 2) * rStep))
    const arcLen = r * Math.abs(effA2 - effA1)
    const nA = Math.max(1, Math.round(arcLen / 30))
    const da = (effA2 - effA1) / nA
    for (let ai = 0; ai < nA; ai++) {
      const a = effA1 + da * (ai + 0.5)
      positions.push({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) })
    }
  }
  return positions
}

// Slot cache – keyed by quadrant, ring index AND ring boundaries so dynamic sizes invalidate correctly
const SLOT_CACHE = {}
function getSlots (qIdx, rIdx, rings) {
  const key = `${qIdx}-${rIdx}-${rings[rIdx]}-${rings[rIdx + 1]}`
  if (!SLOT_CACHE[key]) SLOT_CACHE[key] = computeSlots(qIdx, rIdx, rings)
  return SLOT_CACHE[key]
}

// ── Status / type mapping helpers ────────────────────────────────────────────
function statusToRing (status) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'adopt') return 0
  if (s === 'trial') return 1
  if (s === 'assess') return 2
  if (s === 'hold') return 3
  if (s === 'retire') return 4
  return 3
}

function statusLabel (status) {
  const s = String(status || '').trim()
  return s || 'Unset'
}

function typeLabelOf (type) {
  return String(type || '').trim() || 'Other'
}

export default {
  name: 'TechRadar',
  props: {
    projectId: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const store = useWorkspaceStore()
    const hoveredBlip = ref(null)
    const radarLayoutRef = ref(null)
    const isDownloading = ref(false)
    const answerTypeFilter = ref('all')
    const searchQuery = ref('')
    const tooltipWidth = TOOLTIP_W
    const confirmDialog = ref(false)
    const blipToRemove = ref(null)
    const editDialog = ref(false)
    const blipToEdit = ref(null)
    const editForm = ref({ status: '', comment: '', categoryOverride: '' })
    const detailDialog = ref(false)
    const detailBlip = ref(null)
    const quadrantConfigDialog = ref(false)
    const RADAR_STATUS_OPTIONS = [
      { title: 'Adopt',  value: 'adopt' },
      { title: 'Trial',  value: 'trial' },
      { title: 'Assess', value: 'assess' },
      { title: 'Hold',   value: 'hold' },
      { title: 'Retire', value: 'retire' }
    ]
    const draggedCategory = ref(null)
    const visibleStatuses = ref(new Set(['adopt', 'trial', 'assess', 'hold', 'retire']))

    // ── Quadrant label overrides ─────────────────────────────────────────────
    // Local form state for editing in the config dialog (0-3 keyed by quadrant index)
    const quadrantLabelForm = ref({ 0: '', 1: '', 2: '', 3: '' })

    // Populate form when the dialog opens
    watch(quadrantConfigDialog, (open) => {
      if (open) {
        const overrides = store.getProjectRadarQuadrantLabels(props.projectId)
        quadrantLabelForm.value = {
          0: overrides[0] || '',
          1: overrides[1] || '',
          2: overrides[2] || '',
          3: overrides[3] || ''
        }
      }
    })

    // Open quadrant config dialog when menu action 'radar-settings' is dispatched
    watch(
      () => store.pendingMenuAction,
      (pending) => {
        if (!pending) return
        if (store.activeProjectId !== props.projectId) return
        const { action } = pending
        if (action === 'radar-settings') {
          quadrantConfigDialog.value = true
          store.clearMenuAction()
        }
      },
      { deep: true }
    )

    // ── Visible ring tracking ────────────────────────────────────────────────
    // List of visible ring indices (0-4 corresponding to RING_META)
    const visibleRingIndices = computed(() => {
      return [0, 1, 2, 3, 4].filter(i => {
        const statusName = RING_META[i].label.toLowerCase()
        return visibleStatuses.value.has(statusName)
      })
    })

    // Mapping from original ring index (0-4) to new array index in computedRings
    const ringIndexMapping = computed(() => {
      const mapping = {}
      visibleRingIndices.value.forEach((origIdx, newIdx) => {
        mapping[origIdx] = newIdx
      })
      return mapping
    })

    // ── Dynamic ring radii – capacity-based solver ───────────────────────────
    // Computes how many blip slots fit in one quadrant of a ring band.
    // Mirrors the slot-grid logic in computeSlots() so the numbers agree.
    function ringSlotCapacity (innerR, outerR) {
      const marginR = 7
      const rStep = 26
      const effInner = Math.max(innerR + marginR, BLIP_R + 2)
      const effOuter = outerR - marginR
      if (effOuter <= effInner) return 0
      const midR = (innerR + outerR) / 2
      const nR = Math.max(1, Math.round((effOuter - effInner) / rStep))
      let cap = 0
      for (let ri = 0; ri < nR; ri++) {
        const r = nR === 1
          ? midR
          : Math.max(effInner, Math.min(effOuter, midR + (ri - (nR - 1) / 2) * rStep))
        // Each quadrant spans π/2 radians, with marginA cut from both edges
        const arcLen = r * (Math.PI / 2 - 0.28)
        cap += Math.max(1, Math.round(arcLen / 30))
      }
      return cap
    }

    const computedRings = computed(() => {
      const blips = visibleBlips.value
      const visibleIndices = visibleRingIndices.value
      const numVisibleRings = visibleIndices.length

      // Replicate categoryToQuadrant assignment inline (avoids circular dep)
      const catToQ = new Map()
      const seenCats = []
      
      for (const b of blips) {
        if (b.categoryTitle && !catToQ.has(b.categoryTitle)) {
          seenCats.push(b.categoryTitle)
        }
      }
      seenCats.sort((a, b) => a.localeCompare(b))
      for (let i = 0; i < seenCats.length; i++) {
        catToQ.set(seenCats[i], Math.min(i, 3))
      }

      // Count blips per [ring][quadrant] - only for visible rings
      const perRQ = Array.from({ length: numVisibleRings }, () => new Array(4).fill(0))
      for (const b of blips) {
        const q = catToQ.get(b.categoryTitle) ?? 3
        const newRingIdx = ringIndexMapping.value[b.ring]
        if (newRingIdx !== undefined) {
          perRQ[newRingIdx][q]++
        }
      }
      // Worst-case quadrant load per ring
      const needed = perRQ.map(qCounts => Math.max(...qCounts, 0))

      const MIN_EMPTY = 22   // just enough to show the ring label
      const MIN_ACTIVE = 36  // minimum for at least one blip row

      // Starting widths - only for visible rings
      const widths = needed.map(n => n === 0 ? MIN_EMPTY : MIN_ACTIVE)

      // Iterative growth: if a ring's capacity is too small, grow it by 20 %
      // and repeat until every ring can hold its blips (max 40 iterations).
      for (let iter = 0; iter < 40; iter++) {
        const total = widths.reduce((s, w) => s + w, 0)
        const scale = OUTER_R / total
        const radii = [0]
        for (let i = 0; i < numVisibleRings; i++) radii.push(radii[i] + widths[i] * scale)

        let changed = false
        for (let ri = 0; ri < numVisibleRings; ri++) {
          if (needed[ri] === 0) continue
          const cap = ringSlotCapacity(radii[ri], radii[ri + 1])
          if (cap < needed[ri]) {
            widths[ri] = widths[ri] * (1 + (needed[ri] - cap) / needed[ri] * 0.5 + 0.1)
            changed = true
          }
        }
        if (!changed) break
      }

      // Normalise to exactly OUTER_R
      const total = widths.reduce((s, w) => s + w, 0)
      const radii = [0]
      for (let i = 0; i < numVisibleRings; i++) {
        radii.push(Math.round(radii[i] + (widths[i] / total) * OUTER_R))
      }
      radii[numVisibleRings] = OUTER_R
      return radii
    })

    // ── Radar geometry (reactive to dynamic ring sizes) ──────────────────────
    const ringsBg = computed(() => {
      const cr = computedRings.value
      const visibleIndices = visibleRingIndices.value
      
      // Create ring backgrounds only for visible rings, in reverse order (outer to inner)
      return visibleIndices.map((origIdx, newIdx) => {
        const ringRadius = cr[newIdx + 1]
        const meta = RING_META[origIdx]
        const fills = [
          'rgba(76,175,80,0.15)',   // adopt
          'rgba(33,150,243,0.10)',  // trial
          'rgba(255,152,0,0.10)',   // assess
          'rgba(158,158,158,0.10)', // hold
          'rgba(244,67,54,0.08)'    // retire
        ]
        return {
          r: ringRadius,
          fill: fills[origIdx],
          label: meta.label.toLowerCase()
        }
      }).reverse() // Paint from outside-in
    })

    const quadrantTints = Q_ANGLES.map((qa, qi) => ({
      path: arcPath(CX, CY, 0, OUTER_R, qa.a1, qa.a2),
      fill: qi === 0 ? '#2196f3' : qi === 1 ? '#4caf50' : qi === 2 ? '#ff9800' : '#9e9e9e'
    }))

    const ringLabels = computed(() => {
      const cr = computedRings.value
      const visibleIndices = visibleRingIndices.value
      
      return visibleIndices.map((origIdx, newIdx) => {
        const meta = RING_META[origIdx]
        return {
          x: CX,
          y: CY - (cr[newIdx] + cr[newIdx + 1]) / 2,
          text: meta.label,
          color: meta.color
        }
      })
    })

    // Visible ring radii for boundary circles
    const visibleRingRadii = computed(() => {
      const cr = computedRings.value
      return cr.slice(1) // All computed rings except the center point (0)
    })

    // Quadrant corner position templates (geometry only, label comes from data)
    const Q_LABEL_POSITIONS = [
      { x: CX + OUTER_R - 12, y: CY - OUTER_R + 18, anchor: 'end' },
      { x: CX - OUTER_R + 12, y: CY - OUTER_R + 18, anchor: 'start' },
      { x: CX - OUTER_R + 12, y: CY + OUTER_R - 10, anchor: 'start' },
      { x: CX + OUTER_R - 12, y: CY + OUTER_R - 10, anchor: 'end' }
    ]

    // ── Data collection ──────────────────────────────────────────────────────
    const project = computed(() =>
      (store.workspace.projects || []).find((p) => p.id === props.projectId) || null
    )

    // Lookup table: entryId -> { categoryTitle, entryTitle, candidates }
    // Only rebuilds when questionnaires change (not on every radar ref update)
    const entryLookup = computed(() => {
      if (!project.value) return new Map()
      const questionnaires = store.getProjectQuestionnaires(project.value)
      const lookup = new Map()
      
      for (const q of questionnaires) {
        const cats = q?.categories
        if (!Array.isArray(cats)) continue
        
        for (const cat of cats) {
          if (cat?.isMetadata) continue
          
          const catTitle = String(cat?.title || '').trim()
          const entries = cat?.entries
          if (!Array.isArray(entries)) continue
          
          for (const entry of entries) {
            const entryId = String(entry?.id || '').trim()
            if (!entryId) continue
            
            const entryTitle = String(entry?.aspect || entry?.title || entryId).trim()
            
            if (!lookup.has(entryId)) {
              lookup.set(entryId, { 
                categoryTitle: catTitle, 
                entryTitle, 
                candidates: [] 
              })
            }
            
            const entryData = lookup.get(entryId)
            const answers = entry?.answers
            if (!Array.isArray(answers)) continue
            
            for (const a of answers) {
              const tech = String(a?.technology || '').trim()
              if (!tech) continue
              
              entryData.candidates.push({ 
                tech, 
                answer: a, 
                questionnaireName: q.name || q.id, 
                questionnaireId: q.id 
              })
            }
          }
        }
      }
      
      return lookup
    })

    // All radar-referenced blips (unfiltered), includes categoryTitle
    const allBlips = computed(() => {
      if (!project.value) return []
      const refs = Array.isArray(project.value.radarRefs) ? project.value.radarRefs : []
      if (!refs.length) return []

      const lookup = entryLookup.value
      const result = []
      
      for (const ref of refs) {
        const norm = String(ref.option || '').trim().toLowerCase()
        const entryData = lookup.get(ref.entryId)
        const candidates = entryData?.candidates || []
        
        // Prefer the questionnaire that was active when the blip was added
        const preferredQId = String(ref.questionnaireId || '').trim()
        let match = null
        
        if (preferredQId) {
          for (const c of candidates) {
            if (c.tech.toLowerCase() === norm && c.questionnaireId === preferredQId) {
              match = c
              break
            }
          }
        }
        
        if (!match) {
          for (const c of candidates) {
            if (c.tech.toLowerCase() === norm) {
              match = c
              break
            }
          }
        }
        
        const answer = match?.answer
        const override = store.getRadarOverride(props.projectId, ref.entryId, ref.option)
        const effectiveStatus = (override?.status || '').trim() || String(answer?.status || '').trim()
        const effectiveCategory = (override?.categoryOverride || '').trim() || entryData?.categoryTitle || ''
        
        result.push({
          key: `${ref.entryId}||${ref.option}`,
          entryId: ref.entryId,
          option: String(ref.option || '').trim(),
          name: String(ref.option || '').trim(),
          status: effectiveStatus,
          answerType: String(answer?.answerType || '').trim(),
          comment: String(answer?.comments || '').trim(),
          radarComment: String(override?.comment || '').trim(),
          overrideStatus: String(override?.status || '').trim(),
          overrideCategoryTitle: String(override?.categoryOverride || '').trim(),
          naturalCategoryTitle: entryData?.categoryTitle || '',
          questionnaireName: match?.questionnaireName || '',
          categoryTitle: effectiveCategory,
          entryTitle: entryData?.entryTitle || '',
          ring: statusToRing(effectiveStatus)
        })
      }
      
      return result
    })

    // All unique categories that have at least one radar blip
    const availableCategories = computed(() => {
      const categories = new Set()
      for (const blip of allBlips.value) {
        if (blip.categoryTitle) categories.add(blip.categoryTitle)
      }
      return [...categories].sort((a, b) => a.localeCompare(b))
    })

    // All category titles across ALL questionnaires in the project – used for the move-category dropdown
    // Derives from entryLookup to avoid re-scanning questionnaires
    const availableCategoriesForEdit = computed(() => {
      const titles = new Set()
      for (const entryData of entryLookup.value.values()) {
        if (entryData.categoryTitle) titles.add(entryData.categoryTitle)
      }
      return [...titles].sort((a, b) => a.localeCompare(b))
    })

    // Selected categories (array of titles). Initialised / synced via watcher.
    const selectedCategories = ref([])
    watch(availableCategories, (newCats) => {
      const current = new Set(selectedCategories.value)
      // Add newly appearing categories as selected
      newCats.forEach((c) => { if (!current.has(c)) selectedCategories.value.push(c) })
      // Remove categories that no longer exist
      selectedCategories.value = selectedCategories.value.filter((c) => newCats.includes(c))
    }, { immediate: true })

    function toggleCategory (cat) {
      const idx = selectedCategories.value.indexOf(cat)
      if (idx === -1) {
        selectedCategories.value = [...selectedCategories.value, cat]
      } else if (selectedCategories.value.length > 1) {
        // keep at least one category selected
        selectedCategories.value = selectedCategories.value.filter((c) => c !== cat)
      }
    }

    // Map category titles to quadrant indices based on stored assignments
    const categoryToQuadrant = computed(() => {
      const map = new Map()
      const assignments = store.getProjectRadarCategoryQuadrants(props.projectId)
      const categories = availableCategories.value
      
      // Apply stored assignments only (no side-effects)
      for (const cat of categories) {
        const quadrant = assignments[cat]
        if (quadrant !== undefined && quadrant !== null) {
          map.set(cat, quadrant)
        }
      }
      
      return map
    })

    // Auto-assign unassigned categories on initialization
    watch(
      () => availableCategories.value,
      (categories) => {
        const assignments = store.getProjectRadarCategoryQuadrants(props.projectId)
        const unassigned = categories.filter(cat => {
          const quadrant = assignments[cat]
          return quadrant === undefined || quadrant === null
        })
        
        if (unassigned.length > 0) {
          // Count current assignments per quadrant
          const quadrantCounts = [0, 0, 0, 0]
          for (const cat of categories) {
            const q = assignments[cat]
            if (q !== undefined && q !== null) {
              quadrantCounts[q]++
            }
          }
          
          const newAssignments = { ...assignments }
          // Display order: Q1 (idx 1), Q2 (idx 0), Q3 (idx 2), Q4 (idx 3)
          const quadrantOrder = [1, 0, 2, 3]
          
          for (const cat of unassigned) {
            // Assign to the first free quadrant (no categories yet); fall back to Q4
            const freeQuadrant = quadrantOrder.find(q => quadrantCounts[q] === 0)
            const targetQuadrant = freeQuadrant !== undefined ? freeQuadrant : 3
            
            quadrantCounts[targetQuadrant]++
            newAssignments[cat] = targetQuadrant
          }
          
          // Save auto-assignments
          store.setProjectRadarCategoryQuadrants(props.projectId, newAssignments)
        }
      },
      { immediate: true }
    )

    // Categories not yet assigned to any quadrant
    const unassignedCategories = computed(() => {
      const mapping = categoryToQuadrant.value
      return availableCategories.value.filter(cat => !mapping.has(cat))
    })

    // Quadrant data with assigned categories
    // Q0 (index 0) = top-right = Quadrant 2
    // Q1 (index 1) = top-left = Quadrant 1
    // Q2 (index 2) = bottom-left = Quadrant 3
    // Q3 (index 3) = bottom-right = Quadrant 4
    // Display order: Q1, Q2, Q3, Q4
    const quadrants = computed(() => {
      const q = [
        { index: 1, label: 'Quadrant 1', color: 'blue-grey-lighten-2', categories: [] },
        { index: 0, label: 'Quadrant 2', color: 'blue-grey-lighten-2', categories: [] },
        { index: 2, label: 'Quadrant 3', color: 'blue-grey-lighten-2', categories: [] },
        { index: 3, label: 'Quadrant 4', color: 'blue-grey-lighten-2', categories: [] }
      ]
      
      const mapping = categoryToQuadrant.value
      for (const [cat, quadrantIdx] of mapping) {
        if (quadrantIdx >= 0 && quadrantIdx < 4) {
          // Find the quadrant object by its index property (not array index)
          const quadrant = q.find(quad => quad.index === quadrantIdx)
          if (quadrant) {
            quadrant.categories.push(cat)
          }
        }
      }
      
      // Sort categories within each quadrant alphabetically
      for (const quadrant of q) {
        quadrant.categories.sort((a, b) => a.localeCompare(b))
      }
      
      return q
    })

    // Effective label for each quadrant: custom override > auto-generated from categories
    const effectiveQuadrantLabels = computed(() => {
      const overrides = store.getProjectRadarQuadrantLabels(props.projectId)
      const result = {}
      for (let qi = 0; qi < 4; qi++) {
        const override = (overrides[qi] || '').trim()
        if (override) {
          result[qi] = override
        } else {
          const q = quadrants.value.find(quad => quad.index === qi)
          if (!q || q.categories.length === 0) {
            result[qi] = ''
          } else if (q.categories.length === 1) {
            result[qi] = q.categories[0]
          } else {
            result[qi] = `${q.categories[0]} (+${q.categories.length - 1})`
          }
        }
      }
      return result
    })

    // Auto-generated label (no override) — used as placeholder in the config form
    function autoQuadrantLabel (qIndex) {
      const q = quadrants.value.find(quad => quad.index === qIndex)
      if (!q || q.categories.length === 0) return `Quadrant ${qIndex + 1}`
      if (q.categories.length === 1) return q.categories[0]
      return `${q.categories[0]} (+${q.categories.length - 1})`
    }

    // Persist label change immediately (called on every input in the config dialog)
    function updateQuadrantLabel (qIndex, value) {
      const labels = store.getProjectRadarQuadrantLabels(props.projectId)
      if (value && value.trim()) {
        labels[qIndex] = value.trim()
      } else {
        delete labels[qIndex]
      }
      store.setProjectRadarQuadrantLabels(props.projectId, labels)
    }

    // Blips filtered by answerType, selected categories AND visible statuses
    const visibleBlips = computed(() => {
      let blips = answerTypeFilter.value === 'all'
        ? allBlips.value
        : allBlips.value.filter((b) => b.answerType === answerTypeFilter.value)
      
      // Filter by selected categories
      if (selectedCategories.value.length < availableCategories.value.length) {
        const sel = new Set(selectedCategories.value)
        blips = blips.filter((b) => sel.has(b.categoryTitle))
      }
      
      // Filter out categories not assigned to any quadrant
      const mapping = categoryToQuadrant.value
      blips = blips.filter((b) => mapping.has(b.categoryTitle))
      
      // Filter by visible statuses
      blips = blips.filter((b) => {
        const statusName = RING_META[b.ring]?.label.toLowerCase()
        return visibleStatuses.value.has(statusName)
      })
      return blips
    })

    // Dynamic quadrant corner labels: use effective label (custom override or auto from categories)
    const activeQuadrantLabels = computed(() => {
      const effLabels = effectiveQuadrantLabels.value
      return Q_LABEL_POSITIONS.map((pos, i) => ({ ...pos, text: effLabels[i] || '' }))
    })

    // ── Blip placement ───────────────────────────────────────────────────────
    const positionedBlips = computed(() => {
      const counter = {}
      const mapping = ringIndexMapping.value
      
      // Sort blips according to legend order: Q1 (top-left), Q0 (top-right), Q2 (bottom-left), Q3 (bottom-right)
      // Within each quadrant: sort by ring (status), then alphabetically by name
      const legendOrder = [1, 0, 2, 3] // Quadrant order in the legend
      const sortedBlips = [...visibleBlips.value].sort((a, b) => {
        const qA = categoryToQuadrant.value.get(a.categoryTitle) ?? 3
        const qB = categoryToQuadrant.value.get(b.categoryTitle) ?? 3
        const qOrderA = legendOrder.indexOf(qA)
        const qOrderB = legendOrder.indexOf(qB)
        
        if (qOrderA !== qOrderB) return qOrderA - qOrderB
        if (a.ring !== b.ring) return a.ring - b.ring
        return a.name.localeCompare(b.name)
      })
      
      return sortedBlips.map((blip, globalIdx) => {
        const quadrant = categoryToQuadrant.value.get(blip.categoryTitle) ?? 3
        const newRingIdx = mapping[blip.ring]
        
        // Skip blips whose ring is not visible (shouldn't happen due to filtering, but be safe)
        if (newRingIdx === undefined) return null
        
        const sectorKey = `${quadrant}-${newRingIdx}`
        counter[sectorKey] = (counter[sectorKey] ?? 0)
        const slotIdx = counter[sectorKey]++
        const cr = computedRings.value
        const slots = getSlots(quadrant, newRingIdx, cr)
        let pos
        if (slotIdx < slots.length) {
          pos = slots[slotIdx]
        } else {
          const { a1, a2 } = Q_ANGLES[quadrant]
          const midA = (a1 + a2) / 2
          const midR = (cr[newRingIdx] + cr[newRingIdx + 1]) / 2
          pos = {
            x: CX + midR * Math.cos(midA) + (slotIdx % 5 - 2) * 6,
            y: CY + midR * Math.sin(midA) + Math.floor(slotIdx / 5) * 6
          }
        }
        return {
          ...blip,
          quadrant,
          ...pos,
          index: globalIdx + 1,
          ringColor: RING_META[blip.ring].color,
          statusLabel: statusLabel(blip.status),
          typeLabel: typeLabelOf(blip.answerType)
        }
      }).filter(Boolean) // Remove any null entries
    })

    // ── Legend grouping by quadrant + status ───────────────────────────────
    const blipsByQuadrant = computed(() => {
      // Pre-bin blips by quadrant+ring to avoid repeated filtering
      const bins = Array.from({ length: 4 }, () => 
        Array.from({ length: 5 }, () => [])
      )
      
      for (const blip of positionedBlips.value) {
        bins[blip.quadrant][blip.ring].push(blip)
      }

      const groups = []
      for (let qi = 0; qi < 4; qi++) {
        const hasBlips = bins[qi].some(ringBlips => ringBlips.length > 0)
        if (!hasBlips) continue
        
        // Label: use effective label (override if set, otherwise auto from categories)
        const label = effectiveQuadrantLabels.value[qi] || ''
        
        const statusGroups = []
        for (let ri = 0; ri < 5; ri++) {
          const ringBlips = bins[qi][ri]
          if (ringBlips.length) {
            statusGroups.push({ 
              ring: ri, 
              statusLabel: RING_META[ri].label, 
              color: RING_META[ri].color, 
              blips: ringBlips 
            })
          }
        }
        groups.push({ quadrant: qi, label, statusGroups })
      }
      return groups
    })

    // Q1 (top-left) + Q2 (bottom-left) go to the left side
    const leftGroups = computed(() => {
      const groups = blipsByQuadrant.value.filter((g) => g.quadrant === 1 || g.quadrant === 2)
      // Sort to ensure Q1 (top-left) appears before Q2 (bottom-left)
      return groups.sort((a, b) => a.quadrant - b.quadrant)
    })
    // Q0 (top-right) + Q3 (bottom-right) go to the right side
    const rightGroups = computed(() => {
      const groups = blipsByQuadrant.value.filter((g) => g.quadrant === 0 || g.quadrant === 3)
      // Sort to ensure Q0 (top-right) appears before Q3 (bottom-right)
      return groups.sort((a, b) => a.quadrant - b.quadrant)
    })

    // ── Search highlight ──────────────────────────────────────────────────────
    // Returns a Set of matching blip keys, or null when no query is active
    const highlightedBlipKeys = computed(() => {
      const q = String(searchQuery.value || '').trim().toLowerCase()
      if (!q) return null
      return new Set(
        positionedBlips.value
          .filter((b) =>
            b.name.toLowerCase().includes(q) ||
            b.categoryTitle.toLowerCase().includes(q) ||
            b.questionnaireName.toLowerCase().includes(q) ||
            b.statusLabel.toLowerCase().includes(q)
          )
          .map((b) => b.key)
      )
    })

    // ── Tooltip helpers ───────────────────────────────────────────────────────
    function clampTooltipX (x) {
      return Math.min(Math.max(x, 4), SIZE - TOOLTIP_W - 4)
    }
    function clampTooltipY (y) {
      return Math.min(Math.max(y, 4), SIZE - 90)
    }
    function truncate (str, max) {
      return str.length > max ? str.slice(0, max - 1) + '…' : str
    }

    function confirmRemove (blip) {
      blipToRemove.value = blip
      confirmDialog.value = true
    }

    function executeRemove () {
      if (!blipToRemove.value) return
      store.toggleProjectRadarRef(props.projectId, blipToRemove.value.entryId, blipToRemove.value.option)
      confirmDialog.value = false
      blipToRemove.value = null
    }

    function openEdit (blip) {
      blipToEdit.value = blip
      editForm.value = {
        status: (blip.overrideStatus || blip.status || '').toLowerCase(),
        comment: blip.radarComment || '',
        categoryOverride: blip.overrideCategoryTitle || blip.naturalCategoryTitle || ''
      }
      editDialog.value = true
    }

    function saveEdit () {
      if (!blipToEdit.value) return
      // Don't store a category override when it matches the natural category
      const catOverride = (editForm.value.categoryOverride || '').trim()
      const naturalCat = (blipToEdit.value.naturalCategoryTitle || '').trim()
      store.setRadarOverride(props.projectId, blipToEdit.value.entryId, blipToEdit.value.option, {
        status: editForm.value.status,
        comment: editForm.value.comment,
        categoryOverride: catOverride === naturalCat ? '' : catOverride
      })
      editDialog.value = false
      blipToEdit.value = null
    }

    function openDetail (blip) {
      detailBlip.value = blip
      detailDialog.value = true
    }

    // Drag-and-drop handlers for category<->quadrant assignment
    function handleCategoryDragStart (event, category) {
      draggedCategory.value = category
      event.dataTransfer.effectAllowed = 'move'
      event.target.style.opacity = '0.5'
    }

    function handleCategoryDragEnd (event) {
      event.target.style.opacity = '1'
      draggedCategory.value = null
    }

    function handleQuadrantDragOver (event, quadrantIndex) {
      if (draggedCategory.value) {
        event.dataTransfer.dropEffect = 'move'
      }
    }

    function handleQuadrantDrop (event, quadrantIndex) {
      event.preventDefault()
      if (!draggedCategory.value) return
      
      const assignments = store.getProjectRadarCategoryQuadrants(props.projectId)
      assignments[draggedCategory.value] = quadrantIndex
      store.setProjectRadarCategoryQuadrants(props.projectId, assignments)
      
      draggedCategory.value = null
    }

    function handleTrashDragOver (event) {
      if (draggedCategory.value) {
        event.dataTransfer.dropEffect = 'move'
      }
    }

    function handleTrashDrop (event) {
      event.preventDefault()
      if (!draggedCategory.value) return
      
      const assignments = store.getProjectRadarCategoryQuadrants(props.projectId)
      delete assignments[draggedCategory.value]
      store.setProjectRadarCategoryQuadrants(props.projectId, assignments)
      
      // Also deselect the category
      selectedCategories.value = selectedCategories.value.filter(c => c !== draggedCategory.value)
      
      draggedCategory.value = null
    }

    function handleUnassignedDragOver (event) {
      if (draggedCategory.value) {
        event.dataTransfer.dropEffect = 'move'
      }
    }

    function handleUnassignedDrop (event) {
      event.preventDefault()
      if (!draggedCategory.value) return
      
      const assignments = store.getProjectRadarCategoryQuadrants(props.projectId)
      delete assignments[draggedCategory.value]
      store.setProjectRadarCategoryQuadrants(props.projectId, assignments)
      
      draggedCategory.value = null
    }

    // Toggle status visibility
    function toggleStatusVisibility (statusLabel) {
      const statusName = statusLabel.toLowerCase()
      const newSet = new Set(visibleStatuses.value)
      
      if (newSet.has(statusName)) {
        // Don't allow hiding all statuses - keep at least one visible
        if (newSet.size > 1) {
          newSet.delete(statusName)
        }
      } else {
        newSet.add(statusName)
      }
      
      visibleStatuses.value = newSet
    }

    function isStatusVisible (statusLabel) {
      return visibleStatuses.value.has(statusLabel.toLowerCase())
    }

    // Flatten a CSS rgba() colour against a white background so the exported
    // PNG looks correct regardless of dark/light mode.
    function flattenRgba (rgba) {
      const m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
      if (!m) return rgba
      const [r, g, b, a] = [+m[1], +m[2], +m[3], +m[4]]
      const blend = (c) => Math.round(c * a + 255 * (1 - a))
      return `rgb(${blend(r)},${blend(g)},${blend(b)})`
    }

    // Flatten an rgb/hex colour with a separate opacity attribute against white.
    function flattenOpacity (fill, opacity) {
      let r, g, b
      if (fill.startsWith('#') && fill.length === 7) {
        r = parseInt(fill.slice(1, 3), 16)
        g = parseInt(fill.slice(3, 5), 16)
        b = parseInt(fill.slice(5, 7), 16)
      } else {
        const m = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (!m) return fill
        ;[, r, g, b] = m.map(Number)
      }
      const blend = (c) => Math.round(c * opacity + 255 * (1 - opacity))
      return `rgb(${blend(r)},${blend(g)},${blend(b)})`
    }

    // -----------------------------------------------------------------------
    // ThoughtWorks Build-Your-Own-Radar JSON export
    // Format: https://www.thoughtworks.com/radar/byor
    // Fields: name, ring, quadrant, isNew, description
    // -----------------------------------------------------------------------
    function exportRadarJson () {
      const blips = allBlips.value
      const catToQ = categoryToQuadrant.value
      const effLabels = effectiveQuadrantLabels.value
      const data = blips.map((blip) => {
        const qIdx = catToQ.get(blip.categoryTitle)
        const quadrantLabel = (qIdx !== undefined && effLabels[qIdx])
          ? effLabels[qIdx]
          : (blip.categoryTitle || blip.questionnaireName || 'Other')
        return {
          name: blip.name,
          ring: RING_META[blip.ring]?.label ?? 'Hold',
          quadrant: quadrantLabel,
          isNew: 'FALSE',
          description: blip.radarComment || blip.comment || ''
        }
      })

      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `tech-radar-${project.value?.name || 'export'}.json`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }

    async function downloadRadar () {
      if (!radarLayoutRef.value || isDownloading.value) return
      isDownloading.value = true
      try {
        const el = radarLayoutRef.value

        // --- Temporarily patch SVG fills on the LIVE element ---
        // (scoped CSS only works on real DOM nodes; clones lose it)
        const restoreFills = []
        el.querySelectorAll('[fill]').forEach(node => {
          const fill = node.getAttribute('fill')
          if (fill && fill.startsWith('rgba')) {
            restoreFills.push({ node, attr: 'fill', original: fill })
            node.setAttribute('fill', flattenRgba(fill))
          }
        })
        const restoreOpacity = []
        el.querySelectorAll('path[opacity], circle[opacity], rect[opacity]').forEach(node => {
          const opacity = parseFloat(node.getAttribute('opacity') || '1')
          if (opacity >= 1) return
          const fill = node.getAttribute('fill') || ''
          if (fill && !fill.startsWith('url') && !fill.startsWith('var')) {
            restoreOpacity.push({
              node,
              origFill: fill,
              origOpacity: node.getAttribute('opacity')
            })
            node.setAttribute('fill', flattenOpacity(fill, opacity))
            node.removeAttribute('opacity')
          }
        })

        await new Promise(r => requestAnimationFrame(r))

        const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 })

        // --- Restore original attributes ---
        for (const { node, attr, original } of restoreFills)
          node.setAttribute(attr, original)
        for (const { node, origFill, origOpacity } of restoreOpacity) {
          node.setAttribute('fill', origFill)
          node.setAttribute('opacity', origOpacity)
        }

        const link = document.createElement('a')
        link.download = `tech-radar-${project.value?.name || 'export'}.png`
        link.href = dataUrl
        link.click()
      } finally {
        isDownloading.value = false
      }
    }

    // React to radar export menu actions
    watch(
      () => store.pendingMenuAction,
      (pending) => {
        if (!pending) return
        if (store.activeProjectId !== props.projectId) return
        const { action } = pending
        if (action === 'radar-export-json') {
          exportRadarJson()
          store.clearMenuAction()
        } else if (action === 'radar-export-png') {
          downloadRadar()
          store.clearMenuAction()
        }
      },
      { deep: true }
    )

    return {
      SIZE, CX, CY, OUTER_R, computedRings, BLIP_R, RING_META,
      tooltipWidth,
      answerTypeFilter,
      searchQuery,
      highlightedBlipKeys,
      visibleRingIndices,
      ringIndexMapping,
      ringsBg,
      visibleRingRadii,
      quadrantTints,
      ringLabels,
      activeQuadrantLabels,
      allBlips,
      availableCategories,
      availableCategoriesForEdit,
      selectedCategories,
      toggleCategory,
      unassignedCategories,
      quadrants,
      positionedBlips,
      blipsByQuadrant,
      leftGroups,
      rightGroups,
      hoveredBlip,
      clampTooltipX,
      clampTooltipY,
      truncate,
      confirmDialog,
      blipToRemove,
      confirmRemove,
      executeRemove,
      editDialog,
      blipToEdit,
      editForm,
      RADAR_STATUS_OPTIONS,
      openEdit,
      saveEdit,
      detailDialog,
      detailBlip,
      openDetail,
      quadrantConfigDialog,
      handleCategoryDragStart,
      handleCategoryDragEnd,
      handleQuadrantDragOver,
      handleQuadrantDrop,
      handleTrashDragOver,
      handleTrashDrop,
      handleUnassignedDragOver,
      handleUnassignedDrop,
      toggleStatusVisibility,
      isStatusVisible,
      radarLayoutRef,
      isDownloading,
      downloadRadar,
      exportRadarJson,
      quadrantLabelForm,
      effectiveQuadrantLabels,
      autoQuadrantLabel,
      updateQuadrantLabel
    }
  }
}
</script>

<style scoped>
.tech-radar {
  padding: 12px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.radar-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.radar-center {
  min-width: 0;
}

.radar-svg-wrapper {
  width: 100%;
  overflow: visible;
}

.radar-svg {
  /*
   * Height-constrained: width is capped so the square SVG never exceeds the
   * available viewport height once outer chrome is subtracted.
   * 330px = outer app-bar + workspace tabs + project card header/tabs + padding estimated offsets.
   */
  width: min(calc(100dvh - 330px), 100%);
  height: auto;
  max-width: 100%;
  display: block;
  margin: 0 auto;
}

@media (max-width: 960px) {
  .tech-radar {
    height: auto;
    overflow: visible;
  }
  .radar-layout {
    grid-template-columns: 1fr;
  }
  .radar-radar-legend {
    columns: 2;
  }
}

/* CSS custom properties – inherit Vuetify surface colors */
.tech-radar {
  --radar-bg: rgba(var(--v-theme-surface), 1);
  --radar-line: rgba(var(--v-theme-on-surface), 0.12);
  --radar-text-dim: rgba(var(--v-theme-on-surface), 0.45);
  --radar-tooltip-bg: rgb(var(--v-theme-surface));
  --radar-tooltip-text: rgba(var(--v-theme-on-surface), 0.87);
  --radar-tooltip-text-dim: rgba(var(--v-theme-on-surface), 0.55);
}

.ring-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quadrant-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.blip-circle {
  cursor: pointer;
  transition: r 0.1s;
}
.blip-circle:hover {
  opacity: 0.85;
}

.blip-label {
  fill: white;
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
  user-select: none;
}

.tooltip-title {
  font-size: 12px;
  font-weight: 600;
}
.tooltip-sub {
  font-size: 10px;
}

/* Legend */
.radar-legend {
  min-width: 0;
  overflow-x: hidden;
  columns: 1;
  column-gap: 12px;
}

@media (min-width: 1400px) {
  .radar-legend {
    columns: 2;
  }
}

.ring-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ring-key-item {
  transition: opacity 0.2s;
  padding: 4px 8px;
  border-radius: 4px;
}

.ring-key-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.ring-key-item--inactive {
  opacity: 0.3;
}

.ring-key-item--inactive:hover {
  opacity: 0.5;
}

.legend-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: default;
  transition: background 0.12s;
  margin-bottom: 2px;
  break-inside: avoid;
}
.legend-row--hovered {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.legend-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: white;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.legend-info {
  flex: 1;
  min-width: 0;
}

.legend-name {
  line-height: 1.3;
  word-break: break-word;
}

.legend-rings {
  padding: 8px 0;
}

.legend-quadrant-header {
  column-span: all;
  break-inside: avoid;
  color: rgba(var(--v-theme-on-surface), 0.55);
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  margin-bottom: 4px;
}

.legend-status-header {
  break-inside: avoid;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--status-color);
  padding: 4px 6px 2px;
  margin-top: 2px;
}

.legend-row--highlighted {
  background: rgba(var(--v-theme-primary), 0.12);
  outline: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 6px;
}
.legend-row--dimmed {
  opacity: 0.25;
}

.legend-row-actions {
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.12s;
}
.legend-row:hover .legend-row-actions {
  opacity: 1;
}

.blip-glow {
  pointer-events: none;
}

/* Detail dialog */
.detail-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: white;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

.detail-field {
  min-width: 0;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-bottom: 3px;
}

.hidden-count-chip {
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.15s;
}
.hidden-count-chip:hover {
  opacity: 1;
}

.legend-quadrant-header--editable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-quadrant-edit-icon {
  opacity: 0;
  transition: opacity 0.15s;
}
.legend-quadrant-header--editable:hover .legend-quadrant-edit-icon {
  opacity: 0.6;
}

/* Quadrant chips */
.quadrant-chip {
  padding: 6px 12px !important;
  height: auto !important;
  min-height: 32px;
}

.category-badge {
  margin: 2px;
  opacity: 0.9;
}

.category-badge:hover {
  opacity: 1;
}

/* Category trash zone */
.category-trash-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px dashed transparent;
  opacity: 0;
  transition: all 0.2s;
  cursor: pointer;
}

.category-trash-zone--active {
  opacity: 0.5;
  border-color: rgba(var(--v-theme-error), 0.5);
}

.category-trash-zone--active:hover {
  opacity: 1;
  background: rgba(var(--v-theme-error), 0.1);
  border-color: rgb(var(--v-theme-error));
}
</style>
