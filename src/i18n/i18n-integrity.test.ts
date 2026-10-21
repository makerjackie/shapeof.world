import { setImmediate } from 'node:timers/promises'
import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { categories, paths } from '~/data/content-graph'
import { dailyIssues } from '~/data/issues'
import { worldCatalog } from '~/data/worlds/catalog'
import {
  overrideEntries,
  rendererEntries,
  validateOverrideEntries,
} from '../../scripts/generate-experience-dictionaries.mjs'
import generatedEnglish from './experience-en.json'
import { translateExperienceText } from './experience'
import { messages } from './index'

const hasHan = (value: string) => /[\u3400-\u9fff]/u.test(value)
const experienceDirectory = resolve(import.meta.dirname, '../components/experiences')
const experienceDictionaryDirectory = resolve(import.meta.dirname, 'experience-en')
const canvasTranslatorNames = new Set(['tx', 'translate'])

function loadWorldDictionary(worldId: string): Record<string, string> {
  const raw = readFileSync(resolve(experienceDictionaryDirectory, `${worldId}.json`), 'utf8')
  return JSON.parse(raw) as Record<string, string>
}

function parseExperienceSource(file: string, text: string): ts.SourceFile {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(resolve(experienceDirectory, file), text, ts.ScriptTarget.Latest, true, kind)
}

function collectExperienceSources(): string[] {
  const files: string[] = []
  for (const name of readdirSync(experienceDirectory)) {
    if (name.endsWith('.tsx')) files.push(name)
  }
  const worldsDirectory = resolve(experienceDirectory, 'worlds')
  for (const world of readdirSync(worldsDirectory, { withFileTypes: true })) {
    if (!world.isDirectory()) continue
    const worldDirectory = resolve(worldsDirectory, world.name)
    for (const name of readdirSync(worldDirectory)) {
      if (name.endsWith('.tsx') && name !== 'index.tsx') {
        files.push(relative(experienceDirectory, resolve(worldDirectory, name)))
      }
    }
  }
  return files
}
const exactGuideDictionaryWorlds = [
  { id: 'eclipses', file: 'worlds/eclipses/Eclipses.tsx' },
  // solar-system now enters direct spatial exploration, without static GuideSteps.
] as const

function templateSample(node: ts.TemplateExpression): string {
  const expressionSample = (expression: ts.Expression): string => {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text
    if (ts.isTemplateExpression(expression)) return templateSample(expression)
    if (ts.isConditionalExpression(expression)) return expressionSample(expression.whenTrue)
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return expressionSample(expression.left) + expressionSample(expression.right)
    }
    return '7'
  }
  return node.templateSpans.reduce(
    (value, span) => value + expressionSample(span.expression) + span.literal.text,
    node.head.text,
  )
}

function staticGuideStepPhrases(file: string) {
  const path = resolve(experienceDirectory, file)
  const source = readFileSync(path, 'utf8')
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const phrases: Array<{ field: 'title' | 'body'; line: number; text: string }> = []
  const unsupported: Array<string> = []

  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node)
      && (node.name.getText(sourceFile) === 'title' || node.name.getText(sourceFile) === 'body')
    ) {
      let owner: ts.Node | undefined = node
      while (owner && !ts.isVariableDeclaration(owner)) owner = owner.parent
      if (owner && ts.isVariableDeclaration(owner) && owner.name.getText(sourceFile) === 'guideSteps') {
        const field = node.name.getText(sourceFile) as 'title' | 'body'
        const initializer = node.initializer
        const literal = ts.isStringLiteralLike(initializer)
          ? initializer
          : ts.isCallExpression(initializer)
            && ts.isIdentifier(initializer.expression)
            && initializer.expression.text === 'tx'
            && initializer.arguments[0]
            && ts.isStringLiteralLike(initializer.arguments[0])
              ? initializer.arguments[0]
              : undefined
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
        if (literal) phrases.push({ field, line, text: literal.text })
        else unsupported.push(`${file}:${line}:${field}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return { phrases, unsupported }
}

describe('i18n release integrity', () => {
  it('keeps the common English and Chinese dictionaries in lockstep', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.zh).sort())
    for (const [key, value] of Object.entries(messages.en)) {
      expect(value.trim(), `empty English common message: ${key}`).not.toBe('')
      expect(hasHan(value), `Chinese leaked into English common message: ${key}`).toBe(false)
    }
  })

  it('ships complete English metadata for every world and source', () => {
    const fields = ['title', 'posterTitle', 'posterHook', 'posterSource', 'question', 'hook', 'payoff', 'topicLabel'] as const
    for (const world of worldCatalog) {
      for (const field of fields) {
        const value = world.translations.en[field]
        expect(value.trim(), `${world.id}.translations.en.${field}`).not.toBe('')
        expect(hasHan(value), `Chinese leaked into ${world.id}.translations.en.${field}`).toBe(false)
      }
      for (const source of world.sources) {
        expect(source.labelEn.trim(), `${world.id} source labelEn`).not.toBe('')
        expect(hasHan(source.labelEn), `Chinese leaked into ${world.id} source labelEn`).toBe(false)
        if (source.noteEn) {
          expect(source.noteEn.trim(), `${world.id} source noteEn`).not.toBe('')
          expect(hasHan(source.noteEn), `Chinese leaked into ${world.id} source noteEn`).toBe(false)
        }
      }
      for (const note of world.fieldNotes ?? []) {
        expect(note.labelEn.trim(), `${world.id} fieldNote labelEn`).not.toBe('')
        expect(note.bodyEn.trim(), `${world.id} fieldNote bodyEn`).not.toBe('')
        expect(hasHan(`${note.labelEn} ${note.bodyEn}`), `Chinese leaked into ${world.id} fieldNotes English`).toBe(false)
      }
    }
  })

  it('ships English names and descriptions for every Category and Path', () => {
    for (const category of categories) {
      expect(category.titleEn.trim()).not.toBe('')
      expect(category.descriptionEn.trim()).not.toBe('')
      expect(hasHan(`${category.titleEn} ${category.descriptionEn}`), category.id).toBe(false)
    }
    for (const path of paths) {
      expect(path.titleEn.trim()).not.toBe('')
      expect(path.descriptionEn.trim()).not.toBe('')
      expect(hasHan(`${path.titleEn} ${path.descriptionEn}`), path.id).toBe(false)
    }
  })

  it('keeps every daily issue bilingual', () => {
    for (const issue of dailyIssues) {
      for (const field of ['question', 'hook', 'conclusion'] as const) {
        expect(issue[field].zh.trim(), `${issue.id}.${field}.zh`).not.toBe('')
        expect(issue[field].en.trim(), `${issue.id}.${field}.en`).not.toBe('')
        expect(hasHan(issue[field].en), `Chinese leaked into ${issue.id}.${field}.en`).toBe(false)
      }
    }
  })

  it('translates every generated experience phrase without a Chinese fallback', () => {
    for (const source of Object.keys(generatedEnglish)) {
      const translated = translateExperienceText('en', source, generatedEnglish)
      expect(hasHan(translated), `untranslated experience phrase: ${source}`).toBe(false)
    }
  })

  it('keeps one small generated dictionary beside every lazy renderer', () => {
    const rendererIds = (rendererEntries() as Array<{ id: string }>)
      .map((entry) => entry.id)
      .sort()
    const dictionaryIds = readdirSync(experienceDictionaryDirectory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -5))
      .sort()

    expect(dictionaryIds).toEqual(rendererIds)
    for (const id of dictionaryIds) {
      const source = readFileSync(resolve(experienceDictionaryDirectory, `${id}.json`))
      expect(source.byteLength, `${id}: lazy dictionary bytes`).toBeLessThanOrEqual(25_000)
      const dictionary = JSON.parse(source.toString()) as Record<string, string>
      for (const sourceText of Object.keys(dictionary)) {
        const translation = translateExperienceText('en', sourceText, dictionary)
        expect(hasHan(translation), `${id}: Chinese leaked into generated English dictionary`).toBe(false)
      }
    }

    const runtime = readFileSync(resolve(import.meta.dirname, 'experience.ts'), 'utf8')
    expect(runtime).not.toContain("from './experience-en.json'")
  })

  it('keeps short, ambiguous phrases scoped to their owning world', () => {
    const renderers = rendererEntries() as Array<{ id: string }>
    const overrides = validateOverrideEntries(
      overrideEntries(),
      renderers,
    ) as Array<{ id: string; phrases: Record<string, string> }>

    for (const { id, phrases } of overrides) {
      const dictionary = loadWorldDictionary(id)
      for (const [source, translation] of Object.entries(phrases)) {
        expect(dictionary[source], `${id}: missing scoped translation for ${source}`).toBe(translation)
        expect(hasHan(translation), `${id}: Chinese leaked into scoped translation for ${source}`).toBe(false)
      }
    }
  })

  it('keeps every static GuideStep title and body in the rewritten guides exactly translated', () => {
    for (const { id, file } of exactGuideDictionaryWorlds) {
      const dictionary = loadWorldDictionary(id)
      const { phrases, unsupported } = staticGuideStepPhrases(file)

      expect(unsupported, `${id}: GuideStep copy must stay statically auditable`).toEqual([])
      expect(phrases.length, `${id}: expected static GuideStep copy`).toBeGreaterThan(0)
      for (const phrase of phrases) {
        const translation = dictionary[phrase.text]
        expect(
          translation,
          `${file}:${phrase.line} missing exact English GuideStep ${phrase.field}: ${phrase.text}`,
        ).toBeTruthy()
        expect(
          hasHan(translation),
          `${file}:${phrase.line} Chinese leaked into GuideStep ${phrase.field}: ${phrase.text}`,
        ).toBe(false)
      }
    }
  })

  it('translates the Eclipses speed buttons, scenario labels and moon-phase names', () => {
    const eclipses = loadWorldDictionary('eclipses')
    const controlGroups: Record<string, Array<string>> = {
      status: ['没有食', '影子擦过', '月地距离'],
      speeds: ['10 分 / 秒', '1 小时 / 秒', '1 天 / 秒', '10 天 / 秒'],
      phases: ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'],
    }

    for (const [group, sources] of Object.entries(controlGroups)) {
      for (const source of sources) {
        const english = eclipses[source]
        expect(english?.trim(), `Eclipses ${group}: no English for ${source}`).toBeTruthy()
        expect(hasHan(english), `Eclipses ${group}: Chinese left in English for ${source}`).toBe(false)
      }
    }
  })

  it('translates representative dynamic readouts', () => {
    const samples = [
      '第 3 幕：红巨星',
      '已收敛：42 步到达谷底',
      '检测阳性 57 人',
      '约 138 亿年',
      '17 天后冲日',
      'n = 64 个矩形',
      '空中解体 · 能量在 24 km 高空释放',
      '当前显示最大的分支，另有 12 个较小分支。',
    ]
    for (const source of samples) {
      const translated = translateExperienceText('en', source, generatedEnglish)
      expect(translated, source).not.toBe(source)
      expect(hasHan(translated), source).toBe(false)
    }
  })

  it('covers every user-facing dynamic template in an experience component', async () => {
    const failures: Array<string> = []
    const files = collectExperienceSources().filter((name) => name.endsWith('.tsx') || name.endsWith('.ts'))
    for (const file of files) {
      const path = resolve(experienceDirectory, file)
      const source = readFileSync(path, 'utf8')
      const sourceFile = parseExperienceSource(file, source)
      const visit = (node: ts.Node) => {
        if (ts.isTemplateExpression(node)) {
          const sample = templateSample(node)
          if (hasHan(sample) && !node.getText(sourceFile).includes("locale === 'zh'")) {
            const translated = translateExperienceText('en', sample, generatedEnglish)
            if (hasHan(translated)) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
              failures.push(`${file}:${line} ${sample}`)
            }
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
      await setImmediate()
    }
    expect(failures).toEqual([])
  }, 60_000)

  it('keeps raw Chinese out of experience JSX and Canvas labels', async () => {
    const failures: Array<string> = []
    const files = collectExperienceSources()
    for (const file of files) {
      const path = resolve(experienceDirectory, file)
      const source = readFileSync(path, 'utf8')
      const sourceFile = parseExperienceSource(file, source)
      const visit = (node: ts.Node) => {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
        if (ts.isJsxText(node) && hasHan(node.text)) failures.push(`${file}:${line} raw JSX text`)
        if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && hasHan(node.initializer.text)) {
          failures.push(`${file}:${line} raw JSX attribute`)
        }
        if (
          ts.isCallExpression(node)
          && ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === 'fillText'
        ) {
          const label = node.arguments[0]
          const translated = label
            && ts.isCallExpression(label)
            && ts.isIdentifier(label.expression)
            && canvasTranslatorNames.has(label.expression.text)
          if (label && hasHan(label.getText(sourceFile)) && !translated) failures.push(`${file}:${line} untranslated Canvas label`)
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
      await setImmediate()
    }
    expect(failures).toEqual([])
  }, 60_000)
})
