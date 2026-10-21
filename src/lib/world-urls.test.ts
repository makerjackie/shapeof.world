// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { worldCatalog } from '../data/worlds/catalog'
import { collectRouteReservations } from '../../scripts/lib/route-reservations.mjs'
import { compileWorld } from '../../scripts/lib/compile-world.mjs'
import { worldPath, parseWorldPath } from './world-urls'
import { assertWorldRouteNames, isReservedWorldName, reservedRouteNames, mountedWorks } from './world-route-names'

describe('world URLs and route ownership', () => {
  it('builds both canonical languages and explicit compatibility probes', () => {
    expect(worldPath('rainbow')).toBe('/rainbow')
    expect(worldPath('rainbow', 'en')).toBe('/en/rainbow')
    expect(worldPath('rainbow', 'en', { legacy: true })).toBe('/en/explore/rainbow')
    expect(() => worldPath('../about')).toThrow('Invalid world id')
  })
  it.each(['/rainbow', '/en/rainbow', '/explore/rainbow', '/en/explore/rainbow?path=sky'])('parses current and historical path %s', path => {
    expect(parseWorldPath(path)?.worldId).toBe('rainbow')
  })
  it('does not interpret system pages or mounted namespaces as worlds', () => {
    for (const path of ['/about', '/en/privacy', '/api', '/explore/admin', '/rainbow/extra']) expect(parseWorldPath(path)).toBeUndefined()
    expect(isReservedWorldName('external-work', ['external-work'])).toBe(true)
    expect(isReservedWorldName('external-work-extra', ['external-work'])).toBe(true)
    expect(mountedWorks).toEqual([])
  })
  it('rejects reserved, mounted, duplicate, and prefix-shadowed world IDs in compilation', () => {
    expect(() => assertWorldRouteNames(worldCatalog.map(world => world.id))).not.toThrow()
    for (const id of ['about', 'en', 'zh', 't', 'w', 'assets', 'media', 'api', 'robots.txt']) {
      expect(reservedRouteNames.has(id), id).toBe(true)
      expect(() => assertWorldRouteNames([id])).toThrow()
    }
    expect(() => assertWorldRouteNames(['rainbow', 'rainbow'])).toThrow('Duplicate world id')
    expect(() => assertWorldRouteNames(['work'], { mountedNames: ['work'] })).toThrow('Reserved world id')
    expect(() => assertWorldRouteNames(['work-extra'], { mountedNames: ['work'] })).toThrow('Reserved world id')
    expect(() => assertWorldRouteNames([], { mountedNames: ['about'] })).toThrow('Conflicting mounted work')
    expect(() => assertWorldRouteNames([], { mountedNames: ['work', 'work'] })).toThrow('Conflicting mounted work')
    expect(() => compileWorld({ world: { id: 'about' } })).toThrow('Reserved world id')
  })
  it('discovers newly added route-tree entries and static roots without editing a name list', () => {
    const root = mkdtempSync(join(tmpdir(), 'world-reservations-'))
    try {
      for (const dir of ['src/routes', 'src/lib', 'public/new-static', 'project.inlang']) mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(join(root, 'src/routeTree.gen.ts'), "const tree = { fullPath: '/from-tree/child' }")
      writeFileSync(join(root, 'src/routes/new-page.tsx'), "createFileRoute('/new-page')({})")
      writeFileSync(join(root, 'project.inlang/settings.json'), JSON.stringify({ locales: ['zh', 'en'] }))
      writeFileSync(join(root, 'src/lib/legacy-entry-paths.ts'), "const legacyHomeEntryNames = ['old']; const legacyWorldEntryPrefix = 'w'; const legacyChineseEntryPrefix = 'zh'")
      const names = collectRouteReservations(root)
      expect(names.topLevelRoutes).toEqual(['from-tree', 'new-page'])
      expect(names.staticNames).toContain('new-static')
      expect(names.legacyEntryNames).toContain('old')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

})
