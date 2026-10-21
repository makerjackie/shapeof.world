import type { AtomPose } from './atom-geometry'
import type { ProbabilityCloud } from './quantum-model'

export type CloudCut = 'full' | 'half' | 'slice'

/** A fixed Monte Carlo sample of density. Only the camera or cut moves. */
export function paintProbabilityCloud(canvas: HTMLCanvasElement, cloud: ProbabilityCloud, pose: AtomPose, cut: CloudCut, offset: number) {
 const bounds = canvas.getBoundingClientRect(), width = bounds.width, height = bounds.height
 if (!width || !height) return
 const ratio = Math.min(window.devicePixelRatio || 1, 2)
 if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
 }
 const ctx = canvas.getContext('2d')
 if (!ctx) return
 ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height)
 const extent = Math.min(width, height) * .40 * pose.scale, scale = extent / cloud.radius
 const rx = pose.x * Math.PI / 180, ry = pose.y * Math.PI / 180
 const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry)
 const project = (x: number, y: number, z: number) => {
  const xx = x * cy + z * sy, zz = -x * sy + z * cy
  return [width / 2 + xx * scale, height / 2 + (y * cx - zz * sx) * scale]
 }
 ctx.strokeStyle = '#71876b30'; ctx.lineWidth = .7; ctx.font = '10px Georgia, serif'; ctx.fillStyle = '#72846e'
 for (let axis = 0; axis < 3; axis++) {
  const end = [0, 0, 0]; end[axis] = cloud.radius * 1.12
  const [x, y] = project(end[0], end[1], end[2])
  ctx.beginPath(); ctx.moveTo(width / 2, height / 2); ctx.lineTo(x, y); ctx.stroke()
  ctx.fillText('xyz'[axis], x + 5, y + 3)
 }
 const plane = offset * cloud.radius, dot = Math.max(.9, Math.min(1.45, Math.min(width, height) / 430))
 ctx.fillStyle = cut === 'slice' ? 'rgba(39,86,51,.65)' : 'rgba(39,86,51,.32)'
 const positions = cloud.positions
 for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i], y = positions[i + 1], z = positions[i + 2]
  if (cut === 'half' && x > plane || cut === 'slice' && Math.abs(x - plane) > cloud.radius * .055) continue
  const [px, py] = project(x, y, z)
  ctx.fillRect(px - dot / 2, py - dot / 2, dot, dot)
 }
 if (cut !== 'full') {
  ctx.strokeStyle = '#a28d5770'; ctx.setLineDash([3, 5]); ctx.beginPath()
  const size = cloud.radius * .85
  for (const [index, [y, z]] of [[-size, -size], [size, -size], [size, size], [-size, size]].entries()) {
   const [px, py] = project(plane, y, z)
   if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath(); ctx.stroke(); ctx.setLineDash([])
 }
 // Location marker only: a nucleus would be invisible at the electron scale.
 ctx.fillStyle = '#aa8548'; ctx.beginPath(); ctx.arc(width / 2, height / 2, 2, 0, Math.PI * 2); ctx.fill()
}
