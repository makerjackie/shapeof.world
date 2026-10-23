import * as T from 'three'

import {DISPLAY_GENERATIONS, sampleTimeline} from './model'

type Atom = {
  depth: number
  position: T.Vector3
  direction: T.Vector3
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

  for (let i = 0; i < count; i += 1) {
    const depth = Math.floor(Math.log2(i + 1))
    const parent = atoms[Math.floor((i - 1) / 2)]
    const phase = random() * Math.PI * 2
    const direction = new T.Vector3(Math.cos(phase), Math.sin(phase) * 0.72, (random() - 0.5) * 0.8).normalize()
    const position = new T.Vector3()
    if (parent) {
      const branch = i % 2 ? -1 : 1
      const step = 1.04 * 0.88 ** depth
      direction.addScaledVector(parent.direction, branch * 0.7).normalize()
      position.copy(parent.position).addScaledVector(direction, step)
      position.x += branch * step * 0.22
      position.y += Math.sin(i * 2.399963) * step * 0.26
      position.z = clamp(position.z, -1.9, 1.0)
    }
    const atom: Atom = {
      depth,
      position,
      direction,
      radius: Math.max(0.042, 0.31 * 0.82 ** depth),
      splitAt: depth + 0.96 + random() * 0.07,
      phase,
    }
    atoms.push(atom)
    neutrons.push({
      from: parent?.position ?? new T.Vector3(-1.7, 0.64, 0.35),
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
      const offset = new T.Vector3(Math.cos(angle), Math.sin(angle) * 0.75, (random() - 0.5) * 0.8)
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

function luminousPoints(capacity: number) {
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
    vertexShader: `
      attribute vec3 glowColor;
      attribute float glowSize;
      varying vec3 vColor;
      void main() {
        vColor = glowColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(1100.0 * glowSize / max(0.1, -mv.z), 1.0, 90.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float halo = exp(-5.0 * d * d) * 0.35;
        float core = exp(-35.0 * d * d);
        gl_FragColor = vec4(vColor, (halo + core) * (1.0 - smoothstep(0.65, 1.0, d)));
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
        vec3 bg = vec3(0.0030, 0.0030, 0.0035);
        vec3 dimField = vec3(0.05, 0.009, 0.002) * veil * (0.4 + texture) * transition;
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
  const geometry = nucleusGeometry()
  const denseGeometry = nucleusGeometry(24, 16)
  const nucleusMaterial = new T.MeshStandardMaterial({
    color: '#bd8054', roughness: 0.36, metalness: 0.22,
    emissive: '#4a2411', emissiveIntensity: 0.14, envMapIntensity: 0.45,
  })
  const fragmentMaterial = new T.MeshStandardMaterial({
    color: '#d39761', roughness: 0.53, metalness: 0.22,
    emissive: '#b95620', emissiveIntensity: 0.5, envMapIntensity: 0.3,
  })
  const backgroundMaterial = new T.MeshStandardMaterial({
    color: '#382c25', roughness: 0.72, metalness: 0.12,
    emissive: '#2c160c', emissiveIntensity: 0.08, envMapIntensity: 0.15,
  })
  const nuclei = new T.InstancedMesh(geometry, nucleusMaterial, atoms.length)
  const fragments = new T.InstancedMesh(geometry, fragmentMaterial, atoms.length * 2)
  nuclei.name = 'micro-nuclei'
  fragments.name = 'micro-fragments'
  nuclei.instanceMatrix.setUsage(T.DynamicDrawUsage)
  fragments.instanceMatrix.setUsage(T.DynamicDrawUsage)
  nuclei.frustumCulled = false
  fragments.frustumCulled = false
  const backdrop = new T.InstancedMesh(denseGeometry, backgroundMaterial, 36)
  backdrop.name = 'micro-background-nuclei'
  backdrop.frustumCulled = false
  const glow = luminousPoints(neutrons.length + atoms.length)
  const field = heatField()
  glow.mesh.name = 'micro-neutron-glow'
  field.mesh.name = 'micro-heat-field'

  const tailPositions = new Float32Array(neutrons.length * 6)
  const tailColors = new Float32Array(neutrons.length * 6)
  const tailGeometry = new T.BufferGeometry()
  tailGeometry.setAttribute('position', new T.BufferAttribute(tailPositions, 3).setUsage(T.DynamicDrawUsage))
  tailGeometry.setAttribute('color', new T.BufferAttribute(tailColors, 3).setUsage(T.DynamicDrawUsage))
  const tailMaterial = new T.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.65, depthWrite: false,
    blending: T.AdditiveBlending, toneMapped: false,
  })
  const tails = new T.LineSegments(tailGeometry, tailMaterial)
  tails.name = 'micro-neutron-trails'
  tails.frustumCulled = false
  for (const actor of [backdrop, nuclei, fragments, tails, glow.mesh]) {
    actor.scale.setScalar(0.76)
    actor.position.y = 0.25
  }
  group.add(field.mesh, backdrop, nuclei, fragments, tails, glow.mesh)

  const dummy = new T.Object3D()
  const p = new T.Vector3()
  const tail = new T.Vector3()
  const color = new T.Color()
  const neutronColor = new T.Color('#a8e6ff')
  const flashWhite = new T.Color('#fff3dd')
  const flashAmber = new T.Color('#ffa24d')
  const backdropRandom = seeded(0x6d696372)
  for (let i = 0; i < backdrop.count; i += 1) {
    const angle = backdropRandom() * Math.PI * 2
    const radius = 1.5 + backdropRandom() * 4.1
    dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.67, -1.8 - backdropRandom() * 4)
    dummy.rotation.set(backdropRandom(), backdropRandom(), backdropRandom())
    dummy.scale.setScalar(0.04 + backdropRandom() * 0.075)
    dummy.updateMatrix()
    backdrop.setMatrixAt(i, dummy.matrix)
  }
  backdrop.instanceMatrix.needsUpdate = true

  function writeGlow(index: number, position: T.Vector3, shade: T.Color, size: number) {
    position.toArray(glow.positions, index * 3)
    shade.toArray(glow.colors, index * 3)
    glow.sizes[index] = size
  }

  function update(time: number) {
    const frame = sampleTimeline(time)
    const generation = frame.generation
    // Small on-screen nuclei keep smooth shared normals at a lighter tessellation.
    nuclei.geometry = generation > 6 ? denseGeometry : geometry
    fragments.geometry = generation > 6 ? denseGeometry : geometry
    const handoff = smooth(DISPLAY_GENERATIONS - 0.5, DISPLAY_GENERATIONS + 1.2, generation)
    const visibility = 1 - handoff
    let nucleusCount = 0
    let fragmentCount = 0
    let glowCount = 0
    let tailCount = 0

    if (visibility > 0) {
      for (let i = 0; i < atoms.length; i += 1) {
        const atom = atoms[i]
        const age = generation - atom.splitAt
        const emergence = atom.depth === 0 ? 1 : smooth(atom.depth - 0.25, atom.depth + 0.05, generation)
        if (age < 0 && emergence > 0) {
          const breathe = 1 + Math.sin(generation * 2.3 + atom.phase) * 0.035
          dummy.position.copy(atom.position)
          dummy.rotation.set(atom.phase * 0.3, atom.phase + generation * 0.08, atom.phase * 0.6)
          dummy.scale.setScalar(atom.radius * breathe * emergence * visibility)
          dummy.updateMatrix()
          nuclei.setMatrixAt(nucleusCount, dummy.matrix)
          nuclei.setColorAt(nucleusCount, color.setRGB(1, 0.85 + emergence * 0.15, 0.8 + emergence * 0.2))
          nucleusCount += 1
        }
        if (age >= 0 && age < 0.62) {
          const fade = 1 - smooth(0.2, 0.62, age)
          for (let side = -1; side <= 1; side += 2) {
            dummy.position.copy(atom.position).addScaledVector(atom.direction, side * (0.035 + age * 0.58))
            dummy.rotation.set(atom.phase + age * side * 2, atom.phase * 0.2, age + atom.phase)
            dummy.scale.set(atom.radius * 0.75, atom.radius * 0.56, atom.radius * 0.68).multiplyScalar(fade * visibility)
            dummy.updateMatrix()
            fragments.setMatrixAt(fragmentCount, dummy.matrix)
            fragmentCount += 1
          }
          if (age < 0.24) {
            color.copy(flashWhite).lerp(flashAmber, age / 0.24).multiplyScalar((1 - age / 0.24) * 2.8 * visibility)
            writeGlow(glowCount++, atom.position, color, (atom.radius * 2.4 + age * 0.18) * visibility)
          }
        }
      }

      for (const neutron of neutrons) {
        const progress = (generation - neutron.start) / (neutron.end - neutron.start)
        if (progress < 0 || progress >= 1) continue
        p.lerpVectors(neutron.from, neutron.to, progress)
        tail.lerpVectors(neutron.from, neutron.to, Math.max(0, progress - 0.3))
        const fade = visibility * smooth(0, 0.07, progress) * (1 - smooth(0.93, 1, progress))
        color.copy(neutronColor).multiplyScalar(2.8 * fade)
        writeGlow(glowCount++, p, color, 0.075)
        tail.toArray(tailPositions, tailCount * 6)
        p.toArray(tailPositions, tailCount * 6 + 3)
        color.copy(neutronColor).multiplyScalar(0.025 * fade).toArray(tailColors, tailCount * 6)
        color.copy(neutronColor).multiplyScalar(0.8 * fade).toArray(tailColors, tailCount * 6 + 3)
        tailCount += 1
      }
    }

    nuclei.count = nucleusCount
    fragments.count = fragmentCount
    nuclei.instanceMatrix.needsUpdate = true
    fragments.instanceMatrix.needsUpdate = true
    if (nuclei.instanceColor) nuclei.instanceColor.needsUpdate = true
    glow.geometry.setDrawRange(0, glowCount)
    for (const attribute of Object.values(glow.geometry.attributes)) attribute.needsUpdate = true
    tailGeometry.setDrawRange(0, tailCount * 2)
    tailGeometry.getAttribute('position').needsUpdate = true
    tailGeometry.getAttribute('color').needsUpdate = true
    backdrop.visible = generation < DISPLAY_GENERATIONS + 1.2
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
    dispose() {
      geometry.dispose()
      denseGeometry.dispose()
      nucleusMaterial.dispose()
      fragmentMaterial.dispose()
      backgroundMaterial.dispose()
      nuclei.dispose()
      fragments.dispose()
      backdrop.dispose()
      glow.geometry.dispose()
      glow.material.dispose()
      field.geometry.dispose()
      field.material.dispose()
      tailGeometry.dispose()
      tailMaterial.dispose()
      group.clear()
    },
  }
}
