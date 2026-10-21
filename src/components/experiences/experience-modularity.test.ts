import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const experienceDirectory = import.meta.dirname
const stylesDirectory = resolve(experienceDirectory, 'styles')
const worldsDirectory = resolve(experienceDirectory, 'worlds')
const appStyles = readFileSync(resolve(experienceDirectory, '../../styles/app.css'), 'utf8')
const sharedStyleOwners: Record<string, Array<string>> = {
  'ExperiencePanel.css': [],
  'Freebar.css': [],
  'GhostHint.css': ['GhostHint'],
  'GuideTour.css': ['GuideTour'],
  'OpenSourceAdapters.css': ['ExperienceRenderer.client'],
  'OrbitalExperiences.css': [],
}

describe('experience module boundaries', () => {
  it('keeps leftover shared styles owned by the shared shell', () => {
    const styleModules = readdirSync(stylesDirectory).filter((file) => file.endsWith('.css'))
    expect(styleModules.length).toBeGreaterThan(0)
    for (const styleModule of styleModules) {
      const styles = readFileSync(resolve(stylesDirectory, styleModule), 'utf8')
      const owners = sharedStyleOwners[styleModule] ?? []
      for (const component of owners) {
        const componentSource = readFileSync(resolve(experienceDirectory, `${component}.tsx`), 'utf8')
        expect(componentSource, `${styleModule}:${component}`).toContain(`styles/${styleModule}`)
      }
      expect(styles.trim().length, styleModule).toBeGreaterThan(100)
    }
  })

  it('keeps world-private styles inside the world directory', () => {
    const worldIds = readdirSync(worldsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(worldIds.length).toBeGreaterThan(0)
    for (const worldId of worldIds) {
      const stylesPath = resolve(worldsDirectory, worldId, 'styles')
      let styleFiles: string[] = []
      try {
        styleFiles = readdirSync(stylesPath).filter((name) => name.endsWith('.css'))
      } catch {
        styleFiles = []
      }
      for (const styleFile of styleFiles) {
        const source = readFileSync(resolve(stylesPath, styleFile), 'utf8')
        expect(source.trim().length, `${worldId}/${styleFile}`).toBeGreaterThan(20)
      }
    }
  })

  it('keeps the global stylesheet focused on shell and shared presentation', () => {
    expect(appStyles.split('\n').length).toBeLessThan(3_400)
    expect(appStyles).not.toContain('第三期 · doppler-effect')
    expect(appStyles).not.toContain('Seasons · 四季实验室')
    for (const privatePrefix of ['solar-system-', 'tides-', 'eclipses-', 'neural-', 'tree-life-']) {
      expect(appStyles, privatePrefix).not.toContain(`.${privatePrefix}`)
    }
  })
})
