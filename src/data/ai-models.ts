import type { WorldProvenance } from './worlds/types'

/** All OpenAI models share one provider name and accent colour. */
const openAiModel = (label: string) => ({
  label,
  provider: 'OpenAI',
  accent: '#4dd0e1',
})

export const aiModels = {
  'gpt-5': openAiModel('GPT-5'),
  'gpt-6.1-sol': openAiModel('GPT-6.1 Sol'),
  'gpt-6': openAiModel('GPT-6'),
  'gpt-6-astra': openAiModel('GPT-6 Astra'),
  'gpt-5.6-sol': openAiModel('GPT-5.6 Sol'),
  'gpt-5.6-luna': openAiModel('GPT-5.6 Luna'),
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
  'claude-opus-5-5': {
    label: 'Claude Opus 5.5',
    provider: 'Anthropic',
    accent: '#e05a8f',
  },
  'claude-sonnet-5-5': {
    label: 'Claude Sonnet 5.5',
    provider: 'Anthropic',
    accent: '#e05a8f',
  },
  'claude-fable-5': {
    label: 'Claude Fable 5',
    provider: 'Anthropic',
    accent: '#b48ef0',
  },
  'claude-fable-5-1': {
    label: 'Claude Fable 5.1',
    provider: 'Anthropic',
    accent: '#b48ef0',
  },
  'deepseek-v4-pro': {
    label: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    accent: '#7c9cff',
  },
  'deepseek-v4.1-flash': {
    label: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    accent: '#7c9cff',
  },
  'deepseek-flash': {
    label: 'DeepSeek Flash',
    provider: 'DeepSeek',
    accent: '#7c9cff',
  },
  'glm-5.3': {
    label: 'GLM 5.3',
    provider: 'Zhipu AI',
    accent: '#e89a5c',
  },
  'union-alpha': {
    label: 'Union Alpha',
    provider: 'Undisclosed',
    accent: '#57c7b8',
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
