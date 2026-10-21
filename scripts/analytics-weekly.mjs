#!/usr/bin/env node
import { canonicalAnalyticsPathSql } from '../src/lib/analytics-path-sql.ts'
/**
 * 把 Cloudflare Analytics Engine 里的第一方事件变成一张增长周报。
 *
 * 用法：
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=yyy pnpm analytics:weekly -- --days 7
 *
 * 也兼容 Wrangler 常用的 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN。
 * API Token 只需要 "Account Analytics: Read"。
 */

const configuredAccountId = process.env.CF_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken = process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN
const dataset = process.env.OW_ANALYTICS_DATASET ?? 'oneworld_events'

if (!apiToken) {
  console.error('需要 CF_API_TOKEN（或 CLOUDFLARE_API_TOKEN）。')
  console.error('Token 权限：Account Analytics: Read。')
  process.exit(1)
}
if (!/^[a-zA-Z0-9_]+$/.test(dataset)) {
  console.error('OW_ANALYTICS_DATASET 只能包含字母、数字和下划线。')
  process.exit(1)
}

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const daysFlag = args.indexOf('--days')
const days = daysFlag >= 0 ? Number(args[daysFlag + 1]) : 7
if (!Number.isInteger(days) || days < 1 || days > 90) {
  console.error('--days 需要是 1..90 的整数。')
  process.exit(1)
}

// 列名对应 src/routes/api/-event-handler.ts 里 analyticsDataPoint() 的写入顺序。
const EVENT = 'blob1'
const SESSION = 'blob3'
const LOCALE = 'blob5'
const REFERRER = 'blob6'
const PATH = 'blob7'
const WORLD = 'blob8'
const VALUE = 'blob10'
const CAMPAIGN_SOURCE = 'blob13'
const CAMPAIGN_NAME = 'blob14'
const CAMPAIGN_CONTENT = 'blob15'
const COUNTRY = 'blob16'
const since = `NOW() - INTERVAL '${days}' DAY`

async function resolveAccountId() {
  if (configuredAccountId) return configuredAccountId

  const response = await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=50', {
    headers: {Authorization: `Bearer ${apiToken}`},
  })
  const body = await response.json()
  const accounts = Array.isArray(body.result) ? body.result : []
  if (!response.ok || accounts.length !== 1 || typeof accounts[0]?.id !== 'string') {
    throw new Error('无法自动确定唯一 Cloudflare Account；请设置 CF_ACCOUNT_ID。')
  }
  return accounts[0].id
}

const accountId = await resolveAccountId()

async function query(sql) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response
    let body
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
        {
          method: 'POST',
          headers: {Authorization: `Bearer ${apiToken}`},
          body: sql,
        },
      )
      body = await response.text()
    } catch (error) {
      lastError = error
    }
    if (response?.ok && body !== undefined) {
      try {
        return JSON.parse(body).data ?? []
      } catch {
        throw new Error(`Unexpected response: ${body.slice(0, 400)}`)
      }
    }
    if (response && body !== undefined) {
      const error = new Error(`Analytics Engine ${response.status}: ${body.slice(0, 400)}`)
      if (response.status !== 429 && response.status < 500) throw error
      lastError = error
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (2 ** attempt)))
    }
  }
  throw lastError
}

async function eventTotals() {
  return query(`
    SELECT ${EVENT} AS event,
           ${VALUE} AS value,
           SUM(_sample_interval) AS hits,
           COUNT(DISTINCT ${SESSION}) AS sessions
    FROM ${dataset}
    WHERE timestamp > ${since} AND blob18 != 'bot'
    GROUP BY event, value
    ORDER BY sessions DESC
    FORMAT JSON
  `)
}

async function sessionFunnel() {
  const rows = await query(`
    SELECT COUNT() AS opens,
           countIf(reached5s > 0) AS reached5s,
           countIf(reached15s > 0) AS reached15s,
           countIf(reached30s > 0) AS reached30s,
           countIf(interacted > 0) AS interacted,
           countIf(guide_done > 0) AS guide_done,
           countIf(saved > 0) AS saved,
           countIf(share_open > 0) AS share_open,
           countIf(shared > 0) AS shared,
           countIf(follow_shown > 0) AS follow_shown,
           countIf(follow_click > 0) AS follow_click,
           countIf(timeouts > 0) AS timeouts
    FROM (
      SELECT ${SESSION} AS session,
             countIf(${EVENT} = 'experience_open') AS opened,
             countIf(${EVENT} = 'experience_engaged' AND ${VALUE} = '5s') AS reached5s,
             countIf(${EVENT} = 'experience_engaged' AND ${VALUE} = '15s') AS reached15s,
             countIf(${EVENT} = 'experience_engaged' AND ${VALUE} = '30s') AS reached30s,
             countIf(${EVENT} = 'first_interaction') AS interacted,
             countIf(${EVENT} = 'guide_complete') AS guide_done,
             countIf(${EVENT} = 'atlas_save') AS saved,
             countIf(${EVENT} = 'share_open') AS share_open,
             countIf(${EVENT} = 'share') AS shared,
             countIf(${EVENT} = 'follow_prompt_shown') AS follow_shown,
             countIf(${EVENT} = 'follow_prompt_click' AND ${VALUE} IN ('x', 'wechat')) AS follow_click,
             countIf(${EVENT} = 'experience_load_timeout') AS timeouts
      FROM ${dataset}
      WHERE timestamp > ${since} AND blob18 != 'bot'
      GROUP BY session
      HAVING opened > 0
    )
    FORMAT JSON
  `)
  const row = rows[0] ?? {}
  const reached30s = Number(row.reached30s ?? 0)
  const reached15s = Math.max(Number(row.reached15s ?? 0), reached30s)
  const reached5s = Math.max(Number(row.reached5s ?? 0), reached15s)
  return {
    opens: Number(row.opens ?? 0),
    reached5s,
    reached15s,
    reached30s,
    interacted: Number(row.interacted ?? 0),
    guideDone: Number(row.guide_done ?? 0),
    saved: Number(row.saved ?? 0),
    shareOpen: Number(row.share_open ?? 0),
    shared: Number(row.shared ?? 0),
    followShown: Number(row.follow_shown ?? 0),
    followClick: Number(row.follow_click ?? 0),
    timeouts: Number(row.timeouts ?? 0),
  }
}

async function perWorld() {
  const rows = await query(`
    SELECT world,
           COUNT() AS opens,
           countIf(reached5s > 0) AS reached5s,
           countIf(reached15s > 0) AS reached15s,
           countIf(reached30s > 0) AS reached30s,
           countIf(interacted > 0) AS interacted,
           countIf(guide_done > 0) AS guide_done,
           countIf(shared > 0) AS shared,
           countIf(timeouts > 0) AS timeouts
    FROM (
      SELECT ${WORLD} AS world,
             ${SESSION} AS session,
             countIf(${EVENT} = 'experience_open') AS opened,
             countIf(${EVENT} = 'experience_engaged' AND ${VALUE} = '5s') AS reached5s,
             countIf(${EVENT} = 'experience_engaged' AND ${VALUE} = '15s') AS reached15s,
             countIf(${EVENT} = 'experience_engaged' AND ${VALUE} = '30s') AS reached30s,
             countIf(${EVENT} = 'first_interaction') AS interacted,
             countIf(${EVENT} = 'guide_complete') AS guide_done,
             countIf(${EVENT} = 'share') AS shared,
             countIf(${EVENT} = 'experience_load_timeout') AS timeouts
      FROM ${dataset}
      WHERE timestamp > ${since} AND blob18 != 'bot'
        AND ${WORLD} != ''
      GROUP BY world, session
      HAVING opened > 0
    )
    GROUP BY world
    ORDER BY opens DESC
    LIMIT 200
    FORMAT JSON
  `)

  return rows.map((row) => {
    const reached30s = Number(row.reached30s)
    const reached15s = Math.max(Number(row.reached15s), reached30s)
    const reached5s = Math.max(Number(row.reached5s), reached15s)
    const world = {
      world: row.world,
      opens: Number(row.opens),
      reached5s,
      reached15s,
      reached30s,
      interacted: Number(row.interacted),
      guideCompleted: Number(row.guide_done),
      shared: Number(row.shared),
      timeouts: Number(row.timeouts),
    }
    return {
      ...world,
      reach5sRate: ratio(world.reached5s, world.opens),
      reach15sRate: ratio(world.reached15s, world.opens),
      reach30sRate: ratio(world.reached30s, world.opens),
      interactionRate: ratio(world.interacted, world.opens),
      shareRate: ratio(world.shared, world.opens),
    }
  })
}

async function perPage() {
  const rows = await query(`
    SELECT path,
           COUNT() AS sessions,
           countIf(reached5s > 0) AS reached5s,
           countIf(reached15s > 0) AS reached15s,
           countIf(reached30s > 0) AS reached30s
    FROM (
      SELECT ${canonicalAnalyticsPathSql(PATH)} AS path,
             ${SESSION} AS session,
             countIf(${EVENT} = 'page_view') AS viewed,
             countIf(${EVENT} = 'page_engaged' AND ${VALUE} = '5s') AS reached5s,
             countIf(${EVENT} = 'page_engaged' AND ${VALUE} = '15s') AS reached15s,
             countIf(${EVENT} = 'page_engaged' AND ${VALUE} = '30s') AS reached30s
      FROM ${dataset}
      WHERE timestamp > ${since} AND blob18 != 'bot'
        AND ${EVENT} IN ('page_view', 'page_engaged')
      GROUP BY path, session
      HAVING viewed > 0
    )
    GROUP BY path
    ORDER BY sessions DESC
    LIMIT 200
    FORMAT JSON
  `)

  return rows.map((row) => {
    const reached30s = Number(row.reached30s)
    const reached15s = Math.max(Number(row.reached15s), reached30s)
    const reached5s = Math.max(Number(row.reached5s), reached15s)
    const page = {
      path: row.path,
      sessions: Number(row.sessions),
      reached5s,
      reached15s,
      reached30s,
    }
    return {
      ...page,
      reach5sRate: ratio(page.reached5s, page.sessions),
      reach15sRate: ratio(page.reached15s, page.sessions),
      reach30sRate: ratio(page.reached30s, page.sessions),
    }
  })
}

async function multiWorldSessions() {
  // 北极星口径：同一会话内发生真实互动，并打开第二个不同世界。
  // first_interaction 只会发生在已打开的世界里，因此把它并入 DISTINCT 不改变世界计数。
  const rows = await query(`
    SELECT countIf(worlds >= 2) AS multi_world,
           countIf(worlds >= 2 AND interacted > 0) AS north_star
    FROM (
      SELECT ${SESSION} AS session,
             COUNT(DISTINCT ${WORLD}) AS worlds,
             countIf(${EVENT} = 'experience_open') AS opens,
             countIf(${EVENT} = 'first_interaction') AS interacted
      FROM ${dataset}
      WHERE timestamp > ${since} AND blob18 != 'bot'
        AND ${EVENT} IN ('experience_open', 'first_interaction')
        AND ${WORLD} != ''
      GROUP BY session
      HAVING opens > 0
    )
    FORMAT JSON
  `)
  return {
    multiWorld: Number(rows[0]?.multi_world ?? 0),
    northStar: Number(rows[0]?.north_star ?? 0),
  }
}

async function dimension(column, alias, {event = 'experience_open', limit = 20} = {}) {
  return (await query(`
    SELECT ${column} AS ${alias},
           COUNT(DISTINCT ${SESSION}) AS sessions
    FROM ${dataset}
    WHERE timestamp > ${since} AND blob18 != 'bot'
      AND ${EVENT} = '${event}'
      AND ${column} != ''
    GROUP BY ${alias}
    ORDER BY sessions DESC
    LIMIT ${limit}
    FORMAT JSON
  `)).map((row) => ({[alias]: row[alias], sessions: Number(row.sessions)}))
}

async function campaigns() {
  return (await query(`
    SELECT ${CAMPAIGN_SOURCE} AS source,
           ${CAMPAIGN_NAME} AS campaign,
           ${CAMPAIGN_CONTENT} AS content,
           COUNT(DISTINCT ${SESSION}) AS sessions
    FROM ${dataset}
    WHERE timestamp > ${since} AND blob18 != 'bot'
      AND ${EVENT} = 'experience_open'
      AND ${CAMPAIGN_SOURCE} != ''
    GROUP BY source, campaign, content
    ORDER BY sessions DESC
    LIMIT 30
    FORMAT JSON
  `)).map((row) => ({
    source: row.source,
    campaign: row.campaign,
    content: row.content,
    sessions: Number(row.sessions),
  }))
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function rateText(numerator, denominator, hasData = true) {
  if (!hasData || denominator === 0) return '—'
  return percent(numerator / denominator)
}

const [
  eventRows,
  funnel,
  worlds,
  pages,
  journey,
  referrers,
  countries,
  locales,
  campaignRows,
] = await Promise.all([
  eventTotals(),
  sessionFunnel(),
  perWorld(),
  perPage(),
  multiWorldSessions(),
  dimension(REFERRER, 'host', {limit: 15}),
  dimension(COUNTRY, 'country', {limit: 260}),
  dimension(LOCALE, 'locale', {limit: 5}),
  campaigns(),
])

// Actionable diagnostics share the same production-human filter as the funnel.
const [performanceByPage, failuresByRelease] = await Promise.all([
  query(`
    SELECT path, device, release, metric, SUM(weight) AS samples,
           quantileExactWeighted(0.75)(value, weight) AS p75
    FROM (
      SELECT ${canonicalAnalyticsPathSql('blob7')} AS path, blob17 AS device, blob19 AS release, blob1 AS metric,
             blob3 AS session, if(blob20 != '', blob20, blob12) AS measurement,
             argMax(double2, double4) AS value, max(_sample_interval) AS weight
      FROM ${dataset}
      WHERE timestamp > ${since} AND blob18 != 'bot'
        AND blob1 IN ('web_vital_lcp', 'web_vital_inp', 'web_vital_cls', 'web_vital_ttfb')
        AND double2 >= 0
      GROUP BY path, device, release, metric, session, measurement
    )
    GROUP BY path, device, release, metric
    ORDER BY samples DESC
    LIMIT 300
    FORMAT JSON
  `),
  query(`
    SELECT blob8 AS world, blob19 AS release, blob1 AS event, blob10 AS reason,
           COUNT(DISTINCT blob3) AS sessions
    FROM ${dataset}
    WHERE timestamp > ${since} AND blob18 != 'bot'
      AND blob1 IN ('experience_error', 'experience_load_timeout', 'feedback_error', 'share_error')
    GROUP BY world, release, event, reason
    ORDER BY sessions DESC
    LIMIT 100
    FORMAT JSON
  `),
])

const {
  opens,
  reached5s,
  reached15s,
  reached30s,
  interacted,
  guideDone,
  shared,
  shareOpen,
  saved,
  followShown,
  followClick,
  timeouts,
} = funnel
const hasPageEngagement = eventRows.some((row) => row.event === 'page_engaged')

if (asJson) {
  console.log(JSON.stringify({
    days,
    capturedAt: new Date().toISOString(),
    methodology: 'production-human-v2; historical QA and legacy path misclassification cannot be reconstructed',
    diagnostics: { performanceByPage, failuresByRelease, events: eventRows, performanceLimit: 300, failureLimit: 100 },
    funnel: {
      opens,
      reached5s,
      reached15s,
      reached30s,
      interacted,
      guideDone,
      continuedSessions: journey.multiWorld,
      northStarSessions: journey.northStar,
      saved,
      shareOpen,
      shared,
      followShown,
      followClick,
      timeouts,
    },
    worlds,
    pages,
    referrers,
    countries,
    locales,
    campaigns: campaignRows,
  }, null, 2))
} else {

console.log(`\n近 ${days} 天 · dataset=${dataset}\n${'='.repeat(64)}`)
console.log('\n世界会话漏斗（只累计浏览器前台可见时间）')
console.log(`  打开世界          ${opens}`)
console.log(`  看满 5 秒         ${reached5s}  ${rateText(reached5s, opens)}`)
console.log(`  看满 15 秒        ${reached15s}  ${rateText(reached15s, opens)}`)
console.log(`  看满 30 秒        ${reached30s}  ${rateText(reached30s, opens)}`)
console.log(`  发生真实互动      ${interacted}  ${rateText(interacted, opens)}`)
console.log(`  打开第二个世界    ${journey.multiWorld}  ${rateText(journey.multiWorld, opens)}`)
console.log(`  ★ 北极星·续玩会话 ${journey.northStar}  （真实互动 + 第二个世界）`)
console.log(`  讲完故事          ${guideDone}  ${rateText(guideDone, opens)}`)
console.log(`  收藏              ${saved}  ${rateText(saved, opens)}`)
console.log(`  打开分享          ${shareOpen}  ${rateText(shareOpen, opens)}`)
console.log(`  完成分享          ${shared}  ${rateText(shared, opens)}`)
console.log(`  看到关注提示      ${followShown}  ${rateText(followShown, opens)}`)
console.log(`  点击关注          ${followClick}  ${rateText(followClick, opens)}`)
if (timeouts > 0) console.log(`  ⚠ 加载超时        ${timeouts}`)

console.log('\n每个世界（按打开会话排序）')
console.log('  世界                         打开     ≥5s    ≥15s    ≥30s    互动    分享')
for (const world of worlds.filter((item) => item.opens > 0).slice(0, 30)) {
  console.log(
    `  ${world.world.padEnd(28)}`
    + `${String(world.opens).padStart(6)}`
    + `${percent(world.reach5sRate).padStart(8)}`
    + `${percent(world.reach15sRate).padStart(8)}`
    + `${percent(world.reach30sRate).padStart(8)}`
    + `${percent(world.interactionRate).padStart(8)}`
    + `${percent(world.shareRate).padStart(8)}`
    + (world.timeouts > 0 ? `  ⚠ ${world.timeouts} 超时` : ''),
  )
}
if (worlds.every((world) => world.opens === 0)) console.log('  暂无世界打开数据。')

console.log('\n每个页面的可见停留（浏览器切到后台不计时）')
if (!hasPageEngagement) {
  console.log('  现有版本只收 page_view；发布本次改动后开始显示 ≥5/15/30 秒。')
}
console.log('  页面                                  会话     ≥5s    ≥15s    ≥30s')
for (const page of pages.filter((item) => item.sessions > 0).slice(0, 30)) {
  console.log(
    `  ${page.path.padEnd(36)}`
    + `${String(page.sessions).padStart(6)}`
    + `${rateText(page.reached5s, page.sessions, hasPageEngagement).padStart(8)}`
    + `${rateText(page.reached15s, page.sessions, hasPageEngagement).padStart(8)}`
    + `${rateText(page.reached30s, page.sessions, hasPageEngagement).padStart(8)}`,
  )
}

console.log('\n访问地区（由 Cloudflare 边缘请求生成，不信任客户端）')
if (countries.length === 0) {
  console.log('  发布本次改动后开始区分中国大陆与海外。')
} else {
  const china = countries.find((row) => row.country === 'CN')?.sessions ?? 0
  const overseas = countries
    .filter((row) => row.country !== 'CN')
    .reduce((total, row) => total + row.sessions, 0)
  console.log(`  中国大陆          ${china}`)
  console.log(`  海外              ${overseas}`)
  console.log(`  国家/地区明细     ${countries.slice(0, 12).map((row) => `${row.country} ${row.sessions}`).join(' · ')}`)
}

console.log('\n界面语言')
if (locales.length === 0) console.log('  暂无数据。')
for (const row of locales) console.log(`  ${row.locale.padEnd(10)} ${row.sessions}`)

console.log('\n投放归因（utm_source / utm_campaign / utm_content）')
if (campaignRows.length === 0) {
  console.log('  暂无带 UTM 的访问；发布后用文档里的渠道链接。')
} else {
  for (const row of campaignRows) {
    console.log(`  ${row.source.padEnd(10)} ${(row.campaign || '—').padEnd(28)} ${(row.content || '—').padEnd(16)} ${row.sessions}`)
  }
}

console.log('\n外部来源域名')
if (referrers.length === 0) console.log('  没有带 referrer 的世界会话。')
for (const row of referrers) console.log(`  ${row.host.padEnd(36)} ${row.sessions}`)
console.log('\n性能与故障排查（排除已识别机器人；历史无标识 QA 无法追溯）')
for (const row of performanceByPage.slice(0, 15)) console.log(`  ${row.path} · ${row.device || 'unknown'} · ${row.metric}: p75=${row.p75}, samples=${row.samples}, release=${row.release || 'historical'}`)
for (const row of failuresByRelease.slice(0, 15)) console.log(`  ${row.world || 'website'} · ${row.event} · ${row.reason || 'unknown'}: ${row.sessions}, release=${row.release || 'historical'}`)
console.log()

}
