import { gunzipSync, strFromU8 } from 'fflate'
import type { Layout } from './model'

export function decodeLayout(buffer: ArrayBuffer): Layout {
  const bytes = new Uint8Array(buffer)
  // Vite serves .gz with Content-Encoding; fetch then returns decoded JSON.
  // Static hosts may send the gzip as a binary asset. Accept either transport.
  const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes
  const layout: Layout = JSON.parse(strFromU8(decoded))
  if (layout.schema !== 1 || layout.unit !== 'nm' || !layout.layers || !layout.cell) throw new Error('Unsupported layout')
  return layout
}
