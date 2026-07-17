import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import ProjectMatrix from '../../src/components/projects/ProjectMatrix.vue'
import { createActivePinia, mountWithStore } from './helpers/mountWithStore'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function mountMatrix (props, pinia) {
  return mountWithStore(ProjectMatrix, {
    props,
    pinia,
    global: { stubs: { CategorySettings: true } }
  })
}

function seedProjectWithQuestionnaires (questionnaireDefs) {
  const pinia = createActivePinia()
  const store = useWorkspaceStore()
  const projectId = store.addProject('P')
  const questionnaireIds = questionnaireDefs.map((def) => store.addQuestionnaire(def.name, def.categories, projectId))
  return { pinia, store, projectId, questionnaireIds }
}

function entryCategory (entryId, aspect, answers) {
  return { id: 'cat-1', title: 'Architecture', entries: [{ id: entryId, aspect, answers }] }
}

describe('rows / matrix construction', () => {
  it('deduplicates entries across questionnaires and sorts by title', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [{ id: 'c1', title: 'Cat', entries: [{ id: 'e2', aspect: 'Zeta', answers: [] }, { id: 'e1', aspect: 'Alpha', answers: [] }] }] },
      { name: 'Q2', categories: [{ id: 'c1', title: 'Cat', entries: [{ id: 'e1', aspect: 'Alpha', answers: [] }] }] }
    ])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    expect(wrapper.vm.items.map((i) => i.title)).toEqual(['Alpha', 'Zeta'])
  })

  it('includes a table column per questionnaire, keyed with the q_ prefix', () => {
    const { pinia, projectId, questionnaireIds } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [])] },
      { name: 'Q2', categories: [entryCategory('e1', 'A1', [])] }
    ])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    const keys = wrapper.vm.headers.map((h) => h.key)
    expect(keys).toEqual(['subcategory', `q_${questionnaireIds[0]}`, `q_${questionnaireIds[1]}`])
  })

  it('cellLinesByKey returns sorted, non-empty answer lines for a given questionnaire/entry', () => {
    const { pinia, projectId, questionnaireIds } = seedProjectWithQuestionnaires([
      {
        name: 'Q1',
        categories: [entryCategory('e1', 'A1', [
          { technology: 'Zeta', status: 'Adopt', comments: '', answerType: 'Tool' },
          { technology: '', status: '', comments: '', answerType: '' },
          { technology: 'Alpha', status: 'Trial', comments: '', answerType: 'Tool' }
        ])]
      }
    ])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    const lines = wrapper.vm.cellLinesByKey(`q_${questionnaireIds[0]}`, 'e1')
    expect(lines.map((l) => l.option)).toEqual(['Alpha', 'Zeta'])
  })
})

describe('deviation detection (no reference questionnaire)', () => {
  it('flags differing statuses for the same technology across questionnaires as a deviation', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] },
      { name: 'Q2', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Retire', comments: '', answerType: 'Tool' }])] }
    ])
    // Deviation is only surfaced as a *violation* when explicitly disallowed for this entry.
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { e1: true } }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(true)
  })

  it('is not a violation when the entry is not flagged in deviationSettings, even if statuses differ', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] },
      { name: 'Q2', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Retire', comments: '', answerType: 'Tool' }])] }
    ])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: {} }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(false)
  })

  it('is not a violation when every questionnaire agrees on status', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] },
      { name: 'Q2', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] }
    ])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { e1: true } }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(false)
  })

  it('category-level deviationSettings disallow deviations for every entry in that category', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] },
      { name: 'Q2', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Retire', comments: '', answerType: 'Tool' }])] }
    ])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { 'cat-1': true } }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(true)
  })
})

describe('deviation detection (with a reference questionnaire)', () => {
  it('flags a non-reference questionnaire whose status disagrees with the reference', () => {
    const { pinia, store, projectId, questionnaireIds } = seedProjectWithQuestionnaires([
      { name: 'Reference', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] },
      { name: 'Other', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Retire', comments: '', answerType: 'Tool' }])] }
    ])
    store.setReferenceQuestionnaire(projectId, questionnaireIds[0])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { e1: true } }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(true)
  })

  it('flags a technology present in a non-reference questionnaire but absent from the reference', () => {
    // The reference must have at least one answer for this entry (an empty
    // reference short-circuits to "no deviation", see the test below), just
    // not one for the same technology as the non-reference questionnaire.
    const { pinia, store, projectId, questionnaireIds } = seedProjectWithQuestionnaires([
      { name: 'Reference', categories: [entryCategory('e1', 'A1', [{ technology: 'Angular', status: 'Hold', comments: '', answerType: 'Tool' }])] },
      { name: 'Other', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] }
    ])
    store.setReferenceQuestionnaire(projectId, questionnaireIds[0])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { e1: true } }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(true)
  })

  it('is not a violation when the reference questionnaire has no answers for the entry, even if others disagree', () => {
    // hasDeviation() short-circuits to "no deviation" whenever the reference
    // itself has zero lines for the entry - it never falls back to comparing
    // the non-reference questionnaires against each other in that case.
    const { pinia, store, projectId, questionnaireIds } = seedProjectWithQuestionnaires([
      { name: 'Reference', categories: [entryCategory('e1', 'A1', [])] },
      { name: 'Other', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] }
    ])
    store.setReferenceQuestionnaire(projectId, questionnaireIds[0])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { e1: true } }, pinia)
    expect(wrapper.vm.isViolation({ id: 'e1', categoryId: 'cat-1' })).toBe(false)
  })
})

describe('category violation rollup', () => {
  it('categoryHasViolation is true if any visible row in that category is a violation', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [{ id: 'cat-1', title: 'Architecture', entries: [{ id: 'e1', aspect: 'A1', answers: [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }] }] }] },
      { name: 'Q2', categories: [{ id: 'cat-1', title: 'Architecture', entries: [{ id: 'e1', aspect: 'A1', answers: [{ technology: 'Vue', status: 'Retire', comments: '', answerType: 'Tool' }] }] }] }
    ])
    const { wrapper } = mountMatrix({ projectId, deviationSettings: { e1: true } }, pinia)
    expect(wrapper.vm.categoryHasViolation('Architecture')).toBe(true)
    expect(wrapper.vm.categoryHasViolation('Nonexistent')).toBe(false)
  })
})

describe('unanswered detection', () => {
  it('isUnanswered is true when no questionnaire has an answer for the entry', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [])] }
    ])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    expect(wrapper.vm.isUnanswered('e1')).toBe(true)
  })

  it('isUnanswered is false once at least one questionnaire has a non-empty answer', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }])] }
    ])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    expect(wrapper.vm.isUnanswered('e1')).toBe(false)
  })
})

describe('visibility settings', () => {
  it('hides entries flagged individually or by category in visibilitySettings', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      {
        name: 'Q1',
        categories: [{
          id: 'cat-1',
          title: 'Architecture',
          entries: [
            { id: 'e1', aspect: 'A1', answers: [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }] },
            { id: 'e2', aspect: 'A2', answers: [{ technology: 'React', status: 'Adopt', comments: '', answerType: 'Tool' }] }
          ]
        }]
      }
    ])
    const { wrapper } = mountMatrix({ projectId, visibilitySettings: { e1: false } }, pinia)
    const visibleTitles = wrapper.vm.itemsForCategory('Architecture').map((i) => i.title)
    expect(visibleTitles).toEqual(['A2'])
  })

  it('hiddenCountForCategory counts hidden entries within a category', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      {
        name: 'Q1',
        categories: [{
          id: 'cat-1',
          title: 'Architecture',
          entries: [
            { id: 'e1', aspect: 'A1', answers: [] },
            { id: 'e2', aspect: 'A2', answers: [] }
          ]
        }]
      }
    ])
    const { wrapper } = mountMatrix({ projectId, visibilitySettings: { e1: false } }, pinia)
    expect(wrapper.vm.hiddenCountForCategory('Architecture')).toBe(1)
  })

  it('hideEntry emits an update:visibilitySettings event merging in the new flag', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [])] }
    ])
    const { wrapper } = mountMatrix({ projectId, visibilitySettings: { other: true } }, pinia)
    wrapper.vm.hideEntry('e1')
    const emitted = wrapper.emitted('update:visibilitySettings')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ other: true, e1: false })
  })
})

describe('statusChipColor', () => {
  it('maps known statuses to their chip colors and leaves unknowns as warning', () => {
    const { pinia, projectId } = seedProjectWithQuestionnaires([{ name: 'Q1', categories: [] }])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    expect(wrapper.vm.statusChipColor('Adopt')).toBe('success')
    expect(wrapper.vm.statusChipColor('Retire')).toBe('error')
    expect(wrapper.vm.statusChipColor('')).toBeUndefined()
    expect(wrapper.vm.statusChipColor('Trial')).toBe('warning')
  })
})

describe('navigation', () => {
  it('navigateToCellEntry resolves the questionnaire id from the column key and calls the store', () => {
    const { pinia, store, projectId, questionnaireIds } = seedProjectWithQuestionnaires([
      { name: 'Q1', categories: [entryCategory('e1', 'A1', [])] }
    ])
    const { wrapper } = mountMatrix({ projectId }, pinia)
    const spy = vi.spyOn(store, 'navigateToEntry')
    wrapper.vm.navigateToCellEntry(`q_${questionnaireIds[0]}`, 'cat-1', 'e1')
    expect(spy).toHaveBeenCalledWith(questionnaireIds[0], 'cat-1', 'e1')
  })
})
