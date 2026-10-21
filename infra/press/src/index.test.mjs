import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { PICKS_KEY, parseRange } from './handlers.js'
import worker from './index.js'

const ORIGIN = 'https://press.example'
const VIDEO = new Uint8Array(1000).map((_, i) => i % 256)

function makeEnv({ limited = false } = {}) {
  const kv = new Map()
  return {
    WRITE_LIMITER: { limit: async () => ({ success: !limited }) },
    PRESS_PICKS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) },
    PRESS_MEDIA: {
      get: async (key, { range } = {}) => {
        if (key !== 'demo/video.mp4') return null
        let from = 0, to = VIDEO.length
        if (range?.suffix !== undefined) from = VIDEO.length - range.suffix
        else if (range) { from = range.offset; to = range.length === undefined ? VIDEO.length : from + range.length }
        if (from >= VIDEO.length) throw new Error('range not satisfiable')
        return { size: VIDEO.length, httpEtag: '"e1"', body: VIDEO.slice(from, Math.min(to, VIDEO.length)), writeHttpMetadata: (h) => h.set('Content-Type', 'video/mp4') }
      },
    },
    ASSETS: { fetch: async () => new Response('<h1>kits</h1>', { headers: { 'Content-Type': 'text/html' } }) },
    kv,
  }
}

const req = (path, init = {}) => new Request(`${ORIGIN}${path}`, init)

describe('ranges', () => {
  it('parses one byte range', () => {
    assert.deepEqual(parseRange('bytes=0-99'), { offset: 0, length: 100 })
    assert.deepEqual(parseRange('bytes=500-'), { offset: 500 })
    assert.deepEqual(parseRange('bytes=-100'), { suffix: 100 })
    assert.deepEqual(parseRange('bytes=9-3'), { invalid: true })
    assert.equal(parseRange('bytes=0-1,5-6'), null)
    assert.equal(parseRange(null), null)
  })
})

describe('worker', () => {
  it('serves pages to anyone, kept out of search engines', async () => {
    const res = await worker.fetch(req('/'), makeEnv())
    assert.equal(res.status, 200)
    assert.match(await res.text(), /kits/)
    assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, nofollow')
    assert.match(await (await worker.fetch(req('/robots.txt'), makeEnv())).text(), /Disallow: \//)
  })
  it('reads and saves picks, same-origin only', async () => {
    const env = makeEnv()
    assert.deepEqual(await (await worker.fetch(req('/api/picks'), env)).json(), { kits: {}, updatedAt: null })
    const put = (body, origin = ORIGIN) => worker.fetch(req('/api/picks', { method: 'PUT', headers: { Origin: origin }, body: JSON.stringify(body) }), env)
    assert.equal((await put({ kit: '2026-10-20-ai-shape', field: 'title', value: 'a' }, 'https://evil.example')).status, 403)
    assert.equal((await put({ kit: '2026-10-20-ai-shape', field: 'tags', value: 'a' })).status, 400)
    const saved = await put({ kit: '2026-10-20-ai-shape', field: 'title', value: 'b' })
    assert.equal(saved.status, 200)
    assert.equal(JSON.parse(env.kv.get(PICKS_KEY)).kits['2026-10-20-ai-shape'].title, 'b')
    assert.equal((await worker.fetch(req('/api/other'), env)).status, 404)
  })
  it('rate-limits saving picks', async () => {
    const env = makeEnv({ limited: true })
    const res = await worker.fetch(req('/api/picks', { method: 'PUT', headers: { Origin: ORIGIN }, body: JSON.stringify({ kit: '2026-10-20-ai-shape', field: 'title', value: 'b' }) }), env)
    assert.equal(res.status, 429)
    assert.equal(env.kv.size, 0)
    assert.equal((await worker.fetch(req('/api/picks'), env)).status, 200) // reads are not limited
  })
  it('streams media with byte ranges and downloads', async () => {
    const env = makeEnv()
    const part = await worker.fetch(req('/media/demo/video.mp4', { headers: { Range: 'bytes=0-99' } }), env)
    assert.equal(part.status, 206)
    assert.equal(part.headers.get('Content-Range'), 'bytes 0-99/1000')
    assert.equal((await part.arrayBuffer()).byteLength, 100)
    const tail = await worker.fetch(req('/media/demo/video.mp4', { headers: { Range: 'bytes=-10' } }), env)
    assert.equal(tail.headers.get('Content-Range'), 'bytes 990-999/1000')
    const whole = await worker.fetch(req('/media/demo/video.mp4?download=片.mp4'), env)
    assert.equal(whole.status, 200)
    assert.match(whole.headers.get('Content-Disposition'), /^attachment; filename\*=UTF-8''/)
    assert.equal((await worker.fetch(req('/media/demo/video.mp4', { headers: { Range: 'bytes=5000-' } }), env)).status, 416)
    assert.equal((await worker.fetch(req('/media/a%2F..%2Fsecret'), env)).status, 404)
    assert.equal((await worker.fetch(req('/media/demo/Cover-A.webp'), env)).status, 404) // capitals are valid keys; this one just isn't stored
  })
})
