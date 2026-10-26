import * as T from 'three'

import {DISPLAY_GENERATIONS, sampleTimeline} from './model'

type Atom = {
  depth: number
  position: T.Vector3
  direction: T.Vector3
  splitAxis: T.Vector3
  radius: number
  splitAt: number
  phase: number
}

type NeutronPath = {
  from: T.Vector3
  to: T.Vector3
  start: number
  end: number
}

const clamp = T.MathUtils.clamp
const smooth = (a: number, b: number, x: number) => T.MathUtils.smoothstep(x, a, b)
const MICRO_SCALE = 0.9
const CONTEXT_NUCLEI = 3_200

export function getMicroFraming(time: number) {
  const generation = sampleTimeline(time).generation
  const pullback = smooth(1, 11, generation)
  const distance = T.MathUtils.lerp(5.6, 13.4, pullback)
  return {
    position: [0.2, -0.3, distance] as const,
    target: [0.2, -0.3, 0] as const,
    frontRadius: generation < 1 ? 0 : MICRO_SCALE * (0.45 + clamp(generation - 1, 0, 11) * 0.265),
  }
}

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** Abstract branching layout only. All lengths here are drawing coordinates. */
function makeTree() {
  const random = seeded(0x6e75636c)
  const atoms: Atom[] = []
  const neutrons: NeutronPath[] = []
  const count = 2 ** DISPLAY_GENERATIONS - 1
  const cells: Array<{phi0: number, phi1: number, z0: number, z1: number}> = []
  const orientation = new T.Euler(0.12, 0.24, -0.16)

  for (let i = 0; i < count; i += 1) {
    const depth = Math.floor(Math.log2(i + 1))
    const parentIndex = Math.floor((i - 1) / 2)
    const parent = atoms[parentIndex]
    const cell = {...(cells[parentIndex] ?? {phi0: -Math.PI / 2, phi1: Math.PI * 1.5, z0: -1, z1: 1})}
    if (parent) {
      // Equal-area spherical cells keep each new pair in its parent's outward sector.
      if (depth % 2) {
        const middle = (cell.phi0 + cell.phi1) / 2
        if (i % 2) cell.phi1 = middle
        else cell.phi0 = middle
      } else {
        const middle = (cell.z0 + cell.z1) / 2
        if (i % 2) cell.z1 = middle
        else cell.z0 = middle
      }
    }
    cells.push(cell)
    const phase = random() * Math.PI * 2
    const phi = (cell.phi0 + cell.phi1) / 2 + (random() - 0.5) * (cell.phi1 - cell.phi0) * 0.24
    const z = (cell.z0 + cell.z1) / 2 + (random() - 0.5) * (cell.z1 - cell.z0) * 0.2
    const belt = Math.sqrt(1 - z * z)
    const direction = new T.Vector3(Math.cos(phi) * belt, Math.sin(phi) * belt, z).applyEuler(orientation)
    const radialDistance = depth === 0 ? 0 : 0.45 + depth * 0.265 + (random() - 0.5) * 0.035
    const position = direction.clone().multiplyScalar(radialDistance)
    const splitAxis = new T.Vector3(Math.cos(phase), Math.sin(phase), 0.45).cross(direction).normalize()
    const atom: Atom = {
      depth,
      position,
      direction,
      splitAxis,
      radius: depth === 0 ? 0.18 : 0.055 + Math.exp(-depth * 0.3) * 0.04,
      splitAt: depth + 0.96 + random() * 0.07,
      phase,
    }
    atoms.push(atom)
    neutrons.push({
      from: parent?.position ?? new T.Vector3(-1.15, 0.4, 0.22),
      to: position,
      start: parent?.splitAt ?? 0,
      end: atom.splitAt,
    })
  }

  // Two branches continue. An occasional third dot escapes the drawn tree.
  atoms.forEach((atom, i) => {
    const outgoing = atom.depth === DISPLAY_GENERATIONS - 1 ? 2 + (i % 2) : i % 2
    for (let n = 0; n < outgoing; n += 1) {
      const angle = atom.phase + (n + 1) * 2.13
      const offset = new T.Vector3(Math.cos(angle), Math.sin(angle), (random() - 0.5) * 0.8)
        .addScaledVector(atom.direction, 1.4).normalize()
      neutrons.push({
        from: atom.position,
        to: atom.position.clone().addScaledVector(offset, 0.7 + random() * 0.5),
        start: atom.splitAt,
        end: atom.splitAt + 0.66 + random() * 0.28,
      })
    }
  })

  return {atoms, neutrons}
}

function nucleusGeometry(segments = 64, rings = 32) {
  const geometry = new T.SphereGeometry(1, segments, rings)
  const positions = geometry.getAttribute('position')
  const p = new T.Vector3()
  for (let i = 0; i < positions.count; i += 1) {
    p.fromBufferAttribute(positions, i)
    const ripple = 1 + 0.055 * Math.sin(p.x * 4.3 + p.y * 2.1) * Math.sin(p.z * 5.1 - p.y * 3.1)
      + 0.018 * Math.sin(p.y * 6.7 + p.x * 3.1)
    p.multiplyScalar(ripple)
    positions.setXYZ(i, p.x, p.y, p.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function luminousPoints(capacity: number, soft = false) {
  const geometry = new T.BufferGeometry()
  const positions = new Float32Array(capacity * 3)
  const colors = new Float32Array(capacity * 3)
  const sizes = new Float32Array(capacity)
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage))
  geometry.setAttribute('glowColor', new T.BufferAttribute(colors, 3).setUsage(T.DynamicDrawUsage))
  geometry.setAttribute('glowSize', new T.BufferAttribute(sizes, 1).setUsage(T.DynamicDrawUsage))
  geometry.setDrawRange(0, 0)
  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: {softness: {value: soft ? 1 : 0}, fade: {value: 1}, pointScale: {value: 1}},
    vertexShader: `
      attribute vec3 glowColor;
      attribute float glowSize;
      varying vec3 vColor;
      uniform float pointScale;
      void main() {
        vColor = glowColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(1100.0 * glowSize / max(0.1, -mv.z), 1.0, 90.0) * pointScale;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float softness;
      uniform float fade;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float halo = exp(-5.0 * d * d) * 0.35;
        float core = exp(-35.0 * d * d) * (1.0 - softness);
        gl_FragColor = vec4(vColor, (halo + core) * (1.0 - smoothstep(0.65, 1.0, d)) * fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const mesh = new T.Points(geometry, material)
  mesh.frustumCulled = false
  return {mesh, geometry, material, positions, colors, sizes}
}

function heatField() {
  const geometry = new T.PlaneGeometry(36, 24)
  const material = new T.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      generation: {value: 0},
      energy: {value: 0},
      transition: {value: 0},
      whiteout: {value: 0},
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float generation;
      uniform float energy;
      uniform float transition;
      uniform float whiteout;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
          mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y);
      }
      float field(vec2 p) {
        float result = 0.0, amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          result += noise(p) * amplitude;
          p = mat2(1.8, -0.6, 0.6, 1.8) * p + 3.7;
          amplitude *= 0.5;
        }
        return result;
      }
      vec3 blackbody(float x) {
        vec3 c0 = vec3(0.043, 0.003, 0.0);
        vec3 c1 = vec3(1.0, 0.102, 0.014);
        vec3 c2 = vec3(1.0, 0.631, 0.254);
        vec3 c3 = vec3(1.0);
        return x < 0.33 ? mix(c0, c1, x / 0.33)
          : x < 0.7 ? mix(c1, c2, (x - 0.33) / 0.37)
          : mix(c2, c3, (x - 0.7) / 0.3);
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(1.5, 1.0);
        float texture = field(p * 13.0 + vec2(generation * 0.007, -generation * 0.003));
        float veil = exp(-dot(p, p) * 9.0);
        vec3 bg = vec3(0.8148, 0.8469, 0.8632);
        vec3 dimField = vec3(0.005, 0.009, 0.014) * veil * (0.4 + texture) * transition;
        vec3 hot = blackbody(clamp(energy * 1.2, 0.0, 1.0));
        vec3 radiance = hot * energy * 3.4 * mix(0.6, 1.15, texture) * mix(veil, 1.0, energy);
        vec3 color = mix(bg + dimField + radiance, vec3(3.0), pow(whiteout, 3.0));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const mesh = new T.Mesh(geometry, material)
  mesh.position.z = -8
  mesh.renderOrder = -20
  return {mesh, geometry, material}
}

/** Fixed-seed, reversible microscopic illustration. `time` is chain elapsed ns. */
export function createMicroScene() {
  const group = new T.Group()
  group.name = 'Abstract fission microview'
  const {atoms, neutrons} = makeTree()
  const heroGeometry = nucleusGeometry()
  const denseGeometry = nucleusGeometry(20, 14)
  const contextGeometry = nucleusGeometry(12, 8)
  const nucleusMaterial = new T.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.62, metalness: 0.3,
    envMapIntensity: 0.16,
  })
  const fragmentMaterial = new T.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.48, metalness: 0.2,
    emissive: '#ffffff', emissiveIntensity: 0.65, envMapIntensity: 0.2,
  })
  fragmentMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif',
    )
  }
  const backgroundMaterial = new T.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.78, metalness: 0.2, envMapIntensity: 0.08,
    transparent: true, opacity: 0.2, depthWrite: false,
  })
  const nuclei = new T.InstancedMesh(denseGeometry, nucleusMaterial, atoms.length)
  const focusNuclei = new T.InstancedMesh(heroGeometry, nucleusMaterial, 7)
  const fragments = new T.InstancedMesh(denseGeometry, fragmentMaterial, atoms.length * 2)
  nuclei.name = 'micro-nuclei'
  focusNuclei.name = 'micro-focus-nuclei'
  fragments.name = 'micro-fragments'
  for (const mesh of [nuclei, focusNuclei, fragments]) {
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    mesh.setColorAt(0, new T.Color())
    mesh.frustumCulled = false
  }
  const backdrop = new T.InstancedMesh(contextGeometry, backgroundMaterial, CONTEXT_NUCLEI)
  backdrop.name = 'micro-background-nuclei'
  backdrop.frustumCulled = false
  const glow = luminousPoints(neutrons.length + atoms.length * 2)
  const bokeh = luminousPoints(480, true)
  const field = heatField()
  glow.mesh.name = 'micro-neutron-glow'
  bokeh.mesh.name = 'micro-depth-bokeh'
  field.mesh.name = 'micro-heat-field'

  const tailPositions = new Float32Array(neutrons.length * 6)
  const tailColors = new Float32Array(neutrons.length * 6)
  const tailGeometry = new T.BufferGeometry()
  tailGeometry.setAttribute('position', new T.BufferAttribute(tailPositions, 3).setUsage(T.DynamicDrawUsage))
  tailGeometry.setAttribute('color', new T.BufferAttribute(tailColors, 3).setUsage(T.DynamicDrawUsage))
  const tailMaterial = new T.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false,
    blending: T.AdditiveBlending, toneMapped: false,
  })
  const tails = new T.LineSegments(tailGeometry, tailMaterial)
  tails.name = 'micro-neutron-trails'
  tails.frustumCulled = false
  for (const actor of [backdrop, nuclei, focusNuclei, fragments, tails, glow.mesh, bokeh.mesh]) {
    actor.scale.setScalar(MICRO_SCALE)
  }
  group.add(field.mesh, backdrop, nuclei, focusNuclei, fragments, tails, glow.mesh, bokeh.mesh)

  const dummy = new T.Object3D()
  const p = new T.Vector3()
  const tail = new T.Vector3()
  const color = new T.Color()
  const bronze = new T.Color('#587a90')
  const darkBronze = bronze.clone()
  const cooledBronze = new T.Color('#617682')
  const neutronColor = new T.Color('#426c86')
  const flashWhite = new T.Color('#fff3dd')
  const flashAmber = new T.Color('#be7162')
  const backdropRandom = seeded(0x6d696372)
  let bokehCount = 0
  for (let i = 0; i < backdrop.count; i += 1) {
    do {
      p.set((backdropRandom() - 0.5) * 10, (backdropRandom() - 0.5) * 8, -5.2 + backdropRandom() * 7.4)
    } while (p.length() < 1.25 || (p.z > 0.5 && Math.hypot(p.x, p.y) < 0.9))
    const radius = 0.025 + backdropRandom() * 0.025
    dummy.position.copy(p)
    dummy.rotation.set(backdropRandom(), backdropRandom(), backdropRandom())
    dummy.scale.setScalar(radius)
    dummy.updateMatrix()
    backdrop.setMatrixAt(i, dummy.matrix)
    const depthFade = 0.07 + 0.13 * smooth(-5.2, 0, p.z)
    backdrop.setColorAt(i, color.copy(darkBronze).multiplyScalar(depthFade))
    if (bokehCount < 480 && (p.z < -2 || (p.z > 1 && Math.hypot(p.x, p.y) > 2.1))) {
      p.toArray(bokeh.positions, bokehCount * 3)
      color.copy(bronze).multiplyScalar(p.z > 1 ? 0.16 : 0.07).toArray(bokeh.colors, bokehCount * 3)
      bokeh.sizes[bokehCount] = (p.z > 1 ? 0.42 : 0.25) + backdropRandom() * 0.24
      bokehCount += 1
    }
  }
  backdrop.instanceMatrix.needsUpdate = true
  if (backdrop.instanceColor) backdrop.instanceColor.needsUpdate = true
  bokeh.geometry.setDrawRange(0, bokehCount)

  function writeGlow(index: number, position: T.Vector3, shade: T.Color, size: number) {
    position.toArray(glow.positions, index * 3)
    shade.toArray(glow.colors, index * 3)
    glow.sizes[index] = size
  }

  function update(time: number) {
    const frame = sampleTimeline(time)
    const generation = frame.generation
    const handoff = smooth(DISPLAY_GENERATIONS, DISPLAY_GENERATIONS + 2, generation)
    const visibility = 1 - handoff
    let nucleusCount = 0
    let focusCount = 0
    let fragmentCount = 0
    let glowCount = 0
    let tailCount = 0

    if (visibility > 0) {
      for (let i = 0; i < atoms.length; i += 1) {
        const atom = atoms[i]
        const age = generation - atom.splitAt
        if (age < 0) {
          const awaitingImpact = 1 - smooth(0, 1.3, -age)
          const breathe = 1 + Math.sin(generation * 1.1 + atom.phase) * 0.018
          dummy.position.copy(atom.position)
          dummy.rotation.set(atom.phase * 0.3, atom.phase + generation * 0.025, atom.phase * 0.6)
          const focusSize = atom.depth === 0 ? 1 : 0.58 + awaitingImpact * 0.42
          dummy.scale.setScalar(atom.radius * breathe * visibility * focusSize)
          dummy.updateMatrix()
          const brightness = (atom.depth === 0 ? 1.4 : 0.14 + awaitingImpact * 1.05) * visibility
          color.copy(bronze).multiplyScalar(brightness)
          if (i < 7) {
            focusNuclei.setMatrixAt(focusCount, dummy.matrix)
            focusNuclei.setColorAt(focusCount++, color)
          } else {
            nuclei.setMatrixAt(nucleusCount, dummy.matrix)
            nuclei.setColorAt(nucleusCount++, color)
          }
        }
        if (age >= 0 && age < 4) {
          const fade = 1 - smooth(2.4, 4, age)
          const cooling = smooth(0.12, 3.2, age)
          for (let side = -1; side <= 1; side += 2) {
            dummy.position.copy(atom.position)
              .addScaledVector(atom.splitAxis, side * (atom.radius * 0.62 + age * 0.085))
              .addScaledVector(atom.direction, age * 0.018)
            dummy.rotation.set(atom.phase + age * side * 0.5, atom.phase * 0.2, age * 0.4 + atom.phase)
            dummy.scale.set(atom.radius * 0.84, atom.radius * 0.58, atom.radius * 0.7).multiplyScalar(fade * visibility)
            dummy.updateMatrix()
            fragments.setMatrixAt(fragmentCount, dummy.matrix)
            color.copy(flashAmber).lerp(cooledBronze, cooling).multiplyScalar((1.15 - cooling * 0.8) * fade * visibility)
            if (age < 0.12) color.lerp(flashWhite, 1 - age / 0.12).multiplyScalar(1.3)
            fragments.setColorAt(fragmentCount++, color)
          }
          if (age < 0.28) {
            color.copy(flashWhite).lerp(flashAmber, age / 0.28).multiplyScalar((1 - age / 0.28) * 3.1 * visibility)
            writeGlow(glowCount++, atom.position, color, (atom.radius * 2.8 + age * 0.16) * visibility)
          } else if (age < 1.8) {
            color.copy(flashAmber).multiplyScalar(0.13 * (1 - age / 1.8) * visibility)
            writeGlow(glowCount++, atom.position, color, atom.radius * 3.1)
          }
        }
      }

      for (const neutron of neutrons) {
        const progress = (generation - neutron.start) / (neutron.end - neutron.start)
        if (progress < 0 || progress >= 1) continue
        p.lerpVectors(neutron.from, neutron.to, progress)
        tail.lerpVectors(neutron.from, neutron.to, Math.max(0, progress - 0.3))
        const fade = visibility * smooth(0, 0.05, progress) * (1 - smooth(0.95, 1, progress))
        color.copy(neutronColor).multiplyScalar(3.0 * fade)
        writeGlow(glowCount++, p, color, 0.065)
        tail.toArray(tailPositions, tailCount * 6)
        p.toArray(tailPositions, tailCount * 6 + 3)
        color.copy(neutronColor).multiplyScalar(0.02 * fade).toArray(tailColors, tailCount * 6)
        color.copy(neutronColor).multiplyScalar(0.95 * fade).toArray(tailColors, tailCount * 6 + 3)
        tailCount += 1
      }
    }

    nuclei.count = nucleusCount
    focusNuclei.count = focusCount
    fragments.count = fragmentCount
    for (const mesh of [nuclei, focusNuclei, fragments]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    glow.geometry.setDrawRange(0, glowCount)
    for (const attribute of Object.values(glow.geometry.attributes)) attribute.needsUpdate = true
    tailGeometry.setDrawRange(0, tailCount * 2)
    tailGeometry.getAttribute('position').needsUpdate = true
    tailGeometry.getAttribute('color').needsUpdate = true
    backdrop.visible = visibility > 0
    bokeh.mesh.visible = visibility > 0
    backgroundMaterial.opacity = visibility * 0.2
    backgroundMaterial.transparent = true
    bokeh.material.uniforms.fade.value = visibility
    const uniforms = field.material.uniforms
    uniforms.generation.value = generation
    uniforms.transition.value = handoff
    uniforms.energy.value = frame.energyFraction
    uniforms.whiteout.value = frame.whiteout
  }

  update(0)
  return {
    group,
    update,
    setPointScale(scale: number) {
      for (const points of [glow, bokeh]) points.material.uniforms.pointScale.value = scale
    },
    dispose() {
      heroGeometry.dispose()
      denseGeometry.dispose()
      contextGeometry.dispose()
      nucleusMaterial.dispose()
      fragmentMaterial.dispose()
      backgroundMaterial.dispose()
      for (const mesh of [nuclei, focusNuclei, fragments, backdrop]) mesh.dispose()
      for (const points of [glow, bokeh]) {
        points.geometry.dispose()
        points.material.dispose()
      }
      field.geometry.dispose()
      field.material.dispose()
      tailGeometry.dispose()
      tailMaterial.dispose()
      group.clear()
    },
  }
}
