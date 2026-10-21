// The three painting worlds share a small WebGL renderer, without a scene engine.
// Keep geometry intact; bound pixel work and skip batches outside the camera.
export class PaintingVertices {
  constructor() { this.length = 0; this.chunks = []; this.chunkSize = 65536 }
  push(...values) {
    for (const value of values) {
      const offset = this.length % this.chunkSize
      if (offset === 0) this.chunks.push(new Float32Array(this.chunkSize))
      this.chunks[this.chunks.length - 1][offset] = value
      this.length++
    }
  }
  toArray() {
    const result = new Float32Array(this.length)
    this.chunks.forEach((chunk, i) => result.set(chunk.subarray(0, Math.min(chunk.length, this.length - i * this.chunkSize)), i * this.chunkSize))
    this.chunks = []
    return result
  }
}

export function createPaintingBuildYield(schedule) {
  let start = performance.now()
  return () => {
    if (performance.now() - start < 12) return
    return new Promise(resolve => schedule(() => { start = performance.now(); resolve() }, 0))
  }
}

export function paintingRenderSize(width, height, dpr, quality = 1, adaptive = 1) {
  width = Math.max(1, width); height = Math.max(1, height)
  const ratio = Math.min(dpr || 1, width < 600 ? 1 : 1.5) * quality * adaptive
  const pixelLimit = (width < 600 ? 450000 : 1500000) * quality * quality
  const scale = Math.min(ratio, Math.sqrt(pixelLimit / (width * height)))
  return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))]
}

export function createPaintingQuality() {
  let scale = 1, manual = false, start = 0, frames = 0, warmup = 0
  return {
    get scale() { return scale },
    reset() { start = 0; frames = 0; warmup = 0 },
    manual() { manual = true; scale = 1; this.reset() },
    sample(time) {
      if (manual || scale <= .65) return false
      if (!warmup) { warmup = time; return false }
      if (time - warmup < 2000) return false
      if (!start) { start = time; frames = 0; return false }
      frames++
      if (frames < 8 || time - start < 1200) return false
      const slow = (time - start) / frames > 40
      start = time; frames = 0
      if (!slow) return false
      scale = Math.max(.65, scale * .85)
      return true
    },
  }
}

// Preserve triangle order (including gl_VertexID % 3 used by wireframe mode).
// Adjacent visible ranges are merged back into one draw call.
export function paintingDrawRanges(vertices, stride, nodeOffset) {
  const ranges = [], block = stride * 3 * 2048
  for (let first = 0; first < vertices.length; first += block) {
    const end = Math.min(vertices.length, first + block), nodes = new Map()
    for (let i = first; i < end; i += stride) {
      const id = nodeOffset === undefined ? 0 : vertices[i + nodeOffset]
      let bounds = nodes.get(id)
      if (!bounds) { bounds = { id, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; nodes.set(id, bounds) }
      for (let axis = 0; axis < 3; axis++) {
        bounds.min[axis] = Math.min(bounds.min[axis], vertices[i + axis])
        bounds.max[axis] = Math.max(bounds.max[axis], vertices[i + axis])
      }
    }
    ranges.push({ first: first / stride, count: (end - first) / stride, nodes: [...nodes.values()], min: [0,0,0], max: [0,0,0] })
  }
  updatePaintingBounds(ranges)
  return ranges
}

export function updatePaintingBounds(ranges, poses, padding = 1.5) {
  for (const range of ranges) {
    range.min.fill(Infinity); range.max.fill(-Infinity)
    for (const bounds of range.nodes) {
      const pose = poses?.[bounds.id]?.world
      for (let axis = 0; axis < 3; axis++) {
        let low = pose ? pose[12 + axis] : 0, high = low
        for (let local = 0; local < 3; local++) {
          const coefficient = pose ? pose[local * 4 + axis] : +(local === axis)
          low += coefficient * (coefficient >= 0 ? bounds.min[local] : bounds.max[local])
          high += coefficient * (coefficient >= 0 ? bounds.max[local] : bounds.min[local])
        }
        range.min[axis] = Math.min(range.min[axis], low - padding)
        range.max[axis] = Math.max(range.max[axis], high + padding)
      }
    }
  }
}

export function drawPaintingRanges(gl, batch, vp) {
  const planes = []
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    planes.push([vp[3]+sign*vp[axis], vp[7]+sign*vp[4+axis], vp[11]+sign*vp[8+axis], vp[15]+sign*vp[12+axis]])
  }
  let first = -1, count = 0, calls = 0
  const flush = () => { if (count) { gl.drawArrays(gl.TRIANGLES, first, count); calls++ } first = -1; count = 0 }
  for (const range of batch.ranges) {
    const visible = planes.every(p => p[0]*(p[0]>=0?range.max[0]:range.min[0]) + p[1]*(p[1]>=0?range.max[1]:range.min[1]) + p[2]*(p[2]>=0?range.max[2]:range.min[2]) + p[3] >= 0)
    if (!visible) { flush(); continue }
    if (first < 0) first = range.first
    count += range.count
  }
  flush()
  return calls
}
