<template>
  <div class="tech-radar">
    <!-- Empty state -->
    <v-alert v-if="!blips.length" type="info" variant="tonal" density="compact" class="ma-4">
      No radar references yet. In the <strong>Matrix</strong> or <strong>All Suggestions</strong> tab, click
      <v-icon size="14" class="mx-1">mdi-radar</v-icon>
      next to any entry to add it to the Tech Radar.
    </v-alert>

    <div v-else class="radar-layout">
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
          <circle v-for="r in RINGS.slice(1)" :key="`rc-${r}`"
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
          <text v-for="(ql, qi) in quadrantLabels" :key="`ql-${qi}`"
            :x="ql.x" :y="ql.y"
            :text-anchor="ql.anchor"
            class="quadrant-label"
            fill="var(--radar-text-dim)"
          >{{ ql.text }}</text>

          <!-- Blip circles -->
          <g v-for="blip in positionedBlips" :key="blip.key">
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
              height="52"
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
            >{{ truncate(hoveredBlip.name, 30) }}</text>
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
            >{{ truncate(hoveredBlip.questionnaireName, 32) }}</text>
          </g>
        </svg>
      </div>

      <!-- Legend -->
      <div class="radar-legend">
        <div class="legend-rings mb-4">
          <div v-for="ring in RING_META" :key="ring.label" class="d-flex align-center mb-1" style="gap:8px;">
            <span class="ring-dot" :style="{ background: ring.color }" />
            <span class="text-body-2">{{ ring.label }}</span>
          </div>
        </div>

        <v-divider class="mb-3" />

        <div v-if="!positionedBlips.length" class="text-caption text-medium-emphasis">No blips.</div>
        <div
          v-for="blip in positionedBlips"
          :key="blip.key"
          class="legend-row"
          :class="{ 'legend-row--hovered': hoveredBlip?.key === blip.key }"
          @mouseenter="hoveredBlip = blip"
          @mouseleave="hoveredBlip = null"
        >
          <span class="legend-index" :style="{ background: blip.ringColor }">{{ blip.index }}</span>
          <div class="legend-info">
            <div class="text-body-2 font-weight-medium legend-name">{{ blip.name }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ blip.statusLabel }}
              <span v-if="blip.typeLabel"> · {{ blip.typeLabel }}</span>
              <span v-if="blip.questionnaireName"> · {{ blip.questionnaireName }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'

// ── Radar geometry constants ─────────────────────────────────────────────────
const SIZE = 560
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 30  // 250

// Ring outer radii (innermost to outermost): adopt / trial / assess / hold
const RINGS = [0, 62, 124, 192, OUTER_R]

const BLIP_R = 12
const TOOLTIP_W = 200

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
  { label: 'Hold', color: '#9e9e9e' }
]

const QUADRANT_META = [
  { label: 'Tools', anchor: 'start' },
  { label: 'Practices', anchor: 'end' },
  { label: 'Other', anchor: 'end' },
  { label: '—', anchor: 'start' }
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
function computeSlots (qIdx, rIdx) {
  const { a1, a2 } = Q_ANGLES[qIdx]
  const innerR = RINGS[rIdx]
  const outerR = RINGS[rIdx + 1]
  const marginA = 0.14   // ~8°
  const marginR = 7
  const effA1 = a1 + marginA
  const effA2 = a2 - marginA
  const effInner = Math.max(innerR + marginR, BLIP_R + 2)
  const effOuter = outerR - marginR

  const positions = []
  const rStep = 26
  const nR = Math.max(1, Math.round((effOuter - effInner) / rStep))

  for (let ri = 0; ri < nR; ri++) {
    const r = nR === 1
      ? (effInner + effOuter) / 2
      : effInner + (ri / (nR - 1)) * (effOuter - effInner)
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

// Pre-generate all slot grids
const SLOT_CACHE = {}
function getSlots (qIdx, rIdx) {
  const key = `${qIdx}-${rIdx}`
  if (!SLOT_CACHE[key]) SLOT_CACHE[key] = computeSlots(qIdx, rIdx)
  return SLOT_CACHE[key]
}

// ── Status / type mapping helpers ────────────────────────────────────────────
function statusToRing (status) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'adopt') return 0
  if (s === 'trial') return 1
  if (s === 'assess') return 2
  return 3
}

function typeToQuadrant (type) {
  const t = String(type || '').trim()
  if (t === 'Tool') return 0
  if (t === 'Practice') return 1
  return 2
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
    const tooltipWidth = TOOLTIP_W

    // ── Radar geometry (used in template) ──────────────────────────────────
    const ringsBg = [
      { r: RINGS[4], fill: 'rgba(158,158,158,0.10)' },  // Hold – outermost
      { r: RINGS[3], fill: 'rgba(255,152,0,0.10)' },    // Assess
      { r: RINGS[2], fill: 'rgba(33,150,243,0.10)' },   // Trial
      { r: RINGS[1], fill: 'rgba(76,175,80,0.15)' }     // Adopt – innermost
    ]

    const quadrantTints = Q_ANGLES.map((qa, qi) => ({
      path: arcPath(CX, CY, 0, RINGS[4], qa.a1, qa.a2),
      fill: qi === 0 ? '#2196f3' : qi === 1 ? '#4caf50' : qi === 2 ? '#ff9800' : '#9e9e9e'
    }))

    const ringLabels = RINGS.slice(1).map((r, i) => ({
      x: CX,
      y: CY - (RINGS[i] + r) / 2,
      text: RING_META[i].label,
      color: RING_META[i].color
    }))

    const quadrantLabels = [
      { x: CX + OUTER_R - 12, y: CY - OUTER_R + 18, anchor: 'end', text: 'Tools' },
      { x: CX - OUTER_R + 12, y: CY - OUTER_R + 18, anchor: 'start', text: 'Practices' },
      { x: CX - OUTER_R + 12, y: CY + OUTER_R - 10, anchor: 'start', text: 'Other' },
      { x: CX + OUTER_R - 12, y: CY + OUTER_R - 10, anchor: 'end', text: '' }
    ]

    // ── Data collection ──────────────────────────────────────────────────────
    const project = computed(() =>
      (store.workspace.projects || []).find((p) => p.id === props.projectId) || null
    )

    const blips = computed(() => {
      if (!project.value) return []
      const refs = Array.isArray(project.value.radarRefs) ? project.value.radarRefs : []
      if (!refs.length) return []

      const questionnaires = store.getProjectQuestionnaires(project.value)

      // Build a lookup: entryId -> array of {answer, questionnaireName}
      const answerLookup = new Map()
      questionnaires.forEach((q) => {
        const cats = Array.isArray(q?.categories) ? q.categories : []
        cats.filter((c) => !c?.isMetadata).forEach((cat) => {
          const entries = Array.isArray(cat?.entries) ? cat.entries : []
          entries.forEach((entry) => {
            const entryId = String(entry?.id || '').trim()
            if (!entryId) return
            if (!answerLookup.has(entryId)) answerLookup.set(entryId, [])
            const answers = Array.isArray(entry?.answers) ? entry.answers : []
            answers.forEach((a) => {
              const tech = String(a?.technology || '').trim()
              if (tech) answerLookup.get(entryId).push({ tech, answer: a, questionnaireName: q.name || q.id })
            })
          })
        })
      })

      return refs.map((ref) => {
        const norm = String(ref.option || '').trim().toLowerCase()
        const candidates = answerLookup.get(ref.entryId) || []
        const match = candidates.find((c) => c.tech.toLowerCase() === norm)
        const answer = match?.answer
        return {
          key: `${ref.entryId}||${ref.option}`,
          name: String(ref.option || '').trim(),
          status: String(answer?.status || '').trim(),
          answerType: String(answer?.answerType || '').trim(),
          comment: String(answer?.comments || '').trim(),
          questionnaireName: match?.questionnaireName || '',
          ring: statusToRing(answer?.status),
          quadrant: typeToQuadrant(answer?.answerType)
        }
      })
    })

    // ── Blip placement ───────────────────────────────────────────────────────
    const positionedBlips = computed(() => {
      const counter = {} // sector usage counter
      return blips.value.map((blip, globalIdx) => {
        const sectorKey = `${blip.quadrant}-${blip.ring}`
        counter[sectorKey] = (counter[sectorKey] ?? 0)
        const slotIdx = counter[sectorKey]++
        const slots = getSlots(blip.quadrant, blip.ring)
        let pos
        if (slotIdx < slots.length) {
          pos = slots[slotIdx]
        } else {
          // Overflow: scatter around center of sector
          const { a1, a2 } = Q_ANGLES[blip.quadrant]
          const midA = (a1 + a2) / 2
          const midR = (RINGS[blip.ring] + RINGS[blip.ring + 1]) / 2
          pos = {
            x: CX + midR * Math.cos(midA) + (slotIdx % 5 - 2) * 6,
            y: CY + midR * Math.sin(midA) + Math.floor(slotIdx / 5) * 6
          }
        }
        return {
          ...blip,
          ...pos,
          index: globalIdx + 1,
          ringColor: RING_META[blip.ring].color,
          statusLabel: statusLabel(blip.status),
          typeLabel: typeLabelOf(blip.answerType)
        }
      })
    })

    // ── Tooltip helpers ───────────────────────────────────────────────────────
    function clampTooltipX (x) {
      return Math.min(Math.max(x, 4), SIZE - TOOLTIP_W - 4)
    }
    function clampTooltipY (y) {
      return Math.min(Math.max(y, 4), SIZE - 60)
    }
    function truncate (str, max) {
      return str.length > max ? str.slice(0, max - 1) + '…' : str
    }

    return {
      SIZE, CX, CY, OUTER_R, RINGS, BLIP_R, RING_META, QUADRANT_META,
      tooltipWidth,
      ringsBg,
      quadrantTints,
      ringLabels,
      quadrantLabels,
      blips,
      positionedBlips,
      hoveredBlip,
      clampTooltipX,
      clampTooltipY,
      truncate
    }
  }
}
</script>

<style scoped>
.tech-radar {
  padding: 12px;
}

.radar-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.radar-svg-wrapper {
  flex: 1 1 auto;
  min-width: 240px;
  max-width: 560px;
  overflow: visible;
}

.radar-svg {
  width: 100%;
  height: auto;
  display: block;
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
  flex: 1;
  min-width: 200px;
  max-width: 320px;
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
</style>
