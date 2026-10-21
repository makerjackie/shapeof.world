/** Selection consumes resolved states; it never creates a second publication list. */
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function parseSmokeArguments(args) {
  let only = null
  let strictResources = false
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--strict-resources') {
      strictResources = true
      continue
    }
    if (argument === '--only' || argument.startsWith('--only=')) {
      if (only !== null) throw new Error('--only may be supplied once')
      const value = argument === '--only' ? args[++index] : argument.slice('--only='.length)
      if (!value || value.startsWith('--')) throw new Error('--only requires comma-separated world ids')
      only = value.split(',').map((id) => id.trim())
      if (only.some((id) => !WORLD_ID.test(id))) throw new Error('Invalid world id in --only')
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }
  return { only, strictResources }
}

export function selectAuditWorldIds(entries, only = null, { includeMaking = false } = {}) {
  if (includeMaking && only === null) throw new Error('--include-making requires an explicit --only selection')
  const ids = new Set()
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || !WORLD_ID.test(entry.id)) {
      throw new Error('Catalog contains an invalid world id')
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate world id: ${entry.id}`)
    ids.add(entry.id)
  }
  const eligibleIds = entries
    .filter((entry) => entry.state === 'public' || (includeMaking && entry.state === 'making'))
    .map((entry) => entry.id)
  if (only !== null) {
    if (!Array.isArray(only) || only.length === 0 || only.some((id) => !WORLD_ID.test(id))) {
      throw new Error('An explicit selection must contain valid world ids')
    }
    const available = new Set(eligibleIds)
    const unavailable = [...new Set(only.filter((id) => !available.has(id)))]
    if (unavailable.length) throw new Error(`${includeMaking ? 'Unknown or unavailable' : 'Unknown or non-public'} world(s): ${unavailable.join(', ')}`)
  }
  const requested = only === null ? null : new Set(only)
  const selected = eligibleIds.filter((id) => requested === null || requested.has(id))
  if (selected.length === 0) throw new Error('No public worlds selected; refusing an empty successful audit')
  return selected
}

export function smokeBudget(environment) {
  const settle = Number(environment.SETTLE ?? 9000)
  const concurrency = Number(environment.CONCURRENCY ?? 3)
  if (!Number.isFinite(settle) || settle < 0) throw new Error('SETTLE must be a non-negative finite number')
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error('CONCURRENCY must be an integer from 1 to 16')
  }
  return { settle, concurrency }
}
