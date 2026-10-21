const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => Array.from(document.querySelectorAll(selector))

const state = {
  data: null,
  days: 7,
  sort: 'visits',
  sortDirection: -1,
}

const domainLabels = {
  cosmos: '宇宙与天体',
  'math-signals': '数学与信号',
  physics: '物理',
  'earth-climate': '地球·海洋·气候',
  'life-body': '生物与人体',
  'chem-materials': '化学与材料',
  'ai-ml': 'AI 与机器学习',
  'computing-engineering': '计算机与工程',
  unknown: '未分类',
}

const signalLabels = {
  strong: '表现亮眼',
  stable: '表现稳定',
  'low-sample': '样本不足',
  technical: '技术问题',
  immersion: '沉浸待优化',
  onboarding: '上手待优化',
  priority: '优先复盘',
}

const countryLabels = {
  CN: '中国大陆', US: '美国', SG: '新加坡', HK: '中国香港', JP: '日本',
  TW: '中国台湾', GB: '英国', DE: '德国', CA: '加拿大', AU: '澳大利亚',
  FR: '法国', KR: '韩国', IN: '印度', NL: '荷兰', MY: '马来西亚',
}

const deviceLabels = { mobile: '手机', tablet: '平板', desktop: '桌面', unknown: '未知' }
const browserLabels = {
  chrome: 'Chrome', safari: 'Safari', edge: 'Edge', firefox: 'Firefox',
  samsung: 'Samsung Internet', bot: '机器人', other: '其他',
}

const definitionTitles = {
  activeDay: '日活 DAU', activeWeek: '周活 WAU', activeMonth: '月活 MAU',
  playVisit: '世界游玩', retention30: '30 秒沉浸率', visibleDuration: '前台停留时长', interaction: '真实互动率',
  retention5: '5 秒停留率', deepPlay: '深度游玩率', continuedPlay: '北极星·续玩会话', secondWorld: '第二世界率', thirdWorld: '第三世界率', returningPlayer: '多日复访率',
  guideCompletion: '故事完成率', pageview: '页面浏览', visitor: '独立访客',
  player: '匿名玩家', pageSession: '网站会话', pagesPerSession: '页数／会话', bounce5: '5 秒跳出率',
  pageEngaged5: '5 秒页面参与', pageEngaged30: '30 秒页面参与', worldEntry: '进入世界率', visitsPerPlayer: '人均世界游玩',
  loadTimeout: '加载超时', experienceError: '体验错误', saveRate: '收藏率', shareRate: '分享率',
  activeUsers: '活跃用户', dailyAudience: '每日访客与玩家', referrer: '访问来源', country: '访问地区', device: '设备类型',
  browser: '浏览器', locale: '界面语言', campaign: 'UTM 活动', pageMetrics: '页面访问与停留',
  webVitals: '网站健康', lcp: 'LCP', inp: 'INP', cls: 'CLS', ttfb: 'TTFB', experienceMap: '体验地图', signal: '诊断标签',
}

let activeMetricHelpButton = null
let metricHelpPinned = false

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function metricHelpButton(label, definitionKey) {
  if (!definitionKey) return ''
  return `<button type="button" class="metric-info-button" data-metric-definition="${escapeHtml(definitionKey)}" data-metric-label="${escapeHtml(label)}" aria-label="查看${escapeHtml(label)}说明" aria-controls="metric-popover" aria-describedby="metric-popover" aria-expanded="false"><span aria-hidden="true">i</span></button>`
}

function metricLabel(label, definitionKey) {
  return `<span class="metric-label-with-help"><span>${escapeHtml(label)}</span>${metricHelpButton(label, definitionKey)}</span>`
}

function metricDefinition(button) {
  return state.data?.definitions?.[button.dataset.metricDefinition] || ''
}

function positionMetricPopover(button) {
  const popover = $('#metric-popover')
  if (!popover || popover.hidden) return
  const trigger = button.getBoundingClientRect()
  const bounds = popover.getBoundingClientRect()
  const margin = 12
  let left = trigger.left + trigger.width / 2 - bounds.width / 2
  left = Math.min(Math.max(margin, left), window.innerWidth - bounds.width - margin)
  let top = trigger.bottom + 8
  if (top + bounds.height > window.innerHeight - margin) top = trigger.top - bounds.height - 8
  popover.style.left = `${Math.round(left)}px`
  popover.style.top = `${Math.max(margin, Math.round(top))}px`
}

function closeMetricHelp() {
  if (activeMetricHelpButton) activeMetricHelpButton.setAttribute('aria-expanded', 'false')
  activeMetricHelpButton = null
  metricHelpPinned = false
  const popover = $('#metric-popover')
  if (popover) popover.hidden = true
}

function showMetricHelp(button, pinned = false) {
  const definition = metricDefinition(button)
  if (!definition) return
  if (activeMetricHelpButton && activeMetricHelpButton !== button) {
    activeMetricHelpButton.setAttribute('aria-expanded', 'false')
  }
  activeMetricHelpButton = button
  metricHelpPinned = pinned
  button.setAttribute('aria-expanded', 'true')
  $('#metric-popover-title').textContent = button.dataset.metricLabel
  $('#metric-popover-body').textContent = definition
  $('#metric-popover').hidden = false
  positionMetricPopover(button)
}

function number(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function compact(value) {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
}

function percent(value, digits = 0) {
  return value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`
}

function duration(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  const seconds = Math.max(0, Math.round(Number(value)))
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分`
}

function movement(value, rate = false, inverse = false) {
  if (value === null || value === undefined) return '<span class="metric-delta delta-flat">暂无可比基线</span>'
  const improving = inverse ? value < 0 : value > 0
  const className = Math.abs(value) < 0.005 ? 'delta-flat' : improving ? 'delta-up' : 'delta-down'
  const prefix = value > 0 ? '+' : ''
  const label = rate ? `${prefix}${(value * 100).toFixed(1)} 个百分点` : `${prefix}${(value * 100).toFixed(1)}%`
  return `<span class="metric-delta ${className}">较前一周期 ${label}</span>`
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  let body = null
  try { body = await response.json() } catch { body = {} }
  if (!response.ok) {
    const error = new Error(body?.error || `请求失败（${response.status}）`)
    error.status = response.status
    error.code = body?.code
    throw error
  }
  return body
}

function showLogin() {
  $('#dashboard').hidden = true
  $('#login-shell').hidden = false
  $('#password').focus()
}

function showDashboard() {
  $('#login-shell').hidden = true
  $('#dashboard').hidden = false
}

async function loadData() {
  $('#loading-state').hidden = false
  $('#error-state').hidden = true
  $('#dashboard-content').hidden = true
  try {
    state.data = await api(`/api/data?days=${state.days}`)
    renderDashboard(state.data)
    $('#loading-state').hidden = true
    $('#dashboard-content').hidden = false
  } catch (error) {
    $('#loading-state').hidden = true
    if (error.status === 401) {
      showLogin()
      return
    }
    $('#error-message').textContent = error.message
    $('#error-state').hidden = false
  }
}

function renderDashboard(data) {
  closeMetricHelp()
  renderFreshness(data)
  renderActivity(data)
  renderMetrics(data)
  renderSiteMetrics(data)
  renderPerformance(data)
  renderDaily(data.daily)
  renderBars('#referrer-list', data.referrers, (row) => row.name)
  renderBars('#country-list', data.countries, (row) => countryLabels[row.name] || row.name)
  renderBars('#locale-list', data.locales, (row) => row.name === 'zh' ? '中文' : row.name === 'en' ? '英文' : row.name)
  renderBars('#device-list', data.devices, (row) => deviceLabels[row.name] || row.name, '数据正在积累。')
  renderBars('#browser-list', data.browsers, (row) => browserLabels[row.name] || row.name, '数据正在积累。')
  renderCampaigns(data.campaigns)
  renderPages(data.pages)
  renderJourneys(data)
  renderAttention(data)
  setupWorldFilters(data.worlds)
  renderDurationRanking(data.worlds)
  renderWorlds()
  renderDefinitions(data)
}

function renderFreshness(data) {
  const latest = data.meta.latestEventAt
  const latestLabel = latest ? latest.replace('T', ' ').replace('Z', ' UTC') : '暂无时间戳'
  const comparison = data.meta.comparisonAvailable ? `对比前 ${data.meta.days} 天` : '暂无可比基线'
  $('#freshness').textContent = `滚动 ${data.meta.days} 天 · 数据截至 ${latestLabel} · ${data.meta.timezone}`
  $('#comparison-status').textContent = comparison
}

function renderMetrics(data) {
  const outcomes = [
    { label: '北极星·续玩会话', definition: 'continuedPlay', value: number(data.summary.current.continuedPlaySessions), delta: movement(data.summary.movement.continuedPlaySessions), tone: 'gold' },
    { label: '深度游玩率', definition: 'deepPlay', value: percent(data.play.current.deepPlayRate), delta: movement(data.play.movement.deepPlayRate, true), tone: 'forest' },
    { label: '第二世界率', definition: 'secondWorld', value: percent(data.summary.rates.secondWorldRate), delta: movement(data.summary.movement.secondWorldRate, true), tone: 'rust' },
    { label: '多日复访率', definition: 'returningPlayer', value: percent(data.summary.rates.returningPlayerRate), delta: movement(data.summary.movement.returningPlayerRate, true), tone: 'ink' },
  ]
  $('#outcome-metrics').innerHTML = outcomes.map((card) => `
    <article class="outcome-card tone-${card.tone}">
      <span class="metric-label">${metricLabel(card.label, card.definition)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      ${card.delta}
    </article>`).join('')

  const drivers = [
    { label: '进入世界率', definition: 'worldEntry', value: percent(data.summary.rates.worldEntryRate), delta: movement(data.summary.movement.worldEntryRate, true) },
    { label: '30 秒沉浸率', definition: 'retention30', value: percent(data.play.current.retention30Rate), delta: movement(data.play.movement.retention30Rate, true) },
    { label: '真实互动率', definition: 'interaction', value: percent(data.play.current.interactionRate), delta: movement(data.play.movement.interactionRate, true) },
    { label: '人均世界游玩', definition: 'visitsPerPlayer', value: data.play.rates.visitsPerPlayer === null ? '—' : decimal(data.play.rates.visitsPerPlayer), delta: '' },
  ]
  $('#driver-metrics').innerHTML = drivers.map((card) => `
    <article class="driver-card">
      <span>${metricLabel(card.label, card.definition)}</span><strong>${escapeHtml(card.value)}</strong>
      ${card.delta}
    </article>`).join('')

  const guardrails = [
    { label: '加载超时', definition: 'loadTimeout', value: percent(data.play.current.timeoutRate), kind: (data.play.current.timeoutRate || 0) >= 0.03 ? 'warn' : 'ok' },
    { label: '体验错误', definition: 'experienceError', value: percent(data.play.current.errorRate), kind: (data.play.current.errorRate || 0) >= 0.02 ? 'warn' : 'ok' },
    { label: '收藏率', definition: 'saveRate', value: percent(data.play.rates.saveRate), kind: 'neutral' },
    { label: '分享率', definition: 'shareRate', value: percent(data.play.rates.shareRate), kind: 'neutral' },
  ]
  $('#guardrail-metrics').innerHTML = `<span class="guardrail-title">质量与行动</span>${guardrails.map((item) => `
    <span class="guardrail-item ${item.kind}"><i></i>${metricLabel(item.label, item.definition)} <b>${escapeHtml(item.value)}</b></span>`).join('')}`
}

function decimal(value, digits = 2) {
  return value === null || value === undefined ? '—' : Number(value).toFixed(digits)
}

function renderActivity(data) {
  const cards = [
    { label: '日活 DAU', definition: 'activeDay', value: data.activity.dau.current, delta: data.activity.dau.movement },
    { label: '周活 WAU', definition: 'activeWeek', value: data.activity.wau.current, delta: data.activity.wau.movement },
    { label: '月活 MAU', definition: 'activeMonth', value: data.activity.mau.current, delta: data.activity.mau.movement },
  ]
  $('#activity-metrics').innerHTML = cards.map((card) => `
    <article class="activity-card">
      <span>${metricLabel(card.label, card.definition)}</span>
      <strong>${number(card.value)}</strong>
      ${movement(card.delta)}
    </article>`).join('')
}

function renderSiteMetrics(data) {
  const cards = [
    { label: '页面浏览 PV', definition: 'pageview', value: number(data.summary.current.pageviews), delta: movement(data.summary.movement.pageviews) },
    { label: '独立访客 UV', definition: 'visitor', value: number(data.summary.current.visitors), delta: movement(data.summary.movement.visitors) },
    { label: '网站会话', definition: 'pageSession', value: number(data.summary.current.pageSessions), delta: movement(data.summary.movement.pageSessions) },
    { label: '页数／会话', definition: 'pagesPerSession', value: decimal(data.summary.rates.pagesPerSession), delta: movement(data.summary.movement.pagesPerSession) },
    { label: '5 秒跳出率', definition: 'bounce5', value: percent(data.summary.rates.bounce5Rate), delta: movement(data.summary.movement.bounce5Rate, true, true) },
    { label: '30 秒页面参与', definition: 'pageEngaged30', value: percent(data.summary.rates.pageEngaged30Rate), delta: '' },
  ]
  $('#site-metrics').innerHTML = cards.map((card) => `
    <article class="site-metric-card"><span>${metricLabel(card.label, card.definition)}</span><strong>${escapeHtml(card.value)}</strong>${card.delta}</article>
  `).join('')
}

function renderPerformance(data) {
  const labels = {
    lcp: ['LCP', '主内容呈现', '毫秒'],
    inp: ['INP', '交互响应', '毫秒'],
    cls: ['CLS', '视觉稳定', ''],
    ttfb: ['TTFB', '首字节', '毫秒'],
  }
  const statuses = { good: '良好', 'needs-improvement': '需关注', poor: '待优化', waiting: '待积累' }
  $('#performance-metrics').innerHTML = Object.entries(labels).map(([id, [short, label, unit]]) => {
    const metric = data.performance.current[id]
    const value = metric.p75 === null ? '—' : id === 'cls' ? Number(metric.p75).toFixed(3) : number(Math.round(metric.p75))
    const sample = metric.samples > 0 ? `${number(metric.samples)} 次采样` : '真实访问数据积累中'
    return `<article class="performance-card status-${escapeHtml(metric.status)}">
      <header><span>${metricLabel(short, id)}</span><i>${escapeHtml(statuses[metric.status] || metric.status)}</i></header>
      <strong>${escapeHtml(value)}${unit ? `<small>${escapeHtml(unit)}</small>` : ''}</strong>
      <p>${escapeHtml(label)} · ${escapeHtml(sample)}${metric.goodRate === null ? '' : ` · ${percent(metric.goodRate)} 良好`}</p>
    </article>`
  }).join('')
}

function renderDaily(rows) {
  const container = $('#daily-chart')
  if (!rows.length) {
    container.textContent = '当前周期没有世界打开数据。'
    return
  }
  const width = 920
  const height = 250
  const pad = { left: 34, right: 14, top: 18, bottom: 34 }
  const max = Math.max(...rows.map((row) => Math.max(row.visitors, row.players)), 1)
  const x = (index) => pad.left + (index / Math.max(rows.length - 1, 1)) * (width - pad.left - pad.right)
  const y = (value) => pad.top + (1 - value / max) * (height - pad.top - pad.bottom)
  const visitorPoints = rows.map((row, index) => `${x(index)},${y(row.visitors)}`).join(' ')
  const playerPoints = rows.map((row, index) => `${x(index)},${y(row.players)}`).join(' ')
  const area = `${pad.left},${height - pad.bottom} ${visitorPoints} ${x(rows.length - 1)},${height - pad.bottom}`
  const every = Math.max(1, Math.ceil(rows.length / 8))
  const labels = rows.map((row, index) => index % every === 0 || index === rows.length - 1
    ? `<text class="chart-axis" x="${x(index)}" y="${height - 10}" text-anchor="middle">${escapeHtml(row.date.slice(5))}</text>`
    : '').join('')
  const dots = rows.map((row, index) => `
    <circle class="chart-dot visitors" cx="${x(index)}" cy="${y(row.visitors)}" r="3"><title>${escapeHtml(row.date)} · ${number(row.visitors)} 位访客</title></circle>
    <circle class="chart-dot players" cx="${x(index)}" cy="${y(row.players)}" r="3"><title>${escapeHtml(row.date)} · ${number(row.players)} 位玩家</title></circle>`).join('')
  const grids = [0, 0.5, 1].map((ratio) => {
    const yy = y(max * ratio)
    return `<line class="chart-grid" x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}"/><text class="chart-axis" x="${pad.left - 8}" y="${yy + 3}" text-anchor="end">${compact(max * ratio)}</text>`
  }).join('')
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="每日匿名访客与进入世界玩家趋势">${grids}<polygon class="chart-area" points="${area}"/><polyline class="chart-line visitors" points="${visitorPoints}"/><polyline class="chart-line players" points="${playerPoints}"/>${dots}${labels}</svg>`
}

function renderBars(selector, rows, label, emptyMessage = '暂无数据') {
  const container = $(selector)
  const max = Math.max(...rows.map((row) => row.sessions), 1)
  container.innerHTML = rows.length ? rows.slice(0, 8).map((row) => `
    <div class="bar-row">
      <span class="bar-name" title="${escapeHtml(label(row))}">${escapeHtml(label(row))}</span>
      <progress class="bar-track" value="${row.sessions}" max="${max}" aria-label="${escapeHtml(label(row))} ${number(row.sessions)}"></progress>
      <span class="bar-value">${number(row.sessions)}</span>
    </div>`).join('') : `<p class="empty-copy">${escapeHtml(emptyMessage)}</p>`
}

function renderCampaigns(rows) {
  $('#campaign-list').innerHTML = rows.length ? rows.slice(0, 10).map((row) => `
    <div class="campaign-row">
      <span><b>${escapeHtml(row.source)}</b><small>${escapeHtml(row.campaign || '未命名活动')}${row.content ? ` · ${escapeHtml(row.content)}` : ''}</small></span>
      <strong>${number(row.sessions)}</strong>
    </div>`).join('') : '<p class="empty-copy">当前窗口没有 UTM 活动访问。</p>'
}

function renderPages(rows) {
  $('#page-list').innerHTML = rows.length ? `
    <div class="page-row page-head"><span>页面</span><span>${metricLabel('会话', 'pageSession')}</span><span>${metricLabel('5 秒留存', 'pageEngaged5')}</span><span>${metricLabel('30 秒留存', 'pageEngaged30')}</span></div>
    ${rows.slice(0, 12).map((row) => `
      <div class="page-row">
        <span title="${escapeHtml(row.path)}">${escapeHtml(row.path)}</span>
        <span>${number(row.sessions)}</span>
        <span>${percent(row.bounce5Rate === null ? null : 1 - row.bounce5Rate)}</span>
        <span>${percent(row.retention30Rate)}</span>
      </div>`).join('')}` : '<p class="empty-copy">当前窗口没有页面访问数据。</p>'
}

function funnelRow(label, definition, sublabel, value, base) {
  return `<div class="funnel-row">
    <span class="funnel-label"><b>${metricLabel(label, definition)}</b><small>${escapeHtml(sublabel)}</small></span>
    <progress class="funnel-track" value="${value}" max="${Math.max(base, 1)}" aria-label="${escapeHtml(label)} ${escapeHtml(sublabel)}"></progress>
    <span class="funnel-value">${number(value)}</span>
  </div>`
}

function renderJourneys(data) {
  const site = data.summary.current
  $('#visitor-journey').innerHTML = [
    funnelRow('网站会话', 'pageSession', '基准', site.pageSessions, site.pageSessions),
    funnelRow('进入世界', 'worldEntry', percent(data.summary.rates.worldEntryRate), site.playingSessions, site.pageSessions),
    funnelRow('第二世界', 'secondWorld', `${percent(data.summary.rates.secondWorldRate)}／已进入`, site.multiWorldSessions, site.pageSessions),
    funnelRow('续玩会话（北极星）', 'continuedPlay', '真实互动 + 第二世界', site.continuedPlaySessions, site.pageSessions),
    funnelRow('第三世界', 'thirdWorld', `${percent(data.summary.rates.thirdWorldRate)}／已进入`, site.threeWorldSessions, site.pageSessions),
  ].join('')
  const play = data.play.current
  $('#play-journey').innerHTML = [
    funnelRow('世界游玩', 'playVisit', '基准', play.visits, play.visits),
    funnelRow('停留 5 秒', 'retention5', percent(play.visits ? play.reached5s / play.visits : null), play.reached5s, play.visits),
    funnelRow('停留 30 秒', 'retention30', percent(play.retention30Rate), play.reached30s, play.visits),
    funnelRow('真实互动', 'interaction', percent(play.interactionRate), play.interacted, play.visits),
    funnelRow('深度游玩', 'deepPlay', percent(play.deepPlayRate), play.deepPlay, play.visits),
  ].join('')
}

function renderAttention(data) {
  const rows = data.worlds
    .filter((world) => !world.retired && world.visits >= 20 && ['priority', 'technical', 'immersion', 'onboarding'].includes(world.signal))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 6)
  const reason = (world) => {
    if (world.signal === 'technical') return `超时 ${percent(world.timeoutRate)} · 错误 ${percent(world.errorRate)}`
    if (world.signal === 'immersion') return `沉浸 ${percent(world.retention30Rate)} · 互动 ${percent(world.interactionRate)}`
    if (world.signal === 'onboarding') return `互动 ${percent(world.interactionRate)} · 沉浸 ${percent(world.retention30Rate)}`
    return `沉浸 ${percent(world.retention30Rate)} · 互动 ${percent(world.interactionRate)}`
  }
  $('#attention-list').innerHTML = rows.length ? rows.map((world) => `
    <div class="attention-item">
      <img src="https://shapeof.world${escapeHtml(world.poster)}" alt="" loading="lazy">
      <span><b>${escapeHtml(world.title)}</b><small>${number(world.visits)} 次游玩 · ${escapeHtml(reason(world))}</small></span>
      <span class="signal-chip signal-${escapeHtml(world.signal)}">${escapeHtml(signalLabels[world.signal])}</span>
    </div>`).join('') : '<p class="empty-copy">当前没有达到样本门槛的明显待检查项。</p>'
}

// Worlds removed from the catalog keep their historical metrics.
function worldCaption(world) {
  const domain = domainLabels[world.domain] || world.domain
  return world.retired ? `${domain} · 已移出目录` : domain
}

function setupWorldFilters(worlds) {
  const domainFilter = $('#domain-filter')
  if (domainFilter.options.length === 1) {
    const domains = [...new Set(worlds.map((world) => world.domain))].sort()
    domains.forEach((domain) => domainFilter.add(new Option(domainLabels[domain] || domain, domain)))
  }
  const signalFilter = $('#signal-filter')
  if (signalFilter.options.length === 1) {
    Object.entries(signalLabels).forEach(([value, label]) => signalFilter.add(new Option(label, value)))
  }
}

function filteredWorlds() {
  if (!state.data) return []
  const query = $('#world-search').value.trim().toLowerCase()
  const domain = $('#domain-filter').value
  const signal = $('#signal-filter').value
  const sample = Number($('#sample-filter').value)
  return state.data.worlds.filter((world) => {
    if (world.visits < sample) return false
    if (domain !== 'all' && world.domain !== domain) return false
    if (signal !== 'all' && world.signal !== signal) return false
    if (query && !`${world.title} ${world.titleEn} ${world.id}`.toLowerCase().includes(query)) return false
    return true
  }).sort((left, right) => {
    const leftValue = left[state.sort] ?? -1
    const rightValue = right[state.sort] ?? -1
    return (leftValue - rightValue) * state.sortDirection
  })
}

function renderWorlds() {
  const worlds = filteredWorlds()
  const sortLabels = {
    visits: '游玩次数',
    averageVisibleSeconds: '平均停留',
    retention30Rate: '30 秒沉浸率',
    interactionRate: '真实互动率',
    deepPlayRate: '深度游玩率',
    guideCompletionRate: '故事完成率',
  }
  $('#table-summary').textContent = `显示 ${worlds.length} 个世界 · 当前排序：${sortLabels[state.sort] || state.sort}`
  $('#world-table-body').innerHTML = worlds.map((world) => `
    <tr>
      <td><div class="world-cell">
        <img src="https://shapeof.world${escapeHtml(world.poster)}" alt="" loading="lazy">
        <span><b>${escapeHtml(world.title)}</b><small>${escapeHtml(worldCaption(world))}</small></span>
      </div></td>
      <td>${number(world.visits)}${movementCell(world.visitsMovement)}</td>
      <td>${duration(world.averageVisibleSeconds)}${world.durationSamples ? `<small class="cell-sample">${number(world.durationSamples)} 个样本</small>` : ''}</td>
      <td>${percent(world.retention30Rate)}${movementCell(world.retentionMovement, true)}</td>
      <td>${percent(world.interactionRate)}${movementCell(world.interactionMovement, true)}</td>
      <td>${percent(world.deepPlayRate)}</td>
      <td>${world.guideShown ? percent(world.guideCompletionRate) : '不适用'}</td>
      <td><span class="signal-chip signal-${escapeHtml(world.signal)}">${escapeHtml(signalLabels[world.signal])}</span></td>
    </tr>`).join('') || '<tr><td colspan="8">没有符合筛选条件的世界。</td></tr>'
  renderScatter(worlds)
}

function renderDurationRanking(worlds) {
  const container = $('#duration-ranking')
  const rows = worlds
    .filter((world) => world.durationSamples >= 5 && world.averageVisibleSeconds !== null)
    .sort((left, right) => right.averageVisibleSeconds - left.averageVisibleSeconds)
    .slice(0, 8)
  if (!rows.length) {
    container.innerHTML = '<p class="duration-empty">前台停留数据积累中。</p>'
    return
  }
  const maximum = Math.max(...rows.map((world) => world.averageVisibleSeconds), 1)
  container.innerHTML = rows.map((world, index) => `
    <div class="duration-row">
      <span class="duration-rank">${String(index + 1).padStart(2, '0')}</span>
      <img src="https://shapeof.world${escapeHtml(world.poster)}" alt="" loading="lazy">
      <span class="duration-world"><b>${escapeHtml(world.title)}</b><small>${escapeHtml(worldCaption(world))}</small></span>
      <span class="duration-track" aria-hidden="true"><i style="width:${Math.max(4, world.averageVisibleSeconds / maximum * 100).toFixed(1)}%"></i></span>
      <span class="duration-values"><strong>${escapeHtml(duration(world.averageVisibleSeconds))}</strong><small>中位 ${escapeHtml(duration(world.medianVisibleSeconds))} · P75 ${escapeHtml(duration(world.p75VisibleSeconds))} · ${number(world.durationSamples)} 个样本</small></span>
    </div>`).join('')
}

function movementCell(value, rate = false) {
  if (value === null || value === undefined) return ''
  const className = Math.abs(value) < 0.005 ? 'delta-flat' : value > 0 ? 'delta-up' : 'delta-down'
  const prefix = value > 0 ? '+' : ''
  const label = rate ? `${prefix}${(value * 100).toFixed(1)}pp` : `${prefix}${(value * 100).toFixed(0)}%`
  return `<small class="cell-delta ${className}">${label}</small>`
}

function renderScatter(worlds) {
  const container = $('#scatter-chart')
  const rows = worlds.filter((world) => world.retention30Rate !== null && world.interactionRate !== null).slice(0, 80)
  if (!rows.length) {
    container.textContent = '当前筛选没有足够数据绘制体验地图。'
    return
  }
  const width = 980
  const height = 400
  const pad = { left: 58, right: 22, top: 22, bottom: 48 }
  const x = (value) => pad.left + value * (width - pad.left - pad.right)
  const y = (value) => pad.top + (1 - value) * (height - pad.top - pad.bottom)
  const baseX = state.data.play.current.retention30Rate ?? 0
  const baseY = state.data.play.current.interactionRate ?? 0
  const axes = [0, 0.25, 0.5, 0.75, 1].map((value) => `
    <line class="scatter-axis" x1="${x(value)}" y1="${pad.top}" x2="${x(value)}" y2="${height - pad.bottom}"/>
    <line class="scatter-axis" x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}"/>
    <text class="scatter-label" x="${x(value)}" y="${height - 18}" text-anchor="middle">${value * 100}%</text>
    <text class="scatter-label" x="${pad.left - 10}" y="${y(value) + 3}" text-anchor="end">${value * 100}%</text>`).join('')
  const maxVisits = Math.max(...rows.map((world) => world.visits), 1)
  const bubbles = rows.map((world) => {
    const radius = 5 + Math.sqrt(world.visits / maxVisits) * 22
    return `<circle class="scatter-bubble" cx="${x(world.retention30Rate)}" cy="${y(world.interactionRate)}" r="${radius}"><title>${escapeHtml(world.title)} · 游玩 ${number(world.visits)} · 30秒 ${percent(world.retention30Rate)} · 互动 ${percent(world.interactionRate)}</title></circle>`
  }).join('')
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="世界的三十秒沉浸率与真实互动率散点图">
    ${axes}
    <line class="scatter-baseline" x1="${x(baseX)}" y1="${pad.top}" x2="${x(baseX)}" y2="${height - pad.bottom}"/>
    <line class="scatter-baseline" x1="${pad.left}" y1="${y(baseY)}" x2="${width - pad.right}" y2="${y(baseY)}"/>
    ${bubbles}
    <text class="scatter-label" x="${width / 2}" y="${height - 2}" text-anchor="middle">30 秒沉浸率 →</text>
    <text class="scatter-label" x="13" y="${height / 2}" transform="rotate(-90 13 ${height / 2})" text-anchor="middle">真实互动率 →</text>
  </svg>`
}

function renderDefinitions(data) {
  $('#definitions').innerHTML = Object.entries(data.definitions).map(([key, value]) => `
    <article class="definition-card"><h3>${escapeHtml(definitionTitles[key] || key)}</h3><p>${escapeHtml(value)}</p></article>`).join('')
  $('#caveats').innerHTML = data.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

document.addEventListener('pointerover', (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-metric-definition]') : null
  if (!(target instanceof HTMLButtonElement)) return
  if (metricHelpPinned && activeMetricHelpButton !== target) return
  showMetricHelp(target, metricHelpPinned && activeMetricHelpButton === target)
})

document.addEventListener('pointerout', (event) => {
  if (metricHelpPinned || !activeMetricHelpButton) return
  const related = event.relatedTarget
  if (related instanceof Node && activeMetricHelpButton.contains(related)) return
  const target = event.target instanceof Element ? event.target.closest('[data-metric-definition]') : null
  if (target === activeMetricHelpButton && document.activeElement !== activeMetricHelpButton) closeMetricHelp()
})

document.addEventListener('focusin', (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-metric-definition]') : null
  if (target instanceof HTMLButtonElement) showMetricHelp(target, false)
})

document.addEventListener('focusout', () => {
  window.setTimeout(() => {
    if (!metricHelpPinned && activeMetricHelpButton && document.activeElement !== activeMetricHelpButton) closeMetricHelp()
  }, 0)
})

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-metric-definition]') : null
  if (target instanceof HTMLButtonElement) {
    event.stopPropagation()
    if (activeMetricHelpButton === target && metricHelpPinned) closeMetricHelp()
    else showMetricHelp(target, true)
    return
  }
  if (activeMetricHelpButton) closeMetricHelp()
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeMetricHelpButton) closeMetricHelp()
})

window.addEventListener('resize', () => {
  if (activeMetricHelpButton) positionMetricPopover(activeMetricHelpButton)
})

window.addEventListener('scroll', () => {
  if (!activeMetricHelpButton) return
  if (!document.contains(activeMetricHelpButton)) closeMetricHelp()
  else positionMetricPopover(activeMetricHelpButton)
}, true)

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const status = $('#login-status')
  const button = event.currentTarget.querySelector('button')
  status.textContent = '正在验证…'
  button.disabled = true
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) })
    $('#password').value = ''
    status.textContent = ''
    showDashboard()
    await loadData()
  } catch (error) {
    status.textContent = error.message
  } finally {
    button.disabled = false
  }
})

$('#logout').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }) } catch {}
  state.data = null
  showLogin()
})

$('#retry').addEventListener('click', loadData)
$$('[data-days]').forEach((button) => button.addEventListener('click', async () => {
  state.days = Number(button.dataset.days)
  $$('[data-days]').forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)))
  await loadData()
}))

$('#world-search').addEventListener('input', renderWorlds)
$('#domain-filter').addEventListener('change', renderWorlds)
$('#signal-filter').addEventListener('change', renderWorlds)
$('#sample-filter').addEventListener('change', renderWorlds)

$$('[data-sort]').forEach((button) => button.addEventListener('click', () => {
  const sort = button.dataset.sort
  if (state.sort === sort) state.sortDirection *= -1
  else { state.sort = sort; state.sortDirection = -1 }
  renderWorlds()
}))

api('/api/session')
  .then(async ({ authenticated }) => {
    if (!authenticated) { showLogin(); return }
    showDashboard()
    await loadData()
  })
  .catch(showLogin)
