import { isReservedWorldName } from './world-route-names.ts'

/** The only world URL builder. Router links use the same route template. */
export const worldRoute = '/$worldId' as const
export type WorldUrlLocale = 'zh' | 'en'
const worldIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function worldPath(worldId: string, locale: WorldUrlLocale = 'zh', options: { legacy?: boolean } = {}): string {
  if (!worldIdPattern.test(worldId)) throw new Error(`Invalid world id: ${worldId}`)
  return `${locale === 'en' ? '/en' : ''}${options.legacy ? '/explore' : ''}/${worldId}`
}

/** Also parses historical URLs, including worlds since withdrawn from discovery. */
export function parseWorldPath(path: string): { worldId: string; locale: WorldUrlLocale; legacy: boolean } | undefined {
  const pathname = path.split(/[?#]/, 1)[0]
  const match = /^\/(en\/)?(explore\/)?([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)
  if (!match || match[3].length > 80 || isReservedWorldName(match[3])) return undefined
  return { worldId: match[3], locale: match[1] ? 'en' : 'zh', legacy: Boolean(match[2]) }
}
