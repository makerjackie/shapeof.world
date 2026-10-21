import { useEffect, useMemo, useRef, useState } from 'react'
import { latLonToVec3, solarCoordsAt, vec3ToLatLon } from './earth-spin-orbit-model'
import type { Picked } from './earth-scene'

function globePoint(x: number, y: number, picked: Pick<Picked, 'lat' | 'lon'>) {
  const z2 = 1 - x * x - y * y
  if (z2 < 0) return null
  const lat = picked.lat * Math.PI / 180, lon = picked.lon * Math.PI / 180
  const z = Math.sqrt(z2)
  return {
    x: -Math.sin(lon) * x - Math.sin(lat) * Math.cos(lon) * y + Math.cos(lat) * Math.cos(lon) * z,
    y: Math.cos(lat) * y + Math.sin(lat) * z,
    z: -Math.cos(lon) * x + Math.sin(lat) * Math.sin(lon) * y - Math.cos(lat) * Math.sin(lon) * z,
  }
}
export function EarthNavigator({ epoch, picked, onFocus, label }: { epoch: number; picked: Picked; onFocus: (lat: number, lon: number) => void; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [texture, setTexture] = useState<ImageData | null>(null)
  const frameRef = useRef<ImageData | null>(null)
  useEffect(() => {
    let active = true
    const image = new Image()
    image.onload = () => {
      if (!active) return
      const surface = document.createElement('canvas')
      surface.width = 512; surface.height = 256
      const ctx = surface.getContext('2d')
      if (!ctx) return
      ctx.drawImage(image, 0, 0, 512, 256)
      setTexture(ctx.getImageData(0, 0, 512, 256))
    }
    image.src = '/assets/solar-system/earth-day.jpg'
    return () => { active = false }
  }, [])
  const surface = useMemo(() => {
    const normals = new Float64Array(128 * 128 * 3)
    const colors = new Uint8ClampedArray(128 * 128 * 3)
    const pixels: number[] = []
    const fallback = [25, 66, 100]
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const point = globePoint((x - 64) / 58, (64 - y) / 58, { lat: picked.lat, lon: picked.lon })
      if (!point) continue
      const ll = vec3ToLatLon(point.x, point.y, point.z)
      const sx = Math.min(511, Math.max(0, Math.floor((ll.lon + 180) / 360 * 512)))
      const sy = Math.min(255, Math.max(0, Math.floor((90 - ll.lat) / 180 * 256)))
      const pixel = y * 128 + x
      const index = (sy * 512 + sx) * 4
      normals[pixel * 3] = point.x; normals[pixel * 3 + 1] = point.y; normals[pixel * 3 + 2] = point.z
      for (let c = 0; c < 3; c++) colors[pixel * 3 + c] = texture?.data[index + c] ?? fallback[c]
      pixels.push(pixel)
    }
    return { normals, colors, pixels }
  }, [picked.lat, picked.lon, texture])
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const frame = frameRef.current ??= ctx.createImageData(128, 128)
    const solar = solarCoordsAt(epoch)
    const light = latLonToVec3(solar.subsolarLat, solar.subsolarLon)
    // Time changes the illumination, while the geographic projection stays fixed until selection changes.
    for (const pixel of surface.pixels) {
      const source = pixel * 3, target = pixel * 4
      const dot = surface.normals[source] * light.x + surface.normals[source + 1] * light.y + surface.normals[source + 2] * light.z
      const shade = 0.25 + 0.75 * Math.max(0, dot)
      for (let c = 0; c < 3; c++) frame.data[target + c] = surface.colors[source + c] * shade
      frame.data[target + 3] = 255
    }
    ctx.putImageData(frame, 0, 0)
    ctx.strokeStyle = '#82bbd766'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(64, 64, 58, 0, 2 * Math.PI); ctx.stroke()
    ctx.fillStyle = '#f4ce92'; ctx.beginPath(); ctx.arc(64, 64, 2.5, 0, 2 * Math.PI); ctx.fill()
  }, [epoch, surface])
  return <canvas ref={canvas} width={128} height={128} role="button" tabIndex={0} aria-label={label} onClick={(event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = globePoint((event.clientX - bounds.left - bounds.width / 2) / (bounds.width * 58 / 128), (bounds.height / 2 - event.clientY + bounds.top) / (bounds.height * 58 / 128), picked)
    if (point) { const ll = vec3ToLatLon(point.x, point.y, point.z); onFocus(ll.lat, ll.lon) }
  }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onFocus(picked.lat, picked.lon) } }} />
}
