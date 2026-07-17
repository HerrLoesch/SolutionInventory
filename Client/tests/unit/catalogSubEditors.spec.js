import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppliesToEditor from '../../src/components/catalog/AppliesToEditor.vue'
import ExamplesEditor from '../../src/components/catalog/ExamplesEditor.vue'
import MetadataOptionsForm from '../../src/components/catalog/MetadataOptionsForm.vue'

// Vuetify isn't installed in these tests (see helpers/mountWithStore.js), so
// Vue logs "Failed to resolve component: v-xxx" warnings for every template
// tag. That's expected noise here since we only assert on exposed vm logic,
// not on rendered Vuetify markup.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

const METADATA_OPTIONS = {
  executionType: [
    { label: 'Web Application', description: '' },
    { label: 'Desktop Application', description: '' }
  ],
  architecturalRole: [
    { label: 'Standalone System', description: '' },
    { label: 'Domain Service / Microservice', description: '' }
  ]
}

describe('AppliesToEditor', () => {
  it('adding a condition picks the first unused field with an empty value list', () => {
    const target = {}
    const wrapper = mount(AppliesToEditor, { props: { target, metadataOptions: METADATA_OPTIONS } })

    wrapper.vm.addCondition()

    expect(target.appliesTo).toEqual({ executionType: [] })
    expect(wrapper.vm.conditions).toEqual([{ field: 'executionType', values: [] }])
  })

  it('setting condition values writes them onto the target appliesTo', () => {
    const target = { appliesTo: { executionType: [] } }
    const wrapper = mount(AppliesToEditor, { props: { target, metadataOptions: METADATA_OPTIONS } })

    wrapper.vm.setConditionValues('executionType', ['Web Application', 'Desktop Application'])

    expect(target.appliesTo.executionType).toEqual(['Web Application', 'Desktop Application'])
    expect(wrapper.vm.previewText).toBe('Visible when Execution Type = Web Application or Desktop Application')
  })

  it('switching a condition field moves its values to the new field', () => {
    const target = { appliesTo: { executionType: ['Web Application'] } }
    const wrapper = mount(AppliesToEditor, { props: { target, metadataOptions: METADATA_OPTIONS } })

    wrapper.vm.setConditionField('executionType', 'architecturalRole')

    expect(target.appliesTo).toEqual({ architecturalRole: ['Web Application'] })
  })

  it('removing the last condition deletes appliesTo entirely rather than leaving an empty object', () => {
    const target = { appliesTo: { executionType: ['Web Application'] } }
    const wrapper = mount(AppliesToEditor, { props: { target, metadataOptions: METADATA_OPTIONS } })

    wrapper.vm.removeCondition('executionType')

    expect(target.appliesTo).toBeUndefined()
  })

  it('removing one of several conditions keeps the others and the appliesTo object', () => {
    const target = { appliesTo: { executionType: ['Web Application'], architecturalRole: ['Standalone System'] } }
    const wrapper = mount(AppliesToEditor, { props: { target, metadataOptions: METADATA_OPTIONS } })

    wrapper.vm.removeCondition('executionType')

    expect(target.appliesTo).toEqual({ architecturalRole: ['Standalone System'] })
  })

  it('does not offer to add a condition once every metadata field is already used', () => {
    const target = { appliesTo: { executionType: [], architecturalRole: [] } }
    const wrapper = mount(AppliesToEditor, { props: { target, metadataOptions: METADATA_OPTIONS } })

    expect(wrapper.vm.hasUnusedField).toBe(false)
  })
})

describe('ExamplesEditor', () => {
  it('addExample("practice") lazily initializes the examples array and appends a blank practice row', () => {
    const entry = {}
    const wrapper = mount(ExamplesEditor, { props: { entry } })

    wrapper.vm.addExample('practice')

    expect(entry.examples).toEqual([{ type: 'practice', label: '', description: '' }])
  })

  it('addExample("tool") appends a blank tool row', () => {
    const entry = { examples: [{ type: 'practice', label: 'TDD', description: '' }] }
    const wrapper = mount(ExamplesEditor, { props: { entry } })

    wrapper.vm.addExample('tool')

    expect(entry.examples).toEqual([
      { type: 'practice', label: 'TDD', description: '' },
      { type: 'tool', label: '', description: '' }
    ])
  })

  it('move swaps an example with its neighbor and is a no-op past either boundary', () => {
    const entry = {
      examples: [
        { type: 'practice', label: 'A' },
        { type: 'practice', label: 'B' },
        { type: 'tool', label: 'C' }
      ]
    }
    const wrapper = mount(ExamplesEditor, { props: { entry } })

    wrapper.vm.move(0, -1) // already first — no-op
    expect(entry.examples.map((e) => e.label)).toEqual(['A', 'B', 'C'])

    wrapper.vm.move(0, 1)
    expect(entry.examples.map((e) => e.label)).toEqual(['B', 'A', 'C'])

    wrapper.vm.move(2, 1) // already last — no-op
    expect(entry.examples.map((e) => e.label)).toEqual(['B', 'A', 'C'])
  })

  it('removeExample removes the targeted row regardless of type', () => {
    const entry = {
      examples: [
        { type: 'practice', label: 'A' },
        { type: 'tool', label: 'B' }
      ]
    }
    const wrapper = mount(ExamplesEditor, { props: { entry } })

    wrapper.vm.removeExample(0)

    expect(entry.examples).toEqual([{ type: 'tool', label: 'B' }])
  })
})

describe('MetadataOptionsForm', () => {
  it('lists the fields present in the category metadataOptions', () => {
    const category = { metadataOptions: { executionType: [], architecturalRole: [] } }
    const wrapper = mount(MetadataOptionsForm, { props: { category } })

    expect(wrapper.vm.fields).toEqual(['executionType', 'architecturalRole'])
  })

  it('addOption appends a blank label/description option to the field', () => {
    const category = { metadataOptions: { executionType: [] } }
    const wrapper = mount(MetadataOptionsForm, { props: { category } })

    wrapper.vm.addOption('executionType')

    expect(category.metadataOptions.executionType).toEqual([{ label: '', description: '' }])
  })

  it('addOption lazily creates the field list when metadataOptions or the field is missing', () => {
    const category = {}
    const wrapper = mount(MetadataOptionsForm, { props: { category } })

    wrapper.vm.addOption('executionType')

    expect(category.metadataOptions.executionType).toEqual([{ label: '', description: '' }])
  })

  it('removeOption removes only the targeted option', () => {
    const category = {
      metadataOptions: {
        executionType: [
          { label: 'Web Application', description: '' },
          { label: 'Desktop Application', description: '' }
        ]
      }
    }
    const wrapper = mount(MetadataOptionsForm, { props: { category } })

    wrapper.vm.removeOption('executionType', 0)

    expect(category.metadataOptions.executionType).toEqual([{ label: 'Desktop Application', description: '' }])
  })
})
