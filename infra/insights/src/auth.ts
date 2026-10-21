const encoder = new TextEncoder()

export const sessionCookieName = '__Host-shape_insights'
export const sessionMaxAgeSeconds = 7 * 24 * 60 * 60

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean
  }
  if (typeof subtle.timingSafeEqual === 'function') {
    return subtle.timingSafeEqual(left, right)
  }

  // Node's Web Crypto does not expose the Workers extension used in production.
  // Both inputs here are fixed-length SHA-256/HMAC digests, so this fallback is
  // only used by local tests and retains a fixed amount of work.
  let difference = 0
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

export async function passwordMatches(provided: string, expected: string): Promise<boolean> {
  if (!provided || !expected || provided.length > 128 || expected.length > 128) return false
  const [providedDigest, expectedDigest] = await Promise.all([digest(provided), digest(expected)])
  return timingSafeEqual(providedDigest, expectedDigest)
}

export async function createSessionToken(
  secret: string,
  nowMilliseconds = Date.now(),
): Promise<string> {
  if (secret.length < 32) throw new Error('Insights session secret must be at least 32 characters.')
  const expiresAt = Math.floor(nowMilliseconds / 1000) + sessionMaxAgeSeconds
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)))
  const payload = `v1.${expiresAt}.${nonce}`
  const signature = toBase64Url(await hmac(payload, secret))
  return `${payload}.${signature}`
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMilliseconds = Date.now(),
): Promise<boolean> {
  if (!token || secret.length < 32 || token.length > 256) return false
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return false
  const expiresAt = Number(parts[1])
  const nowSeconds = Math.floor(nowMilliseconds / 1000)
  if (!Number.isInteger(expiresAt) || expiresAt <= nowSeconds) return false
  if (expiresAt > nowSeconds + sessionMaxAgeSeconds + 60) return false
  if (!/^[A-Za-z0-9_-]{20,40}$/u.test(parts[2])) return false

  const providedSignature = fromBase64Url(parts[3])
  if (!providedSignature) return false
  const expectedSignature = await hmac(parts.slice(0, 3).join('.'), secret)
  return timingSafeEqual(providedSignature, expectedSignature)
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() !== name) continue
    return part.slice(separator + 1).trim()
  }
}

export function sessionCookie(token: string): string {
  return `${sessionCookieName}=${token}; Path=/; Max-Age=${sessionMaxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`
}

export function expiredSessionCookie(): string {
  return `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
}
