import { useState } from 'react'
import { useI18n } from '~/i18n'

export function DownloadAudio({ url, filename, label }: { url: string; filename: string; label: string }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const download = async () => {
    setBusy(true)
    setFailed(false)
    try {
      // Playback can populate the browser cache with a non-CORS response.
      const response = await fetch(url, { cache: 'reload' })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Audio unavailable')
      const blobUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
    } catch (error) {
      console.warn('[music] Audio download failed', error)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return <span>
    <button className="btn-ghost" type="button" disabled={busy} onClick={() => void download()}>{busy ? t('track.downloading') : label}</button>
    {failed ? <span role="status">{t('track.downloadFailed')}</span> : null}
  </span>
}
