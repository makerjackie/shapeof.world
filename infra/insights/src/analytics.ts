import { canonicalAnalyticsPathSql } from '../../../src/lib/analytics-path-sql'
import worldCatalog from './world-catalog.generated.json' with { type: 'json' }

const FIELD = {
  event: 'blob1',
  session: 'blob3',
  editorialDay: 'blob4',
  locale: 'blob5',
  referrer: 'blob6',
  path: 'blob7',
  world: 'blob8',
  value: 'blob10',
  campaignSource: 'blob13',
  campaignName: 'blob14',
  campaignContent: 'blob15',
  country: 'blob16',
  device: 'blob17',
  browser: 'blob18',
  numericValue: 'double2',
} as const

const performanceMetrics = {
  lcp: { event: 'web_vital_lcp', good: 2_500, poor: 4_000 },
  inp: { event: 'web_vital_inp', good: 200, poor: 500 },
  cls: { event: 'web_vital_cls', good: 0.1, poor: 0.25 },
  ttfb: { event: 'web_vital_ttfb', good: 800, poor: 1_800 },
} as const

type PerformanceMetricId = keyof typeof performanceMetrics

const allowedDays = new Set([7, 30, 90])

type QueryRow = Record<string, unknown>
type QueryResult = { data?: Array<QueryRow> }
export type AnalyticsQuery = (sql: string) => Promise<Array<QueryRow>>

type CatalogWorld = (typeof worldCatalog)[number] & {
  domain?: string
  category?: string
  retired?: boolean
}

export type WorldSignal =
  | 'strong'
  | 'stable'
  | 'low-sample'
  | 'technical'
  | 'immersion'
  | 'onboarding'
  | 'priority'

function numberValue(row: QueryRow | undefined, key: string): number {
  const value = Number(row?.[key] ?? 0)
  return Number.isFinite(value) ? value : 0
}

function stringValue(row: QueryRow | undefined, key: string): string {
  return typeof row?.[key] === 'string' ? row[key] : ''
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null
}

function movement(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null
}

function rateMovement(current: number | null, previous: number | null): number | null {
  return current !== null && previous !== null ? current - previous : null
}

function weightedQuantile(
  rows: Array<{ value: number; weight: number }>,
  quantile: number,
): number | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((left, right) => left.value - right.value)
  const totalWeight = sorted.reduce((total, row) => total + row.weight, 0)
  const target = Math.max(0, Math.min(1, quantile)) * totalWeight
  let cumulative = 0
  for (const row of sorted) {
    cumulative += row.weight
    if (cumulative >= target) return row.value
  }
  return sorted.at(-1)?.value ?? null
}

function validateDataset(dataset: string): string {
  if (!/^[A-Za-z0-9_]+$/u.test(dataset)) throw new Error('Invalid Analytics Engine dataset name.')
  return dataset
}

function periodExpression(days: number): string {
  return `if(timestamp >= NOW() - INTERVAL '${days}' DAY, 'current', 'previous')`
}

function periodWhere(days: number): string {
  return `timestamp >= NOW() - INTERVAL '${days * 2}' DAY AND timestamp < NOW()`
}

function currentPeriodWhere(days: number): string {
  return `timestamp >= NOW() - INTERVAL '${days}' DAY AND timestamp < NOW()`
}

function previousPeriodWhere(days: number): string {
  return `timestamp >= NOW() - INTERVAL '${days * 2}' DAY AND timestamp < NOW() - INTERVAL '${days}' DAY`
}

function worldMetricsQuery(where: string): string {
  return `
    SELECT world,
           COUNT() AS visits,
           countIf(reached5s > 0) AS reached5s,
           countIf(reached15s > 0) AS reached15s,
           countIf(reached30s > 0) AS reached30s,
           countIf(interacted > 0) AS interacted,
           countIf(guide_shown > 0) AS guide_shown,
           countIf(guide_complete > 0) AS guide_complete,
           countIf(saved > 0) AS saved,
           countIf(shared > 0) AS shared,
           countIf(timeouts > 0) AS timeouts,
           countIf(error_count > 0) AS error_visits
    FROM (
      SELECT ${FIELD.world} AS world,
             ${FIELD.session} AS session,
             countIf(${FIELD.event} = 'experience_open') AS opened,
             countIf(${FIELD.event} = 'experience_engaged' AND ${FIELD.value} = '5s') AS reached5s,
             countIf(${FIELD.event} = 'experience_engaged' AND ${FIELD.value} = '15s') AS reached15s,
             countIf(${FIELD.event} = 'experience_engaged' AND ${FIELD.value} = '30s') AS reached30s,
             countIf(${FIELD.event} = 'first_interaction') AS interacted,
             countIf(${FIELD.event} = 'guide_shown') AS guide_shown,
             countIf(${FIELD.event} = 'guide_complete') AS guide_complete,
             countIf(${FIELD.event} = 'atlas_save') AS saved,
             countIf(${FIELD.event} = 'share') AS shared,
             countIf(${FIELD.event} = 'experience_load_timeout') AS timeouts,
             countIf(${FIELD.event} = 'experience_error') AS error_count
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${where}
        AND ${FIELD.world} != ''
      GROUP BY world, session
      HAVING opened > 0
    )
    GROUP BY world
    ORDER BY visits DESC
    LIMIT 2000
    FORMAT JSON
  `
}

function deepPlaySessionsQuery(where: string): string {
  return `
    SELECT ${FIELD.world} AS world,
           ${FIELD.session} AS session,
           countIf(${FIELD.event} = 'experience_open') AS opened,
           countIf(${FIELD.event} = 'experience_engaged' AND ${FIELD.value} = '30s') AS reached30s,
           countIf(${FIELD.event} = 'first_interaction') AS interacted
    FROM __DATASET__
    WHERE blob18 != 'bot' AND ${where}
      AND ${FIELD.world} != ''
    GROUP BY world, session
    HAVING opened > 0
    ORDER BY world, session
    LIMIT 50000
    FORMAT JSON
  `
}

function rowsByPeriod(rows: Array<QueryRow>): Record<'current' | 'previous', QueryRow> {
  return {
    current: rows.find((row) => row.period === 'current') ?? {},
    previous: rows.find((row) => row.period === 'previous') ?? {},
  }
}

function normalizeReferrer(value: string): string {
  if (!value) return '直接访问'
  if (value === 'shapeof.world' || value.endsWith('.shapeof.world')) return '站内'
  if (value === 't.co' || value.endsWith('.twitter.com') || value === 'x.com') return 'X / Twitter'
  if (value.includes('weixin') || value.includes('wechat')) return '微信'
  return value.slice(0, 80)
}

function signalForWorld(
  world: { visits: number; retention30Rate: number | null; interactionRate: number | null; deepPlayRate: number | null; timeoutRate: number | null; errorRate: number | null },
  baseline: { retention30Rate: number | null; interactionRate: number | null; deepPlayRate: number | null },
): WorldSignal {
  if (world.visits < 10) return 'low-sample'
  if ((world.timeoutRate ?? 0) + (world.errorRate ?? 0) >= 0.05) return 'technical'
  const weakRetention = baseline.retention30Rate !== null
    && world.retention30Rate !== null
    && world.retention30Rate <= baseline.retention30Rate - 0.12
  const weakInteraction = baseline.interactionRate !== null
    && world.interactionRate !== null
    && world.interactionRate <= baseline.interactionRate - 0.12
  if (weakRetention && weakInteraction) return 'priority'
  if (weakRetention) return 'immersion'
  if (weakInteraction) return 'onboarding'
  if (
    baseline.deepPlayRate !== null
    && world.deepPlayRate !== null
    && world.deepPlayRate >= baseline.deepPlayRate + 0.1
  ) return 'strong'
  return 'stable'
}

export function normalizeDays(value: string | null): number {
  const days = Number(value)
  return allowedDays.has(days) ? days : 7
}

export function createAnalyticsQuery(
  env: { CLOUDFLARE_ACCOUNT_ID: string; CLOUDFLARE_ANALYTICS_TOKEN: string; ANALYTICS_DATASET: string },
  fetchImpl: typeof fetch = fetch,
): AnalyticsQuery {
  const dataset = validateDataset(env.ANALYTICS_DATASET)
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`
  const maximumConcurrentQueries = 4
  let activeQueries = 0
  const waitingQueries: Array<() => void> = []
  const acquireQuerySlot = async () => {
    if (activeQueries < maximumConcurrentQueries) {
      activeQueries += 1
      return
    }
    await new Promise<void>((resolve) => waitingQueries.push(resolve))
  }
  const releaseQuerySlot = () => {
    const next = waitingQueries.shift()
    if (next) next()
    else activeQueries -= 1
  }

  return async (sql: string): Promise<Array<QueryRow>> => {
    await acquireQuerySlot()
    const queryFingerprint = sql.replace(/\s+/gu, ' ').trim().slice(0, 180)
    try {
      let lastError: Error | undefined
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`,
              'Content-Type': 'text/plain; charset=utf-8',
            },
            body: sql.replaceAll('__DATASET__', dataset),
          })
          const text = await response.text()
          if (response.ok) {
            const parsed = JSON.parse(text) as QueryResult
            return Array.isArray(parsed.data) ? parsed.data : []
          }
          const error = new Error(`Analytics Engine responded with ${response.status}: ${text.slice(0, 180)} [query: ${queryFingerprint}]`)
          if (response.status !== 429 && response.status < 500) throw error
          lastError = error
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt)))
      }
      throw lastError ?? new Error(`Analytics Engine query failed. [query: ${queryFingerprint}]`)
    } finally {
      releaseQuerySlot()
    }
  }
}

function catalogById(): Map<string, CatalogWorld> {
  return new Map((worldCatalog as Array<CatalogWorld>).map((world) => [world.id, world]))
}

/**
 * Every world with events counts, including worlds since removed from the catalog:
 * their history stays in the metrics, named by a stored title or their raw id.
 */
function isWorldRow(row: QueryRow): boolean {
  return stringValue(row, 'world') !== ''
}

/** A world not in the current catalog: retired there or never listed in it. */
function isRetiredWorld(id: string, catalog: ReadonlyMap<string, CatalogWorld>): boolean {
  const world = catalog.get(id)
  return !world || world.retired === true
}

export async function buildDashboardData(query: AnalyticsQuery, days: number) {
  if (!allowedDays.has(days)) throw new Error('Unsupported Insights date range.')
  const period = periodExpression(days)
  const where = periodWhere(days)
  const currentWhere = currentPeriodWhere(days)
  const queryPreviousPeriod = days !== 90
  const loadWorldPeriod = async (periodName: 'current' | 'previous', periodFilter: string) => {
    const [metrics, sessionRows] = await Promise.all([
      query(worldMetricsQuery(periodFilter)),
      query(deepPlaySessionsQuery(periodFilter)),
    ])
    if (sessionRows.length >= 50000) {
      throw new Error('Deep-play session query reached its safety limit.')
    }
    const deepPlayByWorld = new Map<string, number>()
    // Session rows are one row per opened (world, session) pair, so the row
    // count per session equals its distinct opened worlds.
    const sessionJourneys = new Map<string, { worlds: number; interacted: boolean }>()
    for (const row of sessionRows) {
      const session = stringValue(row, 'session')
      const journey = sessionJourneys.get(session) ?? { worlds: 0, interacted: false }
      journey.worlds += 1
      if (numberValue(row, 'interacted') > 0) journey.interacted = true
      sessionJourneys.set(session, journey)
      if (numberValue(row, 'reached30s') <= 0 || numberValue(row, 'interacted') <= 0) continue
      const world = stringValue(row, 'world')
      deepPlayByWorld.set(world, (deepPlayByWorld.get(world) ?? 0) + 1)
    }
    let continuedPlaySessions = 0
    for (const journey of sessionJourneys.values()) {
      if (journey.worlds >= 2 && journey.interacted) continuedPlaySessions += 1
    }
    return {
      continuedPlaySessions,
      rows: metrics.map((row) => ({
        ...row,
        deep_play: deepPlayByWorld.get(stringValue(row, 'world')) ?? 0,
        period: periodName,
      })),
    }
  }
  const worldPeriodsPromise = Promise.all([
    loadWorldPeriod('current', currentPeriodWhere(days)),
    queryPreviousPeriod
      ? loadWorldPeriod('previous', previousPeriodWhere(days))
      : Promise.resolve({ continuedPlaySessions: 0, rows: [] as Array<QueryRow> }),
  ])
  const activeUsersQuery = (windowDays: number) => query(`
    SELECT if(timestamp >= NOW() - INTERVAL '${windowDays}' DAY, 'current', 'previous') AS period,
           COUNT(DISTINCT index1) AS users
    FROM __DATASET__
    WHERE blob18 != 'bot' AND timestamp >= NOW() - INTERVAL '${windowDays * 2}' DAY
      AND timestamp < NOW()
      AND ${FIELD.event} = 'page_view'
    GROUP BY period
    FORMAT JSON
  `)

  const [
    siteRows,
    active1Rows,
    active7Rows,
    active30Rows,
    siteEngagementRows,
    playerRows,
    journeyRows,
    worldPeriods,
    durationSessionRows,
    dailyRows,
    siteDailyRows,
    referrerRows,
    countryRows,
    localeRows,
    campaignRows,
    deviceRows,
    browserRows,
    pageRows,
    performanceRows,
  ] = await Promise.all([
    query(`
      SELECT ${period} AS period,
             SUM(_sample_interval) AS events,
             SUM(_sample_interval) AS pageviews,
             COUNT(DISTINCT index1) AS visitors,
             COUNT(DISTINCT ${FIELD.session}) AS sessions,
             max(timestamp) AS latest
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${where}
        AND ${FIELD.event} = 'page_view'
      GROUP BY period
      FORMAT JSON
    `),
    activeUsersQuery(1),
    activeUsersQuery(7),
    activeUsersQuery(30),
    query(`
      SELECT period,
             COUNT() AS page_sessions,
             countIf(reached5s > 0) AS engaged5_sessions,
             countIf(reached30s > 0) AS engaged30_sessions
      FROM (
        SELECT ${period} AS period,
               ${FIELD.session} AS session,
               countIf(${FIELD.event} = 'page_view') AS viewed,
               countIf(${FIELD.event} = 'page_engaged' AND ${FIELD.value} = '5s') AS reached5s,
               countIf(${FIELD.event} = 'page_engaged' AND ${FIELD.value} = '30s') AS reached30s
        FROM __DATASET__
        WHERE blob18 != 'bot' AND ${where}
          AND ${FIELD.event} IN ('page_view', 'page_engaged')
        GROUP BY period, session
        HAVING viewed > 0
      )
      GROUP BY period
      FORMAT JSON
    `),
    query(`
      SELECT period,
             COUNT() AS players,
             countIf(active_days >= 2) AS returning_players
      FROM (
        SELECT ${period} AS period,
               index1 AS visitor,
               COUNT(DISTINCT ${FIELD.editorialDay}) AS active_days
        FROM __DATASET__
        WHERE blob18 != 'bot' AND ${where}
          AND ${FIELD.event} = 'experience_open'
        GROUP BY period, visitor
      )
      GROUP BY period
      FORMAT JSON
    `),
    query(`
      SELECT period,
             COUNT() AS playing_sessions,
             countIf(worlds >= 2) AS multi_world_sessions,
             countIf(worlds >= 3) AS three_world_sessions
      FROM (
        SELECT ${period} AS period,
               ${FIELD.session} AS session,
               COUNT(DISTINCT ${FIELD.world}) AS worlds
        FROM __DATASET__
        WHERE blob18 != 'bot' AND ${where}
          AND ${FIELD.event} = 'experience_open'
          AND ${FIELD.world} != ''
        GROUP BY period, session
      )
      GROUP BY period
      FORMAT JSON
    `),
    worldPeriodsPromise,
    query(`
      SELECT ${FIELD.world} AS world,
             ${FIELD.session} AS session,
             SUM(${FIELD.numericValue}) AS visible_seconds,
             max(_sample_interval) AS sample_weight
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${currentWhere}
        AND ${FIELD.event} = 'experience_duration'
        AND ${FIELD.world} != ''
        AND ${FIELD.numericValue} >= 0.25
        AND ${FIELD.numericValue} <= 1800
      GROUP BY world, session
      HAVING visible_seconds >= 1
      ORDER BY world, session
      LIMIT 50000
      FORMAT JSON
    `),
    query(`
      SELECT intDiv(toUInt32(timestamp) + 28800, 86400) * 86400 - 28800 AS bucket,
             COUNT(DISTINCT ${FIELD.session}) AS playing_sessions,
             COUNT(DISTINCT index1) AS players,
             SUM(_sample_interval) AS open_events
      FROM __DATASET__
      WHERE blob18 != 'bot' AND timestamp >= NOW() - INTERVAL '${days}' DAY
        AND timestamp < NOW()
        AND ${FIELD.event} = 'experience_open'
      GROUP BY bucket
      ORDER BY bucket
      FORMAT JSON
    `),
    query(`
      SELECT intDiv(toUInt32(timestamp) + 28800, 86400) * 86400 - 28800 AS bucket,
             COUNT(DISTINCT ${FIELD.session}) AS sessions,
             COUNT(DISTINCT index1) AS visitors,
             SUM(_sample_interval) AS pageviews
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${currentWhere}
        AND ${FIELD.event} = 'page_view'
      GROUP BY bucket
      ORDER BY bucket
      FORMAT JSON
    `),
    query(`
      SELECT ${FIELD.referrer} AS name,
             COUNT(DISTINCT ${FIELD.session}) AS sessions
      FROM __DATASET__
      WHERE blob18 != 'bot' AND timestamp >= NOW() - INTERVAL '${days}' DAY
        AND timestamp < NOW()
        AND ${FIELD.event} = 'page_view'
      GROUP BY name
      ORDER BY sessions DESC
      LIMIT 12
      FORMAT JSON
    `),
    query(`
      SELECT ${FIELD.country} AS name,
             COUNT(DISTINCT ${FIELD.session}) AS sessions
      FROM __DATASET__
      WHERE blob18 != 'bot' AND timestamp >= NOW() - INTERVAL '${days}' DAY
        AND timestamp < NOW()
        AND ${FIELD.event} = 'page_view'
        AND ${FIELD.country} != ''
      GROUP BY name
      ORDER BY sessions DESC
      LIMIT 20
      FORMAT JSON
    `),
    query(`
      SELECT ${FIELD.locale} AS name,
             COUNT(DISTINCT ${FIELD.session}) AS sessions
      FROM __DATASET__
      WHERE blob18 != 'bot' AND timestamp >= NOW() - INTERVAL '${days}' DAY
        AND timestamp < NOW()
        AND ${FIELD.event} = 'page_view'
      GROUP BY name
      ORDER BY sessions DESC
      FORMAT JSON
    `),
    query(`
      SELECT ${FIELD.campaignSource} AS source,
             ${FIELD.campaignName} AS campaign,
             ${FIELD.campaignContent} AS content,
             COUNT(DISTINCT ${FIELD.session}) AS sessions
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${currentWhere}
        AND ${FIELD.event} = 'page_view'
        AND ${FIELD.campaignSource} != ''
      GROUP BY source, campaign, content
      ORDER BY sessions DESC
      LIMIT 30
      FORMAT JSON
    `),
    query(`
      SELECT ${FIELD.device} AS name,
             COUNT(DISTINCT ${FIELD.session}) AS sessions
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${currentWhere}
        AND ${FIELD.event} = 'page_view'
        AND ${FIELD.device} != ''
      GROUP BY name
      ORDER BY sessions DESC
      FORMAT JSON
    `),
    query(`
      SELECT ${FIELD.browser} AS name,
             COUNT(DISTINCT ${FIELD.session}) AS sessions
      FROM __DATASET__
      WHERE blob18 != 'bot' AND ${currentWhere}
        AND ${FIELD.event} = 'page_view'
        AND ${FIELD.browser} != ''
      GROUP BY name
      ORDER BY sessions DESC
      FORMAT JSON
    `),
    query(`
      SELECT path,
             COUNT() AS sessions,
             countIf(reached5s > 0) AS reached5s,
             countIf(reached30s > 0) AS reached30s
      FROM (
        SELECT ${canonicalAnalyticsPathSql(FIELD.path)} AS path,
               ${FIELD.session} AS session,
               countIf(${FIELD.event} = 'page_view') AS viewed,
               countIf(${FIELD.event} = 'page_engaged' AND ${FIELD.value} = '5s') AS reached5s,
               countIf(${FIELD.event} = 'page_engaged' AND ${FIELD.value} = '30s') AS reached30s
        FROM __DATASET__
        WHERE blob18 != 'bot' AND ${currentWhere}
          AND ${FIELD.event} IN ('page_view', 'page_engaged')
        GROUP BY path, session
        HAVING viewed > 0
      )
      GROUP BY path
      ORDER BY sessions DESC
      LIMIT 80
      FORMAT JSON
    `),
    query(`
      SELECT period, metric,
             SUM(weight) AS samples,
             quantileExactWeighted(0.75)(value, weight) AS p75,
             SUM(if((metric = 'web_vital_lcp' AND value <= 2500)
               OR (metric = 'web_vital_inp' AND value <= 200)
               OR (metric = 'web_vital_cls' AND value <= 0.1)
               OR (metric = 'web_vital_ttfb' AND value <= 800), weight, 0)) AS good_samples
      FROM (
        SELECT ${period} AS period, ${FIELD.event} AS metric, ${FIELD.session} AS session,
               if(blob20 != '', blob20, blob12) AS measurement, ${canonicalAnalyticsPathSql('blob7')} AS path,
               argMax(${FIELD.numericValue}, double4) AS value,
               max(_sample_interval) AS weight
        FROM __DATASET__
        WHERE blob18 != 'bot' AND ${where}
          AND ${FIELD.event} IN ('web_vital_lcp', 'web_vital_inp', 'web_vital_cls', 'web_vital_ttfb')
          AND ${FIELD.numericValue} >= 0
        GROUP BY period, metric, session, measurement, path
      )
      GROUP BY period, metric
      FORMAT JSON
    `),
  ])

  const rawSite = rowsByPeriod(siteRows)
  const comparisonAvailable = queryPreviousPeriod && numberValue(rawSite.previous, 'events') > 0
  const withoutUnavailableComparison = (rows: Array<QueryRow>) => comparisonAvailable
    ? rows
    : rows.filter((row) => row.period === 'current')
  const site = rowsByPeriod(withoutUnavailableComparison(siteRows))
  const siteEngagement = rowsByPeriod(withoutUnavailableComparison(siteEngagementRows))
  const players = rowsByPeriod(withoutUnavailableComparison(playerRows))
  const journey = rowsByPeriod(withoutUnavailableComparison(journeyRows))
  const catalog = catalogById()
  const worldRows = worldPeriods.flatMap((period) => period.rows)
  const comparableWorldRows = comparisonAvailable
    ? worldRows
    : worldRows.filter((row) => row.period === 'current')

  const periodWorlds = (periodName: 'current' | 'previous') => comparableWorldRows
    .filter((row) => row.period === periodName && isWorldRow(row))
    .map((row) => {
      const visits = numberValue(row, 'visits')
      const reached30s = numberValue(row, 'reached30s')
      const interacted = numberValue(row, 'interacted')
      const deepPlay = numberValue(row, 'deep_play')
      const guideCompleted = numberValue(row, 'guide_complete')
      const guideShown = Math.max(numberValue(row, 'guide_shown'), guideCompleted)
      const timeouts = numberValue(row, 'timeouts')
      const errors = numberValue(row, 'error_visits')
      return {
        id: stringValue(row, 'world'),
        visits,
        reached5s: numberValue(row, 'reached5s'),
        reached15s: numberValue(row, 'reached15s'),
        reached30s,
        interacted,
        deepPlay,
        guideShown,
        guideCompleted,
        saved: numberValue(row, 'saved'),
        shared: numberValue(row, 'shared'),
        timeouts,
        errors,
        retention30Rate: ratio(reached30s, visits),
        interactionRate: ratio(interacted, visits),
        deepPlayRate: ratio(deepPlay, visits),
        guideCompletionRate: ratio(guideCompleted, guideShown),
        timeoutRate: ratio(timeouts, visits),
        errorRate: ratio(errors, visits),
      }
    })

  const currentWorlds = periodWorlds('current')
  const previousWorlds = new Map(periodWorlds('previous').map((world) => [world.id, world]))
  if (durationSessionRows.length >= 50000) {
    throw new Error('Visible-duration session query reached its safety limit.')
  }
  const durationValuesByWorld = new Map<string, Array<{ value: number; weight: number }>>()
  for (const row of durationSessionRows) {
    const world = stringValue(row, 'world')
    if (!world) continue
    const values = durationValuesByWorld.get(world) ?? []
    values.push({
      value: Math.min(1_800, numberValue(row, 'visible_seconds')),
      weight: Math.max(1, numberValue(row, 'sample_weight')),
    })
    durationValuesByWorld.set(world, values)
  }
  const durationByWorld = new Map([...durationValuesByWorld].map(([world, values]) => {
    const totalWeight = values.reduce((total, row) => total + row.weight, 0)
    const weightedSeconds = values.reduce((total, row) => total + row.value * row.weight, 0)
    return [world, {
      durationSamples: values.length,
      averageVisibleSeconds: totalWeight > 0 ? weightedSeconds / totalWeight : null,
      medianVisibleSeconds: weightedQuantile(values, 0.5),
      p75VisibleSeconds: weightedQuantile(values, 0.75),
    }]
  }))

  const aggregateWorlds = (worlds: typeof currentWorlds) => {
    const sum = (key: keyof (typeof worlds)[number]) => worlds.reduce((total, world) => {
      const value = world[key]
      return total + (typeof value === 'number' ? value : 0)
    }, 0)
    const visits = sum('visits')
    const reached30s = sum('reached30s')
    const interacted = sum('interacted')
    const deepPlay = sum('deepPlay')
    const guideShown = sum('guideShown')
    return {
      visits,
      reached5s: sum('reached5s'),
      reached15s: sum('reached15s'),
      reached30s,
      interacted,
      deepPlay,
      guideShown,
      guideCompleted: sum('guideCompleted'),
      saved: sum('saved'),
      shared: sum('shared'),
      timeouts: sum('timeouts'),
      errors: sum('errors'),
      retention30Rate: ratio(reached30s, visits),
      interactionRate: ratio(interacted, visits),
      deepPlayRate: ratio(deepPlay, visits),
      guideCompletionRate: ratio(sum('guideCompleted'), guideShown),
      timeoutRate: ratio(sum('timeouts'), visits),
      errorRate: ratio(sum('errors'), visits),
    }
  }

  const currentPlay = aggregateWorlds(currentWorlds)
  const previousPlay = aggregateWorlds(periodWorlds('previous'))

  const worlds = currentWorlds.map((world) => {
    const previous = previousWorlds.get(world.id)
    const metadata = catalog.get(world.id)
    const duration = durationByWorld.get(world.id)
    return {
      ...world,
      durationSamples: duration?.durationSamples ?? 0,
      averageVisibleSeconds: duration?.averageVisibleSeconds ?? null,
      medianVisibleSeconds: duration?.medianVisibleSeconds ?? null,
      p75VisibleSeconds: duration?.p75VisibleSeconds ?? null,
      title: metadata?.title ?? world.id,
      titleEn: metadata?.titleEn ?? world.id,
      domain: metadata?.domain ?? 'unknown',
      category: metadata?.category ?? '',
      poster: metadata?.poster ?? `/assets/posters/thumb/${world.id}.webp`,
      retired: isRetiredWorld(world.id, catalog),
      visitsMovement: movement(world.visits, previous?.visits ?? 0),
      retentionMovement: rateMovement(world.retention30Rate, previous?.retention30Rate ?? null),
      interactionMovement: rateMovement(world.interactionRate, previous?.interactionRate ?? null),
      signal: signalForWorld(world, currentPlay),
      previous: previous ? {
        visits: previous.visits,
        retention30Rate: previous.retention30Rate,
        interactionRate: previous.interactionRate,
        deepPlayRate: previous.deepPlayRate,
      } : null,
    }
  })

  const siteMetric = (periodName: 'current' | 'previous') => ({
    events: numberValue(site[periodName], 'events'),
    pageviews: numberValue(site[periodName], 'pageviews'),
    visitors: numberValue(site[periodName], 'visitors'),
    sessions: numberValue(site[periodName], 'sessions'),
    players: numberValue(players[periodName], 'players'),
    returningPlayers: numberValue(players[periodName], 'returning_players'),
    playingSessions: numberValue(journey[periodName], 'playing_sessions'),
    multiWorldSessions: numberValue(journey[periodName], 'multi_world_sessions'),
    threeWorldSessions: numberValue(journey[periodName], 'three_world_sessions'),
    pageSessions: numberValue(siteEngagement[periodName], 'page_sessions'),
    engaged5Sessions: numberValue(siteEngagement[periodName], 'engaged5_sessions'),
    engaged30Sessions: numberValue(siteEngagement[periodName], 'engaged30_sessions'),
  })

  const currentSite = {
    ...siteMetric('current'),
    continuedPlaySessions: worldPeriods[0].continuedPlaySessions,
  }
  const previousSite = {
    ...siteMetric('previous'),
    continuedPlaySessions: comparisonAvailable ? worldPeriods[1].continuedPlaySessions : 0,
  }
  const siteRates = (value: typeof currentSite) => ({
    pagesPerSession: ratio(value.pageviews, value.pageSessions),
    bounce5Rate: value.pageSessions > 0 ? 1 - value.engaged5Sessions / value.pageSessions : null,
    pageEngaged30Rate: ratio(value.engaged30Sessions, value.pageSessions),
    playerActivationRate: ratio(value.players, value.visitors),
    worldEntryRate: ratio(value.playingSessions, value.pageSessions),
    secondWorldRate: ratio(value.multiWorldSessions, value.playingSessions),
    thirdWorldRate: ratio(value.threeWorldSessions, value.playingSessions),
    returningPlayerRate: ratio(value.returningPlayers, value.players),
  })
  const currentRates = siteRates(currentSite)
  const previousRates = siteRates(previousSite)
  const activeUsers = (rows: Array<QueryRow>) => {
    const periods = rowsByPeriod(rows)
    const current = numberValue(periods.current, 'users')
    const previous = numberValue(periods.previous, 'users')
    return { current, previous, movement: movement(current, previous) }
  }
  const performanceForPeriod = (periodName: 'current' | 'previous') => Object.fromEntries(
    Object.entries(performanceMetrics).map(([id, config]) => {
      const row = performanceRows.find((candidate) => (
        candidate.period === periodName && candidate.metric === config.event
      ))
      const samples = numberValue(row, 'samples')
      const p75 = samples > 0 ? numberValue(row, 'p75') : null
      const goodRate = samples > 0 ? ratio(numberValue(row, 'good_samples'), samples) : null
      const status = p75 === null
        ? 'waiting'
        : p75 <= config.good
          ? 'good'
          : p75 <= config.poor
            ? 'needs-improvement'
            : 'poor'
      return [id, { p75, goodRate, samples, status }]
    }),
  ) as Record<PerformanceMetricId, {
    p75: number | null
    goodRate: number | null
    samples: number
    status: 'waiting' | 'good' | 'needs-improvement' | 'poor'
  }>
  const currentPerformance = performanceForPeriod('current')
  const previousPerformance = performanceForPeriod('previous')
  const dateForBucket = (row: QueryRow) => new Date(
    numberValue(row, 'bucket') * 1000 + 8 * 60 * 60 * 1000,
  ).toISOString().slice(0, 10)
  const dailyByDate = new Map<string, {
    date: string
    sessions: number
    visitors: number
    pageviews: number
    playingSessions: number
    players: number
    openEvents: number
  }>()
  for (const row of siteDailyRows) {
    const date = dateForBucket(row)
    dailyByDate.set(date, {
      date,
      sessions: numberValue(row, 'sessions'),
      visitors: numberValue(row, 'visitors'),
      pageviews: numberValue(row, 'pageviews'),
      playingSessions: 0,
      players: 0,
      openEvents: 0,
    })
  }
  for (const row of dailyRows) {
    const date = dateForBucket(row)
    const existing = dailyByDate.get(date) ?? {
      date,
      sessions: 0,
      visitors: 0,
      pageviews: 0,
      playingSessions: 0,
      players: 0,
      openEvents: 0,
    }
    dailyByDate.set(date, {
      ...existing,
      playingSessions: numberValue(row, 'playing_sessions'),
      players: numberValue(row, 'players'),
      openEvents: numberValue(row, 'open_events'),
    })
  }

  return {
    meta: {
      days,
      generatedAt: new Date().toISOString(),
      latestEventAt: stringValue(site.current, 'latest'),
      timezone: 'Asia/Shanghai',
      dataset: 'oneworld_events',
      comparisonAvailable,
      retentionNotice: '原始事件保留三个月；当前页面为滚动时间窗。',
    },
    summary: {
      current: currentSite,
      previous: previousSite,
      movement: {
        pageviews: movement(currentSite.pageviews, previousSite.pageviews),
        visitors: movement(currentSite.visitors, previousSite.visitors),
        pageSessions: movement(currentSite.pageSessions, previousSite.pageSessions),
        players: movement(currentSite.players, previousSite.players),
        playingSessions: movement(currentSite.playingSessions, previousSite.playingSessions),
        continuedPlaySessions: movement(currentSite.continuedPlaySessions, previousSite.continuedPlaySessions),
        pagesPerSession: movement(currentRates.pagesPerSession ?? 0, previousRates.pagesPerSession ?? 0),
        bounce5Rate: rateMovement(currentRates.bounce5Rate, previousRates.bounce5Rate),
        worldEntryRate: rateMovement(currentRates.worldEntryRate, previousRates.worldEntryRate),
        secondWorldRate: rateMovement(currentRates.secondWorldRate, previousRates.secondWorldRate),
        returningPlayerRate: rateMovement(currentRates.returningPlayerRate, previousRates.returningPlayerRate),
      },
      rates: currentRates,
    },
    activity: {
      dau: activeUsers(active1Rows),
      wau: activeUsers(active7Rows),
      mau: activeUsers(active30Rows),
    },
    play: {
      current: currentPlay,
      previous: previousPlay,
      movement: {
        visits: movement(currentPlay.visits, previousPlay.visits),
        retention30Rate: rateMovement(currentPlay.retention30Rate, previousPlay.retention30Rate),
        interactionRate: rateMovement(currentPlay.interactionRate, previousPlay.interactionRate),
        deepPlayRate: rateMovement(currentPlay.deepPlayRate, previousPlay.deepPlayRate),
        timeoutRate: rateMovement(currentPlay.timeoutRate, previousPlay.timeoutRate),
        errorRate: rateMovement(currentPlay.errorRate, previousPlay.errorRate),
      },
      rates: {
        visitsPerPlayer: ratio(currentPlay.visits, currentSite.players),
        saveRate: ratio(currentPlay.saved, currentPlay.visits),
        shareRate: ratio(currentPlay.shared, currentPlay.visits),
      },
    },
    performance: {
      current: currentPerformance,
      previous: previousPerformance,
      thresholds: Object.fromEntries(Object.entries(performanceMetrics).map(([id, value]) => [id, {
        good: value.good,
        poor: value.poor,
      }])) as Record<PerformanceMetricId, { good: number; poor: number }>,
    },
    daily: [...dailyByDate.values()].sort((left, right) => left.date.localeCompare(right.date)),
    referrers: referrerRows.map((row) => ({
      name: normalizeReferrer(stringValue(row, 'name')),
      sessions: numberValue(row, 'sessions'),
    })),
    countries: countryRows.map((row) => ({
      name: stringValue(row, 'name'),
      sessions: numberValue(row, 'sessions'),
    })),
    locales: localeRows.map((row) => ({
      name: stringValue(row, 'name'),
      sessions: numberValue(row, 'sessions'),
    })),
    campaigns: campaignRows.map((row) => ({
      source: stringValue(row, 'source'),
      campaign: stringValue(row, 'campaign'),
      content: stringValue(row, 'content'),
      sessions: numberValue(row, 'sessions'),
    })),
    devices: deviceRows.map((row) => ({
      name: stringValue(row, 'name'),
      sessions: numberValue(row, 'sessions'),
    })),
    browsers: browserRows.map((row) => ({
      name: stringValue(row, 'name'),
      sessions: numberValue(row, 'sessions'),
    })),
    pages: pageRows.map((row) => {
      const sessions = numberValue(row, 'sessions')
      const reached5s = numberValue(row, 'reached5s')
      const reached30s = numberValue(row, 'reached30s')
      return {
        path: stringValue(row, 'path'),
        sessions,
        reached5s,
        reached30s,
        bounce5Rate: sessions > 0 ? 1 - reached5s / sessions : null,
        retention30Rate: ratio(reached30s, sessions),
      }
    }),
    worlds,
    definitions: {
      activeDay: '最近 1 天内至少浏览过一个页面的去重匿名访客，采用滚动时间窗。',
      activeWeek: '最近 7 天内至少浏览过一个页面的去重匿名访客，采用滚动时间窗。',
      activeMonth: '最近 30 天内至少浏览过一个页面的去重匿名访客，采用滚动时间窗。',
      playVisit: '同一匿名标签页会话中，同一个世界至少出现一次 experience_open，计为一次世界游玩。当前埋点会合并同会话内对同一世界的重复打开。',
      retention5: '一次世界游玩在浏览器标签页前台可见时达到 5 秒。切到后台的时间不计入。',
      retention30: '世界游玩在浏览器标签页前台可见时达到 30 秒。',
      visibleDuration: '同一标签页会话中，同一世界在浏览器前台实际可见的秒数之和；切到后台不计，单会话最多计 30 分钟。榜单同时展示中位数、P75 和会话样本量。',
      interaction: '体验内首次真实鼠标、触摸或键盘操作；自动演示不计入。',
      deepPlay: '同一次世界游玩同时达到 30 秒前台可见停留，并发生至少一次真实互动。',
      continuedPlay: '北极星：同一匿名标签页会话内发生过至少一次真实互动，并打开了第二个不同世界。这是站点唯一定量北极星，用绝对数观察，不用比例。',
      secondWorld: '至少打开两个不同世界的游玩会话，占所有进入过世界的会话比例。',
      thirdWorld: '至少打开三个不同世界的游玩会话，占所有进入过世界的会话比例。',
      returningPlayer: `所选 ${days} 天内，至少在两个不同自然日打开过世界的匿名玩家。`,
      guideCompletion: '故事完成率只在出现过 GuideTour 展示或完成事件的世界游玩中计算；用两者较大的会话数作为分母，避免历史展示事件缺失时出现超过百分之百。没有故事的世界不适用。',
      pageview: '浏览器发生一次站内路由访问，计为一次页面浏览（PV）。',
      visitor: '所选时间窗内至少浏览过一个页面的去重匿名浏览器标识，作为独立访客（UV）的运营近似值。',
      player: '所选时间窗内至少打开过一个世界的去重匿名浏览器标识。玩家是访客中进入过世界的人。',
      activeUsers: 'DAU、WAU、MAU 分别是最近一天、七天、三十天内至少浏览过一个页面的去重匿名访客；采用滚动窗口。',
      pageSession: '同一浏览器标签页中的连续访问会话；关闭标签页后再次打开会生成新会话。',
      pagesPerSession: '页面浏览次数（PV）除以网站会话数，表示每次标签页会话平均浏览的页面数量。',
      bounce5: '一次网站会话没有任何页面在前台可见达到 5 秒，计入 5 秒跳出率；这不是 GA4 的参与会话口径。',
      pageEngaged5: '至少有一个页面在浏览器前台可见达到 5 秒的网站会话，占该页面全部网站会话的比例。',
      pageEngaged30: '至少有一个页面在浏览器前台可见达到 30 秒的网站会话，占全部网站会话的比例。',
      worldEntry: '至少打开过一个世界的网站会话，占全部网站会话的比例。',
      visitsPerPlayer: '世界游玩次数除以匿名玩家数。少数高活跃玩家可能抬高这个平均值。',
      loadTimeout: '世界资源加载超过设定时限并上报超时的游玩次数，占全部世界游玩次数的比例。',
      experienceError: '世界运行时上报错误的游玩次数，占全部世界游玩次数的比例。',
      saveRate: '发生收藏世界事件的次数，占全部世界游玩次数的比例。',
      shareRate: '完成分享动作的次数，占全部世界游玩次数的比例；打开分享面板不计入。',
      dailyAudience: '访客是当天浏览过页面的去重匿名浏览器标识；玩家是当天至少打开过一个世界的去重匿名浏览器标识。',
      referrer: '按页面浏览事件的浏览器来源域名分组，并按网站会话去重。直接访问表示没有来源信息，可能包括手输网址、书签或来源被隐藏；站内表示来源域名为 shapeof.world 或其子域名。',
      country: '按页面浏览事件所在请求的国家或地区代码分组，并按网站会话去重。位置来自网络边缘推断，不代表精确地理位置。',
      device: '按低基数设备类别分组的网站会话，包括桌面、手机、平板和未知。',
      browser: '按低基数浏览器类别分组的网站会话；不保存完整 User-Agent。',
      locale: '按页面使用的简体中文或英文界面分组的网站会话。',
      campaign: '带有有效 UTM 参数的页面浏览会话，按来源、活动和内容字段分组。没有 UTM 参数的访问不会出现在这里。',
      pageMetrics: '按站内路径汇总网站会话，并显示其中达到 5 秒和 30 秒前台可见停留的比例。',
      webVitals: 'LCP、INP、CLS 与 TTFB 来自真实访问者的完整页面加载，使用第 75 百分位；站内单页路由切换不重复计入。',
      lcp: 'LCP 衡量主要内容完成呈现的时间。这里展示真实访问样本的第 75 百分位；不超过 2.5 秒为良好，超过 4 秒为待优化。',
      inp: 'INP 衡量用户操作后的页面响应延迟。这里展示真实访问样本的第 75 百分位；不超过 200 毫秒为良好，超过 500 毫秒为待优化。',
      cls: 'CLS 衡量页面加载过程中的意外布局移动。这里展示真实访问样本的第 75 百分位；不超过 0.1 为良好，超过 0.25 为待优化。',
      ttfb: 'TTFB 衡量从请求开始到收到首个响应字节的时间。这里展示真实访问样本的第 75 百分位；不超过 800 毫秒为良好，超过 1.8 秒为待优化。',
      experienceMap: '每个圆点代表一个世界。横轴是 30 秒沉浸率，纵轴是真实互动率，圆点大小表示游玩次数；虚线是当前全部世界的整体水平。',
      signal: '诊断标签只在至少 10 次游玩后比较；低于整体水平 12 个百分点标记待关注，高于深度游玩基线 10 个百分点标记表现亮眼。',
    },
    caveats: [
      'Analytics Engine 可能采样；事件量使用 _sample_interval 加权，UV 与会话为运营近似值。',
      !comparisonAvailable
        ? days === 90
          ? '90 天窗口接近原始数据保留上限，因此不展示上一周期环比。'
          : '上一周期尚无足够数据，因此暂不展示环比。'
        : '',
      '当前没有海报曝光事件，因此不能计算真正的海报打开率。',
      deviceRows.length === 0
        ? '设备与浏览器维度将在主站埋点发布后开始积累，历史数据不会回填。'
        : '设备与浏览器仅保存低基数分类，不保存完整 User-Agent。',
      durationSessionRows.length === 0
        ? '主题前台停留时长正在积累，历史数据不会回填。'
        : '主题停留时长只累计浏览器前台可见时间，并将每个会话的单主题时长封顶为 30 分钟。',
      '当前没有单次 worldVisitId，同一会话内的同世界重玩会被合并。',
      '完成率只适用于存在自然完成时刻的体验，不能横向评价全部世界。',
    ].filter(Boolean),
  }
}

export { isRetiredWorld, isWorldRow, signalForWorld, weightedQuantile }
