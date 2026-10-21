import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  addDays,
  exportDay,
  MAX_COMPLETE_ATTEMPTS,
  PAGE_ROWS,
  readDayStatuses,
  runArchive,
  selectDaysToExport,
  sourceColumns,
  type DayStatus,
} from './archive'
import { createAnalyticsQuery } from './analytics'

const NOW = Date.parse('2026-10-21T04:00:00Z')
const migration = readFile(new URL('../migrations/0001_events_archive.sql', import.meta.url), 'utf8')

type SourceRow = Record<string, string | number>

/** D1 subset used by the archive, backed by a real in-memory SQLite database. */
function sqliteD1(database: DatabaseSync) {
  const statement = (sql: string, params: Array<unknown> = []) => ({
    bind: (...values: Array<unknown>) => statement(sql, values),
    async run() {
      const result = database.prepare(sql).run(...(params as Array<string | number | null>))
      return { success: true, results: [], meta: { changes: Number(result.changes) } }
    },
    async all() {
      return { success: true, results: database.prepare(sql).all(...(params as Array<string | number | null>)), meta: {} }
    },
    async first() {
      return database.prepare(sql).get(...(params as Array<string | number | null>)) ?? null
    },
  })
  return {
    prepare: (sql: string) => statement(sql),
    async batch(statements: Array<ReturnType<typeof statement>>) {
      database.exec('BEGIN')
      try {
        const results = []
        for (const item of statements) results.push(await item.run())
        database.exec('COMMIT')
        return results
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
  }
}

async function archiveDatabase() {
  const database = new DatabaseSync(':memory:')
  database.exec(await migration)
  return { database, db: sqliteD1(database) as unknown as D1Database }
}

function sourceRow(timestamp: string, overrides: Partial<SourceRow> = {}): SourceRow {
  const row: SourceRow = {}
  for (const column of sourceColumns) {
    if (column === 'timestamp') row[column] = timestamp
    else if (column === '_sample_interval') row[column] = 1
    else if (column.startsWith('double')) row[column] = 0
    else row[column] = ''
  }
  return { ...row, blob1: 'page_view', blob3: `session-${timestamp}`, index1: 'anon', ...overrides }
}

function unixSeconds(timestamp: string): number {
  return Date.parse(`${timestamp.replace(' ', 'T')}Z`) / 1000
}

/** Answers the archive's Analytics Engine SQL like the real API, from in-memory rows. */
function fakeAnalyticsEngine(datasets: Record<string, Array<SourceRow>>, options: { countBonus?: number } = {}) {
  const queries: Array<string> = []
  const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const sql = String(init?.body ?? '')
    queries.push(sql)
    const dataset = /FROM (\w+)/u.exec(sql)?.[1] ?? ''
    const rows = datasets[dataset]
    if (!rows) return new Response(`dataset ${dataset} not found`, { status: 422 })
    const window = /toDateTime\((\d+)\) AND timestamp < toDateTime\((\d+)\)/u.exec(sql)
    const inWindow = window
      ? rows.filter((row) => {
        const seconds = unixSeconds(String(row.timestamp))
        return seconds >= Number(window[1]) && seconds < Number(window[2])
      })
      : rows
    if (sql.includes('min(timestamp)')) {
      const earliest = [...rows].map((row) => String(row.timestamp)).sort()[0] ?? '1970-01-01 00:00:00'
      return Response.json({ data: [{ rows: String(rows.length), earliest }] })
    }
    if (sql.includes('count() AS rows')) {
      return Response.json({ data: [{ rows: String(inWindow.length + (options.countBonus ?? 0)) }] })
    }
    const limit = Number(/LIMIT (\d+)/u.exec(sql)?.[1] ?? Infinity)
    return Response.json({ data: inWindow.slice(0, limit) })
  }) as unknown as typeof fetch
  return { fetchImpl, queries }
}

function analyticsQuery(fetchImpl: typeof fetch, dataset = 'oneworld_events') {
  return createAnalyticsQuery({
    CLOUDFLARE_ACCOUNT_ID: 'account',
    CLOUDFLARE_ANALYTICS_TOKEN: 'token',
    ANALYTICS_DATASET: dataset,
  }, fetchImpl)
}

function countEvents(database: DatabaseSync, where = '1 = 1'): number {
  return Number((database.prepare(`SELECT count(*) AS n FROM events WHERE ${where}`).get() as { n: number }).n)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('archive day selection', () => {
  const status = (day: string, values: Partial<DayStatus> = {}): [string, DayStatus] => [day, {
    day, rows: 1, complete: true, exportedAt: '2026-10-01T00:00:00.000Z', attempts: 1, ...values,
  }]

  it('starts at the oldest day Analytics Engine still holds, even before today - 89 days', () => {
    const days = selectDaysToExport({ now: NOW, earliestDay: '2026-07-21', statuses: new Map(), maxDays: 4 })
    expect(days).toEqual(['2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'])
  })

  it('falls back to today - 89 days and never selects today', () => {
    const days = selectDaysToExport({ now: NOW, earliestDay: null, statuses: new Map(), maxDays: 500 })
    expect(days[0]).toBe('2026-07-24')
    expect(days.at(-1)).toBe('2026-10-20')
    expect(days).toHaveLength(89)
  })

  it('skips complete days and keeps re-exporting incomplete ones oldest first', () => {
    const statuses = new Map([
      status('2026-10-15'),
      status('2026-10-16', { complete: false, attempts: 1 }),
      status('2026-10-17'),
    ])
    expect(selectDaysToExport({ now: NOW, earliestDay: '2026-10-15', statuses, maxDays: 3 }))
      .toEqual(['2026-10-16', '2026-10-18', '2026-10-19'])
  })

  it('re-exports yesterday at most once per refresh interval', () => {
    const exportedRecently = new Map([status('2026-10-20', { complete: false, exportedAt: '2026-10-21T03:30:00.000Z' })])
    expect(selectDaysToExport({ now: NOW, earliestDay: '2026-10-20', statuses: exportedRecently, maxDays: 5 })).toEqual([])
    const exportedEarlier = new Map([status('2026-10-20', { complete: false, exportedAt: '2026-10-21T02:30:00.000Z' })])
    expect(selectDaysToExport({ now: NOW, earliestDay: '2026-10-20', statuses: exportedEarlier, maxDays: 5 }))
      .toEqual(['2026-10-20'])
  })
})

describe('archive export', () => {
  it('pages a full hour into smaller windows and archives every row once', async () => {
    const { database, db } = await archiveDatabase()
    const rows = Array.from({ length: PAGE_ROWS + 250 }, (_, index) => sourceRow(
      `2026-07-21 03:${String(Math.floor(index / 120) % 60).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`,
      { blob3: `session-${index}` },
    ))
    rows.push(sourceRow('2026-07-21 23:59:59', { blob1: 'experience_open' }))
    rows.push(sourceRow('2026-07-22 00:00:00', { blob1: 'next_day' }))
    const engine = fakeAnalyticsEngine({ oneworld_events: rows })

    const first = await exportDay({
      db, query: analyticsQuery(engine.fetchImpl), dataset: 'oneworld_events', day: '2026-07-21', now: NOW,
    })
    expect(first).toMatchObject({ sourceRows: PAGE_ROWS + 251, insertedRows: PAGE_ROWS + 251, rows: PAGE_ROWS + 251, complete: true })
    expect(engine.queries.filter((sql) => sql.includes('toDateTime(1784602800) AND timestamp < toDateTime(1784606400)'))).toHaveLength(1)
    expect(engine.queries.some((sql) => sql.includes('toDateTime(1784602800) AND timestamp < toDateTime(1784604600)'))).toBe(true)
    expect(countEvents(database, "blob1 = 'next_day'")).toBe(0)

    const again = await exportDay({
      db,
      query: analyticsQuery(engine.fetchImpl),
      dataset: 'oneworld_events',
      day: '2026-07-21',
      now: NOW,
      previous: (await readDayStatuses(db, 'oneworld_events')).get('2026-07-21'),
    })
    expect(again).toMatchObject({ insertedRows: 0, rows: PAGE_ROWS + 251 })
    expect(countEvents(database)).toBe(PAGE_ROWS + 251)
    expect(database.prepare('SELECT dataset, day, rows, expected_rows, complete, attempts FROM archive_days').all())
      .toEqual([{ dataset: 'oneworld_events', day: '2026-07-21', rows: PAGE_ROWS + 251, expected_rows: PAGE_ROWS + 251, complete: 1, attempts: 2 }])
  })

  it('keeps every original column unchanged', async () => {
    const { database, db } = await archiveDatabase()
    const row = sourceRow('2026-10-01 12:34:56', {
      _sample_interval: 7, index1: 'ow_anon_1', blob7: '/explore/solar-system', blob8: 'solar-system', double2: 12.5, double4: 1790000000123,
    })
    const engine = fakeAnalyticsEngine({ oneworld_events: [row] })
    await exportDay({ db, query: analyticsQuery(engine.fetchImpl), dataset: 'oneworld_events', day: '2026-10-01', now: NOW })

    const stored = database.prepare(`SELECT dataset, occurrence, length(row_hash) AS hash_length, ${sourceColumns.join(', ')} FROM events`).get()
    expect(stored).toEqual({ dataset: 'oneworld_events', occurrence: 0, hash_length: 64, ...row })
  })

  it('keeps true duplicates as numbered occurrences without duplicating them on re-export', async () => {
    const { database, db } = await archiveDatabase()
    const duplicate = sourceRow('2026-10-20 08:00:00', { blob1: 'share' })
    const rows = [duplicate, { ...duplicate }, sourceRow('2026-10-20 08:00:00', { blob1: 'atlas_save' })]
    const engine = fakeAnalyticsEngine({ oneworld_events: rows })
    const query = analyticsQuery(engine.fetchImpl)

    const yesterday = await exportDay({ db, query, dataset: 'oneworld_events', day: '2026-10-20', now: NOW })
    expect(yesterday).toMatchObject({ insertedRows: 3, rows: 3, complete: false, attempts: 0 })
    expect(database.prepare("SELECT occurrence FROM events WHERE blob1 = 'share' ORDER BY occurrence").all())
      .toEqual([{ occurrence: 0 }, { occurrence: 1 }])

    rows.push({ ...duplicate })
    const later = await exportDay({ db, query, dataset: 'oneworld_events', day: '2026-10-20', now: NOW + 2 * 86_400_000 })
    expect(later).toMatchObject({ insertedRows: 1, rows: 4, complete: true, attempts: 1 })
    expect(countEvents(database, "blob1 = 'share'")).toBe(3)
  })

  it('accepts a lasting count mismatch only after repeated attempts', async () => {
    const { db } = await archiveDatabase()
    const engine = fakeAnalyticsEngine({ oneworld_events: [sourceRow('2026-09-01 01:00:00')] }, { countBonus: 1 })
    const query = analyticsQuery(engine.fetchImpl)
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let previous: DayStatus | undefined
    for (let attempt = 1; attempt <= MAX_COMPLETE_ATTEMPTS; attempt += 1) {
      const result = await exportDay({ db, query, dataset: 'oneworld_events', day: '2026-09-01', now: NOW, previous })
      expect(result).toMatchObject({ rows: 1, expectedRows: 2, attempts: attempt, complete: attempt === MAX_COMPLETE_ATTEMPTS })
      previous = (await readDayStatuses(db, 'oneworld_events')).get('2026-09-01')
    }
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('archive_count_mismatch'))
  })
})

describe('archive cron run', () => {
  it('backfills the oldest days first across runs and isolates a missing dataset', async () => {
    const { database, db } = await archiveDatabase()
    const rows = ['2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'].flatMap((day, index) => (
      Array.from({ length: index + 1 }, (_, item) => sourceRow(`${day} 0${item}:00:00`))
    ))
    rows.push(sourceRow('2026-10-21 01:00:00', { blob1: 'today' }))
    const engine = fakeAnalyticsEngine({ oneworld_events: rows })
    const env = {
      ANALYTICS_ARCHIVE: db,
      ARCHIVE_DATASETS: 'missing_dataset,oneworld_events',
      CLOUDFLARE_ACCOUNT_ID: 'account',
      CLOUDFLARE_ANALYTICS_TOKEN: 'token',
    } as Parameters<typeof runArchive>[0]
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clock = () => NOW

    const first = await runArchive(env, { fetchImpl: engine.fetchImpl, clock, maxDays: 2 })
    expect(first.exported.map((day) => day.day)).toEqual(['2026-07-21', '2026-07-22'])
    // A dataset Analytics Engine cannot read is reported without blocking the others.
    expect(first.failures).toBe(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('archive_dataset_error'))

    const second = await runArchive(env, { fetchImpl: engine.fetchImpl, clock, maxDays: 2 })
    expect(second.exported.map((day) => [day.day, day.rows])).toEqual([['2026-07-23', 3], ['2026-07-24', 4]])

    const complete = database.prepare('SELECT day, rows, complete FROM archive_days ORDER BY day').all()
    expect(complete).toEqual([
      { day: '2026-07-21', rows: 1, complete: 1 },
      { day: '2026-07-22', rows: 2, complete: 1 },
      { day: '2026-07-23', rows: 3, complete: 1 },
      { day: '2026-07-24', rows: 4, complete: 1 },
    ])
    expect(countEvents(database, "blob1 = 'today'")).toBe(0)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"type":"archive_run"'))
  })

  it('stops starting new days once the run budget is spent', async () => {
    const { db } = await archiveDatabase()
    const engine = fakeAnalyticsEngine({ oneworld_events: [sourceRow('2026-10-01 00:00:00')] })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    let now = NOW
    // Each day's export takes ten minutes of wall time in this run.
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const sql = String(init?.body ?? '')
      if (sql.includes('count() AS rows') && sql.includes('WHERE')) now += 10 * 60_000
      return engine.fetchImpl(input, init)
    }) as typeof fetch
    const result = await runArchive({
      ANALYTICS_ARCHIVE: db,
      ARCHIVE_DATASETS: 'oneworld_events',
      CLOUDFLARE_ACCOUNT_ID: 'account',
      CLOUDFLARE_ANALYTICS_TOKEN: 'token',
    } as Parameters<typeof runArchive>[0], {
      fetchImpl: slowFetch,
      clock: () => now,
    })
    expect(result.exported.map((day) => day.day)).toEqual(['2026-10-01'])
  })

  it('formats UTC days without local time zone drift', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-07-21', -1)).toBe('2026-07-20')
  })
})
