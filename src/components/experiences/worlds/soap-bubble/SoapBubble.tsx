/**
 * SoapBubble — thin-film iridescence on a free soap film.
 *
 * Optical core adapted from pompa-iridiscencia (SantiagoGR11 et al.)
 * https://github.com/SantiagoGR11/pompa-iridiscencia
 * Copyright (c) 2026 Santiago García Rodríguez · MIT License
 *
 * Shape of the World shell: GuideTour · Freebar · GhostHint · bilingual tx().
 */

import './styles/SoapBubble.css'
import { FilmStrip } from '@phosphor-icons/react'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { bubbleFragmentShader, bubbleVertexShader } from '~/components/experiences/worlds/soap-bubble/soap-bubble/shaders'
import { createCmfTexture, STEP_NM, WL_END, WL_START } from '~/components/experiences/worlds/soap-bubble/soap-bubble/spectral'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
type BubbleBeat = 0 | 1 | 2 | 3 | 4

type BubbleParams = {
  /** Average film thickness (nm) — main colour driver */
  thickness: number
  /** 0 = even film · 1 = strong gravity drainage (very thin crown) */
  drainage: number
  /** Soap-film index of refraction */
  n2: number
}

const DEFAULT_PARAMS: BubbleParams = {
  thickness: 900,
  drainage: 0.72,
  n2: 1.33,
}

const THICKNESS_MIN = 80
const THICKNESS_MAX = 1600
const DRAINAGE_MIN = 0
const DRAINAGE_MAX = 1
const N2_MIN = 1.2
const N2_MAX = 1.55

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Map UI drainage → top thickness e0_nm (nm). Higher drainage → thinner crown. */
function e0FromDrainage(thickness: number, drainage: number): number {
  const d = clamp(drainage, 0, 1)
  // At drainage=0: nearly uniform; at 1: near-black film at the pole
  return clamp(thickness * (1 - d * 0.96), 12, thickness)
}

function formatNm(n: number) {
  return `${Math.round(n)} nm`
}

export function SoapBubble({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('soap-bubble')

  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [beat, setBeat] = useState<BubbleBeat>(0)
  const [params, setParams] = useState<BubbleParams>(DEFAULT_PARAMS)
  const beatRef = useRef<BubbleBeat>(0)
  const paramsRef = useRef(params)
  const storyModeRef = useRef(storyMode)
  const reducedRef = useRef(false)

  beatRef.current = beat
  paramsRef.current = params
  storyModeRef.current = storyMode
  reducedRef.current = false

  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const cameraOrbitRef = useRef({ theta: 18, phi: 0, radius: 3.15 })
  const draggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const autoSpinRef = useRef(true)

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  const applyUniforms = useCallback((p: BubbleParams) => {
    const mat = materialRef.current
    if (!mat) return
    const eavg = clamp(p.thickness, THICKNESS_MIN, THICKNESS_MAX)
    const e0 = e0FromDrainage(eavg, p.drainage)
    mat.uniforms.eavg_nm!.value = eavg
    mat.uniforms.e0_nm!.value = e0
    mat.uniforms.n2!.value = clamp(p.n2, N2_MIN, N2_MAX)
    mat.uniforms.alpha!.value = 1 + p.drainage * 1.5
  }, [])

  useEffect(() => {
    applyUniforms(params)
  }, [params, applyUniforms])

  // Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // sphere + shader — AA is expensive, soft rim handles edges
      alpha: false,
      powerPreference: 'high-performance',
    })
    // Deep violet-blue stage (matches pompa-iridiscencia #1f2230 + CSS night gradient).
    // Pure black flattens the film; this keeps iridescence readable without fighting the bubble.
    const stageBg = 0x14182a
    renderer.setClearColor(stageBg, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping
    renderer.toneMappingExposure = 1

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(stageBg)
    scene.fog = new THREE.FogExp2(stageBg, 0.038)

    const camera = new THREE.PerspectiveCamera(52, 1, 0.15, 40)
    const orbit = cameraOrbitRef.current
    const placeCamera = () => {
      const elev = (orbit.theta * Math.PI) / 180
      const azim = (orbit.phi * Math.PI) / 180
      const r = orbit.radius
      camera.position.set(
        r * Math.cos(elev) * Math.sin(azim),
        r * Math.sin(elev),
        r * Math.cos(elev) * Math.cos(azim),
      )
      camera.lookAt(0, 0.05, 0)
    }
    placeCamera()

    // Soft museum pedestal glow (not competing with the bubble)
    const discGeo = new THREE.CircleGeometry(1.85, 64)
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x1a2848,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
    const disc = new THREE.Mesh(discGeo, discMat)
    disc.rotation.x = -Math.PI / 2
    disc.position.y = -1.18
    scene.add(disc)

    const glowTex = (() => {
      const c = document.createElement('canvas')
      c.width = 128
      c.height = 128
      const g = c.getContext('2d')!
      const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      rad.addColorStop(0, 'rgba(140, 180, 255, 0.55)')
      rad.addColorStop(0.45, 'rgba(80, 110, 200, 0.14)')
      rad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = rad
      g.fillRect(0, 0, 128, 128)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      return t
    })()
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const floorGlow = new THREE.Sprite(glowMat)
    floorGlow.position.set(0, -1.12, 0)
    floorGlow.scale.set(4.2, 1.35, 1)
    scene.add(floorGlow)

    const { texture: cmfTex, kNorm } = createCmfTexture()
    const p0 = paramsRef.current
    const eavg0 = p0.thickness
    const e00 = e0FromDrainage(eavg0, p0.drainage)

    const uniforms: Record<string, THREE.IUniform> = {
      n1: { value: 1.0 },
      n2: { value: p0.n2 },
      n3: { value: 1.0 },
      Ldir: { value: new THREE.Vector3(0.15, 0.92, 0.35).normalize() },
      lightMode: { value: 0 },
      lambda0: { value: 550 },
      spectralWidth: { value: 50 },
      e0_nm: { value: e00 },
      eavg_nm: { value: eavg0 },
      alpha: { value: 1 + p0.drainage * 1.5 },
      showTransmission: { value: true },
      cmfTex: { value: cmfTex },
      wlStart: { value: WL_START },
      wlEnd: { value: WL_END },
      stepNm: { value: STEP_NM },
      kNorm: { value: kNorm },
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: bubbleVertexShader,
      fragmentShader: bubbleFragmentShader,
      uniforms,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    })
    materialRef.current = material

    const isMobile = Math.min(window.innerWidth, window.innerHeight) < 720
    // Smooth enough for a sphere silhouette; spectral shader is the cost, not geometry.
    const segs = isMobile ? 48 : 72
    const geometry = new THREE.SphereGeometry(1, segs, segs)
    const bubble = new THREE.Mesh(geometry, material)
    scene.add(bubble)

    // Subtle contact shadow under bubble
    const shadowGeo = new THREE.CircleGeometry(0.72, 48)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.14
    scene.add(shadow)

    const resize = () => {
      const w = Math.max(1, host.clientWidth || window.innerWidth)
      const h = Math.max(1, host.clientHeight || window.innerHeight)
      const dprCap = isMobile ? 1.35 : 1.6
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // Pull back a little on tall phones so the freebar doesn't clip the sphere
      orbit.radius = camera.aspect < 0.72 ? 3.55 : camera.aspect < 0.95 ? 3.3 : 3.1
      camera.updateProjectionMatrix()
      placeCamera()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    let raf = 0
    let last = performance.now()
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const reduced = reducedRef.current
      if (!reduced && autoSpinRef.current && !draggingRef.current) {
        // Gentle museum spin — alive on first frame
        orbit.phi += 12 * dt
        if (orbit.phi > 360) orbit.phi -= 360
        // Soft bob of elevation for life without motion sickness
        const bob = Math.sin(now * 0.00035) * 2.2
        orbit.theta = clamp(18 + bob, 6, 38)
      }
      placeCamera()

      // Keep light roughly “from above-front” in camera-facing space so colours stay readable
      const elev = (orbit.theta * Math.PI) / 180
      const azim = (orbit.phi * Math.PI) / 180
      const light = material.uniforms.Ldir!.value as THREE.Vector3
      light.set(
        Math.sin(azim) * 0.35 + 0.1,
        0.82 + Math.sin(elev) * 0.12,
        Math.cos(azim) * 0.35 + 0.2,
      ).normalize()

      // Story beat 3 gently sweeps thickness if user is still in guide
      if (storyModeRef.current && beatRef.current === 3 && !reduced) {
        const sweep = 220 + (Math.sin(now * 0.00055) * 0.5 + 0.5) * 980
        material.uniforms.eavg_nm!.value = sweep
        material.uniforms.e0_nm!.value = e0FromDrainage(sweep, 0.55)
      }

      try {
        renderer.render(scene, camera)
      } catch {
        /* frame errors must still be fixed at root */
      }
    }
    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      materialRef.current = null
      geometry.dispose()
      material.dispose()
      cmfTex.dispose()
      discGeo.dispose()
      discMat.dispose()
      shadowGeo.dispose()
      shadowMat.dispose()
      glowTex.dispose()
      glowMat.dispose()
      renderer.dispose()
    }
  }, [])

  // Pointer orbit (free mode)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e: PointerEvent) => {
      if (storyModeRef.current) return
      draggingRef.current = true
      autoSpinRef.current = false
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      controls.registerInteraction()
    }
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      const orbit = cameraOrbitRef.current
      orbit.phi += dx * 0.35
      orbit.theta = clamp(orbit.theta - dy * 0.28, -12, 68)
    }
    const onUp = (e: PointerEvent) => {
      draggingRef.current = false
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [controls])

  const setParam = useCallback(
    (patch: Partial<BubbleParams>, user = true) => {
      setParams((prev) => {
        const next = { ...prev, ...patch }
        next.thickness = clamp(next.thickness, THICKNESS_MIN, THICKNESS_MAX)
        next.drainage = clamp(next.drainage, DRAINAGE_MIN, DRAINAGE_MAX)
        next.n2 = clamp(next.n2, N2_MIN, N2_MAX)
        return next
      })
      if (user) controls.registerInteraction()
    },
    [controls],
  )

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(4)
    setParams(DEFAULT_PARAMS)
    autoSpinRef.current = true
  }, [enterFree])

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: tx('一颗会变色的球'),
        body: tx('这不是颜料画上的彩虹。光线穿过极薄的肥皂膜时，前后两层反射波彼此干涉，于是你看见了流动的光谱。'),
        durationMs: 5600,
        action: () => {
          setBeat(1)
          setParams({ thickness: 900, drainage: 0.72, n2: 1.33 })
          autoSpinRef.current = true
        },
      },
      {
        title: tx('它是一张纳米级薄膜'),
        body: tx('肥皂泡的膜只有几百纳米厚——大约可见光波长的量级。膜越薄或越厚，干涉加强的波长就不同，颜色随之改写。'),
        durationMs: 6000,
        action: () => {
          setBeat(2)
          setParams({ thickness: 620, drainage: 0.55, n2: 1.33 })
        },
      },
      {
        title: tx('薄膜变厚，彩虹就滑动'),
        body: tx('膜厚从约两百纳米扫到一千多纳米时，反射色会从暗红、金、绿、青一路迁徙。这不是滤镜，而是物理光谱积分的结果。'),
        durationMs: 6400,
        action: () => {
          setBeat(3)
          setParams({ thickness: 700, drainage: 0.55, n2: 1.33 })
        },
      },
      {
        title: tx('液体向下排走'),
        body: tx('重力把液体往下抽，顶部先变薄，最后几乎变黑——黑膜表示反射干涉几乎完全相消。下面仍可能金紫交叠。'),
        durationMs: 6200,
        action: () => {
          setBeat(4)
          setParams({ thickness: 1100, drainage: 0.94, n2: 1.33 })
        },
      },
      {
        title: tx('干涉跟着手走'),
        body: tx('平均厚度、排水与折射率一变，干涉公式就在每一帧重算——颜色会诚实跟手，不是贴上去的贴图。'),
        durationMs: 5200,
        action: () => {
          setBeat(4)
          setParams(DEFAULT_PARAMS)
        },
      },
    ],
    [tx],
  )

  const replay = () => {
    enterStory()
    setBeat(1)
    setParams({ thickness: 900, drainage: 0.72, n2: 1.33 })
    autoSpinRef.current = true
    replayGuide('soap-bubble')
    controls.registerInteraction()
  }

  const e0 = e0FromDrainage(params.thickness, params.drainage)
  const plaqueLine =
    params.drainage > 0.88
      ? tx('顶部几乎是黑膜，液体正在向下排')
      : params.thickness < 280
        ? tx('极薄膜：干涉条纹稀疏而纯')
        : params.thickness > 1100
          ? tx('较厚的膜：条纹更密、色彩更碎')
          : tx('纳米级薄膜上的真实干涉色')

  return (
    <div ref={hostRef} className={`oss-experience sb-experience sb-beat-${beat}`}>
      <canvas
        ref={canvasRef}
        className="sb-canvas"
        aria-label={tx('可旋转的肥皂泡薄膜干涉三维场景')}
      />

      {!storyMode && (
        <header className="sb-plaque" data-experience-overlay="true">
          <span>{tx('肥皂泡')}</span>
          <h1>{tx('薄膜上的彩虹')}</h1>
          <p>{plaqueLine}</p>
        </header>
      )}

      {!storyMode && (
        <div className="sb-readout" data-experience-overlay="true" aria-live="polite">
          <span>{tx('平均厚度')}</span>
          <strong>{formatNm(params.thickness)}</strong>
          <span>{tx('顶部厚度')}</span>
          <strong>{formatNm(e0)}</strong>
          <span>{tx('膜折射率')}</span>
          <strong>{params.n2.toFixed(2)}</strong>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="sb-freebar"
          mainClassName="sb-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondary={(
            <div className="sb-tray-row">
              <label className="experience-freebar-field sb-field">
                <span>{tx('折射率')}</span>
                <input
                  type="range"
                  className="sb-slider"
                  min={N2_MIN}
                  max={N2_MAX}
                  step={0.01}
                  value={params.n2}
                  onChange={(e) => setParam({ n2: Number(e.target.value) })}
                  aria-label={tx('肥皂膜折射率')}
                />
                <strong>{params.n2.toFixed(2)}</strong>
              </label>
              <button type="button" className="experience-freebar-story sb-freebar-replay" onClick={replay} aria-label={tx('重播故事')}>
                <FilmStrip weight="fill" aria-hidden="true" />
                <span>{tx('故事')}</span>
              </button>
            </div>
          )}
        >
          <label className="experience-freebar-field sb-field">
            <span>{tx('厚度')}</span>
            <input
              type="range"
              className="sb-slider"
              min={THICKNESS_MIN}
              max={THICKNESS_MAX}
              step={5}
              value={params.thickness}
              onChange={(e) => setParam({ thickness: Number(e.target.value) })}
              aria-label={tx('平均膜厚')}
            />
            <strong>{formatNm(params.thickness)}</strong>
          </label>

          <label className="experience-freebar-field sb-field">
            <span>{tx('排水')}</span>
            <input
              type="range"
              className="sb-slider"
              min={0}
              max={100}
              step={1}
              value={Math.round(params.drainage * 100)}
              onChange={(e) => setParam({ drainage: Number(e.target.value) / 100 })}
              aria-label={tx('重力排水')}
            />
            <strong>{Math.round(params.drainage * 100)}%</strong>
          </label>
        </Freebar>
      )}

      <GuideTour
        worldId="soap-bubble"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental' },
        ]}
        showReplayChip={false}
        onExit={returnToFree}
      />

      {!storyMode && (
        <GhostHint
          worldId="soap-bubble"
          gesture={{ type: 'drag', target: '.sb-canvas', label: tx('拖动旋转肥皂泡') }}
        />
      )}
    </div>
  )
}
