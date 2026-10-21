import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('new-site and v1 domain boundary', () => {
  it('never redirects shapeof.world paths into the v1 site', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf8')

    expect(rootRoute).not.toContain('legacySiteRedirectUrl')
    expect(rootRoute).not.toContain('v1.shapeof.world')
    expect(rootRoute).toContain('resolveLegacyEntryHref')
  })

  it('keeps the legacy site scoped to its explicit hostname', () => {
    const legacyWorker = readFileSync(
      resolve(root, 'infra/shapeofworld-v1/wrangler.jsonc'),
      'utf8',
    )

    expect(legacyWorker).toContain('"pattern": "v1.shapeof.world"')
  })
})
