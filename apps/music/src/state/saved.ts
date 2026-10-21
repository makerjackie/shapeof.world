import { useSyncExternalStore } from 'react'

const key = 'music.saved'
let ids: string[] = []
try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(stored)) ids = stored.filter((id): id is string => typeof id === 'string') } catch { /* Storage may be unavailable. */ }
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const snapshot = () => ids
export function useSaved() {
  const saved = useSyncExternalStore(subscribe, snapshot)
  return { saved, toggleSaved: (id: string) => {
    ids = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]
    try { localStorage.setItem(key, JSON.stringify(ids)) } catch { /* Keep this session usable. */ }
    listeners.forEach(listener => listener())
  } }
}
