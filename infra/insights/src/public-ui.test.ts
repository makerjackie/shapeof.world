import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const publicFile = (name: string) => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8')

describe('Insights metric help UI', () => {
  it('provides one accessible popover for static and rendered metric help buttons', async () => {
    const [html, script] = await Promise.all([
      publicFile('index.html'),
      publicFile('app.js'),
    ])

    expect(html).toContain('id="metric-popover"')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('data-metric-definition="referrer"')
    expect(html).toContain('data-metric-definition="deepPlay"')
    expect(script).toContain('aria-describedby="metric-popover"')
    expect(script).toContain("document.addEventListener('pointerover'")
    expect(script).toContain("document.addEventListener('focusin'")
    expect(script).toContain("event.key === 'Escape'")
  })

  it('attaches explanations to the main dashboard metric groups', async () => {
    const script = await publicFile('app.js')
    const requiredDefinitions = [
      'activeDay',
      'pageview',
      'visitor',
      'pageSession',
      'deepPlay',
      'secondWorld',
      'returningPlayer',
      'worldEntry',
      'retention30',
      'interaction',
      'visitsPerPlayer',
      'loadTimeout',
      'experienceError',
      'saveRate',
      'shareRate',
    ]

    for (const definition of requiredDefinitions) {
      expect(script).toContain(`definition: '${definition}'`)
    }
  })
})
