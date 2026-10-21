export const worldCompilePilots = ['rainbow', 'black-hole-flyby'] as const

export type WorldCompilePilotId = (typeof worldCompilePilots)[number]

export function isWorldCompilePilot(worldId: string): worldId is WorldCompilePilotId {
  return (worldCompilePilots as readonly string[]).includes(worldId)
}
