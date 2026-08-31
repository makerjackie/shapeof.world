import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, DownloadSimple, ShareNetwork, X } from '@phosphor-icons/react'

import { useI18n } from '~/i18n'

import { FollowStayPrompt } from '~/components/FollowStayPrompt'

import './MomentCard.css'

/**
 * The card a user actually posts.
 *
 * A bare link says "look at this simulator". A card says "here is the thing I
 * made and what happened" — it carries the image, the state that produced it,
 * and the question, so it survives being screenshotted out of context.
 *
 * Portrait 4:5 because the target channels are 小红书 / 抖音 / Instagram, where
 * a landscape card is cropped or shrunk into a thumbnail.
 */
const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

export type MomentCardProps = {
  open: boolean
  onClose: () => void
  /** World-supplied redraw-and-read, for canvases that cannot be read later. */
  capture?: (() => string | null) | null
  /** URL that restores the exact state, already localized. */
  url: string
  /** The question the world asks; the reason a stranger should care. */
  question: string
  /** One line describing what the sharer set up, if the world publishes one. */
  summary?: string
  /** Fallback artwork when the live canvas cannot be read. */
  posterUrl?: string
  accent?: string
  onShared?: () => void
}

/**
 * Read the experience canvas. WebGL contexts created without
 * `preserveDrawingBuffer` return a blank buffer outside their own frame, which
 * is most of the 3D worlds — so a blank result is expected, not an error, and
 * we quietly fall back to the poster.
 */
function captureStage(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('.experience-stage canvas'))
  // Largest visible canvas is the stage; small ones are overlays or sparklines.
  const stage = canvases
    .filter((item) => item.width > 64 && item.height > 64)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0]
  return stage ?? null
}

function isBlank(source: HTMLCanvasElement): boolean {
  try {
    const probe = document.createElement('canvas')
    probe.width = 24
    probe.height = 24
    const context = probe.getContext('2d', { willReadFrequently: true })
    if (!context) return true
    context.drawImage(source, 0, 0, 24, 24)
    const { data } = context.getImageData(0, 0, 24, 24)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 8 && (data[i] > 8 || data[i + 1] > 8 || data[i + 2] > 8)) return false
    }
    return true
  } catch {
    // A tainted canvas throws here; treat it as unusable and use the poster.
    return true
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

/** Cover-fit a source into a box, cropping the overflow. */
function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  context.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): Array<string> {
  const lines: Array<string> = []
  let line = ''
  // Character-wise wrapping: the primary language is Chinese, which has no
  // spaces to break on.
  for (const character of Array.from(text)) {
    const candidate = line + character
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = character
      if (lines.length === maxLines) break
    } else {
      line = candidate
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && line && lines[maxLines - 1] !== line) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`
  }
  return lines
}

export function MomentCard({
  open,
  onClose,
  capture,
  url,
  question,
  summary,
  posterUrl,
  accent = '#e8c27a',
  onShared,
}: MomentCardProps) {
  const { t } = useI18n()
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const blobRef = useRef<Blob | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const build = useCallback(async () => {
    setBusy(true)
    try {
      const card = document.createElement('canvas')
      card.width = CARD_WIDTH
      card.height = CARD_HEIGHT
      const context = card.getContext('2d')
      if (!context) return

      context.fillStyle = '#07090d'
      context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

      const imageHeight = Math.round(CARD_HEIGHT * 0.68)
      let painted = false

      // A world that knows how to redraw itself wins: WebGL canvases are blank
      // to anyone reading them outside the render loop.
      const supplied = capture?.()
      if (supplied) {
        try {
          const frame = await loadImage(supplied)
          drawCover(context, frame, frame.naturalWidth, frame.naturalHeight, 0, 0, CARD_WIDTH, imageHeight)
          painted = true
        } catch {
          /* fall through to reading the canvas directly */
        }
      }

      const stage = painted ? null : captureStage()
      if (stage && !isBlank(stage)) {
        drawCover(context, stage, stage.width, stage.height, 0, 0, CARD_WIDTH, imageHeight)
        painted = true
      }
      if (!painted && posterUrl) {
        try {
          const poster = await loadImage(posterUrl)
          drawCover(context, poster, poster.naturalWidth, poster.naturalHeight, 0, 0, CARD_WIDTH, imageHeight)
          painted = true
        } catch {
          /* fall through to the plain panel below */
        }
      }
      if (!painted) {
        const wash = context.createLinearGradient(0, 0, CARD_WIDTH, imageHeight)
        wash.addColorStop(0, '#131c26')
        wash.addColorStop(1, '#0a0f15')
        context.fillStyle = wash
        context.fillRect(0, 0, CARD_WIDTH, imageHeight)
      }

      // Let the artwork fade into the caption block instead of hard-cutting.
      const fade = context.createLinearGradient(0, imageHeight - 220, 0, imageHeight)
      fade.addColorStop(0, 'rgba(7, 9, 13, 0)')
      fade.addColorStop(1, 'rgba(7, 9, 13, 1)')
      context.fillStyle = fade
      context.fillRect(0, imageHeight - 220, CARD_WIDTH, 220)

      const margin = 76
      let cursor = imageHeight + 34

      if (summary) {
        context.font = '600 40px system-ui, -apple-system, "PingFang SC", sans-serif'
        context.fillStyle = accent
        for (const line of wrapText(context, summary, CARD_WIDTH - margin * 2, 2)) {
          context.fillText(line, margin, cursor + 34)
          cursor += 54
        }
        cursor += 16
      }

      context.font = '700 52px system-ui, -apple-system, "PingFang SC", sans-serif'
      context.fillStyle = '#f2f6fb'
      for (const line of wrapText(context, question, CARD_WIDTH - margin * 2, summary ? 3 : 4)) {
        context.fillText(line, margin, cursor + 44)
        cursor += 70
      }

      context.font = '500 32px system-ui, -apple-system, "PingFang SC", sans-serif'
      context.fillStyle = 'rgba(160, 176, 194, 0.92)'
      context.fillText(t('brand.name'), margin, CARD_HEIGHT - 58)
      context.textAlign = 'right'
      context.fillStyle = 'rgba(160, 176, 194, 0.7)'
      context.fillText('shapeof.world', CARD_WIDTH - margin, CARD_HEIGHT - 58)
      context.textAlign = 'left'

      const blob = await new Promise<Blob | null>((resolve) => card.toBlob(resolve, 'image/png'))
      blobRef.current = blob
      setPreview(card.toDataURL('image/png'))
    } finally {
      setBusy(false)
    }
  }, [accent, capture, posterUrl, question, summary, t])

  useEffect(() => {
    if (!open) return
    void build()
    window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }))
  }, [open, build])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      onShared?.()
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard can be blocked; the link stays visible for manual copying */
    }
  }, [url, onShared])

  const download = useCallback(() => {
    if (!preview) return
    const link = document.createElement('a')
    link.href = preview
    link.download = 'shapeof-world.png'
    link.click()
    onShared?.()
  }, [preview, onShared])

  const shareNative = useCallback(async () => {
    const blob = blobRef.current
    const file = blob ? new File([blob], 'shapeof-world.png', { type: 'image/png' }) : null
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: summary ? `${summary} — ${question}` : question, url })
      } else if (navigator.share) {
        await navigator.share({ title: question, text: summary, url })
      } else {
        await copyLink()
        return
      }
      onShared?.()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await copyLink()
    }
  }, [copyLink, onShared, question, summary, url])

  if (!open) return null

  return (
    <div className="moment-card" role="dialog" aria-modal="true" aria-label={t('experience.share')}>
      <div className="moment-card-sheet" style={{ ['--moment-accent' as string]: accent }}>
        <button
          ref={closeRef}
          type="button"
          className="moment-card-close"
          onClick={onClose}
          aria-label={t('moment.close')}
        >
          <X weight="bold" />
        </button>

        <div className="moment-card-preview">
          {preview
            ? <img src={preview} alt={summary ? `${summary} — ${question}` : question} />
            : <div className="moment-card-skeleton" aria-hidden="true" />}
        </div>

        <div className="moment-card-actions">
          <button type="button" className="moment-card-primary" onClick={() => void shareNative()} disabled={busy}>
            <ShareNetwork weight="bold" /> {t('experience.share')}
          </button>
          <button type="button" onClick={() => void copyLink()}>
            {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
            {copied ? t('moment.copied') : t('moment.copyLink')}
          </button>
          <button type="button" onClick={download} disabled={!preview}>
            <DownloadSimple weight="bold" /> {t('moment.save')}
          </button>
        </div>

        <p className="moment-card-note">{t('moment.note')}</p>
        <FollowStayPrompt origin="share_card" />
      </div>
      <button type="button" className="moment-card-scrim" onClick={onClose} aria-hidden="true" tabIndex={-1} />
    </div>
  )
}
