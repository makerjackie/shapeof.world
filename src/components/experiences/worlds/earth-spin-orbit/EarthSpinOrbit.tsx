import './styles/EarthSpinOrbit.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { ArrowCounterClockwise, ArrowsOut, Camera, CaretDown, Clock, Info, Pause, Play, SkipBack, SkipForward, X, BookOpen, Link, Eye, EyeSlash, Sun, Moon } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { EARTH_SKINS } from './earth-appearance'
import { GhostHint } from '~/components/experiences/GhostHint'
import { useI18n } from '~/i18n'
import { useExperienceI18n } from '~/i18n/experience'
import { DEFAULT_LAYERS, LAYER_CHIPS, SPEEDS, WorldScene, placeFromLatLon, type Picked, type SceneState, type SpeedId, type Tween, type ViewMode } from './earth-scene'
import { SAN_FRANCISCO, PLACES, daylightAt, formatHHMM, formatLatLon, globePoseFacingLatLon, isDayAt, simTimeAt, solarCoordsAt, timezoneLabel, timezoneOffsetAt, type Place } from './earth-spin-orbit-model'
import { earthSunAt, SUN_RADIUS } from './earth-sun-model'
import { earthMoonAt, phaseName } from './earth-moon-model'
import { getApproximateEarthLocation } from '~/lib/earth-location'
import { TOPICS, LESSONS, geometricDayHours, latitudeZone, localSun, parseSavedScene, seasonEpochs, solarNoonEpoch, type Topic, type LessonId, type SavedScene } from './earth-teaching'

const WORLD_ID = 'earth-spin-orbit'
const HOUR = 3_600_000
const DAY = HOUR * 24
const SEASONS = ['春分', '夏至', '秋分', '冬至']

export function EarthSpinOrbit({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const panelTrigger = useRef<HTMLElement | null>(null)
  const [reducedMotion, setReducedMotion] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const [failure, setFailure] = useState(false)
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState<'help' | 'time' | null>(null)
  const [toolTab, setToolTab] = useState<'time' | 'place' | 'lesson' | 'layers' | 'appearance' | 'camera'>('time')
  const [answers, setAnswers] = useState(true)
  const [lessonId, setLessonId] = useState<LessonId | null>(null)
  const [draftDate, setDraftDate] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [details, setDetails] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1100)
  const [range, setRange] = useState<'day' | 'month' | 'year'>('day')
  const interacted = useRef(false)
  const initialEpoch = useRef(Date.now())
  const openingSun = solarCoordsAt(initialEpoch.current)
  const pose = globePoseFacingLatLon(15, openingSun.subsolarLon + 40)
  const scene = useRef<SceneState>({ epoch: initialEpoch.current, rotationEpoch: initialEpoch.current, time: simTimeAt(initialEpoch.current, false), playing: !reducedMotion, topic: 'explore', skin: 'satellite', nightShade: true, labels: true, projection: false, compareId: '', speedId: 'hour', direction: 1, view: 'earth', yaw: pose.yaw, pitch: pose.pitch, radius: 4.3, velYaw: 0, velPitch: 0, sunAz: 0.62, sunEl: 0.65, sunRadius: 16, lastUserInput: 0, layers: { ...DEFAULT_LAYERS }, picked: { ...SAN_FRANCISCO } })
  const tweens = useRef<Array<Tween>>([])
  const lessonStart = useRef<{ epoch: number; picked: Picked; topic: Topic; layers: SceneState['layers']; compareId: string } | null>(null)
  const [ui, setUi] = useState(() => ({ ...scene.current, layers: { ...scene.current.layers }, time: { ...scene.current.time } }))
  const sync = useCallback(() => {
    const s = scene.current
    setUi({ ...s, layers: { ...s.layers }, time: { ...s.time } })
  }, [])
  const controlsRef = useRef(controls)
  controlsRef.current = controls
  const gesture = useCallback(() => {
    if (document.documentElement.hasAttribute('data-oneworld-ghost-active')) return
    interacted.current = true
    controlsRef.current.registerInteraction()
  }, [])
  const onReady = useCallback(() => setReady(true), [])
  const onError = useCallback(() => setFailure(true), [])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReducedMotion(media.matches); if (media.matches) { scene.current.playing = false; scene.current.time.live = false; sync() } }
    const compact = matchMedia('(max-width: 760px)')
    const resizeDetails = () => setDetails(!compact.matches)
    compact.addEventListener('change', resizeDetails)
    media.addEventListener('change', change)
    const timer = window.setInterval(() => {
      if (!document.hidden && (scene.current.playing || scene.current.time.live)) sync()
    }, 160)
    return () => { media.removeEventListener('change', change); compact.removeEventListener('change', resizeDetails); window.clearInterval(timer) }
  }, [sync])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    if (!panel) return
    if (panel === 'time') root.current?.querySelector<HTMLInputElement>('.eso-date-form input')?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Consume the panel dismissal before the minimal shell treats Escape as a world exit.
      event.preventDefault()
      event.stopPropagation()
      setPanel(null)
      panelTrigger.current?.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [panel])

  const animateCamera = useCallback((lat: number, lon: number, radius = 4.3) => {
    const s = scene.current
    const target = globePoseFacingLatLon(lat, lon)
    let yaw = target.yaw - (s.epoch - initialEpoch.current) / (23.9345 * HOUR) * Math.PI * 2
    yaw = s.yaw + Math.atan2(Math.sin(yaw - s.yaw), Math.cos(yaw - s.yaw))
    s.velYaw = 0; s.velPitch = 0
    tweens.current = []
    for (const [key, to] of [['yaw', yaw], ['pitch', target.pitch], ['radius', radius]] as const) {
      if (reducedMotion) s[key] = to
      else tweens.current.push({ from: s[key], to, dur: 850, startAt: performance.now(), apply: (value) => { s[key] = value } })
    }
  }, [reducedMotion])

  useEffect(() => {
    const abort = new AbortController()
    const timer = window.setTimeout(() => abort.abort(), 3000)
    getApproximateEarthLocation(abort.signal)
      .then((location) => {
        const data = location ? { lat: location.latitude, lon: location.longitude, timeZone: location.timeZone } : null
        if (!data || !Number.isFinite(data.lat) || !Number.isFinite(data.lon) || Math.abs(data.lat) > 90 || Math.abs(data.lon) > 180) return
        const place: Picked = { name: '大致位置', lat: data.lat, lon: data.lon, tz: Math.round(data.lon / 15), timeZone: data.timeZone ?? undefined }
        if (interacted.current || abort.signal.aborted) return
        scene.current.picked = place
        sync()
      })
      .catch(() => { /* The initial San Francisco view remains usable offline. */ })
      .finally(() => window.clearTimeout(timer))
    return () => { abort.abort(); window.clearTimeout(timer) }
  }, [animateCamera, sync])

  const setEpoch = useCallback((epoch: number) => {
    const s = scene.current
    s.epoch = epoch
    s.time = simTimeAt(epoch, false)
    s.playing = false
    sync()
  }, [sync])
  const focus = useCallback((lat: number, lon: number) => {
    scene.current.picked = placeFromLatLon(lat, lon)
    scene.current.layers.markers = true
    scene.current.view = 'earth'
    animateCamera(lat, lon, 2.8)
    sync()
  }, [animateCamera, sync])
  const pick = useCallback((lat: number, lon: number) => {
    scene.current.picked = placeFromLatLon(lat, lon)
    scene.current.layers.markers = true
    scene.current.playing = false; scene.current.time.live = false
    sync()
  }, [sync])
  const selectPlace = (place: Picked) => {
    gesture()
    scene.current.picked = place
    scene.current.layers.markers = true
    scene.current.view = 'earth'
    animateCamera(place.lat, place.lon)
    setPanel(null)
    sync()
  }
  const switchView = (view: ViewMode, moonFocus = false) => {
    gesture()
    scene.current.view = view
    if (view === 'sun') { scene.current.layers.axis = true; scene.current.sunFocus = false; scene.current.sunRadius = 16; setRange('year') }
    else if (view === 'moon') { setRange('month'); scene.current.sunAz = 0.62; scene.current.sunEl = 0.65; scene.current.sunRadius = 16; scene.current.moonFocus = moonFocus }
    else setRange('day')
    sync()
  }
  const play = useCallback(() => {
    gesture()
    const s = scene.current
    if (s.time.live || s.playing) { s.time.live = false; s.playing = false }
    else s.playing = true
    sync()
  }, [gesture, sync])
  const now = () => {
    gesture()
    scene.current.epoch = Date.now()
    scene.current.time = simTimeAt(scene.current.epoch, true)
    scene.current.playing = true
    scene.current.direction = 1
    sync()
  }
  const screenshot = () => {
    gesture()
    const canvas = root.current?.querySelector<HTMLCanvasElement>('.eso-stage canvas')
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) { setNotice('截图失败'); return }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `earth-${new Date(scene.current.epoch).toISOString().replace(/[:.]/g, '-')}.webp`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
      setNotice('截图已保存')
    }, 'image/webp', 0.9)
  }
  const fullscreen = async () => {
    gesture()
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else setNotice('此浏览器不支持全屏，请使用沉浸模式')
    } catch { setNotice('无法进入全屏') }
  }

  const chooseTopic = (topic: Topic) => {
    gesture()
    const s = scene.current
    s.topic = topic; s.view = 'earth'; s.playing = false; s.time.live = false
    s.layers = { ...DEFAULT_LAYERS, clouds: topic === 'explore', axis: topic !== 'explore', grid: topic === 'coordinates' || topic === 'time', equator: topic !== 'explore', tropics: topic === 'zones' || topic === 'seasons', polar: topic === 'zones' || topic === 'seasons', markers: topic !== 'explore' }
    s.compareId = topic === 'seasons' ? 'sydney' : topic === 'time' ? 'london' : ''
    s.velYaw = 0; s.velPitch = 0
    setRange(topic === 'seasons' || topic === 'zones' ? 'year' : 'day')
    s.speedId = topic === 'seasons' || topic === 'zones' ? 'year' : 'hour'
    lessonStart.current = { epoch: s.epoch, picked: { ...s.picked }, topic, layers: { ...s.layers }, compareId: s.compareId ?? '' }
    setLessonId(null); setAnswers(true); setPanel(null)
    animateCamera(s.picked.lat, s.picked.lon, 4.3)
    sync()
  }
  const applyLesson = (id: LessonId) => {
    const lesson = LESSONS.find(l => l.id === id)!
    chooseTopic(lesson.topic)
    const s = scene.current
    s.picked = placeFromLatLon(lesson.lat, lesson.lon)
    if (lesson.season !== undefined) s.epoch = seasonEpochs(new Date(s.epoch).getUTCFullYear())[lesson.season]
    if (id === 'sunrise') s.epoch = daylightAt(s.epoch, { ...s.picked, id: 'lesson' }).sunriseEpoch ?? s.epoch
    if (id === 'noon') s.epoch = solarNoonEpoch(s.epoch, s.picked.lon)
    s.time = simTimeAt(s.epoch, false)
    animateCamera(id === 'polar' ? 80 : s.picked.lat, s.picked.lon, 4.3)
    lessonStart.current = { epoch: s.epoch, picked: { ...s.picked }, topic: lesson.topic, layers: { ...s.layers }, compareId: s.compareId ?? '' }
    setLessonId(id); sync()
  }
  const resetScene = () => {
    gesture()
    const saved = lessonStart.current
    if (!saved) { chooseTopic(scene.current.topic ?? 'explore'); return }
    const s = scene.current
    s.epoch = saved.epoch; s.time = simTimeAt(saved.epoch, false); s.playing = false; s.view = 'earth'
    s.topic = saved.topic; s.picked = { ...saved.picked }; s.layers = { ...saved.layers }; s.compareId = saved.compareId; s.labels = true
    s.velYaw = 0; s.velPitch = 0
    setAnswers(true); setRange(saved.topic === 'seasons' || saved.topic === 'zones' ? 'year' : 'day')
    animateCamera(saved.picked.lat, saved.picked.lon, 4.3); sync()
  }
  const shareScene = async () => {
    gesture()
    const s = scene.current
    if (s.view !== 'earth') { setNotice('请先返回地球视角再保存课堂场景'); return }
    const saved: SavedScene = { version: 1, skin: s.skin ?? 'satellite', nightShade: s.nightShade !== false, topic: s.topic ?? 'explore', epoch: s.epoch, lat: s.picked.lat, lon: s.picked.lon, compare: s.compareId ?? '', yaw: s.yaw + ((s.epoch - initialEpoch.current) / (23.9345 * HOUR) * Math.PI * 2) % (Math.PI * 2), pitch: s.pitch, radius: s.radius, layers: { ...s.layers }, labels: s.labels !== false, projection: !!s.projection, answers }
    const url = new URL(location.href); url.searchParams.set('earth', JSON.stringify(saved))
    try { await navigator.clipboard.writeText(url.href); setNotice('场景链接已复制，打开后从暂停状态继续') }
    catch { setNotice('无法复制链接，请检查浏览器剪贴板权限') }
  }
  useEffect(() => {
    const saved = parseSavedScene(new URLSearchParams(location.search).get('earth'))
    if (!saved) return
    interacted.current = true
    const s = scene.current
    s.epoch = saved.epoch; s.time = simTimeAt(saved.epoch, false); s.playing = false; s.topic = saved.topic
    s.picked = placeFromLatLon(saved.lat, saved.lon)
    // Preserve an exact coordinate rather than snapping a shared point to a city.
    if (Math.abs(s.picked.lat - saved.lat) > 0.001 || Math.abs(s.picked.lon - saved.lon) > 0.001) s.picked = { lat: saved.lat, lon: saved.lon, name: '选中地点', tz: Math.round(saved.lon / 15) }
    s.yaw = saved.yaw - ((s.epoch - initialEpoch.current) / (23.9345 * HOUR) * Math.PI * 2) % (Math.PI * 2)
    s.skin = saved.skin; s.nightShade = saved.nightShade
    s.pitch = saved.pitch; s.radius = saved.radius; s.labels = saved.labels; s.projection = saved.projection
    s.compareId = PLACES.some(p => p.id === saved.compare) ? saved.compare : ''
    for (const key of Object.keys(DEFAULT_LAYERS) as Array<keyof typeof DEFAULT_LAYERS>) if (typeof saved.layers[key] === 'boolean') s.layers[key] = saved.layers[key]
    setRange(saved.topic === 'seasons' || saved.topic === 'zones' ? 'year' : 'day')
    s.speedId = saved.topic === 'seasons' || saved.topic === 'zones' ? 'year' : 'hour'
    lessonStart.current = { epoch: s.epoch, picked: { ...s.picked }, topic: saved.topic, layers: { ...s.layers }, compareId: s.compareId ?? '' }
    setAnswers(saved.answers); sync()
  }, [sync])

  useEffect(() => {
    const api = {
      poster() {
        interacted.current = true
        const s = scene.current
        const posterEpoch = Date.UTC(2026, 8, 22, 16)
        const posterSpin = (posterEpoch - initialEpoch.current) / (23.9345 * HOUR) * Math.PI * 2
        s.epoch = posterEpoch
        s.time = simTimeAt(s.epoch, false); s.playing = false; s.view = 'earth'
        s.topic = 'explore'
        s.layers = { ...DEFAULT_LAYERS, markers: false, terminator: false, axis: false }
        const target = globePoseFacingLatLon(25, 5)
        s.yaw = target.yaw - posterSpin % (Math.PI * 2); s.pitch = target.pitch; s.radius = 3.25
        s.velYaw = 0; s.velPitch = 0; tweens.current = []; sync()
      },
      pose: () => ({ ...scene.current, time: { ...scene.current.time }, layers: { ...scene.current.layers } }),
    }
    ;(window as Window & { __eso?: typeof api }).__eso = api
    return () => { delete (window as Window & { __eso?: typeof api }).__eso }
  }, [sync])

  const epoch = ui.epoch
  const solarSystem = useMemo(() => earthSunAt(epoch), [epoch])
  const lunar = useMemo(() => earthMoonAt(epoch), [epoch])
  const selected: Place = { ...ui.picked, id: ui.picked.id ?? '' }
  const offset = timezoneOffsetAt(epoch, selected)
  const solar = solarCoordsAt(epoch)
  const daylight = daylightAt(epoch, selected)
  const daytime = isDayAt(selected.lat, selected.lon, solar)
  const state = daylight.polar === 'day' ? '极昼' : daylight.polar === 'night' ? '极夜' : daytime ? '白天' : '夜晚'
  const localEpoch = epoch + offset * HOUR
  const date = new Date(localEpoch)
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale])
  const clock = formatHHMM(date.getUTCHours() + date.getUTCMinutes() / 60)
  const eventClock = (value: number | null) => value === null ? '—' : formatHHMM(new Date(value).getUTCHours() + new Date(value).getUTCMinutes() / 60 + timezoneOffsetAt(value, selected))
  const year = new Date(epoch).getUTCFullYear()
  const topic = ui.topic ?? 'explore'
  const teaching = TOPICS.find(t => t.id === topic)!
  const sunHere = localSun(selected.lat, selected.lon, solar)
  const comparison = PLACES.find(p => p.id === ui.compareId)
  const sunThere = comparison ? localSun(comparison.lat, comparison.lon, solar) : null
  const geometryHours = geometricDayHours(selected.lat, solar.declDeg)
  const geometryMinutes = Math.round(geometryHours * 60)
  const dates = useMemo(() => seasonEpochs(year), [year])

  const rangeStart = range === 'year' ? Date.UTC(year, 0, 1) : range === 'month' ? Date.UTC(year, new Date(epoch).getUTCMonth(), 1) : Math.floor(epoch / DAY) * DAY
  const rangeEnd = range === 'year' ? Date.UTC(year + 1, 0, 1) - 60_000 : range === 'month' ? Date.UTC(year, new Date(epoch).getUTCMonth() + 1, 1) - 60_000 : rangeStart + DAY - 60_000
  const changePanel = (next: typeof panel) => {
    gesture()
    panelTrigger.current = document.activeElement as HTMLElement | null
    if (next === 'time') {
      const value = new Date(scene.current.epoch).toISOString()
      setDraftDate(value.slice(0, 10))
      setDraftTime(value.slice(11, 16))
    }
    setPanel(panel === next ? null : next)
  }
  const panelTitle = panel === 'time' ? '日期与时间' : '操作帮助'
  const goToSunEvent = (value: number | null) => {
    if (value === null) return
    gesture()
    setEpoch(value)
    scene.current.view = 'earth'
    setRange('day')
    animateCamera(selected.lat, selected.lon)
    sync()
  }

  return (
    <div className={`eso-experience${ui.view === 'moon' ? ' eso-moon-view' : ui.view === 'sun' ? ' eso-sun-view' : ''}${topic !== 'explore' ? ' eso-teaching' : ''}${ui.projection ? ' eso-projection' : ''}${panel ? ' eso-panel-open' : ''}`} ref={root} onPointerDownCapture={(event) => { if ((event.target as HTMLElement).closest('.eso-stage')) setPanel(null) }}>
      <div className="eso-stage" tabIndex={0} role="group" aria-label={tx('地球：拖动旋转，滚轮缩放，方向键旋转，空格播放或暂停')} onKeyDown={(event) => {
        if (event.key === ' ') { event.preventDefault(); play() }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-'].includes(event.key)) {
          event.preventDefault(); gesture(); tweens.current = []
          const s = scene.current
          if (s.view === 'earth') {
            if (event.key === 'ArrowLeft') s.yaw -= 0.12
            if (event.key === 'ArrowRight') s.yaw += 0.12
            if (event.key === 'ArrowUp') s.pitch = Math.max(-1.5, s.pitch - 0.12)
            if (event.key === 'ArrowDown') s.pitch = Math.min(1.5, s.pitch + 0.12)
            if (event.key === '+') s.radius = Math.max(2.2, s.radius - 0.2)
            if (event.key === '-') s.radius = Math.min(5.6, s.radius + 0.2)
          } else {
            if (event.key === 'ArrowLeft') s.sunAz -= 0.12
            if (event.key === 'ArrowRight') s.sunAz += 0.12
            if (event.key === 'ArrowUp') s.sunEl = Math.min(1.35, s.sunEl + 0.12)
            if (event.key === 'ArrowDown') s.sunEl = Math.max(0.2, s.sunEl - 0.12)
            if (event.key === '+') s.sunRadius = Math.max(8, s.sunRadius - 1)
            if (event.key === '-') s.sunRadius = Math.min(32, s.sunRadius + 1)
          }
        }
      }}>
        <Canvas camera={{ position: [0, 0, 3.4], fov: 42, near: 0.08, far: 160 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }} aria-label={tx('交互地球仪：经纬度、昼夜与四季')}>
          <color attach="background" args={['#02050a']} />
          <WorldScene scene={scene} tweens={tweens} view={ui.view} layers={ui.layers} picked={ui.picked} interactive reducedMotion={reducedMotion} onUserGesture={gesture} onPick={pick} onFocus={focus} onReady={onReady} onError={onError} />
        </Canvas>
      </div>
      {(!ready || failure) && <div className="eso-loading" role="status">{failure ? tx('地球影像加载失败，请刷新重试') : tx('正在加载地球影像')}</div>}
      <header className="eso-heading" data-experience-overlay="true">
        <div className="eso-title"><span className="eso-eyebrow">EARTH / {tx('观察与发现')}</span><h1>{tx('交互地球仪')}</h1></div>
        <nav className="eso-topics" aria-label={tx('地理主题')}>
          {TOPICS.map(t => <button key={t.id} aria-pressed={topic === t.id && ui.view === 'earth'} onClick={() => chooseTopic(t.id)}>{tx(t.label)}</button>)}
        </nav>
      </header>
      <div className="eso-tools" data-experience-overlay="true">
        <button title={tx('投影显示')} aria-label={tx('投影显示')} aria-pressed={!!ui.projection} onClick={() => { gesture(); scene.current.projection = !scene.current.projection; if (scene.current.projection) scene.current.layers.clouds = false; sync() }}><BookOpen /></button>
        <button title={tx('复制场景链接')} aria-label={tx('复制场景链接')} onClick={shareScene}><Link /></button>
        <button title={tx('全屏')} aria-label={tx('全屏')} onClick={fullscreen}><ArrowsOut /></button>
        <button title={tx('操作帮助')} aria-label={tx('操作帮助')} aria-expanded={panel === 'help'} onClick={() => changePanel('help')}><Info /></button>
      </div>
      {ui.view === 'earth' && <section className="eso-lesson-copy" data-experience-overlay="true">
        <span className="eso-section-label">{tx(topic === 'explore' ? '选择地点，观察地球' : '观察问题')}</span>
        <h2>{tx(teaching.question)}</h2>
        <p>{tx(teaching.hint)}</p>
        {topic === 'coordinates' && answers && <svg className="eso-angle-diagram" viewBox="0 0 220 240" role="img" aria-label={tx('纬度是地点与赤道平面的夹角；经度是经线平面与本初子午线平面的夹角')}>
          <circle cx="70" cy="67" r="48" fill="none" stroke="#657887" />
          <path d="M14 67H125M70 12V121" stroke="#657887" strokeDasharray="3 4" />
          <path d={`M70 67L${70 + 48 * Math.cos(selected.lat * Math.PI / 180)} ${67 - 48 * Math.sin(selected.lat * Math.PI / 180)}`} stroke="#edc67e" strokeWidth="2" />
          <circle cx={70 + 48 * Math.cos(selected.lat * Math.PI / 180)} cy={67 - 48 * Math.sin(selected.lat * Math.PI / 180)} r="3" fill="#edc67e" />
          <circle cx="70" cy="184" r="39" fill="none" stroke="#657887" />
          <path d="M70 184V135" stroke="#98a9b6" strokeDasharray="3 4" />
          <path d={`M70 184L${70 + 39 * Math.sin(selected.lon * Math.PI / 180)} ${184 - 39 * Math.cos(selected.lon * Math.PI / 180)}`} stroke="#87d4f2" strokeWidth="2" />
          <path d={`M70 163A21 21 0 ${Math.abs(selected.lon) > 180 ? 1 : 0} ${selected.lon >= 0 ? 1 : 0} ${70 + 21 * Math.sin(selected.lon * Math.PI / 180)} ${184 - 21 * Math.cos(selected.lon * Math.PI / 180)}`} fill="none" stroke="#87d4f2" />
          <text x="132" y="179">{tx('经度')}</text><text x="132" y="201">{Math.abs(selected.lon).toFixed(1)}°{selected.lon >= 0 ? 'E' : 'W'}</text>
          <text x="132" y="60">{tx('纬度')}</text><text x="132" y="81">{Math.abs(selected.lat).toFixed(1)}°{selected.lat >= 0 ? 'N' : 'S'}</text>
        </svg>}
      </section>}
      {panel && <aside className={`eso-panel eso-glass${panel === 'time' ? ' eso-date-panel' : ''}`} data-experience-overlay="true" aria-label={tx(panelTitle)}>
        <div className="eso-panel-heading"><strong>{tx(panelTitle)}</strong><button aria-label={tx('关闭')} onClick={() => setPanel(null)}><X /></button></div>
        {panel === 'time' && <form className="eso-date-form" onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const next = Date.parse(`${form.get('date')}T${form.get('time')}:00Z`)
          if (!Number.isFinite(next)) return
          gesture(); setEpoch(next); setPanel(null)
        }}>
          <label>{tx('日期')}<input name="date" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={draftDate} /></label>
          <label>{tx('时间（UTC）')}<input name="time" type="time" required defaultValue={draftTime} /></label>
          <button type="submit">{tx('应用时间')}</button>
          <div className="eso-calendar-seasons" role="group" aria-label={tx('四季定位')}>{SEASONS.map((season, i) => <button type="button" key={season} onClick={() => { gesture(); setEpoch(dates[i]); setRange('year'); setPanel(null) }}>{tx(season)}</button>)}</div>
        </form>}
        {panel === 'help' && <div className="eso-help"><p>{tx('拖动地球旋转视角，滚轮或双指缩放。点击选择地点，双击或双点聚焦。')}</p><p>{tx('拖动时间轴，观察昼夜交替。切换到一年和太阳视角，观察公转与地轴倾角。')}</p><p>{tx('方向键旋转，空格播放或暂停，Esc 关闭面板。')}</p><p>{tx('云图与城市灯光并非实时天气。太阳和地月视角的天体大小与距离均使用同一真实比例；全景中的地球可能小于一个像素，文字仅标注位置。')}</p></div>}
      </aside>}
      {ui.view === 'sun' && <aside className="eso-solar-info eso-moon-info eso-glass" data-experience-overlay="true" aria-label={tx('日地真实比例')}>
        <span>{tx('日地中心距离')}</span><strong>{Math.round(solarSystem.distanceKm).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')} km</strong>
        <p>{tx('太阳直径约为地球的')} {SUN_RADIUS.toFixed(1)} {tx('倍')}</p>
        <button onClick={() => { gesture(); scene.current.sunFocus = !scene.current.sunFocus; scene.current.sunRadius = 16; sync() }}>{tx(ui.sunFocus ? '查看完整公转轨道' : '近看太阳')}</button>
        <small>{tx('天体与距离同比例；近景仅移动相机。')}</small>
      </aside>}
      {ui.view === 'moon' && <aside className="eso-moon-info eso-glass" data-experience-overlay="true" aria-label={tx('地月距离与月相')}>
        {!ui.moonFocus && <button role="switch" aria-checked={ui.moonOrbit !== false} onClick={() => { gesture(); scene.current.moonOrbit = scene.current.moonOrbit === false; sync() }}>{tx('月球轨道')}</button>}
        <span>{tx('中心距离')}</span><strong>{Math.round(lunar.distanceKm).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')} km</strong>
        <p>{tx('约为地球直径的')} {(lunar.distanceKm / 12742).toFixed(1)} {tx('倍')}</p>
        <p>{tx(phaseName(lunar.phase))} · {tx('可见亮面')} {(lunar.illumination * 100).toFixed(1)}%</p>
        <button onClick={() => { gesture(); scene.current.moonFocus = !scene.current.moonFocus; scene.current.sunRadius = 16; sync() }}>{tx(ui.moonFocus ? '返回地月全景' : '从地球看月亮')}</button>
        <small>{tx(ui.moonFocus ? '移动相机靠近月球，天体大小与距离比例保持不变。' : '两球大小与距离同比例；轨道线为前后约半个月的月球路径。')}</small>
      </aside>}
      {ui.view === 'earth' && <aside className={`eso-readout eso-glass${details ? ' is-expanded' : ''}`} data-experience-overlay="true" data-freebar-clearance="true" aria-label={tx('地点与日照')}>
        <button className="eso-readout-top" aria-expanded={details} onClick={() => { gesture(); setDetails(!details) }}><span><i className={daytime ? 'is-day' : ''} />{tx(selected.name)}<small>{answers ? tx(state) : tx('先观察，再揭晓')}</small></span><CaretDown /></button>
        {answers && <div className="eso-coordinates">{formatLatLon(selected.lat, selected.lon)}</div>}
        {answers && <>
          {topic === 'explore' && <div className="eso-clock"><strong>{clock}</strong><span>{dateFormat.format(date)}<small>{timezoneLabel(offset)}{!selected.timeZone ? ` · ${tx('估算时区')}` : ''}</small></span></div>}
          {topic !== 'explore' && <div className="eso-key-reading"><span>{tx(topic === 'coordinates' || topic === 'zones' ? '所在纬度带' : topic === 'solar' ? '太阳高度' : topic === 'time' ? '地方太阳时' : '几何白昼')}</span><strong>{topic === 'coordinates' || topic === 'zones' ? tx(latitudeZone(selected.lat)) : topic === 'solar' ? `${sunHere.altitude.toFixed(1)}°` : topic === 'time' ? formatHHMM(sunHere.solarTime) : `${Math.floor(geometryMinutes / 60)}h ${geometryMinutes % 60}m`}</strong></div>}
          {['daylight', 'seasons'].includes(topic) && <div className="eso-day-arc" aria-label={tx('所选纬线的昼弧和夜弧')}><i style={{ width: `${geometryHours / 24 * 100}%` }} /><span>{tx('昼弧')}</span><span>{tx('夜弧')}</span></div>}
          {topic === 'solar' && <div className="eso-shadow"><svg viewBox="0 0 240 100" role="img" aria-label={tx('一米竖杆的影子侧视示意')}>
            <path d="M12 78H228" stroke="#718490" /><path d="M65 78V34" stroke="#e4e9ed" strokeWidth="3" />
            {sunHere.shadow !== null && <><path d={`M65 78H${65 + sunHere.shadow * 44}`} stroke="#a7c8d9" strokeWidth="5" /><path d={`M${65 - 50 * Math.cos(sunHere.altitude * Math.PI / 180)} ${34 - 50 * Math.sin(sunHere.altitude * Math.PI / 180)}L65 34L${65 + sunHere.shadow * 44} 78`} stroke="#f0ce84" fill="none" strokeDasharray="3 4" /></>}
            <text x="18" y="55">1 m</text><text x="95" y="96">{tx(sunHere.shadow === null ? '太阳在地平线下' : '影子')}</text>
          </svg><span>{tx('影长')} <strong>{sunHere.shadow === null ? '—' : sunHere.shadow > 100 ? '> 100 m' : `${sunHere.shadow.toFixed(2)} m`}</strong></span><small>{tx('长影超出画幅时截断显示；数值保留真实比例。')}</small></div>}
          {comparison && sunThere && <div className="eso-compare-reading"><span>{tx('对照')} · {tx(comparison.name)}</span><strong>{topic === 'time' ? formatHHMM(sunThere.solarTime) : topic === 'solar' ? `${sunThere.altitude.toFixed(1)}°` : topic === 'coordinates' || topic === 'zones' ? tx(latitudeZone(comparison.lat)) : `${geometricDayHours(comparison.lat, solar.declDeg).toFixed(1)} h`}</strong></div>}
          <div className="eso-readout-details">
            <div><span>{tx('太阳直射纬度')}</span><strong>{`${Math.abs(solar.subsolarLat).toFixed(1)}°${solar.subsolarLat >= 0 ? 'N' : 'S'}`}</strong></div>
            <div><span>{tx('太阳高度')}</span><strong>{sunHere.altitude.toFixed(1)}°</strong></div>
            <button className="eso-sun-event" disabled={daylight.sunriseEpoch === null} aria-label={tx('跳到日出')} onClick={() => goToSunEvent(daylight.sunriseEpoch)}><span>{tx('日出')}</span><strong>{eventClock(daylight.sunriseEpoch)}<SkipForward /></strong></button>
            <button className="eso-sun-event" disabled={daylight.sunsetEpoch === null} aria-label={tx('跳到日落')} onClick={() => goToSunEvent(daylight.sunsetEpoch)}><span>{tx('日落')}</span><strong>{eventClock(daylight.sunsetEpoch)}<SkipForward /></strong></button>
            <div><span>{tx('当地钟表')}</span><strong>{clock}</strong></div><div><span>{tx('地方太阳时')}</span><strong>{formatHHMM(sunHere.solarTime)}</strong></div>
            {comparison && <div><span>{tx('对照地点钟表')}</span><strong>{formatHHMM(new Date(epoch).getUTCHours() + new Date(epoch).getUTCMinutes() / 60 + timezoneOffsetAt(epoch, comparison))}</strong></div>}
            <p className="eso-model-note">{topic === 'zones' && <>{tx('五带按太阳照射条件划分，不是实际气候类型或温度地图。')} </>}{tx('昼弧按几何晨昏线计算；日出日落含大气折射与太阳视圆面近似。太阳高度不含折射。')}{!selected.timeZone && ` ${tx('此地点钟表按经度估算时区。')}`}</p>
          </div>
        </>}
      </aside>}
      <Freebar
        className="eso-freebar"
        mainClassName="eso-toolbar"
        ariaLabel={tx('时间控制')}
        primaryControlBudget={3}
        secondaryDefault="closed"
        secondaryClassName="eso-time-settings"
        secondary={(<>
        <div className="eso-toolbar-heading">
          <FreebarTabs activeId={toolTab} ariaLabel={tx('观察工具')} onChange={id => { gesture(); setToolTab(id) }} tabs={[
            { id: 'time', label: tx('时间') }, { id: 'place', label: tx('地点') },
            { id: 'appearance', label: tx('外观') }, { id: 'lesson', label: tx('课堂') }, { id: 'layers', label: tx('图层') }, { id: 'camera', label: tx('视角') },
          ]} />
          <button className="experience-freebar-reset" aria-label={tx('重置当前场景')} onClick={resetScene}><ArrowCounterClockwise /><span>{tx('重置')}</span></button>
        </div>
          <div className="eso-control-rail">
            {toolTab === 'time' && <>
              <div className="eso-period-tabs experience-freebar-seg" role="group" aria-label={tx('时间范围')}>{(['day', 'month', 'year'] as const).map(value => <button key={value} className={range === value ? 'is-active' : ''} aria-pressed={range === value} onClick={() => { gesture(); setRange(value); scene.current.speedId = value === 'day' ? 'hour' : value === 'month' ? 'day' : 'year'; sync() }}>{tx(value === 'day' ? '一天' : value === 'month' ? '一月' : '一年')}</button>)}</div>
              <button aria-label={tx('倒退一小时')} title={tx('倒退一小时')} onClick={() => { gesture(); setEpoch(scene.current.epoch - HOUR) }}><SkipBack /></button>
              <button className="eso-calendar-value" aria-label={tx('选择日期与时间')} aria-expanded={panel === 'time'} onClick={() => changePanel('time')}><time>{new Date(epoch).toISOString().slice(0, 16).replace('T', ' ')}</time><small>UTC</small></button>
              <button aria-label={tx('前进一小时')} title={tx('前进一小时')} onClick={() => { gesture(); setEpoch(scene.current.epoch + HOUR) }}><SkipForward /></button>
              {range === 'year' ? <select aria-label={tx('二分二至')} value="" onChange={e => { gesture(); setEpoch(dates[Number(e.target.value)]) }}><option value="" disabled>{tx('二分二至')}</option>{SEASONS.map((name, i) => <option key={name} value={i}>{tx(name)}</option>)}</select> : <select value={ui.speedId} aria-label={tx('模拟速度')} onChange={e => { gesture(); scene.current.speedId = e.target.value as SpeedId; scene.current.time.live = false; sync() }}>{SPEEDS.map(speed => <option key={speed.id} value={speed.id}>{tx(speed.id === 'live' ? '1×' : speed.label)}</option>)}</select>}
              {topic === 'solar' && <button onClick={() => { gesture(); setEpoch(solarNoonEpoch(epoch, selected.lon)) }}>{tx('当地正午')}</button>}
              <button aria-label={tx('回到现在')} title={tx('回到现在')} onClick={now}><Clock /></button>
            </>}
            {toolTab === 'lesson' && <>
              <select aria-label={tx('课堂预设')} value={lessonId ?? ''} onChange={e => { if (e.target.value) applyLesson(e.target.value as LessonId) }}><option value="">{tx('选择课堂例子')}</option>{LESSONS.map(l => <option key={l.id} value={l.id}>{tx(l.label)}</option>)}</select>
              <select aria-label={tx('对照地点')} value={ui.compareId ?? ''} onChange={e => { gesture(); scene.current.compareId = e.target.value; sync() }}><option value="">{tx('不比较')}</option>{PLACES.map(p => <option key={p.id} value={p.id}>{tx(p.name)}</option>)}</select>
              <button aria-pressed={!answers} onClick={() => { gesture(); scene.current.labels = !answers; setAnswers(!answers); sync() }}>{answers ? <EyeSlash /> : <Eye />}{tx(answers ? '隐藏答案' : '显示答案')}</button>
            </>}
            {toolTab === 'place' && <>
              <select aria-label={tx('选择地点')} value={selected.id && PLACES.some(p => p.id === selected.id) ? selected.id : ''} onChange={e => { const p = PLACES.find(p => p.id === e.target.value); if (p) selectPlace(p) }}><option value="">{tx('选中地点')}</option>{PLACES.map(p => <option key={p.id} value={p.id}>{tx(p.name)}</option>)}</select>
              <form className="eso-coordinate-form" onSubmit={e => { e.preventDefault(); gesture(); const f = new FormData(e.currentTarget); const lat = Number(f.get('lat')), lon = Number(f.get('lon')); scene.current.picked = { lat, lon, name: '选中地点', tz: Math.round(lon / 15) }; scene.current.layers.markers = true; scene.current.playing = false; scene.current.time.live = false; scene.current.view = 'earth'; animateCamera(lat, lon, 4.3); sync() }}>
                <label><span>{tx('纬度')}</span><input key={`lat-${selected.lat}`} name="lat" placeholder={tx('纬度')} type="number" min="-90" max="90" step="any" defaultValue={selected.lat.toFixed(3)} required aria-label={tx('纬度，北正南负')} title={tx('纬度，北正南负')} /></label>
                <label><span>{tx('经度')}</span><input key={`lon-${selected.lon}`} name="lon" placeholder={tx('经度')} type="number" min="-180" max="180" step="any" defaultValue={selected.lon.toFixed(3)} required aria-label={tx('经度，东正西负')} title={tx('经度，东正西负')} /></label>
                <button type="submit">{tx('定位')}</button>
              </form>
            </>}
            {toolTab === 'appearance' && <>
              <div className="eso-skin-options" role="group" aria-label={tx('地球皮肤')}>
                {EARTH_SKINS.map(skin => <button key={skin.id} aria-pressed={(ui.skin ?? 'satellite') === skin.id} onClick={() => { gesture(); scene.current.skin = skin.id; scene.current.layers.clouds = skin.id === 'satellite'; sync() }}><i className={`eso-skin-swatch eso-skin-${skin.id}`} aria-hidden="true" />{tx(skin.label)}</button>)}
              </div>
              <span className="eso-appearance-note">{tx('地图配色仅区分海陆')}</span>
            </>}
            {toolTab === 'layers' && <div className="eso-layer-options">
              <label><input type="checkbox" checked={ui.labels !== false} onChange={() => { gesture(); scene.current.labels = !scene.current.labels; sync() }} />{tx('名称标注')}</label>
              {LAYER_CHIPS.map(l => <label key={l.key}><input type="checkbox" checked={ui.layers[l.key]} onChange={() => { gesture(); scene.current.layers[l.key] = !scene.current.layers[l.key]; sync() }} />{tx(l.label)}</label>)}
            </div>}
            {toolTab === 'camera' && <>
              <button aria-pressed={ui.view === 'earth'} onClick={() => switchView('earth')}>{tx('地球')}</button>
              <button aria-pressed={ui.view === 'sun'} onClick={() => switchView('sun')}>{tx('日地比例')}</button>
              <button aria-pressed={ui.view === 'moon' && !ui.moonFocus} onClick={() => switchView('moon')}>{tx('地月比例')}</button>
              <button aria-pressed={ui.view === 'moon' && !!ui.moonFocus} onClick={() => switchView('moon', true)}>{tx('月亮视角')}</button>
              <span className="eso-rail-divider" />
              <select aria-label={tx('观察方向')} value="" onChange={e => { const views = [{ lat: 0, lon: selected.lon }, { lat: 89, lon: selected.lon }, { lat: -89, lon: selected.lon }, { lat: solar.subsolarLat, lon: solar.subsolarLon }]; const v = views[Number(e.target.value)]; gesture(); scene.current.view = 'earth'; animateCamera(v.lat, v.lon, 4.3); sync() }}>
                <option value="" disabled>{tx('观察方向')}</option>{['赤道侧视', '北极俯视', '南极俯视', '面向太阳'].map((label, i) => <option key={label} value={i}>{tx(label)}</option>)}
              </select>
              <button title={tx('截图')} aria-label={tx('截图')} onClick={screenshot}><Camera /></button>
            </>}
          </div>
        </>)}
      >
        <button type="button" className="eso-play experience-freebar-play" data-playing={ui.playing} aria-label={tx(ui.playing ? '暂停' : '播放')} aria-pressed={ui.playing} onClick={play}>
          {ui.playing ? <Pause weight="fill" /> : <Play weight="fill" />}
        </button>
        <button className="eso-light-toggle" aria-label={tx('昼夜明暗')} aria-pressed={ui.nightShade !== false} title={tx(ui.nightShade !== false ? '关闭夜面遮暗' : '恢复昼夜明暗')} onClick={() => { gesture(); scene.current.nightShade = scene.current.nightShade === false; sync() }}>
          {ui.nightShade !== false ? <Moon /> : <Sun />}<span>{tx(ui.nightShade !== false ? '昼夜' : '全亮')}</span>
        </button>
        <div className="eso-scrubber">
          <div className="eso-time-label"><span>{range === 'day' ? '00:00' : new Date(rangeStart).toISOString().slice(5, 10)}</span><time>{new Date(epoch).toISOString().slice(0, 16).replace('T', ' ')} UTC</time><span>{range === 'day' ? '24:00' : new Date(rangeEnd).toISOString().slice(5, 10)}</span></div>
        <input
          aria-label={tx(range === 'day' ? '一天中的时刻（UTC）' : range === 'month' ? '一月中的时刻（UTC）' : '一年中的时刻（UTC）')}
          type="range"
          min={rangeStart}
          max={rangeEnd}
          step={range === 'day' ? 60_000 : HOUR}
          value={epoch}
          style={{ '--fill': `${100 * (epoch - rangeStart) / (rangeEnd - rangeStart)}%` } as CSSProperties}
          onChange={(event) => { gesture(); setEpoch(Number(event.target.value)) }}
        />
        </div>
      </Freebar>
      {notice && <div className="eso-toast" role="status" data-experience-overlay="true">{tx(notice)}</div>}
      {ready && !reducedMotion && ui.view === 'earth' && <GhostHint worldId={WORLD_ID} gesture={{ type: 'drag', target: '.eso-stage canvas', dx: 85, dy: 15, label: tx('拖动地球，观察昼夜') }} />}
    </div>
  )
}
