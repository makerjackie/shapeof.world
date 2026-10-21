import { describe, expect, it, vi } from 'vitest'

import {
  buildReportFacts,
  generateAiAnswer,
  generateAiReport,
  parseChatPayload,
  parseChatRequest,
  parseReportPayload,
  type DashboardData,
  type ReportFact,
} from './report'

const facts: Array<ReportFact> = [
  { id: 'product.deep_play', label: '深度游玩率', value: '28.0%', context: '达到停留和互动条件' },
  { id: 'product.second_world', label: '第二世界率', value: '40.0%', context: '继续打开不同世界' },
]

const validPayload = {
  title: '本期产品分析',
  executiveSummary: [
    { headline: '沉浸与互动仍有提升空间', narrative: '用户已经愿意开始探索，但持续投入仍值得优化。', factIds: ['product.deep_play'] },
    { headline: '继续探索表现积极', narrative: '不少会话会自然走向新的世界，可以放大这条路径。', factIds: ['product.second_world'] },
  ],
  findings: [
    { headline: '体验深度需要拆解', narrative: '建议分别检查停留和真实操作，避免只优化其中一侧。', factIds: ['product.deep_play'] },
    { headline: '跨世界路径值得保留', narrative: '继续探索已经形成，应验证推荐入口是否稳定贡献。', factIds: ['product.second_world'] },
  ],
  recommendations: [
    { action: '复盘高访问但沉浸偏弱的世界', rationale: '先处理覆盖面较大的体验，更容易观察整体变化。', successMetricId: 'product.deep_play' },
    { action: '检查下一世界入口的上下文相关性', rationale: '让已有的继续探索行为更自然、更可复制。', successMetricId: 'product.second_world' },
  ],
  questions: ['不同来源的用户是否有明显不同的探索深度？'],
  caveats: ['当前指标是匿名运营近似值，不能解释个体动机。'],
}

function dashboardData(): DashboardData {
  return {
    meta: { days: 7, comparisonAvailable: true, latestEventAt: '2026-08-09 05:45:11' },
    activity: {
      dau: { current: 24, previous: 20, movement: 0.2 },
      wau: { current: 100, previous: 80, movement: 0.25 },
      mau: { current: 280, previous: 240, movement: 1 / 6 },
    },
    summary: {
      current: { visitors: 100, pageSessions: 120, pageviews: 180, players: 60 },
      movement: {
        pageviews: 0.2,
        visitors: 0.1,
        secondWorldRate: 0.04,
        returningPlayerRate: 0.02,
      },
      rates: {
        pagesPerSession: 1.5,
        bounce5Rate: 0.3,
        worldEntryRate: 0.5,
        secondWorldRate: 0.4,
        returningPlayerRate: 0.1,
      },
    },
    play: {
      current: {
        visits: 140,
        retention30Rate: 0.48,
        interactionRate: 0.42,
        deepPlayRate: 0.28,
        timeoutRate: 0.01,
        errorRate: 0.005,
      },
      movement: { deepPlayRate: -0.03 },
      rates: { saveRate: 0.02, shareRate: 0.01 },
    },
    performance: {
      current: {
        lcp: { p75: 2_200, goodRate: 0.8, samples: 80, status: 'good' },
        inp: { p75: 180, goodRate: 0.78, samples: 40, status: 'good' },
        cls: { p75: 0.08, goodRate: 0.82, samples: 80, status: 'good' },
        ttfb: { p75: 620, goodRate: 0.9, samples: 80, status: 'good' },
      },
    },
    worlds: [],
  } as unknown as DashboardData
}

describe('AI Insights report', () => {
  it('accepts evidence-linked prose and rejects invented numeric claims', () => {
    expect(parseReportPayload(validPayload, facts)).not.toBeNull()
    expect(parseReportPayload({ ...validPayload, title: '增长 28%' }, facts)?.title).toBe('网站分析报告')
    expect(parseReportPayload({
      ...validPayload,
      executiveSummary: [
        { ...validPayload.executiveSummary[0], narrative: '用户增长 28%。' },
        validPayload.executiveSummary[1],
      ],
    }, facts)).toBeNull()
    expect(parseReportPayload({
      ...validPayload,
      findings: [{ ...validPayload.findings[0], factIds: ['missing.fact'] }, validPayload.findings[1]],
    }, facts)).toBeNull()
  })

  it('accepts a concise executive summary and caps its verified evidence', () => {
    const expandedFacts = [
      ...facts,
      { id: 'audience.dau', label: '日活', value: '24', context: '近一日' },
      { id: 'audience.wau', label: '周活', value: '100', context: '近七日' },
      { id: 'audience.mau', label: '月活', value: '280', context: '近三十日' },
    ]
    const parsed = parseReportPayload({
      ...validPayload,
      executiveSummary: [{
        ...validPayload.executiveSummary[0],
        factIds: [
          'product.deep_play',
          'product.second_world',
          'audience.dau',
          'audience.wau',
          'audience.mau',
        ],
      }],
    }, expandedFacts)
    expect(parsed?.executiveSummary).toHaveLength(1)
    expect(parsed?.executiveSummary[0]?.factIds).toEqual([
      'product.deep_play',
      'product.second_world',
      'audience.dau',
      'audience.wau',
    ])
  })

  it('builds a bounded source-backed fact set', () => {
    const data = dashboardData()
    data.worlds = [{
      id: 'solar-system',
      title: '太阳系到底有多大？',
      visits: 38,
      retention30Rate: 0.62,
      interactionRate: 0.51,
      deepPlayRate: 0.4,
      signal: 'strong',
      durationSamples: 12,
      averageVisibleSeconds: 128,
      medianVisibleSeconds: 96,
      p75VisibleSeconds: 174,
    }] as typeof data.worlds
    const reportFacts = buildReportFacts(data)
    expect(reportFacts.find((fact) => fact.id === 'audience.dau')?.value).toBe('24')
    expect(reportFacts.find((fact) => fact.id === 'audience.mau')?.value).toBe('280')
    expect(reportFacts.find((fact) => fact.id === 'product.deep_play')?.value).toBe('28.0%')
    expect(reportFacts.find((fact) => fact.id === 'site.pageviews')?.value).toBe('180')
    expect(reportFacts.find((fact) => fact.id === 'duration.solar-system')).toMatchObject({
      value: '2 分 8 秒',
      context: '中位数 1 分 36 秒；P75 2 分 54 秒；12 个会话样本',
    })
  })

  it('uses DeepSeek JSON output and attaches immutable report metadata', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.model).toBe('deepseek-v4-flash')
      expect(body.response_format).toEqual({ type: 'json_object' })
      expect(body.thinking).toEqual({ type: 'disabled' })
      return Response.json({ choices: [{ message: { content: JSON.stringify(validPayload) } }] })
    }) as unknown as typeof fetch

    const report = await generateAiReport(dashboardData(), {
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
      DEEPSEEK_MODEL: 'deepseek-v4-flash',
    }, fetchMock)

    expect(report.model).toBe('deepseek-v4-flash')
    expect(report.days).toBe(7)
    expect(report.dataThrough).toBe('2026-08-09 05:45:11')
    expect(report.facts.length).toBeGreaterThan(10)
  })

  it('asks DeepSeek to repair an invalid report against the same fact set', async () => {
    const invalidPayload = {
      ...validPayload,
      executiveSummary: [
        { ...validPayload.executiveSummary[0], narrative: '用户增长 20%。' },
        validPayload.executiveSummary[1],
      ],
    }
    let attempt = 0
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> }
      attempt += 1
      if (attempt === 1) {
        return Response.json({ choices: [{ message: { content: JSON.stringify(invalidPayload) } }] })
      }
      expect(body.messages.some((message) => message.role === 'assistant')).toBe(false)
      expect(body.messages.at(-1)?.content).toContain('没有通过格式校验')
      return Response.json({ choices: [{ message: { content: JSON.stringify(validPayload) } }] })
    }) as unknown as typeof fetch

    const report = await generateAiReport(dashboardData(), {
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
      DEEPSEEK_MODEL: 'deepseek-v4-flash',
    }, fetchMock)

    expect(report.title).toBe('网站分析报告')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('validates bounded chat input and evidence-linked answers', () => {
    expect(parseChatRequest({
      question: '哪些主题值得优先优化？',
      history: [{ role: 'assistant', content: '可以先从覆盖面和体验深度一起看。' }],
    })).not.toBeNull()
    expect(parseChatRequest({ question: '<script>', history: [] })).toBeNull()
    expect(parseChatPayload({
      answer: '建议优先复盘覆盖面较大但深度偏弱的体验。',
      factIds: ['product.deep_play'],
      suggestedQuestions: ['哪些体验的影响范围更大？'],
    }, facts)).not.toBeNull()
    expect(parseChatPayload({
      answer: '建议提升百分之二十。',
      factIds: ['product.deep_play'],
      suggestedQuestions: [],
    }, facts)).not.toBeNull()
    expect(parseChatPayload({
      answer: '建议提升 20%。',
      factIds: ['product.deep_play'],
      suggestedQuestions: [],
    }, facts)).toBeNull()
  })

  it('answers follow-up questions with fresh report facts', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string; response_format: unknown; thinking: unknown }
      expect(body.model).toBe('deepseek-v4-flash')
      expect(body.response_format).toEqual({ type: 'json_object' })
      expect(body.thinking).toEqual({ type: 'disabled' })
      return Response.json({ choices: [{ message: { content: JSON.stringify({
        answer: '建议先检查进入世界后的体验深度，再验证继续探索路径。',
        factIds: ['product.deep_play', 'product.second_world'],
        suggestedQuestions: ['哪些主题最影响整体表现？'],
      }) } }] })
    }) as unknown as typeof fetch

    const answer = await generateAiAnswer(dashboardData(), '下一步先做什么？', [], {
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
      DEEPSEEK_MODEL: 'deepseek-v4-flash',
    }, fetchMock)

    expect(answer.factIds).toEqual(['product.deep_play', 'product.second_world'])
    expect(answer.facts).toHaveLength(2)
    expect(answer.model).toBe('deepseek-v4-flash')
  })
})
