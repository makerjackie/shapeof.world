import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
function savedTheme(): Theme | null {
  try { const value = localStorage.getItem('music.theme'); if (value === 'light' || value === 'dark') return value } catch { /* Use the system appearance. */ }
  return null
}
export function useTheme() {
  const [preference, setPreference] = useState(savedTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const theme: Theme = preference ?? (systemDark ? 'dark' : 'light')
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151716' : '#f6f3eb')
  }, [theme])
  return { theme, toggleTheme: () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setPreference(next)
    try { localStorage.setItem('music.theme', next) } catch { /* Retain this visit's choice. */ }
  } }
}
