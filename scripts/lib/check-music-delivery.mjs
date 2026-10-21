/** Check actual media bytes, not just a successful HTML fallback response. */
export async function checkMusicDelivery(base, catalog, fetcher = fetch) {
  const entries = Object.entries(catalog.tracks)
  for (let offset = 0; offset < entries.length; offset += 4) {
    await Promise.all(entries.slice(offset, offset + 4).map(async ([id, track]) => {
      const url = new URL(`/media/music/${id}/${track.version}/preview.mp3`, base)
      const head = await fetcher(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(20_000) })
      if (head.status !== 200 || !head.headers.get('content-type')?.startsWith('audio/mpeg') || Number(head.headers.get('content-length')) < 1024) {
        throw new Error(`Music HEAD failed: ${id} (${head.status})`)
      }
      const range = await fetcher(url, { headers: { range: 'bytes=0-1023' }, redirect: 'error', signal: AbortSignal.timeout(20_000) })
      if (range.status !== 206 || !/^bytes 0-1023\/\d+$/.test(range.headers.get('content-range') ?? '') || !range.headers.get('content-type')?.startsWith('audio/mpeg')) {
        await range.body?.cancel()
        throw new Error(`Music Range failed: ${id} (${range.status})`)
      }
      if ((await range.arrayBuffer()).byteLength !== 1024) throw new Error(`Music bytes truncated: ${id}`)
    }))
  }
  return entries.length
}
