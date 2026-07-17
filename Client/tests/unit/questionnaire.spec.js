import { describe, it, expect, beforeEach, vi } from 'vitest'
import Questionnaire from '../../src/components/questionaire/Questionnaire.vue'
import { mountWithStore } from './helpers/mountWithStore'

// Vuetify isn't installed in these tests (see helpers/mountWithStore.js), so
// Vue logs "Failed to resolve component: v-xxx" warnings for every template
// tag. That's expected noise here since we only assert on exposed vm logic,
// not on rendered Vuetify markup.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function mountQuestionnaire() {
  const entry = {
    id: 'e1',
    aspect: 'App Type & Stack',
    examples: [
      { label: 'Web SPA Framework', description: 'Browser-based SPA.', tools: ['Angular', 'React', 'Vue.js'] },
      { label: 'Native Desktop', description: 'Desktop-native UI.', tools: ['WPF', 'Qt'] }
    ],
    answers: [{ technology: '', status: '', comments: '', answerType: '' }],
    applicability: 'applicable'
  }
  const categories = [
    { id: 'meta', title: 'Metadata', isMetadata: true, metadata: {} },
    { id: 'cat-1', title: 'Frontend', entries: [entry] }
  ]
  const { wrapper } = mountWithStore(Questionnaire, {
    props: { categories, questionnaireId: 'q1' }
  })
  return { wrapper, entry }
}

describe('getSuggestions — Practice/Tool-aware example suggestions', () => {
  it('suggests only example labels (Practices) when answerType is "Practice"', () => {
    const { wrapper, entry } = mountQuestionnaire()
    const suggestions = wrapper.vm.getSuggestions(entry, 'Practice')
    expect(suggestions).toEqual(['Native Desktop', 'Web SPA Framework'])
  })

  it('suggests only concrete tools when answerType is "Tool"', () => {
    const { wrapper, entry } = mountQuestionnaire()
    const suggestions = wrapper.vm.getSuggestions(entry, 'Tool')
    expect(suggestions).toEqual(['Angular', 'Qt', 'React', 'Vue.js', 'WPF'])
  })

  it('falls back to the combined list when no answerType is selected yet', () => {
    const { wrapper, entry } = mountQuestionnaire()
    const suggestions = wrapper.vm.getSuggestions(entry, '')
    expect(suggestions).toEqual(['Angular', 'Native Desktop', 'Qt', 'React', 'Vue.js', 'WPF', 'Web SPA Framework'])
  })
})
