import { describe, expect, it } from 'vitest'

import {
  analyticsSchemaVersion,
  buildAnalyticsPayload,
  coarsenAnalyticsPath,
  resolveCampaignAttribution,
  shouldTrackEvent,
  validateAnalyticsPayload,
} from './analytics'
import type { SafeStorage } from './storage'

describe('analytics payload enrichment', () => {
  it('tracks published-world and non-world events', () => {
    expect(shouldTrackEvent({ event: 'experience_open', worldId: 'solar-system' })).toBe(true)
    expect(shouldTrackEvent({ event: 'page_view' })).toBe(true)
  })

  it('adds anonymous retention context without leaking referrer URLs or query strings', () => {
    const payload = buildAnalyticsPayload(
      { event: 'experience_complete', worldId: 'living-earth', issueId: 'earth-never-rests' },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T16:01:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'en-US',
        referrer: 'https://example.com/private/path?email=hidden@example.com',
        path: '/explore/living-earth',
      },
    )

    expect(payload).toMatchObject({
      schemaVersion: analyticsSchemaVersion,
      editorialDay: '2026-07-12',
      locale: 'zh',
      referrerHost: 'example.com',
      path: '/explore/living-earth',
    })
    expect(JSON.stringify(payload)).not.toContain('private/path')
    expect(JSON.stringify(payload)).not.toContain('hidden@example.com')
  })

  it('drops literal IP referrers', () => {
    for (const retired of ['/atlas', '/story', '/bookshelf', '/made-with', '/made-with/gpt-5-6-sol']) {
      expect(coarsenAnalyticsPath(retired)).toBe('/not-found')
    }

    const failureMuseum = buildAnalyticsPayload(
      { event: 'page_view' },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T12:00:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'zh-CN',
        referrer: '',
        path: '/failures',
      },
    )
    expect(failureMuseum.path).toBe('/failures')

    const makingGallery = buildAnalyticsPayload(
      { event: 'page_view' },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T12:00:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'zh-CN',
        referrer: '',
        path: '/making',
      },
    )
    expect(makingGallery.path).toBe('/making')
  })

  it('accepts coarse visible-engagement milestones without collecting content', () => {
    const payload = buildAnalyticsPayload(
      { event: 'experience_engaged', worldId: 'ferrofluid', value: '15s' },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T12:00:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'zh-CN',
        referrer: '',
        path: '/explore/ferrofluid',
      },
    )

    expect(validateAnalyticsPayload(payload)).toMatchObject({ ok: true })
    expect(payload.value).toBe('15s')
  })

  it('accepts numeric Core Web Vitals without collecting page content', () => {
    const payload = buildAnalyticsPayload(
      { event: 'web_vital_lcp', value: 2_431.7 },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T12:00:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'zh-CN',
        referrer: '',
        path: '/explore/ferrofluid',
      },
    )

    expect(validateAnalyticsPayload(payload)).toMatchObject({ ok: true })
    expect(payload.value).toBe(2_431.7)
  })

  it('accepts bounded next-world navigation events and target ids', () => {
    const payload = buildAnalyticsPayload(
      { event: 'path_next_click', worldId: 'tokenizer', value: 'next-token' },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T12:00:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'zh-CN',
        referrer: '',
        path: '/explore/black-hole-flyby',
      },
    )

    expect(validateAnalyticsPayload(payload)).toMatchObject({ ok: true })
    expect(payload.value).toBe('next-token')
  })

  it('keeps only bounded campaign dimensions in the analytics payload', () => {
    const payload = buildAnalyticsPayload(
      { event: 'page_engaged', worldId: 'phantom-jam', value: '30s' },
      {
        anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
        sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
        date: new Date('2026-07-11T12:00:00.000Z'),
        documentLanguage: 'zh-CN',
        navigatorLanguage: 'zh-CN',
        referrer: '',
        path: '/explore/phantom-jam',
        campaignSource: 'XHS',
        campaignName: 'Phantom-Jam-2026W31',
        campaignContent: 'Hook-A',
      },
    )

    expect(payload).toMatchObject({
      campaignSource: 'xhs',
      campaignName: 'phantom-jam-2026w31',
      campaignContent: 'hook-a',
    })
    expect(validateAnalyticsPayload(payload)).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...payload,
      campaignContent: 'private@example.com',
    })).toMatchObject({ ok: false })
  })

  it('keeps first-touch campaign attribution for the current tab session', () => {
    const values = new Map<string, string>()
    const storage: SafeStorage = {
      get: (key) => values.get(key) ?? null,
      set: (key, value) => {
        values.set(key, value)
        return true
      },
      remove: (key) => values.delete(key),
    }

    expect(resolveCampaignAttribution(
      '?utm_source=XHS&utm_campaign=phantom-jam-2026w31&utm_content=hook-a',
      storage,
    )).toEqual({
      campaignSource: 'xhs',
      campaignName: 'phantom-jam-2026w31',
      campaignContent: 'hook-a',
    })
    expect(resolveCampaignAttribution(
      '?utm_source=x&utm_campaign=another-post&utm_content=hook-b',
      storage,
    )).toEqual({
      campaignSource: 'xhs',
      campaignName: 'phantom-jam-2026w31',
      campaignContent: 'hook-a',
    })
  })
})

describe('localized public path classification', () => {
  it('keeps English routes on the same page dimension and removes query content', () => {
    for (const path of ['/', '/about', '/feedback', '/privacy', '/logo', '/category/physics', '/explore/ferrofluid']) {
      expect(coarsenAnalyticsPath(`/en${path === '/' ? '' : path}?q=private`)).toBe(path)
    }
    expect(coarsenAnalyticsPath('/en/private/person@example.com')).toBe('/not-found')
  })

  it('records the terms page under its own path instead of /not-found', () => {
    expect(coarsenAnalyticsPath('/terms')).toBe('/terms')
    expect(coarsenAnalyticsPath('/en/terms')).toBe('/terms')
    expect(coarsenAnalyticsPath('/terms/unknown-page')).toBe('/not-found')
  })
})

it('accepts new world URLs while keeping historical world URLs queryable', () => {
  expect(coarsenAnalyticsPath('/rainbow?qa=1')).toBe('/rainbow')
  expect(coarsenAnalyticsPath('/en/rainbow')).toBe('/rainbow')
  expect(coarsenAnalyticsPath('/explore/rainbow')).toBe('/explore/rainbow')
  expect(coarsenAnalyticsPath('/en/explore/phantom-jam')).toBe('/explore/phantom-jam')
  expect(coarsenAnalyticsPath('/an-invented-world')).toBe('/not-found')
})
