import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(import.meta.dirname, 'BrandMark.tsx'), 'utf8')
const brandDir = resolve(import.meta.dirname, '../../public/assets/brand')

describe('BrandMark', () => {
  it('uses the small WebP header mark instead of the 1024 master PNG', () => {
    expect(source).toContain('/assets/brand/app-icon-56.webp')
    expect(source).toContain('/assets/brand/app-icon-112.webp')
    expect(source).not.toContain('/assets/brand/app-icon.png')
    expect(source).toContain('fetchPriority="low"')
    expect(statSync(resolve(brandDir, 'app-icon-56.webp')).size).toBeLessThan(4_000)
    expect(statSync(resolve(brandDir, 'app-icon-112.webp')).size).toBeLessThan(4_000)
    expect(statSync(resolve(brandDir, 'app-icon.png')).size).toBeGreaterThan(100_000)
  })
})
