import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(import.meta.dirname, 'experience-client-url.ts'), 'utf8')

describe('experience client URL', () => {
  it('does not import the client renderer into the SSR worker', () => {
    expect(source).not.toMatch(/ExperienceRenderer\.client\?url/)
    expect(source).toContain("import.meta.env.DEV")
  })
})
