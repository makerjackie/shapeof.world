export const HERO_WORLD_IDS = ['black-hole-flyby', 'earth-and-nature', 'flybody', 'periodic-table'] as const

export function heroPoster(id: string): string {
  return `/assets/posters/${id}.webp`
}
