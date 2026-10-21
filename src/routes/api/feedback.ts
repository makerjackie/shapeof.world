import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { handleFeedbackPost } from './-feedback-handler'

export const Route = createFileRoute('/api/feedback')({ server: { handlers: {
  POST: ({ request }) => {
    // Local email bindings simulate delivery. Do not present that as a real submission.
    const production = new URL(request.url).hostname === 'shapeof.world'
    return handleFeedbackPost(request, production ? { deliver: (input, reference, context) => env.FEEDBACK_DELIVERY.getByName(reference).deliver(input, reference, context) } : undefined, env.FEEDBACK_RATE_LIMITER, env.CF_VERSION_METADATA?.id)
  },
} } })
