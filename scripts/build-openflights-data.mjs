import {writeFile} from 'node:fs/promises'

const airportsUrl = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat'
const routesUrl = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat'
const outputPath = new URL('../public/assets/flow/global-routes.json', import.meta.url)

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += character
    }
  }

  values.push(value)
  return values
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`)
  return response.text()
}

const [airportText, routeText] = await Promise.all([
  fetchText(airportsUrl),
  fetchText(routesUrl),
])

const airports = new Map(airportText.trim().split('\n').map((line) => {
  const row = parseCsvLine(line)
  return [row[0], {
    id: row[0],
    name: row[1],
    city: row[2],
    country: row[3],
    code: row[4] === '\\N' ? row[5] : row[4],
    lat: Number(row[6]),
    lon: Number(row[7]),
  }]
}))

const routeCounts = new Map()
const airportTotals = new Map()

for (const line of routeText.trim().split('\n')) {
  const row = parseCsvLine(line)
  const origin = row[3]
  const destination = row[5]
  if (origin === '\\N' || destination === '\\N' || origin === destination) continue
  if (!airports.has(origin) || !airports.has(destination)) continue

  const [first, second] = [origin, destination].sort((left, right) => Number(left) - Number(right))
  const key = `${first}:${second}`
  routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1)
  airportTotals.set(origin, (airportTotals.get(origin) ?? 0) + 1)
  airportTotals.set(destination, (airportTotals.get(destination) ?? 0) + 1)
}

const selectedIds = new Set([...airportTotals.entries()]
  .sort((left, right) => right[1] - left[1])
  .slice(0, 220)
  .map(([id]) => id))

const flows = [...routeCounts.entries()]
  .map(([key, count]) => {
    const [origin, dest] = key.split(':')
    return {origin, dest, count}
  })
  .filter((flow) => selectedIds.has(flow.origin) && selectedIds.has(flow.dest))
  .sort((left, right) => right.count - left.count)
  .slice(0, 1800)

const usedIds = new Set(flows.flatMap((flow) => [flow.origin, flow.dest]))
const locations = [...usedIds]
  .map((id) => ({...airports.get(id), routes: airportTotals.get(id)}))
  .sort((left, right) => right.routes - left.routes)

await writeFile(outputPath, `${JSON.stringify({
  generatedFrom: 'OpenFlights historical route database snapshot (June 2014)',
  license: 'ODbL-1.0 / DbCL-1.0',
  locations,
  flows,
})}\n`)

console.log(`Wrote ${locations.length} airports and ${flows.length} aggregated routes to ${outputPath.pathname}`)
