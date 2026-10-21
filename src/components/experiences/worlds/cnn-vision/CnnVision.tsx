import './styles/CnnVision.css'
import { ArrowCounterClockwise, FilmStrip } from '@phosphor-icons/react'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  LAYER_META,
  activationColor,
  emptyActivations,
  forward,
  maxAbsFlat,
  topPrediction,
  type Activations,
  type CnnWeights,
  type LayerId,
} from '~/components/experiences/worlds/cnn-vision/cnn-vision/network'
import { getSampleDigit, normalizeDigit } from '~/components/experiences/worlds/cnn-vision/cnn-vision/sampleDigits'
import { useExperienceI18n } from '~/i18n/experience'
type CnnBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6
type CnnDemoMode = 'overview' | 'input' | 'conv' | 'feature' | 'pool' | 'conv2' | 'output'

const WEIGHTS_URL = '/assets/experiences/cnn-vision/weights.json'
const NODE_SIZE = 1.55
const DRAW_CSS = 112
const INPUT_PX = 28

const ALL_LAYERS: LayerId[] = ['input', 'conv1', 'pool1', 'conv2', 'pool2', 'fc']

/** Camera framing presets when inspecting a single layer (or whole pipeline). */
const LAYER_VIEW: Record<LayerId | 'overview', { target: THREE.Vector3; position: THREE.Vector3 }> = {
  overview: {
    target: new THREE.Vector3(165, 0, 0),
    position: new THREE.Vector3(165 + 180, 140, 380),
  },
  input: {
    target: new THREE.Vector3(0, 0, 0),
    position: new THREE.Vector3(40, 55, 170),
  },
  conv1: {
    target: new THREE.Vector3(72, 0, 0),
    position: new THREE.Vector3(110, 70, 200),
  },
  pool1: {
    target: new THREE.Vector3(140, 0, 0),
    position: new THREE.Vector3(175, 55, 170),
  },
  conv2: {
    target: new THREE.Vector3(210, 0, 0),
    position: new THREE.Vector3(250, 70, 190),
  },
  pool2: {
    target: new THREE.Vector3(270, 0, 0),
    position: new THREE.Vector3(300, 50, 150),
  },
  fc: {
    target: new THREE.Vector3(330, 0, 0),
    position: new THREE.Vector3(360, 40, 160),
  },
}

type LayerMesh = {
  mesh: THREE.InstancedMesh
  positions: Array<{ x: number; y: number; z: number }>
  count: number
  baseOpacity: number
}

type DemoFrame = {
  group: THREE.Group
  surface: THREE.Mesh
  outer: THREE.LineSegments
  grid: THREE.LineSegments
}

type DemoMarker = {
  group: THREE.Group
  ring: THREE.Mesh
  core: THREE.Mesh
}

type CnnDemoRig = {
  root: THREE.Group
  convFrame: DemoFrame
  poolFrame: DemoFrame
  conv2Frame: DemoFrame
  convTarget: DemoMarker
  poolTarget: DemoMarker
  conv2Target: DemoMarker
  convParticles: THREE.Mesh[]
  poolParticles: THREE.Mesh[]
  conv2Particles: THREE.Mesh[]
  convBeam: THREE.Line
  conv2Beam: THREE.Line
  poolBeams: THREE.Line[]
}

type CnnDemoSceneState = {
  layers: Partial<Record<LayerId, LayerMesh>>
  acts: Activations | null
  demoMode: CnnDemoMode
  demoStartedAt: number
}

const CONV_FLOW_OFFSETS: Array<[number, number]> = [
  [0, 0],
  [0, 4],
  [4, 0],
  [4, 4],
  [2, 2],
  [1, 3],
  [3, 1],
  [2, 4],
  [4, 2],
]
const POOL_OFFSETS: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
]

function layerPoint(layerId: LayerId, filterIdx: number, row: number, col: number): THREE.Vector3 {
  const cfg = LAYER_META.find((layer) => layer.id === layerId)!
  const point = nodePosition(layerId, filterIdx, row, col, cfg.dims)
  return new THREE.Vector3(point.x, point.y, point.z)
}

function createDemoFrame(cells: number, color: number): DemoFrame {
  const group = new THREE.Group()
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  surface.rotation.y = Math.PI / 2
  group.add(surface)

  const outerGeometry = new THREE.BufferGeometry()
  outerGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0, -0.5, -0.5, 0, 0.5, -0.5,
        0, 0.5, -0.5, 0, 0.5, 0.5,
        0, 0.5, 0.5, 0, -0.5, 0.5,
        0, -0.5, 0.5, 0, -0.5, -0.5,
      ]),
      3,
    ),
  )
  const outer = new THREE.LineSegments(
    outerGeometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }),
  )
  group.add(outer)

  const gridPositions: number[] = []
  for (let i = 1; i < cells; i += 1) {
    const u = -0.5 + i / cells
    gridPositions.push(0, -0.5, u, 0, 0.5, u)
    gridPositions.push(0, u, -0.5, 0, u, 0.5)
  }
  const gridGeometry = new THREE.BufferGeometry()
  gridGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridPositions), 3))
  const grid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.38, depthWrite: false }),
  )
  group.add(grid)

  return { group, surface, outer, grid }
}

function createDemoMarker(color: number): DemoMarker {
  const group = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.28, 8, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false }),
  )
  ring.rotation.y = Math.PI / 2
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }),
  )
  group.add(ring, core)
  return { group, ring, core }
}

function createDemoBeam(color: number): THREE.Line {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }),
  )
}

function createDemoParticles(count: number, color: number): THREE.Mesh[] {
  return Array.from({ length: count }, () => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86, depthWrite: false }),
    )
    mesh.visible = false
    return mesh
  })
}

function setBeamEndpoints(line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3) {
  const position = line.geometry.getAttribute('position') as THREE.BufferAttribute
  position.setXYZ(0, from.x, from.y, from.z)
  position.setXYZ(1, to.x, to.y, to.z)
  position.needsUpdate = true
}

function updateDemoFrame(frame: DemoFrame, layerId: LayerId, filterIdx: number, row: number, col: number, kernelSize: number) {
  const cfg = LAYER_META.find((layer) => layer.id === layerId)!
  const center = layerPoint(layerId, filterIdx, row, col)
  const size = (kernelSize - 1) * cfg.spacing + NODE_SIZE * 1.9
  frame.group.position.set(center.x + 2.6, center.y, center.z)
  frame.group.scale.setScalar(size)
}

function updateDemoMarker(
  marker: DemoMarker,
  point: THREE.Vector3,
  color: THREE.Color,
  strength: number,
  pulse: number,
) {
  marker.group.position.set(point.x + 2.6, point.y, point.z)
  marker.group.scale.setScalar(0.72 + strength * 0.4 + pulse * 0.1)
  const ringMaterial = marker.ring.material as THREE.MeshBasicMaterial
  const coreMaterial = marker.core.material as THREE.MeshBasicMaterial
  ringMaterial.color.copy(color)
  coreMaterial.color.copy(color)
  ringMaterial.opacity = 0.58 + strength * 0.28
  coreMaterial.opacity = 0.24 + strength * 0.38
  marker.group.visible = true
}

function activationDetails(data: number[][][] | undefined, filterIdx: number, row: number, col: number) {
  const value = Math.max(0, data?.[filterIdx]?.[row]?.[col] ?? 0)
  const max = data ? Math.max(0.01, maxAbsFlat(data)) : 1
  const [r, g, b] = activationColor(value, 0, max)
  return { color: new THREE.Color(r, g, b), strength: Math.min(1, value / max) }
}

function updateDemoRig(
  rig: CnnDemoRig,
  api: CnnDemoSceneState,
  now: number,
  reducedMotion: boolean,
) {
  const mode = api.demoMode
  const elapsed = Math.max(0, now - api.demoStartedAt)
  const pulse = reducedMotion ? 0.72 : 0.5 + 0.5 * Math.sin(now * 0.004)
  const showRig = mode === 'conv' || mode === 'feature' || mode === 'pool' || mode === 'conv2'
  rig.root.visible = showRig
  rig.convFrame.group.visible = false
  rig.poolFrame.group.visible = false
  rig.conv2Frame.group.visible = false
  rig.convTarget.group.visible = false
  rig.poolTarget.group.visible = false
  rig.conv2Target.group.visible = false
  rig.convBeam.visible = false
  rig.conv2Beam.visible = false
  for (const beam of rig.poolBeams) beam.visible = false
  for (const particle of [...rig.convParticles, ...rig.poolParticles, ...rig.conv2Particles]) particle.visible = false
  if (!showRig) return

  const layers = api.layers
  const acts = api.acts
  const input = layers.input
  const conv1 = layers.conv1
  const pool1 = layers.pool1
  const conv2 = layers.conv2
  if (!input || !conv1 || !pool1 || !conv2) return

  if (mode === 'conv' || mode === 'feature') {
    const scanIndex = reducedMotion ? 10 * 24 + 10 : Math.floor(elapsed * 0.024) % (24 * 24)
    const row = Math.floor(scanIndex / 24)
    const col = scanIndex % 24
    const center = layerPoint('input', 0, row + 2, col + 2)
    const target = layerPoint('conv1', 0, row, col)
    const sourceFront = center.clone()
    sourceFront.x += 2.6
    const targetFront = target.clone()
    targetFront.x += 2.6
    const details = activationDetails(acts?.conv1, 0, row, col)

    updateDemoFrame(rig.convFrame, 'input', 0, row + 2, col + 2, 5)
    rig.convFrame.group.visible = mode === 'conv'
    const surfaceMaterial = rig.convFrame.surface.material as THREE.MeshBasicMaterial
    const outerMaterial = rig.convFrame.outer.material as THREE.LineBasicMaterial
    const gridMaterial = rig.convFrame.grid.material as THREE.LineBasicMaterial
    surfaceMaterial.color.set(0x5eead4)
    outerMaterial.color.set(0x8fffea)
    gridMaterial.color.set(0x5eead4)
    surfaceMaterial.opacity = mode === 'conv' ? 0.1 : 0.035
    outerMaterial.opacity = mode === 'conv' ? 0.96 : 0.42
    gridMaterial.opacity = mode === 'conv' ? 0.42 : 0.16
    setBeamEndpoints(rig.convBeam, sourceFront, targetFront)
    rig.convBeam.visible = true
    ;(rig.convBeam.material as THREE.LineBasicMaterial).opacity = mode === 'conv' ? 0.58 : 0.26

    const flowPhase = reducedMotion ? 0.68 : (elapsed * 0.0012) % 1
    for (let i = 0; i < rig.convParticles.length; i += 1) {
      const [dr, dc] = CONV_FLOW_OFFSETS[i % CONV_FLOW_OFFSETS.length]
      const source = layerPoint('input', 0, row + dr, col + dc)
      source.x += 2.6
      const t = reducedMotion ? 0.72 : (flowPhase + i * 0.11) % 1
      const eased = t * t * (3 - 2 * t)
      const particle = rig.convParticles[i]
      particle.position.lerpVectors(source, targetFront, eased)
      particle.scale.setScalar(0.72 + (1 - eased) * 0.42)
      const material = particle.material as THREE.MeshBasicMaterial
      material.color.copy(details.color)
      material.opacity = 0.28 + (1 - eased) * 0.58
      particle.visible = true
    }
    updateDemoMarker(rig.convTarget, target, details.color, details.strength, pulse)
    return
  }

  if (mode === 'pool') {
    const scanIndex = reducedMotion ? 5 * 12 + 6 : Math.floor(elapsed * 0.03) % (12 * 12)
    const row = Math.floor(scanIndex / 12)
    const col = scanIndex % 12
    const target = layerPoint('pool1', 0, row, col)
    const targetFront = target.clone()
    targetFront.x += 2.6
    let winner = 0
    let winnerValue = -Infinity
    for (let i = 0; i < POOL_OFFSETS.length; i += 1) {
      const [dr, dc] = POOL_OFFSETS[i]
      const value = acts?.conv1?.[0]?.[row * 2 + dr]?.[col * 2 + dc] ?? 0
      if (value > winnerValue) {
        winnerValue = value
        winner = i
      }
    }
    const details = activationDetails(acts?.pool1, 0, row, col)

    updateDemoFrame(rig.poolFrame, 'conv1', 0, row * 2 + 0.5, col * 2 + 0.5, 2)
    rig.poolFrame.group.visible = true
    const surfaceMaterial = rig.poolFrame.surface.material as THREE.MeshBasicMaterial
    const outerMaterial = rig.poolFrame.outer.material as THREE.LineBasicMaterial
    const gridMaterial = rig.poolFrame.grid.material as THREE.LineBasicMaterial
    surfaceMaterial.color.set(0xffd166)
    outerMaterial.color.set(0xffe6a1)
    gridMaterial.color.set(0xffd166)
    surfaceMaterial.opacity = 0.12
    outerMaterial.opacity = 0.98
    gridMaterial.opacity = 0.44

    const converge = reducedMotion ? 0.72 : (elapsed * 0.0011) % 1
    for (let i = 0; i < POOL_OFFSETS.length; i += 1) {
      const [dr, dc] = POOL_OFFSETS[i]
      const source = layerPoint('conv1', 0, row * 2 + dr, col * 2 + dc)
      source.x += 2.6
      const delay = i === winner ? 0.12 : 0.27 + i * 0.025
      const t = reducedMotion ? (i === winner ? 0.82 : 0.48) : Math.max(0, Math.min(1, (converge - delay) / 0.5))
      const eased = t * t * (3 - 2 * t)
      const particle = rig.poolParticles[i]
      particle.position.lerpVectors(source, targetFront, eased)
      particle.scale.setScalar(i === winner ? 1.12 : 0.78)
      const material = particle.material as THREE.MeshBasicMaterial
      material.color.set(i === winner ? 0xffd166 : 0x70d9d0)
      material.opacity = i === winner ? 0.95 : 0.55 - eased * 0.22
      particle.visible = true
      setBeamEndpoints(rig.poolBeams[i], source, targetFront)
      rig.poolBeams[i].visible = true
      const beamMaterial = rig.poolBeams[i].material as THREE.LineBasicMaterial
      beamMaterial.color.set(i === winner ? 0xffd166 : 0x5eead4)
      beamMaterial.opacity = i === winner ? 0.72 : 0.22 + (1 - eased) * 0.2
    }
    updateDemoMarker(rig.poolTarget, target, details.color, details.strength, pulse)
    return
  }

  if (mode === 'conv2') {
    const scanIndex = reducedMotion ? 3 * 8 + 3 : Math.floor(elapsed * 0.028) % (8 * 8)
    const row = Math.floor(scanIndex / 8)
    const col = scanIndex % 8
    const center = layerPoint('pool1', 0, row + 2, col + 2)
    const target = layerPoint('conv2', 0, row, col)
    const sourceFront = center.clone()
    sourceFront.x += 2.6
    const targetFront = target.clone()
    targetFront.x += 2.6
    const details = activationDetails(acts?.conv2, 0, row, col)

    updateDemoFrame(rig.conv2Frame, 'pool1', 0, row + 2, col + 2, 5)
    rig.conv2Frame.group.visible = true
    const surfaceMaterial = rig.conv2Frame.surface.material as THREE.MeshBasicMaterial
    const outerMaterial = rig.conv2Frame.outer.material as THREE.LineBasicMaterial
    const gridMaterial = rig.conv2Frame.grid.material as THREE.LineBasicMaterial
    surfaceMaterial.color.set(0xf0abfc)
    outerMaterial.color.set(0xffd0fa)
    gridMaterial.color.set(0xf0abfc)
    surfaceMaterial.opacity = 0.1
    outerMaterial.opacity = 0.96
    gridMaterial.opacity = 0.42
    setBeamEndpoints(rig.conv2Beam, sourceFront, targetFront)
    rig.conv2Beam.visible = true
    ;(rig.conv2Beam.material as THREE.LineBasicMaterial).opacity = 0.56

    const flowPhase = reducedMotion ? 0.68 : (elapsed * 0.0012) % 1
    for (let i = 0; i < rig.conv2Particles.length; i += 1) {
      const [dr, dc] = CONV_FLOW_OFFSETS[i % CONV_FLOW_OFFSETS.length]
      const source = layerPoint('pool1', 0, row + dr, col + dc)
      source.x += 2.6
      const t = reducedMotion ? 0.72 : (flowPhase + i * 0.11) % 1
      const eased = t * t * (3 - 2 * t)
      const particle = rig.conv2Particles[i]
      particle.position.lerpVectors(source, targetFront, eased)
      particle.scale.setScalar(0.72 + (1 - eased) * 0.42)
      const material = particle.material as THREE.MeshBasicMaterial
      material.color.copy(details.color)
      material.opacity = 0.28 + (1 - eased) * 0.58
      particle.visible = true
    }
    updateDemoMarker(rig.conv2Target, target, details.color, details.strength, pulse)
  }
}

function nodePosition(
  layerId: LayerId,
  filterIdx: number,
  row: number,
  col: number,
  dims: number[],
): { x: number; y: number; z: number } {
  const cfg = LAYER_META.find((l) => l.id === layerId)!
  if (layerId === 'fc') {
    return {
      x: cfg.x,
      y: (col - (dims[0] - 1) / 2) * cfg.spacing,
      z: 0,
    }
  }
  const [h, w, filters] = dims
  const fx = filterIdx % 4
  const fy = Math.floor(filterIdx / 4)
  const y = (row - (h - 1) / 2) * cfg.spacing
  const z = (col - (w - 1) / 2) * cfg.spacing
  const yOff = (fy - (Math.ceil(filters / 4) - 1) / 2) * h * cfg.spacing * 1.05
  const zOff = (fx - 1.5) * w * cfg.spacing * 1.05
  return { x: cfg.x, y: y + yOff, z: z + zOff }
}

function buildLayerPositions(cfg: (typeof LAYER_META)[number]): Array<{ x: number; y: number; z: number }> {
  const dims = cfg.dims
  const positions: Array<{ x: number; y: number; z: number }> = []
  if (cfg.id === 'fc') {
    for (let i = 0; i < dims[0]; i += 1) {
      positions.push(nodePosition(cfg.id, 0, 0, i, dims))
    }
    return positions
  }
  const [h, w, filters] = dims
  for (let f = 0; f < filters; f += 1) {
    for (let r = 0; r < h; r += 1) {
      for (let c = 0; c < w; c += 1) {
        positions.push(nodePosition(cfg.id, f, r, c, dims))
      }
    }
  }
  return positions
}

function paintActivations(
  layers: Record<LayerId, LayerMesh>,
  acts: Activations | null,
  reveal: Record<LayerId, number>,
  globalOpacity: number,
  pulse: number,
  focusLayer: LayerId | null,
) {
  const color = new THREE.Color()
  for (const cfg of LAYER_META) {
    const layer = layers[cfg.id]
    if (!layer) continue
    const mat = layer.mesh.material as THREE.MeshLambertMaterial
    const focusBoost = focusLayer === cfg.id ? 1.15 : focusLayer ? 0.55 : 1
    mat.opacity = Math.min(1, layer.baseOpacity * globalOpacity * reveal[cfg.id] * focusBoost * (0.88 + pulse * 0.12))
    mat.transparent = true
    mat.needsUpdate = true
    layer.mesh.visible = reveal[cfg.id] > 0.02

    const data = acts ? acts[cfg.id] : null
    let maxAct = 0.01
    if (data) {
      if (cfg.id === 'fc') maxAct = Math.max(0.01, ...((data as number[]) ?? [0.01]))
      else if (cfg.id === 'input') maxAct = 1
      else maxAct = maxAbsFlat(data as number[][][])
    }

    const count = layer.count
    for (let i = 0; i < count; i += 1) {
      let val = 0
      if (data) {
        if (cfg.id === 'fc') {
          val = (data as number[])[i] ?? 0
        } else if (cfg.id === 'input') {
          const r = Math.floor(i / 28)
          const c = i % 28
          val = (data as number[][][])[0]?.[r]?.[c] ?? 0
        } else {
          const [h, w] = cfg.dims
          const plane = h * w
          const f = Math.floor(i / plane)
          const within = i % plane
          const r = Math.floor(within / w)
          const c = within % w
          val = (data as number[][][])[f]?.[r]?.[c] ?? 0
        }
      } else {
        // idle glow — soft low noise-ish by index
        val = 0.04 + 0.03 * Math.sin(i * 0.17 + pulse * 4)
      }
      const [r, g, b] = activationColor(val, 0, maxAct)
      color.setRGB(r, g, b)
      if (cfg.id === 'fc' && data) {
        const top = topPrediction(data as number[])
        if (i === top.digit && top.prob > 0.2) {
          color.setRGB(1, 0.82, 0.28)
        }
      }
      layer.mesh.setColorAt(i, color)
    }
    if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true
  }
}

function layerLabelStatic(id: LayerId): string {
  switch (id) {
    case 'input':
      return '输入层 · Input'
    case 'conv1':
      return '卷积1 · Conv1'
    case 'pool1':
      return '池化1 · Pool1'
    case 'conv2':
      return '卷积2 · Conv2'
    case 'pool2':
      return '池化2 · Pool2'
    case 'fc':
      return '输出 · Softmax'
    default:
      return id
  }
}

function canvasToInput(draw: HTMLCanvasElement): Float32Array {
  const tmp = document.createElement('canvas')
  tmp.width = INPUT_PX
  tmp.height = INPUT_PX
  const ctx = tmp.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, INPUT_PX, INPUT_PX)
  ctx.drawImage(draw, 0, 0, INPUT_PX, INPUT_PX)
  const imageData = ctx.getImageData(0, 0, INPUT_PX, INPUT_PX)
  const out = new Float32Array(INPUT_PX * INPUT_PX)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = imageData.data[i * 4] / 255
  }
  return out
}

function paintInputOntoDraw(draw: HTMLCanvasElement, pixels: Float32Array) {
  const ctx = draw.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(INPUT_PX, INPUT_PX)
  for (let i = 0; i < INPUT_PX * INPUT_PX; i += 1) {
    const v = Math.round(Math.max(0, Math.min(1, pixels[i])) * 255)
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  // scale 28→draw size via intermediate
  const tmp = document.createElement('canvas')
  tmp.width = INPUT_PX
  tmp.height = INPUT_PX
  const tctx = tmp.getContext('2d')!
  tctx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, draw.width, draw.height)
  ctx.drawImage(tmp, 0, 0, draw.width, draw.height)
}

export function CnnVision({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = false
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('cnn-vision')

  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef<HTMLCanvasElement>(null)

  const [beat, setBeat] = useState<CnnBeat>(0)
  const [weights, setWeights] = useState<CnnWeights | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [prediction, setPrediction] = useState<{ digit: number; prob: number } | null>(null)
  const [probs, setProbs] = useState<number[]>(() => Array.from({ length: 10 }, () => 0.1))
  const [activeSample, setActiveSample] = useState<number | null>(null)
  const [layerOn, setLayerOn] = useState<Record<LayerId, boolean>>(() =>
    Object.fromEntries(ALL_LAYERS.map((id) => [id, true])) as Record<LayerId, boolean>,
  )
  const [opacity, setOpacity] = useState(1)
  const [focusLayer, setFocusLayer] = useState<LayerId | null>(null)

  const sceneApi = useRef<{
    layers: Partial<Record<LayerId, LayerMesh>>
    camera: THREE.PerspectiveCamera | null
    controls: OrbitControls | null
    /** Smooth fly-to destination (null = user free orbit) */
    camGoal: { target: THREE.Vector3; position: THREE.Vector3 } | null
    acts: Activations | null
    reveal: Record<LayerId, number>
    focus: LayerId | null
    opacity: number
    autoOrbit: boolean
    pointerDown: { x: number; y: number; t: number } | null
    hoverInfo: string | null
    demoMode: CnnDemoMode
    demoStartedAt: number
    demoRig: CnnDemoRig | null
  }>({
    layers: {},
    camera: null,
    controls: null,
    camGoal: null,
    acts: null,
    reveal: Object.fromEntries(ALL_LAYERS.map((id) => [id, 1])) as Record<LayerId, number>,
    focus: null,
    opacity: 1,
    autoOrbit: true,
    pointerDown: null,
    hoverInfo: null,
    demoMode: 'overview',
    demoStartedAt: 0,
    demoRig: null,
  })

  const [hoverInfo, setHoverInfo] = useState<string | null>(null)
  const [inspectId, setInspectId] = useState<LayerId | 'overview' | null>('overview')
  const [toolTab, setToolTab] = useState<'layers' | 'draw'>('layers')

  const weightsRef = useRef<CnnWeights | null>(null)
  weightsRef.current = weights

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // Load weights
  useEffect(() => {
    let cancelled = false
    fetch(WEIGHTS_URL)
      .then((r) => {
        if (!r.ok) throw new Error('weights')
        return r.json() as Promise<CnnWeights>
      })
      .then((data) => {
        if (!cancelled) setWeights(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const runForward = useCallback(
    (pixels: Float32Array) => {
      const w = weightsRef.current
      if (!w) return
      const acts = forward(pixels, w)
      sceneApi.current.acts = acts
      const top = topPrediction(acts.fc)
      setPrediction(top)
      setProbs([...acts.fc])
    },
    [],
  )

  const clearDraw = useCallback(() => {
    const draw = drawRef.current
    if (!draw) return
    const ctx = draw.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, draw.width, draw.height)
    setActiveSample(null)
    setPrediction(null)
    setProbs(Array.from({ length: 10 }, () => 0.1))
    sceneApi.current.acts = emptyActivations()
  }, [])

  const loadSample = useCallback(
    (digit: number, user = true) => {
      const pixels = normalizeDigit(getSampleDigit(digit))
      const draw = drawRef.current
      if (draw) paintInputOntoDraw(draw, pixels)
      setActiveSample(digit)
      runForward(pixels)
      if (user) controls.registerInteraction()
    },
    [controls, runForward],
  )

  // Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x141a32, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.55

    const scene = new THREE.Scene()
    // Lighter fog so deep layers stay readable
    scene.fog = new THREE.FogExp2(0x141a32, 0.00055)

    const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000)
    const overview = LAYER_VIEW.overview
    camera.position.copy(overview.position)
    sceneApi.current.camera = camera

    // Full free orbit / pan / zoom — same mental model as upstream cnn-3d-visualization
    const controls = new OrbitControls(camera, canvas)
    controls.target.copy(overview.target)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.85
    controls.zoomSpeed = 1.05
    controls.panSpeed = 0.9
    controls.minDistance = 40
    controls.maxDistance = 900
    controls.maxPolarAngle = Math.PI * 0.92
    controls.minPolarAngle = 0.08
    controls.enablePan = true
    controls.screenSpacePanning = true
    controls.addEventListener('start', () => {
      sceneApi.current.autoOrbit = false
      sceneApi.current.camGoal = null
    })
    sceneApi.current.controls = controls

    const ambient = new THREE.AmbientLight(0xc8d2ee, 1.15)
    const hemi = new THREE.HemisphereLight(0xf0f4ff, 0x2a3558, 0.85)
    const key = new THREE.DirectionalLight(0xfff6e8, 1.65)
    key.position.set(120, 220, 180)
    const fill = new THREE.DirectionalLight(0x9ec4ff, 0.85)
    fill.position.set(-160, -40, -120)
    const rim = new THREE.PointLight(0x7cf0d8, 140, 900)
    rim.position.set(330, 60, 100)
    const front = new THREE.PointLight(0xffffff, 90, 700)
    front.position.set(160, 80, 280)
    scene.add(ambient, hemi, key, fill, rim, front)

    const floorGeo = new THREE.PlaneGeometry(700, 360)
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x1a2240,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(165, -95, 0)
    scene.add(floor)

    const grid = new THREE.GridHelper(520, 16, 0x4a5a8a, 0x283050)
    grid.position.set(165, -94, 0)
    scene.add(grid)

    // Build instanced layers once
    const sharedGeo = new THREE.BoxGeometry(NODE_SIZE, NODE_SIZE, NODE_SIZE)
    const layers: Partial<Record<LayerId, LayerMesh>> = {}
    const dummy = new THREE.Object3D()
    const idleColor = new THREE.Color(0.22, 0.28, 0.48)

    for (const cfg of LAYER_META) {
      const positions = buildLayerPositions(cfg)
      const count = positions.length
      const size = cfg.id === 'fc' ? NODE_SIZE * 1.85 : cfg.id.includes('pool') ? NODE_SIZE * 1.15 : NODE_SIZE
      const geo = cfg.id === 'fc' ? new THREE.BoxGeometry(size, size, size) : sharedGeo
      const mat = new THREE.MeshLambertMaterial({
        transparent: true,
        opacity: cfg.id === 'fc' ? 0.98 : 0.92,
        depthWrite: false,
        emissive: new THREE.Color(0x1a2448),
        emissiveIntensity: 0.35,
      })
      const mesh = new THREE.InstancedMesh(geo, mat, count)
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
      mesh.frustumCulled = false
      mesh.userData.layerId = cfg.id
      for (let i = 0; i < count; i += 1) {
        dummy.position.set(positions[i].x, positions[i].y, positions[i].z)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        mesh.setColorAt(i, idleColor)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      scene.add(mesh)
      layers[cfg.id] = {
        mesh,
        positions,
        count,
        baseOpacity: cfg.id === 'fc' ? 0.98 : 0.94,
      }
    }
    sceneApi.current.layers = layers
    sceneApi.current.acts = emptyActivations()

    // A small, reusable stage for the story: the moving windows and signal beads
    // sit in the same coordinate system as the real activation layers.
    const demoRoot = new THREE.Group()
    const demoRig: CnnDemoRig = {
      root: demoRoot,
      convFrame: createDemoFrame(5, 0x5eead4),
      poolFrame: createDemoFrame(2, 0xffd166),
      conv2Frame: createDemoFrame(5, 0xf0abfc),
      convTarget: createDemoMarker(0x5eead4),
      poolTarget: createDemoMarker(0xffd166),
      conv2Target: createDemoMarker(0xf0abfc),
      convParticles: createDemoParticles(CONV_FLOW_OFFSETS.length, 0x5eead4),
      poolParticles: createDemoParticles(POOL_OFFSETS.length, 0xffd166),
      conv2Particles: createDemoParticles(CONV_FLOW_OFFSETS.length, 0xf0abfc),
      convBeam: createDemoBeam(0x5eead4),
      conv2Beam: createDemoBeam(0xf0abfc),
      poolBeams: POOL_OFFSETS.map(() => createDemoBeam(0xffd166)),
    }
    demoRoot.add(
      demoRig.convFrame.group,
      demoRig.poolFrame.group,
      demoRig.conv2Frame.group,
      demoRig.convTarget.group,
      demoRig.poolTarget.group,
      demoRig.conv2Target.group,
      demoRig.convBeam,
      demoRig.conv2Beam,
      ...demoRig.poolBeams,
      ...demoRig.convParticles,
      ...demoRig.poolParticles,
      ...demoRig.conv2Particles,
    )
    scene.add(demoRoot)
    sceneApi.current.demoRig = demoRig

    // Soft connection ribbons (sparse)
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x6a82c8,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    })
    const edgePairs: Array<[LayerId, LayerId]> = [
      ['input', 'conv1'],
      ['conv1', 'pool1'],
      ['pool1', 'conv2'],
      ['conv2', 'pool2'],
      ['pool2', 'fc'],
    ]
    const edgeLines: THREE.LineSegments[] = []
    for (const [from, to] of edgePairs) {
      const a = layers[from]!
      const b = layers[to]!
      const n = Math.min(48, a.count, b.count)
      const verts = new Float32Array(n * 6)
      for (let i = 0; i < n; i += 1) {
        const fi = Math.floor((i / n) * a.count)
        const ti = Math.floor((i / n) * b.count)
        const p0 = a.positions[fi]
        const p1 = b.positions[ti]
        const o = i * 6
        verts[o] = p0.x
        verts[o + 1] = p0.y
        verts[o + 2] = p0.z
        verts[o + 3] = p1.x
        verts[o + 4] = p1.y
        verts[o + 5] = p1.z
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
      const line = new THREE.LineSegments(g, edgeMat)
      scene.add(line)
      edgeLines.push(line)
    }

    // Layer labels (short English tags — bilingual UI lives in freebar)
    const labelSprites: THREE.Sprite[] = []
    const labelText: Record<LayerId, string> = {
      input: 'Input',
      conv1: 'Conv1',
      pool1: 'Pool1',
      conv2: 'Conv2',
      pool2: 'Pool2',
      fc: 'Softmax',
    }
    const makeLabel = (text: string, x: number) => {
      const c = document.createElement('canvas')
      c.width = 256
      c.height = 64
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, 256, 64)
      ctx.fillStyle = 'rgba(200, 220, 255, 0.72)'
      ctx.font = '600 28px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(text, 128, 40)
      const tex = new THREE.CanvasTexture(c)
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 })
      const spr = new THREE.Sprite(mat)
      spr.position.set(x, 78, 0)
      spr.scale.set(42, 10.5, 1)
      scene.add(spr)
      labelSprites.push(spr)
      return spr
    }
    for (const cfg of LAYER_META) {
      makeLabel(labelText[cfg.id], cfg.x)
    }

    const raycaster = new THREE.Raycaster()
    const pointerNdc = new THREE.Vector2()

    const resize = () => {
      const w = host.clientWidth || window.innerWidth
      const h = host.clientHeight || window.innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    resize()

    let raf = 0
    let last = performance.now()
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const api = sceneApi.current

      // Smooth fly-to when inspecting a layer
      if (api.camGoal && api.controls) {
        const ease = 1 - Math.exp(-dt * 5.2)
        camera.position.lerp(api.camGoal.position, ease)
        api.controls.target.lerp(api.camGoal.target, ease)
        if (
          camera.position.distanceTo(api.camGoal.position) < 0.8 &&
          api.controls.target.distanceTo(api.camGoal.target) < 0.4
        ) {
          camera.position.copy(api.camGoal.position)
          api.controls.target.copy(api.camGoal.target)
          api.camGoal = null
        }
      } else if (!reducedMotion && api.autoOrbit && api.controls) {
        // Gentle spin around current target (overview only feels natural)
        api.controls.autoRotate = true
        api.controls.autoRotateSpeed = 0.55
      }
      if (api.controls) {
        if (!api.autoOrbit || api.camGoal) api.controls.autoRotate = false
        api.controls.update()
      }

      const pulse = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(now * 0.0012)
      paintActivations(
        api.layers as Record<LayerId, LayerMesh>,
        api.acts,
        api.reveal,
        api.opacity,
        pulse,
        api.focus,
      )
      if (api.demoRig) updateDemoRig(api.demoRig, api, now, reducedMotion)

      // Edge opacity follows reveal of both ends
      for (let i = 0; i < edgePairs.length; i += 1) {
        const [from, to] = edgePairs[i]
        const vis = Math.min(api.reveal[from], api.reveal[to]) * api.opacity
        edgeLines[i].visible = vis > 0.05
        ;(edgeLines[i].material as THREE.LineBasicMaterial).opacity = 0.22 * vis
      }

      for (const spr of labelSprites) {
        spr.material.opacity = 0.85 * api.opacity
      }

      try {
        renderer.render(scene, camera)
      } catch {
        /* frame errors should not kill the loop */
      }
    }
    raf = requestAnimationFrame(animate)

    const pickLayerAt = (clientX: number, clientY: number): LayerId | null => {
      const rect = canvas.getBoundingClientRect()
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointerNdc, camera)
      const meshes = ALL_LAYERS.map((id) => layers[id]?.mesh).filter(Boolean) as THREE.InstancedMesh[]
      const hits = raycaster.intersectObjects(meshes, false)
      if (!hits.length) return null
      const layerId = hits[0].object.userData.layerId as LayerId | undefined
      return layerId ?? null
    }

    // Expose pick for pointer handlers outside this effect via sceneApi
    ;(sceneApi.current as { pickLayerAt?: typeof pickLayerAt }).pickLayerAt = pickLayerAt

    const ro = new ResizeObserver(resize)
    ro.observe(host)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      const disposedGeo = new Set<THREE.BufferGeometry>()
      for (const cfg of LAYER_META) {
        const layer = layers[cfg.id]
        if (!layer) continue
        if (!disposedGeo.has(layer.mesh.geometry)) {
          disposedGeo.add(layer.mesh.geometry)
          layer.mesh.geometry.dispose()
        }
        ;(layer.mesh.material as THREE.Material).dispose()
      }
      floorGeo.dispose()
      floorMat.dispose()
      edgeMat.dispose()
      for (const line of edgeLines) line.geometry.dispose()
      for (const spr of labelSprites) {
        spr.material.map?.dispose()
        spr.material.dispose()
      }
      const demoGeometries = new Set<THREE.BufferGeometry>()
      const demoMaterials = new Set<THREE.Material>()
      demoRig.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
        demoGeometries.add(object.geometry)
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) demoMaterials.add(material)
      })
      for (const geometry of demoGeometries) geometry.dispose()
      for (const material of demoMaterials) material.dispose()
      renderer.dispose()
      sceneApi.current.camera = null
      sceneApi.current.controls = null
      sceneApi.current.layers = {}
      sceneApi.current.demoRig = null
      delete (sceneApi.current as { pickLayerAt?: unknown }).pickLayerAt
    }
  }, [reducedMotion])

  // Sync opacity / focus / layer visibility into scene
  useEffect(() => {
    sceneApi.current.opacity = opacity
  }, [opacity])

  useEffect(() => {
    sceneApi.current.focus = focusLayer
  }, [focusLayer])

  // Free mode: layer chips control visibility (story beats own reveal)
  useEffect(() => {
    if (storyMode) return
    const next = Object.fromEntries(ALL_LAYERS.map((id) => [id, layerOn[id] ? 1 : 0])) as Record<
      LayerId,
      number
    >
    sceneApi.current.reveal = next
  }, [layerOn, storyMode])

  const flyToLayer = useCallback((id: LayerId | 'overview', opts?: { focus?: boolean }) => {
    const view = LAYER_VIEW[id]
    const api = sceneApi.current
    api.autoOrbit = id === 'overview'
    api.camGoal = {
      target: view.target.clone(),
      position: view.position.clone(),
    }
    if (id === 'overview') {
      api.focus = null
      setFocusLayer(null)
      setInspectId('overview')
    } else {
      if (opts?.focus !== false) {
        api.focus = id
        setFocusLayer(id)
      }
      setInspectId(id)
      // Ensure inspected layer is visible
      setLayerOn((prev) => ({ ...prev, [id]: true }))
    }
  }, [])

  // Story beats drive reveal + camera + demo digit
  useEffect(() => {
    const api = sceneApi.current
    api.autoOrbit = beat === 0

    const setReveal = (map: Partial<Record<LayerId, number>>) => {
      const next = { ...api.reveal }
      for (const id of ALL_LAYERS) {
        if (map[id] !== undefined) next[id] = map[id]!
      }
      api.reveal = next
    }
    const setDemo = (mode: CnnDemoMode) => {
      api.demoMode = mode
      api.demoStartedAt = performance.now()
    }

    if (beat === 0) {
      setDemo('overview')
      setReveal({ input: 1, conv1: 0.55, pool1: 0.4, conv2: 0.35, pool2: 0.3, fc: 0.55 })
      api.acts = emptyActivations()
      api.focus = null
      setFocusLayer(null)
      setInspectId('overview')
      flyToLayer('overview')
      setPrediction(null)
      setProbs(Array.from({ length: 10 }, () => 0.1))
    } else if (beat === 1) {
      setDemo('input')
      setReveal({ input: 1, conv1: 0.35, pool1: 0.2, conv2: 0.15, pool2: 0.1, fc: 0.2 })
      flyToLayer('input')
      loadSample(3, false)
    } else if (beat === 2) {
      setDemo('conv')
      setReveal({ input: 1, conv1: 1, pool1: 0.35, conv2: 0.2, pool2: 0.15, fc: 0.25 })
      flyToLayer('conv1')
      if (!api.acts || topPrediction(api.acts.fc).prob < 0.15) loadSample(3, false)
    } else if (beat === 3) {
      setDemo('feature')
      setReveal({ input: 0.55, conv1: 1, pool1: 0.45, conv2: 0.2, pool2: 0.15, fc: 0.25 })
      flyToLayer('conv1')
      if (!api.acts || topPrediction(api.acts.fc).prob < 0.15) loadSample(3, false)
    } else if (beat === 4) {
      setDemo('pool')
      setReveal({ input: 0.25, conv1: 1, pool1: 1, conv2: 0.25, pool2: 0.15, fc: 0.2 })
      flyToLayer('pool1')
      if (!api.acts || topPrediction(api.acts.fc).prob < 0.15) loadSample(3, false)
    } else if (beat === 5) {
      setDemo('conv2')
      setReveal({ input: 0.18, conv1: 0.45, pool1: 1, conv2: 1, pool2: 0.35, fc: 0.2 })
      flyToLayer('conv2')
      if (!api.acts || topPrediction(api.acts.fc).prob < 0.15) loadSample(3, false)
    } else if (beat === 6) {
      setDemo('output')
      setReveal({ input: 1, conv1: 1, pool1: 1, conv2: 1, pool2: 1, fc: 1 })
      flyToLayer('fc')
      if (!api.acts || topPrediction(api.acts.fc).prob < 0.15) loadSample(3, false)
      if (api.acts) {
        const top = topPrediction(api.acts.fc)
        setPrediction(top)
        setProbs([...api.acts.fc])
      }
    }
  }, [beat, loadSample, flyToLayer])

  // Click a node (without dragging) → fly to that layer; OrbitControls handles orbit/pan/zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e: PointerEvent) => {
      if (storyMode) return
      sceneApi.current.pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() }
      sceneApi.current.autoOrbit = false
    }
    const onUp = (e: PointerEvent) => {
      if (storyMode) return
      const down = sceneApi.current.pointerDown
      sceneApi.current.pointerDown = null
      if (!down) return
      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      const dt = performance.now() - down.t
      // Tap / short click without drag → inspect layer under cursor
      if (dist < 8 && dt < 450) {
        const pick = (sceneApi.current as { pickLayerAt?: (x: number, y: number) => LayerId | null }).pickLayerAt
        const layerId = pick?.(e.clientX, e.clientY) ?? null
        if (layerId) {
          flyToLayer(layerId)
          controls.registerInteraction()
          setHoverInfo(null)
        }
      }
    }
    const onMove = (e: PointerEvent) => {
      if (storyMode || sceneApi.current.pointerDown) return
      const pick = (sceneApi.current as { pickLayerAt?: (x: number, y: number) => LayerId | null }).pickLayerAt
      const layerId = pick?.(e.clientX, e.clientY) ?? null
      if (!layerId) {
        if (sceneApi.current.hoverInfo) {
          sceneApi.current.hoverInfo = null
          setHoverInfo(null)
        }
        return
      }
      const label = layerLabelStatic(layerId)
      const next = label
      if (sceneApi.current.hoverInfo !== next) {
        sceneApi.current.hoverInfo = next
        setHoverInfo(next)
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', () => {
      sceneApi.current.hoverInfo = null
      setHoverInfo(null)
    })
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointermove', onMove)
    }
  }, [controls, storyMode, flyToLayer])

  // Init draw canvas; seed a demo digit so free mode is not empty
  useEffect(() => {
    if (storyMode || !weights) return
    const draw = drawRef.current
    if (!draw) return
    draw.width = DRAW_CSS
    draw.height = DRAW_CSS
    const ctx = draw.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, DRAW_CSS, DRAW_CSS)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#fff'
    // Prefer existing activations; otherwise load sample 3
    if (!sceneApi.current.acts || topPrediction(sceneApi.current.acts.fc).prob < 0.15) {
      loadSample(3, false)
    } else if (activeSample !== null) {
      paintInputOntoDraw(draw, normalizeDigit(getSampleDigit(activeSample)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when free+weights ready
  }, [storyMode, weights])

  const drawing = useRef(false)
  const lastDraw = useRef({ x: 0, y: 0 })

  const pointerToDraw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = e.currentTarget.width / rect.width
    const sy = e.currentTarget.height / rect.height
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    }
  }

  const onDrawDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const draw = drawRef.current
    if (!draw) return
    drawing.current = true
    const p = pointerToDraw(e)
    lastDraw.current = p
    const ctx = draw.getContext('2d')!
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    draw.setPointerCapture(e.pointerId)
    setActiveSample(null)
    controls.registerInteraction()
  }

  const onDrawMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !drawRef.current) return
    const draw = drawRef.current
    const ctx = draw.getContext('2d')!
    const p = pointerToDraw(e)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(lastDraw.current.x, lastDraw.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastDraw.current = p
  }

  const onDrawUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !drawRef.current) return
    drawing.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const pixels = canvasToInput(drawRef.current)
    runForward(pixels)
  }

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(6)
    sceneApi.current.reveal = Object.fromEntries(ALL_LAYERS.map((id) => [id, 1])) as Record<LayerId, number>
    setLayerOn(Object.fromEntries(ALL_LAYERS.map((id) => [id, true])) as Record<LayerId, boolean>)
    flyToLayer('overview')
    if (!sceneApi.current.acts || topPrediction(sceneApi.current.acts.fc).prob < 0.15) {
      loadSample(3, false)
    }
  }, [enterFree, loadSample, flyToLayer])

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: tx('手写的「3」，怎么被认出来？'),
        body: tx('先别急着找规则：一束信号会沿着这条网络穿过，最后只留下一个猜测。'),
        durationMs: 5200,
        action: () => setBeat(0),
      },
      {
        title: tx('先把手写字变成像素'),
        body: tx('这张 28×28 的黑白小网格只记录“哪里有墨水”。它是网络看到的第一眼。'),
        durationMs: 5600,
        action: () => setBeat(1),
      },
      {
        title: tx('5×5 小窗开始扫描'),
        body: tx('小窗每次只看 25 个像素，像一枚会滑动的探针；这一路专门寻找边缘和弯钩。'),
        durationMs: 6200,
        action: () => setBeat(2),
      },
      {
        title: tx('一片特征图留下线索'),
        body: tx('每扫过一格，网络就写下一格响应。亮的地方，表示这里更像它正在寻找的笔画。'),
        durationMs: 5200,
        action: () => setBeat(3),
      },
      {
        title: tx('四个响应压成一个'),
        body: tx('2×2 小块同时比较，只把最高的那一个传给下一层；位置稍微挪动，线索仍能留下。'),
        durationMs: 6000,
        action: () => setBeat(4),
      },
      {
        title: tx('更深一层拼出部件'),
        body: tx('第二个 5×5 小窗不再盯着原始像素，而是在上一层的线索上寻找更大的局部形状。'),
        durationMs: 6000,
        action: () => setBeat(5),
      },
      {
        title: tx('最后才轮到数字投票'),
        body: tx('线索一路缩小，十个输出方块分别给 0–9 投票。最亮的那个，是这次猜测。'),
        durationMs: 5600,
        action: () => setBeat(6),
      },
    ],
    [tx],
  )

  const replay = () => {
    enterStory()
    setBeat(0)
    replayGuide('cnn-vision')
    controls.registerInteraction()
  }

  /** Primary: fly camera to layer. Shift/Alt+click: toggle visibility only. */
  const onLayerChip = (id: LayerId, e: ReactMouseEvent) => {
    controls.registerInteraction()
    if (e.shiftKey || e.altKey || e.metaKey) {
      setLayerOn((prev) => ({ ...prev, [id]: !prev[id] }))
      return
    }
    // If already inspecting this layer, second click returns to overview
    if (inspectId === id) {
      flyToLayer('overview')
      return
    }
    flyToLayer(id)
  }

  const layerLabel = (id: LayerId) => {
    switch (id) {
      case 'input':
        return tx('输入')
      case 'conv1':
        return tx('卷积1')
      case 'pool1':
        return tx('池化1')
      case 'conv2':
        return tx('卷积2')
      case 'pool2':
        return tx('池化2')
      case 'fc':
        return tx('输出')
      default:
        return id
    }
  }

  const plaqueLine =
    beat <= 1
      ? tx('手写数字怎样被拆成特征？')
      : beat === 2
        ? tx('扫描窗口正在找线索')
        : beat === 3
          ? tx('一片特征图留下线索')
          : beat === 4
            ? tx('四个响应压成一个最大值')
            : beat === 5
              ? tx('从线索拼出部件')
        : prediction
          ? tx('网络投出了最高票')
          : tx('在下方画板写一个数字')

  const processMark =
    beat === 2
      ? { metric: tx('5×5'), title: tx('卷积窗口'), detail: tx('扫描输入 → 特征图'), position: 'bottom-right' }
      : beat === 3
        ? { metric: tx('响应值'), title: tx('特征图'), detail: tx('每格都是一次线索'), position: 'top-right' }
        : beat === 4
          ? { metric: tx('2×2'), title: tx('最大响应'), detail: tx('四个 → 一个'), position: 'bottom-right' }
          : beat === 5
            ? { metric: tx('5×5'), title: tx('第二个卷积窗口'), detail: tx('线索 → 部件'), position: 'top-left' }
            : null

  return (
    <div ref={hostRef} className={`oss-experience cv-experience cv-beat-${beat}`}>
      <canvas
        ref={canvasRef}
        className="cv-canvas"
        aria-label={tx('可自由旋转、平移、缩放的卷积神经网络三维可视化。单击某一层可飞近查看。')}
      />

      {!weights && !loadError && (
        <div className="cv-loading" data-experience-overlay="true">
          {tx('正在唤醒卷积网络…')}
        </div>
      )}

      {storyMode && processMark && (
        <div
          className="cv-process-mark"
          data-cv-mark-position={processMark.position}
          data-experience-overlay="true"
        >
          <span>{processMark.metric}</span>
          <div>
            <strong>{processMark.title}</strong>
            <small>{processMark.detail}</small>
          </div>
        </div>
      )}
      {loadError && (
        <div className="cv-loading" data-experience-overlay="true">
          {tx('模型权重加载失败')}
        </div>
      )}

      {!storyMode && (
        <header className="cv-plaque" data-experience-overlay="true">
          <span>{tx('卷积神经网络')}</span>
          <h1>{tx('手写数字的旅程')}</h1>
          <p>{plaqueLine}</p>
        </header>
      )}

      {!storyMode && (
        <div className="cv-readout" data-experience-overlay="true" aria-live="polite">
          <div>
            <span>{tx('预测')}</span>
            <strong>{prediction ? prediction.digit : '—'}</strong>
          </div>
          <div>
            <span>{tx('置信度')}</span>
            <strong>{prediction ? `${Math.round(prediction.prob * 100)}%` : '—'}</strong>
          </div>
          {(hoverInfo || (inspectId && inspectId !== 'overview')) && (
            <div className="cv-inspect-tag">
              <span>{tx('正在看')}</span>
              <strong>
                {hoverInfo ??
                  (inspectId && inspectId !== 'overview' ? layerLabelStatic(inspectId) : '')}
              </strong>
            </div>
          )}
          <div className="cv-prob-bars" aria-hidden>
            {probs.map((p, i) => (
              <div
                key={i}
                className={`cv-prob-bar${prediction && prediction.digit === i ? ' is-top' : ''}`}
                title={`${i}`}
              >
                <i style={{ height: `${Math.max(4, p * 100)}%` }} />
                <em>{i}</em>
              </div>
            ))}
          </div>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="cv-freebar"
          mainClassName="cv-freebar-main"
          ariaLabel={tx('自由探索')}
          primaryControlBudget={1}
          secondaryDefault="closed"
          secondary={(
            <div className="cv-tray">
              <div className="cv-tray-head">
                <FreebarTabs
                  activeId={toolTab}
                  ariaLabel={tx('次级工具')}
                  className="cv-tool-tabs"
                  onChange={setToolTab}
                  tabs={[
                    { id: 'layers', label: tx('图层') },
                    { id: 'draw', label: tx('手写') },
                  ]}
                />
                <div className="cv-tray-tools">
                  <button type="button" className="experience-freebar-story" onClick={replay} aria-label={tx('重播故事')}>
                    <FilmStrip weight="fill" aria-hidden="true" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>
              {toolTab === 'layers' ? (
                <>
                  <div className="cv-chip-rail cv-layers experience-freebar-chips" role="group" aria-label={tx('图层')}>
                    <button
                      type="button"
                      className={`cv-layer-chip cv-layer-overview${inspectId === 'overview' ? ' is-inspect' : ''}`}
                      onClick={() => {
                        controls.registerInteraction()
                        flyToLayer('overview')
                      }}
                    >
                      {tx('全景')}
                    </button>
                    {ALL_LAYERS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`cv-layer-chip${inspectId === id ? ' is-inspect' : ''}${layerOn[id] ? ' is-active' : ' is-off'}`}
                        onClick={(e) => onLayerChip(id, e)}
                        aria-pressed={inspectId === id}
                        title={tx('单击飞近查看 · Shift+单击隐藏/显示')}
                      >
                        {layerLabel(id)}
                      </button>
                    ))}
                  </div>
                  <label className="cv-opacity experience-freebar-field">
                    <span>{tx('透明')}</span>
                    <strong>{Math.round(opacity * 100)}</strong>
                    <input
                      type="range"
                      min={0.25}
                      max={1}
                      step={0.01}
                      value={opacity}
                      aria-label={tx('透明度')}
                      onChange={(e) => {
                        controls.registerInteraction()
                        setOpacity(Number(e.target.value))
                      }}
                    />
                  </label>
                </>
              ) : (
                <div className="cv-draw-wrap">
                  <canvas
                    id="cv-draw"
                    ref={drawRef}
                    className="cv-draw"
                    width={DRAW_CSS}
                    height={DRAW_CSS}
                    aria-label={tx('手写数字画板')}
                    onPointerDown={onDrawDown}
                    onPointerMove={onDrawMove}
                    onPointerUp={onDrawUp}
                    onPointerCancel={onDrawUp}
                  />
                  <button
                    type="button"
                    className="experience-freebar-reset cv-clear-draw"
                    onClick={() => {
                      controls.registerInteraction()
                      clearDraw()
                    }}
                    aria-label={tx('清空')}
                  >
                    <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                    <span>{tx('清空')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        >
          <div className="cv-samples experience-freebar-rail" role="group" aria-label={tx('示例数字')}>
            {Array.from({ length: 10 }, (_, d) => (
              <button
                key={d}
                type="button"
                className={`cv-chip${activeSample === d ? ' is-active' : ''}${d === 3 ? ' cv-chip-demo' : ''}`}
                onClick={() => loadSample(d)}
                aria-pressed={activeSample === d}
              >
                {d}
              </button>
            ))}
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="cnn-vision"
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'caption' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'annotation' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'narrow', treatment: 'monumental' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', width: 'normal', treatment: 'caption' },
          { position: 'center-right', mobilePosition: 'bottom-center', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'annotation' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'bottom-center', mobilePosition: 'bottom-center', motion: 'scale', tone: 'light', width: 'wide', treatment: 'editorial' },
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        onExit={returnToFree}
      />

      {!storyMode && (
        <GhostHint
          worldId="cnn-vision"
          gesture={{
            type: 'tap',
            target: '.cv-chip-demo',
            label: tx('点数字看网络如何点亮；展开可飞近各层'),
          }}
        />
      )}
    </div>
  )
}
