import * as THREE from 'three'

export const EARTH_SKINS = [
  { id: 'satellite', label: '卫星影像' },
  { id: 'atlas', label: '蓝绿地图' },
  { id: 'ivory', label: '暖白地图' },
] as const
export type EarthSkin = typeof EARTH_SKINS[number]['id']

// Existing Natural Earth 1:110m silhouettes, public domain. This mask only
// distinguishes land and ocean; the palette does not encode terrain or climate.
export async function loadLandMask(signal: AbortSignal) {
  const response = await fetch('/assets/submarine-cables/land.json', { signal })
  if (!response.ok) throw new Error('Land outline unavailable')
  const { polygons } = await response.json() as { polygons: Array<Array<[number, number]>> }
  const canvas = document.createElement('canvas')
  canvas.width = 2048; canvas.height = 1024
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Land texture unavailable')
  context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  context.strokeStyle = '#fff'; context.lineWidth = 0.65
  for (const ring of polygons) {
    context.beginPath()
    ring.forEach(([lon, lat], i) => {
      const x = (lon + 180) / 360 * canvas.width
      const y = (90 - lat) / 180 * canvas.height
      if (i === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.closePath(); context.fill(); context.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}
