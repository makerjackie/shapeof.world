import { describe, expect, it, vi } from 'vitest'
import { handleFeedbackPost } from './-feedback-handler'
import { newFeedbackSubmission, validateFeedback } from '~/lib/feedback'

const input = { category: 'problem', message: '页面一直停在加载画面。', replyTo: 'reader@example.com', worldId: 'ferrofluid', locale: 'zh', website: '' }
const request = (body: unknown = input, origin = 'https://shapeof.world') => new Request('https://shapeof.world/api/feedback', { method: 'POST', headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.1', 'idempotency-key': newFeedbackSubmission() }, body: JSON.stringify(body) })
const limiter = { limit: vi.fn(async () => ({ success: true })) }

describe('feedback delivery', () => {
  it('passes validated feedback and bounded context to the delivery service', async () => {
    const deliver = vi.fn(async (_input: unknown, reference: string, _context: unknown) => ({ status: 'accepted' as const, reference }))
    const response = await handleFeedbackPost(request(), { deliver }, limiter, 'release-1')
    expect(response.status).toBe(200)
    expect(deliver.mock.calls[0][0]).toMatchObject(input)
    expect(deliver.mock.calls[0][2]).toMatchObject({ device: 'desktop', release: 'release-1' })
    expect(JSON.stringify(deliver.mock.calls)).toContain('release-1')
    expect(JSON.stringify(deliver.mock.calls)).not.toContain('192.0.2.1')
    expect(await response.json()).toMatchObject({ status: 'accepted' })
  })
  it('does not acknowledge a failed send or unavailable transport', async () => {
    const deliver = vi.fn(async () => { throw new Error('provider failed') })
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect((await handleFeedbackPost(request(), { deliver }, limiter)).status).toBe(503)
    expect((await handleFeedbackPost(request())).status).toBe(503)
    expect(JSON.stringify(log.mock.calls)).not.toContain(input.message)
    log.mockRestore()
  })
  it('rejects cross-origin, header injection, arbitrary recipients and honeypots before sending', async () => {
    const deliver = vi.fn(async (_input: unknown, reference: string, _context: unknown) => ({ status: 'accepted' as const, reference }))
    expect((await handleFeedbackPost(request(input, 'https://elsewhere.example'), { deliver }, limiter)).status).toBe(403)
    for (const invalid of [{ ...input, to: 'other@example.com' }, { ...input, replyTo: 'a@b.com\r\nBcc: x@y.com' }, { ...input, website: 'spam' }, { ...input, message: 'a' }]) {
      expect((await handleFeedbackPost(request(invalid), { deliver }, limiter)).status).toBe(400)
    }
    expect(deliver).not.toHaveBeenCalled()
  })
  it('rate-limits and bounds undeclared request bodies', async () => {
    const deliver = vi.fn(async (_input: unknown, reference: string, _context: unknown) => ({ status: 'accepted' as const, reference }))
    expect((await handleFeedbackPost(request(), { deliver }, { limit: async () => ({ success: false }) })).status).toBe(429)
    expect((await handleFeedbackPost(request({ ...input, message: 'x'.repeat(20_000) }), { deliver }, limiter)).status).toBe(413)
    expect(deliver).not.toHaveBeenCalled()
  })
  it('allows feedback without a reply address and rejects malformed locale and world context', () => {
    expect(validateFeedback({ ...input, replyTo: '' })).toBeDefined()
    expect(validateFeedback({ ...input, locale: 'xx' })).toBeUndefined()
    expect(validateFeedback({ ...input, worldId: 'private/person@example.com' })).toBeUndefined()
  })
})
