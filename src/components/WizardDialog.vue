<template>
  <v-dialog v-model="open" max-width="1200" scrollable>
    <v-card>
      <v-toolbar flat>
        <v-toolbar-title>Wizard</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="wizard-body">
        <div class="d-flex align-center mb-4">
          <div class="text-subtitle-1 font-weight-medium">
            Step {{ stepNumber }} of {{ totalSteps }}
          </div>
          <v-spacer />
          <div class="text-subtitle-2 text--secondary">
            {{ currentCategory?.title || '' }}
          </div>
        </div>

        <div v-if="currentStep?.type === 'intro'" class="wizard-intro">
          <div class="text-h5 font-weight-bold mb-2">
            {{ currentCategory?.title }}
          </div>
          <div class="text-body-1 text--secondary">
            {{ currentCategory?.desc }}
          </div>
        </div>

        <div v-else-if="currentStep?.type === 'metadata'" class="mt-2">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                label="Software Product"
                v-model="currentCategory.metadata.productName"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                label="Company"
                v-model="currentCategory.metadata.company"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                label="Department"
                v-model="currentCategory.metadata.department"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                label="Contact Person"
                v-model="currentCategory.metadata.contactPerson"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                label="Description"
                v-model="currentCategory.metadata.description"
                placeholder="Brief description of the software product..."
                rows="4"
                auto-grow
              />
            </v-col>
          </v-row>
        </div>

        <div v-else-if="currentStep?.type === 'entry' && currentEntry">
          <v-sheet class="pa-3" elevation="1">
            <div class="d-flex justify-space-between align-start">
              <div class="flex-grow-1">
                <div class="text-h6 font-weight-bold">{{ currentEntry.aspect }}</div>
                <div v-if="currentEntry.description" class="text-body-2 mt-1" v-html="renderTextWithLinks(currentEntry.description)"></div>
                <div v-if="getExampleItems(currentEntry.examples).length" class="text--secondary text-sm mt-1">
                  <strong>Examples: </strong>
                  <span v-for="(example, eIdx) in getExampleItems(currentEntry.examples)" :key="`${currentEntry.id}-ex-${eIdx}`">
                    <v-tooltip v-if="example.description" :text="example.description" location="top">
                      <template v-slot:activator="{ props }">
                        <span v-bind="props" class="example-item">{{ example.label }}</span>
                      </template>
                    </v-tooltip>
                    <span v-else class="example-item">{{ example.label }}</span>
                    <span v-if="eIdx < getExampleItems(currentEntry.examples).length - 1">, </span>
                  </span>
                </div>
              </div>
              <div class="ml-4" style="min-width: 190px;">
                <v-select
                  v-model="currentEntry.applicability"
                  :items="applicabilityOptions"
                  density="compact"
                  variant="plain"
                  hide-details
                  @update:model-value="setApplicability(currentEntry, $event)"
                />
              </div>
            </div>

            <div v-if="isEntryApplicable(currentEntry)">
              <div v-for="(answer, aIdx) in currentEntry.answers" :key="aIdx" class="mt-4 pa-2 border-l-4 border-info">
                <v-row dense>
                  <v-col cols="12" md="4">
                    <v-text-field label="Solution" v-model="answer.technology" clearable />
                  </v-col>

                  <v-col cols="12" md="2">
                    <v-tooltip :text="getStatusTooltip(answer.status)" location="top">
                      <template v-slot:activator="{ props }">
                        <v-select
                          label="Status"
                          :items="statusOptions"
                          item-title="label"
                          item-value="label"
                          v-model="answer.status"
                          v-bind="props"
                        />
                      </template>
                    </v-tooltip>
                  </v-col>

                  <v-col cols="12" md="5">
                    <v-textarea label="Comment" v-model="answer.comments" rows="1" auto-grow />
                  </v-col>

                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn
                      size="small"
                      color="error"
                      variant="text"
                      icon
                      @click="deleteAnswer(currentEntry.id, aIdx)"
                      v-if="currentEntry.answers.length > 1"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <div class="mt-3">
                <v-btn size="small" color="secondary" @click="addAnswer(currentEntry.id)">
                  + Add Answer
                </v-btn>
              </div>
            </div>
          </v-sheet>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn @click="prevStep" :disabled="!hasPrev">
          Back
        </v-btn>
        <v-spacer />
        <v-btn @click="nextStep" :disabled="!hasNext">
          Next
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    categories: {
      type: Array,
      required: true
    }
  },
  emits: ['update:modelValue', 'update-categories'],
  setup(props, { emit }) {
    const activeIndex = ref(0)

    const open = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    watch(() => props.modelValue, (value) => {
      if (value) {
        activeIndex.value = 0
      }
    })

    const steps = computed(() => {
      const output = []
      props.categories.forEach((category) => {
        output.push({ type: 'intro', categoryId: category.id })
        if (category.isMetadata) {
          output.push({ type: 'metadata', categoryId: category.id })
          return
        }
        ;(category.entries || []).forEach((entry) => {
          output.push({ type: 'entry', categoryId: category.id, entryId: entry.id })
        })
      })
      return output
    })

    const currentStep = computed(() => steps.value[activeIndex.value] || null)
    const currentCategory = computed(() => props.categories.find(c => c.id === currentStep.value?.categoryId) || null)
    const currentEntry = computed(() => {
      if (!currentStep.value || currentStep.value.type !== 'entry') return null
      return currentCategory.value?.entries?.find(e => e.id === currentStep.value.entryId) || null
    })
    const totalSteps = computed(() => steps.value.length)
    const stepNumber = computed(() => Math.min(activeIndex.value + 1, totalSteps.value || 1))
    const hasNext = computed(() => activeIndex.value < steps.value.length - 1)
    const hasPrev = computed(() => activeIndex.value > 0)

    const statusOptions = [
      { label: 'Adopt', description: 'We use this and recommend it.' },
      { label: 'Assess', description: 'We are currently evaluating/testing this.' },
      { label: 'Hold', description: 'We use this, but do not recommend it for new features.' },
      { label: 'Retire', description: 'We are actively replacing or removing this.' }
    ]

    const applicabilityOptions = ['applicable', 'not applicable', 'unknown']

    function closeDialog() {
      open.value = false
    }

    function nextStep() {
      if (hasNext.value) {
        activeIndex.value += 1
      }
    }

    function prevStep() {
      if (hasPrev.value) {
        activeIndex.value -= 1
      }
    }

    function getStatusTooltip(status) {
      const opt = statusOptions.find(s => s.label === status)
      return opt ? opt.description : ''
    }

    function findEntry(entryId) {
      for (const cat of props.categories) {
        if (!cat.entries) continue
        for (const e of cat.entries) {
          if (e.id === entryId) return e
        }
      }
      return null
    }

    function addAnswer(entryId) {
      const entry = findEntry(entryId)
      if (entry && isEntryApplicable(entry)) {
        entry.answers = [...entry.answers, { technology: '', status: '', comments: '' }]
        emit('update-categories', props.categories)
      }
    }

    function deleteAnswer(entryId, answerIdx) {
      const entry = findEntry(entryId)
      if (entry && entry.answers.length > 1) {
        entry.answers = entry.answers.filter((_, idx) => idx !== answerIdx)
        emit('update-categories', props.categories)
      }
    }

    function isEntryApplicable(entry) {
      return (entry.applicability || 'applicable') === 'applicable'
    }

    function setApplicability(entry, value) {
      if (!applicabilityOptions.includes(value)) {
        entry.applicability = 'applicable'
        return
      }

      entry.applicability = value

      if (['does not apply', 'unknown'].includes(value)) {
        entry.answers = [{ technology: value, status: '', comments: '' }]
      } else {
        const filteredAnswers = (entry.answers || []).filter(
          (answer) => !['does not apply', 'unknown'].includes(answer.technology)
        )
        entry.answers = filteredAnswers.length > 0
          ? filteredAnswers
          : [{ technology: '', status: '', comments: '' }]
      }

      emit('update-categories', props.categories)
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    function renderTextWithLinks(value) {
      if (!value) return ''

      const tokens = []
      let working = String(value)

      working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
        const token = `__LINK_${tokens.length}__`
        tokens.push({ label, url })
        return token
      })

      working = working.replace(/https?:\/\/[^\s)]+/g, (url) => {
        const token = `__LINK_${tokens.length}__`
        tokens.push({ label: url, url })
        return token
      })

      working = escapeHtml(working)

      tokens.forEach((token, idx) => {
        const placeholder = `__LINK_${idx}__`
        const anchor = `<a href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.label)}</a>`
        working = working.replace(placeholder, anchor)
      })

      return working
    }

    function getExampleItems(examples) {
      if (!examples) return []

      if (Array.isArray(examples)) {
        return examples
          .map((example) => {
            if (typeof example === 'string') {
              const label = example.trim()
              return label ? { label, description: '' } : null
            }
            if (example && typeof example === 'object') {
              const label = String(example.label || '').trim()
              if (!label) return null
              return { label, description: example.description || '' }
            }
            return null
          })
          .filter(Boolean)
      }

      if (typeof examples === 'string') {
        return examples
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((label) => ({ label, description: '' }))
      }

      return []
    }

    return {
      open,
      currentStep,
      currentCategory,
      currentEntry,
      totalSteps,
      stepNumber,
      hasNext,
      hasPrev,
      statusOptions,
      applicabilityOptions,
      closeDialog,
      nextStep,
      prevStep,
      getStatusTooltip,
      addAnswer,
      deleteAnswer,
      isEntryApplicable,
      setApplicability,
      renderTextWithLinks,
      getExampleItems
    }
  }
}
</script>

<style scoped>
.wizard-body {
  max-height: 70vh;
  overflow-y: auto;
}

.wizard-intro {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.example-item {
  cursor: help;
  text-decoration: underline dotted;
}
</style>
