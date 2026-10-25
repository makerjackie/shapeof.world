import { WorldLoadMeter, type LoadProgress, type WorldLoadManifest } from './world-load-progress'

declare const __WORLD_LOAD_BASE__: string

const downloads = new Map<string, WorldDownload>()
const resourceTimings = new Map<string, PerformanceResourceTiming>()
const requests = new Map<string, { promise: Promise<void>; listeners: Set<(bytes: number) => void> }>()

/** One transfer per asset, shared by intent warming and foreground navigation. */
async function cacheAsset(url: string, meter: WorldLoadMeter) {
  const activity = (bytes: number) => meter.activity(bytes, performance.now())
  let request = requests.get(url)
  if (!request) {
    const listeners = new Set([activity])
    const promise = (async () => {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' })
      if (!response.ok) throw new Error(`World chunk download failed (${response.status})`)
      meter.setEncodedSize(url, Number(response.headers.get('content-length')))
      const reader = response.body?.getReader()
      if (!reader) {
        const body = await response.arrayBuffer()
        for (const listener of listeners) listener(body.byteLength)
        return
      }
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const listener of listeners) listener(value.byteLength)
        }
      } finally { reader.releaseLock() }
    })()
    request = { promise, listeners }
    requests.set(url, request)
    // Failed warmups must not poison a later foreground attempt.
    void promise.catch(() => requests.delete(url))
  }
  request.listeners.add(activity)
  try { await request.promise } finally { request.listeners.delete(activity) }
}

class WorldDownload {
  readonly meter = new WorldLoadMeter(performance.now(), location.origin)
  private snapshot: LoadProgress = { loaded: 0 }
  private listeners = new Set<() => void>()
  private preparation?: Promise<void>

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  getSnapshot = () => this.snapshot
  refresh = (entries: PerformanceEntryList = performance.getEntriesByType('resource')) => {
    for (const entry of entries) {
      if (this.meter.has(entry.name)) resourceTimings.set(entry.name, entry as PerformanceResourceTiming)
    }
    for (const entry of resourceTimings.values()) this.meter.record(entry)
    const next = this.meter.snapshot()
    if (next.loaded === this.snapshot.loaded && next.total === this.snapshot.total) return
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  prepare(id: string) {
    return this.preparation ??= this.download(id).catch((error: unknown) => {
      this.preparation = undefined
      throw error
    })
  }

  private async download(id: string) {
    const base = typeof __WORLD_LOAD_BASE__ === 'string' ? __WORLD_LOAD_BASE__ : ''
    if (!base) return // Development has no production manifest.
    let manifest: WorldLoadManifest
    try {
      const response = await fetch(`${base}${encodeURIComponent(id)}.json`, { signal: AbortSignal.timeout(2000) })
      if (!response.ok) return
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('files' in data) || !Array.isArray(data.files)) return
      if (!data.files.every((file) => Array.isArray(file) && typeof file[0] === 'string' &&
        (file[1] === undefined || (typeof file[1] === 'number' && Number.isFinite(file[1]))))) return
      manifest = data as WorldLoadManifest
    } catch { return } // Missing metadata must never prevent a world opening.
    this.meter.setManifest(manifest)
    this.refresh()
    // The observer list still contains completions after the browser's resource
    // timing buffer fills; reading only getEntriesByType would miss those.
    const observer = typeof PerformanceObserver === 'undefined' ? undefined : new PerformanceObserver((list) => this.refresh(list.getEntries()))
    observer?.observe({ type: 'resource', buffered: true })
    try {
      const pending = manifest.files.map(([path]) => new URL(path, location.origin).href)
        .filter((url) => this.meter.has(url) && !this.meter.complete(url))
      // Bound concurrency so large worlds do not saturate the browser's request queue.
      await Promise.all(Array.from({ length: Math.min(6, pending.length) }, async () => {
        for (let url = pending.shift(); url; url = pending.shift()) {
          await cacheAsset(url, this.meter)
          this.refresh()
        }
      }))
    } finally {
      this.refresh()
      observer?.disconnect()
    }
  }
}

export function getWorldDownload(id: string) {
  let download = downloads.get(id)
  if (!download) { download = new WorldDownload(); downloads.set(id, download) }
  return download
}

export async function prepareWorldDownload(id: string) {
  await getWorldDownload(id).prepare(id)
}
