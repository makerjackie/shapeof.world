import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '~/i18n/index'
import { PROGRESS_DELAY_MS, type LoadProgress } from '~/lib/world-load-progress'
import './WorldLoadProgress.css'

export function useProgressVisible(active = true) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    if (!active) return
    const timer = window.setTimeout(() => setVisible(true), PROGRESS_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active])
  return active && visible
}

export function WorldLoadProgress({ loaded, total, label }: LoadProgress & { label: string }) {
  const { t } = useI18n()
  const known = total !== undefined && total > 0
  const ratio = known ? Math.min(1, Math.max(0, loaded / total)) : undefined
  const values = { loaded: (loaded / 1_000_000).toFixed(2), total: ((total ?? 0) / 1_000_000).toFixed(2) }
  return (
    <div className="world-load-progress" data-loaded={loaded} data-total={total}>
      <div className="world-load-progress-caption">
        <span>{label}</span>
        <span className="world-load-progress-bytes">{t(known ? 'experience.progress.bytesTotal' : 'experience.progress.bytes', values)}</span>
      </div>
      <div className={`world-load-progress-track${known ? '' : ' is-indeterminate'}`} role="progressbar"
        aria-label={label} aria-valuemin={known ? 0 : undefined} aria-valuemax={known ? total : undefined}
        aria-valuenow={known ? Math.min(loaded, total) : undefined}>
        <span style={ratio === undefined ? undefined : { transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  )
}

type AssetProgress = LoadProgress & { label?: string }
type Report = (key: string, progress?: AssetProgress) => void
const AssetProgressContext = createContext<Report | null>(null)

/** Mounted resources are opt-in. Independent consumers have independent lifetimes. */
export function WorldLoadProgressProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [tasks, setTasks] = useState<Record<string, AssetProgress>>({})
  const report = useCallback<Report>((key, progress) => {
    setTasks((current) => {
      const next = { ...current }
      if (progress) next[key] = progress
      else delete next[key]
      return next
    })
  }, [])
  const entries = Object.values(tasks)
  const visible = useProgressVisible(entries.length > 0)
  const loaded = entries.reduce((sum, task) => sum + task.loaded, 0)
  const total = entries.every((task) => task.total !== undefined) ? entries.reduce((sum, task) => sum + task.total!, 0) : undefined
  return (
    <AssetProgressContext.Provider value={report}>
      {children}
      {visible && <div className="world-load-progress-overlay">
        <WorldLoadProgress loaded={loaded} total={total} label={entries.at(-1)?.label ?? t('experience.progress.assets')} />
      </div>}
    </AssetProgressContext.Provider>
  )
}

/** Call finish only when the resource is usable, including any decoding/setup. */
export function useWorldLoadProgress() {
  const reportTask = useContext(AssetProgressContext)
  const id = useId()
  if (!reportTask) throw new Error('useWorldLoadProgress requires WorldLoadProgressProvider')
  useEffect(() => () => reportTask(id), [id, reportTask])
  return useMemo(() => ({
    report: (progress: AssetProgress) => reportTask(id, {
      ...progress,
      loaded: Number.isFinite(progress.loaded) ? Math.max(0, progress.loaded) : 0,
      total: progress.total !== undefined && Number.isFinite(progress.total) && progress.total > 0 ? progress.total : undefined,
    }),
    finish: () => reportTask(id),
  }), [id, reportTask])
}
