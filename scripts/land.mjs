// Land the current worktree branch on main: rebase onto main, run the check,
// then fast-forward main in its own checkout. A session finishes its work with
// `pnpm land` instead of asking someone to merge branches by hand.
//
//   pnpm land                 rebase, check, fast-forward main
//   pnpm land --skip-check    for docs-only changes
//   pnpm land --push          also push main to origin
import { execFileSync, spawnSync } from 'node:child_process'

const flags = process.argv.slice(2)
if (flags.some((flag) => !['--skip-check', '--push'].includes(flag))) fail('Use land [--skip-check] [--push]')

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function tryGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() }
}
function fail(message) {
  console.error(`[land] ${message}`)
  process.exit(1)
}

const branch = git(['branch', '--show-current'])
if (!branch || branch === 'main') fail('Run pnpm land from a worktree branch. Work on main is committed there directly.')
if (git(['status', '--porcelain', '--untracked-files=no'])) fail('Commit or discard your changes first.')

const mainCheckout = git(['worktree', 'list', '--porcelain'])
  .split(/\n\n+/)
  .map((block) => Object.fromEntries(block.split('\n').map((line) => {
    const space = line.indexOf(' ')
    return space < 0 ? [line, true] : [line.slice(0, space), line.slice(space + 1)]
  })))
  .find((tree) => tree.branch === 'refs/heads/main')?.worktree
if (!mainCheckout) fail('No checkout has main checked out.')

// Pick up anything already pushed, as long as main only moves forward.
if (tryGit(['fetch', '--quiet', 'origin', 'main']).ok
  && tryGit(['merge-base', '--is-ancestor', 'main', 'origin/main']).ok) {
  tryGit(['merge', '--ff-only', '--quiet', 'origin/main'], mainCheckout)
}

const rebase = tryGit(['rebase', 'main'])
if (!rebase.ok) {
  console.error(rebase.output)
  fail('Rebase onto main stopped on a conflict. Resolve it, run `git rebase --continue`, then run pnpm land again.')
}

if (!flags.includes('--skip-check')) {
  const check = spawnSync(process.execPath, ['scripts/check.mjs'], { stdio: 'inherit', env: process.env })
  if (check.status !== 0) fail('The check failed; main is unchanged.')
}

const commits = git(['rev-list', '--count', `main..${branch}`])
// Fast-forward only: if main moved during the check, or main's checkout has
// uncommitted edits to the same files, this refuses and nothing changes.
const merge = tryGit(['merge', '--ff-only', branch], mainCheckout)
if (!merge.ok) {
  console.error(merge.output)
  fail('main could not fast-forward (it moved, or its checkout has edits to these files). Run pnpm land again.')
}
console.log(`[land] ${branch}: ${commits} commit(s) now on main.`)

if (flags.includes('--push')) {
  const push = tryGit(['push', 'origin', 'main'], mainCheckout)
  if (!push.ok) fail(`Push failed:\n${push.output}`)
  console.log('[land] Pushed main to origin.')
}
