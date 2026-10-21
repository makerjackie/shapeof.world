import { particleIds } from './particle-data'

const key = 'oneworld:standard-model:collection:v1'

export function readCollection(): Set<string> {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
		return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string' && particleIds.includes(v as never)) : [])
	} catch {
		return new Set()
	}
}

export function writeCollection(values: Set<string>) {
	try {
		localStorage.setItem(key, JSON.stringify([...values]))
	} catch {
		/* Collection remains usable for this visit when storage is unavailable. */
	}
}

// Explicitly saved cards are separate from the earlier viewed-particle record.
const museumKey = 'oneworld:standard-model:cards:v1'
export function readMuseumCollection(): Set<string> {
 try { const raw: unknown=JSON.parse(localStorage.getItem(museumKey)??'[]');return new Set(Array.isArray(raw)?raw.filter((id):id is string=>typeof id==='string'&&particleIds.includes(id as never)):[]) } catch { return new Set() }
}
export function writeMuseumCollection(values: Set<string>) {
 try { localStorage.setItem(museumKey,JSON.stringify([...values])) } catch { /* This visit still retains its collection in memory. */ }
}
