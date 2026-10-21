import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const clientRoot = resolve('dist/client')
const assetsRoot = join(clientRoot, 'assets')
const kib = 1024
const mib = kib * kib
const maxAssetBytes = 25 * mib
const maxJavaScriptGzipBytes = Number(process.env.ONEWORLD_CLIENT_CHUNK_GZIP_BUDGET_KIB ?? '1400') * kib
const maxAppCssGzipBytes = Number(process.env.ONEWORLD_APP_CSS_GZIP_BUDGET_KIB ?? '25') * kib
const maxExperienceRuntimeGzipBytes = 32 * kib

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

const failures = []
const compressedAssets = []

for (const path of walk(clientRoot)) {
  const bytes = statSync(path).size
  const name = relative(clientRoot, path)
  if (bytes > maxAssetBytes) {
    failures.push(`${name} is ${(bytes / mib).toFixed(2)} MiB; Cloudflare Pages assets must stay at or below 25 MiB`)
  }
}

for (const path of walk(assetsRoot)) {
  if (!/\.(?:css|js)$/u.test(path)) continue
  const gzipBytes = gzipSync(readFileSync(path), { level: 9 }).byteLength
  const name = relative(assetsRoot, path)
  compressedAssets.push({ name, gzipBytes })

  if (name.endsWith('.js') && gzipBytes > maxJavaScriptGzipBytes) {
    failures.push(`${name} is ${(gzipBytes / kib).toFixed(1)} KiB gzip; JavaScript chunk budget is ${maxJavaScriptGzipBytes / kib} KiB`)
  }
  if (/^app-.*\.css$/u.test(name) && gzipBytes > maxAppCssGzipBytes) {
    failures.push(`${name} is ${(gzipBytes / kib).toFixed(1)} KiB gzip; global CSS budget is ${maxAppCssGzipBytes / kib} KiB`)
  }
  if (/^experience-.*\.js$/u.test(name) && gzipBytes > maxExperienceRuntimeGzipBytes) {
    failures.push(`${name} is ${(gzipBytes / kib).toFixed(1)} KiB gzip; the shared experience runtime must not contain the master dictionary`)
  }
}

const heavy = compressedAssets
  .filter(({ gzipBytes }) => gzipBytes >= 200 * kib)
  .sort((left, right) => right.gzipBytes - left.gzipBytes)

console.log('Largest lazy client chunks:')
for (const asset of heavy) console.log(`  ${(asset.gzipBytes / kib).toFixed(1)} KiB gzip  ${asset.name}`)

if (failures.length > 0) {
  throw new Error(`Client asset budgets failed:\n- ${failures.join('\n- ')}`)
}
console.log('Client asset budgets passed.')
