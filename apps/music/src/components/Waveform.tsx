import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '~/i18n'

type WaveformData = { peaks?: number[] }

const peakCache = new Map<string, number[]>()

async function loadPeaks(url: string): Promise<number[] | null> {
  const cached = peakCache.get(url)
  if (cached) return cached
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as WaveformData
    if (!Array.isArray(data.peaks) || data.peaks.length === 0) return null
    const peaks = data.peaks.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    peakCache.set(url, peaks)
    return peaks
  } catch {
    return null
  }
}

export function Waveform({
  src,
  progress,
  duration,
  onSeek,
  className,
}: {
  src?: string
  progress: number
  duration: number
  onSeek?: (seconds: number) => void
  className?: string
}) {
  const { t } = useI18n()
  const [size, setSize] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(src ? peakCache.get(src) ?? null : null)

  useEffect(() => {
    if (!src) {
      setPeaks(null)
      return
    }
    const cached = peakCache.get(src)
    if (cached) {
      setPeaks(cached)
      return
    }
    let cancelled = false
    setPeaks(null)
    void loadPeaks(src).then((loaded) => {
      if (!cancelled) setPeaks(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setSize(value => value + 1))
    observer.observe(canvas)
    const themeObserver = new MutationObserver(() => setSize(value => value + 1))
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { observer.disconnect(); themeObserver.disconnect() }
  }, [peaks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks || peaks.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)
    const barWidth = Math.max(1.5, width / peaks.length - 1)
    const played = duration > 0 ? progress / duration : 0
    const colors = getComputedStyle(document.documentElement)
    const playedColor = colors.getPropertyValue('--wave-played').trim()
    const emptyColor = colors.getPropertyValue('--wave-empty').trim()
    peaks.forEach((peak, index) => {
      const x = (index / peaks.length) * width
      const h = Math.max(2, peak * height * 0.92)
      const y = (height - h) / 2
      ctx.fillStyle = index / peaks.length <= played
        ? playedColor
        : emptyColor
      ctx.fillRect(x, y, barWidth, h)
    })
  }, [peaks, progress, duration, size])

  const seekFromEvent = (event: { clientX: number; currentTarget: HTMLElement }) => {
    if (!onSeek || duration <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }

  const sliderProps = onSeek ? {
    role: 'slider', tabIndex: 0, 'aria-label': t('player.position'),
    'aria-valuemin': 0, 'aria-valuemax': Math.round(duration), 'aria-valuenow': Math.round(progress),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? duration
        : ['ArrowRight', 'ArrowUp'].includes(event.key) ? progress + 5
        : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? progress - 5 : undefined
      if (target !== undefined) { event.preventDefault(); onSeek(Math.max(0, Math.min(duration, target))) }
    },
  } : {}

  if (!peaks || peaks.length === 0) {
    const played = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0
    return (
      <div
        className={`waveform waveform-ph ${className ?? ''}`}
        {...sliderProps}
        onClick={onSeek ? seekFromEvent : undefined}
      >
        <span className="waveform-ph-fill" style={{ width: `${played}%` }} />
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      {...sliderProps}
      className={`waveform ${className ?? ''}`}
      onClick={seekFromEvent}
    />
  )
}
