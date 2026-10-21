import type { FeedbackInput } from './feedback'
export type DeliveryResult = { status: 'accepted' | 'pending' | 'unconfirmed' | 'rejected' | 'conflict'; reference: string }
export type DeliveryRecord = DeliveryResult & { fingerprint: string; messageId?: string; updatedAt: number }
export type DeliveryStore = {
  reserve: (record: DeliveryRecord) => Promise<DeliveryRecord | undefined>
  complete: (record: DeliveryRecord) => Promise<void>
}
export type FeedbackContext = { device: string; browser: string; release: string }

export async function deliverFeedbackOnce(
  input: FeedbackInput, reference: string, store: DeliveryStore,
  send: () => Promise<{ messageId?: string }>,
): Promise<DeliveryResult> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(input)))
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const pending: DeliveryRecord = { reference, fingerprint, status: 'pending', updatedAt: Date.now() }
  const existing = await store.reserve(pending)
  if (existing) {
    if (existing.fingerprint !== fingerprint) return { status: 'conflict', reference }
    return { status: existing.status === 'pending' && Date.now() - existing.updatedAt > 120_000 ? 'unconfirmed' : existing.status, reference }
  }
  // Persist intent before the external send. An ambiguous send is never automatically repeated.
  let result: DeliveryRecord
  try {
    const sent = await send()
    result = { ...pending, status: 'accepted', messageId: sent.messageId, updatedAt: Date.now() }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    const rejected = ['E_SENDER_NOT_VERIFIED', 'E_SENDER_DOMAIN_NOT_AVAILABLE', 'E_RECIPIENT_NOT_ALLOWED', 'E_RECIPIENT_SUPPRESSED', 'E_VALIDATION_ERROR', 'E_DAILY_LIMIT_EXCEEDED', 'E_RATE_LIMIT_EXCEEDED'].includes(code)
    result = { ...pending, status: rejected ? 'rejected' : 'unconfirmed', updatedAt: Date.now() }
  }
  await store.complete(result)
  return { status: result.status, reference }
}
