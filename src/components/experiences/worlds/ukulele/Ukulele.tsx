import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { ArrowCounterClockwise, MusicNotes, Palette, Pause, Play, Plus, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { ownsExperienceStageInput } from '~/components/experiences/experience-input'
import { useExperienceI18n } from '~/i18n/experience'

import { SONGS } from './ukulele-songs'
import { savedLook, UkuleleController, type UiState } from './ukulele-controller'
import { THEMES, type ThemeId } from './ukulele-theme'

import './styles/Ukulele.css'

const INITIAL: UiState = {
  phase: 'intro',
  songIndex: -1,
  songs: SONGS,
  durations: SONGS.map(() => 0),
  muted: false,
  look: 'amber',
  railOpen: true,
  toast: null,
  failure: null,
}

/** Fire a controller action; a rejected audio promise (for example while the page is closing) is not an error to report. */
const run = (action: Promise<unknown> | undefined) => void action?.catch(() => undefined)

const clock = (seconds: number) => {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function initialLook(): ThemeId {
  const query = new URLSearchParams(window.location.search).get('look')
  if (query === 'amber' || query === 'neon') return query
  return savedLook() ?? 'amber'
}

export function Ukulele({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const txRef = useRef(tx)
  txRef.current = tx
  const controlsRef = useRef(controls)
  controlsRef.current = controls

  const rootRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)
  const tabRef = useRef<HTMLCanvasElement>(null)
  const diagramRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const sectionRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const chordRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const ctlRef = useRef<UkuleleController | null>(null)

  const [ui, setUi] = useState<UiState>(INITIAL)
  const [dropping, setDropping] = useState(false)
  const patch = useCallback((p: Partial<UiState>) => setUi((prev) => ({ ...prev, ...p })), [])

  // ---- engine: created once on the client, torn down on unmount ---------------------------------
  useEffect(() => {
    const root = rootRef.current
    const host = hostRef.current
    const tab = tabRef.current
    const diagram = diagramRef.current
    const title = titleRef.current
    const section = sectionRef.current
    const bar = barRef.current
    const chord = chordRef.current
    const bottom = bottomRef.current
    const rail = railRef.current
    if (!root || !host || !tab || !diagram || !title || !section || !bar || !chord || !bottom || !rail) return

    // The controller owns its canvas: tearing it down loses the GL context, and React may mount this effect
    // twice on one element (StrictMode), which would hand the second mount a context that is already lost.
    const canvas = document.createElement('canvas')
    canvas.className = 'uke-canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', txRef.current('第一人称视角的尤克里里，正在自动演奏'))
    canvas.addEventListener('click', () => ctlRef.current?.canvasClick())
    host.appendChild(canvas)
    canvasElRef.current = canvas

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let ctl: UkuleleController
    try {
      ctl = new UkuleleController({
        canvas,
        tab,
        hud: { title, section, bar, chord, diagram },
        layout: { bottom, rail },
        tx: () => txRef.current,
        onUi: patch,
        registerInteraction: () => controlsRef.current.registerInteraction(),
        finish: () => controlsRef.current.finish(),
        reducedMotion: () => reduce.matches,
        initialLook: initialLook(),
      })
    } catch (error) {
      console.error('[ukulele] could not start the scene', error)
      canvas.remove()
      canvasElRef.current = null
      patch({ failure: 'webgl' })
      return
    }
    ctlRef.current = ctl
    // Review and poster hook (the repo's scripts call `window.__uke.poster()` for a deliberate frame).
    ;(window as unknown as { __uke?: unknown }).__uke = {
      poster: () => ctl.poster(),
      freeze: (songId: string, time: number, preset = 1) => ctl.freeze(songId, time, preset),
      unfreeze: () => ctl.unfreeze(),
      setLook: (look: ThemeId) => ctl.setLook(look),
    }

    const resize = () => ctl.resize(root.clientWidth, root.clientHeight)
    const observer = new ResizeObserver(resize)
    observer.observe(root)
    resize()

    const stage = root.closest('.experience-stage')
    const onKey = (event: KeyboardEvent) => {
      if (!ownsExperienceStageInput(stage, event)) return
      if (ctl.handleKey(event)) event.preventDefault()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      delete (window as unknown as { __uke?: unknown }).__uke
      window.removeEventListener('keydown', onKey)
      observer.disconnect()
      ctl.dispose()
      ctlRef.current = null
      canvas.remove()
      canvasElRef.current = null
    }
  }, [patch])

  // keep the canvas label in the current language
  const canvasLabel = tx('第一人称视角的尤克里里，正在自动演奏')
  useEffect(() => {
    canvasElRef.current?.setAttribute('aria-label', canvasLabel)
  }, [canvasLabel])

  // ---- file import (button and drag-and-drop) ---------------------------------------------------
  const onFiles = useCallback((files: FileList | null) => {
    const file = files?.[0]
    if (file) void ctlRef.current?.importFile(file)
  }, [])
  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes('Files')) return
    event.preventDefault()
    setDropping(true)
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDropping(false)
    onFiles(event.dataTransfer.files)
  }

  const playing = ui.phase === 'playing'
  const theme = THEMES[ui.look]
  const current = ui.songIndex >= 0 ? ui.songs[ui.songIndex] : null

  if (ui.failure) {
    return (
      <div className="uke-world uke-failure" data-uke-look={ui.look}>
        <p>{tx('这个浏览器没能启动 3D 画面。')}</p>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="uke-world"
      data-uke-look={ui.look}
      data-phase={ui.phase}
      onDragOver={onDragOver}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <div ref={hostRef} className="uke-canvas-host" />
      <div className="uke-shade" aria-hidden="true" data-experience-overlay="true" />
      <div className="uke-scan" aria-hidden="true" data-experience-overlay="true" />

      <div className="uke-topleft" data-experience-overlay="true">
        <div className="uke-plate">
          <p className="uke-plate-title">{tx('四根弦，怎么弹出一首歌？')}</p>
          <p className="uke-plate-line">{tx('每按高一格，能振动的弦短 5.6%，音高升一个半音。')}</p>
        </div>
        <div className="uke-hud" aria-live="off">
          <div className="uke-now">
            <span ref={titleRef} className="uke-now-title" />
            <span ref={sectionRef} className="uke-now-section" />
          </div>
          <div className="uke-chordrow">
            <div ref={chordRef} className="uke-chord" />
            <canvas ref={diagramRef} className="uke-diagram" width={176} height={208} aria-hidden="true" />
          </div>
          <span ref={barRef} className="uke-bar" />
        </div>
      </div>

      <div ref={railRef} className={`uke-rail${ui.railOpen ? ' is-open' : ''}`} inert={!ui.railOpen} data-experience-overlay="true">
        <p className="uke-rail-hint">{tx('选一首歌，开始演奏')}</p>
        <div className="uke-chips">
          {ui.songs.map((song, i) => (
            <div className={`uke-chip-wrap${i === ui.songIndex ? ' is-current' : ''}`} key={song.id}>
              <button
                type="button"
                className="uke-chip"
                aria-pressed={i === ui.songIndex}
                onClick={() => {
                  run(ctlRef.current?.playSong(i))
                  playRef.current?.focus()
                }}
              >
                <span className="uke-chip-title">{tx(song.title)}</span>
                <span className="uke-chip-meta">
                  {tx(song.credit)} · {tx(song.keyLabel)} · {song.bpm} bpm · {clock(ui.durations[i] ?? 0)}
                </span>
              </button>
              {song.imported && (
                <button
                  type="button"
                  className="uke-chip-del"
                    aria-label={tx('删除')}
                  title={tx('删除')}
                  onClick={() => ctlRef.current?.removeImported(song.id)}
                >
                  <X weight="bold" />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="uke-chip uke-chip-add" onClick={() => fileRef.current?.click()}>
            <Plus weight="bold" />
            <span className="uke-chip-title">{tx('导入 MIDI')}</span>
            <span className="uke-chip-meta">{tx('选一个 .mid 文件，或拖到页面上')}</span>
          </button>
        </div>
      </div>

      <div ref={bottomRef} className="uke-bottom" data-experience-overlay="true">
        <div className="uke-tabwrap">
          <canvas
            ref={tabRef}
            className="uke-tab"
            aria-hidden="true"
            onClick={(event) => {
              const ctl = ctlRef.current
              if (!ctl) return
              if (!ctl.tabPointer(event.clientX, event.clientY)) ctl.canvasClick()
            }}
          />
        </div>

        <div className="uke-transport" role="group" aria-label={tx('播放控制')}>
          <button type="button" className="uke-btn" onClick={() => run(ctlRef.current?.restart())} aria-label={tx('重新开始')} title={tx('重新开始')}>
            <ArrowCounterClockwise weight="bold" />
          </button>
          <button
            type="button"
            ref={playRef}
            className="uke-btn uke-btn-main"
            onClick={() => run(ctlRef.current?.togglePlay())}
            aria-label={playing ? tx('暂停') : tx('播放')}
            title={playing ? tx('暂停') : tx('播放')}
          >
            {playing ? <Pause weight="fill" /> : <Play weight="fill" />}
          </button>
          <button
            type="button"
            className="uke-btn"
            aria-pressed={ui.railOpen}
            onClick={() => ctlRef.current?.toggleRail()}
            aria-label={tx('选歌')}
            title={tx('选歌')}
          >
            <MusicNotes weight="bold" />
          </button>
          <button
            type="button"
            className="uke-btn"
            onClick={() => ctlRef.current?.toggleMute()}
            aria-label={ui.muted ? tx('打开声音') : tx('关闭声音')}
            title={ui.muted ? tx('打开声音') : tx('关闭声音')}
          >
            {ui.muted ? <SpeakerSlash weight="bold" /> : <SpeakerHigh weight="bold" />}
          </button>
          <button
            type="button"
            className="uke-btn"
            onClick={() => ctlRef.current?.nextLook()}
            aria-label={`${tx('切换外观')}: ${tx(theme.label)}`}
            title={`${tx('切换外观')}: ${tx(theme.label)}`}
          >
            <Palette weight="bold" />
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".mid,.midi,.kar,audio/midi,audio/x-midi" hidden onChange={(event) => {
        onFiles(event.target.files)
        event.target.value = ''
      }} />

      <div className={`uke-toast${ui.toast ? ' is-on' : ''}${ui.toast?.bad ? ' is-bad' : ''}`} role="status" data-experience-overlay="true">
        {ui.toast?.text}
      </div>
      <div className={`uke-drop${dropping ? ' is-on' : ''}`} aria-hidden="true" data-experience-overlay="true">
        {tx('松开，导入这个 MIDI')}
      </div>
      <span className="uke-sr" aria-live="polite">
        {current ? tx(current.title) : ''}
      </span>
    </div>
  )
}
