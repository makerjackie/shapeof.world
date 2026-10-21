import { DurableObject } from 'cloudflare:workers'
import { feedbackDeliveryAddress, type FeedbackInput } from '~/lib/feedback'
import { deliverFeedbackOnce, type DeliveryRecord, type FeedbackContext } from '~/lib/feedback-delivery'

/** One object per submission. Only its digest and delivery state are persisted. */
export class FeedbackDelivery extends DurableObject<Env> {
  async deliver(input: FeedbackInput, reference: string, context: FeedbackContext) {
    const result = await deliverFeedbackOnce(input, reference, {
      reserve: record => this.ctx.storage.transaction(async transaction => {
        const existing = await transaction.get<DeliveryRecord>('delivery')
        if (existing) return existing
        await transaction.put('delivery', record)
        await transaction.setAlarm(Date.now() + 7 * 86_400_000)
        return undefined
      }),
      complete: record => this.ctx.storage.put('delivery', record),
    }, () => this.env.FEEDBACK_EMAIL.send({
      from: 'feedback@shapeof.world', to: feedbackDeliveryAddress,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      subject: `[Shape of the World][${input.category}] ${input.worldId || 'website'} #${reference}`,
      text: [input.message, '', `World: ${input.worldId || 'website'}`, `Language: ${input.locale}`,
        `Environment: ${context.device} / ${context.browser}`, `Receiving release: ${context.release || 'unknown'}`,
        `Reference: ${reference}`, `Received: ${new Date().toISOString()}`].join('\n'),
    }))
    // Operational status only; no message, email address, IP or raw provider error.
    console.info(JSON.stringify({ type: 'feedback_delivery', status: result.status, reference, release: context.release }))
    return result
  }

  async alarm() { await this.ctx.storage.deleteAll() }
}
