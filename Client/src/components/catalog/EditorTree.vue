<template>
  <div class="editor-tree">
    <v-text-field
      v-model="search"
      placeholder="Search structure…"
      density="compact"
      variant="outlined"
      hide-details
      clearable
      prepend-inner-icon="mdi-magnify"
      class="mb-2"
    />

    <v-list v-model:opened="openGroups" density="compact" class="editor-tree-list">
      <v-list-group v-for="category in filteredCategories" :key="category.id" :value="category.id">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            :active="selectedId === category.id"
            @click="$emit('select', { kind: 'category', categoryId: category.id })"
          >
            <template #prepend>
              <v-icon size="16">{{ category.isMetadata ? 'mdi-cog-outline' : 'mdi-folder-outline' }}</v-icon>
            </template>
            <v-list-item-title>{{ category.title }}</v-list-item-title>
            <template #append>
              <v-menu location="bottom end">
                <template #activator="{ props: menuProps }">
                  <v-btn icon size="x-small" variant="text" class="node-menu" v-bind="menuProps" @click.stop>
                    <v-icon size="16">mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item @click.stop="$emit('duplicate', { kind: 'category', categoryId: category.id })">
                    <v-list-item-title>Duplicate</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    @click.stop="$emit('move', { kind: 'category', categoryId: category.id, direction: -1 })"
                  >
                    <v-list-item-title>Move up</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click.stop="$emit('move', { kind: 'category', categoryId: category.id, direction: 1 })">
                    <v-list-item-title>Move down</v-list-item-title>
                  </v-list-item>
                  <v-divider></v-divider>
                  <v-list-item @click.stop="$emit('delete', { kind: 'category', categoryId: category.id })">
                    <v-list-item-title class="text-error">Delete</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </template>

        <v-list-item
          v-for="entry in filteredEntries(category)"
          :key="entry.id"
          class="entry-item"
          :active="selectedId === entry.id"
          @click="$emit('select', { kind: 'entry', categoryId: category.id, entryId: entry.id })"
        >
          <v-list-item-title>{{ entry.aspect }}</v-list-item-title>
          <template #append>
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn icon size="x-small" variant="text" class="node-menu" v-bind="menuProps" @click.stop>
                  <v-icon size="16">mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  @click.stop="$emit('duplicate', { kind: 'entry', categoryId: category.id, entryId: entry.id })"
                >
                  <v-list-item-title>Duplicate</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click.stop="
                    $emit('move', { kind: 'entry', categoryId: category.id, entryId: entry.id, direction: -1 })
                  "
                >
                  <v-list-item-title>Move up</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click.stop="
                    $emit('move', { kind: 'entry', categoryId: category.id, entryId: entry.id, direction: 1 })
                  "
                >
                  <v-list-item-title>Move down</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  @click.stop="$emit('delete', { kind: 'entry', categoryId: category.id, entryId: entry.id })"
                >
                  <v-list-item-title class="text-error">Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-list-item>

        <v-list-item v-if="!category.isMetadata" class="add-entry-item" @click="$emit('add-entry', category.id)">
          <template #prepend>
            <v-icon size="16">mdi-plus</v-icon>
          </template>
          <v-list-item-title class="text-caption">Add entry</v-list-item-title>
        </v-list-item>
      </v-list-group>
    </v-list>

    <v-btn variant="text" size="small" prepend-icon="mdi-plus" @click="$emit('add-category')">Add category</v-btn>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  selectedId: {
    type: String,
    default: ''
  }
})

defineEmits(['select', 'add-category', 'add-entry', 'duplicate', 'delete', 'move'])

const search = ref('')

function matches(text) {
  if (!search.value.trim()) return true
  return String(text || '')
    .toLowerCase()
    .includes(search.value.trim().toLowerCase())
}

function filteredEntries(category) {
  const entries = Array.isArray(category.entries) ? category.entries : []
  if (!search.value.trim()) return entries
  return entries.filter((entry) => matches(entry.aspect) || matches(entry.description))
}

const filteredCategories = computed(() => {
  if (!search.value.trim()) return props.categories
  return props.categories.filter((category) => matches(category.title) || filteredEntries(category).length > 0)
})

// Tracks user-toggled expand/collapse state outside of search mode. Separate
// from the computed below so manual collapses aren't immediately undone.
const manuallyOpened = ref([])

function categoryIdOwning(id) {
  const category = props.categories.find(
    (c) => c.id === id || (Array.isArray(c.entries) && c.entries.some((e) => e.id === id))
  )
  return category ? category.id : null
}

// Whatever category the current selection belongs to must be visible — this
// matters when a newly added/selected entry lives in a category the tree
// hasn't been expanded yet, which otherwise leaves the detail pane showing
// something the tree itself doesn't visibly reveal.
watch(
  () => props.selectedId,
  (id) => {
    const categoryId = categoryIdOwning(id)
    if (categoryId && !manuallyOpened.value.includes(categoryId)) {
      manuallyOpened.value = [...manuallyOpened.value, categoryId]
    }
  },
  { immediate: true }
)

// Keep every matching category expanded while searching, so matches are
// visible without the user manually opening each one; revert to the
// manually-tracked state once the search is cleared.
const openGroups = computed({
  get: () => (search.value.trim() ? filteredCategories.value.map((c) => c.id) : manuallyOpened.value),
  set: (value) => {
    if (!search.value.trim()) manuallyOpened.value = value
  }
})
</script>

<style scoped>
.editor-tree {
  padding: 8px;
  border-right: 1px solid #eceff1;
  height: 100%;
}

.editor-tree-list {
  margin-bottom: 8px;
}

.entry-item {
  padding-left: 40px !important;
}

.add-entry-item {
  padding-left: 40px !important;
  opacity: 0.7;
}

.node-menu {
  opacity: 0;
  pointer-events: none;
}

.editor-tree-list :deep(.v-list-item:hover) .node-menu {
  opacity: 1;
  pointer-events: auto;
}
</style>
