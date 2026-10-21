import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the "share the exact thing I made" path.
 *
 * This is the mechanism the growth plan depends on, and every part of it is
 * easy to break without noticing: a world can publish state it never reads
 * back, the router can start dropping the parameter, or the button can drift
 * back into the info drawer where nobody finds it. None of those show up as a
 * failing render — the link just quietly stops carrying anything.
 */
const experienceDir = resolve(import.meta.dirname, 'experiences')
const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), 'utf8')

const shellSource = read('ExperienceShell.tsx')
const routeSource = readFileSync(resolve(import.meta.dirname, '../routes/$worldId.tsx'), 'utf8')
const cardSource = read('MomentCard.tsx')

function collectTsx(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectTsx(path)
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : []
  })
}

const experienceFiles = collectTsx(experienceDir)
const publishing = experienceFiles.filter((path) =>
  readFileSync(path, 'utf8').includes('useShareableState({'),
)

describe('share contract', () => {
  // The checks below run over every world that publishes share state. No world
  // publishes one right now (wind-tunnel was the last), so they pass trivially
  // until the next world calls `useShareableState`.

  it('reads back everything it publishes', () => {
    // A world that publishes state but never reads `incoming` produces links
    // that look right and restore nothing.
    for (const path of publishing) {
      const source = readFileSync(path, 'utf8')
      expect(source, `${path}: publishes state but never restores it`).toContain('useIncomingShareState')
    }
  })

  it('never trusts a value straight out of a stranger URL', () => {
    for (const path of publishing) {
      const source = readFileSync(path, 'utf8')
      // Every read of `incoming` must go through a validating reader, not a
      // bare property access that would let a link set anything it likes.
      const bare = source.match(/incoming\s*\[|incoming\.\w+/g)
      expect(bare, `${path}: reads incoming state without validation`).toBeNull()
      expect(
        /read(Number|Option|Boolean)\(\s*incoming/.test(source),
        `${path}: should read incoming state through readNumber/readOption/readBoolean`,
      ).toBe(true)
    }
  })

  it('opens a shared link straight into free explore', () => {
    // Replaying the opening story over somebody's conclusion wastes the click.
    for (const path of publishing) {
      const source = readFileSync(path, 'utf8')
      if (!source.includes('useStoryFreeMode')) continue
      expect(source, `${path}: should skip the story when arriving from a share`).toMatch(/firstVisit:.*'free'/)
    }
  })

  it('keeps the share parameter through the router', () => {
    expect(routeSource).toContain('search.s')
    expect(routeSource).toMatch(/s\?: string/)
  })

  it('keeps the share button reachable in the top bar', () => {
    // It lived inside the info drawer once, two taps from anywhere.
    expect(shellSource).toContain('experience-share-button')
    expect(shellSource).toContain('experience-header-actions')
    const header = shellSource.slice(
      shellSource.indexOf('experience-header-actions'),
      shellSource.indexOf('</header>'),
    )
    expect(header, 'share button should sit in the header').toContain('renderShareButton(')
  })

  it('builds the link from whatever the mounted world last published', () => {
    expect(shellSource).toContain('withShareState')
    expect(shellSource).toContain('shareStore.current.packed')
    expect(shellSource).toContain('ShareStateContext.Provider')
    expect(shellSource).toContain('attributedShareUrl')
  })

  it('does not auto-open the share card when a story ends', () => {
    expect(shellSource).not.toContain('GUIDE_COMPLETE_EVENT')
    expect(shellSource).not.toContain('story_complete')
    expect(shellSource).not.toContain('share-afterglow')
  })

  it('points link unfurls at the JPEG social card, not the experience poster', () => {
    // WeChat and Weibo often drop WebP OG images; 16:10 posters also get cropped.
    expect(routeSource).toContain('worldSocialCard(loaderData.world)')
    expect(routeSource).toContain('SOCIAL_CARD_WIDTH')
    expect(routeSource).toContain('SOCIAL_CARD_HEIGHT')
    expect(routeSource).not.toMatch(/image:\s*loaderData\.world\.poster/)
  })

  it('prefers a world-supplied frame over reading the canvas', () => {
    // WebGL canvases read blank between frames; without this the card silently
    // shows the catalogue poster instead of what the user made.
    expect(shellSource).toContain('capture={shareStore.capture}')
    const buildStart = cardSource.indexOf('const build =')
    // Search from `build` onward: captureStage is *defined* earlier in the file.
    const build = cardSource.slice(buildStart, cardSource.indexOf('captureStage()', buildStart))
    expect(build, 'the supplied capture should be tried first').toContain('capture?.()')
    expect(cardSource).not.toContain('FollowStayPrompt')
  })
})
