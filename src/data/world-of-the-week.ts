export type WeeklyPick = {
  worldId: string
  coverTitle: { zh: string; en: string }
}

export type WorldOfTheWeek = {
  picks: readonly [WeeklyPick, WeeklyPick, WeeklyPick]
  since: string
}

export const worldOfTheWeek: WorldOfTheWeek = {
  since: '2026-08-01',
  picks: [
    { worldId: 'moon-voyage', coverTitle: { zh: 'moon-voyage', en: 'moon-voyage' } },
    { worldId: 'black-hole-flyby', coverTitle: { zh: 'black-hole-flyby', en: 'black-hole-flyby' } },
    { worldId: 'formula-bloom', coverTitle: { zh: 'formula-bloom', en: 'formula-bloom' } },
  ],
}
