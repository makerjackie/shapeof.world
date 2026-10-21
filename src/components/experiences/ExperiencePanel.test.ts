import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = import.meta.dirname
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

function exactRule(source: string, selector: string) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').some((part) => part.trim() === selector))
    .map((match) => match[2])
    .join('\n')
}

describe('ExperiencePanel material seam', () => {
  const app = read('../../styles/app.css')
  const panel = read('./styles/ExperiencePanel.css')
  const freebar = read('./styles/Freebar.css')
  const guide = read('./styles/GuideTour.css')
  const solar = read('./worlds/solar-system/styles/SolarSystem.css')
  const blackHoleFlyby = read('./worlds/black-hole-flyby/styles/BlackHoleFlyby.css')

  it('loads one shared material module before the Freebar layout module', () => {
    expect(app).toContain("@import '../components/experiences/styles/ExperiencePanel.css';")
    expect(app.indexOf('ExperiencePanel.css')).toBeLessThan(app.indexOf('Freebar.css'))
    expect(panel).toMatch(/\.guide-card,\s*\.experience-freebar-main\s*\{/)
  })

  it('uses one token family for both story and free modes', () => {
    for (const token of [
      '--experience-panel-surface',
      '--experience-panel-border',
      '--experience-panel-shadow',
      '--experience-panel-blur',
      '--experience-panel-saturation',
      '--experience-panel-radius',
    ]) {
      expect(panel, token).toContain(token)
    }
    expect(panel).toContain('rgba(6, 10, 17, 0.32)')
  })

  it('keeps material declarations out of the two layout modules', () => {
    const forbidden = /(?:^|;)\s*(?:background|backdrop-filter|-webkit-backdrop-filter|border-color|box-shadow)\s*:/
    expect(exactRule(freebar, '.experience-freebar-main')).not.toMatch(forbidden)
    expect(exactRule(guide, '.guide-card')).not.toMatch(forbidden)
    expect(exactRule(guide, '.guide-card.is-corner')).not.toMatch(forbidden)
    expect(exactRule(guide, '.guide-card.is-cinema')).not.toMatch(forbidden)
  })

  it('themes each pilot once at the world root', () => {
    for (const source of [solar, blackHoleFlyby]) {
      expect(source).toContain('--experience-panel-surface:')
      expect(source).toContain('--experience-panel-border:')
      expect(source).toContain('--experience-panel-shadow:')
      expect(source).not.toMatch(/\.guide-tour\s+\.guide-card\s*\{/)
    }
  })

  it('keeps legacy high-opacity panel skins off the shared shell', () => {
    for (const source of [solar, blackHoleFlyby]) {
      expect(source).toContain('--experience-panel-surface:')
      expect(source).not.toContain('--freebar-surface:')
      expect(source).toContain('--experience-panel-border:')
      expect(source).toContain('--experience-panel-shadow:')
    }
  })

  it('hides Freebar while GuideTour is on stage', () => {
    expect(freebar).toContain(':has(.guide-tour) .experience-freebar')
  })

  it('gives shared horizontal rails a horizontal touch gesture', () => {
    expect(freebar).toMatch(/\.experience-freebar-rail\s*\{[^}]*touch-action:\s*pan-x;/s)
    expect(freebar).toMatch(/\[class\*='freebar'\] \[class\*='presets'\][\s\S]*?touch-action:\s*pan-x;/s)
    expect(freebar).toMatch(/\.experience-freebar-primary > \.experience-freebar-seg\s*\{[^}]*touch-action:\s*pan-x;/s)
  })
})
