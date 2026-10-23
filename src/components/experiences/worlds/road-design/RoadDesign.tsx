import './styles/RoadDesign.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Pause, Play } from '@phosphor-icons/react'
import * as T from 'three'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { isWorldPaused } from '~/lib/world-playback'
import { useExperienceI18n } from '~/i18n/experience'
import { DESIGNS } from './designs'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import type { DesignSpec, Network } from './sim/types'
import { NightWorld, buildLamps, makeLightingAtlas } from './scene/NightWorld'
import { RoadMeshes } from './scene/RoadMeshes'
import { Vehicles } from './scene/Vehicles'
import { LightTrails } from './scene/LightTrails'
import { ConflictMarkers } from './scene/ConflictMarkers'
import { CameraRig, type CameraPreset } from './scene/CameraRig'
import { TrafficRuntime } from './scene/runtime'

function query(name: string) { return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name) }
function numberQuery(name: string, fallback: number, max: number) {
  const value = Number(query(name) ?? fallback)
  return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback
}
const PRESETS: { id: CameraPreset; name: string }[] = [{ id: 'overview', name: '鸟瞰' }, { id: 'top', name: '俯视' }, { id: 'close', name: '近看' }, { id: 'low', name: '路面' }]

function Scene({ design, network, runtime, speed, playing, shutter, showConflicts, preset, revision, reducedMotion, interact }: {
  design: DesignSpec; network: Network; runtime: TrafficRuntime; speed: number; playing: boolean; shutter: number; showConflicts: boolean; preset: CameraPreset; revision: number; reducedMotion: boolean; interact: () => void
}) {
  const lamps = useMemo(() => buildLamps(network), [network])
  const atlas = useMemo(() => makeLightingAtlas(lamps), [lamps])
  const conflicts = useMemo(() => calculateConflicts(network), [network])
  useEffect(() => () => atlas.dispose(), [atlas])
  useFrame((_, delta) => {
    runtime.frameMs = runtime.frameMs * 0.9 + delta * 1000 * 0.1
    if (playing && !document.hidden && !isWorldPaused()) runtime.advance(Math.min(delta, 0.1) * speed)
  }, -2)
  return <>
    <NightWorld network={network} atlas={atlas} />
    <RoadMeshes network={network} atlas={atlas} lamps={lamps} simulation={runtime.simulation} />
    <Vehicles runtime={runtime} />
    <LightTrails runtime={runtime} shutter={shutter} />
    {showConflicts && <ConflictMarkers network={network} conflicts={conflicts} />}
    <CameraRig design={design} preset={preset} revision={revision} reducedMotion={reducedMotion} onInteract={interact} />
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={1.25} luminanceSmoothing={0.22} intensity={0.55} mipmapBlur resolutionScale={0.6} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  </>
}

function Diagram({ network }: { network: Network }) {
  const range = network.id === 'cloverleaf' ? 230 : 63
  return <svg viewBox={`${-range} ${-range} ${range * 2} ${range * 2}`} aria-hidden="true">
    {network.carriageways.map(road => <polyline key={road.id} points={road.points.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={road.laneCount * road.laneWidth} opacity={road.level > 0 ? 0.95 : 0.4} />)}
  </svg>
}

export function RoadDesign({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [designId, setDesignId] = useState(() => DESIGNS.find(d => d.id === query('design'))?.id ?? 'cloverleaf')
  const design = DESIGNS.find(d => d.id === designId)!
  const networks = useMemo(() => new Map(DESIGNS.map(d => [d.id, d.build()])), [])
  const network = networks.get(designId)!
  const [demand, setDemand] = useState(() => numberQuery('demand', design.defaultDemand, 6000))
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [playing, setPlaying] = useState(!reducedMotion), [speed, setSpeed] = useState(1)
  const [shutter, setShutter] = useState(() => numberQuery('shutter', 3, 8))
  const [showConflicts, setShowConflicts] = useState(query('conflicts') === '1')
  const [preset, setPreset] = useState<CameraPreset>(() => PRESETS.find(p => p.id === query('camera'))?.id ?? 'overview')
  const [revision, setRevision] = useState(0)
  // Deliberately retain a simulation while demand changes; a design switch starts a reproducible new run.
  const runtime = useMemo(() => new TrafficRuntime(network, design.defaultDemand), [network, design])
  const [readout, setReadout] = useState(runtime.simulation.metrics)
  const stage = useRef<HTMLDivElement>(null)
  const capture = query('capture') === '1'
  const interact = useCallback(() => controls.registerInteraction(), [controls])
  const conflicts = useMemo(() => summarizeConflicts(calculateConflicts(network)), [network])
  const layers = new Set(network.carriageways.map(road => road.level)).size
  useEffect(() => { controls.completeOnboarding() }, [controls])
  useEffect(() => {
    runtime.simulation.setDemand(demand)
  }, [runtime, demand])
  useEffect(() => {
    setReadout(runtime.simulation.metrics)
    const timer = window.setInterval(() => {
      setReadout({ ...runtime.simulation.metrics })
      if (stage.current) {
        stage.current.dataset.vehicles = String(runtime.simulation.vehicles.length)
        stage.current.dataset.stepMs = runtime.stepMs.toFixed(3)
        stage.current.dataset.frameMs = runtime.frameMs.toFixed(2)
        stage.current.dataset.warmupMs = runtime.warmupMs.toFixed(1)
        stage.current.dataset.simTime = runtime.simulation.time.toFixed(2)
      }
    }, 500)
    return () => clearInterval(timer)
  }, [runtime])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false) }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches('input,select,textarea,button') || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === 'Space') { event.preventDefault(); setPlaying(p => !p); interact() }
      if (event.key === '[') { setSpeed(s => s === 16 ? 4 : 1); interact() }
      if (event.key === ']') { setSpeed(s => s === 1 ? 4 : 16); interact() }
      const index = Number(event.key) - 1
      if (index >= 0 && index < 4) { setPreset(PRESETS[index].id); setRevision(r => r + 1); interact() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [interact])
  const selectDesign = (next: DesignSpec) => {
    setDesignId(next.id); setDemand(next.defaultDemand); setPreset('overview'); setRevision(r => r + 1); interact()
  }
  const format = (value: number) => Math.round(value).toLocaleString('en-US')
  const tools = <div className="rd-tools">
    <label>{tx('需求')}<input aria-label={tx('每进口需求')} type="range" min="0" max={designId === 'cloverleaf' ? 6000 : 2400} step="100" value={demand} onChange={e => { setDemand(Number(e.target.value)); interact() }} /><output>{format(demand)} <small>{tx('辆/时/进口')}</small></output></label>
    <label>{tx('快门')}<input aria-label={tx('快门')} type="range" min="0" max="8" step="0.5" value={shutter} onChange={e => { setShutter(Number(e.target.value)); interact() }} /><output>{shutter.toFixed(1)} s</output></label>
    <div className="rd-camera-presets" role="group" aria-label={tx('镜头')}>
      {PRESETS.map(p => <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => { setPreset(p.id); setRevision(r => r + 1); interact() }}>{tx(p.name)}</button>)}
    </div>
  </div>
  return <div ref={stage} className="road-design-experience" data-design={designId}>
    <Canvas camera={{ position: [350, 250, 380], fov: 35, near: 0.3, far: 10000 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: T.NoToneMapping }}>
      <Scene design={design} network={network} runtime={runtime} playing={playing} speed={speed} shutter={shutter} showConflicts={showConflicts} preset={preset} revision={revision} reducedMotion={reducedMotion} interact={interact} />
    </Canvas>
    {!capture && <>
      <header className="rd-heading" data-experience-overlay="true"><h1>{tx('路口与立交')}</h1><p>{tx(design.name)}</p></header>
      <aside className="rd-instruments" aria-label={tx('交通读数')} data-experience-overlay="true">
        <div className="rd-conflict-count"><span>{tx('冲突点')}</span><strong>{conflicts.total}</strong></div>
        <div className="rd-conflict-key"><span><i className="is-crossing" />{tx('交叉')} {conflicts.crossing}</span><span><i className="is-merge" />{tx('合流')} {conflicts.merge}</span><span><i className="is-diverge" />{tx('分流')} {conflicts.diverge}</span></div>
        <dl>
          <div><dt>{tx('通过量')}</dt><dd>{format(readout.throughput)} <small>{tx('辆/时')}</small></dd></div>
          <div><dt>{tx('平均延误')}</dt><dd>+{Math.round(readout.averageDelay)} <small>s</small></dd></div>
          <div><dt>{tx('在网车辆')}</dt><dd>{format(readout.vehicles)}</dd></div>
          <div><dt>{tx('画面外排队')}</dt><dd>{format(readout.outsideQueue)}</dd></div>
        </dl>
        <div className="rd-layer-readout"><span>{tx('层数')}</span><b>{layers}</b><span>{tx('最高路面')}</span><b>{Math.max(...network.carriageways.flatMap(r => r.points.map(p => p.y))).toFixed(1)} <small>m</small></b></div>
        <p className="rd-why">{tx(design.description)}</p>
        <small className="rd-window">{tx('最近 5 分钟 · 模拟读数')}</small>
      </aside>
      <nav className="rd-catalog" aria-label={tx('道路图鉴')} data-experience-overlay="true">
        {DESIGNS.map(d => <button key={d.id} type="button" data-design-id={d.id} aria-pressed={designId === d.id} onClick={() => selectDesign(d)}><Diagram network={networks.get(d.id)!} /><span>{tx(d.name)}</span></button>)}
      </nav>
      <Freebar ariaLabel={tx('交通与镜头')} className="rd-freebar" mainClassName="rd-freebar-main" secondary={tools} secondaryDefault="closed">
        <button type="button" className="experience-freebar-play" aria-label={tx(playing ? '暂停' : '播放')} data-playing={playing} onClick={() => { setPlaying(!playing); interact() }}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</button>
        <div className="experience-freebar-seg" role="group" aria-label={tx('模拟速度')}>{[1, 4, 16].map(s => <button key={s} type="button" aria-pressed={speed === s} onClick={() => { setSpeed(s); interact() }}>{s}×</button>)}</div>
        <button type="button" className="rd-conflicts-toggle" aria-pressed={showConflicts} onClick={() => { setShowConflicts(!showConflicts); interact() }}>{tx('冲突点')}</button>
      </Freebar>
      <GhostHint worldId="road-design" delay={8000} gesture={{ type: 'tap', target: '[data-design-id="t-junction"]', label: tx('换一种路口，看车流怎样改变') }} />
    </>}
  </div>
}
