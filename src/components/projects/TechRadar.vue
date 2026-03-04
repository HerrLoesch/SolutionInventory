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
      <div class="d-flex align-center flex-wrap mb-3" style="gap:8px;">
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
        <div v-if="availableCategories.length > 1" class="d-flex align-center flex-wrap ml-auto" style="gap:4px;">         
          <v-chip
            v-for="cat in availableCategories"
            :key="cat"
            size="small"
            density="compact"
            :variant="selectedCategories.includes(cat) ? 'tonal' : 'outlined'"
            :color="selectedCategories.includes(cat) ? 'primary' : undefined"
            style="cursor:pointer;"
            @click="toggleCategory(cat)"
          >{{ cat }}</v-chip>
        </div>
        <v-tooltip text="Export as ThoughtWorks JSON" location="top">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              size="small"
              variant="text"
              icon="mdi-code-json"
              :class="availableCategories.length > 1 ? '' : 'ml-auto'"
              @click="exportRadarJson"
            />
          </template>
        </v-tooltip>
        <v-tooltip text="Download as PNG" location="top">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              :loading="isDownloading"
              size="small"
              variant="text"
              icon="mdi-download"
              @click="downloadRadar"
            />
          </template>
        </v-tooltip>
      </div>

      <div ref="radarLayoutRef" class="radar-layout">
      <!-- Left legend: Q1 (top-left) + Q2 (bottom-left) -->
      <div class="radar-legend">
        <div v-for="group in leftGroups" :key="group.quadrant" class="mb-4">
          <div class="legend-quadrant-header text-caption font-weight-bold text-uppercase mb-1">
            {{ group.label || `Quadrant ${group.quadrant + 1}` }}
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
          <circle v-for="r in computedRings.slice(1)" :key="`rc-${r}`"
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
              :height="hoveredBlip.radarComment ? 90 : 74"
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
            >{{ hoveredBlip.statusLabel }} · {{ hoveredBlip.typeLabel }}</text>
            <text
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 46"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text-dim)"
            >{{ truncate(hoveredBlip.categoryTitle || hoveredBlip.questionnaireName, 32) }}</text>
            <text
              v-if="hoveredBlip.entryTitle"
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 60"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text-dim)"
            >{{ truncate(hoveredBlip.entryTitle, 32) }}</text>
            <text
              v-if="hoveredBlip.radarComment"
              :x="clampTooltipX(hoveredBlip.x + 10) + 8"
              :y="clampTooltipY(hoveredBlip.y - 14) + 76"
              class="tooltip-sub"
              fill="var(--radar-tooltip-text)"
              font-style="italic"
            >{{ truncate(hoveredBlip.radarComment, 32) }}</text>
          </g>
        </svg>
      </div>

      <!-- Ring key -->
      <div class="ring-key d-flex flex-wrap justify-center mt-2" style="gap:16px;">
        <div v-for="ring in RING_META" :key="ring.label" class="d-flex align-center" style="gap:6px;">
          <span class="ring-dot" :style="{ background: ring.color }" />
          <span class="text-caption">{{ ring.label }}</span>
        </div>
      </div>
      <div v-if="!positionedBlips.length" class="text-caption text-medium-emphasis text-center mt-2 px-4">
        <span v-if="answerTypeFilter === 'all'">No blips added yet.</span>
        <span v-else>No blips with type "{{ answerTypeFilter }}". Set the <strong>Type</strong> field on answers to classify them.</span>
      </div>
      </div>

      <!-- Right legend: Q0 (top-right) + Q3 (bottom-right) -->
      <div class="radar-legend">
        <div v-for="group in rightGroups" :key="group.quadrant" class="mb-4">
          <div class="legend-quadrant-header text-caption font-weight-bold text-uppercase mb-1">
            {{ group.label || `Quadrant ${group.quadrant + 1}` }}
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
  { label: 'Adopt', color: '#4caf50' },
  { label: 'Trial', color: '#2196f3' },
  { label: 'Assess', color: '#ff9800' },
  { label: 'Hold', color: '#9e9e9e' },
  { label: 'Retire', color: '#f44336' }
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
    const RADAR_STATUS_OPTIONS = [
      { title: 'Adopt',  value: 'adopt' },
      { title: 'Trial',  value: 'trial' },
      { title: 'Assess', value: 'assess' },
      { title: 'Hold',   value: 'hold' },
      { title: 'Retire', value: 'retire' }
    ]

    // ── Dynamic ring radii – stepped width based on blip count ──────────────
    // Steps: enough for label | enough for a few blips | medium | large | very large
    // Units are relative weights that get scaled to fill OUTER_R.
    function ringWeight (count) {
      if (count === 0)  return 1      // label-only band
      if (count <= 3)   return 2.5    // just a bit bigger than a blip
      if (count <= 8)   return 4      // medium band
      if (count <= 15)  return 6      // large
      return 8                        // very large
    }

    const ringBlipCounts = computed(() => {
      const counts = new Array(5).fill(0)
      visibleBlips.value.forEach(b => { counts[b.ring]++ })
      return counts
    })
    const computedRings = computed(() => {
      const counts = ringBlipCounts.value
      const weights = counts.map(ringWeight)
      const totalWeight = weights.reduce((s, w) => s + w, 0)
      const radii = [0]
      for (let i = 0; i < 5; i++) {
        radii.push(Math.round(radii[i] + (weights[i] / totalWeight) * OUTER_R))
      }
      // Clamp last boundary to avoid rounding drift
      radii[5] = OUTER_R
      return radii
    })

    // ── Radar geometry (reactive to dynamic ring sizes) ──────────────────────
    const ringsBg = computed(() => {
      const cr = computedRings.value
      return [
        { r: cr[5], fill: 'rgba(244,67,54,0.08)' },
        { r: cr[4], fill: 'rgba(158,158,158,0.10)' },
        { r: cr[3], fill: 'rgba(255,152,0,0.10)' },
        { r: cr[2], fill: 'rgba(33,150,243,0.10)' },
        { r: cr[1], fill: 'rgba(76,175,80,0.15)' }
      ]
    })

    const quadrantTints = Q_ANGLES.map((qa, qi) => ({
      path: arcPath(CX, CY, 0, OUTER_R, qa.a1, qa.a2),
      fill: qi === 0 ? '#2196f3' : qi === 1 ? '#4caf50' : qi === 2 ? '#ff9800' : '#9e9e9e'
    }))

    const ringLabels = computed(() => {
      const cr = computedRings.value
      return cr.slice(1).map((r, i) => ({
        x: CX,
        y: CY - (cr[i] + r) / 2,
        text: RING_META[i].label,
        color: RING_META[i].color
      }))
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

    // All radar-referenced blips (unfiltered), includes categoryTitle
    const allBlips = computed(() => {
      if (!project.value) return []
      const refs = Array.isArray(project.value.radarRefs) ? project.value.radarRefs : []
      if (!refs.length) return []

      const questionnaires = store.getProjectQuestionnaires(project.value)

      // Build lookup: entryId -> { categoryTitle, entryTitle, candidates: [{tech, answer, questionnaireName}] }
      const entryLookup = new Map()
      questionnaires.forEach((q) => {
        const cats = Array.isArray(q?.categories) ? q.categories : []
        cats.filter((c) => !c?.isMetadata).forEach((cat) => {
          const catTitle = String(cat?.title || '').trim()
          const entries = Array.isArray(cat?.entries) ? cat.entries : []
          entries.forEach((entry) => {
            const entryId = String(entry?.id || '').trim()
            if (!entryId) return
            const entryTitle = String(entry?.aspect || entry?.title || entryId).trim()
            if (!entryLookup.has(entryId)) entryLookup.set(entryId, { categoryTitle: catTitle, entryTitle, candidates: [] })
            const answers = Array.isArray(entry?.answers) ? entry.answers : []
            answers.forEach((a) => {
              const tech = String(a?.technology || '').trim()
              if (tech) entryLookup.get(entryId).candidates.push({ tech, answer: a, questionnaireName: q.name || q.id })
            })
          })
        })
      })

      return refs.map((ref) => {
        const norm = String(ref.option || '').trim().toLowerCase()
        const entryData = entryLookup.get(ref.entryId)
        const candidates = entryData?.candidates || []
        const match = candidates.find((c) => c.tech.toLowerCase() === norm)
        const answer = match?.answer
        const override = store.getRadarOverride(props.projectId, ref.entryId, ref.option)
        const effectiveStatus = (override?.status || '').trim() || String(answer?.status || '').trim()
        const effectiveCategory = (override?.categoryOverride || '').trim() || entryData?.categoryTitle || ''
        return {
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
        }
      })
    })

    // All unique categories that have at least one radar blip (alphabetically sorted)
    const availableCategories = computed(() => {
      return [...new Set(allBlips.value.map((b) => b.categoryTitle).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
    })

    // All category titles across ALL questionnaires in the project – used for the move-category dropdown
    const availableCategoriesForEdit = computed(() => {
      const questionnaires = store.getProjectQuestionnaires(project.value || {})
      const titles = new Set()
      questionnaires.forEach((q) => {
        const cats = Array.isArray(q?.categories) ? q.categories : []
        cats.filter((c) => !c?.isMetadata).forEach((c) => {
          const t = String(c?.title || '').trim()
          if (t) titles.add(t)
        })
      })
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

    // Blips filtered by answerType AND selected categories
    const visibleBlips = computed(() => {
      let blips = answerTypeFilter.value === 'all'
        ? allBlips.value
        : allBlips.value.filter((b) => b.answerType === answerTypeFilter.value)
      if (selectedCategories.value.length < availableCategories.value.length) {
        const sel = new Set(selectedCategories.value)
        blips = blips.filter((b) => sel.has(b.categoryTitle))
      }
      return blips
    })

    // Map category titles to quadrant indices (up to 4, sorted alphabetically)
    const categoryToQuadrant = computed(() => {
      const cats = [...new Set(visibleBlips.value.map((b) => b.categoryTitle).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
      const map = new Map()
      cats.forEach((cat, i) => map.set(cat, Math.min(i, 3)))
      // If more than 4, overflow into last slot
      if (cats.length > 4) {
        cats.slice(4).forEach((cat) => map.set(cat, 3))
      }
      return map
    })

    // Dynamic quadrant corner labels from category titles
    const activeQuadrantLabels = computed(() => {
      const labels = ['', '', '', '']
      categoryToQuadrant.value.forEach((qIdx, cat) => {
        if (!labels[qIdx]) labels[qIdx] = cat
        else if (labels[qIdx] !== cat) labels[qIdx] += ' …' // overflow indicator
      })
      return Q_LABEL_POSITIONS.map((pos, i) => ({ ...pos, text: labels[i] }))
    })

    // ── Blip placement ───────────────────────────────────────────────────────
    const positionedBlips = computed(() => {
      const counter = {}
      return visibleBlips.value.map((blip, globalIdx) => {
        const quadrant = categoryToQuadrant.value.get(blip.categoryTitle) ?? 3
        const sectorKey = `${quadrant}-${blip.ring}`
        counter[sectorKey] = (counter[sectorKey] ?? 0)
        const slotIdx = counter[sectorKey]++
        const cr = computedRings.value
        const slots = getSlots(quadrant, blip.ring, cr)
        let pos
        if (slotIdx < slots.length) {
          pos = slots[slotIdx]
        } else {
          const { a1, a2 } = Q_ANGLES[quadrant]
          const midA = (a1 + a2) / 2
          const midR = (cr[blip.ring] + cr[blip.ring + 1]) / 2
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
      })
    })

    // ── Legend grouping by quadrant + status ───────────────────────────────
    const blipsByQuadrant = computed(() => {
      const groups = []
      for (let qi = 0; qi < 4; qi++) {
        const label = activeQuadrantLabels.value[qi]?.text || ''
        const allQBlips = positionedBlips.value.filter((b) => b.quadrant === qi)
        if (!allQBlips.length) continue
        const statusGroups = []
        for (let ri = 0; ri < 5; ri++) {
          const ringBlips = allQBlips.filter((b) => b.ring === ri)
          if (ringBlips.length) {
            statusGroups.push({ ring: ri, statusLabel: RING_META[ri].label, color: RING_META[ri].color, blips: ringBlips })
          }
        }
        groups.push({ quadrant: qi, label, statusGroups })
      }
      return groups
    })

    // Q1 (top-left) + Q2 (bottom-left) go to the left side
    const leftGroups = computed(() => blipsByQuadrant.value.filter((g) => g.quadrant === 1 || g.quadrant === 2))
    // Q0 (top-right) + Q3 (bottom-right) go to the right side
    const rightGroups = computed(() => blipsByQuadrant.value.filter((g) => g.quadrant === 0 || g.quadrant === 3))

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
      const data = blips.map((blip) => ({
        name: blip.name,
        ring: RING_META[blip.ring]?.label ?? 'Hold',
        quadrant: blip.categoryTitle || blip.questionnaireName || 'Other',
        isNew: 'FALSE',
        description: blip.radarComment || blip.comment || ''
      }))

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

    return {
      SIZE, CX, CY, OUTER_R, computedRings, BLIP_R, RING_META,
      tooltipWidth,
      answerTypeFilter,
      searchQuery,
      highlightedBlipKeys,
      ringsBg,
      quadrantTints,
      ringLabels,
      activeQuadrantLabels,
      allBlips,
      availableCategories,
      availableCategoriesForEdit,
      selectedCategories,
      toggleCategory,
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
      radarLayoutRef,
      isDownloading,
      downloadRadar,
      exportRadarJson
    }
  }
}
</script>

<style scoped>
.tech-radar {
  padding: 12px;
  /* Fill available tab height without scrolling the page */
  height: calc(100dvh - 220px);
  min-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.radar-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  align-items: start;
  flex: 1;
  min-height: 0;
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
  overflow-y: auto;
  max-height: calc(100dvh - 220px);
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
</style>
