import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import { allCategories, paths } from '~/data/content-graph'
import { isWorldDiscoverable } from '~/data/world-state'
import { worldCatalog } from '~/data/worlds/catalog'

const sitemap = execFileSync(process.execPath, ['scripts/generate-sitemap.mjs', '--stdout'], {
  cwd: process.cwd(),
  encoding: 'utf8',
})
const document = new DOMParser().parseFromString(sitemap, 'application/xml')
const records = [...document.getElementsByTagName('url')]
const locations = records.map((record) => record.getElementsByTagName('loc')[0].textContent)

describe('generated sitemap', () => {
  it('publishes valid XML with unique canonical URLs and reciprocal language alternates', () => {
    expect(document.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(new Set(locations).size).toBe(locations.length)
    expect(locations.length).toBeGreaterThan(0)
    for (const record of records) {
      const loc = record.getElementsByTagName('loc')[0].textContent!
      const pathname = new URL(loc).pathname
      const basePath = pathname === '/en' ? '/' : pathname.replace(/^\/en\//, '/')
      const englishPath = basePath === '/' ? '/en' : `/en${basePath}`
      const links = [...record.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')]
      expect(links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])).toEqual([
        ['zh-Hans', `https://shapeof.world${basePath}`],
        ['en', `https://shapeof.world${englishPath}`],
        ['x-default', `https://shapeof.world${basePath}`],
      ])
      for (const link of links) expect(locations).toContain(link.getAttribute('href'))
      expect(loc).not.toContain('?')
    }
  })

  it('includes both languages for the routes index and every public category', () => {
    expect(locations).toContain('https://shapeof.world/routes')
    expect(locations).toContain('https://shapeof.world/en/routes')
    for (const route of paths) {
      for (const prefix of ['', '/en']) {
        expect(locations).toContain(`https://shapeof.world${prefix}/routes/${route.slug}`)
      }
    }
    for (const category of allCategories) {
      for (const prefix of ['', '/en']) {
        expect(locations.includes(`https://shapeof.world${prefix}/category/${category.id}`))
          .toBe(category.publication === 'public')
      }
    }
  })

  it('includes exactly the discoverable worlds, excluding every other lifecycle state', () => {
    for (const world of worldCatalog) {
      for (const prefix of ['', '/en']) {
        expect(locations.includes(`https://shapeof.world${prefix}/${world.id}`))
          .toBe(isWorldDiscoverable(world))
      }
    }
  })

  it('does not list the retired atlas, story, bookshelf and model pages', () => {
    for (const path of ['/atlas', '/story', '/bookshelf', '/made-with']) {
      for (const prefix of ['', '/en']) {
        expect(locations.some((location) => location.startsWith(`https://shapeof.world${prefix}${path}`))).toBe(false)
      }
    }
  })

  it('does not substitute poster capture dates for page modification dates', () => {
    expect(document.getElementsByTagName('lastmod')).toHaveLength(0)
  })
})
