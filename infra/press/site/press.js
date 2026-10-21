// Release-kit pages: load the saved picks, mark them, save changes through
// /api/picks, and fill the upload sheet with the chosen texts and covers.
;(() => {
  const data = JSON.parse(document.getElementById('press-data').textContent)
  const rec = (list) => (list.find((x) => x.recommended) || list[0]).id
  const done = (p) => Boolean(p && p.title && p.description && p.cover)
  let picks = {}

  async function load() {
    try {
      const res = await fetch('/api/picks', { cache: 'no-store' })
      if (res.ok) picks = (await res.json()).kits || {}
    } catch {
      // Offline: the page still works with the recommended picks.
    }
  }

  function setStatus(el, p) {
    if (!el) return
    el.textContent = done(p) ? '已选定' : '待选'
    el.classList.toggle('ok', done(p))
  }

  if (data.view === 'index') {
    load().then(() => {
      for (const kit of data.kits) {
        const card = document.querySelector(`.kit-card[data-slug="${kit.slug}"]`)
        if (!card) continue
        const p = picks[kit.slug]
        setStatus(card.querySelector('[data-status]'), p)
        if (p && p.cover) card.querySelector('[data-cover]').src = `/media/${kit.coversKey}/cover-${p.cover.toUpperCase()}-16x9.webp`
      }
    })
    return
  }

  const { slug, kit, covers } = data
  const saveEl = document.querySelector('[data-save]')
  const chosen = (field, list) => (picks[slug] && picks[slug][field]) || rec(list)
  const texts = {}

  function render() {
    const p = picks[slug] || {}
    for (const [field, list] of [['title', kit.titles], ['description', kit.descriptions], ['cover', kit.covers]]) {
      for (const label of document.querySelectorAll(`.option[data-field="${field}"]`)) {
        const on = p[field] === label.dataset.id
        label.querySelector('input').checked = on
        label.classList.toggle('chosen', on)
      }
    }
    const title = kit.titles.find((t) => t.id === chosen('title', kit.titles)).text
    const desc = kit.descriptions.find((d) => d.id === chosen('description', kit.descriptions)).text
    texts.title = title
    texts.post = `${desc}\n\n${kit.chapters}\n\n${kit.sourcesShort}`
    texts.tags = kit.tags.join('，')
    document.querySelector('[data-out="title"]').textContent = title + (p.title ? '' : '（推荐，未选）')
    document.querySelector('[data-out="post"]').textContent = texts.post
    document.querySelector('[data-count="post"]').textContent = `${[...texts.post].length} 字`
    const c = chosen('cover', kit.covers), files = covers[c]
    document.querySelector('[data-out="cover"]').innerHTML = ['4x3', '16x9']
      .map((r) => `<a class="cover-dl" href="${files[r]}" download><img src="${files[r]}" alt=""><span>下载 ${r === '4x3' ? '4:3' : '16:9'} JPG</span></a>`)
      .join('') + (p.cover ? '' : '<p class="muted">（推荐，未选）</p>')
    setStatus(document.querySelector('[data-status]'), p)
  }

  async function save(field, value) {
    picks[slug] = { ...(picks[slug] || {}), [field]: value }
    render()
    saveEl.textContent = '保存中…'
    try {
      const res = await fetch('/api/picks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit: slug, field, value }),
      })
      if (!res.ok) throw new Error(res.status)
      picks = (await res.json()).kits || picks
      saveEl.textContent = '已保存'
    } catch {
      saveEl.textContent = '没保存上，请刷新后再选'
    }
  }

  document.addEventListener('change', (e) => {
    const input = e.target.closest('.option input')
    if (input) save(input.name, input.value)
  })
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]')
    if (!btn) return
    try {
      await navigator.clipboard.writeText(texts[btn.dataset.copy])
      btn.textContent = '已复制'
    } catch {
      btn.textContent = '复制失败'
    }
    setTimeout(() => (btn.textContent = '复制'), 1500)
  })

  render()
  load().then(render)
})()
