// Renders kits/*/kit.json into the release-kit site served on
// press.shapeof.world (dist/). Each kit is one finished video: the upload file,
// candidate titles, descriptions and covers. The author picks on the page;
// picks are saved through /api/picks (see src/index.js).
// Usage: node scripts/build.mjs
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const size = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : '')

// The source lists are plain: heading lines, "- " items and bare URLs.
function sourcesHtml(text) {
  const link = (s) => esc(s).replace(/https?:\/\/[^\s<，。；）]+/g, (u) => `<a href="${u}" rel="noreferrer">${u}</a>`)
  return text.split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').filter((l) => l.trim())
    let html = '', items = []
    const flush = () => { if (items.length) html += `<ul>${items.map((i) => `<li>${link(i)}</li>`).join('')}</ul>`; items = [] }
    for (const l of lines) {
      if (l.startsWith('- ')) items.push(l.slice(2))
      else { flush(); html += `<p>${link(l)}</p>` }
    }
    flush()
    return html
  }).join('\n')
}

function build({ root, builtAt, commit }) {
  const kitsDir = join(root, 'kits')
  const out = join(root, 'dist')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const css = readFileSync(join(root, 'site/press.css'), 'utf8')
  const js = readFileSync(join(root, 'site/press.js'), 'utf8')
  const kits = (existsSync(kitsDir) ? readdirSync(kitsDir) : [])
    .filter((d) => existsSync(join(kitsDir, d, 'kit.json')))
    .map((d) => ({ dir: d, ...JSON.parse(readFileSync(join(kitsDir, d, 'kit.json'), 'utf8')) }))
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt) || b.slug.localeCompare(a.slug))

  const page = ({ title, body, data }) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:,">
<title>${esc(title)}</title>
<style>${css}</style>
</head>
<body>
<header class="top"><div class="top-inner">
  <a class="brand" href="/">世界的形状 · 发布套件</a>
</div></header>
<main>${body}</main>
<footer>构建 ${esc(builtAt)} · ${esc(commit)} · 数据在 <code>shapeof.world/infra/press/kits/</code></footer>
<script type="application/json" id="press-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>${js}</script>
</body>
</html>`

  // Covers are served from R2 like the videos (kit.coversKey), never from Git.
  const cover = (kit, id, ratio, ext = 'webp') => `/media/${kit.coversKey}/cover-${id.toUpperCase()}-${ratio}.${ext}`
  const rec = (list) => (list.find((x) => x.recommended) || list[0]).id

  // Index: newest finalized first.
  const cards = kits
    .map(
      (k) => `<a class="kit-card" href="/${k.slug}/" data-slug="${k.slug}">
  <img src="${cover(k, rec(k.covers), '16x9')}" alt="" loading="lazy" data-cover>
  <div class="kit-meta">
    <h2>${esc(k.name)}</h2>
    <p>${esc(k.subtitle)}</p>
    <p class="muted">定稿 ${esc(k.finalizedAt)} · ${esc(k.video.duration)} · <span class="badge" data-status>待选</span></p>
  </div>
</a>`,
    )
    .join('')
  writeFileSync(
    join(out, 'index.html'),
    page({
      title: '发布套件 · 世界的形状',
      body: `<section class="intro"><h1>发布套件</h1><p>每支视频定稿后，上传用的视频文件、候选标题、简介和封面都放在这里，按定稿时间从新到旧排。点进去选标题、简介和封面，选了会自动保存，换设备也在。</p></section>
<div class="kit-list">${cards || '<p>还没有定稿的视频。</p>'}</div>`,
      data: { view: 'index', kits: kits.map((k) => ({ slug: k.slug, coversKey: k.coversKey, titles: k.titles, descriptions: k.descriptions, covers: k.covers })) },
    }),
  )

  for (const k of kits) {
    const dir = join(out, k.slug)
    mkdirSync(dir, { recursive: true })
    const media = `/media/${k.video.key}`
    const radio = (field, item, label, extra = '') => `<label class="option" data-field="${field}" data-id="${item.id}">
  <input type="radio" name="${field}" value="${item.id}">
  <span class="option-body">${label}${extra}</span>
</label>`
    const titles = k.titles
      .map((t) =>
        radio(
          'title',
          t,
          `<span class="option-text">${esc(t.text)}</span>`,
          `<span class="option-note">${t.recommended ? '<b class="badge rec">推荐</b>' : ''}${esc(t.for)} · ${[...t.text].length} 字 · ${esc(t.note)}</span>`,
        ),
      )
      .join('')
    const descriptions = k.descriptions
      .map((d) =>
        radio(
          'description',
          d,
          `<span class="option-text small">${esc(d.text)}</span>`,
          `<span class="option-note">${d.recommended ? '<b class="badge rec">推荐</b>' : ''}${esc(d.name)} · ${[...d.text].length} 字</span>`,
        ),
      )
      .join('')
    const covers = k.covers
      .map((c) =>
        radio(
          'cover',
          c,
          `<span class="cover-pair"><img src="${cover(k, c.id, '4x3')}" alt="${esc(c.name)} 4:3" loading="lazy"><img src="${cover(k, c.id, '16x9')}" alt="${esc(c.name)} 16:9" loading="lazy"></span>`,
          `<span class="option-note">${c.recommended ? '<b class="badge rec">推荐</b>' : ''}${esc(c.name)} · ${esc(c.note)}</span>`,
        ),
      )
      .join('')
    const body = `<p class="crumb"><a href="/">← 全部视频</a></p>
<section class="kit-head">
  <h1>${esc(k.name)}</h1>
  <p class="lead">${esc(k.subtitle)}</p>
  <p class="muted">定稿 ${esc(k.finalizedAt)} · ${esc(k.status)} · <span class="badge" data-status>待选</span></p>
  <p>${esc(k.summary)}</p>
</section>

<section class="block">
  <video controls preload="metadata" playsinline poster="${cover(k, rec(k.covers), '16x9')}" src="${media}"></video>
  <div class="video-bar">
    <a class="button primary" href="${media}?download=${encodeURIComponent(k.video.filename)}">下载上传用视频</a>
    <span>${esc(k.video.duration)} · ${esc(k.video.spec)}${k.video.bytes ? ` · ${size(k.video.bytes)}` : ''}</span>
  </div>
  <p class="muted">${esc(k.video.note)}</p>
</section>

<section class="block sheet">
  <h2>上传清单 <span class="save" data-save></span></h2>
  <p class="muted">按下面选中的标题、简介和封面生成；没选的项先用推荐。</p>
  <div class="sheet-row"><div><h3>标题</h3><p data-out="title"></p></div><button class="button" data-copy="title">复制</button></div>
  <div class="sheet-row"><div><h3>简介 <span class="muted" data-count="post"></span></h3><pre data-out="post"></pre><p class="muted">简介 + 章节时间 + 主要来源。B站上限 2000 字，YouTube 5000 字。</p></div><button class="button" data-copy="post">复制</button></div>
  <div class="sheet-row"><div><h3>标签</h3><p data-out="tags">${esc(k.tags.join('，'))}</p></div><button class="button" data-copy="tags">复制</button></div>
  <div class="sheet-row"><div><h3>封面</h3><div class="sheet-covers" data-out="cover"></div><p class="muted">B站、抖音、视频号用 4:3；YouTube 缩略图用 16:9。</p></div></div>
</section>

<section class="block"><h2>候选标题</h2><div class="options">${titles}</div></section>
<section class="block"><h2>候选简介</h2><div class="options">${descriptions}</div></section>
<section class="block"><h2>候选封面</h2><div class="options covers">${covers}</div></section>

<section class="block">
  <h2>章节时间</h2>
  <pre>${esc(k.chapters)}</pre>
  <details><summary>完整来源（约 ${Math.round([...k.sourcesFull].length / 100) * 100} 字，留作存档；YouTube 简介放得下，B站放不下）</summary><div class="doc">${sourcesHtml(k.sourcesFull)}</div></details>
</section>`
    writeFileSync(
      join(dir, 'index.html'),
      page({
        title: `${k.name} · 发布套件`,
        body,
        data: { view: 'kit', slug: k.slug, kit: { ...k, sourcesFull: undefined }, covers: Object.fromEntries(k.covers.map((c) => [c.id, { '4x3': cover(k, c.id, '4x3', 'jpg'), '16x9': cover(k, c.id, '16x9', 'jpg') }])) },
      }),
    )
  }
  return kits.length
}

const root = new URL('..', import.meta.url).pathname
let commit = 'unknown'
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {}
const builtAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
console.log(`built ${build({ root, builtAt, commit })} press kits into dist/`)
