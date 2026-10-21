const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => Array.from(document.querySelectorAll(selector))

const state = {
  days: 7,
  aiConfig: null,
  report: null,
  chatHistory: [],
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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
  $('#report-dashboard').hidden = true
  $('#login-shell').hidden = false
  $('#password').focus()
}

function showReportPage() {
  $('#login-shell').hidden = true
  $('#report-dashboard').hidden = false
}

function reportEvidence(factIds, facts) {
  return `<div class="report-evidence">${factIds.map((id) => {
    const fact = facts.get(id)
    if (!fact) return ''
    return `<span class="evidence-chip" title="${escapeHtml(fact.context)}"><small>${escapeHtml(fact.label)}</small><b>${escapeHtml(fact.value)}</b></span>`
  }).join('')}</div>`
}

function renderReport(report) {
  const facts = new Map(report.facts.map((fact) => [fact.id, fact]))
  const generated = new Date(report.generatedAt).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const points = (rows) => rows.map((point) => `
    <div class="report-point">
      <h4>${escapeHtml(point.headline)}</h4>
      <p>${escapeHtml(point.narrative)}</p>
      ${reportEvidence(point.factIds, facts)}
    </div>`).join('')
  $('#report-content').innerHTML = `
    <header class="report-title-row">
      <div><p class="eyebrow">滚动 ${report.days} 天</p><h3>${escapeHtml(report.title)}</h3></div>
      <p>${escapeHtml(report.model)} · ${escapeHtml(generated)} 生成<br>数据截至 ${escapeHtml(report.dataThrough || '暂无时间戳')}</p>
    </header>
    <section class="report-block report-summary"><h3>执行摘要</h3>${points(report.executiveSummary)}</section>
    <section class="report-block"><h3>关键发现</h3>${points(report.findings)}</section>
    <section class="report-block"><h3>建议下一步</h3><ol class="report-actions">${report.recommendations.map((item) => {
      const metric = facts.get(item.successMetricId)
      return `<li><div><b>${escapeHtml(item.action)}</b><p>${escapeHtml(item.rationale)}</p></div>${metric ? `<span><small>观察指标</small><strong>${escapeHtml(metric.label)}</strong></span>` : ''}</li>`
    }).join('')}</ol></section>
    ${report.questions.length ? `<section class="report-block"><h3>进一步问题</h3><ul class="report-questions">${report.questions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}
    <details class="report-caveats"><summary>分析边界</summary>${report.caveats.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</details>`
  $('#report-state').hidden = true
  $('#report-content').hidden = false
  $('#chat-panel').hidden = false
  $('#chat-model').textContent = report.model
  renderChatSuggestions(report.questions)
}

function renderChatSuggestions(questions = []) {
  const defaults = ['哪些主题最值得优先优化？', '这期最值得关注的变化是什么？', '下一步应该验证什么？']
  const rows = questions.length ? questions : defaults
  $('#chat-suggestions').innerHTML = rows.slice(0, 3).map((question) => `
    <button type="button" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`).join('')
  $$('#chat-suggestions [data-question]').forEach((button) => button.addEventListener('click', () => {
    $('#chat-question').value = button.dataset.question
    $('#chat-form').requestSubmit()
  }))
}

function renderChat() {
  $('#chat-messages').innerHTML = state.chatHistory.map((message) => {
    const facts = new Map((message.facts || []).map((fact) => [fact.id, fact]))
    return `<article class="chat-message ${escapeHtml(message.role)}">
      <span>${message.role === 'user' ? '你' : 'AI'}</span>
      <div><p>${escapeHtml(message.content)}</p>${message.factIds?.length ? reportEvidence(message.factIds, facts) : ''}</div>
    </article>`
  }).join('')
  const container = $('#chat-messages')
  container.scrollTop = container.scrollHeight
}

async function askQuestion(question) {
  const priorHistory = state.chatHistory.map(({ role, content }) => ({ role, content }))
  state.chatHistory.push({ role: 'user', content: question })
  renderChat()
  const button = $('#chat-submit')
  button.disabled = true
  button.textContent = '分析中…'
  try {
    const answer = await api(`/api/chat?days=${state.days}`, {
      method: 'POST',
      body: JSON.stringify({ question, history: priorHistory }),
    })
    state.chatHistory.push({
      role: 'assistant',
      content: answer.answer,
      factIds: answer.factIds,
      facts: answer.facts,
    })
    renderChat()
    renderChatSuggestions(answer.suggestedQuestions)
  } catch (error) {
    if (error.status === 401) {
      showLogin()
      return
    }
    state.chatHistory.push({ role: 'assistant', content: error.message })
    renderChat()
  } finally {
    button.disabled = false
    button.textContent = '提问'
  }
}

async function loadReport(forceRefresh) {
  const stateElement = $('#report-state')
  const content = $('#report-content')
  const button = $('#refresh-report')
  content.hidden = true
  $('#chat-panel').hidden = true
  stateElement.hidden = false
  if (!state.aiConfig?.configured) {
    button.disabled = true
    stateElement.innerHTML = '<div class="report-empty-mark">AI</div><div><b>AI 分析暂不可用</b><p>请稍后重试。</p></div>'
    return
  }

  const requestedDays = state.days
  button.disabled = true
  button.textContent = forceRefresh ? '正在重新生成…' : '正在读取…'
  stateElement.innerHTML = '<span class="loading-dot"></span><p>正在根据最新汇总数据生成分析…</p>'
  try {
    const report = await api(`/api/report?days=${requestedDays}`, {
      method: forceRefresh ? 'POST' : 'GET',
      ...(forceRefresh ? { body: '{}' } : {}),
    })
    if (requestedDays !== state.days) return
    state.report = report
    renderReport(report)
  } catch (error) {
    if (error.status === 401) {
      showLogin()
      return
    }
    if (requestedDays === state.days) {
      stateElement.innerHTML = `<div><b>AI 分析暂时没有生成</b><p>${escapeHtml(error.message)}</p></div>`
    }
  } finally {
    if (requestedDays === state.days) {
      button.disabled = false
      button.textContent = '重新生成'
    }
  }
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const status = $('#login-status')
  const button = event.currentTarget.querySelector('button')
  status.textContent = '正在验证…'
  button.disabled = true
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) })
    const session = await api('/api/session')
    state.aiConfig = session.ai
    $('#password').value = ''
    status.textContent = ''
    showReportPage()
    await loadReport(false)
  } catch (error) {
    status.textContent = error.message
  } finally {
    button.disabled = false
  }
})

$('#logout').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }) } catch {}
  state.report = null
  state.chatHistory = []
  showLogin()
})

$('#refresh-report').addEventListener('click', () => loadReport(true))
$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const input = $('#chat-question')
  const question = input.value.trim()
  if (!question) return
  input.value = ''
  await askQuestion(question)
})

$$('[data-days]').forEach((button) => button.addEventListener('click', async () => {
  state.days = Number(button.dataset.days)
  state.chatHistory = []
  renderChat()
  $$('[data-days]').forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)))
  await loadReport(false)
}))

api('/api/session')
  .then(async ({ authenticated, ai }) => {
    if (!authenticated) { showLogin(); return }
    state.aiConfig = ai
    showReportPage()
    await loadReport(false)
  })
  .catch(showLogin)
