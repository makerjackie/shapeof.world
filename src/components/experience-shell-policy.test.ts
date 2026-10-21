import {readdirSync, readFileSync, statSync} from 'node:fs'
import {resolve} from 'node:path'
import ts from 'typescript'
import {describe, expect, it} from 'vitest'

const shellSource = readFileSync(resolve(import.meta.dirname, 'ExperienceShell.tsx'), 'utf8')
const appStyles = readFileSync(resolve(import.meta.dirname, '../styles/app.css'), 'utf8')
const routeSource = readFileSync(resolve(import.meta.dirname, '../routes/$worldId.tsx'), 'utf8')
const artifactGeneratorSource = readFileSync(resolve(import.meta.dirname, '../../scripts/generate-world-artifacts.mjs'), 'utf8')

function guideStepConfigOffendersInSource(file: string, source: string) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations = new Map<string, Array<ts.VariableDeclaration>>()
  const offenders: string[] = []

  const propertyName = (name: ts.PropertyName) => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
    return name.getText(sourceFile)
  }

  const collectDeclarations = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const existing = declarations.get(node.name.text) ?? []
      existing.push(node)
      declarations.set(node.name.text, existing)
    }
    ts.forEachChild(node, collectDeclarations)
  }
  collectDeclarations(sourceFile)

  const resolveStepArrays = (
    expression: ts.Expression,
    usePosition: number,
    seen = new Set<ts.VariableDeclaration>(),
  ): Array<ts.ArrayLiteralExpression> => {
    if (ts.isArrayLiteralExpression(expression)) return [expression]
    if (
      ts.isParenthesizedExpression(expression)
      || ts.isAsExpression(expression)
      || ts.isTypeAssertionExpression(expression)
      || ts.isSatisfiesExpression(expression)
    ) {
      return resolveStepArrays(expression.expression, usePosition, seen)
    }
    if (ts.isConditionalExpression(expression)) {
      return [
        ...resolveStepArrays(expression.whenTrue, usePosition, seen),
        ...resolveStepArrays(expression.whenFalse, usePosition, seen),
      ]
    }
    if (ts.isIdentifier(expression)) {
      const declaration = (declarations.get(expression.text) ?? [])
        .filter((candidate) => candidate.initializer && candidate.getStart(sourceFile) < usePosition)
        .sort((left, right) => right.getStart(sourceFile) - left.getStart(sourceFile))
        .find((candidate) => !seen.has(candidate))
      if (!declaration?.initializer) return []
      seen.add(declaration)
      return resolveStepArrays(declaration.initializer, declaration.getStart(sourceFile), seen)
    }
    if (ts.isCallExpression(expression) && expression.arguments.length > 0) {
      const factory = expression.arguments[0]
      if (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory)) {
        if (ts.isBlock(factory.body)) {
          const returned = factory.body.statements.find(ts.isReturnStatement)?.expression
          return returned ? resolveStepArrays(returned, factory.getStart(sourceFile), seen) : []
        }
        return resolveStepArrays(factory.body, factory.getStart(sourceFile), seen)
      }
    }
    return []
  }

  const inspectSteps = (array: ts.ArrayLiteralExpression) => {
    for (const element of array.elements) {
      if (!ts.isObjectLiteralExpression(element)) continue
      for (const property of element.properties) {
        if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue
        const name = propertyName(property.name)
        if (name !== 'target' && name !== 'awaitInteraction') continue
        const position = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile))
        offenders.push(`${file}:${position.line + 1}:${name}`)
      }
    }
  }

  const visitGuideTours = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = node.tagName.getText(sourceFile).split('.').at(-1)
      if (tagName === 'GuideTour') {
        const stepsAttribute = node.attributes.properties.find(
          (property): property is ts.JsxAttribute => (
            ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'steps'
          ),
        )
        const initializer = stepsAttribute?.initializer
        if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
          for (const array of resolveStepArrays(initializer.expression, initializer.getStart(sourceFile))) {
            inspectSteps(array)
          }
        }
      }
    }
    ts.forEachChild(node, visitGuideTours)
  }
  visitGuideTours(sourceFile)
  return offenders
}

function guideStepConfigOffenders(root: string) {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = resolve(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.tsx') || name.endsWith('.ts')) files.push(full)
    }
  }
  walk(root)

  const offenders: string[] = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    // Most modules never mount GuideTour; skip the TS AST walk for them.
    if (!source.includes('GuideTour')) continue
    offenders.push(...guideStepConfigOffendersInSource(file, source))
  }
  return offenders
}

function guideStageCompositionOffenders(root: string) {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = resolve(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.tsx')) files.push(full)
    }
  }
  walk(root)

  const offenders: string[] = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('<GuideTour')) continue
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tagName = node.tagName.getText(sourceFile).split('.').at(-1)
        if (tagName === 'GuideTour') {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
          const attributes = new Map(
            node.attributes.properties
              .filter(ts.isJsxAttribute)
              .map((attribute) => [attribute.name.getText(sourceFile), attribute]),
          )
          const placement = attributes.get('placement')?.initializer
          if (!placement || !ts.isStringLiteral(placement) || placement.text !== 'stage') {
            offenders.push(`${file}:${line}:placement`)
          }
          const stagePlan = attributes.get('stagePlan')?.initializer
          if (
            !stagePlan
            || !ts.isJsxExpression(stagePlan)
            || !stagePlan.expression
          ) {
            offenders.push(`${file}:${line}:stagePlan`)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }
  return offenders
}

describe('experience shell policy', () => {
  it('keeps completion silent and persists discoveries', () => {
    expect(shellSource).not.toContain('reveal-drawer')
    expect(shellSource).toContain('atlas.completeIssue')
    expect(shellSource).toContain('atlas.completeWorld')
    expect(shellSource).not.toContain('atlas.saveWorld')
    expect(shellSource).not.toContain('to="/atlas"')
  })

  it('does not turn leaving a world into an implicit completion', () => {
    expect(shellSource).not.toContain('finishBeforeNext')
    expect(shellSource).not.toContain('onClick={finishBeforeNext}')
  })

  it('keeps automatic blocking coachmarks out of the shared shell', () => {
    expect(shellSource).not.toContain('experience-coachmark')
    expect(shellSource).not.toContain('coachmarkVisible')
  })

  it('puts payoff, field notes, and source notes in the ⓘ drawer', () => {
    expect(shellSource).toContain("worldText(world, 'payoff')")
    expect(shellSource).toContain('world.fieldNotes')
    expect(shellSource).toContain('source.noteEn')
    expect(appStyles).toContain('experience-payoff')
    expect(appStyles).toContain('experience-field-note')
  })

  it('starts the ⓘ drawer from the top so long notes are not clipped', () => {
    expect(appStyles).toContain('.experience-intro-copy { display: flex; min-width: 0; min-height: 0; flex-direction: column; justify-content: flex-start;')
    expect(shellSource).toContain('introCopyRef.current?.scrollTo({ top: 0 })')
  })

  it('keeps the sources panel non-modal and leaves the world interactive', () => {
    const introStart = shellSource.indexOf('id={`experience-intro-')
    const introEnd = shellSource.indexOf('</aside>', introStart)
    const introPanel = shellSource.slice(introStart, introEnd)
    expect(shellSource).not.toContain('experience-intro-scrim')
    expect(introPanel).not.toContain('aria-modal="true"')
    expect(introPanel).not.toContain('inert={introOpen ? true : undefined}')
    expect(introPanel).toContain('role="region"')
  })

  it('uses an accessible modal action sheet for collapsed mobile utilities', () => {
    // Desktop and phone share one trigger renderer; each passes its own modifier class.
    expect(shellSource).toContain('function renderMoreButton(')
    expect(shellSource).toContain("renderMoreButton(moreButtonRef, 'experience-more-button')")
    expect(shellSource).toContain('className={`experience-header-icon ${className}`}')
    expect(shellSource).toContain('className="experience-more-sheet"')
    expect(shellSource).toContain('aria-haspopup="dialog"')
    expect(shellSource).toContain('aria-modal="true"')
    expect(shellSource).toContain('inert={moreOpen ? true : undefined}')
    expect(shellSource).toContain('trapMoreSheetFocus')
  })

  it('lets people hide optional guide layers and restore them from the header', () => {
    expect(shellSource).toContain("data-overlays-hidden={overlaysHidden ? 'true' : 'false'}")
    expect(shellSource).toContain("t('experience.overlays.hide')")
    expect(shellSource).toContain("t('experience.overlays.show')")
    expect(shellSource).toContain('aria-pressed={overlaysHidden}')
    // 沉浸查看需一并藏掉引导轨与通用 overlay 标记，只留主体 + 恢复入口
    expect(appStyles).toContain(".experience-page[data-overlays-hidden='true'] .guide-tour")
    expect(appStyles).toContain("[data-experience-overlay='true']")
  })

  it('progressively requests mobile browser fullscreen without replacing shell immersion', () => {
    expect(shellSource).toContain('requestMobileBrowserFullscreen')
    expect(shellSource).toContain('exitMobileBrowserFullscreen')
    expect(shellSource).toContain('setOverlaysHidden(next)')
  })

  it('keeps detail numbering synchronized with the dated poster feed', () => {
    expect(routeSource).toContain('getDailyIssueFeedContext(issue)')
    expect(routeSource).toContain('displayPosition: issueFeedContext?.position')
    expect(shellSource).toContain("String(navigation.displayPosition).padStart(2, '0')")
    // 视觉顶栏已改为 icon-only；序号保留在读屏进度与资料抽屉
    expect(shellSource).toContain('experience-progress-sr')
    expect(shellSource).toContain('<span>{displayIndex}</span>')
  })

  it('keeps ordinary next links editorial while random discovery uses a bounded shortlist', () => {
    expect(routeSource).toContain('pathContext?.nextWorldId')
    expect(routeSource).toContain('data.pathId ? contentGraph.getPathContext')
    expect(routeSource).toContain('selectEditorialNextWorld')
    expect(routeSource).toContain('issue: issueNextWorld')
    expect(routeSource).toContain('path: pathNextWorld')
    expect(routeSource).toContain('related: relatedWorld')
    expect(routeSource).toContain('recommended: adjacentWorld')
    expect(routeSource).not.toContain("if (!adjacentWorld) return { status: 'not-found' as const }")
    expect(routeSource).toContain('artifact.navigation?.randomWorldIds')
    expect(artifactGeneratorSource).toContain('Math.min(12, Math.max(0, publicWorlds.length - 1))')
    expect(routeSource).not.toContain('completesWorldLoop')
    expect(shellSource).toContain('navigation.randomWorldIds.find')
    expect(shellSource).not.toContain('selectNextWorld')
    expect(shellSource).not.toContain("import('~/data/world-summaries')")
    expect(shellSource).not.toContain('nextSelectionStartedRef')
  })

  it('keeps the experience header as an icon toolbar, not a text console', () => {
    expect(shellSource).toContain('CornersOut')
    expect(shellSource).toContain('CornersIn')
    expect(shellSource).toContain('experience-header-icon')
    expect(shellSource).not.toContain("{t('experience.sources')}</button>")
  })

  it('keeps the current world found when the editorial next world is missing', () => {
    expect(routeSource).toContain('status: \'found\' as const')
    expect(routeSource).toContain('const nextWorld = nextSelection?.world')
    expect(shellSource).toContain("{!explorationActive && renderNextLink('bar')}")
    expect(shellSource).toContain("{!explorationActive && renderNextLink('toolbar')}")
    expect(shellSource).toMatch(/function renderNextLink\([^)]*\) \{\s*if \(!nextWorld\) return null/)
  })

  it('always exposes exit, info, and language controls', () => {
    expect(shellSource).toContain("t('experience.back')")
    expect(shellSource).toContain("t('experience.sources')")
    expect(shellSource).toContain('<LocaleToggle compact />')
    expect(shellSource).not.toContain('toggleReducedMotion')
    expect(shellSource).not.toContain("t('experience.reducedMotion.on')")
    expect(shellSource).toContain("data-shell-mode={experiencePolicy.shellMode}")
  })

  it('exposes immersive cinema play/pause wired to guide autoplay', () => {
    expect(shellSource).toContain('setGuideAutoplay')
    expect(shellSource).toContain('experience-cinema-toggle')
    expect(shellSource).toContain('capabilities.hasGuide')
    expect(shellSource).toContain("t('experience.cinema.play')")
    expect(shellSource).toContain("data-guide-autoplay=")
    expect(appStyles).toContain("data-guide-autoplay='true'] .guide-tour")
    expect(appStyles).toContain(".experience-cinema-toggle[aria-pressed='false'] svg")
    expect(appStyles).toContain('transform: translateX(-1px)')
  })
})

describe('shell standard hard bans (SHELL_STANDARD.md)', () => {
  const root = resolve(import.meta.dirname, 'experiences')
  const guideSource = readFileSync(resolve(root, 'GuideTour.tsx'), 'utf8')
  const freebarCss = readFileSync(resolve(root, 'styles/Freebar.css'), 'utf8')
  // Scans every experience module via the TypeScript AST; more worlds means a
  // longer walk, so keep the timeout above the default 5s suite limit.
  it('GuideStep has no target or interaction-wait escape hatch', () => {
    expect(guideSource).not.toMatch(/\btarget\??\s*:/)
    expect(guideSource).not.toMatch(/\bawaitInteraction\??\s*:/)
    expect(guideSource).not.toMatch(/\bdelay\??\s*:/)
    expect(guideSource).toContain('showReplayChip = false')
    expect(guideSource).not.toContain('guide-spotlight')
    expect(guideStepConfigOffenders(root)).toEqual([])
  }, 60_000)

  it('composes every story inside the stage with an authored per-world plan', () => {
    expect(guideSource).toContain("placement = 'stage'")
    expect(guideSource).toContain("window.addEventListener('wheel'")
    expect(guideSource).toContain("window.addEventListener('touchend'")
    expect(guideSource).toContain("window.addEventListener('keydown'")
    expect(guideStageCompositionOffenders(root)).toEqual([])
  }, 60_000)

  it('resolves the array actually bound to GuideTour without relying on type text or variable names', () => {
    const source = `
      const unrelated = [{ target: '.allowed-outside-guide' }]
      const cinematicChapters = useMemo(() => [
        { title: 'One', body: 'Body', target: '.forbidden' },
        { title: 'Two', body: 'Body', awaitInteraction: true },
      ], [])
      export function Fixture() {
        return <GuideTour worldId="fixture" steps={cinematicChapters} />
      }
    `

    expect(guideStepConfigOffendersInSource('fixture.tsx', source)).toEqual([
      'fixture.tsx:4:target',
      'fixture.tsx:5:awaitInteraction',
    ])
  })

  it('has one control-shell vocabulary and no retired dock implementation', () => {
    const source = readFileSync(resolve(root, 'Freebar.tsx'), 'utf8')
    expect(source).toContain('export function Freebar')
    expect(() => readFileSync(resolve(root, 'ExperienceDock.tsx'), 'utf8')).toThrow()
    expect(() => readFileSync(resolve(root, 'styles/ExperienceDock.css'), 'utf8')).toThrow()
    expect(freebarCss).not.toContain('experience-dock')
  })

  it('keeps freebar shared baseline available sitewide', () => {
    expect(freebarCss).toContain('experience-freebar')
    expect(freebarCss).toContain('appearance: none')
  })

  it('hides stage-corner oss-engine-credit via app shell CSS', () => {
    expect(appStyles).toContain('.oss-engine-credit')
    expect(appStyles).toContain("display: none !important")
    expect(appStyles).toContain('--experience-safe-top')
  })

  it('holds the second-world follow chip until the last story step or three minutes', () => {
    expect(shellSource).toContain("origin=\"second_world\"")
    expect(shellSource).toContain('GUIDE_LAST_STEP_EVENT')
    expect(shellSource).toContain('const FOLLOW_PROMPT_DWELL_MS = 180_000')
    expect(shellSource).toContain('if (!followPromptDue || !atlas.ready || atlas.visited.length < 2 || shareOpen) return')
    expect(shellSource).toContain('if (hasDismissedFollowPrompt()) return')
    // The first tap or a short timer must no longer open it.
    expect(shellSource).not.toContain('15_000')
    expect(shellSource).not.toMatch(/if \(interacted\) \{\n\s+setFollowChipOpen\(true\)/)
  })

  it('announces the final story step from the guide tour', () => {
    const guideSource = readFileSync(resolve(import.meta.dirname, 'experiences/GuideTour.tsx'), 'utf8')
    expect(guideSource).toContain("export const GUIDE_LAST_STEP_EVENT = 'oneworld:guide-last-step'")
    expect(guideSource).toContain('index !== steps.length - 1')
  })

  it('starts the next world chunk before the visitor leaves the current stage', () => {
    expect(shellSource).toContain('if (!explorationActive && nextWorld) warmWorldOnIntent(nextWorld.id)')
    expect(shellSource).toContain('worldIntentHandlers(nextWorld.id)')
  })

  it('bans the highlight-wait phrase from experience i18n packs', () => {
    const i18nRoot = resolve(import.meta.dirname, '../i18n')
    const phrase = '试一试高亮的区域，会自动继续'
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = resolve(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (name.endsWith('.json') && readFileSync(full, 'utf8').includes(phrase)) hits.push(full)
      }
    }
    walk(i18nRoot)
    expect(hits).toEqual([])
  })
})
