import './styles/Ferrofluid.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Atom,
  Gear,
  MagnetStraight,
  RocketLaunch,
  SpeakerHigh,
  Sparkle, FilmStrip } from '@phosphor-icons/react'
import * as THREE from 'three'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
type FerroBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6

const SURFACE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uStrength;
uniform float uMagnetHeight;
uniform float uBuild;
uniform vec2 uMagnet;
uniform vec2 uWakeMagnet;
uniform vec2 uOldMagnet;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vField;
varying float vPeak;
varying float vHeight;

float magneticField(vec2 local, float strength) {
  float distance2 = dot(local, local);
  return strength * 1.52 / (0.48 + distance2 * 0.15 + uMagnetHeight * uMagnetHeight * 0.27);
}

float ferroHeight(vec2 point) {
  vec2 currentLocal = point - uMagnet;
  vec2 wakeLocal = point - uWakeMagnet;
  vec2 oldLocal = point - uOldMagnet;
  float distance2 = dot(currentLocal, currentLocal);
  float distanceFromMagnet = sqrt(distance2 + 0.001);
  float currentField = magneticField(currentLocal, uStrength);
  float wakeField = magneticField(wakeLocal, uStrength * 0.58);
  float oldField = magneticField(oldLocal, uStrength * 0.31);
  float field = max(currentField, max(wakeField, oldField));
  float envelope = max(
    exp(-distance2 * 0.18),
    max(exp(-dot(wakeLocal, wakeLocal) * 0.22) * 0.54, exp(-dot(oldLocal, oldLocal) * 0.25) * 0.26)
  );
  // The lattice belongs to the liquid. Moving the field therefore makes peaks
  // grow and collapse at fixed sites instead of translating one rigid texture.
  float lattice = (
    cos(point.x * 12.4) +
    2.0 * cos(point.x * 6.2) * cos(point.y * 10.738)
  ) / 3.0;
  float cells = pow(smoothstep(0.31, 0.94, lattice), 2.45);
  float instability = smoothstep(0.78, 1.2, field);
  float broadBulge = envelope * smoothstep(0.30, 1.02, field) * (0.18 + field * 0.052);
  float peaks = instability * cells * (0.38 + field * 0.25);
  float birth = 0.88 + 0.12 * sin(uTime * 1.3 - distanceFromMagnet * 2.5 + lattice * 0.7);
  float wake = sin(distanceFromMagnet * 8.5 - uTime * 1.45) * envelope * 0.019;
  return uBuild * (broadBulge + peaks * birth + wake);
}

void main() {
  vUv = uv;
  vec3 displaced = position;
  float height = ferroHeight(position.xy);
  displaced.z += height;
  vec2 local = position.xy - uMagnet;
  float field = max(
    magneticField(local, uStrength),
    max(
      magneticField(position.xy - uWakeMagnet, uStrength * 0.58),
      magneticField(position.xy - uOldMagnet, uStrength * 0.31)
    )
  );
  float lattice = (cos(position.x * 12.4) + 2.0 * cos(position.x * 6.2) * cos(position.y * 10.738)) / 3.0;
  vField = smoothstep(0.22, 1.38, field);
  vPeak = smoothstep(0.31, 0.94, lattice) * smoothstep(0.76, 1.2, field);
  vHeight = height;
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const SURFACE_FRAGMENT = /* glsl */ `
uniform float uTime;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vField;
varying float vPeak;
varying float vHeight;

void main() {
  vec3 dx = dFdx(vWorldPosition);
  vec3 dy = dFdy(vWorldPosition);
  vec3 normal = normalize(cross(dx, dy));
  if (normal.z < 0.0) normal *= -1.0;

  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  vec3 keyLight = normalize(vec3(-0.54, -0.62, 1.0));
  vec3 rimLight = normalize(vec3(0.82, 0.16, 0.56));
  float keyDiffuse = max(dot(normal, keyLight), 0.0);
  float rimDiffuse = max(dot(normal, rimLight), 0.0);
  float keySpecular = pow(max(dot(reflect(-keyLight, normal), viewDirection), 0.0), 54.0);
  float rimSpecular = pow(max(dot(reflect(-rimLight, normal), viewDirection), 0.0), 86.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.1);

  vec3 ink = vec3(0.006, 0.01, 0.009);
  vec3 wetGraphite = vec3(0.085, 0.118, 0.108);
  vec3 color = mix(ink, wetGraphite, 0.13 + keyDiffuse * 0.72 + rimDiffuse * 0.24);
  color += vec3(0.045, 0.087, 0.082) * vField * (0.6 + keyDiffuse);
  color += vec3(1.0, 0.66, 0.29) * keySpecular * (1.5 + vPeak * 3.4);
  color += vec3(0.54, 0.25, 0.07) * vPeak * (0.035 + rimDiffuse * 0.11);
  color += vec3(0.25, 0.78, 0.76) * rimSpecular * 0.9;
  color += vec3(0.16, 0.3, 0.29) * fresnel * (0.82 + vField);
  color += vec3(0.48, 0.24, 0.08) * max(vHeight, 0.0) * 0.34;
  color += sin(uTime * 0.3 + vWorldPosition.x) * 0.002;

  float edge = smoothstep(0.0, 0.055, vUv.x) * smoothstep(0.0, 0.055, vUv.y)
    * smoothstep(0.0, 0.055, 1.0 - vUv.x) * smoothstep(0.0, 0.055, 1.0 - vUv.y);
  gl_FragColor = vec4(color, edge);
}
`

const CAMERA_POSITIONS: Record<FerroBeat, THREE.Vector3> = {
  0: new THREE.Vector3(0.35, -5.0, 3.55),
  1: new THREE.Vector3(-0.65, -3.65, 2.05),
  2: new THREE.Vector3(3.25, -4.5, 2.8),
  3: new THREE.Vector3(0.1, -6.0, 1.72),
  4: new THREE.Vector3(0.0, -5.0, 5.0),
  5: new THREE.Vector3(-2.0, -5.45, 3.45),
  6: new THREE.Vector3(2.15, -5.25, 3.55),
}

const CAMERA_TARGETS: Record<FerroBeat, THREE.Vector3> = {
  0: new THREE.Vector3(0.45, 0.0, 0.32),
  1: new THREE.Vector3(-0.2, 0.25, 0.18),
  2: new THREE.Vector3(0.4, 0.1, 0.42),
  3: new THREE.Vector3(0.0, 0.25, 0.32),
  4: new THREE.Vector3(0.0, 0.0, 0.2),
  5: new THREE.Vector3(-0.7, 0.0, 0.16),
  6: new THREE.Vector3(0.8, 0.0, 0.16),
}

function CameraRig({ beat, reducedMotion }: { beat: FerroBeat; reducedMotion: boolean }) {
  const { camera } = useThree()
  const lookAt = useRef(CAMERA_TARGETS[beat].clone())

  useFrame((_, delta) => {
    const position = CAMERA_POSITIONS[beat]
    const target = CAMERA_TARGETS[beat]
    const speed = reducedMotion ? 20 : 1.8
    camera.position.lerp(position, 1 - Math.exp(-delta * speed))
    lookAt.current.lerp(target, 1 - Math.exp(-delta * speed * 1.3))
    camera.lookAt(lookAt.current)
  })

  return null
}

function FerroScene({
  strength,
  beat,
  controls,
  reducedMotion,
  onFreeMode,
}: {
  strength: number
  beat: FerroBeat
  controls: ExperienceControls
  reducedMotion: boolean
  onFreeMode: () => void
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: strength },
      uMagnetHeight: { value: 1.08 },
      uBuild: { value: 1 },
      uMagnet: { value: new THREE.Vector2(0, 0) },
      uWakeMagnet: { value: new THREE.Vector2(0, 0) },
      uOldMagnet: { value: new THREE.Vector2(0, 0) },
    },
  }), [])
  const magnet = useRef<THREE.Group>(null)
  const fieldLines = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const target = useRef(new THREE.Vector2(0.5, 0.1))
  const magnetCurrent = useRef(new THREE.Vector2(0.5, 0.1))
  const fluidCurrent = useRef(new THREE.Vector2(0.5, 0.1))
  const wakeCurrent = useRef(new THREE.Vector2(0.5, 0.1))
  const oldCurrent = useRef(new THREE.Vector2(0.5, 0.1))
  const dragging = useRef(false)
  const userTouched = useRef(false)
  const beatStarted = useRef(0)
  const surfaceSegments = useMemo<[number, number]>(() => (
    window.innerWidth < 720 ? [220, 154] : [340, 238]
  ), [])

  useEffect(() => {
    beatStarted.current = performance.now() / 1_000
    if (beat > 0) userTouched.current = false
  }, [beat])

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime
    const beatTime = performance.now() / 1_000 - beatStarted.current
    let magnetHeight = 1.08
    let build = 1
    let guidedStrength = strength

    if (beat === 0 && !userTouched.current && !reducedMotion) {
      const compact = surfaceSegments[0] < 300
      target.current.set(
        Math.cos(time * 0.28) * (compact ? 0.46 : 1.65) + (compact ? 0.45 : 0.65),
        Math.sin(time * 0.39) * (compact ? 0.52 : 0.92),
      )
    } else if (beat > 0) {
      const positions: Record<Exclude<FerroBeat, 0>, [number, number]> = {
        1: [-0.35, 0.4],
        2: [0.55, 0.15],
        3: [0.0, 0.35],
        4: [0.0, 0.0],
        5: [-0.72, 0.05],
        6: [0.82, 0.02],
      }
      const guidedBeat = beat as Exclude<FerroBeat, 0>
      const [targetX, targetY] = positions[guidedBeat]
      target.current.set(targetX, targetY)
      if (beat === 1) {
        magnetHeight = 2.15
        guidedStrength = 0.36
        build = 0.16
      }
      if (beat === 2) {
        magnetHeight = 1.62
        guidedStrength = 0.52
        build = 0.94
      }
      if (beat === 3) {
        magnetHeight = 1.28
        guidedStrength = 0.76
        build = 0.64
      }
      if (beat === 4) {
        const reveal = reducedMotion ? 1 : THREE.MathUtils.smoothstep(beatTime, 0.45, 4.1)
        magnetHeight = THREE.MathUtils.lerp(2.0, 0.82, reveal)
        guidedStrength = THREE.MathUtils.lerp(0.4, 1.12, reveal)
        build = THREE.MathUtils.lerp(0.18, 1, reveal)
      }
      if (beat === 5) {
        magnetHeight = 1.08
        guidedStrength = 0.82
        build = 0.9
      }
      if (beat === 6) {
        magnetHeight = 0.98
        guidedStrength = 0.92
        build = 1
      }
    }

    magnetCurrent.current.lerp(target.current, 1 - Math.exp(-delta * 13))
    fluidCurrent.current.lerp(magnetCurrent.current, 1 - Math.exp(-delta * (beat === 0 ? 4.5 : 6.4)))
    wakeCurrent.current.lerp(fluidCurrent.current, 1 - Math.exp(-delta * (beat === 0 ? 1.65 : 3.2)))
    oldCurrent.current.lerp(wakeCurrent.current, 1 - Math.exp(-delta * (beat === 0 ? 0.72 : 1.8)))
    material.uniforms.uTime.value = time
    material.uniforms.uStrength.value = guidedStrength
    material.uniforms.uMagnetHeight.value = magnetHeight
    material.uniforms.uBuild.value = build
    material.uniforms.uMagnet.value.copy(fluidCurrent.current)
    material.uniforms.uWakeMagnet.value.copy(wakeCurrent.current)
    material.uniforms.uOldMagnet.value.copy(oldCurrent.current)

    if (magnet.current) {
      magnet.current.position.set(magnetCurrent.current.x, magnetCurrent.current.y, magnetHeight)
      magnet.current.rotation.z = Math.sin(time * 0.62) * 0.028
    }
    if (fieldLines.current) {
      fieldLines.current.position.set(magnetCurrent.current.x, magnetCurrent.current.y, magnetHeight * 0.48)
      fieldLines.current.rotation.z = time * 0.035
    }
  })

  return (
    <>
      <CameraRig beat={beat} reducedMotion={reducedMotion} />
      <ambientLight intensity={0.36} color="#527a72" />
      <directionalLight position={[-4, -3, 8]} intensity={5.6} color="#ffc477" />
      <pointLight position={[4.2, 1.2, 4.8]} intensity={64} distance={13} color="#68d4cb" />
      <pointLight position={[-3, -4, 2.5]} intensity={30} distance={10} color="#c66b31" />

      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[13, 9, surfaceSegments[0], surfaceSegments[1]]} />
        <primitive object={material} attach="material" />
      </mesh>

      <group ref={fieldLines} visible={beat === 2 || beat === 3}>
        {[0.68, 0.92, 1.2, 1.52, 1.88].map((radius, index) => (
          <group key={radius} rotation={[Math.PI / 2, 0, index * 0.52]}>
            <mesh>
              <torusGeometry args={[radius, 0.008 + index * 0.0015, 8, 120]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? '#efb661' : '#65c9c1'}
                transparent
                opacity={0.25 - index * 0.025}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={magnet}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.43, 0.43, 0.3, 64, 1]} />
          <meshStandardMaterial color="#252825" metalness={0.93} roughness={0.17} />
        </mesh>
        <mesh position={[0, 0, 0.198]}>
          <torusGeometry args={[0.295, 0.034, 20, 80]} />
          <meshBasicMaterial color="#ffc36f" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.202]}>
          <torusGeometry args={[0.295, 0.024, 20, 80]} />
          <meshBasicMaterial color="#63c9c0" toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.315, 64, 1, true]} />
          <meshStandardMaterial color="#050606" metalness={0.75} roughness={0.22} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 0, -0.04]} intensity={19} distance={3.6} color="#ffb55d" />
      </group>

      <mesh
        position={[0, 0, 0.3]}
        onPointerDown={(event) => {
          event.stopPropagation()
          dragging.current = true
          userTouched.current = true
          onFreeMode()
          target.current.set(event.point.x, event.point.y)
          gl.domElement.setPointerCapture(event.pointerId)
          controls.registerInteraction()
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return
          event.stopPropagation()
          const compact = surfaceSegments[0] < 300
          target.current.set(
            THREE.MathUtils.clamp(event.point.x, compact ? -1.3 : -4.1, compact ? 1.3 : 4.1),
            THREE.MathUtils.clamp(event.point.y, -2.45, 2.45),
          )
        }}
        onPointerUp={(event) => {
          dragging.current = false
          if (gl.domElement.hasPointerCapture(event.pointerId)) gl.domElement.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        <planeGeometry args={[12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}

function MicroParticles() {
  const particles = useMemo(() => Array.from({ length: 34 }, (_, index) => ({
    left: 8 + ((index * 37) % 84),
    top: 10 + ((index * 53) % 80),
    delay: -((index % 9) * 0.18),
    scale: 0.55 + ((index * 17) % 10) / 18,
  })), [])

  return (
    <div className="ferro-micro" aria-hidden="true">
      <div className="ferro-micro-lens">
        {particles.map((particle, index) => (
          <i
            key={index}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              transform: `scale(${particle.scale})`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function Ferrofluid({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = false
  const [strength, setStrength] = useState(0.82)
  const [beat, setBeat] = useState<FerroBeat>(0)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('ferrofluid')

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(0)
  }, [enterFree])

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {
      title: '它不是融化的铁',
      body: '这是一种普通液体，里面均匀悬浮着极小的磁性颗粒。颗粒小到不会很快沉底，表面包裹层又阻止它们抱成一团。',
      action: () => {
        setStrength(0.36)
        setBeat(1)
      },
    },
    {
      title: '三股力量把液面拉成软丘',
      body: '磁场把磁性颗粒向上聚拢，重力把液体往下拽，表面张力又像薄膜一样抹平弯曲。三者争夺之下，平静液面先隆起成一座软丘。',
      action: () => {
        setStrength(0.76)
        setBeat(3)
      },
    },
    {
      title: '平面突然不再稳定',
      body: '磁场继续增强时，平面不再是最低能量的形状。微小起伏会越长越高，最终排成尖峰——这叫正常场不稳定性。',
      action: () => {
        setStrength(1.12)
        setBeat(4)
      },
    },
    {
      title: '从太空燃料到扬声器',
      body: '20 世纪 60 年代，NASA 工程师 Stephen Papell 想在失重时用磁场牵引液体燃料，发明了早期铁磁流体。今天它也用来帮助扬声器散热、密封高速旋转轴。',
      action: () => setBeat(5),
    },
    {
      title: '尖峰会出生，也会塌下',
      body: '尖峰不是一张跟着磁铁移动的图片：磁场够强的地方会长出新尖峰，磁力离开后旧尖峰逐个塌下。故事结束后，可以亲手拖动磁铁观察这场生灭。',
      action: () => setBeat(6),
    },
  ], [])

  return (
    <div className={`oss-experience ferro-experience ferro-beat-${beat}${storyMode ? ' is-story' : ' is-free'}`}>
      <div className="ferro-aurora" aria-hidden="true" />
      <Canvas
        className="ferro-canvas"
        dpr={[1, 1.75]}
        camera={{ position: [0.4, -5.9, 4.7], fov: 42, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        aria-label={tx('可拖动磁铁观察铁磁流体从隆起到尖峰形成的三维场景')}
      >
        <FerroScene
          strength={strength}
          beat={beat}
          controls={controls}
          reducedMotion={reducedMotion}
          onFreeMode={returnToFree}
        />
      </Canvas>

      {/* 点题铭牌 · 顶左 · 短句不抢主体 */}
      {!storyMode && (
        <header className="ferro-plaque" data-experience-overlay="true">
          <h1>{tx('磁铁一靠近，液体就长出尖刺')}</h1>
          <strong>{tx('拖动磁铁；底栏拧磁力。尖峰在前方出生，在身后塌下。')}</strong>
        </header>
      )}

      {/* 故事分镜叠层：仅故事模式 */}
      {storyMode && beat === 1 && (
        <div className="ferro-story ferro-story-matter" data-experience-overlay="true">
          <MicroParticles />
          <div>
            <Atom weight="duotone" />
            <span>{tx('液体里均匀悬浮着磁性纳米颗粒')}</span>
            <small>{tx('不是一块液态金属')}</small>
          </div>
        </div>
      )}

      {storyMode && beat === 2 && (
        <div className="ferro-story ferro-story-field" data-experience-overlay="true">
          <Sparkle weight="fill" />
          <span>{tx('磁场示意')}</span>
          <strong>{tx('越靠近磁铁，拉力越强')}</strong>
        </div>
      )}

      {storyMode && beat === 3 && (
        <div className="ferro-story ferro-story-balance" data-experience-overlay="true">
          <span className="is-magnetic">{tx('磁场向上拉')} ↑</span>
          <i />
          <span>{tx('重力向下拽')} ↓</span>
          <span>{tx('表面张力把弯曲抹平')} ↔</span>
        </div>
      )}

      {storyMode && beat === 4 && (
        <div className="ferro-story ferro-story-equation" data-experience-overlay="true">
          <span>{tx('平面能否保持稳定？')}</span>
          <strong>ω²(k) = gk + σk³/ρ − C H²k²</strong>
          <p><i>{tx('重力')}</i> + <i>{tx('表面张力')}</i> − <b>{tx('磁场')}</b></p>
          <small>{tx('当磁场项压过前两项，微小起伏就会长成尖峰。')}</small>
        </div>
      )}

      {storyMode && beat === 5 && (
        <div className="ferro-story ferro-story-history" data-experience-overlay="true">
          <RocketLaunch weight="duotone" />
          <span>NASA · 1960s</span>
          <strong>{tx('怎样在失重时，把燃料送到发动机入口？')}</strong>
          <p>{tx('Stephen Papell 的答案：让液体听从磁场。')}</p>
        </div>
      )}

      {storyMode && beat === 6 && (
        <div className="ferro-story ferro-story-uses" data-experience-overlay="true">
          <div><SpeakerHigh weight="duotone" /><span>{tx('扬声器散热')}</span></div>
          <div><Gear weight="duotone" /><span>{tx('旋转轴密封')}</span></div>
          <div><Sparkle weight="duotone" /><span>{tx('研究与艺术')}</span></div>
        </div>
      )}

      {/* 被动读数 · 底左 · 非交互 */}
      {!storyMode && (
        <aside className="ferro-readout" data-experience-overlay="true" aria-live="polite">
          <MagnetStraight aria-hidden="true" />
          <div>
            <small>{tx('磁力')}</small>
            <strong>{Math.round(strength * 100)}</strong>
          </div>
        </aside>
      )}

      {/* 自由底栏：磁力滑杆 + 弱重播 */}
      {!storyMode && (
        <Freebar
          className="ferro-freebar"
          mainClassName="ferro-freebar-main"
          ariaLabel={tx('磁力控制')}
          primaryControlBudget={1}
        >
          <label className="ferro-freebar-strength">
            <span>{tx('磁力')}</span>
            <input
              className="ferro-strength"
              type="range"
              min="0.28"
              max="1.15"
              step="0.01"
              value={strength}
              aria-label={tx('磁力')}
              onChange={(event) => {
                controls.registerInteraction()
                setStrength(Number(event.target.value))
              }}
            />
            <b>{Math.round(strength * 100)}</b>
          </label>
          <button
            type="button"
            className="experience-freebar-story"
            onClick={() => {
              controls.registerInteraction()
              enterStory()
              setBeat(0)
              replayGuide('ferrofluid')
            }}
            aria-label={tx('重播故事')}
          >
            <FilmStrip weight="fill" />
            <span>{tx('故事')}</span>
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId="ferrofluid"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'drift-left', width: 'normal', treatment: 'caption', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'fade', width: 'narrow', treatment: 'annotation', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'scale', width: 'normal', treatment: 'editorial', cue: 'left' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'drift-left', width: 'wide', treatment: 'monumental', cue: 'up' },
        ]}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="ferrofluid"
          delay={1800}
          gesture={{ type: 'drag', target: '.ferro-canvas', dx: 150, dy: -52, label: tx('轻轻拖动磁铁') }}
        />
      )}
    </div>
  )
}
