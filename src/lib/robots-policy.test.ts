import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const robots = readFileSync(resolve(import.meta.dirname, '../../public/robots.txt'), 'utf8')

describe('robots policy', () => {
  it('allows search and AI answering while reserving training', () => {
    expect(robots).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference')
    expect(robots).toContain('Sitemap: https://shapeof.world/sitemap.xml')
    expect(robots).toMatch(/User-agent: GPTBot\s+Allow: \//)
    expect(robots).toMatch(/User-agent: ClaudeBot\s+Allow: \//)
    expect(robots).toMatch(/User-agent: CCBot\s+Allow: \//)
    expect(robots).not.toMatch(/User-agent: GPTBot\s+Disallow: \//)
  })
})
