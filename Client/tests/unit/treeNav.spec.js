import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import TreeNav from '../../src/components/TreeNav.vue'
import { mountWithStore } from './helpers/mountWithStore'

// Vuetify isn't installed in these tests (see helpers/mountWithStore.js), so
// Vue logs "Failed to resolve component: v-xxx" warnings for every template
// tag. That's expected noise here since we only assert on exposed vm logic,
// not on rendered Vuetify markup.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

async function flush (wrapper) {
  await wrapper.vm.$nextTick()
}

describe('tree structure', () => {
  it('builds tree items from projects with nested questionnaire children', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('Alpha')
    const qId = store.addQuestionnaire('Q1', [], projectId)
    await flush(wrapper)

    expect(wrapper.vm.treeItems).toHaveLength(1)
    expect(wrapper.vm.treeItems[0]).toMatchObject({ id: projectId, title: 'Alpha', type: 'project' })
    expect(wrapper.vm.treeItems[0].children).toHaveLength(1)
    expect(wrapper.vm.treeItems[0].children[0]).toMatchObject({ id: qId, title: 'Q1', type: 'questionnaire', projectId })
  })

  it('lists unassigned questionnaires separately from project trees', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('Alpha')
    store.addQuestionnaire('Assigned', [], projectId)
    // addQuestionnaire always requires a projectId param to attach; create standalone directly.
    store.workspace.questionnaires.push({ id: 'standalone-1', name: 'Standalone', categories: [] })
    await flush(wrapper)

    expect(wrapper.vm.standaloneQuestionnaires.map((q) => q.id)).toEqual(['standalone-1'])
  })
})

describe('project dialog flow', () => {
  it('creates a project with the trimmed name and closes the dialog', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    wrapper.vm.openProjectDialog()
    wrapper.vm.newProjectName = '  Widgets  '
    wrapper.vm.createProject()
    expect(store.workspace.projects.map((p) => p.name)).toEqual(['Widgets'])
    expect(wrapper.vm.projectDialogOpen).toBe(false)
  })

  it('ignores blank project names', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    wrapper.vm.newProjectName = '   '
    wrapper.vm.createProject()
    expect(store.workspace.projects).toHaveLength(0)
  })
})

describe('rename flow', () => {
  it('renames a project via the rename dialog', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('Old')
    const project = store.workspace.projects.find((p) => p.id === projectId)

    wrapper.vm.openRenameProjectDialog(project)
    expect(wrapper.vm.renameProjectName).toBe('Old')
    wrapper.vm.renameProjectName = 'New'
    wrapper.vm.confirmRenameProject()

    expect(store.workspace.projects[0].name).toBe('New')
    expect(wrapper.vm.renameProjectDialogOpen).toBe(false)
  })

  it('renames a questionnaire via the rename dialog', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const qId = store.addQuestionnaire('Old Q', [], projectId)
    const questionnaire = store.getQuestionnaireById(qId)

    wrapper.vm.openRenameQuestionnaireDialog(questionnaire)
    wrapper.vm.renameQuestionnaireName = 'New Q'
    wrapper.vm.confirmRenameQuestionnaire()

    expect(store.getQuestionnaireById(qId).name).toBe('New Q')
  })
})

describe('delete flow', () => {
  it('deletes an empty project immediately, without a confirmation dialog', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('Empty')
    wrapper.vm.deleteProject(projectId)
    expect(store.workspace.projects).toHaveLength(0)
    expect(wrapper.vm.deleteProjectDialogOpen).toBe(false)
  })

  it('asks for confirmation before deleting a project that still has questionnaires', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('Has Qs')
    store.addQuestionnaire('Q', [], projectId)

    wrapper.vm.deleteProject(projectId)
    expect(wrapper.vm.deleteProjectDialogOpen).toBe(true)
    expect(store.workspace.projects).toHaveLength(1) // not deleted yet

    wrapper.vm.confirmDeleteProject()
    expect(store.workspace.projects).toHaveLength(0)
  })

  it('always confirms before deleting a questionnaire', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const qId = store.addQuestionnaire('Q', [], projectId)
    const questionnaire = store.getQuestionnaireById(qId)

    wrapper.vm.deleteQuestionnaire(questionnaire)
    expect(wrapper.vm.deleteQuestionnaireDialogOpen).toBe(true)
    expect(store.getQuestionnaireById(qId)).toBeTruthy()

    wrapper.vm.confirmDeleteQuestionnaire()
    expect(store.getQuestionnaireById(qId)).toBeUndefined()
  })
})

describe('drag and drop', () => {
  it('moves a questionnaire to another project on drop', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectA = store.addProject('A')
    const projectB = store.addProject('B')
    const qId = store.addQuestionnaire('Q', [], projectA)

    wrapper.vm.onDragStart(projectA, qId)
    wrapper.vm.onDragOver(projectB)
    expect(wrapper.vm.isDropTarget(projectB)).toBe(true)
    wrapper.vm.onDrop(projectB)

    const a = store.workspace.projects.find((p) => p.id === projectA)
    const b = store.workspace.projects.find((p) => p.id === projectB)
    expect(a.questionnaireIds).not.toContain(qId)
    expect(b.questionnaireIds).toContain(qId)
    expect(wrapper.vm.isDropTarget(projectB)).toBe(false)
  })

  it('assigns a standalone questionnaire to a project on drop (fromProjectId null)', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    store.workspace.questionnaires.push({ id: 'standalone-1', name: 'Standalone', categories: [] })

    wrapper.vm.onDragStart(null, 'standalone-1')
    wrapper.vm.onDrop(projectId)

    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toContain('standalone-1')
  })

  it('reorders a questionnaire before a sibling within the same project on drop', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const q1 = store.addQuestionnaire('Q1', [], projectId)
    const q2 = store.addQuestionnaire('Q2', [], projectId)
    const q3 = store.addQuestionnaire('Q3', [], projectId)

    wrapper.vm.onDragStart(projectId, q3)
    wrapper.vm.onDropOnQuestionnaire(projectId, q1)

    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toEqual([q3, q1, q2])
  })

  it('unassigns a questionnaire when dropped on the "Unassigned" zone', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const qId = store.addQuestionnaire('Q', [], projectId)

    wrapper.vm.onDragStart(projectId, qId)
    wrapper.vm.onDragOverUnassigned()
    expect(wrapper.vm.unassignDropTarget).toBe(true)
    wrapper.vm.onDropUnassigned()

    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).not.toContain(qId)
    expect(wrapper.vm.unassignDropTarget).toBe(false)
  })

  it('onDragEnd clears all transient drag state', () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const qId = store.addQuestionnaire('Q', [], projectId)
    wrapper.vm.onDragStart(projectId, qId)
    wrapper.vm.onDragOver(projectId)
    wrapper.vm.onDragEnd()
    expect(wrapper.vm.isDragging).toBe(false)
    expect(wrapper.vm.isDropTarget(projectId)).toBe(false)
  })
})

describe('project import', () => {
  it('imports a project from a valid JSON file', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const payload = {
      project: { name: 'Imported P', radar: [] },
      questionnaires: [{ name: 'Q1', categories: [] }]
    }
    const file = new File([JSON.stringify(payload)], 'p.json', { type: 'application/json' })
    wrapper.vm.importFile = file
    wrapper.vm.confirmImport()

    await vi.waitUntil(() => store.workspace.projects.some((p) => p.name === 'Imported P'))
    expect(wrapper.vm.importDialogOpen).toBe(false)
  })

  it('sets an error message when the JSON is missing a project name', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const file = new File([JSON.stringify({ questionnaires: [] })], 'p.json', { type: 'application/json' })
    wrapper.vm.importFile = file
    wrapper.vm.confirmImport()

    await vi.waitUntil(() => !!wrapper.vm.importError)
    expect(wrapper.vm.importError).toContain('Missing project name')
  })

  it('sets an error message when a questionnaire is missing its categories array', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const payload = { project: { name: 'P' }, questionnaires: [{ name: 'Q1' }] }
    const file = new File([JSON.stringify(payload)], 'p.json', { type: 'application/json' })
    wrapper.vm.importFile = file
    wrapper.vm.confirmImport()

    await vi.waitUntil(() => !!wrapper.vm.importError)
    expect(wrapper.vm.importError).toContain('categories array')
  })
})

describe('questionnaire import', () => {
  it('imports a questionnaire into the target project after confirming the name', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')

    const payload = { name: 'Q Imported', categories: [{ id: 'c1', title: 'Cat', entries: [] }] }
    const file = new File([JSON.stringify(payload)], 'q.json', { type: 'application/json' })

    wrapper.vm.openQuestionnaireImportDialog(projectId)
    wrapper.vm.questionnaireImportFile = file
    wrapper.vm.proceedToNameDialog()

    await vi.waitUntil(() => wrapper.vm.questionnaireNameDialogOpen === true)
    expect(wrapper.vm.questionnaireImportName).toBe('Q Imported')

    wrapper.vm.confirmQuestionnaireImport()

    const project = store.workspace.projects.find((p) => p.id === projectId)
    const newQId = project.questionnaireIds[0]
    expect(store.getQuestionnaireById(newQId).name).toBe('Q Imported')
  })

  it('rejects a questionnaire file without a categories array', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const file = new File([JSON.stringify({ name: 'Bad' })], 'q.json', { type: 'application/json' })
    wrapper.vm.questionnaireImportFile = file
    wrapper.vm.proceedToNameDialog()

    await vi.waitUntil(() => !!wrapper.vm.questionnaireImportError)
    expect(wrapper.vm.questionnaireImportError).toContain('categories array')
  })
})

describe('menu action dispatch', () => {
  it('opens the new-project dialog when the store dispatches a "new-project" menu action', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    store.dispatchMenuAction('new-project')
    await flush(wrapper)
    expect(wrapper.vm.projectDialogOpen).toBe(true)
    expect(store.pendingMenuAction).toBeNull()
  })

  it('opens the questionnaire dialog scoped to the target project for "new-questionnaire"', async () => {
    const { wrapper } = mountWithStore(TreeNav)
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    store.dispatchMenuAction('new-questionnaire', { projectId })
    await flush(wrapper)
    expect(wrapper.vm.questionnaireDialogOpen).toBe(true)

    // targetProjectId is internal state; verify it was captured correctly by
    // completing the flow and checking the questionnaire lands in the right project.
    wrapper.vm.newQuestionnaireName = 'Q from menu'
    wrapper.vm.createQuestionnaire()
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toHaveLength(1)
    expect(store.getQuestionnaireById(project.questionnaireIds[0]).name).toBe('Q from menu')
  })
})
