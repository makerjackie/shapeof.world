import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readStaticDefaultExport } from './lib/static-typescript-data.mjs'
import { parseSmokeArguments, selectAuditWorldIds, smokeBudget } from './lib/world-audit-selection.mjs'

const entries = [
  { id: 'human-atlas', state: 'public' },
  { id: 'light-well', state: 'public' },
  { id: 'draft-world', state: 'making' },
  { id: 'old-world', state: 'archived' },
  { id: 'failed-world', state: 'failed' },
  { id: 'blocked-world', state: 'rights-blocked' },
]

test('selects all and only resolved public worlds', () => {
  assert.deepEqual(selectAuditWorldIds(entries), ['human-atlas', 'light-well'])
})

test('an empty catalog or catalog without public entries fails closed', () => {
  assert.throws(() => selectAuditWorldIds([]), /empty successful audit/)
  assert.throws(() => selectAuditWorldIds(entries.slice(2)), /empty successful audit/)
})

test('unknown and non-public explicit selections are errors, not silent omissions', () => {
  for (const id of ['typo', 'draft-world', 'old-world', 'failed-world', 'blocked-world']) {
    assert.throws(() => selectAuditWorldIds(entries, ['light-well', id]), /Unknown or non-public/)
  }
  assert.throws(() => selectAuditWorldIds(entries, []), /valid world ids/)
})

test('making audits require an explicit opt-in and selection without changing publication', () => {
  const before = structuredClone(entries)
  assert.deepEqual(selectAuditWorldIds(entries, ['draft-world'], { includeMaking: true }), ['draft-world'])
  assert.deepEqual(selectAuditWorldIds(entries, ['draft-world', 'light-well'], { includeMaking: true }), ['light-well', 'draft-world'])
  assert.deepEqual(entries, before)
  assert.throws(() => selectAuditWorldIds(entries, null, { includeMaking: true }), /explicit --only/)
  for (const id of ['typo', 'old-world', 'failed-world', 'blocked-world']) {
    assert.throws(() => selectAuditWorldIds(entries, [id], { includeMaking: true }), /Unknown or unavailable/)
  }
})

test('duplicate catalog ids and malformed ids fail before a browser opens', () => {
  assert.throws(() => selectAuditWorldIds([...entries, entries[0]]), /Duplicate world id/)
  assert.throws(() => selectAuditWorldIds([{ id: '../unsafe', state: 'public' }]), /invalid world id/)
})

test('only accepts supported CLI forms, with deterministic catalog ordering', () => {
  assert.deepEqual(parseSmokeArguments(['--only', 'light-well,human-atlas']), {
    only: ['light-well', 'human-atlas'], strictResources: false,
  })
  const parsed = parseSmokeArguments(['--strict-resources', '--only=light-well, human-atlas'])
  assert.equal(parsed.strictResources, true)
  assert.deepEqual(selectAuditWorldIds(entries, parsed.only), ['human-atlas', 'light-well'])
})

test('rejects missing, malformed and duplicate selection flags', () => {
  for (const args of [['--only'], ['--only='], ['--only', '--strict-resources'], ['--only=a,,b'],
    ['--onlyFoo=a'], ['--only=a', '--only=b'], ['--only=../a']]) {
    assert.throws(() => parseSmokeArguments(args))
  }
})

test('never permits zero workers or invalid timing values', () => {
  assert.deepEqual(smokeBudget({}), { settle: 9000, concurrency: 3 })
  for (const value of ['0', '-1', 'NaN', 'Infinity', '1.5', '17']) {
    assert.throws(() => smokeBudget({ CONCURRENCY: value }), /CONCURRENCY/)
  }
  for (const value of ['-1', 'NaN', 'Infinity']) {
    assert.throws(() => smokeBudget({ SETTLE: value }), /SETTLE/)
  }
})


test('the actual catalog parser includes two-space and quoted-property entries', () => {
  const directory = mkdtempSync(join(tmpdir(), 'world-audit-'))
  try {
    const variants = [
      `export default {\n  id: 'human-atlas',\n  publication: 'public',\n} satisfies WorldExperience`,
      `export default ({\n\t"id": "human-atlas",\n\t"publication": "public"\n} as const)`,
      `export default {\n    id: 'human-atlas',\n    publication: 'public',\n}`,
    ]
    for (const [index, source] of variants.entries()) {
      const filename = join(directory, `${index}.ts`)
      writeFileSync(filename, source)
      assert.deepEqual(readStaticDefaultExport(filename), { id: 'human-atlas', publication: 'public' })
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
