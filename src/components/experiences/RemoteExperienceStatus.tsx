import type {ReactNode} from 'react'
import {useEffect, useState} from 'react'

import {trackEvent} from '~/lib/analytics'
import { useExperienceI18n } from '~/i18n/experience'

export function RemoteExperienceStatus({
  ready,
  loadingLabel,
  worldId,
  sourceUrl,
  timeoutMs = 12_000,
  className,
  loadingContent,
  failed = false,
}: {
  ready: boolean
  loadingLabel: string
  worldId: string
  sourceUrl?: string
  timeoutMs?: number
  className?: string
  loadingContent?: ReactNode
  failed?: boolean
}) {
  const tx = useExperienceI18n()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (ready || failed) {
      setTimedOut(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setTimedOut(true)
      trackEvent({event: 'experience_load_timeout', worldId})
    }, timeoutMs)
    return () => window.clearTimeout(timeout)
  }, [failed, ready, timeoutMs, worldId])

  if (ready) return null

  const unavailable = failed || timedOut
  const classes = ['oss-loading', unavailable ? 'is-timeout' : '', className ?? ''].filter(Boolean).join(' ')

  return (
    <div className={classes} role={unavailable ? 'alert' : 'status'}>
      {unavailable ? (
        <div className="oss-loading-timeout">
          <strong>{tx("这个世界暂时没有打开")}</strong>
          <p>{tx("可能是网络较慢或外部资料服务暂时不可用。你可以重试，也可以先查看原始资料。")}</p>
          <div>
            <button type="button" onClick={() => window.location.reload()}>{tx("重新连接")}</button>
            {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">{tx("查看原始资料")}</a> : null}
          </div>
        </div>
      ) : loadingContent ?? loadingLabel}
    </div>
  )
}
