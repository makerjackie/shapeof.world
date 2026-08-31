import { isFailedWorldId } from '~/data/failed-worlds'

import {
  getAnonymousId,
  getSessionId,
  safeSessionStorage,
  type SafeStorage,
} from './storage'

export const oneWorldEvents = [
  'page_view',
  'page_engaged',
  'web_vital_lcp',
  'web_vital_inp',
  'web_vital_cls',
  'web_vital_ttfb',
  'daily_open',
  'feed_slide',
  'issue_open',
  'experience_open',
  'experience_engaged',
  'experience_duration',
  'experience_start',
  'first_interaction',
  'experience_complete',
  'experience_error',
  'experience_load_timeout',
  'path_next_click',
  'issue_next_click',
  'recommended_next_click',
  'random_world_click',
  'guide_shown',
  'guide_complete',
  'guide_skip',
  'guide_autoplay_start',
  'guide_autoplay_pause',
  'ask_open',
  'ask_suggestion',
  'ask_question',
  'ask_response',
  'ask_error',
  'atlas_save',
  'share_open',
  'share',
  'follow_prompt_shown',
  'follow_prompt_click',
  'pwa_install',
] as const

export type OneWorldEvent = (typeof oneWorldEvents)[number]

export const analyticsSchemaVersion = 1 as const

export type EventPayload = {
  event: OneWorldEvent
  worldId?: string
  issueId?: string
  value?: number | string | boolean
}

export type AnalyticsPayload = EventPayload & {
  schemaVersion: typeof analyticsSchemaVersion
  anonymousId: string
  sessionId: string
  editorialDay: string
  locale: 'en' | 'zh'
  referrerHost: string
  path: string
  campaignSource?: string
  campaignName?: string
  campaignContent?: string
  occurredAt: string
}

export type AnalyticsValidationResult =
  | { ok: true; value: AnalyticsPayload }
  | { ok: false; error: string }

const allowedEvents = new Set<OneWorldEvent>(oneWorldEvents)
const allowedPayloadKeys = new Set([
  'schemaVersion',
  'event',
  'anonymousId',
  'sessionId',
  'editorialDay',
  'locale',
  'referrerHost',
  'path',
  'campaignSource',
  'campaignName',
  'campaignContent',
  'worldId',
  'issueId',
  'value',
  'occurredAt',
])
const contentIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const lowCardinalityValuePattern = /^[a-z0-9_-]*$/i
const campaignDimensionPattern = /^[a-z0-9_-]+$/i
const anonymousIdPattern = /^ow_anon_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const sessionIdPattern = /^ow_session_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const campaignSourceKey = 'oneworld.analytics.campaign-source.v1'
const campaignNameKey = 'oneworld.analytics.campaign-name.v1'
const campaignContentKey = 'oneworld.analytics.campaign-content.v1'

type AnalyticsContext = {
  anonymousId: string
  sessionId: string
  date: Date
  documentLanguage: string
  navigatorLanguage: string
  referrer: string
  path: string
  campaignSource?: string
  campaignName?: string
  campaignContent?: string
}

function validBoundedString(value: unknown, maximumLength: number, allowEmpty = false): value is string {
  return typeof value === 'string'
    && value.length <= maximumLength
    && (allowEmpty || value.length > 0)
    && !/[\u0000-\u001f\u007f]/.test(value)
}

function validEditorialDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function validOccurredAt(value: unknown): value is string {
  if (!validBoundedString(value, 32)) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function isIpAddressHost(value: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(':') || value.startsWith('[')
}

const knownExactPaths = new Set([
  '/',
  '/about',
  '/atlas',
  '/changelog',
  '/failures',
  '/making',
  '/made-with',
  '/other',
  '/legacy',
  '/not-found',
  '/explore-unknown',
  '/sources',
  '/story',
  '/worlds',
])

function normalizeAnalyticsPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] ?? path
  const collapsed = pathname.replace(/\/{2,}/g, '/')
  if (collapsed.length > 1 && collapsed.endsWith('/')) return collapsed.slice(0, -1)
  return collapsed || '/'
}

function isKnownAnalyticsPath(path: string): boolean {
  const normalized = normalizeAnalyticsPath(path)
  return knownExactPaths.has(normalized)
    || /^\/explore\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
    || /^\/made-with\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
}

function isAnalyticsPath(value: string): boolean {
  return isKnownAnalyticsPath(value)
}

/**
 * Unknown URLs are folded into a few buckets so the weekly report can tell
 * 404s and leftover v1 paths apart, without recording arbitrary path text.
 */
export function coarsenAnalyticsPath(path: string): string {
  const normalized = normalizeAnalyticsPath(path)
  if (isKnownAnalyticsPath(normalized)) return normalized
  if (/^\/(?:zh|en)(?:\/|$)/i.test(normalized)) return '/legacy'
  if (/^\/(?:t|lab|history|w)(?:\/|$)/i.test(normalized)) return '/legacy'
  if (/^\/explore\//i.test(normalized)) return '/explore-unknown'
  return '/not-found'
}

function validCampaignDimension(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string'
    && value.length <= maximumLength
    && (value.length === 0 || campaignDimensionPattern.test(value))
}

export function validateAnalyticsPayload(input: unknown): AnalyticsValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Payload must be an object' }
  }

  const payload = input as Record<string, unknown>
  if (Object.keys(payload).some((key) => !allowedPayloadKeys.has(key))) {
    return { ok: false, error: 'Payload contains unsupported fields' }
  }
  if (payload.schemaVersion !== analyticsSchemaVersion) {
    return { ok: false, error: 'Unsupported schema version' }
  }
  if (typeof payload.event !== 'string' || !allowedEvents.has(payload.event as OneWorldEvent)) {
    return { ok: false, error: 'Invalid event' }
  }
  if (!validBoundedString(payload.anonymousId, 48) || !anonymousIdPattern.test(payload.anonymousId)) {
    return { ok: false, error: 'Invalid anonymous id' }
  }
  if (!validBoundedString(payload.sessionId, 52) || !sessionIdPattern.test(payload.sessionId)) {
    return { ok: false, error: 'Invalid session id' }
  }
  if (!validEditorialDay(payload.editorialDay)) {
    return { ok: false, error: 'Invalid editorial day' }
  }
  if (payload.locale !== 'en' && payload.locale !== 'zh') {
    return { ok: false, error: 'Invalid locale' }
  }
  if (
    !validBoundedString(payload.referrerHost, 253, true)
    || /[\s/@?#]/.test(payload.referrerHost)
    || isIpAddressHost(payload.referrerHost)
  ) {
    return { ok: false, error: 'Invalid referrer host' }
  }
  if (
    !validBoundedString(payload.path, 240)
    || !isAnalyticsPath(payload.path)
  ) {
    return { ok: false, error: 'Invalid path' }
  }
  if (
    payload.campaignSource !== undefined
    && !validCampaignDimension(payload.campaignSource, 40)
  ) {
    return { ok: false, error: 'Invalid campaign source' }
  }
  if (
    payload.campaignName !== undefined
    && !validCampaignDimension(payload.campaignName, 80)
  ) {
    return { ok: false, error: 'Invalid campaign name' }
  }
  if (
    payload.campaignContent !== undefined
    && !validCampaignDimension(payload.campaignContent, 80)
  ) {
    return { ok: false, error: 'Invalid campaign content' }
  }
  if (
    payload.worldId !== undefined
    && (!validBoundedString(payload.worldId, 80) || !contentIdentifierPattern.test(payload.worldId))
  ) {
    return { ok: false, error: 'Invalid world id' }
  }
  if (
    payload.issueId !== undefined
    && (!validBoundedString(payload.issueId, 80) || !contentIdentifierPattern.test(payload.issueId))
  ) {
    return { ok: false, error: 'Invalid issue id' }
  }
  if (
    payload.value !== undefined
    && !(
      typeof payload.value === 'boolean'
      || (typeof payload.value === 'number' && Number.isFinite(payload.value))
      || (
        validBoundedString(payload.value, 40, true)
        && lowCardinalityValuePattern.test(payload.value)
      )
    )
  ) {
    return { ok: false, error: 'Invalid value' }
  }
  if (
    payload.event === 'experience_duration'
    && (
      typeof payload.value !== 'number'
      || payload.value < 0.25
      || payload.value > 1_800
    )
  ) {
    return { ok: false, error: 'Invalid experience duration' }
  }
  if (!validOccurredAt(payload.occurredAt)) {
    return { ok: false, error: 'Invalid event time' }
  }

  return { ok: true, value: payload as AnalyticsPayload }
}

export function getAnalyticsEditorialDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function referrerHost(referrer: string): string {
  if (!referrer) return ''
  try {
    const host = new URL(referrer).hostname.slice(0, 253)
    return isIpAddressHost(host) ? '' : host
  } catch {
    return ''
  }
}

function normalizedCampaignDimension(value: string | null, maximumLength: number): string {
  const normalized = value?.trim().toLowerCase() ?? ''
  return validCampaignDimension(normalized, maximumLength) ? normalized : ''
}

/**
 * Keeps the first valid UTM attribution for the current tab session. Only three
 * allowlisted, low-cardinality values survive; the full query string never does.
 */
export function resolveCampaignAttribution(
  search: string,
  storage: SafeStorage = safeSessionStorage,
): Pick<
  AnalyticsContext,
  'campaignSource' | 'campaignName' | 'campaignContent'
> {
  const storedSource = normalizedCampaignDimension(storage.get(campaignSourceKey), 40)
  if (storedSource) {
    return {
      campaignSource: storedSource,
      campaignName: normalizedCampaignDimension(storage.get(campaignNameKey), 80),
      campaignContent: normalizedCampaignDimension(storage.get(campaignContentKey), 80),
    }
  }

  const params = new URLSearchParams(search)
  const campaignSource = normalizedCampaignDimension(params.get('utm_source'), 40)
  if (!campaignSource) {
    return { campaignSource: '', campaignName: '', campaignContent: '' }
  }

  const campaignName = normalizedCampaignDimension(params.get('utm_campaign'), 80)
  const campaignContent = normalizedCampaignDimension(params.get('utm_content'), 80)
  storage.set(campaignSourceKey, campaignSource)
  if (campaignName) storage.set(campaignNameKey, campaignName)
  if (campaignContent) storage.set(campaignContentKey, campaignContent)

  return { campaignSource, campaignName, campaignContent }
}

function currentContext(): AnalyticsContext | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') return
  try {
    return {
      anonymousId: getAnonymousId(),
      sessionId: getSessionId(),
      date: new Date(),
      documentLanguage: document.documentElement.lang,
      navigatorLanguage: navigator.language,
      referrer: document.referrer,
      path: window.location.pathname,
      ...resolveCampaignAttribution(window.location.search),
    }
  } catch {
    return
  }
}

export function buildAnalyticsPayload(
  payload: EventPayload,
  context: AnalyticsContext,
): AnalyticsPayload {
  const language = context.documentLanguage || context.navigatorLanguage
  return {
    ...payload,
    schemaVersion: analyticsSchemaVersion,
    anonymousId: context.anonymousId,
    sessionId: context.sessionId,
    editorialDay: getAnalyticsEditorialDay(context.date),
    locale: language.toLowerCase().startsWith('zh') ? 'zh' : 'en',
    referrerHost: referrerHost(context.referrer),
    path: coarsenAnalyticsPath(context.path),
    campaignSource: normalizedCampaignDimension(context.campaignSource ?? '', 40),
    campaignName: normalizedCampaignDimension(context.campaignName ?? '', 80),
    campaignContent: normalizedCampaignDimension(context.campaignContent ?? '', 80),
    occurredAt: context.date.toISOString(),
  }
}

export function shouldTrackEvent(payload: EventPayload): boolean {
  return !payload.worldId || !isFailedWorldId(payload.worldId)
}

export function trackEvent(payload: EventPayload): void {
  // Failure Museum artifacts have their own archive context and must not
  // contaminate the engagement, completion, recommendation, or Atlas signals
  // used to judge published worlds.
  if (!shouldTrackEvent(payload)) return

  const context = currentContext()
  if (!context) return

  const body = JSON.stringify(buildAnalyticsPayload(payload, context))

  if (navigator.sendBeacon) {
    const queued = navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }))
    if (queued) return
  }

  void fetch('/api/event', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => undefined)
}
