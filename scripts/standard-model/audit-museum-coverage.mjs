#!/usr/bin/env node
/**
 * Offline audit for the Standard Model museum's reviewed PDG snapshot.
 *
 * This deliberately does not fetch URLs. It checks the snapshot, retained raw
 * responses, units/limits, edition identity, and the 17-particle coverage.
 * Use a separate link checker when reviewing external availability.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'src/components/experiences/worlds/standard-model/museum-data')
const snapshotPath = path.join(dataDir, 'snapshot.json')
const expected = {
  u: 'Q002', d: 'Q001', c: 'Q004', s: 'Q003', t: 'Q007', b: 'Q005',
  e: 'S003', mu: 'S004', tau: 'S035', ve: 'S066MNE', vmu: 'S066MNM', vtau: 'S066MNT',
  gamma: 'S000', gluon: null, w: 'S043', z: 'S044', higgs: 'S126',
}
const property = {
  u: 'Q002M', d: 'Q001M', c: 'Q004M', s: 'Q003M', t: 'Q007TP', b: 'Q005M',
  e: 'S003M', mu: 'S004M', tau: 'S035M', ve: 'S066MNE', vmu: 'S066MNM', vtau: 'S066MNT',
  gamma: 'S000M', w: 'S043M', z: 'S044M', higgs: 'S126M',
}
const lifetime = { mu: 'S004T', tau: 'S035T' }
const ids = Object.keys(expected)
const errors = []
const warnings = []
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const fail = message => errors.push(message)

let snapshot
try { snapshot = readJson(snapshotPath) } catch (error) { fail(`cannot read snapshot: ${error.message}`) }
if (snapshot) {
  if (snapshot.schemaVersion !== 2) fail(`schemaVersion=${snapshot.schemaVersion}, expected 2`)
  if (snapshot.edition !== '2024') fail(`snapshot edition=${snapshot.edition}, expected 2024`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.generatedAt ?? '')) fail('generatedAt is not an ISO calendar date')
  if (snapshot.license !== 'CC BY 4.0') fail(`snapshot license=${snapshot.license}, expected CC BY 4.0`)
  if (snapshot.source !== 'https://pdgapi.lbl.gov/doc/restapi.html') fail('snapshot source is not the PDG API documentation')
  const records = snapshot.records ?? {}
  const actual = Object.keys(records)
  for (const id of ids) {
    const record = records[id]
    if (!record) { fail(`${id}: missing record`); continue }
    for (const key of ['mass', 'massEn', 'lifetime', 'lifetimeEn', 'sourceUrl', 'edition']) {
      if (typeof record[key] !== 'string' || record[key].length === 0) fail(`${id}.${key}: missing non-empty string`)
    }
    if (record.edition !== 'PDG Review 2024') fail(`${id}: record edition is ${record.edition}`)
    if (!/^https:\/\/pdg(?:api)?\.lbl\.gov\//.test(record.sourceUrl)) fail(`${id}: source URL is not PDG HTTPS URL`)
    if (id !== 'gluon' && !record.sourceUrl.endsWith('/2024')) fail(`${id}: source URL does not identify /2024`)
    if (record.mass.includes('±') && !record.mass.includes('c²')) fail(`${id}: mass uncertainty has no c² unit`)
    if (/^</.test(record.mass) && !record.mass.includes('实验上限') && !record.massEn.includes('experimental upper limit')) fail(`${id}: limit is not labelled as a limit`)
    if (['ve', 'vmu', 'vtau'].includes(id) && (!record.mass.includes('质量本征态') || !record.massEn.includes('mass eigenstate'))) fail(`${id}: flavour state must not have a single mass`)
    if (record.lifetime !== '未列出' && !record.lifetime.endsWith('s')) fail(`${id}: lifetime is not expressed in seconds`)
    if (record.sourceStatus === 'unavailable' && id !== 'gluon' && !['ve', 'vmu', 'vtau'].includes(id)) warnings.push(`${id}: unavailable source status`)
  }
  for (const id of actual) if (!Object.hasOwn(expected, id)) fail(`unexpected record: ${id}`)
  if (actual.length !== ids.length) fail(`record count=${actual.length}, expected ${ids.length}`)
}

for (const id of ids) {
  const rawPath = path.join(dataDir, 'raw', `${id}.json`)
  let raw
  try { raw = readJson(rawPath) } catch (error) { fail(`${id}: cannot read raw response: ${error.message}`); continue }
  const pdgId = expected[id]
  if (id === 'gluon') {
    if (raw.status_code !== 0 || raw.request_url !== 'https://pdg.lbl.gov/2024/listings/particle_properties.html') fail('gluon: expected explicit unavailable PDG listing record')
    continue
  }
  if (raw.status_code !== 200) fail(`${id}: raw status_code=${raw.status_code}`)
  if (raw.pdgid !== `${pdgId}/2024`) fail(`${id}: raw identity=${raw.pdgid}, expected ${pdgId}/2024`)
  if (!/^\d{4}-\d{2}-\d{2} /.test(raw.request_timestamp ?? '')) fail(`${id}: raw response has no acquisition timestamp`)
  const props = raw.summaries?.properties ?? []
  const expectedProperty = property[id]
  if (!['ve', 'vmu', 'vtau'].includes(id) && !props.some(item => item.pdgid === `${expectedProperty}/2024`)) fail(`${id}: missing selected property ${expectedProperty}/2024`)
  if (lifetime[id] && !props.some(item => item.pdgid === `${lifetime[id]}/2024`)) fail(`${id}: missing selected lifetime ${lifetime[id]}/2024`)
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} error(s)`)
  for (const item of errors) console.error(`- ${item}`)
  process.exitCode = 1
} else {
  console.log(`OK: ${ids.length} records; PDG Review 2024 snapshot and retained raw identities pass`)
}
for (const item of warnings) console.warn(`WARN: ${item}`)
