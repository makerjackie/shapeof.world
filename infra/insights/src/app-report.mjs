export function aggregate(rows, channel = 'release') {
  const seen = new Set(); const days = Object.create(null); const worlds = Object.create(null); const buttons = Object.create(null); const errors = Object.create(null); const versions = Object.create(null);
  let sampled = false; let sessionMs = 0; let searches = 0; let searchesWithoutResults = 0; let firstInteractions = 0; let guideCompletions = 0;
  const percentile = (values, p) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a.value - b.value);
    const target = sorted.reduce((n, e) => n + e.weight, 0) * p;
    let cumulative = 0;
    return sorted.find(e => (cumulative += e.weight) >= target)?.value ?? null;
  };
  for (const r of rows) {
    if (r.blob9 !== channel || seen.has(r.blob3)) continue;
    seen.add(r.blob3);
    const weight = Number(r._sample_interval ?? 1);
    if (!Number.isFinite(weight) || weight < 1) throw new Error('Invalid sample weight');
    sampled ||= weight > 1;
    const day = new Date(Number(r.double1)).toISOString().slice(0, 10);
    (days[day] ??= new Set()).add(r.blob4);
    const duration = Number(r.double2 ?? 0);
    const versionKey = `${r.blob6}/${r.blob7}+${r.blob8}`;
    const version = versions[versionKey] ??= { observedEvents: 0, errorEvents: 0 };
    version.observedEvents += weight;
    if (['app_error', 'world_error'].includes(r.blob2)) version.errorEvents += weight;
    if (r.blob2 === 'search_results') { searches += weight; if (Number(r.double3) === 0) searchesWithoutResults += weight; }
    if (r.blob2 === 'world_first_interaction') firstInteractions += weight;
    if (r.blob2 === 'guide_complete') guideCompletions += weight;
    if (r.blob2 === 'app_session_duration') sessionMs += duration * weight;
    if (r.blob2 === 'ui_action') {
      const key = `${r.blob15}/${r.blob14}`; buttons[key] = (buttons[key] ?? 0) + weight;
    }
    if (['app_error', 'world_error'].includes(r.blob2)) {
      const key = `${r.blob11 || 'app'}/${r.blob13}`; errors[key] = (errors[key] ?? 0) + weight;
    }
    if (!r.blob11) continue;
    const w = worlds[r.blob11] ??= { opens: 0, firstFrames: 0, durationMs: 0, errors: 0, firstInteractions: 0, guideCompletions: 0, firstFrameSamples: [], slowFrameSamples: [] };
    if (r.blob2 === 'world_open') w.opens += weight;
    if (r.blob2 === 'world_first_frame') { w.firstFrames += weight; w.firstFrameSamples.push({ value: duration, weight }); }
    if (r.blob2 === 'world_duration') w.durationMs += duration * weight;
    if (r.blob2 === 'world_error') w.errors += weight;
    if (r.blob2 === 'world_first_interaction') w.firstInteractions += weight;
    if (r.blob2 === 'guide_complete') w.guideCompletions += weight;
    if (r.blob2 === 'frame_summary') w.slowFrameSamples.push({ value: Number(r.double3), weight });
  }
  return {
    channel, sampled, uniqueEventsObserved: seen.size,
    note: 'Opt-in devices only. UTC event dates; retries deduplicated by eventId. Counts and durations use AE sample weights. Daily active installations are observed lower bounds when sampled. Error/open ratio counts errors, not unique failed visits. Missing first frames may include user exits. Flutter slow frames do not measure WebView GPU performance.',
    dailyActiveInstallationsObserved: Object.fromEntries(Object.entries(days).map(([day, ids]) => [day, ids.size])),
    foregroundSessionMs: sessionMs, searches, searchesWithoutResults, firstInteractions, guideCompletions,
    worlds: Object.fromEntries(Object.entries(worlds).map(([id, w]) => [id, {
      opens: w.opens, firstInteractions: w.firstInteractions, guideCompletions: w.guideCompletions, firstFrames: w.firstFrames, foregroundMs: w.durationMs,
      errorEvents: w.errors, errorEventsPerOpen: w.opens ? w.errors / w.opens : null,
      firstFrameMissingRate: w.opens ? Math.max(0, 1 - w.firstFrames / w.opens) : null,
      firstFrameP50Ms: percentile(w.firstFrameSamples, 0.5), firstFrameP95Ms: percentile(w.firstFrameSamples, 0.95),
      flutterSlowFramesP95Per10000: percentile(w.slowFrameSamples, 0.95),
    }])), buttons, errors, versions,
  };
}
export function query(days, channel) {
  if (!Number.isInteger(days) || days < 1 || days > 90 || !['release', 'testflight', 'profile', 'debug'].includes(channel)) throw new Error('Use --days 1..90 and --channel release|testflight|profile|debug');
  return `SELECT timestamp, blob2, blob3, blob4, blob6, blob7, blob8, blob9, blob11, blob13, blob14, blob15, double1, double2, double3, _sample_interval FROM shape_of_world_app_events WHERE double1 >= ${(Date.now() - days * 86400000)} AND blob9 = '${channel}' ORDER BY timestamp DESC LIMIT 100001 FORMAT JSON`;
}
/** Static operator report: no event, session or installation identifiers embedded. */
export function renderHtml(report) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const number = value => value === null || value === undefined ? '—' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const time = value => value === null || value === undefined ? '—' : `${number(value / 60000)} 分钟`;
  const table = (title, headers, rows) => `<section><h2>${escape(title)}</h2>${rows.length ? `<div class="table"><table><thead><tr>${headers.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="empty">暂无数据</p>'}</section>`;
  const card = (label, value) => `<div class="card"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>App 使用与诊断报告</title><style>
  :root{font-family:system-ui,-apple-system,sans-serif;color:#20252b;background:#f5f6f8}body{max-width:1200px;margin:0 auto;padding:32px 24px}h1{font-size:28px;margin-bottom:12px}h2{font-size:19px;margin:0 0 18px}p{line-height:1.7;color:#555d68}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,section{background:white;border:1px solid #e1e5ea;border-radius:10px;padding:20px}.card span{display:block;color:#59616c;font-size:14px}.card strong{display:block;font-size:25px;margin-top:10px}section{margin-top:24px}.table{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #e8ebef;white-space:nowrap}th{font-weight:600;background:#f8f9fb}.empty{padding:16px 0;color:#747c86}.notice{border-left:3px solid #8e9aaa;padding-left:16px}
  </style></head><body><h1>App 使用与诊断报告</h1><p>渠道：${escape(report.channel)} · 按事件发生日期统计（UTC）</p>
  <p class="notice">仅覆盖主动开启使用与诊断数据的设备。${report.sampled ? '当前结果包含采样：事件次数和时长已加权，每日活跃安装数为已观测下界。' : '当前返回行未标记采样。'} 重试事件按事件标识去重。错误数是错误事件次数；首帧缺失可能包含主动退出。Flutter 慢帧不代表 WebView GPU 性能。报告不包含安装、会话或事件标识。</p>
  ${report.uniqueEventsObserved === 0 ? '<section><h2>暂无数据</h2><p>本次查询未返回当前渠道的使用或诊断事件。请确认渠道、采集开关和服务部署状态；这不表示实际用户数为零。</p></section>' : ''}
  <div class="cards">${card('已观测去重事件', number(report.uniqueEventsObserved))}${card('App 前台使用时长', time(report.foregroundSessionMs))}${card('搜索次数', number(report.searches))}${card('无结果搜索次数', number(report.searchesWithoutResults))}${card('首次互动次数', number(report.firstInteractions))}${card('导览结束次数（含跳过）', number(report.guideCompletions))}</div>
  ${table('每日活跃安装', ['日期（UTC）', '已观测活跃安装数'], Object.entries(report.dailyActiveInstallationsObserved).sort(([a], [b]) => a.localeCompare(b)).map(([day, n]) => [day, number(n)]))}
  ${table('世界体验', ['世界', '打开次数', '前台时长', '首帧 p50（ms）', '首帧 p95（ms）', '错误数', '首次互动', '导览结束（含跳过）'], Object.entries(report.worlds).map(([id, w]) => [id, number(w.opens), time(w.foregroundMs), number(w.firstFrameP50Ms), number(w.firstFrameP95Ms), number(w.errorEvents), number(w.firstInteractions), number(w.guideCompletions)]))}
  ${table('按钮使用', ['位置 / 操作', '次数'], Object.entries(report.buttons).map(([key, n]) => [key, number(n)]))}
  ${table('版本错误', ['平台 / 版本 + 构建号', '事件次数（采样加权）', '错误数'], Object.entries(report.versions).map(([key, v]) => [key, number(v.observedEvents), number(v.errorEvents)]))}
  ${table('错误分类', ['世界 / 错误代码', '次数'], Object.entries(report.errors).map(([key, n]) => [key, number(n)]))}
  </body></html>`;
}
