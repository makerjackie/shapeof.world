export const feedbackEmail = 'hi@shapeof.world'
// The feedback Worker sends to this already-verified destination. Incoming
// support mail reaches the same inbox through Cloudflare Email Routing.
export const feedbackDeliveryAddress = 'contact@01mvp.com'
export const feedbackCategories = ['problem', 'suggestion', 'topic', 'correction'] as const
export type FeedbackCategory = (typeof feedbackCategories)[number]
export const feedbackSubmissionPattern = /^\d{13}\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function newFeedbackSubmission() { return `${Date.now()}.${crypto.randomUUID()}` }
export function validFeedbackSubmission(value: string, now = Date.now()) {
  const timestamp = Number(value.split('.')[0])
  return feedbackSubmissionPattern.test(value) && timestamp <= now + 300_000 && now - timestamp < 24 * 60 * 60 * 1000
}
export type FeedbackInput = {
  category: FeedbackCategory
  message: string
  replyTo: string
  worldId: string
  locale: 'zh' | 'en'
  website: string
}

export function feedbackSearch(input: Record<string, unknown>): { world?: string; kind?: FeedbackCategory } {
  return {
    ...(typeof input.world === 'string' && /^[a-z0-9-]{1,80}$/.test(input.world) ? { world: input.world } : {}),
    ...(feedbackCategories.includes(input.kind as FeedbackCategory) ? { kind: input.kind as FeedbackCategory } : {}),
  }
}

export function validateFeedback(input: unknown): FeedbackInput | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return
  const value = input as Record<string, unknown>
  if (Object.keys(value).some((key) => !['category', 'message', 'replyTo', 'worldId', 'locale', 'website'].includes(key))) return
  if (!feedbackCategories.includes(value.category as FeedbackCategory)) return
  if (typeof value.message !== 'string' || value.message.trim().length < 5 || value.message.length > 3000) return
  if (typeof value.replyTo !== 'string' || value.replyTo.length > 254 || (value.replyTo && !/^[a-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value.replyTo))) return
  if (typeof value.worldId !== 'string' || (value.worldId && !/^[a-z0-9-]{1,80}$/.test(value.worldId))) return
  if (value.locale !== 'zh' && value.locale !== 'en') return
  if (value.website !== '') return
  return { ...value, message: value.message.trim() } as FeedbackInput
}
