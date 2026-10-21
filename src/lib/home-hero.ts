/**
 * The home hero shows one world's poster, changing once a day. Only worlds whose
 * poster is a clean full picture (no interface panels) are in the rotation.
 */
export const HERO_WORLD_IDS = [
  'black-hole-flyby',
  'starry-night',
  'aurora',
  'mandelbrot-zoom',
  'cafe-terrace',
  'ukulele',
  'flybody',
  'earth-and-nature',
  'ink-landscape',
  'fire-gravity',
  'solar-system',
  'moon-voyage',
  'galaxy-collision',
] as const

const DAY_MS = 86_400_000

/** Same answer on server and client for a given UTC day. */
export function heroWorldId(now = Date.now(), available?: ReadonlySet<string>): string {
  const pool = available ? HERO_WORLD_IDS.filter((id) => available.has(id)) : [...HERO_WORLD_IDS]
  const list = pool.length ? pool : [...HERO_WORLD_IDS]
  return list[Math.floor(now / DAY_MS) % list.length]
}

export function heroPoster(id: string): string {
  return `/assets/posters/${id}.webp`
}
