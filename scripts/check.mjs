import { spawnSync, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { checkStages, selectCheckScope, productionIdentity } from './lib/check-plan.mjs'

const flags = process.argv.slice(2)
if (flags.some((flag) => !['--production', '--plan'].includes(flag))) throw new Error('Use check [--production] [--plan]')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
let scope = 'full', baseline = null, changes = [], reason = 'Full check requested'
if (flags.includes('--production')) {
  try {
    if (git('status', '--porcelain')) throw new Error('Worktree is not clean')
    const response = await fetch('https://shapeof.world/api/health', { signal: AbortSignal.timeout(10000), cache: 'no-store' })
    if (!response.ok) throw new Error(`Production health HTTP ${response.status}`)
    const health = await response.json()
    const { commit, tag } = productionIdentity(health)
    if (git('rev-parse', `${tag}^{commit}`) !== commit) throw new Error('Production tag differs from source commit')
    git('merge-base', '--is-ancestor', commit, 'HEAD')
    baseline = commit
    changes = git('diff', '--name-status', '--no-renames', commit, 'HEAD').split('\n').filter(Boolean).map((line) => {
      const [status, path] = line.split('\t'); return { status, path }
    })
    scope = selectCheckScope(changes, true)
    reason = 'Full checks required by changed paths'
  } catch (error) { reason = `Full fallback: ${error.message}` }
}
const stages = checkStages(scope)
// Under `pnpm check`, run the same pnpm through node: on Windows a bare `pnpm`
// is a .cmd shim that spawnSync cannot start without a shell.
const pnpm = process.env.npm_execpath ? [process.execPath, process.env.npm_execpath] : ['pnpm']
console.log(JSON.stringify({ scope, baseline, reason, stages: stages.map(([name]) => name) }))
if (flags.includes('--plan')) process.exit(0)
mkdirSync('.local/checks', { recursive: true })
const started = performance.now()
const report = { head: git('rev-parse', 'HEAD'), scope, baseline, reason, startedAt: new Date().toISOString(), stages: [] }
const reportPath = `.local/checks/${Date.now()}-${scope}.json`
for (const [name, args] of stages) {
  const start = performance.now()
  console.log(`\n[check] ${name}`)
  const result = spawnSync(pnpm[0], [...pnpm.slice(1), ...args], { stdio: 'inherit', env: process.env })
  const seconds = Number(((performance.now() - start) / 1000).toFixed(2))
  report.stages.push({ name, seconds, status: result.status ?? 1 })
  report.seconds = Number(((performance.now() - started) / 1000).toFixed(2))
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`[check] ${name}: ${seconds}s; report: ${reportPath}`)
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log(`[check] ${scope} passed in ${report.seconds}s; report: ${reportPath}`)
