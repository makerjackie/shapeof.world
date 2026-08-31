/**
 * 首页首屏「知识星球」：经策展的世界海报环绕成一颗缓缓自转的星球。
 * 拖拽可以拨动它（带惯性），悬停暂停自转并显示世界标题，点击海报直接进入世界。
 * 它只是首页的增强体验；下方世界墙提供全部世界的可访问导航。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from '@tanstack/react-router'

import { getRootCategory, rootCategories } from '~/data/content-graph'
import { recommendedWorldIds } from '~/data/home-recommended'
import type { WorldSummary as WorldExperience } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { worldOrbThumbnail, worldThumbnail } from '~/lib/posters'
import { useAtlas } from '~/state/atlas'

const GOLDEN_ANGLE = 2.399963229728653
const ORB_WORLD_LIMIT = 64
const rootCategoryById = new Map(rootCategories.map((category) => [category.id, category]))

type Orb = {
  world: WorldExperience
  color: string
  thumb: string
  loadRank: number
  /** 斐波那契球面上的单位向量 */
  x: number
  y: number
  z: number
}

function selectOrbWorlds(worlds: ReadonlyArray<WorldExperience>): WorldExperience[] {
  const selected: WorldExperience[] = []
  const selectedIds = new Set<string>()
  const add = (world: WorldExperience | undefined) => {
    if (!world || selectedIds.has(world.id) || selected.length >= ORB_WORLD_LIMIT) return
    selected.push(world)
    selectedIds.add(world.id)
  }

  for (const worldId of recommendedWorldIds) add(worlds.find((world) => world.id === worldId))

  const categoryQueues = rootCategories.map((category) => (
    worlds.filter((world) => getRootCategory(world.primaryCategoryId).id === category.id && !selectedIds.has(world.id))
  ))
  while (selected.length < ORB_WORLD_LIMIT && categoryQueues.some((queue) => queue.length > 0)) {
    for (const queue of categoryQueues) add(queue.shift())
  }

  return selected
}

const INITIAL_TILT = -0.32
const initialDepth = (orb: Orb) => orb.y * Math.sin(INITIAL_TILT) + orb.z * Math.cos(INITIAL_TILT)

function createOrbs(worlds: ReadonlyArray<WorldExperience>): Array<Orb> {
  const orbWorlds = selectOrbWorlds(worlds)
  const rawOrbs = orbWorlds.map((world, index) => {
    const count = orbWorlds.length
    const y = count === 1 ? 0 : 1 - (index / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = index * GOLDEN_ANGLE
    return {
      world,
      color: rootCategoryById.get(getRootCategory(world.primaryCategoryId).id)?.accent ?? '#ffd166',
      thumb: worldOrbThumbnail(world),
      loadRank: 0,
      x: Math.cos(theta) * ring,
      y,
      z: Math.sin(theta) * ring,
    }
  })
  const loadRankByWorld = new Map(
    [...rawOrbs]
      .sort((left, right) => initialDepth(right) - initialDepth(left))
      .map((orb, index) => [orb.world.id, index]),
  )
  return rawOrbs.map((orb) => ({
    ...orb,
    loadRank: loadRankByWorld.get(orb.world.id) ?? Number.POSITIVE_INFINITY,
  }))
}

export const homeUniverseLcpImage = worldOrbThumbnail({ id: 'moon-voyage' })

type Sim = {
  angle: number
  tilt: number
  velocity: number
  tiltVelocity: number
  dragging: boolean
  hovering: boolean
  moved: number
  captured: boolean
  pointerId: number
  lastX: number
  lastY: number
  width: number
  height: number
  visible: boolean
}

/** 海报小图：thumb 缺失时回退到标准海报，再缺失时降级为根分类色块。 */
function OrbImage({ orb, shouldLoad }: { orb: Orb; shouldLoad: boolean }) {
  const [src, setSrc] = useState<string | null>(shouldLoad ? orb.thumb : null)
  const [empty, setEmpty] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (shouldLoad) setSrc((current) => current ?? orb.thumb)
  }, [orb.thumb, shouldLoad])

  const handleError = useCallback(() => {
    const fallback = worldThumbnail(orb.world)
    setSrc((current) => {
      if (current === orb.thumb && fallback !== orb.thumb) return fallback
      setEmpty(true)
      return current
    })
  }, [orb.thumb, orb.world])

  // SSR 阶段 404 的图片可能在 React 挂载前就触发过 error，这里兜底检查一次
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) handleError()
  }, [src, handleError])

  if (empty) {
    return <span className="home-orb-empty" style={{ background: orb.color }} aria-hidden="true" />
  }
  if (!src) return <span className="home-orb-empty" style={{ background: orb.color }} aria-hidden="true" />

  return (
    <img
      ref={imgRef}
      src={src}
      alt=""
      loading={orb.loadRank < 4 ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={orb.loadRank === 0 ? 'high' : 'low'}
      width={128}
      height={86}
      draggable={false}
      onError={handleError}
    />
  )
}

const AUTO_SPEED = 0.09 // 自转速度（弧度/秒）
const TILT_MIN = -1.05
const TILT_MAX = 0.55
const INITIAL_ORB_IMAGE_COUNT = 12
const ORB_IMAGE_BATCH_SIZE = 12

export function HomeUniverse({ worlds }: { worlds: ReadonlyArray<WorldExperience> }) {
  const { worldText } = useI18n()
  const orbs = useMemo(() => createOrbs(worlds), [worlds])
  const stageRef = useRef<HTMLDivElement>(null)
  const orbRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const simRef = useRef<Sim>({
    angle: 0,
    tilt: INITIAL_TILT,
    velocity: 0,
    tiltVelocity: 0,
    dragging: false,
    hovering: false,
    moved: 0,
    captured: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    width: 0,
    height: 0,
    visible: true,
  })
  const [dragging, setDragging] = useState(false)
  const [loadedOrbImages, setLoadedOrbImages] = useState(INITIAL_ORB_IMAGE_COUNT)
  const atlas = useAtlas()
  const exploredRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    exploredRef.current = new Set(atlas.visited)
  }, [atlas.visited])

  useEffect(() => {
    if (loadedOrbImages >= orbs.length) return
    const timer = window.setTimeout(() => {
      setLoadedOrbImages((count) => Math.min(orbs.length, count + ORB_IMAGE_BATCH_SIZE))
    }, loadedOrbImages === INITIAL_ORB_IMAGE_COUNT ? 2800 : 1800)
    return () => window.clearTimeout(timer)
  }, [loadedOrbImages, orbs.length])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const sim = simRef.current
    const reduceMotion = false

    let raf = 0
    let last = performance.now()
    let intro = reduceMotion ? 1 : 0.55
    let frontOrbIndex = -1

    const measure = () => {
      const rect = stage.getBoundingClientRect()
      sim.width = rect.width
      sim.height = rect.height
    }

    const render = () => {
      const { width, height } = sim
      if (width === 0 || height === 0) return
      const radius = Math.min(width, height) * 0.43
      const cosA = Math.cos(sim.angle)
      const sinA = Math.sin(sim.angle)
      const cosT = Math.cos(sim.tilt)
      const sinT = Math.sin(sim.tilt)
      let nextFrontOrbIndex = -1
      let nextFrontOrbDepth = Number.NEGATIVE_INFINITY
      orbs.forEach((orb, index) => {
        const element = orbRefs.current[index]
        if (!element) return
        // 先绕 Y 轴自转，再施加 X 轴倾角
        const x1 = orb.x * cosA + orb.z * sinA
        const z1 = orb.z * cosA - orb.x * sinA
        const y2 = orb.y * cosT - z1 * sinT
        const z2 = orb.y * sinT + z1 * cosT
        const depth = (z2 + 1) / 2 // 0 = 背面，1 = 正面
        if (depth > nextFrontOrbDepth) {
          nextFrontOrbDepth = depth
          nextFrontOrbIndex = index
        }
        const scale = (0.52 + 0.52 * depth) * (0.9 + 0.1 * intro)
        element.style.transform = `translate(-50%, -50%) translate3d(${Math.round(x1 * radius)}px, ${Math.round(y2 * radius)}px, 0) scale(${scale.toFixed(3)})`
        element.style.opacity = ((0.22 + 0.78 * depth ** 1.5) * intro).toFixed(3)
        element.style.zIndex = String(Math.round(depth * 100))
      })
      if (nextFrontOrbIndex !== frontOrbIndex) {
        if (frontOrbIndex >= 0) orbRefs.current[frontOrbIndex]?.classList.remove('is-front')
        if (nextFrontOrbIndex >= 0) orbRefs.current[nextFrontOrbIndex]?.classList.add('is-front')
        frontOrbIndex = nextFrontOrbIndex
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (intro < 1) intro = Math.min(1, intro + dt / 1.1)
      if (!sim.dragging) {
        if (!sim.hovering && !reduceMotion) sim.angle += dt * AUTO_SPEED
        sim.angle += sim.velocity
        sim.tilt = Math.min(TILT_MAX, Math.max(TILT_MIN, sim.tilt + sim.tiltVelocity))
        sim.velocity *= 0.94
        sim.tiltVelocity *= 0.9
      }
      render()
      raf = window.requestAnimationFrame(tick)
    }
    const start = () => {
      if (raf || !sim.visible) return
      last = performance.now()
      raf = window.requestAnimationFrame(tick)
    }
    const stop = () => {
      window.cancelAnimationFrame(raf)
      raf = 0
    }

    measure()
    render()
    start()

    const resizeObserver = new ResizeObserver(() => {
      measure()
      render()
    })
    resizeObserver.observe(stage)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      sim.visible = Boolean(entry?.isIntersecting)
      if (sim.visible) start()
      else stop()
    })
    intersectionObserver.observe(stage)

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [orbs])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const sim = simRef.current
    sim.dragging = true
    sim.moved = 0
    sim.captured = false
    sim.pointerId = event.pointerId
    sim.velocity = 0
    sim.tiltVelocity = 0
    sim.lastX = event.clientX
    sim.lastY = event.clientY
    setLoadedOrbImages(orbs.length)
    setDragging(true)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const sim = simRef.current
    if (!sim.dragging) return
    const dx = event.clientX - sim.lastX
    const dy = event.clientY - sim.lastY
    sim.lastX = event.clientX
    sim.lastY = event.clientY
    sim.moved += Math.abs(dx) + Math.abs(dy)
    // 确认是拖拽后才捕获指针；纯点击不捕获，否则 click 会被重定向到容器、吞掉海报跳转
    if (!sim.captured && sim.moved > 6) {
      try {
        event.currentTarget.setPointerCapture(sim.pointerId)
        sim.captured = true
      } catch {
        // 指针已失效时忽略，拖拽会随 pointerup 自然结束
      }
    }
    sim.angle += dx * 0.0052
    sim.tilt = Math.min(TILT_MAX, Math.max(TILT_MIN, sim.tilt - dy * 0.0032))
    sim.velocity = sim.velocity * 0.7 + dx * 0.0016
    sim.tiltVelocity = sim.tiltVelocity * 0.7 - dy * 0.001
  }
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const sim = simRef.current
    if (sim.captured) {
      try {
        event.currentTarget.releasePointerCapture(sim.pointerId)
      } catch {
        // 指针已释放
      }
      sim.captured = false
    }
    sim.dragging = false
    setDragging(false)
  }

  return (
    <div
      ref={stageRef}
      className={`home-universe${dragging ? ' is-dragging' : ''}`}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(event) => {
        // 拖拽结束后抑制误触的跳转点击
        if (simRef.current.moved > 8) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      {orbs.map((orb, index) => (
        <Link
          key={orb.world.id}
          ref={(element) => {
            orbRefs.current[index] = element
          }}
          to="/explore/$worldId"
          params={{ worldId: orb.world.id }}
          className={`home-orb${exploredRef.current.has(orb.world.id) ? ' is-complete' : ''}`}
          tabIndex={-1}
          draggable={false}
          style={{ '--orb-accent': orb.color } as CSSProperties}
          onMouseEnter={() => {
            simRef.current.hovering = true
          }}
          onMouseLeave={() => {
            simRef.current.hovering = false
          }}
        >
          <OrbImage orb={orb} shouldLoad={orb.loadRank < loadedOrbImages} />
          <span className="home-orb-label">
            <i aria-hidden="true" />
            {worldText(orb.world, 'posterTitle')}
          </span>
        </Link>
      ))}
    </div>
  )
}
