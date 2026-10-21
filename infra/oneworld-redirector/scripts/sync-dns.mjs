import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const isDryRun = process.argv.includes('--dry-run')
const token = process.env.CLOUDFLARE_API_TOKEN
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID

if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not configured.')
if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured.')

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const redirects = JSON.parse(await readFile(resolve(projectRoot, 'data/redirects.json'), 'utf8'))
const config = JSON.parse(await readFile(resolve(projectRoot, 'wrangler.jsonc'), 'utf8'))
const apiRoot = 'https://api.cloudflare.com/client/v4'

async function cloudflare(pathname, init = {}) {
  const response = await fetch(`${apiRoot}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const payload = await response.json()
  if (!response.ok || !payload.success) {
    const detail = payload.errors?.map((error) => error.message).join('; ') || response.statusText
    throw new Error(`Cloudflare API request failed: ${detail}`)
  }
  return payload.result
}

for (const redirect of redirects) {
  const hostname = String(redirect.source).trim().toLowerCase()
  const route = config.routes.find((candidate) => candidate.pattern.replace(/\/\*$/, '') === hostname)
  if (route?.custom_domain) {
    console.log(`${hostname}: DNS managed by Worker custom domain.`)
    continue
  }
  if (!route?.zone_name) throw new Error(`Missing zone_name route for ${hostname}.`)

  const zones = await cloudflare(`/zones?name=${encodeURIComponent(route.zone_name)}&status=active`)
  if (zones.length !== 1) throw new Error(`Expected one active zone for ${route.zone_name}.`)
  const zoneId = zones[0].id
  const records = await cloudflare(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`)
  const desired = {
    type: 'AAAA',
    name: hostname,
    content: '100::',
    proxied: true,
    ttl: 1,
    comment: 'Originless hostname for the OneWorld redirect Worker',
  }

  if (records.length > 1) throw new Error(`Multiple DNS records already exist for ${hostname}.`)
  const current = records[0]
  const isCurrent = current
    && current.type === desired.type
    && current.content === desired.content
    && current.proxied === desired.proxied

  if (isCurrent) {
    console.log(`${hostname}: DNS already configured.`)
    continue
  }
  if (isDryRun) {
    console.log(`${hostname}: would ${current ? 'replace' : 'create'} proxied AAAA ${desired.content}.`)
    continue
  }

  if (current) {
    await cloudflare(`/zones/${zoneId}/dns_records/${current.id}`, {
      method: 'PUT',
      body: JSON.stringify(desired),
    })
    console.log(`${hostname}: replaced existing DNS record.`)
  } else {
    await cloudflare(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(desired),
    })
    console.log(`${hostname}: created proxied DNS record.`)
  }
}
