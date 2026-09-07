import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import TechRadar from '../../src/components/projects/TechRadar.vue'
import { createActivePinia, mountWithStore } from './helpers/mountWithStore'

// Vuetify isn't installed in these tests, so <v-dialog> renders its default
// slot content unconditionally (no real show/hide logic) instead of being
// gated by v-model. That would eagerly mount MdEditor, which then throws on
// jsdom's incomplete MutationObserver support. Stub out the markdown editor
// and the custom-export dialog: none of these tests touch their rendered
// markup, only the logic exposed via `wrapper.vm`.
function mountRadar(props, pinia) {
  return mountWithStore(TechRadar, {
    props,
    pinia,
    global: { stubs: { MdEditor: true, MdPreview: true, CustomHtmlExportDialog: true } }
  })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function makeCategory(title, entryId, answers) {
  return {
    id: `cat-${title}`,
    title,
    entries: [{ id: entryId, aspect: 'Aspect', answers }]
  }
}

// Creates its own active Pinia instance (returned alongside the store) so the
// caller can hand that exact instance to mountWithStore() and have the
// mounted component see the same seeded data.
function seedProjectWithRadarRefs(categoryDefs) {
  const pinia = createActivePinia()
  const store = useWorkspaceStore()
  const projectId = store.addProject('P')
  const categories = categoryDefs.map(({ title, entryId, answers }) => makeCategory(title, entryId, answers))
  const questionnaireId = store.addQuestionnaire('Q', categories, projectId)
  categoryDefs.forEach(({ entryId, answers }) => {
    answers.forEach((a) => store.toggleProjectRadarRef(projectId, entryId, a.technology, questionnaireId))
  })
  return { pinia, store, projectId, questionnaireId }
}

describe('allBlips', () => {
  it('derives effective status/category from the matching questionnaire answer', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: 'Adopt', comments: 'nice', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    expect(wrapper.vm.allBlips).toHaveLength(1)
    const blip = wrapper.vm.allBlips[0]
    expect(blip.name).toBe('Vue')
    expect(blip.status).toBe('Adopt')
    expect(blip.categoryTitle).toBe('Architecture')
    expect(blip.ring).toBe(0) // Adopt => ring 0
    expect(blip.overrideStatus).toBe('') // no manual override yet
  })

  it('prefers a manual radar status/category override over the questionnaire answer', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    store.setRadarOverride(projectId, 'e1', 'Vue', { status: 'Retire', comment: '', categoryOverride: 'Legacy' })
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    expect(blip.status).toBe('Retire')
    expect(blip.ring).toBe(4)
    expect(blip.categoryTitle).toBe('Legacy')
    expect(blip.overrideStatus).toBe('Retire')
    expect(blip.overrideCategoryTitle).toBe('Legacy')
    expect(blip.naturalCategoryTitle).toBe('Architecture')
  })
})

describe('quadrant auto-assignment', () => {
  it('assigns the first three categories to dedicated quadrants and groups the rest into quadrant 4', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      },
      {
        title: 'Backend',
        entryId: 'e2',
        answers: [{ technology: 'B', status: 'Adopt', comments: '', answerType: 'Tool' }]
      },
      {
        title: 'Cloud',
        entryId: 'e3',
        answers: [{ technology: 'C', status: 'Adopt', comments: '', answerType: 'Tool' }]
      },
      {
        title: 'DevOps',
        entryId: 'e4',
        answers: [{ technology: 'D', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    // Alphabetical: Architecture, Backend, Cloud, DevOps
    const q1 = wrapper.vm.quadrants.find((q) => q.label === 'Quadrant 1')
    const q2 = wrapper.vm.quadrants.find((q) => q.label === 'Quadrant 2')
    const q3 = wrapper.vm.quadrants.find((q) => q.label === 'Quadrant 3')
    const q4 = wrapper.vm.quadrants.find((q) => q.label === 'Quadrant 4')

    expect(q1.categories).toEqual(['Architecture'])
    expect(q2.categories).toEqual(['Backend'])
    expect(q3.categories).toEqual(['Cloud'])
    expect(q4.categories).toEqual(['DevOps'])
    expect(wrapper.vm.unassignedCategories).toEqual([])
  })

  it('derives an auto-generated quadrant label when no manual override is set', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)
    expect(wrapper.vm.effectiveQuadrantLabels[1]).toBe('Architecture')
  })

  it('combines multiple categories into one label with a "+N" suffix', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      { title: 'A1', entryId: 'e1', answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }] },
      { title: 'A2', entryId: 'e2', answers: [{ technology: 'B', status: 'Adopt', comments: '', answerType: 'Tool' }] },
      { title: 'A3', entryId: 'e3', answers: [{ technology: 'C', status: 'Adopt', comments: '', answerType: 'Tool' }] },
      { title: 'A4', entryId: 'e4', answers: [{ technology: 'D', status: 'Adopt', comments: '', answerType: 'Tool' }] }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)
    // A4 falls into quadrant 4 alongside nothing else here, so no "+N" yet;
    // manually push a second category into quadrant 4 to exercise the label combiner.
    const assignments = store.getProjectRadarCategoryQuadrants(projectId)
    assignments.A1 = 3
    store.setProjectRadarCategoryQuadrants(projectId, assignments)
    expect(wrapper.vm.effectiveQuadrantLabels[3]).toMatch(/^A\d \(\+\d\)$/)
  })
})

describe('status visibility toggling', () => {
  it('hides a ring and its blips when toggled off', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    expect(wrapper.vm.isStatusVisible('Adopt')).toBe(true)
    wrapper.vm.toggleStatusVisibility('Adopt')
    expect(wrapper.vm.isStatusVisible('Adopt')).toBe(false)
    expect(wrapper.vm.positionedBlips.length).toBe(0)
  })

  it('refuses to hide the last visible status', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)
    ;['Adopt', 'Trial', 'Assess', 'Hold'].forEach((s) => wrapper.vm.toggleStatusVisibility(s))
    // Only "Retire" left visible; try to hide it too.
    wrapper.vm.toggleStatusVisibility('Retire')
    expect(wrapper.vm.isStatusVisible('Retire')).toBe(true)
  })
})

describe('computedRings', () => {
  it('produces one boundary per visible ring, ending exactly at OUTER_R', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    expect(wrapper.vm.computedRings).toHaveLength(6) // 5 rings + leading 0
    expect(wrapper.vm.computedRings[5]).toBe(wrapper.vm.OUTER_R)

    wrapper.vm.toggleStatusVisibility('Retire')
    expect(wrapper.vm.computedRings).toHaveLength(5) // one fewer ring boundary
    expect(wrapper.vm.computedRings[4]).toBe(wrapper.vm.OUTER_R)
  })
})

describe('positioned blips', () => {
  it('assigns a sequential 1-based index in legend order (Q1, Q0, Q2, Q3)', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      },
      {
        title: 'Backend',
        entryId: 'e2',
        answers: [{ technology: 'B', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    const indices = wrapper.vm.positionedBlips.map((b) => b.index)
    expect(indices.sort()).toEqual([1, 2])
    // Every positioned blip has numeric coordinates within the SVG canvas.
    wrapper.vm.positionedBlips.forEach((b) => {
      expect(typeof b.x).toBe('number')
      expect(typeof b.y).toBe('number')
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x).toBeLessThanOrEqual(wrapper.vm.SIZE)
    })
  })

  it('places mandatory blips before non-mandatory ones within the same ring', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [
          { technology: 'Zeta', status: 'Adopt', comments: '', answerType: 'Tool' },
          { technology: 'Alpha', status: 'Adopt', comments: '', answerType: 'Tool' }
        ]
      }
    ])
    store.setRadarOverride(projectId, 'e1', 'Zeta', { status: 'Adopt', comment: '', mandatory: true })
    const { wrapper } = mountRadar({ projectId }, pinia)

    const names = wrapper.vm.positionedBlips.map((b) => b.name)
    expect(names[0]).toBe('Zeta') // mandatory sorts first despite alphabetical order
  })
})

describe('remove / edit flows', () => {
  it('confirmRemove + executeRemove deletes the radar ref via the store', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    wrapper.vm.confirmRemove(blip)
    expect(wrapper.vm.confirmDialog).toBe(true)
    wrapper.vm.executeRemove()

    expect(store.isProjectRadarRef(projectId, 'e1', 'A')).toBe(false)
    expect(wrapper.vm.confirmDialog).toBe(false)
  })

  it('openEdit seeds the edit form from the blip, saveEdit persists via setRadarOverride', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'A', status: 'Adopt', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    wrapper.vm.openEdit(blip)
    expect(wrapper.vm.editForm.status).toBe('adopt')
    expect(wrapper.vm.editDialog).toBe(true)

    wrapper.vm.editForm.status = 'retire'
    wrapper.vm.editForm.mandatory = true
    wrapper.vm.saveEdit()

    const override = store.getRadarOverride(projectId, 'e1', 'A')
    expect(override.status).toBe('retire')
    expect(override.mandatory).toBe(true)
    expect(wrapper.vm.editDialog).toBe(false)
  })
})

describe('tooltip helpers', () => {
  it('clampTooltipX keeps the tooltip within [4, SIZE - width - 4]', () => {
    const pinia = createActivePinia()
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const { wrapper } = mountRadar({ projectId }, pinia)
    expect(wrapper.vm.clampTooltipX(-50)).toBe(4)
    expect(wrapper.vm.clampTooltipX(10000)).toBe(wrapper.vm.SIZE - wrapper.vm.tooltipWidth - 4)
  })

  it('truncate shortens long strings and appends an ellipsis', () => {
    const pinia = createActivePinia()
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const { wrapper } = mountRadar({ projectId }, pinia)
    expect(wrapper.vm.truncate('hello world', 5)).toBe('hell…')
    expect(wrapper.vm.truncate('hi', 5)).toBe('hi')
  })
})

describe('exportRadarJson (ThoughtWorks BYOR format)', () => {
  it('serializes blips with name/ring/quadrant/description fields', () => {
    const { pinia, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: 'Adopt', comments: 'nice', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    const captured = []
    const OriginalBlob = global.Blob
    global.Blob = class extends OriginalBlob {
      constructor(parts, opts) {
        super(parts, opts)
        captured.push(parts.join(''))
      }
    }
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    wrapper.vm.exportRadarJson()

    const data = JSON.parse(captured[0])
    // description falls back to the questionnaire answer's comment ("nice")
    // since no radar-level comment override was set for this blip.
    expect(data).toEqual([
      {
        name: 'Vue',
        ring: 'Adopt',
        quadrant: 'Architecture',
        isNew: 'FALSE',
        description: 'nice'
      }
    ])

    global.Blob = OriginalBlob
    vi.restoreAllMocks()
  })
})

// Reads the persisted radar entry straight from the store — the component does
// not expose `project` on its instance, and these tests need to distinguish an
// *uncurated* entry from an assessed one.
function radarEntryOf(store, projectId, index = 0) {
  return store.workspace.projects.find((p) => p.id === projectId).radar[index]
}

// Sets an answer's status *after* the blip was added. toggleProjectRadarRef
// snapshots the answer status into entry.status at add time, so this is the
// realistic way an entry ends up with an empty status while its answer carries
// one — the only situation in which the inheritance below is observable.
function setAnswerStatusAfterAdd(store, entryId, technology, status) {
  for (const questionnaire of store.workspace.questionnaires) {
    for (const category of questionnaire.categories || []) {
      const entry = (category.entries || []).find((e) => e.id === entryId)
      const answer = entry && (entry.answers || []).find((a) => a.technology === technology)
      if (answer) {
        answer.status = status
        return
      }
    }
  }
  throw new Error(`no answer ${technology} on entry ${entryId}`)
}

// ── Characterization: status inheritance vs. Hold fallback ───────────────────
//
// Two behaviors that today produce the same visible result for a blip without
// a curated status, but have different causes — and only ONE of them is meant
// to change later (the ring fallback). Pinned separately so that changing the
// fallback cannot silently take the inheritance with it.
//
//   1. effectiveStatus = entry.status || answer.status
//      A blip without a curated radar status inherits the answer's status.
//      This behavior STAYS. If a change to the ring fallback turns this red,
//      the change went too far.
//
//   2. statusToRing maps an empty or unknown status to ring 3 (Hold)
//      This behavior is DELIBERATELY REPLACED later: such blips are to be
//      listed below the diagram instead of being placed on the Hold ring.
//      When that happens, only this block may be rewritten — with a rationale
//      in the commit.
describe('status inheritance (behavior 1 — stays)', () => {
  it('inherits the answer status when the radar entry carries none', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: '', comments: '', answerType: 'Tool' }]
      }
    ])
    setAnswerStatusAfterAdd(store, 'e1', 'Vue', 'Trial')
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    // The radar entry itself has no curated status …
    expect(radarEntryOf(store, projectId).status).toBe('')
    // … so the answer's status is the effective one — an *assessed* blip,
    // not an unset one, and it lands on the ring of the inherited status.
    expect(blip.status).toBe('Trial')
    expect(blip.ring).toBe(1)
    expect(blip.overrideStatus).toBe('')
  })

  it('still inherits when only the answer is assessed and the ring fallback would also yield Hold', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: '', comments: '', answerType: 'Tool' }]
      }
    ])
    setAnswerStatusAfterAdd(store, 'e1', 'Vue', 'Hold')
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    expect(radarEntryOf(store, projectId).status).toBe('')
    // Ring 3 here is the *inherited* Hold, not the fallback. The status string
    // is what tells the two apart, which is why it is asserted explicitly.
    expect(blip.status).toBe('Hold')
    expect(blip.ring).toBe(3)
  })
})

describe('Hold fallback for status-less blips (behavior 2 — changes later)', () => {
  it('places a blip with no status on either side on the Hold ring', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: '', comments: '', answerType: 'Tool' }]
      }
    ])
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    expect(radarEntryOf(store, projectId).status).toBe('')
    expect(blip.status).toBe('')
    expect(blip.ring).toBe(3)
  })

  it('places a blip with an unrecognized status on the Hold ring', () => {
    const { pinia, store, projectId } = seedProjectWithRadarRefs([
      {
        title: 'Architecture',
        entryId: 'e1',
        answers: [{ technology: 'Vue', status: '', comments: '', answerType: 'Tool' }]
      }
    ])
    store.setRadarOverride(projectId, 'e1', 'Vue', { status: 'Evaluate', comment: '', categoryOverride: '' })
    const { wrapper } = mountRadar({ projectId }, pinia)

    const blip = wrapper.vm.allBlips[0]
    expect(blip.status).toBe('Evaluate')
    expect(blip.ring).toBe(3)
  })
})

// ── Vocabulary assignment in the blip detail dialog (Todo 2.2) ───────────────
//
// Tested through wrapper.vm, not markup — Vuetify is deliberately not installed
// in these tests, so only the exposed logic is meaningful.
describe('blip detail — vocabulary assignment', () => {
  function seedBlip({ status = 'Adopt', answerType = 'Tool', technology = 'Dotnet Core' } = {}) {
    const seeded = seedProjectWithRadarRefs([
      {
        title: 'Stack',
        entryId: 'e1',
        answers: [{ technology, status, comments: '', answerType }]
      }
    ])
    const { wrapper } = mountRadar({ projectId: seeded.projectId }, seeded.pinia)
    return { ...seeded, wrapper }
  }

  it('reports a blip whose name is not in the vocabulary as unresolved', () => {
    const { wrapper } = seedBlip()
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTerm).toBeNull()
    expect(wrapper.vm.allBlips[0].termId).toBe('')
  })

  it('resolves a blip through the vocabulary, by name and by alias', () => {
    const { wrapper, store } = seedBlip()
    const termId = store.createTerm('.NET Core', 'tool')
    store.addAlias(termId, 'dotnet core')
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTerm.id).toBe(termId)
    expect(wrapper.vm.allBlips[0].termId).toBe(termId)
    expect(wrapper.vm.allBlips[0].termName).toBe('.NET Core')
  })

  it('offers a similar term as a suggestion, without assigning anything', () => {
    const { wrapper, store } = seedBlip()
    const termId = store.createTerm('.NET Core', 'tool')
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTermSuggestions.map((suggestion) => suggestion.term.id)).toEqual([termId])
    // Still unresolved — a suggestion is not an assignment.
    expect(wrapper.vm.detailTerm).toBeNull()
  })

  it('offers no suggestion once the name resolves', () => {
    const { wrapper, store } = seedBlip()
    const termId = store.createTerm('.NET Core', 'tool')
    store.addAlias(termId, 'dotnet core')
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTermSuggestions).toEqual([])
  })

  it('assigns the blip to a term, after which it resolves', () => {
    const { wrapper, store } = seedBlip()
    const termId = store.createTerm('.NET Core', 'tool')
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.assignDetailBlipToTerm(termId)).toBe(true)
    expect(wrapper.vm.detailTerm.id).toBe(termId)
    expect(store.workspace.vocabulary[0].aliases).toEqual(['dotnet core'])
  })

  it('pre-fills the kind from answerType and creates the term straight away', () => {
    const { wrapper, store } = seedBlip({ answerType: 'Practice' })
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTermKind).toBe('practice')
    expect(wrapper.vm.canCreateTermFromDetail).toBe(true)

    const termId = wrapper.vm.createTermFromDetailBlip()
    expect(store.workspace.vocabulary).toHaveLength(1)
    expect(store.workspace.vocabulary[0]).toMatchObject({ id: termId, name: 'Dotnet Core', kind: 'practice' })
  })

  it('stays disabled without an answerType until a kind is chosen — kind is never guessed', () => {
    const { wrapper, store } = seedBlip({ answerType: '' })
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTermKind).toBe('')
    expect(wrapper.vm.canCreateTermFromDetail).toBe(false)
    expect(wrapper.vm.createTermFromDetailBlip()).toBe('')
    expect(store.workspace.vocabulary).toEqual([])

    wrapper.vm.pendingTermKind = 'tool'
    expect(wrapper.vm.canCreateTermFromDetail).toBe(true)
    wrapper.vm.createTermFromDetailBlip()
    expect(store.workspace.vocabulary[0].kind).toBe('tool')
  })

  it('ignores an answerType that is neither Tool nor Practice', () => {
    const { wrapper } = seedBlip({ answerType: 'Framework' })
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    expect(wrapper.vm.detailTermKind).toBe('')
    expect(wrapper.vm.canCreateTermFromDetail).toBe(false)
  })

  it('does not carry a pending kind over to the next blip opened', () => {
    const { wrapper } = seedBlip({ answerType: '' })
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])
    wrapper.vm.pendingTermKind = 'tool'

    wrapper.vm.openDetail(wrapper.vm.allBlips[0])
    expect(wrapper.vm.pendingTermKind).toBe('')
    expect(wrapper.vm.canCreateTermFromDetail).toBe(false)
  })

  it('refuses to create a term whose name already resolves', () => {
    const { wrapper, store } = seedBlip()
    store.createTerm('Dotnet Core', 'tool')
    wrapper.vm.openDetail(wrapper.vm.allBlips[0])

    // detailTerm resolves, so the create path is closed off entirely.
    expect(wrapper.vm.detailTerm).not.toBeNull()
    expect(wrapper.vm.canCreateTermFromDetail).toBe(false)
    expect(store.workspace.vocabulary).toHaveLength(1)
  })

  it('exposes the blip kind following the DE-11 precedence', () => {
    const { wrapper, store } = seedBlip({ answerType: 'Tool' })
    expect(wrapper.vm.allBlips[0].kind).toBe('tool')

    const termId = store.createTerm('Dotnet Core', 'practice')
    expect(termId).toBeTruthy()
    // The resolved term wins over answerType.
    expect(wrapper.vm.allBlips[0].kind).toBe('practice')
  })
})
