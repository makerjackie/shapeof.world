/** Resource Timing is authoritative for displayed bytes; streams only signal activity. */
export type WorldLoadFile = readonly [url: string, bytes?: number]
export type WorldLoadManifest = { files: WorldLoadFile[] }
export type LoadProgress = { loaded: number; total?: number }
export const WORLD_STALL_MS = 20_000
export const PROGRESS_DELAY_MS = 400

type Timing = Pick<PerformanceResourceTiming, 'name' | 'transferSize' | 'encodedBodySize' | 'decodedBodySize' | 'responseEnd'> & { responseStatus?: number }

export function timingBytes(entry: Timing): number {
  return entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0
}

export function isWorldLoadStalled(lastActivity: number, now: number): boolean {
  return now - lastActivity >= WORLD_STALL_MS
}

export class WorldLoadMeter {
  private files = new Map<string, { expected?: number; loaded: number; complete: boolean }>()
  private seen = new Set<string>()
  lastActivity: number

  constructor(readonly started: number, private origin: string) {
    this.lastActivity = started
  }

  setManifest(manifest: WorldLoadManifest) {
    this.files.clear()
    this.seen.clear()
    for (const [path, bytes] of manifest.files) {
      const url = new URL(path, this.origin).href
      if (new URL(url).origin !== this.origin || !/\.(js|css)$/.test(new URL(url).pathname)) continue
      // Resource Timing specifies 300 bytes for the response header envelope.
      this.files.set(url, { expected: bytes && bytes > 0 ? bytes + 300 : undefined, loaded: 0, complete: false })
    }
  }

  has(url: string) { return this.files.has(url) }
  get observable() { return this.files.size > 0 }
  complete(url: string) { return this.files.get(url)?.complete === true }

  activity(bytes: number, now: number) {
    if (bytes > 0) this.lastActivity = now
  }

  setEncodedSize(url: string, bytes: number) {
    const file = this.files.get(url)
    if (file && !file.complete && bytes > 0) file.expected = bytes + 300
  }

  record(entry: Timing) {
    const file = this.files.get(entry.name)
    if (!file || (entry.responseStatus ?? 0) >= 400 || entry.responseEnd <= 0) return
    const key = `${entry.name}:${entry.responseEnd}`
    if (this.seen.has(key) || file.complete) return
    this.seen.add(key)
    // A zero-size successful same-origin response can be an opaque cache hit.
    const bytes = timingBytes(entry) || file.expected
    if (!bytes) return
    file.loaded = bytes
    file.expected = bytes
    file.complete = true
    if (entry.responseEnd >= this.started) this.activity(bytes, entry.responseEnd)
  }

  snapshot(): LoadProgress {
    let loaded = 0, total = 0
    let known = this.files.size > 0
    for (const file of this.files.values()) {
      loaded += file.loaded
      total += file.expected ?? 0
      known &&= file.expected !== undefined
    }
    return { loaded, total: known ? total : undefined }
  }
}
