import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Keep a deliberately strict regression budget below Cloudflare's platform
// limit while leaving room for the server-side catalogue and SEO metadata.
const budgetKib = Number(process.env.ONEWORLD_WORKER_GZIP_BUDGET_KIB ?? '1184')
if (!Number.isFinite(budgetKib) || budgetKib <= 0) {
  throw new Error('ONEWORLD_WORKER_GZIP_BUDGET_KIB must be a positive number')
}

const outputDirectory = mkdtempSync(join(tmpdir(), 'oneworld-worker-bundle-'))
const wranglerBin = resolve('node_modules/wrangler/bin/wrangler.js')

try {
  const result = spawnSync(
    process.execPath,
    [wranglerBin, 'deploy', '--dry-run', '--outdir', outputDirectory],
    { encoding: 'utf8', env: process.env },
  )
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  process.stdout.write(output)

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
  } else {
    const match = output.match(/Total Upload:\s+[\d.]+\s+KiB\s+\/\s+gzip:\s+([\d.]+)\s+KiB/i)
    if (!match) throw new Error('Could not read the gzip size from Wrangler dry-run output')

    const gzipKib = Number(match[1])
    if (gzipKib > budgetKib) {
      throw new Error(
        `Worker gzip bundle is ${gzipKib.toFixed(2)} KiB; budget is ${budgetKib.toFixed(2)} KiB. `
        + 'Keep experience renderers and browser engines behind the client-only boundary.',
      )
    }
    console.log(`Worker bundle budget passed: ${gzipKib.toFixed(2)} / ${budgetKib.toFixed(2)} KiB gzip`)
  }
} finally {
  rmSync(outputDirectory, { recursive: true, force: true })
}
