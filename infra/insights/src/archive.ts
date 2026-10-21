import { createAnalyticsQuery, type AnalyticsQuery } from './analytics'

// Workers Analytics Engine keeps raw rows for three months. This module copies
// every row of each UTC day into the D1 database bound as ANALYTICS_ARCHIVE so
// the events outlive that retention. The schema and the duplicate handling are
// documented in migrations/0001_events_archive.sql.

const blobColumns = Array.from({ length: 20 }, (_, index) => `blob${index + 1}`)
const doubleColumns = Array.from({ length: 20 }, (_, index) => `double${index + 1}`)

/** Columns read from Analytics Engine, stored unchanged. */
export const sourceColumns = ['timestamp', '_sample_interval', 'index1', ...blobColumns, ...doubleColumns] as const
const archiveColumns = ['dataset', ...sourceColumns, 'occurrence', 'row_hash'] as const

const DAY_MS = 86_400_000
const HOUR_SECONDS = 3_600
/** Rows requested per Analytics Engine query; a fuller window is split in half. */
export const PAGE_ROWS = 5_000
/** Hours of one day fetched from Analytics Engine at the same time. */
const PARALLEL_HOURS = 4
/** Rows per D1 statement; all rows travel as one bound JSON parameter (D1: 2 MB per value). */
const INSERT_CHUNK_ROWS = 500
const INSERT_CHUNK_BYTES = 900_000
/** Exports of a fully past day before a lasting count mismatch is accepted. */
export const MAX_COMPLETE_ATTEMPTS = 3
/** Yesterday keeps receiving late rows, so it is re-exported, at most this often. */
export const YESTERDAY_REFRESH_MS = 60 * 60 * 1000
/** Lower bound of the export window when Analytics Engine reports no earliest row. */
export const RETENTION_LOOKBACK_DAYS = 89
export const DEFAULT_MAX_DAYS_PER_RUN = 10
/** Stop starting new days after this much wall time, well before the next 10-minute cron. */
export const DEFAULT_RUN_BUDGET_MS = 5 * 60 * 1000

type SourceRow = Record<string, unknown>
type ArchiveValue = string | number | null
export type ArchiveDatabase = Pick<D1Database, 'prepare' | 'batch'>

export type DayStatus = {
  day: string
  rows: number
  complete: boolean
  exportedAt: string | null
  attempts: number
}

export type DayExport = {
  dataset: string
  day: string
  sourceRows: number
  expectedRows: number
  insertedRows: number
  rows: number
  complete: boolean
  attempts: number
}

const insertSql = `INSERT OR IGNORE INTO events (${archiveColumns.join(', ')}) SELECT ${
  archiveColumns.map((_, index) => `json_extract(value, '$[${index}]')`).join(', ')
} FROM json_each(?1)`

export function utcDay(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  return utcDay(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
}

function dayStartSeconds(day: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(day) || addDays(day, 0) !== day) throw new Error(`Invalid UTC day: ${day}`)
  return Date.parse(`${day}T00:00:00Z`) / 1000
}

/** Yesterday can still receive late rows; only older days are final. */
export function isFullyPast(day: string, now: number): boolean {
  return day <= addDays(utcDay(now), -2)
}

export function parseArchiveDatasets(value: string | undefined): Array<string> {
  const datasets = (value ?? '').split(',').map((name) => name.trim()).filter(Boolean)
  for (const dataset of datasets) {
    if (!/^[A-Za-z0-9_]+$/u.test(dataset)) throw new Error(`Invalid Analytics Engine dataset name: ${dataset}`)
  }
  return [...new Set(datasets)]
}

/**
 * Days to export, oldest first: every day from the earliest one Analytics
 * Engine still holds (today - 89 days when unknown) up to yesterday that is not
 * complete yet. Yesterday is skipped while its last export is recent.
 */
export function selectDaysToExport(options: {
  now: number
  earliestDay: string | null
  statuses: ReadonlyMap<string, DayStatus>
  maxDays: number
}): Array<string> {
  const today = utcDay(options.now)
  const yesterday = addDays(today, -1)
  const first = options.earliestDay ?? addDays(today, -RETENTION_LOOKBACK_DAYS)
  const days: Array<string> = []
  for (let day = first; day <= yesterday && days.length < options.maxDays; day = addDays(day, 1)) {
    const status = options.statuses.get(day)
    if (status?.complete) continue
    if (
      day === yesterday
      && status?.exportedAt
      && options.now - Date.parse(status.exportedAt) < YESTERDAY_REFRESH_MS
    ) continue
    days.push(day)
  }
  return days
}

function windowFilter(startSeconds: number, endSeconds: number): string {
  return `timestamp >= toDateTime(${startSeconds}) AND timestamp < toDateTime(${endSeconds})`
}

/** Earliest UTC day the dataset still holds, or null when it is empty. */
export async function earliestSourceDay(query: AnalyticsQuery): Promise<string | null> {
  const [row] = await query(`
    SELECT count() AS rows, min(timestamp) AS earliest
    FROM __DATASET__
    FORMAT JSON
  `)
  if (!row || Number(row.rows ?? 0) <= 0) return null
  const earliest = String(row.earliest ?? '')
  if (!/^\d{4}-\d{2}-\d{2}/u.test(earliest)) throw new Error(`Unexpected earliest timestamp: ${earliest.slice(0, 40)}`)
  return earliest.slice(0, 10)
}

async function countSourceRows(query: AnalyticsQuery, startSeconds: number, endSeconds: number): Promise<number> {
  const [row] = await query(`
    SELECT count() AS rows
    FROM __DATASET__
    WHERE ${windowFilter(startSeconds, endSeconds)}
    FORMAT JSON
  `)
  const rows = Number(row?.rows ?? 0)
  if (!Number.isFinite(rows)) throw new Error('Analytics Engine returned an invalid row count.')
  return rows
}

/** Every row in [start, end), split into smaller windows when a page is full. */
export async function fetchWindowRows(
  query: AnalyticsQuery,
  startSeconds: number,
  endSeconds: number,
): Promise<Array<SourceRow>> {
  const rows = await query(`
    SELECT ${sourceColumns.join(', ')}
    FROM __DATASET__
    WHERE ${windowFilter(startSeconds, endSeconds)}
    LIMIT ${PAGE_ROWS + 1}
    FORMAT JSON
  `)
  if (rows.length <= PAGE_ROWS) return rows
  if (endSeconds - startSeconds <= 1) {
    throw new Error(`More than ${PAGE_ROWS} rows in one second at ${startSeconds}; raise PAGE_ROWS.`)
  }
  const middle = startSeconds + Math.floor((endSeconds - startSeconds) / 2)
  const [left, right] = await Promise.all([
    fetchWindowRows(query, startSeconds, middle),
    fetchWindowRows(query, middle, endSeconds),
  ])
  return left.concat(right)
}

function sourceValues(row: SourceRow, day: string): Array<ArchiveValue> {
  return sourceColumns.map((column) => {
    const value = row[column]
    if (column === 'timestamp') {
      if (typeof value !== 'string' || !value.startsWith(day) || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(value)) {
        throw new Error(`Unexpected Analytics Engine timestamp for ${day}: ${String(value).slice(0, 40)}`)
      }
      return value
    }
    if (column === '_sample_interval') {
      const interval = Number(value)
      if (!Number.isInteger(interval) || interval < 1) throw new Error(`Invalid _sample_interval: ${String(value)}`)
      return interval
    }
    if (column.startsWith('double')) {
      if (value === null || (typeof value === 'number' && Number.isFinite(value))) return value
      if (typeof value === 'string') return value
      throw new Error(`Invalid ${column}: ${String(value).slice(0, 40)}`)
    }
    if (typeof value !== 'string') throw new Error(`Missing Analytics Engine column ${column}.`)
    return value
  })
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Archive rows with their occurrence number and row hash. Identical rows share
 * a timestamp second, so they always arrive in the same window.
 */
export async function archiveRows(
  dataset: string,
  day: string,
  rows: ReadonlyArray<SourceRow>,
): Promise<Array<Array<ArchiveValue>>> {
  const occurrences = new Map<string, number>()
  return Promise.all(rows.map(async (row) => {
    const values: Array<ArchiveValue> = [dataset, ...sourceValues(row, day)]
    const content = JSON.stringify(values)
    const occurrence = occurrences.get(content) ?? 0
    occurrences.set(content, occurrence + 1)
    values.push(occurrence)
    values.push(await sha256Hex(JSON.stringify(values)))
    return values
  }))
}

async function insertArchiveRows(db: ArchiveDatabase, rows: ReadonlyArray<Array<ArchiveValue>>): Promise<number> {
  if (rows.length === 0) return 0
  const statements: Array<D1PreparedStatement> = []
  let chunk: Array<string> = []
  let chunkBytes = 2
  const flush = () => {
    if (chunk.length === 0) return
    statements.push(db.prepare(insertSql).bind(`[${chunk.join(',')}]`))
    chunk = []
    chunkBytes = 2
  }
  for (const row of rows) {
    const encoded = JSON.stringify(row)
    if (chunk.length >= INSERT_CHUNK_ROWS || chunkBytes + encoded.length + 1 > INSERT_CHUNK_BYTES) flush()
    chunk.push(encoded)
    chunkBytes += encoded.length + 1
  }
  flush()
  const results = await db.batch(statements)
  return results.reduce((total, result) => total + Number(result.meta?.changes ?? 0), 0)
}

async function countArchivedRows(db: ArchiveDatabase, dataset: string, day: string): Promise<number> {
  const row = await db.prepare(
    'SELECT count(*) AS rows FROM events WHERE dataset = ?1 AND timestamp >= ?2 AND timestamp < ?3',
  ).bind(dataset, day, addDays(day, 1)).first<{ rows: number }>()
  return Number(row?.rows ?? 0)
}

export async function readDayStatuses(db: ArchiveDatabase, dataset: string): Promise<Map<string, DayStatus>> {
  const { results } = await db.prepare(
    'SELECT day, rows, complete, exported_at, attempts FROM archive_days WHERE dataset = ?1',
  ).bind(dataset).all<{ day: string; rows: number; complete: number; exported_at: string; attempts: number }>()
  return new Map(results.map((row) => [row.day, {
    day: row.day,
    rows: Number(row.rows),
    complete: Number(row.complete) === 1,
    exportedAt: row.exported_at,
    attempts: Number(row.attempts),
  }]))
}

/**
 * Copy one UTC day of a dataset into D1 hour by hour and record it in
 * archive_days. Safe to repeat: rows already archived are ignored.
 */
export async function exportDay(options: {
  db: ArchiveDatabase
  query: AnalyticsQuery
  dataset: string
  day: string
  now: number
  previous?: DayStatus
}): Promise<DayExport> {
  const { db, query, dataset, day } = options
  const dayStart = dayStartSeconds(day)
  const expectedRows = await countSourceRows(query, dayStart, dayStart + 24 * HOUR_SECONDS)
  let sourceRows = 0
  let insertedRows = 0
  for (let hour = 0; expectedRows > 0 && hour < 24; hour += PARALLEL_HOURS) {
    const hours = Array.from({ length: Math.min(PARALLEL_HOURS, 24 - hour) }, (_, offset) => hour + offset)
    const windows = await Promise.all(hours.map((value) => {
      const start = dayStart + value * HOUR_SECONDS
      return fetchWindowRows(query, start, start + HOUR_SECONDS)
    }))
    for (const rows of windows) {
      sourceRows += rows.length
      insertedRows += await insertArchiveRows(db, await archiveRows(dataset, day, rows))
    }
  }
  const rows = await countArchivedRows(db, dataset, day)
  const fullyPast = isFullyPast(day, options.now)
  const attempts = (options.previous?.attempts ?? 0) + (fullyPast ? 1 : 0)
  const countsAgree = rows >= expectedRows
  const complete = fullyPast && (countsAgree || attempts >= MAX_COMPLETE_ATTEMPTS)
  if (!countsAgree) {
    console.warn(JSON.stringify({
      type: 'archive_count_mismatch', dataset, day, rows, expectedRows, sourceRows, attempts, complete,
    }))
  }
  await db.prepare(`
    INSERT INTO archive_days (dataset, day, rows, expected_rows, exported_at, complete, attempts)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT (dataset, day) DO UPDATE SET
      rows = excluded.rows,
      expected_rows = excluded.expected_rows,
      exported_at = excluded.exported_at,
      complete = excluded.complete,
      attempts = excluded.attempts
  `).bind(dataset, day, rows, expectedRows, new Date(options.now).toISOString(), complete ? 1 : 0, attempts).run()
  return { dataset, day, sourceRows, expectedRows, insertedRows, rows, complete, attempts }
}

type ArchiveEnv = {
  ANALYTICS_ARCHIVE: ArchiveDatabase
  ARCHIVE_DATASETS: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_ANALYTICS_TOKEN: string
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 360)
}

/** One cron run: export the oldest unfinished days of each dataset within the run budget. */
export async function runArchive(env: ArchiveEnv, options: {
  fetchImpl?: typeof fetch
  clock?: () => number
  maxDays?: number
  budgetMs?: number
} = {}): Promise<{ exported: Array<DayExport>; failures: number }> {
  const clock = options.clock ?? Date.now
  const started = clock()
  const budgetMs = options.budgetMs ?? DEFAULT_RUN_BUDGET_MS
  let remainingDays = options.maxDays ?? DEFAULT_MAX_DAYS_PER_RUN
  const exported: Array<DayExport> = []
  const pending: Record<string, number> = {}
  let failures = 0
  const overBudget = () => clock() - started >= budgetMs

  for (const dataset of parseArchiveDatasets(env.ARCHIVE_DATASETS)) {
    if (remainingDays <= 0 || overBudget()) break
    const query = createAnalyticsQuery({ ...env, ANALYTICS_DATASET: dataset }, options.fetchImpl ?? fetch)
    let days: Array<string>
    let statuses: Map<string, DayStatus>
    try {
      const [earliestDay, knownStatuses] = await Promise.all([
        earliestSourceDay(query),
        readDayStatuses(env.ANALYTICS_ARCHIVE, dataset),
      ])
      statuses = knownStatuses
      days = earliestDay === null ? [] : selectDaysToExport({
        now: clock(), earliestDay, statuses, maxDays: Number.POSITIVE_INFINITY,
      })
    } catch (error) {
      failures += 1
      console.error(JSON.stringify({ type: 'archive_dataset_error', dataset, message: errorMessage(error) }))
      continue
    }
    pending[dataset] = days.length
    for (const day of days.slice(0, remainingDays)) {
      if (overBudget()) break
      const dayStarted = clock()
      try {
        const result = await exportDay({
          db: env.ANALYTICS_ARCHIVE, query, dataset, day, now: clock(), previous: statuses.get(day),
        })
        exported.push(result)
        remainingDays -= 1
        pending[dataset] -= 1
        console.log(JSON.stringify({ type: 'archive_day', ...result, ms: clock() - dayStarted }))
      } catch (error) {
        // Stop this dataset so the oldest day is retried first on the next run.
        failures += 1
        console.error(JSON.stringify({ type: 'archive_day_error', dataset, day, message: errorMessage(error) }))
        break
      }
    }
  }

  console.log(JSON.stringify({
    type: 'archive_run',
    exportedDays: exported.length,
    insertedRows: exported.reduce((total, day) => total + day.insertedRows, 0),
    // Days selected for export that this run did not reach.
    pendingDays: pending,
    failures,
    ms: clock() - started,
  }))
  return { exported, failures }
}
