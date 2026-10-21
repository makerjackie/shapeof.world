import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = import.meta.dirname
const worldsRoot = resolve(root, 'worlds')

function worldSource(pascal: string) {
  for (const entry of readdirSync(worldsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = resolve(worldsRoot, entry.name, `${pascal}.tsx`)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  throw new Error(`Missing world source ${pascal}.tsx`)
}

function worldCss(pascal: string) {
  for (const entry of readdirSync(worldsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = resolve(worldsRoot, entry.name, 'styles', `${pascal}.css`)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  throw new Error(`Missing world css ${pascal}.css`)
}

const migrations = [
  ['MandelbrotZoom', 'mb', 3],
] as const

describe('selective high-density Freebar migrations', () => {
  it('uses the shared disclosure with an audited primary count and HUD clearance', () => {
    for (const [world, , primaryCount] of migrations) {
      const source = worldSource(world)

      expect(source, world).toContain('<Freebar')
      expect(source, world).toContain('secondary={')
      expect(source, world).toContain(`primaryControlBudget={${primaryCount}}`)
      expect(source, world).toContain('data-freebar-clearance="true"')
    }
  })

  it('leaves positioning, safe-area and backdrop ownership to the shared shell', () => {
    for (const [world, prefix] of migrations) {
      const css = worldCss(world)
      const shell = css.match(new RegExp(`\\.${prefix}-freebar\\s*\\{([^}]*)\\}`))?.[1]

      if (shell) {
        expect(shell, world).not.toMatch(/\bposition\s*:/)
        expect(shell, world).not.toMatch(/\b(?:right|bottom|left|padding|background|pointer-events)\s*:/)
        expect(shell, world).not.toContain('safe-area-inset')
      } else {
        expect(css, world).not.toContain(`.${prefix}-freebar {`)
      }
    }
  })
})
