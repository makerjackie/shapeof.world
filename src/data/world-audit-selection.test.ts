import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { it } from 'vitest'

// Keep the standalone CLI regression suite inside the normal pnpm test gate.
it('runs the world-audit selection and argument regression suite', () => {
  execFileSync(process.execPath, [
    '--test',
    resolve(import.meta.dirname, '../../scripts/world-audit-selection.test.mjs'),
  ], { encoding: 'utf8', timeout: 10_000 })
})
