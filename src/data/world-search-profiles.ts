export const searchPilotWorldIds = ["solar-system","moon-voyage","mandelbrot-zoom","fluid-sim","black-hole-flyby"] as const
export type SearchPilotWorldId = (typeof searchPilotWorldIds)[number]
export type WorldSearchCopy = {
  title: string
  description: string
  answer: string
  queries: Array<string>
  teaches: Array<string>
}
export type WorldSearchProfile = { zh: WorldSearchCopy; en: WorldSearchCopy }
const profiles: Partial<Record<SearchPilotWorldId, WorldSearchProfile>> = {}
export function getWorldSearchProfile(worldId: string): WorldSearchProfile | undefined {
  return profiles[worldId as SearchPilotWorldId]
}
