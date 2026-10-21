import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('BlackHoleFlyby mobile shell layout', () => {
  it('shows one tool category at a time and keeps the primary budget compact', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, 'BlackHoleFlyby.tsx'),
      'utf8',
    )

    expect(source).toContain('<FreebarTabs')
    expect(source).toContain("primaryControlBudget={scene.key === 'flyby' || scene.key === 'journey' ? 5 : 4}")
    expect(source).toContain('className="bh-flyby-scenes experience-freebar-seg"')
    expect(source).not.toContain('className="bh-flyby-scene-select"')
    expect(source).not.toContain("<strong>{tx('光学与飞行')}</strong>")
    expect(source).not.toContain("<strong>{tx('更多镜头')}</strong>")
  })

  it('uses the shell content boundary for the free-mode plaque', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, 'styles/BlackHoleFlyby.css'),
      'utf8',
    )
    expect(css).toContain(
      'top: var(--experience-safe-top, 78px)'
    )
    expect(css).not.toContain(
      'top: calc(130px + env(safe-area-inset-top, 0px))',
    )
  })
})
