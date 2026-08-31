/**
 * Encoding for "share the exact thing I just made" links.
 *
 * A shared link should not drop people onto a generic first screen. It should
 * restore the parameters, view and mode the sharer had on screen, so the person
 * who clicks arrives at the same discovery rather than an empty default.
 *
 * The wire format is deliberately readable rather than base64: a link that
 * shows `s=shape:teardrop,wind:0.095` tells a suspicious reader what it will do,
 * and tells us what went wrong when a world restores badly. Keys are short
 * identifiers, values are URL-encoded, pairs are comma separated.
 */

export type ShareStateValue = string | number | boolean
export type ShareState = Record<string, ShareStateValue>

/** Query parameter carrying the packed state. */
export const SHARE_STATE_PARAM = 's'

const PAIR_SEPARATOR = ','
const KEY_SEPARATOR = ':'
/** Guard against a hostile or corrupted link bloating the router state. */
const MAX_ENCODED_LENGTH = 600
const MAX_ENTRIES = 24
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{0,23}$/

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Numbers are rounded to five significant decimals. Sliders produce values like
 * 0.09500000000000001, and a link full of float noise looks broken.
 */
function encodeValue(value: ShareStateValue): string | undefined {
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (isFiniteNumber(value)) return String(Math.round(value * 1e5) / 1e5)
  if (typeof value === 'string') {
    if (value.length === 0 || value.length > 64) return undefined
    return encodeURIComponent(value)
  }
  return undefined
}

export function encodeShareState(state: ShareState): string {
  const parts: Array<string> = []
  for (const [key, value] of Object.entries(state)) {
    if (parts.length >= MAX_ENTRIES) break
    if (!KEY_PATTERN.test(key)) continue
    const encoded = encodeValue(value)
    if (encoded === undefined) continue
    parts.push(`${key}${KEY_SEPARATOR}${encoded}`)
  }
  const packed = parts.join(PAIR_SEPARATOR)
  return packed.length > MAX_ENCODED_LENGTH ? '' : packed
}

/**
 * Decode a packed state. Values stay strings; callers coerce with the readers
 * below, because only the world itself knows whether `mode` is a number or a
 * name. Malformed input yields an empty object rather than throwing: a broken
 * link should degrade to the default experience, never to an error screen.
 */
export function decodeShareState(packed: string | undefined | null): Record<string, string> {
  if (!packed || packed.length > MAX_ENCODED_LENGTH) return {}
  const out: Record<string, string> = {}
  for (const part of packed.split(PAIR_SEPARATOR)) {
    const index = part.indexOf(KEY_SEPARATOR)
    if (index <= 0) continue
    const key = part.slice(0, index)
    if (!KEY_PATTERN.test(key)) continue
    if (Object.keys(out).length >= MAX_ENTRIES) break
    try {
      out[key] = decodeURIComponent(part.slice(index + 1))
    } catch {
      // A truncated percent-escape should not take the whole link down.
      continue
    }
  }
  return out
}

/** Read a number, clamped, falling back when the link omits or corrupts it. */
export function readNumber(
  source: Record<string, string>,
  key: string,
  fallback: number,
  range?: { min: number; max: number },
): number {
  const raw = source[key]
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

/** Read a value constrained to a known set, so a link cannot inject a mode. */
export function readOption<T extends string>(
  source: Record<string, string>,
  key: string,
  allowed: ReadonlyArray<T>,
  fallback: T,
): T {
  const raw = source[key]
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

export function readBoolean(
  source: Record<string, string>,
  key: string,
  fallback: boolean,
): boolean {
  const raw = source[key]
  if (raw === undefined) return fallback
  return raw === '1' || raw === 'true'
}

/** Put the packed state onto a URL, or strip the parameter when empty. */
export function withShareState(url: string, packed: string): string {
  try {
    const next = new URL(url)
    if (packed) next.searchParams.set(SHARE_STATE_PARAM, packed)
    else next.searchParams.delete(SHARE_STATE_PARAM)
    return next.toString()
  } catch {
    return url
  }
}
