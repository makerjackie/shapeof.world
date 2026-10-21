import { describe, expect, it, vi } from 'vitest'
import { deliverFeedbackOnce, type DeliveryRecord } from './feedback-delivery'
import type { FeedbackInput } from './feedback'

const input: FeedbackInput = { category: 'problem', message: 'The page did not load.', replyTo: '', worldId: '', locale: 'en', website: '' }
function memoryStore() {
  let stored: DeliveryRecord | undefined
  return {
    reserve: async (record: DeliveryRecord) => { const existing = stored; stored ??= record; return existing },
    complete: async (record: DeliveryRecord) => { stored = record },
  }
}

describe('feedback send deduplication', () => {
  it('sends concurrent retries once and returns the saved result afterwards', async () => {
    const store = memoryStore()
    const send = vi.fn(async () => ({ messageId: 'message-1' }))
    await Promise.all([deliverFeedbackOnce(input, 'reference', store, send), deliverFeedbackOnce(input, 'reference', store, send)])
    expect(await deliverFeedbackOnce(input, 'reference', store, send)).toEqual({ status: 'accepted', reference: 'reference' })
    expect(send).toHaveBeenCalledTimes(1)
    expect((await deliverFeedbackOnce({ ...input, message: 'Different message' }, 'reference', store, send)).status).toBe('conflict')
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('does not send an ambiguous provider failure again', async () => {
    const store = memoryStore()
    const send = vi.fn(async () => { throw new Error('Connection closed after send') })
    expect((await deliverFeedbackOnce(input, 'reference', store, send)).status).toBe('unconfirmed')
    expect((await deliverFeedbackOnce(input, 'reference', store, send)).status).toBe('unconfirmed')
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('distinguishes a known sender rejection from an uncertain outcome', async () => {
    const send = async () => { throw { code: 'E_SENDER_NOT_VERIFIED' } }
    expect((await deliverFeedbackOnce(input, 'reference', memoryStore(), send)).status).toBe('rejected')
  })
})
