<template>
  <v-dialog v-model="dialogOpen" max-width="1200">
    <v-card style="height:88vh;display:flex;flex-direction:column;overflow:hidden;">
      <v-card-title class="text-body-1 font-weight-bold pt-4 px-4 flex-shrink-0">
        <v-icon start size="18">mdi-tune</v-icon>
        Custom HTML Export
      </v-card-title>
      <v-divider />
      <div style="display:flex;flex:1;overflow:hidden;">

        <!-- ── Settings panel ─────────────────────────────────────────── -->
        <div style="width:280px;flex-shrink:0;overflow-y:auto;padding:16px;border-right:1px solid rgba(0,0,0,.12);display:flex;flex-direction:column;gap:6px;">

          <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Layout</div>
          <v-switch
            v-model="options.showGroupToggle"
            color="primary"
            density="compact"
            hide-details
            label="Show group toggle"
          />
          <template v-if="options.showGroupToggle">
            <div class="text-caption text-medium-emphasis" style="margin-top:2px;">Default view</div>
            <v-btn-toggle
              v-model="options.defaultGrouping"
              mandatory
              density="compact"
              color="primary"
              style="width:100%"
            >
              <v-btn value="status" size="small" style="flex:1;font-size:11px;">By Status</v-btn>
              <v-btn value="category" size="small" style="flex:1;font-size:11px;">By Category</v-btn>
            </v-btn-toggle>
          </template>
          <v-switch
            v-model="options.showSearch"
            color="primary"
            density="compact"
            hide-details
            label="Show search"
          />
          <v-select
            v-model="options.gridColumns"
            label="Grid columns"
            density="compact"
            variant="outlined"
            hide-details
            class="mt-1"
            :items="[
              {title:'1 column',value:1},{title:'2 columns',value:2},{title:'3 columns',value:3},
              {title:'4 columns',value:4},{title:'5 columns',value:5},{title:'6 columns',value:6}
            ]"
            item-title="title"
            item-value="value"
          />

          <v-divider class="my-1" />

          <div class="d-flex align-center" style="gap:4px;">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis flex-grow-1">Status</div>
            <v-btn size="x-small" variant="text" @click="options.includedStatuses = RING_META.map(r => r.label.toLowerCase())">All</v-btn>
            <v-btn size="x-small" variant="text" @click="options.includedStatuses = []">None</v-btn>
          </div>
          <div
            v-for="ring in RING_META"
            :key="ring.label"
            style="display:flex;align-items:center;gap:4px;"
          >
            <v-checkbox
              v-model="options.includedStatuses"
              :value="ring.label.toLowerCase()"
              density="compact"
              hide-details
              style="flex-shrink:0;"
            />
            <v-text-field
              v-model="options.statusLabels[ring.label.toLowerCase()]"
              density="compact"
              variant="plain"
              hide-details
              style="flex:1;min-width:0;"
            />
            <span
              :style="{ width:'10px', height:'10px', borderRadius:'50%', background:ring.color, flexShrink:0, display:'inline-block' }"
            />
          </div>

          <v-divider class="my-1" />

          <div class="d-flex align-center" style="gap:4px;">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis flex-grow-1">Categories</div>
            <v-btn size="x-small" variant="text" @click="options.categoryGroups.forEach(g => g.included = true)">All</v-btn>
            <v-btn size="x-small" variant="text" @click="options.categoryGroups.forEach(g => g.included = false)">None</v-btn>
          </div>
          <div
            v-for="group in options.categoryGroups"
            :key="group.key"
            draggable="true"
            @dragstart.stop="catDragKey = group.key"
            @dragover.prevent="catDragOver = group.key"
            @dragleave="catDragOver = null"
            @drop.prevent="mergeGroups(group.key)"
            @dragend="catDragKey = null; catDragOver = null"
            :style="{
              borderRadius: '6px',
              border: catDragOver === group.key && catDragKey !== group.key ? '1px dashed #1565c0' : '1px solid transparent',
              background: catDragOver === group.key && catDragKey !== group.key ? 'rgba(21,101,192,.06)' : 'transparent',
              padding: '2px 4px',
              marginBottom: '2px',
              cursor: 'grab'
            }"
          >
            <div style="display:flex;align-items:center;gap:4px;">
              <v-checkbox
                v-model="group.included"
                density="compact"
                hide-details
                style="flex-shrink:0;"
              />
              <v-text-field
                v-model="group.label"
                density="compact"
                variant="plain"
                hide-details
                style="flex:1;min-width:0;"
              />
              <v-icon size="14" style="color:rgba(0,0,0,.3);flex-shrink:0;cursor:grab;">mdi-drag</v-icon>
            </div>
            <div v-if="group.categories.length > 1" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:40px;margin-top:2px;margin-bottom:4px;">
              <v-chip
                v-for="cat in group.categories"
                :key="cat"
                size="x-small"
                closable
                @click:close="unmergeCategory(group.key, cat)"
              >{{ cat }}</v-chip>
            </div>
          </div>

        </div>

        <!-- ── Live preview ───────────────────────────────────────────── -->
        <div style="flex:1;position:relative;background:#f5f5f5;">
          <iframe
            v-if="dialogOpen"
            :srcdoc="previewHtml"
            style="width:100%;height:100%;border:none;"
            sandbox="allow-same-origin allow-scripts"
          />
          <div
            v-if="filteredCount === 0"
            style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.4);font-size:14px;pointer-events:none;"
          >
            No blips match the current filter
          </div>
        </div>
      </div>

      <v-divider />
      <v-card-actions class="px-4 py-3 flex-shrink-0">
        <span class="text-caption text-medium-emphasis">{{ filteredCount }} blip{{ filteredCount !== 1 ? 's' : '' }}</span>
        <v-spacer />
        <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :disabled="!filteredCount" @click="download">
          <v-icon start size="16">mdi-download</v-icon>
          Download HTML
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { generateCustomRadarHtml, downloadCustomRadarHtml } from '../../utils/techRadarExport'

const RING_META = [
  { label: 'Adopt',  color: '#4caf50' },
  { label: 'Trial',  color: '#2196f3' },
  { label: 'Assess', color: '#ff9800' },
  { label: 'Hold',   color: '#9e9e9e' },
  { label: 'Retire', color: '#f44336' }
]

function defaultStatusLabels () {
  return Object.fromEntries(RING_META.map(r => [r.label.toLowerCase(), r.label]))
}

export default {
  name: 'CustomHtmlExportDialog',

  props: {
    modelValue:         { type: Boolean, default: false },
    positionedBlips:    { type: Array,   default: () => [] },
    availableCategories:{ type: Array,   default: () => [] },
    title:              { type: String,  default: 'Tech Radar' }
  },

  emits: ['update:modelValue'],

  setup (props, { emit }) {
    // ── Dialog open state ───────────────────────────────────────────────────
    const dialogOpen = computed({
      get: () => props.modelValue,
      set: val => emit('update:modelValue', val)
    })

    // ── Export options ──────────────────────────────────────────────────────
    const options = ref({
      categoryGroups:    [],
      statusLabels:      defaultStatusLabels(),
      includedStatuses:  RING_META.map(r => r.label.toLowerCase()),
      gridColumns:       3,
      showGroupToggle:   true,
      showSearch:        false,
      defaultGrouping:   'status'
    })

    // Re-initialise category groups every time the dialog opens
    watch(dialogOpen, open => {
      if (!open) return
      options.value.categoryGroups = props.availableCategories.map(cat => ({
        key: 'g-' + cat,
        categories: [cat],
        label: cat,
        included: true
      }))
      options.value.statusLabels      = defaultStatusLabels()
      options.value.includedStatuses  = RING_META.map(r => r.label.toLowerCase())
      options.value.gridColumns       = 3
      options.value.showGroupToggle   = true
      options.value.showSearch        = false
      options.value.defaultGrouping   = 'status'
    })

    // ── Drag & drop for category groups ────────────────────────────────────
    const catDragKey  = ref(null)
    const catDragOver = ref(null)

    function mergeGroups (targetKey) {
      if (!catDragKey.value || catDragKey.value === targetKey) {
        catDragKey.value = null; catDragOver.value = null; return
      }
      const groups = options.value.categoryGroups
      const src = groups.find(g => g.key === catDragKey.value)
      const tgt = groups.find(g => g.key === targetKey)
      if (src && tgt) {
        tgt.categories.push(...src.categories)
        tgt.label = tgt.categories.join(' & ')
        options.value.categoryGroups = groups.filter(g => g.key !== catDragKey.value)
      }
      catDragKey.value = null; catDragOver.value = null
    }

    function unmergeCategory (groupKey, cat) {
      const groups = options.value.categoryGroups
      const group = groups.find(g => g.key === groupKey)
      if (!group || group.categories.length <= 1) return
      group.categories = group.categories.filter(c => c !== cat)
      group.label = group.categories.join(' & ')
      groups.push({ key: 'g-split-' + cat, categories: [cat], label: cat, included: true })
    }

    // ── Preview & count ─────────────────────────────────────────────────────
    const exportParams = computed(() => ({
      title: props.title,
      blips: props.positionedBlips
    }))

    const filteredCount = computed(() => {
      const catToGroup = {}
      for (const g of options.value.categoryGroups.filter(g => g.included !== false)) {
        for (const cat of g.categories) catToGroup[cat] = g.label
      }
      const statusSet = new Set(options.value.includedStatuses.map(s => s.toLowerCase()))
      const RING_LABELS = RING_META.map(r => r.label.toLowerCase())
      return props.positionedBlips.filter(b => {
        const sk = RING_LABELS[b.ring] ?? ''
        return (b.categoryTitle in catToGroup) && statusSet.has(sk)
      }).length
    })

    const previewHtml = computed(() => {
      if (!dialogOpen.value) return ''
      return generateCustomRadarHtml(exportParams.value, options.value)
    })

    // ── Download ────────────────────────────────────────────────────────────
    function download () {
      downloadCustomRadarHtml(exportParams.value, options.value)
    }

    return {
      dialogOpen,
      options,
      catDragKey,
      catDragOver,
      filteredCount,
      previewHtml,
      mergeGroups,
      unmergeCategory,
      download,
      RING_META
    }
  }
}
</script>
