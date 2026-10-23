import * as T from 'three'

export function fixedRandom(seed: number) {
  let state = seed >>> 0
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296)
}

export function makeCity() {
  const random = fixedRandom(0x7363616c)
  const material = new T.MeshStandardMaterial({color: '#ffffff', roughness: .96, metalness: 0})
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float modelHeight;').replace('#include <begin_vertex>', '#include <begin_vertex>\nmodelHeight = position.y + .5;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float modelHeight;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(.66, 1., smoothstep(0., .38, modelHeight));')
  }
  const mesh = new T.InstancedMesh(new T.BoxGeometry(), material, 80 * 80 * 5)
  mesh.name = 'Abstract city: 100 metre blocks, no real location'
  mesh.castShadow = true
  mesh.receiveShadow = true
  const compactMesh = new T.InstancedMesh(mesh.geometry, material, 80 * 80)
  compactMesh.name = 'Mobile city: one building per 100 metre block'
  compactMesh.castShadow = true
  compactMesh.receiveShadow = true
  const compactMatrices: T.Matrix4[] = []
  const positions: {x: number; z: number; shade: number}[] = []
  const object = new T.Object3D()
  const blockMatrices: T.Matrix4[] = []
  const add = (x: number, z: number, w: number, d: number, h: number) => {
    object.position.set(x, h / 2, z)
    object.scale.set(w, h, d)
    object.updateMatrix()
    mesh.setMatrixAt(positions.length, object.matrix)
    positions.push({x, z, shade: .92 + random() * .13})
  }
  for (let ix = -40; ix < 40; ix++) {
    for (let iz = -40; iz < 40; iz++) {
      const x = (ix + .5) * .1
      const z = (iz + .5) * .1
      const edge = T.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 2.7, 4.05)
      const district = .12 * Math.sin(x * 2.1) * Math.cos(z * 1.4)
      if (Math.abs(x - .55) < .075 || Math.abs(z + .75) < .075 || random() < .045 + edge * .95 + district) continue
      object.position.set(x, .0001, z)
      object.scale.set(.086, 1, .086)
      object.updateMatrix()
      blockMatrices.push(object.matrix.clone())
      const type = random()
      const h = (.014 + random() * .046) * (1 - edge * .72)
      const compactHeight = Math.max(.01, h)
      object.position.set(x, compactHeight / 2, z)
      object.scale.set(.072, compactHeight, .072)
      object.updateMatrix()
      compactMatrices.push(object.matrix.clone())
      if (type < .24) {
        add(x - .018, z, .029, .072, h)
        add(x + .02, z - .023, .035, .025, h * .72)
        if (random() > .45) add(x + .02, z + .023, .035, .025, h * .63)
      } else if (type < .73) {
        for (const dx of [-.022, .022]) for (const dz of [-.022, .022]) {
          if (random() < .07) continue
          add(x + dx, z + dz, .028 + random() * .009, .026 + random() * .011, h * (.65 + random() * .35))
        }
      } else add(x, z, .062 + random() * .01, .048 + random() * .023, h)
    }
  }
  mesh.count = positions.length
  mesh.instanceMatrix.needsUpdate = true
  compactMesh.count = compactMatrices.length
  compactMatrices.forEach((matrix, i) => compactMesh.setMatrixAt(i, matrix))
  compactMesh.instanceMatrix.needsUpdate = true
  const blocks = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .78, depthWrite: false}), blockMatrices.length)
  blockMatrices.forEach((matrix, i) => blocks.setMatrixAt(i, matrix))
  blocks.instanceMatrix.needsUpdate = true
  const color = new T.Color()
  const recolor = (radii: number[] | null, compact = false) => {
    positions.forEach((p, i) => {
      const distance = Math.hypot(p.x, p.z)
      const hex = radii ? (distance <= radii[0] ? '#d79a5c' : distance <= radii[1] ? '#b98a62' : distance <= radii[2] ? '#8e8072' : '#a8a29a') : '#a8a29a'
      mesh.setColorAt(i, color.set(hex).multiplyScalar(p.shade))
    })
    mesh.visible = !compact
    compactMesh.visible = compact
    blockMatrices.forEach((matrix, i) => {
      const distance = Math.hypot(matrix.elements[12], matrix.elements[14])
      const hex = radii ? (distance <= radii[0] ? '#d79a5c' : distance <= radii[1] ? '#b98a62' : distance <= radii[2] ? '#8e8072' : '#a8a29a') : '#a8a29a'
      blocks.setColorAt(i, color.set(hex).multiplyScalar(compact ? .58 : .23))
      compactMesh.setColorAt(i, color.set(hex))
    })
    if (compactMesh.instanceColor) compactMesh.instanceColor.needsUpdate = true
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  recolor(null)
  return {mesh, compactMesh, blocks, recolor}
}

export function makeMountain() {
  const geometry = new T.PlaneGeometry(19, 13, 34, 26).rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  const random = fixedRandom(61848)
  let peak = 0
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i)
    const edge = Math.max(0, 1 - Math.max(Math.abs(x) / 9.5, Math.abs(z) / 6.5))
    const ridge1 = Math.max(0, 1 - Math.abs(z - x * .22) / 4.1) * Math.max(0, 1 - Math.abs(x + .7) / 9.5)
    const ridge2 = Math.max(0, 1 - Math.abs(z + x * .55 - 1.6) / 3.7) * Math.max(0, 1 - Math.abs(x - 2) / 9)
    const ridge3 = Math.max(0, 1 - Math.abs(z + 2.5) / 3) * Math.max(0, 1 - Math.abs(x + 3.8) / 7)
    const y = Math.max(ridge1, ridge2 * .72, ridge3 * .58) * (.91 + random() * .15) * Math.min(1, edge * 8)
    positions.setY(i, y)
    peak = Math.max(peak, y)
  }
  for (let i = 0; i < positions.count; i++) positions.setY(i, positions.getY(i) / peak * 8.848)
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  const vertices = flat.getAttribute('position')
  const ridgeVertices: number[] = []
  for (let i = 0; i < vertices.count; i += 3) {
    if (Math.max(vertices.getY(i), vertices.getY(i + 1), vertices.getY(i + 2)) < .001) continue
    for (let j = 0; j < 3; j++) ridgeVertices.push(vertices.getX(i + j), vertices.getY(i + j), vertices.getZ(i + j))
  }
  flat.dispose()
  const ridges = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(ridgeVertices, 3))
  ridges.computeVertexNormals()
  const mesh = new T.Mesh(ridges, new T.MeshStandardMaterial({color: '#68665e', roughness: 1, flatShading: true, side: T.DoubleSide}))
  mesh.scale.set(.62, 1, .62)
  mesh.position.set(-14, 0, Math.sqrt(25 ** 2 - 14 ** 2))
  mesh.name = 'Original ridgeline: height reference only'
  return mesh
}

export function makeReferences() {
  const group = new T.Group()
  const stone = new T.MeshStandardMaterial({color: '#aaa59a', roughness: .9})
  const dark = new T.MeshStandardMaterial({color: '#494941', roughness: .95})
  const cubeMaterial = new T.MeshStandardMaterial({color: '#cdb98a', roughness: .95})
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: T.Material = stone) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const base = new T.Vector3(4.25, 0, 2.85)
  group.position.copy(base)
  box(.018, .3, .018, -.035, .15, -.035)
  for (let i = 1; i <= 9; i++) box(.020, .0017, .020, -.035, i * .03, -.035, dark)
  box(.030, .002, .030, -.035, .001, -.035, dark)
  const cube = box(1, 1, 1, 0, .5, 0, cubeMaterial)
  const edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry()), new T.LineBasicMaterial({color: '#e5d6ad', transparent: true, opacity: .65}))
  cube.add(edges)
  const person = new T.Group()
  person.position.set(-.0021, 0, .0015)
  const body = new T.Mesh(new T.CapsuleGeometry(.00017, .00067, 3, 6), dark)
  body.position.y = .00105
  const head = new T.Mesh(new T.SphereGeometry(.00015, 10, 8), dark)
  head.position.y = .00155
  person.add(body, head)
  for (const x of [-.0001, .0001]) {
    const leg = new T.Mesh(new T.CylinderGeometry(.00006, .00006, .00065, 6), dark)
    leg.position.set(x, .000325, 0)
    person.add(leg)
  }
  group.add(person)
  const truck = new T.Group()
  truck.position.set(.006, 0, -.001)
  for (const [w, h, d, x, y, z] of [[.0034, .0015, .0018, .0004, .0012, 0], [.0015, .0015, .0018, -.002, .0012, 0], [.0011, .00065, .00165, -.002, .0021, 0]]) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), stone)
    m.position.set(x, y, z)
    m.castShadow = true
    truck.add(m)
  }
  for (const x of [-.0018, .0014]) for (const z of [-.0009, .0009]) {
    const wheel = new T.Mesh(new T.CylinderGeometry(.0004, .0004, .0002, 12), dark)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(x, .0004, z)
    truck.add(wheel)
  }
  group.add(truck)
  return {group, base, cube, person, truck}
}
