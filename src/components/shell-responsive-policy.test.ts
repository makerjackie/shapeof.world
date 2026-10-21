import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), 'utf8')

const appStyles = read('../styles/app.css')
const shellStyles = read('../styles/shell-overrides.css')
const freebarStyles = read('experiences/styles/Freebar.css')
const homeSource = read('HomeDiscovery.tsx')
const footerSource = read('SiteFooter.tsx')
const experienceShellSource = read('ExperienceShell.tsx')

/** Bodies of every `at` block (for example `@media (max-width: 720px)`), brace-matched. */
function atRuleBodies(css: string, at: string) {
  const bodies: Array<string> = []
  let from = css.indexOf(at)
  while (from !== -1) {
    const open = css.indexOf('{', from)
    let depth = 1
    let cursor = open + 1
    while (depth > 0 && cursor < css.length) {
      if (css[cursor] === '{') depth += 1
      else if (css[cursor] === '}') depth -= 1
      cursor += 1
    }
    bodies.push(css.slice(open + 1, cursor - 1))
    from = css.indexOf(at, cursor)
  }
  return bodies
}

const migratedFreebarStyles = [
  ['bf', read('experiences/worlds/boids-flocking/styles/BoidsFlocking.css')],
] as const

describe('responsive shell policy', () => {
  it('keeps the safe-area gutter clear of full-width freebar gradients', () => {
    expect(freebarStyles).toMatch(
      /\.experience-freebar\s*\{[^}]*background:\s*transparent;/s,
    )
    expect(freebarStyles).not.toMatch(
      /\.experience-freebar(?:\.[\w-]+)?\s*\{[^}]*background:\s*linear-gradient/s,
    )

    for (const [prefix, source] of migratedFreebarStyles) {
      const rootRule = new RegExp(`\\.${prefix}-freebar\\s*\\{[^}]*\\}`, 's')
      const match = source.match(rootRule)?.[0] ?? ''
      expect(match, `${prefix} freebar root`).not.toContain('linear-gradient')
      expect(match, `${prefix} freebar root`).not.toContain('safe-area-inset-bottom')
    }
  })

  it('lets the experience shell follow the dynamic mobile viewport', () => {
    for (const selector of [
      '.experience-page',
      '.experience-layout',
      '.experience-stage',
      '.experience-visual',
    ]) {
      const escaped = selector.replace('.', '\\.')
      expect(appStyles, selector).toMatch(
        new RegExp(`${escaped}[^{}]*\\{[^}]*min-height:\\s*100svh;[^}]*min-height:\\s*100dvh;`, 's'),
      )
    }
  })

  it('owns next-world presentation in shell overrides with a narrow-phone fallback', () => {
    expect(appStyles.match(/experience-next-link/g)).toHaveLength(1)
    expect(appStyles).toContain(
      ".experience-page[data-overlays-hidden='true'] .experience-discovery-nav",
    )
    expect(experienceShellSource).toContain('<DiceFive aria-hidden="true" weight="regular" />')
    expect(experienceShellSource).not.toContain('className="experience-header-icon experience-random-link"')
    // 随机探索只在「更多」里；桌面和手机都不占用顶栏。
    expect(shellStyles).not.toMatch(/\.experience-discovery-nav\s*\{[^}]*position:\s*absolute;/)
    expect(shellStyles).toContain(
      '.experience-page:has(.guide-tour) .experience-freebar',
    )
    expect(experienceShellSource).toContain('className="experience-more-action experience-more-random"')
    expect(shellStyles).not.toContain('@media (min-width: 721px) and (max-width: 820px)')
    expect(shellStyles).toMatch(/@media \(min-width: 721px\)[\s\S]*\.experience-discovery-nav\s*\{[^}]*position:\s*static;/)
    expect(shellStyles).toContain('.experience-next-link:focus-visible')
    expect(shellStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*data-panel-open='true'\] \.experience-discovery-nav\s*\{[^}]*display:\s*none;/,
    )
    // 超窄屏：悬浮卡退回短标题形态，不占满舞台
    expect(shellStyles).toContain('@media (max-width: 359px)')
    expect(shellStyles).toMatch(
      /@media \(max-width: 359px\)[\s\S]*\.experience-next-title-full\s*\{[^}]*display:\s*none;/,
    )
    expect(shellStyles).toMatch(
      /@media \(max-width: 359px\)[\s\S]*\.experience-next-link\s*\{[^}]*var\(--next-world-accent\)/,
    )
  })

  it('exposes the homepage language control in desktop and mobile headers', () => {
    expect(experienceShellSource).not.toContain('experience-more-locale')
    const header = experienceShellSource.split('<header className="experience-header"')[1].split('</header>')[0]
    expect(header.match(/<LocaleToggle compact \/>/g)).toHaveLength(2)
    expect(shellStyles).not.toContain('.experience-intro-locale')
  })

  it('keeps five world header controls and puts sources in the More panel', () => {
    const desktop = experienceShellSource.split('experience-header-actions experience-header-actions--desktop')[1].split('experience-cinema-toggle')[0]
    expect(desktop).toContain('<LocaleToggle compact />')
    expect(desktop).toContain('renderShareButton()')
    expect(experienceShellSource).toContain('experience-header-icon experience-share-button')
    expect(desktop).toContain('<SiteBgmToggle />')
    expect(desktop).toContain('experience-overlay-toggle')
    expect(desktop).toContain('experience-more-button')
    expect(desktop).not.toContain('experience-info-button')
    const more = experienceShellSource.split('className="experience-more-actions"')[1].split('experience-more-random')[0]
    expect(more.indexOf('openIntro')).toBeGreaterThan(-1)
    const icons = [...more.matchAll(/<(Info|ChatCircleDots|ShareNetwork|DiceFive)\b/g)].map((match) => match[1])
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('collapses secondary mobile utilities behind one safe-area-aware action sheet', () => {
    expect(experienceShellSource).toContain('<DotsThree aria-hidden="true" weight="bold" />')
    expect(experienceShellSource).toContain('experience-more-button')
    expect(experienceShellSource).toContain('experience-more-sheet')
    expect(experienceShellSource).not.toContain('experience-more-bgm')
    expect(experienceShellSource).not.toContain('experience-more-phone-only')
    expect(experienceShellSource).toContain('className="experience-header-icon experience-mobile-sound"')
    expect(shellStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.experience-header-actions > \.experience-more-button\s*\{[^}]*display:\s*inline-flex;/,
    )
    for (const selector of [
      '.site-bgm-toggle',
      '.experience-overlay-toggle',
    ]) {
      expect(shellStyles, selector).toContain(`.experience-header-actions > ${selector}`)
    }
    expect(shellStyles).toContain('env(safe-area-inset-bottom, 0px)')
    expect(shellStyles).toContain('env(safe-area-inset-left, 0px)')
    expect(shellStyles).toContain('env(safe-area-inset-right, 0px)')
    expect(appStyles).toContain("top: max(14px, calc(env(safe-area-inset-top, 0px) + 8px));")
  })

  it('shares one phone toolbar between next-world navigation and the primary utilities', () => {
    const toolbar = experienceShellSource
      .split('className="experience-mobile-toolbar"')[1]
      .split('</header>')[0]
    expect(toolbar).toContain("renderNextLink('toolbar')")
    expect(toolbar).toContain('experience-header-icon experience-mobile-sound')
    expect(toolbar).toContain("renderShareButton(' experience-mobile-share')")
    expect(toolbar).toContain("renderMoreButton(compactMoreButtonRef, 'experience-mobile-more-button')")
    expect(experienceShellSource).not.toContain('experience-mobile-fullscreen')
    expect(experienceShellSource).toContain("'--next-world-accent': nextWorld.accent")
    // the more button controls the same sheet that the desktop button opens
    expect(experienceShellSource).toContain('id={`experience-more-${world.id}`}')

    const phone = atRuleBodies(shellStyles, '@media (max-width: 720px)').join('\n')
    expect(phone).toMatch(/\.experience-mobile-toolbar\s*\{[^}]*display:\s*flex/)
    expect(phone).toMatch(
      /:is\(\.experience-header-actions--desktop, \.experience-discovery-nav\)\s*\{[^}]*display:\s*none/,
    )
    // the capsule takes its tint from the next world's accent colour
    expect(phone).toMatch(/\.experience-mobile-next-link\s*\{[^}]*color-mix\(in srgb, var\(--next-world-accent\)/)
  })

  it('keeps AI model browsing and the retired record pages out of the site', () => {
    expect(homeSource).not.toContain('home-model-browser')
    expect(homeSource).not.toContain('aiModelIds')
    for (const retired of ['/story', '/atlas', '/made-with', '/bookshelf']) {
      expect(footerSource).not.toContain(`to="${retired}"`)
    }
  })

  it('keeps retired world CSS out of the global stylesheet', () => {
    for (const retiredSelector of [
      '.apollo-',
      '.epic-',
      '.treemap-',
      '.ocean-',
      '.home-model-browser',
      '.home-model-link',
      '.home-model-records',
    ]) {
      expect(appStyles, retiredSelector).not.toContain(retiredSelector)
    }
  })

  it('uses one shared mobile chip scroller without dropping active-state accessibility', () => {
    expect(homeSource).toContain('className="home-filter chip-scroller"')
    expect(homeSource).toContain('aria-pressed={activeCategory ===')
    expect(homeSource).toContain("querySelector<HTMLElement>('button.is-active')")
    expect(homeSource).toContain("getPropertyValue('--chip-scroller-fade')")

    expect(shellStyles).toMatch(/\.chip-scroller\s*\{[^}]*flex-wrap:\s*nowrap;/s)
    expect(shellStyles).toContain('scroll-snap-type: x proximity')
    expect(shellStyles).toContain('scrollbar-width: none')
    expect(shellStyles).toContain('.chip-scroller::-webkit-scrollbar')
    expect(shellStyles).toContain('--chip-scroller-bleed')
    expect(shellStyles).toContain('--chip-scroller-fade')
    expect(shellStyles).toContain('mask-image: linear-gradient')
  })
})
