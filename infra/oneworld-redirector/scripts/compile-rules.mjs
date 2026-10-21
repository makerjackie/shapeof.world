import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceFile = resolve(projectRoot, 'data/redirects.json')
const outputFile = resolve(projectRoot, 'data/redirects.compiled.json')
const rules = JSON.parse(await readFile(sourceFile, 'utf8'))

const compiled = rules.map((rule) => {
  const source = String(rule.source ?? '').trim().toLowerCase()
  const destination = new URL(rule.destination)
  const status = Number(rule.status ?? 308)

  if (!source || source.includes('/') || source.includes(':')) {
    throw new Error(`Invalid redirect source hostname: ${rule.source}`)
  }
  if (destination.protocol !== 'https:') {
    throw new Error(`Redirect destination must use HTTPS: ${rule.destination}`)
  }
  if (![301, 302, 307, 308].includes(status)) {
    throw new Error(`Unsupported redirect status: ${status}`)
  }

  return {
    source,
    destination: destination.origin,
    status,
  }
})

await writeFile(outputFile, `${JSON.stringify(compiled, null, 2)}\n`)
console.log(`Compiled ${compiled.length} redirect rule${compiled.length === 1 ? '' : 's'}.`)
