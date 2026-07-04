import { describe, expect, it } from 'vitest'
import { filterAuxiliaryCandidatePool } from './modelCapabilities'

describe('filterAuxiliaryCandidatePool', () => {
  it('keeps all models when no model is tagged auxiliary', () => {
    const models = [
      { id: 'fast', capabilities: ['reasoning'] },
      { id: 'cheap', capabilities: [] },
    ]

    expect(filterAuxiliaryCandidatePool(models)).toEqual(models)
  })

  it('restricts the pool to auxiliary-tagged models when any are tagged', () => {
    const models = [
      { id: 'general', capabilities: ['tools'] },
      { id: 'memory', capabilities: ['auxiliary'] },
    ]

    expect(filterAuxiliaryCandidatePool(models)).toEqual([models[1]])
  })
})
