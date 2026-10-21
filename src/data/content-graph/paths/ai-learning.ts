import type { Path } from '../types'

export default {
  id: 'ai-learning',
  slug: 'how-machines-learn',
  publication: 'draft',
  title: '机器如何学习',
  titleEn: 'How Machines Learn',
  description: '从优化和神经网络进入词元、注意力、生成模型和强化学习。',
  descriptionEn: 'Move from optimization and neural networks into tokens, attention, generative models, and reinforcement learning.',
  worldIds: ["neural-playground","cnn-vision"],
  stopLabels: [{"zh":"神经网络","en":"Neural net"},{"zh":"视觉","en":"Vision"}],
  order: 2,
} satisfies Path
