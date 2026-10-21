export type Camera = { cx: number; cy: number; zoom: number }
export type Point = { x: number; y: number }
// Conservative display limit, not a claim of arbitrarily precise arithmetic.
export const MAX_ZOOM = 1e6
export const MIN_ZOOM = 0.7
export const OVERVIEW: Camera = { cx: -0.6, cy: 0, zoom: 0.85 }
export const LANDMARKS = [
  { label: '海马谷', cx: -0.743643887037151, cy: 0.13182590420533, zoom: 180, endZoom: 18000 },
  { label: '双螺旋', cx: -0.743643887037151, cy: 0.13182590420533, zoom: 12000, endZoom: 180000 },
  { label: '迷你曼德博', cx: -1.754877666, cy: 0, zoom: 70, endZoom: 140 },
] as const
export const INITIAL_CAMERA: Camera = { ...LANDMARKS[0] }
export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
export function readCamera(search: string): Camera | null {
  const q = new URLSearchParams(search)
  if (['cx', 'cy', 'zoom'].some((key) => !q.has(key) || !q.get(key)?.trim())) return null
  const cx = Number(q.get('cx')), cy = Number(q.get('cy')), zoom = Number(q.get('zoom'))
  if (![cx, cy, zoom].every(Number.isFinite) || Math.abs(cx) > 4 || Math.abs(cy) > 4 || zoom <= 0) return null
  return { cx, cy, zoom: clampZoom(zoom) }
}
export function zoomAt(camera: Camera, factor: number, point: Point, width: number, height: number): Camera {
  const zoom = clampZoom(camera.zoom * factor)
  const scale = 3 / camera.zoom / Math.max(1, Math.min(width, height))
  const ratio = 1 - camera.zoom / zoom
  return { cx: camera.cx + (point.x - width / 2) * scale * ratio,
    cy: camera.cy - (point.y - height / 2) * scale * ratio, zoom }
}
export function pan(camera: Camera, dx: number, dy: number, width: number, height: number): Camera {
  const scale = 3 / camera.zoom / Math.max(1, Math.min(width, height))
  return { ...camera, cx: camera.cx - dx * scale, cy: camera.cy + dy * scale }
}
export function interpolateCamera(from: Camera, to: Camera, progress: number): Camera {
  const t = Math.max(0, Math.min(1, progress))
  const eased = t * t * (3 - 2 * t)
  // Pull back before moving between distant areas; preserve continuity.
  const distance = Math.hypot(to.cx - from.cx, to.cy - from.cy)
  const bridge = Math.min(from.zoom, to.zoom, distance > 0 ? 1.5 / distance : Infinity)
  const logZoom = t < 0.5
    ? Math.log(from.zoom) + (Math.log(bridge) - Math.log(from.zoom)) * Math.sin(t * Math.PI)
    : Math.log(bridge) + (Math.log(to.zoom) - Math.log(bridge)) * (1 - Math.cos((t - 0.5) * Math.PI))
  return { cx: from.cx + (to.cx - from.cx) * eased, cy: from.cy + (to.cy - from.cy) * eased, zoom: Math.exp(logZoom) }
}
export function escapeIterations(cx: number, cy: number, max = 1600): number {
  let x = 0, y = 0
  for (let i = 0; i < max; i++) {
    const next = x * x - y * y + cx
    y = 2 * x * y + cy
    x = next
    if (x * x + y * y > 4) return i + 1
  }
  return max
}
