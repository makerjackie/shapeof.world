import type { WorldProvenance } from './worlds/types'

export const aiModels = {
  'gpt-5.6-sol': {
    label: 'GPT-5.6 Sol',
    provider: 'OpenAI',
    accent: '#4dd0e1',
  },
  'kimi-k3': {
    label: 'Kimi K3',
    provider: 'Moonshot AI',
    accent: '#ffd166',
  },
  'qwen-3.8-max-preview': {
    label: 'Qwen 3.8 Max Preview',
    provider: 'Alibaba Cloud',
    accent: '#b15cff',
  },
  'grok-4.5': {
    label: 'Grok 4.5',
    provider: 'xAI',
    accent: '#f0c36a',
  },
  'grok-4.6': {
    label: 'Grok 4.6',
    provider: 'xAI',
    accent: '#f0c36a',
  },
  'claude-opus-5': {
    label: 'Claude Opus 5',
    provider: 'Anthropic',
    accent: '#e05a8f',
  },
  'claude-fable-5': {
    label: 'Claude Fable 5',
    provider: 'Anthropic',
    accent: '#b48ef0',
  },
  'deepseek-v4-pro': {
    label: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    accent: '#7c9cff',
  },
  'glm-5.3': {
    label: 'GLM 5.3',
    provider: 'Zhipu AI',
    accent: '#e89a5c',
  },
  'ox-alpha': {
    label: 'ox-alpha',
    provider: 'Undisclosed',
    accent: '#57c7b8',
  },
} as const

export type AiModelId = keyof typeof aiModels

export const aiModelIds = Object.keys(aiModels) as Array<AiModelId>

export function isAiModelId(value: string): value is AiModelId {
  return value in aiModels
}

export function getAiModelLabel(id: AiModelId): string {
  return aiModels[id].label
}

export function getInitialModelId(provenance?: WorldProvenance): AiModelId | undefined {
  return provenance && 'initialModel' in provenance ? provenance.initialModel : undefined
}

export function getModelCreditId(provenance?: WorldProvenance): AiModelId | undefined {
  if (!provenance) return undefined
  return provenance.origin === 'open-source-adaptation'
    ? provenance.adaptationModel
    : getInitialModelId(provenance)
}
