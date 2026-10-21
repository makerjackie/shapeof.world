import { describe, expect, it } from 'vitest'

import {
  createSessionToken,
  passwordMatches,
  readCookie,
  sessionCookieName,
  verifySessionToken,
} from './auth'

const secret = 'test-session-secret-with-more-than-thirty-two-characters'

describe('Insights authentication', () => {
  it('compares passwords without accepting empty or oversized values', async () => {
    await expect(passwordMatches('correct horse', 'correct horse')).resolves.toBe(true)
    await expect(passwordMatches('correct Horse', 'correct horse')).resolves.toBe(false)
    await expect(passwordMatches('', '')).resolves.toBe(false)
    await expect(passwordMatches('x'.repeat(129), 'x'.repeat(129))).resolves.toBe(false)
  })

  it('creates signed sessions and rejects tampering or expiry', async () => {
    const now = Date.UTC(2026, 7, 9, 5, 0, 0)
    const token = await createSessionToken(secret, now)

    await expect(verifySessionToken(token, secret, now + 1_000)).resolves.toBe(true)
    const lastDot = token.lastIndexOf('.')
    const signature = token.slice(lastDot + 1)
    const tamperedSignature = `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`
    await expect(verifySessionToken(`${token.slice(0, lastDot + 1)}${tamperedSignature}`, secret, now + 1_000)).resolves.toBe(false)
    await expect(verifySessionToken(token, `${secret}-wrong`, now + 1_000)).resolves.toBe(false)
    await expect(verifySessionToken(token, secret, now + 8 * 24 * 60 * 60 * 1_000)).resolves.toBe(false)
  })

  it('reads only the requested cookie', () => {
    expect(readCookie(`theme=dark; ${sessionCookieName}=signed-token; lang=zh`, sessionCookieName))
      .toBe('signed-token')
    expect(readCookie('theme=dark', sessionCookieName)).toBeUndefined()
  })
})
