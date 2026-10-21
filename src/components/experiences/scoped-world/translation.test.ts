import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { createWorldTranslator } from './translation'

const ids = ['earth-and-nature', 'vegetation-atlas']
const han = /[\u3400-\u9fff]/u

describe('imported world bilingual coverage', () => {
  for (const id of ids) it(`${id}: English covers templates, canvas copy and static controls`, () => {
    const base = resolve('src/components/experiences/worlds', id)
    const labels = JSON.parse(readFileSync(resolve('src/i18n/experience-en-overrides', `${id}.json`), 'utf8'))
    const copy = JSON.parse(readFileSync(resolve(base, 'content.en.json'), 'utf8'))
    const translate = createWorldTranslator('en', { ...copy, ...labels })
    const source = readFileSync(resolve(base, 'runtime.js'), 'utf8')
    const ast = ts.createSourceFile('runtime.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const untranslated: string[] = []
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        if (han.test(translate(node.text))) untranslated.push(node.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    const template = document.createElement('template')
    template.innerHTML = translate(readFileSync(resolve(base, 'stage.html'), 'utf8'))
    expect(template.content.textContent).not.toMatch(han)
    template.content.querySelectorAll('[title],[aria-label],[placeholder]').forEach(element => {
      for (const attr of ['title', 'aria-label', 'placeholder']) expect(element.getAttribute(attr) ?? '').not.toMatch(han)
    })
    const css = readFileSync(resolve(base, 'styles/stage.css'), 'utf8')
    for (const match of css.matchAll(/content:\s*(['"])(.*?)\1/gu)) expect(translate(match[2])).not.toMatch(han)
    expect(untranslated).toEqual([])
    expect(Object.values({ ...copy, ...labels }).every(value => typeof value === 'string' && !han.test(value))).toBe(true)
    expect(createWorldTranslator('zh', labels)('三维探索')).toBe('三维探索')
  })
})

it('preserves content for runtimes that already own bilingual dictionaries', () => {
  expect(createWorldTranslator('en', {})('<button>FrontScope</button>')).toBe('<button>FrontScope</button>')
})
