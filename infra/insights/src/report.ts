import type { buildDashboardData } from './analytics'

export type DashboardData = Awaited<ReturnType<typeof buildDashboardData>>

export type ReportFact = {
  id: string
  label: string
  value: string
  context: string
}

type ReportPoint = {
  headline: string
  narrative: string
  factIds: Array<string>
}

type ReportRecommendation = {
  action: string
  rationale: string
  successMetricId: string
}

export type AiInsightsReport = {
  title: string
  executiveSummary: Array<ReportPoint>
  findings: Array<ReportPoint>
  recommendations: Array<ReportRecommendation>
  questions: Array<string>
  caveats: Array<string>
  facts: Array<ReportFact>
  generatedAt: string
  dataThrough: string
  days: number
  model: string
}

export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiInsightsAnswer = {
  answer: string
  factIds: Array<string>
  suggestedQuestions: Array<string>
  facts: Array<ReportFact>
  generatedAt: string
  dataThrough: string
  days: number
  model: string
}

type ReportEnvironment = {
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_BASE_URL: string
  DEEPSEEK_MODEL: string
}

const allowedModels = new Set(['deepseek-v4-flash', 'deepseek-v4-pro'])

function number(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function decimal(value: number | null, digits = 2): string {
  return value === null ? '暂无数据' : value.toFixed(digits)
}

function percent(value: number | null, digits = 1): string {
  return value === null ? '暂无数据' : `${(value * 100).toFixed(digits)}%`
}

function duration(value: number | null): string {
  if (value === null) return '暂无数据'
  const seconds = Math.max(0, Math.round(value))
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分`
}

function metricFact(id: string, label: string, value: string, context: string): ReportFact {
  return { id, label, value, context }
}

function relativeMovement(value: number | null): string {
  if (value === null) return '暂无完整上一周期'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${(value * 100).toFixed(1)}%`
}

function pointMovement(value: number | null): string {
  if (value === null) return '暂无完整上一周期'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${(value * 100).toFixed(1)} 个百分点`
}

export function buildReportFacts(data: DashboardData): Array<ReportFact> {
  const site = data.summary.current
  const rates = data.summary.rates
  const play = data.play.current
  const facts = [
    metricFact('northstar.continued_sessions', '北极星·续玩会话', number(site.continuedPlaySessions), '同一会话内发生真实互动并打开第二个不同世界的会话数；站点唯一定量北极星'),
    metricFact('audience.dau', '近一日活跃用户', number(data.activity.dau.current), '最近一天内至少浏览过一个页面的去重匿名访客'),
    metricFact('audience.wau', '近七日活跃用户', number(data.activity.wau.current), '最近七天内至少浏览过一个页面的去重匿名访客'),
    metricFact('audience.mau', '近三十日活跃用户', number(data.activity.mau.current), '最近三十天内至少浏览过一个页面的去重匿名访客'),
    metricFact('site.visitors', '独立访客', number(site.visitors), `滚动 ${data.meta.days} 天的匿名访客近似值`),
    metricFact('site.sessions', '网站会话', number(site.pageSessions), '至少发生一次页面浏览的标签页会话'),
    metricFact('site.pageviews', '页面浏览', number(site.pageviews), '站内页面浏览总量'),
    metricFact('site.pages_per_session', '页数／会话', decimal(rates.pagesPerSession), '页面浏览除以网站会话'),
    metricFact('site.bounce5', '五秒跳出率', percent(rates.bounce5Rate), '会话内没有任何页面前台可见达到五秒'),
    metricFact('product.world_entry', '进入世界率', percent(rates.worldEntryRate), '网站会话中至少打开一个互动世界'),
    metricFact('product.players', '匿名玩家', number(site.players), '至少打开过一个互动世界的匿名访客'),
    metricFact('product.plays', '世界游玩', number(play.visits), '按会话与世界去重'),
    metricFact('product.retention30', '三十秒沉浸率', percent(play.retention30Rate), '世界在前台可见达到三十秒'),
    metricFact('product.interaction', '真实互动率', percent(play.interactionRate), '发生鼠标、触摸或键盘真实操作'),
    metricFact('product.deep_play', '深度游玩率', percent(play.deepPlayRate), '同一次游玩同时达到三十秒并发生真实互动'),
    metricFact('product.second_world', '第二世界率', percent(rates.secondWorldRate), '进入世界的会话继续打开第二个不同世界'),
    metricFact('product.returning', '多日复访率', percent(rates.returningPlayerRate), `滚动 ${data.meta.days} 天内至少两个自然日打开世界`),
    metricFact('quality.timeout', '加载超时率', percent(play.timeoutRate), '世界游玩发生加载超时'),
    metricFact('quality.error', '体验错误率', percent(play.errorRate), '世界游玩发生体验错误'),
    metricFact('action.save', '收藏率', percent(data.play.rates.saveRate), '世界游玩中发生收藏'),
    metricFact('action.share', '分享率', percent(data.play.rates.shareRate), '世界游玩中发生分享'),
    metricFact('trend.continued_sessions', '续玩会话环比', relativeMovement(data.summary.movement.continuedPlaySessions), '当前滚动窗口相对完整上一窗口'),
    metricFact('trend.pageviews', '页面浏览环比', relativeMovement(data.summary.movement.pageviews), '当前滚动窗口相对完整上一窗口'),
    metricFact('trend.visitors', '独立访客环比', relativeMovement(data.summary.movement.visitors), '当前滚动窗口相对完整上一窗口'),
    metricFact('trend.deep_play', '深度游玩率变化', pointMovement(data.play.movement.deepPlayRate), '当前滚动窗口相对完整上一窗口'),
    metricFact('trend.second_world', '第二世界率变化', pointMovement(data.summary.movement.secondWorldRate), '当前滚动窗口相对完整上一窗口'),
    metricFact('trend.returning', '多日复访率变化', pointMovement(data.summary.movement.returningPlayerRate), '当前滚动窗口相对完整上一窗口'),
  ]

  const performanceLabels = {
    lcp: '最大内容渲染 LCP',
    inp: '交互响应 INP',
    cls: '布局稳定 CLS',
    ttfb: '首字节时间 TTFB',
  } as const
  for (const id of Object.keys(performanceLabels) as Array<keyof typeof performanceLabels>) {
    const metric = data.performance.current[id]
    if (metric.p75 === null || metric.samples <= 0) continue
    const value = id === 'cls' ? metric.p75.toFixed(3) : `${Math.round(metric.p75)} 毫秒`
    facts.push(metricFact(
      `performance.${id}`,
      performanceLabels[id],
      value,
      `真实访问第七十五百分位；良好体验占比 ${percent(metric.goodRate)}；样本 ${number(metric.samples)}`,
    ))
  }

  const worldLabel = (world: DashboardData['worlds'][number]) => (
    world.retired ? `${world.title}（已移出目录）` : world.title
  )
  const eligibleWorlds = data.worlds.filter((world) => world.visits >= 20)
  const topWorlds = [...eligibleWorlds].sort((left, right) => right.visits - left.visits).slice(0, 5)
  for (const world of topWorlds) {
    facts.push(metricFact(
      `world.${world.id}`,
      worldLabel(world),
      `${number(world.visits)} 次游玩`,
      `三十秒 ${percent(world.retention30Rate)}；互动 ${percent(world.interactionRate)}；深度游玩 ${percent(world.deepPlayRate)}；诊断 ${world.signal}`,
    ))
  }

  const longestWorlds = data.worlds
    .filter((world) => world.durationSamples >= 5 && world.averageVisibleSeconds !== null)
    .sort((left, right) => (right.averageVisibleSeconds ?? 0) - (left.averageVisibleSeconds ?? 0))
    .slice(0, 5)
  for (const world of longestWorlds) {
    facts.push(metricFact(
      `duration.${world.id}`,
      `${worldLabel(world)}平均前台停留`,
      duration(world.averageVisibleSeconds),
      `中位数 ${duration(world.medianVisibleSeconds)}；P75 ${duration(world.p75VisibleSeconds)}；${number(world.durationSamples)} 个会话样本`,
    ))
  }

  const attentionWorlds = data.worlds
    .filter((world) => !world.retired && world.visits >= 20 && ['priority', 'technical', 'immersion', 'onboarding'].includes(world.signal))
    .sort((left, right) => right.visits - left.visits)
    .slice(0, 5)
  for (const world of attentionWorlds) {
    if (facts.some((fact) => fact.id === `world.${world.id}`)) continue
    facts.push(metricFact(
      `world.${world.id}`,
      worldLabel(world),
      `${number(world.visits)} 次游玩`,
      `三十秒 ${percent(world.retention30Rate)}；互动 ${percent(world.interactionRate)}；深度游玩 ${percent(world.deepPlayRate)}；诊断 ${world.signal}`,
    ))
  }

  return facts
}

function stringField(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized.length > maximumLength) return null
  if (/[\u0000-\u001f\u007f]/u.test(normalized)) return null
  return normalized
}

function narrativeString(value: unknown, maximumLength: number): string | null {
  const normalized = stringField(value, maximumLength)
  if (!normalized || /[0-9０-９%％]/u.test(normalized)) return null
  return normalized
}

function safeChatString(value: unknown, maximumLength: number): string | null {
  const normalized = stringField(value, maximumLength)
  return normalized && !/[<>]/u.test(normalized) ? normalized : null
}

function stringArray(value: unknown, minimum: number, maximum: number, maximumLength: number): Array<string> | null {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return null
  const strings = value.map((item) => narrativeString(item, maximumLength))
  return strings.every((item): item is string => item !== null) ? strings : null
}

function reportPoints(value: unknown, facts: Map<string, ReportFact>, minimum: number, maximum: number): Array<ReportPoint> | null {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return null
  const points: Array<ReportPoint> = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    const headline = narrativeString(row.headline, 48)
    const narrative = narrativeString(row.narrative, 240)
    if (!headline || !narrative || !Array.isArray(row.factIds)) return null
    const factIds = [...new Set(row.factIds)]
    if (factIds.length < 1 || !factIds.every((id) => typeof id === 'string' && facts.has(id))) return null
    points.push({ headline, narrative, factIds: factIds.slice(0, 4) as Array<string> })
  }
  return points
}

export function parseReportPayload(
  value: unknown,
  reportFacts: Array<ReportFact>,
): Omit<AiInsightsReport, 'facts' | 'generatedAt' | 'dataThrough' | 'days' | 'model'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as Record<string, unknown>
  const facts = new Map(reportFacts.map((fact) => [fact.id, fact]))
  const title = '网站分析报告'
  const executiveSummary = reportPoints(payload.executiveSummary, facts, 1, 4)
  const findings = reportPoints(payload.findings, facts, 2, 4)
  if (!executiveSummary || !findings || !Array.isArray(payload.recommendations)) return null

  const recommendations: Array<ReportRecommendation> = []
  if (payload.recommendations.length < 2 || payload.recommendations.length > 4) return null
  for (const item of payload.recommendations) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    const action = narrativeString(row.action, 100)
    const rationale = narrativeString(row.rationale, 220)
    const successMetricId = typeof row.successMetricId === 'string' ? row.successMetricId : ''
    if (!action || !rationale || !facts.has(successMetricId)) return null
    recommendations.push({ action, rationale, successMetricId })
  }
  const questions = stringArray(payload.questions, 0, 3, 140)
  const caveats = stringArray(payload.caveats, 1, 3, 180)
  if (!questions || !caveats) return null

  return { title, executiveSummary, findings, recommendations, questions, caveats }
}

export function parseChatPayload(
  value: unknown,
  reportFacts: Array<ReportFact>,
): Pick<AiInsightsAnswer, 'answer' | 'factIds' | 'suggestedQuestions'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as Record<string, unknown>
  const facts = new Map(reportFacts.map((fact) => [fact.id, fact]))
  const answer = narrativeString(payload.answer, 800)
  if (!answer || !Array.isArray(payload.factIds)) return null
  const factIds = [...new Set(payload.factIds)]
  if (factIds.length > 6 || !factIds.every((id) => typeof id === 'string' && facts.has(id))) return null
  const suggestedQuestions = stringArray(payload.suggestedQuestions, 0, 3, 120)
  if (!suggestedQuestions) return null
  return { answer, factIds: factIds as Array<string>, suggestedQuestions }
}

export function parseChatRequest(value: unknown): { question: string; history: Array<AiChatMessage> } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as Record<string, unknown>
  const question = safeChatString(payload.question, 600)
  if (!question || !Array.isArray(payload.history) || payload.history.length > 10) return null
  const history: Array<AiChatMessage> = []
  for (const item of payload.history) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    if (row.role !== 'user' && row.role !== 'assistant') return null
    const content = safeChatString(row.content, 1_000)
    if (!content) return null
    history.push({ role: row.role, content })
  }
  return { question, history }
}

function endpoint(baseUrl: string): string {
  const url = new URL(baseUrl)
  if (url.protocol !== 'https:' || url.hostname !== 'api.deepseek.com') {
    throw new Error('Insights AI base URL must use the official DeepSeek API host.')
  }
  url.pathname = `${url.pathname.replace(/\/+$/u, '')}/chat/completions`.replace(/^\/+/u, '/')
  url.search = ''
  url.hash = ''
  return url.toString()
}

function promptForReport(data: DashboardData, facts: Array<ReportFact>): string {
  return `请为 Shape of the World 的产品与运营负责人生成一份中文 JSON 分析报告。

产品是“看见世界如何运行”：一组可以亲手玩的互动世界。报告需要判断用户是否进入互动世界、是否沉浸和互动、是否继续探索，以及哪些内容或体验值得优先检查。

强制规则：
- 只能依据 FACTS_JSON；不得补充外部事实、行业基准、因果结论或不存在的数据。
- narrative、headline、action、rationale、questions、caveats 和 title 中不要写任何数字或百分号；量化证据只通过 factIds 引用。
- title 固定写“网站分析报告”。
- executiveSummary 输出一至三条；每条 factIds 只选一至四个最关键的证据。
- 不要把相对低于全站均值直接说成内容质量差；用“检查”“验证”“观察”等审慎表述。
- 推荐必须可执行，并为 successMetricId 选择一个 FACTS_JSON 中存在的指标。
- Executive Summary 必须给忙碌决策者直接结论；findings 解释证据；recommendations 给下一步；questions 保留仍需验证的问题。
- 输出纯 JSON，不要 Markdown，不要代码块。

所选窗口：滚动 ${data.meta.days} 天
是否有完整上一周期：${data.meta.comparisonAvailable ? '是' : '否'}
数据截至：${data.meta.latestEventAt || '暂无时间戳'}

FACTS_JSON:
${JSON.stringify(facts)}

JSON 格式示例：
{
  "title": "本期产品分析",
  "executiveSummary": [{"headline":"核心结论","narrative":"用一句不带数字的中文解释含义","factIds":["product.deep_play"]}],
  "findings": [{"headline":"关键发现","narrative":"解释证据与影响，不写数字","factIds":["product.retention30","product.interaction"]}],
  "recommendations": [{"action":"具体行动","rationale":"为什么先做这件事，不写数字","successMetricId":"product.deep_play"}],
  "questions": ["仍需验证的问题"],
  "caveats": ["影响解读的数据边界"]
}`
}

export async function generateAiReport(
  data: DashboardData,
  env: ReportEnvironment,
  fetchImpl: typeof fetch = fetch,
): Promise<AiInsightsReport> {
  if (!env.DEEPSEEK_API_KEY) throw new Error('DeepSeek API key is not configured.')
  if (!allowedModels.has(env.DEEPSEEK_MODEL)) throw new Error('Unsupported DeepSeek model configured.')
  const facts = buildReportFacts(data)
  const prompt = promptForReport(data, facts)
  let lastError: Error | undefined

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: '你是谨慎的产品数据分析师。严格输出有效 json，只解释所给汇总事实。' },
        { role: 'user', content: prompt },
      ]
      if (attempt > 0) {
        messages.push({
          role: 'user',
          content: '上一次输出没有通过格式校验。请重新生成：所有 factIds 与 successMetricId 必须来自 FACTS_JSON；所有文字字段不得含数字或百分号；不要增加字段；只输出示例中的完整 JSON。',
        })
      }
      const response = await fetchImpl(endpoint(env.DEEPSEEK_BASE_URL), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.DEEPSEEK_MODEL,
          messages,
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
          max_tokens: 2_600,
          stream: false,
        }),
        signal: AbortSignal.timeout(30_000),
      })
      const text = await response.text()
      if (!response.ok) {
        const error = new Error(`DeepSeek responded with ${response.status}: ${text.slice(0, 180)}`)
        if (response.status !== 429 && response.status < 500) throw error
        lastError = error
        continue
      }
      const body = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> }
      const content = body.choices?.[0]?.message?.content?.trim()
      if (!content) {
        lastError = new Error('DeepSeek returned empty report content.')
        continue
      }
      const parsed = parseReportPayload(JSON.parse(content), facts)
      if (!parsed) {
        lastError = new Error('DeepSeek report did not match the required evidence schema.')
        continue
      }
      return {
        ...parsed,
        facts,
        generatedAt: new Date().toISOString(),
        dataThrough: data.meta.latestEventAt,
        days: data.meta.days,
        model: env.DEEPSEEK_MODEL,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('DeepSeek report generation failed.')
}

export async function generateAiAnswer(
  data: DashboardData,
  question: string,
  history: Array<AiChatMessage>,
  env: ReportEnvironment,
  fetchImpl: typeof fetch = fetch,
): Promise<AiInsightsAnswer> {
  if (!env.DEEPSEEK_API_KEY) throw new Error('DeepSeek API key is not configured.')
  if (!allowedModels.has(env.DEEPSEEK_MODEL)) throw new Error('Unsupported DeepSeek model configured.')
  const facts = buildReportFacts(data)
  const evidencePrompt = `请回答用户关于 Shape of the World 最新网站与产品数据的问题。

强制规则：
- 只能依据 FACTS_JSON，不得使用外部事实、行业基准、因果结论或猜测。
- answer 和 suggestedQuestions 中不要写数字或百分号；量化证据只通过 factIds 引用。
- 如果现有汇总数据不能回答，请直接说明缺少什么数据，不要猜测；此时 factIds 可以为空。
- 把此前对话仅作为问题上下文，不要把其中的数字当作证据。
- 输出纯 JSON，不要 Markdown，不要代码块。

统计窗口：滚动 ${data.meta.days} 天
数据截至：${data.meta.latestEventAt || '暂无时间戳'}

FACTS_JSON:
${JSON.stringify(facts)}

用户问题：${question}

JSON 格式：
{"answer":"不带数字的直接回答","factIds":["product.deep_play"],"suggestedQuestions":["可继续追问的问题"]}`
  let lastError: Error | undefined

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint(env.DEEPSEEK_BASE_URL), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: '你是谨慎的产品数据分析师。严格输出有效 json，只解释服务端给出的汇总事实。' },
            ...history,
            { role: 'user', content: attempt === 0 ? evidencePrompt : `${evidencePrompt}\n上一次输出无效或为空；请严格按 JSON 格式重新回答。` },
          ],
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
          max_tokens: 1_200,
          stream: false,
        }),
        signal: AbortSignal.timeout(30_000),
      })
      const text = await response.text()
      if (!response.ok) {
        const error = new Error(`DeepSeek responded with ${response.status}: ${text.slice(0, 180)}`)
        if (response.status !== 429 && response.status < 500) throw error
        lastError = error
        continue
      }
      const body = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> }
      const content = body.choices?.[0]?.message?.content?.trim()
      if (!content) {
        lastError = new Error('DeepSeek returned empty answer content.')
        continue
      }
      const parsed = parseChatPayload(JSON.parse(content), facts)
      if (!parsed) {
        lastError = new Error('DeepSeek answer did not match the required evidence schema.')
        continue
      }
      return {
        ...parsed,
        facts: facts.filter((fact) => parsed.factIds.includes(fact.id)),
        generatedAt: new Date().toISOString(),
        dataThrough: data.meta.latestEventAt,
        days: data.meta.days,
        model: env.DEEPSEEK_MODEL,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('DeepSeek answer generation failed.')
}
