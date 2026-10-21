import { validateFeedback, validFeedbackSubmission, type FeedbackInput } from '~/lib/feedback'
import type { DeliveryResult, FeedbackContext } from '~/lib/feedback-delivery'
import { readBoundedBody } from '~/lib/bounded-body'

export type FeedbackDeliveryService = { deliver(input: FeedbackInput, reference: string, context: FeedbackContext): Promise<DeliveryResult> }
type Limiter = Pick<RateLimit, 'limit'>

export async function handleFeedbackPost(request: Request, delivery?: FeedbackDeliveryService, limiter?: Limiter, release = ''): Promise<Response> {
  const respond = (status: number, data: Record<string, string>) => Response.json(data, {
    status, headers: { 'cache-control': 'no-store', ...(status === 429 ? { 'retry-after': '60' } : {}) },
  })
  if (request.headers.get('origin') !== new URL(request.url).origin) return respond(403, { error: 'origin' })
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return respond(415, { error: 'content_type' })
  if (!delivery || !limiter) return respond(503, { error: 'unavailable' })
  try {
    const ip = request.headers.get('cf-connecting-ip')
    if (!ip) return respond(503, { error: 'unavailable' })
    const allowed = await limiter.limit({ key: `feedback:${ip}` })
    if (!allowed.success) return respond(429, { error: 'rate_limit' })
  } catch { return respond(503, { error: 'unavailable' }) }

  let feedback
  try {
    const body = await readBoundedBody(request, 16_384)
    if (!body.ok) return respond(body.status, { error: 'body' })
    feedback = validateFeedback(JSON.parse(body.value))
  } catch { return respond(400, { error: 'body' }) }
  if (!feedback) return respond(400, { error: 'validation' })

  const reference = request.headers.get('idempotency-key') ?? ''
  if (!validFeedbackSubmission(reference)) return respond(400, { error: 'submission_expired' })
  const ua = request.headers.get('user-agent') ?? ''
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop'
  const browser = /Edg\//.test(ua) ? 'edge' : /Firefox|FxiOS/.test(ua) ? 'firefox' : /Chrome|CriOS/.test(ua) ? 'chrome' : /Safari/.test(ua) ? 'safari' : 'other'
  try {
    const result = await delivery.deliver(feedback, reference, { device, browser, release })
    return respond(result.status === 'accepted' ? 200 : result.status === 'conflict' ? 409 : result.status === 'rejected' ? 503 : 202, result)
  } catch {
    return respond(503, { error: 'unavailable' })
  }
}
