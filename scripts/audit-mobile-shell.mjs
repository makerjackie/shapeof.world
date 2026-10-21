import { worldPath } from '../src/lib/world-urls.ts'
/**
 * Check every public world against the mobile shell / Freebar rules.
 *
 * Structural rules block release. Theme taste, transparency and grouping
 * beauty stay human-reviewed and are never scored here.
 *
 *   node scripts/audit-mobile-shell.mjs
 *   node scripts/audit-mobile-shell.mjs --only fluid-sim,aurora
 *   node scripts/audit-mobile-shell.mjs --only rainbow,solar-system --viewport desktop
 *   node scripts/audit-mobile-shell.mjs --only my-new-world --include-making --viewport mobile
 *   node scripts/audit-mobile-shell.mjs --only solar-system --json
 *   LOCALE=en REDUCED_MOTION=reduce MUTED=1 node scripts/audit-mobile-shell.mjs --only solar-system
 *   node scripts/audit-mobile-shell.mjs --out .tmp/freebar-migration/audit-mobile.json
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

import { readWorldCatalogFiles } from './lib/world-catalog-source.mjs'
import { readStaticDefaultExport } from './lib/static-typescript-data.mjs'
import { resolveWorldState } from './lib/world-lifecycle.mjs'
import { selectAuditWorldIds } from './lib/world-audit-selection.mjs'

const root = resolve(import.meta.dirname, '..')
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const settle = Number(process.env.SETTLE ?? 8000)
const concurrency = Number(process.env.CONCURRENCY ?? 3)
const locale = process.env.LOCALE ?? 'zh'
const reducedMotion = process.env.REDUCED_MOTION ?? 'no-preference'
const muted = process.env.MUTED === '1'
// Exercise nested world pages as well as their landing state.
const routeHash = process.env.WORLD_HASH ?? ''
if (routeHash && !routeHash.startsWith('#')) throw new Error('WORLD_HASH must start with #')
if (!['zh', 'en'].includes(locale)) throw new Error('LOCALE must be zh or en')
if (!['reduce', 'no-preference'].includes(reducedMotion)) throw new Error('REDUCED_MOTION must be reduce or no-preference')
const viewportArg = process.argv.indexOf('--viewport')
const viewportName = viewportArg >= 0 ? process.argv[viewportArg + 1] : 'mobile'
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
}
const VIEWPORT = VIEWPORTS[viewportName]
if (!VIEWPORT) throw new Error(`Unknown viewport "${viewportName}". Use mobile or desktop.`)

const onlyArg = process.argv.indexOf('--only')
const only = onlyArg >= 0 ? new Set(process.argv[onlyArg + 1].split(',').map((id) => id.trim()).filter(Boolean)) : null
const includeMaking = process.argv.includes('--include-making')

const jsonFlag = process.argv.includes('--json')
const outArg = process.argv.indexOf('--out')
const outPath = outArg >= 0 ? resolve(process.argv[outArg + 1]) : null

const entries = readWorldCatalogFiles(root).map(({ path }) => {
  const world = readStaticDefaultExport(path)
  return { id: world.id, state: resolveWorldState(world) }
})
const ids = selectAuditWorldIds(entries, only === null ? null : [...only], { includeMaking })

/** Static scan: private CSS still mentioning the removed grip protocol. */
function scanLegacyGripCss() {
  const stylesDir = resolve(root, 'src/components/experiences/styles')
  const hits = []
  for (const file of readdirSync(stylesDir).filter((name) => name.endsWith('.css'))) {
    const text = readFileSync(resolve(stylesDir, file), 'utf8')
    if (text.includes('.experience-freebar-grip') || text.includes('experience-freebar-grip')) {
      hits.push(file)
    }
  }
  const freebarCss = readFileSync(resolve(stylesDir, 'Freebar.css'), 'utf8')
  if (freebarCss.includes('.experience-freebar-grip')) hits.push('Freebar.css')
  return hits
}

const legacyGripCssFiles = scanLegacyGripCss()

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ['--use-gl=angle', `--use-angle=${process.env.ONEWORLD_AUDIT_ANGLE ?? 'swiftshader'}`],
})

/**
 * Runtime probe. Returns enough structure for both pass/fail and migration
 * inventory merging — without scoring aesthetic taste.
 */
const PROBE = `(() => {
  const compact = window.innerWidth <= 720
  const freebar = document.querySelector('.experience-freebar')
  const main = document.querySelector('.experience-freebar-main')
  const primary = document.querySelector('.experience-freebar-primary')
  const secondary = document.querySelector('.experience-freebar-secondary')
  const summary = document.querySelector('.experience-freebar-summary')
  const limit = compact
    ? Math.min(Math.round(window.innerHeight * 0.5), 340)
    : Math.min(Math.round(window.innerHeight * 0.34), 220)

  const isVisible = (element) => {
    if (!element) return false
    const style = getComputedStyle(element)
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && element.getClientRects().length > 0
  }

  const isScrollableHorizontalRail = (element) => {
    let ancestor = element.parentElement
    while (ancestor && ancestor !== primary) {
      const style = getComputedStyle(ancestor)
      if (
        ['auto', 'scroll', 'overlay'].includes(style.overflowX)
        && ancestor.scrollWidth > ancestor.clientWidth + 1
      ) {
        return true
      }
      ancestor = ancestor.parentElement
    }
    return false
  }

  const focusables = (rootEl) => {
    if (!rootEl) return []
    return [...rootEl.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    )].filter((element) => {
      if (element.classList.contains('experience-freebar-summary')) return false
      if (element.closest('.experience-freebar-rail') || isScrollableHorizontalRail(element)) return false
      if (element.closest('.experience-freebar-story, .experience-freebar-reset')) return false
      return isVisible(element)
    })
  }

  const visualRowCount = (() => {
    if (!main) return 0
    const controls = [...main.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
    )].filter(isVisible)
    const centers = controls
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return (rect.top + rect.bottom) / 2
      })
      .sort((a, b) => a - b)
    const rows = []
    for (const center of centers) {
      if (!rows.some((row) => Math.abs(row - center) <= 12)) rows.push(center)
    }
    return rows.length
  })()

  const freebarRect = freebar?.getBoundingClientRect()
  const mainRect = main?.getBoundingClientRect()
  const primaryFocusables = focusables(primary)
  const primaryActual = primaryFocusables.length
  const primaryBudget = Number(freebar?.getAttribute('data-freebar-primary-limit') ?? 0)
  const primarySegment = primary?.querySelector(':scope > .experience-freebar-seg')
  const segmentFocusables = focusables(primarySegment)
  const visiblePrimaryControls = primary
    ? [...primary.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')].filter(isVisible)
    : []
  const primaryCenters = visiblePrimaryControls.map((element) => {
    const rect = element.getBoundingClientRect()
    return (rect.top + rect.bottom) / 2
  })
  const primaryFitsOneRow = primaryCenters.every(
    (center) => Math.abs(center - (primaryCenters[0] ?? center)) <= 12,
  )
  const segmentLabelsFit = segmentFocusables.every(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )
  const compactCoreSegmentException = compact
    && segmentFocusables.length === 4
    && primaryFocusables.length <= 5
    && primaryFocusables.every(
      (element) => primarySegment?.contains(element)
        || element.parentElement === primary,
    )
    && primaryFitsOneRow
    && segmentLabelsFit
  const expanded = freebar?.classList.contains('is-freebar-open')
    || summary?.getAttribute('aria-expanded') === 'true'
    || false

  let covered = false
  let clearanceGap = null
  const hud = document.querySelector('[data-freebar-clearance="true"]')
  if (hud && main) {
    const a = hud.getBoundingClientRect()
    const b = main.getBoundingClientRect()
    clearanceGap = Math.round(b.top - a.bottom)
    covered = a.bottom > b.top + 2 && a.top < b.bottom && a.right > b.left && a.left < b.right
  }

  let topOverlap = false
  const next = document.querySelector('.experience-next-link')
  const plaque = document.querySelector('[data-experience-plaque="true"]')
  if (next && plaque) {
    const a = next.getBoundingClientRect()
    const b = plaque.getBoundingClientRect()
    topOverlap = a.bottom > b.top + 2
      && a.top < b.bottom
      && a.right > b.left + 2
      && a.left < b.right - 2
  }

  const contentStart = [...document.querySelectorAll('[data-experience-content-start="true"]')].find(isVisible)
  const header = document.querySelector('.experience-header')
  const contentTopGap = contentStart && isVisible(header)
    ? Math.round(contentStart.getBoundingClientRect().top - header.getBoundingClientRect().bottom)
    : null

  return {
    contentTopGap,
    compact,
    hasFreebar: Boolean(freebar),
    freebarHeight: freebarRect ? Math.round(freebarRect.height) : 0,
    bar: mainRect ? Math.round(mainRect.height) : 0,
    limit,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    covered,
    clearanceGap,
    primaryActual,
    primaryBudget,
    hardPrimaryLimit: compactCoreSegmentException ? 5 : compact ? 3 : 5,
    visualRowCount,
    hasLegacyGrip: Boolean(document.querySelector('.experience-freebar-grip')),
    topOverlap,
    hasDisclosure: Boolean(summary),
    disclosureVisible: isVisible(summary),
    expanded: Boolean(expanded),
    hasSecondary: Boolean(secondary),
    secondaryVisible: isVisible(secondary),
    mainScrollX: Boolean(main && main.scrollWidth > main.clientWidth + 2),
    mainScrollY: Boolean(main && main.scrollHeight > main.clientHeight + 2),
    secondaryScrollX: Boolean(secondary && secondary.scrollWidth > secondary.clientWidth + 2),
    secondaryScrollY: Boolean(secondary && secondary.scrollHeight > secondary.clientHeight + 2),
    disclosureLabel: summary?.getAttribute('aria-label') ?? null,
    hasRail: Boolean(document.querySelector('.experience-freebar-rail')),
    hasTabs: Boolean(document.querySelector('.experience-freebar-tabs')),
    hasStory: Boolean(document.querySelector('.experience-freebar-story')),
    hasReset: Boolean(document.querySelector('.experience-freebar-reset')),
    hasRange: Boolean(document.querySelector('.experience-freebar input[type="range"]')),
    hasPlaque: Boolean(plaque),
    hasHudClearance: Boolean(hud),
    hasGuide: Boolean(document.querySelector('.guide-tour, .guide-close, .guide-stage-exit')),
  }
})()`

function evaluateProbe(probe, state, issues) {
  // Freebar is an optional runtime capability (PRODUCT_STANDARD / SHELL_STANDARD).
  // Keep measuring overflow and any mounted controls; its absence is not a defect.
  if (probe.bar > probe.limit) issues.push(`${state} free bar ${probe.bar}px over the ${probe.limit}px limit`)
  if (probe.freebarHeight > probe.limit + 8) {
    issues.push(`${state} freebar shell ${probe.freebarHeight}px over the ${probe.limit}px safety cap`)
  }
  if (probe.overflow > 2) issues.push(`${state} page scrolls sideways by ${probe.overflow}px`)
  if (probe.covered) issues.push(`${state} readout sits under the free bar`)
  if (probe.hasLegacyGrip) issues.push(`${state} renders a legacy horizontal grip`)
  if (probe.contentTopGap !== null && probe.contentTopGap !== undefined && (probe.contentTopGap < 0 || probe.contentTopGap > 32)) {
    issues.push(`${state} content starts ${probe.contentTopGap}px from header; expected 0–32px (check stacked safe-area/padding/margins)`)
  }
  if (probe.topOverlap) issues.push(`${state} next-world card overlaps the world plaque`)
  if (probe.primaryActual > probe.hardPrimaryLimit) {
    issues.push(
      `${state} primary controls ${probe.primaryActual} exceed the ${probe.compact ? 'phone' : 'desktop'} hard limit ${probe.hardPrimaryLimit}`,
    )
  }
  if (probe.primaryBudget > probe.hardPrimaryLimit) {
    issues.push(
      `${state} declared budget ${probe.primaryBudget} exceeds the ${probe.compact ? 'phone' : 'desktop'} hard limit ${probe.hardPrimaryLimit}`,
    )
  }
  if (!probe.compact && probe.expanded) {
    if (probe.visualRowCount > 3) {
      issues.push(`${state} desktop Freebar uses ${probe.visualRowCount} visual rows; four or more must be regrouped`)
    }
    if (probe.mainScrollX || probe.mainScrollY) issues.push(`${state} desktop Freebar main has an internal scrollbar`)
    if (probe.secondaryScrollX || probe.secondaryScrollY) issues.push(`${state} desktop secondary tray has an internal scrollbar`)
  }
  if (
    probe.hasDisclosure
    && probe.disclosureLabel
    && !['展开', '折叠', 'Expand', 'Collapse'].includes(probe.disclosureLabel)
  ) {
    issues.push(`${state} disclosure label must be 展开/折叠 or Expand/Collapse`)
  }
}

async function readPanelMaterial(page, selector) {
  return page.$eval(selector, (element) => {
    const style = getComputedStyle(element)
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderColor: style.borderColor,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      boxShadow: style.boxShadow,
    }
  }).catch(() => null)
}

async function check(id) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, reducedMotion })
  if (muted) await page.addInitScript(() => localStorage.setItem('oneworld.site-bgm.muted.v1', '1'))
  const issues = []
  const runtimeErrors = []
  const record = {
    id,
    viewport: viewportName,
    viewportSize: VIEWPORT,
    locale,
    reducedMotion,
    muted,
    issues: [],
    runtimeErrors: [],
    guideClosed: false,
    freebarAfterGuide: false,
    guideMaterial: null,
    freebarMaterial: null,
    initial: null,
    collapsed: null,
    expanded: null,
  }

  page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`)
  })

  try {
    await page.goto(`${base}${worldPath(id)}?ghost=0&lang=${locale}${routeHash}`, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(settle)

    // Measure free explore, not the story track: they are mutually exclusive.
    const guideExit = '.guide-close, .guide-stage-exit'
    await page.waitForSelector(`.experience-freebar, ${guideExit}`, { timeout: 12_000 }).catch(() => {})
    const guideVisible = await page.isVisible(guideExit).catch(() => false)
    if (guideVisible) {
      record.guideMaterial = await readPanelMaterial(page, '.guide-card')
      await page.click(guideExit, { force: true, timeout: 3_000 }).catch(() => {})
      record.guideClosed = true
    }
    const freebarAppeared = await page
      .waitForSelector('.experience-freebar', { state: 'attached', timeout: 12_000 })
      .then(() => true)
      .catch(() => false)
    record.freebarAfterGuide = freebarAppeared
    if (guideVisible && !freebarAppeared) {
      issues.push('GuideTour exit did not reveal a shared Freebar')
    }
    await page.waitForTimeout(700)
    record.freebarMaterial = await readPanelMaterial(page, '.experience-freebar-main')
    if (
      record.guideMaterial
      && record.freebarMaterial
      && JSON.stringify(record.guideMaterial) !== JSON.stringify(record.freebarMaterial)
    ) {
      const mismatches = Object.keys(record.guideMaterial)
        .filter((key) => record.guideMaterial[key] !== record.freebarMaterial[key])
      issues.push(`GuideTour / Freebar material differs: ${mismatches.join(', ')}`)
    }

    const initialProbe = await page.evaluate(PROBE)
    if (process.env.DEBUG_PROBE) console.log(`\n${id} initial`, initialProbe)
    record.initial = initialProbe
    evaluateProbe(initialProbe, 'initial', issues)
    if (initialProbe.primaryBudget && initialProbe.primaryActual > initialProbe.primaryBudget) {
      issues.push(`primary controls ${initialProbe.primaryActual} over declared budget ${initialProbe.primaryBudget}`)
    }
    if (viewportName === 'desktop' && initialProbe.hasDisclosure && !initialProbe.expanded) {
      issues.push('desktop Freebar with secondary content is not expanded by default')
    }

    const disclosure = '.experience-freebar-summary'
    if (await page.isVisible(disclosure).catch(() => false)) {
      const alreadyOpen = initialProbe.expanded
      let expandedProbe = initialProbe
      if (!alreadyOpen) {
        // Presentation layers such as GhostHint can briefly intercept the
        // pointer even after the disclosure is visibly laid out. Invoke the
        // real control directly so the structural expanded-state audit is
        // deterministic.
        await page.evaluate((selector) => {
          document.querySelector(selector)?.click()
        }, disclosure)
        await page.waitForTimeout(420)
        expandedProbe = await page.evaluate(PROBE)
      }
      if (process.env.DEBUG_PROBE) console.log(`\n${id} expanded`, expandedProbe)
      record.expanded = expandedProbe
      evaluateProbe(expandedProbe, 'expanded', issues)

      // Measure the collapsed state when the real disclosure accepts the
      // synthetic click. Presentation layers such as GhostHint can
      // temporarily suppress that interaction, so do not mislabel an
      // unchanged expanded probe as "collapsed".
      if (expandedProbe.expanded) {
        // GhostHint may briefly hide overlays after the initial probe. Invoke
        // the real disclosure element directly so the structural closed-state
        // measurement is not skipped because of that presentation animation.
        await page.evaluate((selector) => {
          document.querySelector(selector)?.click()
        }, disclosure)
        await page.waitForTimeout(420)
        const collapsedProbe = await page.evaluate(PROBE)
        if (process.env.DEBUG_PROBE) console.log(`\n${id} collapsed`, collapsedProbe)
        if (!collapsedProbe.expanded) {
          record.collapsed = collapsedProbe
          evaluateProbe(collapsedProbe, 'collapsed', issues)
        }
      }
    }

    const appErrors = [...new Set(runtimeErrors)]
    record.runtimeErrors = appErrors
    for (const error of appErrors.slice(0, 3)) {
      issues.push(`runtime error: ${error.slice(0, 140)}`)
    }
  } catch (error) {
    issues.push(`could not measure: ${String(error).split('\n')[0].slice(0, 90)}`)
  }

  await page.close()
  record.issues = [...new Set(issues)]
  return record
}

const queue = [...ids]
const results = []
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const result = await check(queue.shift())
      results.push(result)
      if (!jsonFlag && !outPath) process.stdout.write(result.issues.length ? 'x' : '.')
    }
  }),
)
await browser.close()

const sorted = results.sort((a, b) => a.id.localeCompare(b.id))
const bad = sorted.filter((result) => result.issues.length)
const cssIssues = legacyGripCssFiles.map((file) => `legacy grip CSS still present in styles/${file}`)
const failed = bad.length + (cssIssues.length ? 1 : 0)
const report = {
  generatedAt: new Date().toISOString(),
  base,
  viewport: viewportName,
  viewportSize: VIEWPORT,
  includeMaking,
  checked: sorted.length,
  failed,
  legacyGripCssFiles,
  cssIssues,
  results: sorted,
}

if (outPath) {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
}

if (jsonFlag) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`\n\n${sorted.length} worlds on ${viewportName} ${VIEWPORT.width}x${VIEWPORT.height}, ${failed} with problems\n`)
  if (cssIssues.length) {
    console.log('shared CSS issues:')
    for (const issue of cssIssues) console.log(`   ${issue}`)
    console.log('')
  }
  for (const result of bad) {
    console.log(`${result.id}`)
    for (const issue of result.issues) console.log(`   ${issue}`)
  }
  if (!failed) console.log(`Every checked world fits the ${viewportName} shell rules.`)
  if (outPath) console.log(`\nWrote ${outPath}`)
}

process.exitCode = failed ? 1 : 0
