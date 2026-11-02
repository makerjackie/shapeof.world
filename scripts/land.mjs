// Land the current worktree branch on main and push it. Two computers (the
// MacBook and the Mac mini) make films in their own checkouts and share one
// main through GitHub, so every land first picks up what the other computer
// pushed, then rebases onto main, runs the check, fast-forwards main in its own
// checkout and pushes. A session finishes its work with `pnpm land` instead of
// asking someone to merge branches by hand.
//
//   pnpm land                 sync, rebase, check, fast-forward main, push
//   pnpm land --skip-check    for docs-only changes
//   pnpm land --no-push       keep main local (it goes up with the next land)
import { execFileSync, spawnSync } from 'node:child_process'

const flags = process.argv.slice(2)
// --push is the default now; still accepted so older prompts keep working.
if (flags.some((flag) => !['--skip-check', '--push', '--no-push'].includes(flag))) fail('Use land [--skip-check] [--no-push]')

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

// Pick up what the other computer pushed, as long as main only moves forward.
const fetched = tryGit(['fetch', '--quiet', 'origin', 'main']).ok
if (!fetched) console.warn('[land] Could not reach origin: landing on the local main only, without pushing.')
if (fetched && tryGit(['merge-base', '--is-ancestor', 'main', 'origin/main']).ok) {
  tryGit(['merge', '--ff-only', '--quiet', 'origin/main'], mainCheckout)
}

// --rebase-merges keeps a merge of origin/main from an earlier run intact.
const rebase = tryGit(['rebase', '--rebase-merges', 'main'])
if (!rebase.ok) {
  console.error(rebase.output)
  fail('Rebase onto main stopped on a conflict. Resolve it, run `git rebase --continue`, then run pnpm land again.')
}

// Both sides moved (this computer has commits that never went up, and the
// other one pushed): merge origin/main here so main can still fast-forward.
if (fetched && !tryGit(['merge-base', '--is-ancestor', 'origin/main', 'HEAD']).ok) {
  const merge = tryGit(['merge', '--no-edit', 'origin/main'])
  if (!merge.ok) {
    console.error(merge.output)
    fail("Merging origin/main (the other computer's work) stopped on a conflict. Resolve it, `git commit`, then run pnpm land again.")
  }
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

if (fetched && !flags.includes('--no-push')) {
  const push = tryGit(['push', 'origin', 'main'], mainCheckout)
  if (!push.ok) {
    console.error(push.output)
    fail('main landed here, but the push failed (the other computer may have just pushed). Run pnpm land again.')
  }
  console.log('[land] Pushed main to origin.')
}
