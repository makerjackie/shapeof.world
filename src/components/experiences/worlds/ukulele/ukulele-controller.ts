// The imperative half of the world: owns the scene, the audio player, the render loop and the HUD text.
// The React component is only the view; it receives UI state through `onUi` and calls the methods below.
//
// States:  intro   -> a silent preview of one song loops behind the song list (no sound until the visitor asks)
//          playing -> a song is sounding        paused -> the visitor paused it
//          ended   -> the song finished; after a moment we return to `intro`
import { arrange, type Arrangement, type Song } from './ukulele-arranger'
import { UkulelePlayer } from './ukulele-audio'
import { MAX_MIDI_BYTES, parseMidi, songFromMidi } from './ukulele-midi'
import { UkuleleScene } from './ukulele-scene'
import { SONGS } from './ukulele-songs'
import { drawChordBox, drawTab, TAB_DESIGN_WIDTH, TAB_PROGRESS_BAND } from './ukulele-tab'
import { THEMES, type ThemeId } from './ukulele-theme'

export type Phase = 'intro' | 'playing' | 'paused' | 'ended'

export type Toast = { text: string; bad: boolean }

export type UiState = {
  phase: Phase
  songIndex: number
  songs: Array<Song>
  /** Song length in seconds, parallel to `songs`. */
  durations: Array<number>
  muted: boolean
  look: ThemeId
  railOpen: boolean
  toast: Toast | null
  /** The browser could not start WebGL. */
  failure: 'webgl' | null
}

export type HudNodes = {
  title: HTMLElement
  section: HTMLElement
  bar: HTMLElement
  chord: HTMLElement
  diagram: HTMLCanvasElement
}

export type ControllerDeps = {
  canvas: HTMLCanvasElement
  tab: HTMLCanvasElement
  hud: HudNodes
  /** The bottom controls and the song list; their height decides how far the picture is lifted. */
  layout: { bottom: HTMLElement; rail: HTMLElement }
  /** Always returns the current translator (it changes with the language). */
  tx: () => (text: string) => string
  onUi: (patch: Partial<UiState>) => void
  registerInteraction: () => void
  finish: () => void
  reducedMotion: () => boolean
  initialLook: ThemeId
}

const STORE_LOOK = 'oneworld:ukulele:look'
const STORE_IMPORTS = 'oneworld:ukulele:imports'
const END_PAUSE_MS = 3200

/** The silent preview loops these bars of the first song. */
const DEMO_SONG = 0
const DEMO_FROM_BAR = 9
const DEMO_BARS = 4

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeStore(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function savedLook(): ThemeId | null {
  const v = readStore(STORE_LOOK)
  return v === 'amber' || v === 'neon' ? v : null
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

export class UkuleleController {
  private d: ControllerDeps
  private scene: UkuleleScene
  private player = new UkulelePlayer()
  private songs: Array<Song> = SONGS.slice()
  private arrangements = new Map<string, Arrangement>()
  private phase: Phase = 'intro'
  private songIndex = -1
  private arr: Arrangement | null = null
  private demoArr: Arrangement
  private demoFrom = 0
  private demoLen = 1
  private demoT0 = 0
  private lastDemoT = 0
  private look: ThemeId
  private muted = false
  private railOpen = true
  private raf = 0
  private last = 0
  private endTimer: ReturnType<typeof setTimeout> | null = null
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = false
  /** Test and poster hook: render one fixed moment of a song, silently (see `freeze`). */
  private frozen: { arr: Arrangement; time: number; preset: number } | null = null
  private lastSection = -1
  /** True while `player.start` is still waiting for the audio context to wake (pause has nothing to pause yet). */
  private starting = false
  private hudCache = { title: '', section: '', bar: '', chord: '' }
  private frameEma = 1 / 60
  private nextAdapt = 0
  private pr: number
  private readonly prMax: number
  private width = 0
  private height = 0
  private shift = 0
  private shiftTarget = 0
  private frames = 0

  constructor(deps: ControllerDeps) {
    this.d = deps
    this.look = deps.initialLook
    this.prMax = Math.min(window.devicePixelRatio || 1, 2)
    this.pr = this.prMax
    this.scene = new UkuleleScene(deps.canvas, THEMES[this.look])
    try {
      this.songs.forEach((s) => this.arrangements.set(s.id, arrange(s, 7)))
      this.demoArr = this.arrangements.get(this.songs[DEMO_SONG].id)!
      const barT = this.demoArr.song.beatsPerBar * this.demoArr.spb
      this.demoFrom = (DEMO_FROM_BAR - 1) * barT
      this.demoLen = DEMO_BARS * barT

      this.loadImports()
      this.scene.setArrangement(this.demoArr)
      this.scene.snapCamera(1)
      this.player.onEnd = () => this.handleEnd()
      this.publishSongs()
      this.d.onUi({ phase: 'intro', songIndex: -1, muted: false, look: this.look, railOpen: true })

      document.addEventListener('visibilitychange', this.onVisibility)
      this.last = performance.now()
      this.demoT0 = this.last / 1000
    } catch (error) {
      this.scene.dispose() // never leave a WebGL context behind
      throw error
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  // ---- lifecycle ------------------------------------------------------------------------------
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.endTimer) clearTimeout(this.endTimer)
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.player.dispose()
    this.scene.dispose()
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.player.suspendForSystem()
    else this.player.resumeFromSystem()
  }

  /** Called by the component's ResizeObserver, in CSS pixels. */
  resize(w: number, h: number) {
    if (w < 2 || h < 2) return
    this.width = w
    this.height = h
    // a tall, narrow stage gets a wider view: 1.14x at phone proportions, none from about 3:4 up
    this.scene.setFovScale(1 + 0.14 * clamp((0.75 - w / h) / 0.25, 0, 1))
    this.scene.resize(w, h, this.pr)
  }

  // ---- songs ------------------------------------------------------------------------------------
  private arrangementFor(song: Song): Arrangement {
    let a = this.arrangements.get(song.id)
    if (!a) {
      a = arrange(song, 7)
      this.arrangements.set(song.id, a)
    }
    return a
  }

  private publishSongs() {
    this.d.onUi({
      songs: this.songs.slice(),
      durations: this.songs.map((s) => this.arrangementFor(s).duration),
    })
  }

  private loadImports() {
    const raw = readStore(STORE_IMPORTS)
    if (!raw) return
    try {
      const list = JSON.parse(raw) as Array<{ title: string; data: string }>
      list.forEach((item) => {
        try {
          this.addSong(songFromMidi(parseMidi(fromBase64(item.data)), item.title))
        } catch {
          /* a stored file that no longer parses is skipped */
        }
      })
    } catch {
      /* corrupt store */
    }
  }

  private addSong(song: Song): number {
    const existing = this.songs.findIndex((s) => s.id === song.id)
    this.arrangements.set(song.id, arrange(song, 7))
    if (existing >= 0) {
      this.songs[existing] = song
      return existing
    }
    this.songs.push(song)
    return this.songs.length - 1
  }

  /**
   * Add a visitor's MIDI file to the list. It is not started automatically: the file picker and the drop are not
   * a reliable "user gesture" for audio (Safari in particular), so the visitor presses the song to hear it.
   */
  async importFile(file: File) {
    const tx = this.d.tx()
    try {
      if (file.size > MAX_MIDI_BYTES) throw new Error('文件太大')
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (this.disposed) return
      const title = file.name.replace(/\.(mid|midi|kar)$/i, '').trim() || 'MIDI'
      const song = songFromMidi(parseMidi(bytes), title)
      this.addSong(song)
      const kept = this.persistImport(title, bytes)
      this.publishSongs()
      this.openRail(true)
      this.showToast(kept ? `${tx('已导入')} ${title}` : `${tx('已导入')} ${title} · ${tx('文件较大，刷新后不会保留')}`, false)
    } catch (error) {
      this.showToast(tx(error instanceof Error ? error.message : '导入失败'), true)
    }
  }

  /** Returns false when the browser would not store it (private mode, quota). */
  private persistImport(title: string, bytes: Uint8Array): boolean {
    let list: Array<{ title: string; data: string }> = []
    try {
      list = JSON.parse(readStore(STORE_IMPORTS) ?? '[]')
    } catch {
      list = []
    }
    list = list.filter((item) => item.title !== title)
    list.push({ title, data: toBase64(bytes) })
    return writeStore(STORE_IMPORTS, JSON.stringify(list))
  }

  removeImported(id: string) {
    const i = this.songs.findIndex((s) => s.id === id && s.imported)
    if (i < 0) return
    const song = this.songs[i]
    if (this.songIndex === i) this.backToIntro()
    else if (this.songIndex > i) this.songIndex--
    this.songs.splice(i, 1)
    this.arrangements.delete(song.id)
    try {
      const list = (JSON.parse(readStore(STORE_IMPORTS) ?? '[]') as Array<{ title: string }>).filter((item) => `midi-${item.title}` !== id)
      writeStore(STORE_IMPORTS, JSON.stringify(list))
    } catch {
      /* ignore */
    }
    this.publishSongs()
    this.d.onUi({ songIndex: this.songIndex })
  }

  // ---- transport --------------------------------------------------------------------------------
  async playSong(index: number) {
    const song = this.songs[index]
    if (!song || this.disposed) return
    this.d.registerInteraction()
    if (this.endTimer) clearTimeout(this.endTimer)
    const arr = this.arrangementFor(song)
    try {
      this.player.load(arr) // creates the audio context here, inside the visitor's gesture
    } catch {
      this.showToast(this.d.tx()('这个浏览器没能启动声音。'), true)
      return
    }
    this.arr = arr
    this.songIndex = index
    this.phase = 'playing'
    this.lastSection = -1
    this.scene.setArrangement(arr)
    this.d.onUi({ phase: 'playing', songIndex: index, railOpen: false })
    this.railOpen = false
    this.starting = true
    try {
      await this.player.start(0)
    } catch {
      if (this.disposed) return
      this.showToast(this.d.tx()('这个浏览器没能启动声音。'), true)
      this.backToIntro()
    } finally {
      this.starting = false
    }
  }

  async togglePlay() {
    this.d.registerInteraction()
    if (this.phase === 'intro') {
      await this.playSong(Math.max(0, this.songIndex))
    } else if (this.phase === 'playing') {
      if (this.starting) return
      await this.player.pause()
      if (this.phase === 'playing' && this.player.state === 'paused') {
        this.phase = 'paused'
        this.d.onUi({ phase: 'paused' })
      }
    } else if (this.phase === 'paused') {
      await this.player.resume()
      this.phase = 'playing'
      this.d.onUi({ phase: 'playing' })
    } else if (this.phase === 'ended') {
      await this.restart()
    }
  }

  async restart() {
    this.d.registerInteraction()
    if (this.phase === 'intro' || !this.arr) {
      await this.playSong(Math.max(0, this.songIndex))
      return
    }
    if (this.endTimer) clearTimeout(this.endTimer)
    this.lastSection = -1
    if (this.phase === 'ended') await this.playSong(this.songIndex)
    else {
      await this.player.seek(0)
      if (this.phase === 'paused') await this.player.resume()
      this.phase = 'playing'
      this.d.onUi({ phase: 'playing' })
    }
  }

  async seekFraction(fraction: number) {
    if (!this.arr || this.phase === 'intro') return
    this.d.registerInteraction()
    this.leaveEnded()
    await this.player.seek(clamp(fraction, 0, 1) * this.arr.duration)
  }

  async seekBy(seconds: number) {
    if (!this.arr || this.phase === 'intro') return
    this.d.registerInteraction()
    this.leaveEnded()
    await this.player.seek(clamp(this.player.time, 0, this.arr.duration) + seconds)
  }

  /** Seeking in a finished song plays it again: drop the pending "back to the list" and show it as playing. */
  private leaveEnded() {
    if (this.phase !== 'ended') return
    if (this.endTimer) clearTimeout(this.endTimer)
    this.phase = 'playing'
    this.d.onUi({ phase: 'playing' })
  }

  /** Clicking the instrument: start the first song from the preview, or play / pause. */
  canvasClick() {
    this.safely(this.togglePlay())
  }

  /** Fire-and-forget an async action; a rejection (the audio context closing under us) is not worth reporting. */
  private safely(action: Promise<unknown>) {
    action.catch(() => undefined)
  }

  toggleMute() {
    this.d.registerInteraction()
    this.muted = !this.muted
    this.player.setVolume(this.muted ? 0 : 0.9)
    this.d.onUi({ muted: this.muted })
  }

  setLook(look: ThemeId) {
    if (look === this.look) return
    this.look = look
    writeStore(STORE_LOOK, look)
    this.scene.applyTheme(THEMES[look])
    this.hudCache.chord = '' // redraw the chord box in the new colours
    this.d.onUi({ look })
  }

  nextLook() {
    this.d.registerInteraction()
    this.setLook(this.look === 'amber' ? 'neon' : 'amber')
  }

  openRail(open: boolean) {
    this.railOpen = open
    this.d.onUi({ railOpen: open })
  }

  toggleRail() {
    this.openRail(!this.railOpen)
  }

  private handleEnd() {
    if (this.disposed) return
    this.phase = 'ended'
    this.d.onUi({ phase: 'ended' })
    this.d.finish()
    this.endTimer = setTimeout(() => {
      if (this.phase === 'ended') this.backToIntro()
    }, END_PAUSE_MS)
  }

  private backToIntro() {
    if (this.disposed) return
    this.player.stop()
    this.phase = 'intro'
    this.songIndex = -1
    this.arr = null
    this.lastSection = -1
    this.scene.setArrangement(this.demoArr)
    this.demoT0 = performance.now() / 1000
    this.railOpen = true
    this.d.onUi({ phase: 'intro', songIndex: -1, railOpen: true })
  }

  /**
   * Hold one moment of a song on screen, silently and still, with a chosen camera preset. Used for
   * deterministic review frames and the poster capture; `unfreeze()` returns to the normal flow.
   */
  freeze(songId: string, time: number, preset: number) {
    const song = this.songs.find((s) => s.id === songId)
    if (!song) return false
    const arr = this.arrangementFor(song)
    this.frozen = { arr, time, preset }
    this.scene.setArrangement(arr)
    this.scene.snapCamera(preset)
    this.hudCache = { title: '', section: '', bar: '', chord: '' }
    this.d.onUi({ railOpen: false })
    this.railOpen = false
    return true
  }

  unfreeze() {
    this.frozen = null
    this.scene.setArrangement(this.phase === 'intro' || !this.arr ? this.demoArr : this.arr)
    this.lastSection = -1
  }

  /**
   * The poster frame: the last chorus of Songbie at a melody note on fret 10 with the bass lit under it,
   * hero camera (headstock, neck and soundhole together, so it reads as a ukulele at a glance).
   */
  poster() {
    return this.freeze('songbie', 39.5, 1)
  }

  /** Keyboard shortcuts. Returns true when the key was handled. */
  handleKey(event: KeyboardEvent): boolean {
    switch (event.code) {
      case 'Space':
        this.safely(this.togglePlay())
        return true
      case 'ArrowLeft':
        this.safely(this.seekBy(-5))
        return true
      case 'ArrowRight':
        this.safely(this.seekBy(5))
        return true
      case 'KeyR':
        this.safely(this.restart())
        return true
      case 'KeyM':
        this.toggleMute()
        return true
      case 'KeyT':
        this.nextLook()
        return true
      default: {
        const m = /^Digit([1-9])$/.exec(event.code)
        if (m && this.songs[+m[1] - 1]) {
          this.safely(this.playSong(+m[1] - 1))
          return true
        }
        return false
      }
    }
  }

  /** The progress strip at the bottom of the tab canvas seeks; the rest of the tab is just picture. */
  tabPointer(clientX: number, clientY: number): boolean {
    const r = this.d.tab.getBoundingClientRect()
    const k = r.width / TAB_DESIGN_WIDTH
    if (clientY - r.top < r.height - TAB_PROGRESS_BAND * k) return false
    this.safely(this.seekFraction((clientX - r.left - 14 * k) / (r.width - 28 * k)))
    return true
  }

  // ---- toast ------------------------------------------------------------------------------------
  private showToast(text: string, bad: boolean) {
    if (this.disposed) return
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.d.onUi({ toast: { text, bad } })
    this.toastTimer = setTimeout(() => this.d.onUi({ toast: null }), 3600)
  }

  // ---- frame loop -------------------------------------------------------------------------------
  /** Render resolution adapts to the machine: step the ratio down when frames run long, back up when there is room. */
  private adapt(now: number, rawDt: number) {
    if (document.visibilityState !== 'visible' || !this.width) return
    if (rawDt < 0.25) this.frameEma += (rawDt - this.frameEma) * 0.04
    if (now < this.nextAdapt) return
    this.nextAdapt = now + 2500
    if (this.frameEma > 0.027 && this.pr > 1) {
      this.pr = Math.max(1, this.pr - 0.25)
      this.scene.resize(this.width, this.height, this.pr)
    } else if (this.frameEma < 0.0185 && this.pr < this.prMax) {
      this.pr = Math.min(this.prMax, this.pr + 0.25)
      this.scene.resize(this.width, this.height, this.pr)
    }
  }

  /** One animation frame. A render exception is reported once and ends the loop, instead of failing silently every frame. */
  private frame = (nowMs: number) => {
    if (this.disposed) return
    try {
      this.step(nowMs)
    } catch (error) {
      console.error('[ukulele] render failed', error)
      this.d.onUi({ failure: 'webgl' })
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private step(nowMs: number) {
    const rawDt = (nowMs - this.last) / 1000
    this.last = nowMs
    if (nowMs > 4000) this.adapt(nowMs, rawDt)
    const reduced = this.d.reducedMotion()

    let arr: Arrangement
    let time: number
    let playing: number
    if (this.frozen) {
      arr = this.frozen.arr
      time = this.frozen.time
      playing = 1
    } else if (this.phase === 'intro' || !this.arr) {
      arr = this.demoArr
      if (reduced) {
        // a still frame: strings at rest, nothing moving
        time = -1
        playing = 0
      } else {
        time = ((nowMs / 1000 - this.demoT0) % this.demoLen) + this.demoFrom
        if (time < this.lastDemoT) this.scene.setArrangement(arr) // looped: forget which notes were already seen
        this.lastDemoT = time
        playing = 1
      }
    } else {
      arr = this.arr
      time = this.player.time
      playing = this.player.state === 'playing' ? 1 : 0
    }
    this.updateHud(arr, time)
    this.updateViewShift(rawDt, reduced)
    this.scene.render({ time, beat: Math.max(0, time) / arr.spb, clock: nowMs / 1000, playing, reducedMotion: reduced }, rawDt)
    drawTab(this.d.tab, arr, time, THEMES[this.look])
  }

  /** Lift the picture by about a fifth of the space the bottom controls take (and the song list, when it docks there). */
  private updateViewShift(dt: number, reduced: boolean) {
    if (!this.height) return
    if (this.frames++ % 12 === 0) {
      const { bottom, rail } = this.d.layout
      const docked = this.width < 900 && this.railOpen // on wide screens the list sits at the side
      const covered = bottom.offsetHeight + (docked ? rail.offsetHeight : 0)
      this.shiftTarget = clamp((0.22 * covered) / this.height, 0, 0.08)
    }
    const k = reduced ? 1 : 1 - Math.exp(-clamp(dt, 0, 0.1) * 4)
    this.shift += (this.shiftTarget - this.shift) * k
    this.scene.setViewShift(this.shift)
  }

  private updateHud(arr: Arrangement, time: number) {
    const tx = this.d.tx()
    const song = arr.song
    const beat = Math.max(0, time) / arr.spb
    const bar = Math.min(song.bars, Math.floor(beat / song.beatsPerBar) + 1)
    const chord = arr.chordAt(beat)
    const si = arr.sectionIndexAt(bar)
    const { hud } = this.d
    const c = this.hudCache

    const title = tx(song.title)
    if (title !== c.title) {
      c.title = title
      hud.title.textContent = title
    }
    const section = tx(song.sections[si]?.name ?? '')
    if (section !== c.section) {
      c.section = section
      hud.section.textContent = section
    }
    const barText = `${tx('小节')} ${String(bar).padStart(2, '0')} / ${song.bars}`
    if (barText !== c.bar) {
      c.bar = barText
      hud.bar.textContent = barText
    }
    if (chord !== c.chord) {
      c.chord = chord
      hud.chord.textContent = chord
      hud.chord.classList.remove('is-pop')
      void hud.chord.offsetWidth // restart the CSS animation
      hud.chord.classList.add('is-pop')
      drawChordBox(hud.diagram, chord, THEMES[this.look])
    }
    if (si !== this.lastSection) {
      this.lastSection = si
      // each section gets its own camera; the silent preview stays on the hero shot
      if (!this.frozen) this.scene.setPreset(this.phase === 'intro' ? 1 : si)
    }
  }
}
