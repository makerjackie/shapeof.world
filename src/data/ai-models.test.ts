import { describe, expect, it } from 'vitest'

import { aiModelIds, getInitialModelId, getModelCreditId } from './ai-models'
import { failedWorlds } from './failed-worlds'
import { getWorld, worlds } from './worlds'

describe('AI model collections', () => {
  it('keeps public model ids canonical', () => {
    expect(aiModelIds).toEqual([
      'gpt-5',
      'gpt-6.1-sol',
      'gpt-6',
      'gpt-6-astra',
      'gpt-5.6-sol',
      'gpt-5.6-luna',
      'kimi-k3',
      'qwen-3.8-max-preview',
      'grok-4.5',
      'grok-4.6',
      'claude-opus-5',
      'claude-opus-5-5',
      'claude-sonnet-5-5',
      'claude-fable-5',
      'claude-fable-5-1',
      'deepseek-v4-pro',
      'deepseek-v4.1-flash',
      'deepseek-flash',
      'glm-5.3',
      'union-alpha',
      'ox-alpha',
    ])
  })

  it('builds the confirmed Kimi collection from prototypes and credited adaptations', () => {
    const kimiWorlds = worlds.filter((world) => getModelCreditId(world.provenance) === 'kimi-k3')

    expect(kimiWorlds).toHaveLength(11)
    expect(getInitialModelId(getWorld('solar-system')?.provenance)).toBe('kimi-k3')
    expect(getInitialModelId(getWorld('black-hole-flyby')?.provenance)).toBeUndefined()
    expect(getModelCreditId(getWorld('black-hole-flyby')?.provenance)).toBeUndefined()
    expect(getInitialModelId(getWorld('cow-anatomy')?.provenance)).toBeUndefined()
    expect(getInitialModelId(getWorld('beef-hotpot')?.provenance)).toBeUndefined()
  })

  it('uses the canonical Qwen id instead of the qodercn session alias', () => {
    const recordedModels = [
      ...worlds.map((world) => getInitialModelId(world.provenance)),
      ...failedWorlds.map((world) => world.initialModel),
    ].filter(Boolean)

    expect(recordedModels).not.toContain('qodercn')
    expect(aiModelIds).toContain('qwen-3.8-max-preview')
  })

  it('does not rewrite later optimization as initial creation', () => {
    for (const id of ['strange-attractors', 'electric-field', 'fluid-sim']) {
      expect(getInitialModelId(getWorld(id)?.provenance), id).toBeUndefined()
    }
  })

  it('keeps the vendored black-hole flyby credited to its open-source project', () => {
    expect(getWorld('black-hole-flyby')?.provenance).toEqual({
      origin: 'open-source-adaptation',
      sourceProject: 'Eric Bruneton Black Hole Shader',
      sourceUrl: 'https://github.com/ebruneton/black_hole_shader',
    })
  })
})
