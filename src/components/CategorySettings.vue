<template>
  <div class="category-settings">
    <p class="text-body-2 text-medium-emphasis mb-4">
      Legen Sie fest, bei welchen Kategorien und Aspekten <strong>keine</strong> Abweichungen zwischen den Fragenkatalogen zulässig sind.
      Aktivierte Einträge werden in der Projektübersicht hervorgehoben, wenn die Antworten der Fragenkataloge voneinander abweichen.
    </p>

    <div v-if="!categories.length" class="text-body-2 text-medium-emphasis">
      Keine Kategorien verfügbar.
    </div>

    <v-list v-else density="compact" class="cs-list pa-0">
      <template v-for="cat in categories" :key="cat.id">
        <!-- Category header row -->
        <v-list-item
          class="cs-category-row"
          @click="toggleExpand(cat.id)"
        >
          <template #prepend>
            <v-icon
              size="14"
              class="mr-1 expand-icon"
              :class="{ expanded: isExpanded(cat.id) }"
            >
              mdi-chevron-right
            </v-icon>
            <v-icon size="16" class="mr-2">mdi-folder-outline</v-icon>
          </template>

          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ cat.title }}
          </v-list-item-title>

          <template #append>
            <div class="d-flex align-center cs-toggle-col" @click.stop>
              <v-checkbox-btn
                :model-value="categoryChecked(cat)"
                :indeterminate="categoryIndeterminate(cat)"
                color="primary"
                density="compact"
                hide-details
                @update:model-value="(val) => toggleCategory(cat, val)"
              />
            </div>
          </template>
        </v-list-item>

        <!-- Entry rows -->
        <template v-if="isExpanded(cat.id)">
          <v-list-item
            v-for="entry in cat.entries"
            :key="entry.id"
            class="cs-entry-row"
          >
            <template #prepend>
              <span class="cs-indent" />
              <v-icon size="14" class="mr-2 text-medium-emphasis">mdi-file-document-outline</v-icon>
            </template>

            <v-list-item-title class="text-body-2">{{ entry.aspect || entry.id }}</v-list-item-title>

            <template #append>
              <div class="cs-toggle-col">
                <v-checkbox-btn
                  :model-value="entryChecked(cat.id, entry.id)"
                  color="primary"
                  density="compact"
                  hide-details
                  @update:model-value="(val) => toggleEntry(cat.id, entry.id, val)"
                />
              </div>
            </template>
          </v-list-item>
        </template>
      </template>
    </v-list>
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
    modelValue: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const expandedCategories = ref(new Set())

    function toggleExpand(catId) {
      const s = new Set(expandedCategories.value)
      if (s.has(catId)) s.delete(catId)
      else s.add(catId)
      expandedCategories.value = s
    }

    function isExpanded(catId) {
      return expandedCategories.value.has(catId)
    }

    // Effective value for an entry: entry-level override -> category-level -> default false
    function entryChecked(catId, entryId) {
      if (entryId in props.modelValue) return props.modelValue[entryId]
      if (catId in props.modelValue) return props.modelValue[catId]
      return false
    }

    // Category toggle is ON if all its entries are effectively ON
    function categoryChecked(cat) {
      const entries = cat.entries || []
      if (!entries.length) return props.modelValue[cat.id] ?? false
      return entries.every((e) => entryChecked(cat.id, e.id))
    }

    // Indeterminate if some ON, some OFF
    function categoryIndeterminate(cat) {
      const entries = cat.entries || []
      if (!entries.length) return false
      const values = entries.map((e) => entryChecked(cat.id, e.id))
      return values.some((v) => v) && values.some((v) => !v)
    }

    // Toggle category: set category-level default, remove entry-level overrides
    function toggleCategory(cat, value) {
      const next = { ...props.modelValue }
      next[cat.id] = value
      ;(cat.entries || []).forEach((e) => { delete next[e.id] })
      emit('update:modelValue', next)
    }

    // Toggle entry: create/remove entry-level override
    function toggleEntry(catId, entryId, value) {
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
      toggleExpand,
      isExpanded,
      entryChecked,
      categoryChecked,
      categoryIndeterminate,
      toggleCategory,
      toggleEntry
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
