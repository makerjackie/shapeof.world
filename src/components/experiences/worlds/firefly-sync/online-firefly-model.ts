export type OnlineFirefly = {
  x: number
  y: number
  angle: number
  speed: number
  swerve: number
  clock: number
  flash: number
  depth: number
  hue: number
  chaos: number
  wing: number
}

export type OnlineParams = { sync: boolean; pull: number; radius: number; clockSpeed: number }

export const ONLINE_FLY_LOOP = 40
export const ONLINE_FLY_SWERVE = 0.1
export const ONLINE_MOUSE_RADIUS = 160
export const ONLINE_FLASH_DECAY = 0.9

export function onlineSeeded(index: number) {
  const value = Math.sin(index * 92.317 + 18.731) * 43_758.5453
  return value - Math.floor(value)
}

export function onlineFlyCount(width: number, height: number) {
  const count = Math.round((Math.max(1, width * height) * 120) / (1280 * 600))
  return Math.min(180, Math.max(80, count))
}

export function canopyFlyCount(width: number, height: number) {
  return Math.min(240, Math.round(onlineFlyCount(width, height) * 1.5))
}

export function makeOnlineFireflies(count: number, width: number, height: number): OnlineFirefly[] {
  return Array.from({ length: count }, (_, index) => ({
    x: onlineSeeded(index + 1) * width,
    y: (0.08 + onlineSeeded(index + 2_001) * 0.84) * height,
    angle: onlineSeeded(index + 3_001) * Math.PI * 2,
    speed: 0.45 + onlineSeeded(index + 4_001) * 1.05,
    swerve: (onlineSeeded(index + 5_001) - 0.5) * ONLINE_FLY_SWERVE,
    clock: onlineSeeded(index + 6_001),
    flash: 0,
    depth: 0.35 + onlineSeeded(index + 7_001) * 0.65,
    hue: onlineSeeded(index + 8_001),
    chaos: 0,
    wing: index % 2,
  }))
}

export function onlineStoryParams(beat: number, params: OnlineParams) {
  if (beat <= 1) return { ...params, sync: false, pullBoost: 1 }
  if (beat === 2) return { ...params, sync: true, pull: Math.max(params.pull, 0.06), radius: Math.max(params.radius, 180), pullBoost: 1.2 }
  if (beat === 3) return { ...params, sync: true, pull: Math.max(params.pull, 0.07), radius: Math.max(params.radius, 220), pullBoost: 1.4 }
  if (beat === 4) return { ...params, sync: true, pull: Math.max(params.pull, 0.09), radius: Math.max(params.radius, 260), pullBoost: 1.6 }
  return { ...params, pullBoost: 1 }
}

export function stepOnlineFireflies(
  flies: OnlineFirefly[],
  params: OnlineParams & { pullBoost: number },
  width: number,
  height: number,
  dt: number,
  pointer: { down: boolean; x: number; y: number },
  reducedMotion: boolean,
  random = Math.random,
) {
  const frameDelta = dt * 60
  const radius2 = params.radius * params.radius
  const mouseRadius2 = ONLINE_MOUSE_RADIUS * ONLINE_MOUSE_RADIUS
  const flashDecay = Math.pow(ONLINE_FLASH_DECAY, frameDelta)
  let sumCos = 0; let sumSin = 0
  flies.forEach((fly, index) => {
    if (!reducedMotion) {
      fly.x += fly.speed * frameDelta * Math.cos(fly.angle)
      fly.y += fly.speed * frameDelta * Math.sin(fly.angle)
      if (fly.x < -ONLINE_FLY_LOOP) fly.x = width + ONLINE_FLY_LOOP
      if (fly.x > width + ONLINE_FLY_LOOP) fly.x = -ONLINE_FLY_LOOP
      if (fly.y < -ONLINE_FLY_LOOP) fly.y = height + ONLINE_FLY_LOOP
      if (fly.y > height + ONLINE_FLY_LOOP) fly.y = -ONLINE_FLY_LOOP
      fly.angle += fly.swerve
      if (random() < 0.05) fly.swerve = (random() - 0.5) * ONLINE_FLY_SWERVE
    }
    fly.flash *= flashDecay
    fly.clock += dt * params.clockSpeed
    if (pointer.down) fly.chaos = 1
    const dx = fly.x - pointer.x; const dy = fly.y - pointer.y
    if (fly.chaos > 0.01 && dx * dx + dy * dy < mouseRadius2) fly.clock += random() * 0.15
    fly.chaos *= Math.pow(0.8, frameDelta)
    if (fly.clock > 1) {
      fly.flash = 1; fly.clock = 0
      if (params.sync) {
        flies.forEach((other, otherIndex) => {
          if (otherIndex === index) return
          const nx = fly.x - other.x; const ny = fly.y - other.y
          if (nx * nx + ny * ny <= radius2) other.clock = Math.min(1, other.clock + other.clock * params.pull * params.pullBoost)
        })
      }
    }
    const phase = fly.clock * Math.PI * 2
    sumCos += Math.cos(phase); sumSin += Math.sin(phase)
  })
  return Math.hypot(sumCos, sumSin) / Math.max(1, flies.length)
}
