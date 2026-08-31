/**
 * WebGL 能力探测。
 *
 * 为什么需要：3D 世界在没有 WebGL 的浏览器里不会报错，它只是永远不画第一帧——
 * 用户看到的是一块停在「正在载入」的屏幕，没有任何出口。而这恰恰是中文流量
 * 的落地环境：微信内置浏览器、低端安卓、旧 iPhone、被驱动黑名单降级的 GPU。
 *
 * 探测本身要便宜且只做一次：创建一个 1×1 的 canvas 拿 context，随后立即释放。
 */

export type WebglSupport = 'unknown' | 'available' | 'unavailable'

let cached: WebglSupport = 'unknown'

export function detectWebglSupport(): WebglSupport {
  if (cached !== 'unknown') return cached
  if (typeof document === 'undefined') return 'unknown'

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = (
      canvas.getContext('webgl2')
      ?? canvas.getContext('webgl')
      ?? canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null

    if (!context) {
      cached = 'unavailable'
      return cached
    }

    // 拿到 context 不等于能用：部分环境返回一个立刻 lose 的上下文。
    cached = typeof context.getParameter === 'function' && !context.isContextLost()
      ? 'available'
      : 'unavailable'

    context.getExtension('WEBGL_lose_context')?.loseContext()
    return cached
  } catch {
    cached = 'unavailable'
    return cached
  }
}

/** 这些 runtime 没有 WebGL 就画不出任何东西；2D 的用 Canvas2D，不受影响。 */
const webglRuntimes = new Set(['scene-3d', 'globe-3d', 'molecule-3d', 'volume-3d'])

export function runtimeNeedsWebgl(runtime: string): boolean {
  return webglRuntimes.has(runtime)
}

/** 仅供测试重置缓存。 */
export function resetWebglSupportCache(): void {
  cached = 'unknown'
}
