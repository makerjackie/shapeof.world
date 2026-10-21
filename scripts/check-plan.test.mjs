import test from 'node:test'
import assert from 'node:assert/strict'
import { selectCheckScope, checkStages, productionIdentity } from './lib/check-plan.mjs'
const change = (path, status = 'M') => ({ path, status })

test('every change takes the full lane', () => {
  assert.equal(selectCheckScope([change('src/lib/locale.ts')], true), 'full')
  assert.equal(selectCheckScope([change('src/server.ts', 'A')], false), 'full')
  assert.equal(selectCheckScope([], true), 'full')
})

test('the full lane keeps generate, type, build, script and deployment gates without duplicate stages', () => {
  const names = checkStages('full').map(([name]) => name)
  assert.equal(new Set(names).size, names.length)
  for (const name of ['generate', 'typecheck', 'pipeline-tests', 'tests', 'scripts', 'web-build', 'client-budget', 'worker-types', 'worker-budget']) {
    assert.ok(names.includes(name), name)
  }
})

test('production identity rejects unhealthy, preview, malformed and mismatched release metadata', () => {
  const valid = {status:'ok',release:{channel:'production',version:'2026.09.23.6',commit:'a'.repeat(40)},version:{tag:'web-v2026.09.23.6'}}
  assert.deepEqual(productionIdentity(valid), {commit:'a'.repeat(40),tag:'web-v2026.09.23.6'})
  for (const invalid of [{}, {...valid,status:'error'}, {...valid,release:{...valid.release,channel:'local'}}, {...valid,release:{...valid.release,commit:'HEAD'}}, {...valid,version:{tag:'web-v2026.09.23.5'}}]) {
    assert.throws(() => productionIdentity(invalid), /Unverified/)
  }
})
