import { describe, it, expect, beforeEach, vi } from 'vitest'
import Questionnaire from '../../src/components/questionaire/Questionnaire.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { createActivePinia, mountWithStore } from './helpers/mountWithStore'

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

  it('supports standalone typed examples — a Tool example with no parent Practice', () => {
    const entry = {
      id: 'e2',
      aspect: 'Testing',
      examples: [
        { type: 'practice', label: 'TDD', description: '' },
        { type: 'practice', label: 'BDD', description: '' },
        { type: 'tool', label: 'Jest', description: '' },
        { type: 'tool', label: 'Playwright', description: '' }
      ],
      answers: [{ technology: '', status: '', comments: '', answerType: '' }],
      applicability: 'applicable'
    }
    const categories = [
      { id: 'meta', title: 'Metadata', isMetadata: true, metadata: {} },
      { id: 'cat-1', title: 'QA', entries: [entry] }
    ]
    const { wrapper } = mountWithStore(Questionnaire, { props: { categories, questionnaireId: 'q1' } })

    expect(wrapper.vm.getSuggestions(entry, 'Practice')).toEqual(['BDD', 'TDD'])
    expect(wrapper.vm.getSuggestions(entry, 'Tool')).toEqual(['Jest', 'Playwright'])
  })

  it('handles a mix of legacy and typed examples on the same entry', () => {
    const entry = {
      id: 'e3',
      aspect: 'Mixed',
      examples: [
        { label: 'Legacy Practice', description: '', tools: ['Legacy Tool'] },
        { type: 'tool', label: 'New Tool', description: '' }
      ],
      answers: [{ technology: '', status: '', comments: '', answerType: '' }],
      applicability: 'applicable'
    }
    const categories = [
      { id: 'meta', title: 'Metadata', isMetadata: true, metadata: {} },
      { id: 'cat-1', title: 'Mixed', entries: [entry] }
    ]
    const { wrapper } = mountWithStore(Questionnaire, { props: { categories, questionnaireId: 'q1' } })

    expect(wrapper.vm.getSuggestions(entry, 'Practice')).toEqual(['Legacy Practice'])
    expect(wrapper.vm.getSuggestions(entry, 'Tool')).toEqual(['Legacy Tool', 'New Tool'])
  })
})

// ── Vocabulary in the answer suggestions (Todo 2.3) ──────────────────────────
//
// The vocabulary is mixed into the suggestion list so the spelling that already
// exists elsewhere in the workspace is the one closest to hand.
describe('getSuggestions — vocabulary terms', () => {
  // Mounts with a store seeded *before* the component, so getSuggestions sees
  // the vocabulary on its first call.
  function mountWithVocabulary(seed) {
    const pinia = createActivePinia()
    const store = useWorkspaceStore()
    seed(store)
    const entry = {
      id: 'e1',
      aspect: 'Stack',
      examples: [
        { type: 'tool', label: 'Angular' },
        { type: 'tool', label: 'dotnet core' },
        { type: 'practice', label: 'Pair Programming' }
      ],
      answers: [{ technology: '', status: '', comments: '', answerType: '' }],
      applicability: 'applicable'
    }
    const categories = [{ id: 'cat-1', title: 'Frontend', entries: [entry] }]
    const { wrapper } = mountWithStore(Questionnaire, {
      props: { categories, questionnaireId: 'q1' },
      pinia
    })
    return { wrapper, entry, store }
  }

  it('offers vocabulary terms of the matching kind alongside the catalog examples', () => {
    const { wrapper, entry } = mountWithVocabulary((store) => {
      store.createTerm('Redis', 'tool')
      store.createTerm('Trunk Based Development', 'practice')
    })

    expect(wrapper.vm.getSuggestions(entry, 'Tool')).toEqual(['Angular', 'Redis', 'dotnet core'])
    expect(wrapper.vm.getSuggestions(entry, 'Practice')).toEqual(['Pair Programming', 'Trunk Based Development'])
  })

  it('shows both kinds when no answerType is chosen yet — today’s behavior, kept', () => {
    const { wrapper, entry } = mountWithVocabulary((store) => {
      store.createTerm('Redis', 'tool')
      store.createTerm('Trunk Based Development', 'practice')
    })

    expect(wrapper.vm.getSuggestions(entry, '')).toEqual([
      'Angular',
      'Pair Programming',
      'Redis',
      'Trunk Based Development',
      'dotnet core'
    ])
  })

  it('suppresses a catalog example that is already an alias, offering the canonical spelling instead', () => {
    const { wrapper, entry } = mountWithVocabulary((store) => {
      const termId = store.createTerm('.NET Core', 'tool')
      store.addAlias(termId, 'dotnet core')
    })

    const suggestions = wrapper.vm.getSuggestions(entry, 'Tool')
    expect(suggestions).toContain('.NET Core')
    expect(suggestions).not.toContain('dotnet core')
  })

  it('suppresses a catalog example that is a term’s canonical name, rather than listing it twice', () => {
    const { wrapper, entry } = mountWithVocabulary((store) => {
      store.createTerm('Angular', 'tool')
    })

    expect(wrapper.vm.getSuggestions(entry, 'Tool').filter((name) => name === 'Angular')).toHaveLength(1)
  })

  it('keeps an example suppressed even when the term’s kind excludes it from this list', () => {
    // The vocabulary, not the catalog, is the authority on kind: if a name is
    // recorded as a practice, it must not resurface as a tool suggestion.
    const { wrapper, entry } = mountWithVocabulary((store) => {
      store.createTerm('Angular', 'practice')
    })

    expect(wrapper.vm.getSuggestions(entry, 'Tool')).not.toContain('Angular')
    expect(wrapper.vm.getSuggestions(entry, 'Practice')).toContain('Angular')
  })

  it('falls back to the catalog examples alone when the vocabulary is empty', () => {
    const { wrapper, entry } = mountWithVocabulary(() => {})

    expect(wrapper.vm.getSuggestions(entry, 'Tool')).toEqual(['Angular', 'dotnet core'])
  })
})
