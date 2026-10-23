import * as T from 'three'

/** Scenic display geometry, with arbitrary, unitless proportions. */
export function createExhibition() {
  const group = new T.Group()
  const black = new T.MeshStandardMaterial({color: '#120e09', metalness: .04, roughness: .82, envMapIntensity: .04})
  const floor = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshBasicMaterial({color: '#0a0a0b'}))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.48
  group.add(floor)

  const platform = new T.Mesh(new T.CylinderGeometry(5.5, 5.57, .5, 192), black)
  platform.position.set(-.6, -3.22, 0)
  platform.receiveShadow = true
  group.add(platform)
  const ring = new T.Mesh(new T.TorusGeometry(5.34, .013, 8, 192), new T.MeshStandardMaterial({color: '#b49a6a', metalness: .76, roughness: .35, transparent: true, opacity: .46}))
  ring.rotation.x = Math.PI / 2
  ring.position.set(-.6, -2.964, 0)
  group.add(ring)

  const pool = new T.Mesh(new T.PlaneGeometry(11.3, 11.3), new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: {tint: {value: new T.Color('#5d4631')}},
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 tint;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*3.8)*.20;gl_FragColor=vec4(tint,a);}',
  }))
  pool.rotation.x = -Math.PI / 2
  pool.position.set(-.6, -2.961, 0)
  group.add(pool)

  // Low curved display cradles, not parts of the historical object.
  const saddleMaterial = new T.MeshStandardMaterial({color: '#22252a', metalness: .72, roughness: .4})
  for (const x of [-1.55, 1.55]) {
    const shape = new T.Shape()
    shape.moveTo(-1.48, -2.91)
    shape.lineTo(1.48, -2.91)
    shape.lineTo(1.48, -1.58)
    for (let i = 0; i <= 64; i++) {
      const z = 1.48 - i / 64 * 2.96
      shape.lineTo(z, -Math.sqrt(Math.max(0, 2.07 ** 2 - z ** 2)))
    }
    shape.closePath()
    const mesh = new T.Mesh(new T.ExtrudeGeometry(shape, {depth: .19, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, steps: 1}), saddleMaterial)
    mesh.rotation.y = Math.PI / 2
    mesh.position.x = x - .095
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    const foot = new T.Mesh(new T.BoxGeometry(.43, .1, 3.12), saddleMaterial)
    foot.position.set(x, -2.9, 0)
    foot.castShadow = true
    foot.receiveShadow = true
    group.add(foot)
  }
  const contact = new T.Mesh(new T.PlaneGeometry(8, 5.8), new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*3.;float a=exp(-dot(p,p)*2.2);gl_FragColor=vec4(0.,0.,0.,a*.75);}',
  }))
  contact.rotation.x = -Math.PI / 2
  contact.position.y = -2.952
  group.add(contact)

  const axis = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, -2.4, 0), new T.Vector3(0, 5.15, 0)]), new T.LineDashedMaterial({color: '#b49a6a', dashSize: .06, gapSize: .09, transparent: true, opacity: .25, depthWrite: false}))
  axis.computeLineDistances()
  group.add(axis)
  return {group, axis}
}

export function createBackdrop() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(245, 220, 0, 256, 256, 340)
  gradient.addColorStop(0, '#141312')
  gradient.addColorStop(1, '#0a0a0b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  return texture
}
