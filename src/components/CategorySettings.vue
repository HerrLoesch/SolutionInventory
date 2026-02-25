<template>
  <div class="category-settings">
    <v-tabs v-model="activeTab" density="compact" class="mb-3">
      <v-tab value="visibility">Visibility</v-tab>
      <v-tab value="deviation">Deviation</v-tab>
    </v-tabs>

    <div v-if="!categories.length" class="text-body-2 text-medium-emphasis">
      No categories available.
    </div>

    <template v-else>
      <!-- VISIBILITY TAB -->
      <v-window v-model="activeTab">
        <v-window-item value="visibility">
          <p class="text-body-2 text-medium-emphasis mb-3">
            Choose which categories and aspects are <strong>shown</strong> in the project summary.
            Unchecked items will be hidden from the overview.
          </p>
          <v-list density="compact" class="cs-list pa-0">
            <template v-for="cat in categories" :key="cat.id">
              <v-list-item class="cs-category-row" @click="toggleExpand('vis', cat.id)">
                <template #prepend>
                  <v-icon size="14" class="mr-1 expand-icon" :class="{ expanded: isExpanded('vis', cat.id) }">
                    mdi-chevron-right
                  </v-icon>
                  <v-icon size="16" class="mr-2">mdi-folder-outline</v-icon>
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">{{ cat.title }}</v-list-item-title>
                <template #append>
                  <div class="cs-toggle-col" @click.stop>
                    <v-checkbox-btn
                      :model-value="visCategoryChecked(cat)"
                      :indeterminate="visCategoryIndeterminate(cat)"
                      color="primary"
                      density="compact"
                      hide-details
                      @update:model-value="(val) => toggleVisCategory(cat, val)"
                    />
                  </div>
                </template>
              </v-list-item>
              <template v-if="isExpanded('vis', cat.id)">
                <v-list-item v-for="entry in cat.entries" :key="entry.id" class="cs-entry-row">
                  <template #prepend>
                    <span class="cs-indent" />
                    <v-icon size="14" class="mr-2 text-medium-emphasis">mdi-file-document-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ entry.aspect || entry.id }}</v-list-item-title>
                  <template #append>
                    <div class="cs-toggle-col">
                      <v-checkbox-btn
                        :model-value="visEntryChecked(cat.id, entry.id)"
                        color="primary"
                        density="compact"
                        hide-details
                        @update:model-value="(val) => toggleVisEntry(cat.id, entry.id, val)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </template>
            </template>
          </v-list>
        </v-window-item>

        <!-- DEVIATION TAB -->
        <v-window-item value="deviation">
          <p class="text-body-2 text-medium-emphasis mb-3">
            Choose which categories and aspects must <strong>not</strong> deviate across questionnaires.
            Checked items will be highlighted in the project summary when answers differ.
          </p>
          <v-list density="compact" class="cs-list pa-0">
            <template v-for="cat in categories" :key="cat.id">
              <v-list-item class="cs-category-row" @click="toggleExpand('dev', cat.id)">
                <template #prepend>
                  <v-icon size="14" class="mr-1 expand-icon" :class="{ expanded: isExpanded('dev', cat.id) }">
                    mdi-chevron-right
                  </v-icon>
                  <v-icon size="16" class="mr-2">mdi-folder-outline</v-icon>
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">{{ cat.title }}</v-list-item-title>
                <template #append>
                  <div class="cs-toggle-col" @click.stop>
                    <v-checkbox-btn
                      :model-value="devCategoryChecked(cat)"
                      :indeterminate="devCategoryIndeterminate(cat)"
                      color="primary"
                      density="compact"
                      hide-details
                      @update:model-value="(val) => toggleDevCategory(cat, val)"
                    />
                  </div>
                </template>
              </v-list-item>
              <template v-if="isExpanded('dev', cat.id)">
                <v-list-item v-for="entry in cat.entries" :key="entry.id" class="cs-entry-row">
                  <template #prepend>
                    <span class="cs-indent" />
                    <v-icon size="14" class="mr-2 text-medium-emphasis">mdi-file-document-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ entry.aspect || entry.id }}</v-list-item-title>
                  <template #append>
                    <div class="cs-toggle-col">
                      <v-checkbox-btn
                        :model-value="devEntryChecked(cat.id, entry.id)"
                        color="primary"
                        density="compact"
                        hide-details
                        @update:model-value="(val) => toggleDevEntry(cat.id, entry.id, val)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </template>
            </template>
          </v-list>
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'CategorySettings',
  props: {
    categories: {
      type: Array,
      default: () => []
    },
    // Deviation settings: id -> true means no deviation allowed (default false)
    modelValue: {
      type: Object,
      default: () => ({})
    },
    // Visibility settings: id -> false means hidden (default true = visible)
    visibilitySettings: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue', 'update:visibilitySettings'],
  setup(props, { emit }) {
    const activeTab = ref('visibility')

    // Separate expand state per tab
    const expandedVis = ref(new Set())
    const expandedDev = ref(new Set())

    function toggleExpand(tab, catId) {
      const s = new Set(tab === 'vis' ? expandedVis.value : expandedDev.value)
      if (s.has(catId)) s.delete(catId)
      else s.add(catId)
      if (tab === 'vis') expandedVis.value = s
      else expandedDev.value = s
    }

    function isExpanded(tab, catId) {
      return tab === 'vis' ? expandedVis.value.has(catId) : expandedDev.value.has(catId)
    }

    // ── VISIBILITY (default: true = visible) ──────────────────────────────────

    function visEntryChecked(catId, entryId) {
      if (entryId in props.visibilitySettings) return props.visibilitySettings[entryId]
      if (catId in props.visibilitySettings) return props.visibilitySettings[catId]
      return true // default: visible
    }

    function visCategoryChecked(cat) {
      const entries = cat.entries || []
      if (!entries.length) return props.visibilitySettings[cat.id] ?? true
      return entries.every((e) => visEntryChecked(cat.id, e.id))
    }

    function visCategoryIndeterminate(cat) {
      const entries = cat.entries || []
      if (!entries.length) return false
      const values = entries.map((e) => visEntryChecked(cat.id, e.id))
      return values.some((v) => v) && values.some((v) => !v)
    }

    function toggleVisCategory(cat, value) {
      const next = { ...props.visibilitySettings }
      next[cat.id] = value
      ;(cat.entries || []).forEach((e) => { delete next[e.id] })
      emit('update:visibilitySettings', next)
    }

    function toggleVisEntry(catId, entryId, value) {
      const next = { ...props.visibilitySettings }
      const catValue = catId in next ? next[catId] : true // default visible
      if (value === catValue) {
        delete next[entryId]
      } else {
        next[entryId] = value
      }
      emit('update:visibilitySettings', next)
    }

    // ── DEVIATION (default: false = deviations allowed) ───────────────────────

    function devEntryChecked(catId, entryId) {
      if (entryId in props.modelValue) return props.modelValue[entryId]
      if (catId in props.modelValue) return props.modelValue[catId]
      return false // default: deviations allowed
    }

    function devCategoryChecked(cat) {
      const entries = cat.entries || []
      if (!entries.length) return props.modelValue[cat.id] ?? false
      return entries.every((e) => devEntryChecked(cat.id, e.id))
    }

    function devCategoryIndeterminate(cat) {
      const entries = cat.entries || []
      if (!entries.length) return false
      const values = entries.map((e) => devEntryChecked(cat.id, e.id))
      return values.some((v) => v) && values.some((v) => !v)
    }

    function toggleDevCategory(cat, value) {
      const next = { ...props.modelValue }
      next[cat.id] = value
      ;(cat.entries || []).forEach((e) => { delete next[e.id] })
      emit('update:modelValue', next)
    }

    function toggleDevEntry(catId, entryId, value) {
      const next = { ...props.modelValue }
      const catValue = catId in next ? next[catId] : false
      if (value === catValue) {
        delete next[entryId]
      } else {
        next[entryId] = value
      }
      emit('update:modelValue', next)
    }

    return {
      activeTab,
      toggleExpand,
      isExpanded,
      // Visibility
      visEntryChecked,
      visCategoryChecked,
      visCategoryIndeterminate,
      toggleVisCategory,
      toggleVisEntry,
      // Deviation
      devEntryChecked,
      devCategoryChecked,
      devCategoryIndeterminate,
      toggleDevCategory,
      toggleDevEntry
    }
  }
}
</script>

<style scoped>
.cs-list {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  overflow: hidden;
}

.cs-category-row {
  cursor: pointer;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.cs-category-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.cs-entry-row {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.cs-entry-row:last-child {
  border-bottom: none;
}

.cs-indent {
  display: inline-block;
  width: 28px;
  flex-shrink: 0;
}

.cs-toggle-col {
  width: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.expand-icon {
  transition: transform 0.15s;
  flex-shrink: 0;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}
</style>
