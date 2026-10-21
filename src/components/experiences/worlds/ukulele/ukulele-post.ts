// Post-processing: HDR scene target -> depth of field (thin lens, gathered at half resolution) ->
// multi-level bloom -> ACES tone map, colour grade, vignette and a little film grain.
// Plain three.js core (no addons).
import * as THREE from 'three'

const VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }'

const DEPTH_GLSL = `
  #include <packing>
  uniform sampler2D tDepth; uniform float near; uniform float far; uniform float focus; uniform float strength;
  float viewDist(vec2 uv){ return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tDepth, uv)), near, far); }
  float cocOf(float z){ return clamp(abs(1.0 / z - 1.0 / focus) * focus * strength, 0.0, 1.0); }
`

const FRAG_DOF = `
  uniform sampler2D tScene; uniform vec2 texel; uniform float maxR;
  varying vec2 vUv;
  ${DEPTH_GLSL}
  float hash(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  vec3 clean(vec3 c){ return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : min(c, vec3(60.0)); }
  void main(){
    vec3 c0 = clean(texture2D(tScene, vUv).rgb);
    float z0 = viewDist(vUv), coc0 = cocOf(z0);
    vec3 acc = c0; float ws = 1.0;
    float rot = hash(gl_FragCoord.xy) * 6.2831;
    for (int i = 0; i < 28; i++) {
      float fi = float(i);
      float r = sqrt((fi + 0.5) / 28.0), th = fi * 2.399963 + rot;
      vec2 off = vec2(cos(th), sin(th)) * r * maxR;
      vec2 uv = vUv + off * texel;
      float zs = viewDist(uv), cs = cocOf(zs);
      float dist = r * maxR;
      float w = clamp(cs * maxR - dist + 1.0, 0.0, 1.0);
      if (zs > z0 + 0.004) w *= clamp(coc0 * maxR - dist + 1.0, 0.0, 1.0);   // a sharp subject keeps its edge
      acc += clean(texture2D(tScene, uv).rgb) * w; ws += w;
    }
    gl_FragColor = vec4(acc / ws, 1.0);
  }
`

const FRAG_BRIGHT = `
  uniform sampler2D tScene; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
  vec3 prefilter(vec3 c){ if (any(isnan(c)) || any(isinf(c))) return vec3(0.0); c = min(c, vec3(60.0)); float l = max(max(c.r, c.g), c.b); float k = clamp((l - threshold) / max(l, 1e-4), 0.0, 1.0); return c * k * k * (3.0 - 2.0 * k); }
  void main(){
    vec3 a = texture2D(tScene, vUv + texel * vec2(-1.0, -1.0)).rgb, b = texture2D(tScene, vUv + texel * vec2(1.0, -1.0)).rgb;
    vec3 c = texture2D(tScene, vUv + texel * vec2(-1.0, 1.0)).rgb, d = texture2D(tScene, vUv + texel * vec2(1.0, 1.0)).rgb;
    gl_FragColor = vec4(min((prefilter(a) + prefilter(b) + prefilter(c) + prefilter(d)) * 0.25, vec3(8.0)), 1.0);
  }
`

const FRAG_BLUR = `
  uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
  void main(){
    vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270270;
    s += (texture2D(tSrc, vUv + dir * 1.3846153846).rgb + texture2D(tSrc, vUv - dir * 1.3846153846).rgb) * 0.3162162162;
    s += (texture2D(tSrc, vUv + dir * 3.2307692308).rgb + texture2D(tSrc, vUv - dir * 3.2307692308).rgb) * 0.0702702703;
    gl_FragColor = vec4(s, 1.0);
  }
`

const FRAG_FINAL = `
  uniform sampler2D tScene; uniform sampler2D tDof;
  uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform sampler2D tB4;
  uniform float exposure; uniform float bloom; uniform float vig; uniform float grain; uniform float time; uniform float aspect; uniform float glow;
  uniform vec3 shadowTint; uniform vec3 highTint; uniform float sat; uniform float ca;
  varying vec2 vUv;
  ${DEPTH_GLSL}
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  vec3 toSrgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
  void main(){
    vec3 sharp = texture2D(tScene, vUv).rgb;
    if (ca > 0.0) {                       // lens fringing toward the edges of the frame
      vec2 d = (vUv - 0.5) * ca * 0.006;
      sharp.r = texture2D(tScene, vUv + d).r;
      sharp.b = texture2D(tScene, vUv - d).b;
    }
    if (any(isnan(sharp)) || any(isinf(sharp))) sharp = vec3(0.0);
    vec2 px = 1.5 / vec2(textureSize(tScene, 0));
    float coc = cocOf(viewDist(vUv));
    coc = min(coc, cocOf(viewDist(vUv + vec2(px.x, 0.0))));
    coc = min(coc, cocOf(viewDist(vUv - vec2(px.x, 0.0))));
    coc = min(coc, cocOf(viewDist(vUv + vec2(0.0, px.y))));
    coc = min(coc, cocOf(viewDist(vUv - vec2(0.0, px.y))));
    vec3 col = mix(sharp, texture2D(tDof, vUv).rgb, smoothstep(0.10, 0.65, coc));
    vec3 b = texture2D(tB0, vUv).rgb * 0.45 + texture2D(tB1, vUv).rgb * 0.55 + texture2D(tB2, vUv).rgb * 0.60
           + texture2D(tB3, vUv).rgb * 0.55 + texture2D(tB4, vUv).rgb * 0.45;
    if (any(isnan(b)) || any(isinf(b))) b = vec3(0.0);
    col += b * bloom * (1.0 + glow);
    col *= exposure;
    col = aces(col);
    // grade: a touch more colour, tinted shadows, highlights tinted by the theme
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, sat);
    col += shadowTint * (1.0 - l) * (1.0 - l);
    col *= mix(vec3(1.0), highTint, l);
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    col *= 1.0 - vig * smoothstep(0.30, 0.95, length(p) * 1.15);
    col = toSrgb(clamp(col, 0.0, 1.0));
    col += (hash(gl_FragCoord.xy) - 0.5) * grain;
    gl_FragColor = vec4(col, 1.0);
  }
`

export type PostGrade = {
  shadow: readonly [number, number, number]
  high: readonly [number, number, number]
  sat: number
  ca: number
}

type DepthUniforms = {
  tDepth: THREE.IUniform<THREE.Texture | null>
  near: THREE.IUniform<number>
  far: THREE.IUniform<number>
  focus: THREE.IUniform<number>
  strength: THREE.IUniform<number>
}

export class UkulelePost {
  readonly ok: boolean
  readonly params = { exposure: 1.0, bloom: 0.55, threshold: 0.9, vig: 0.38, grain: 0.022, maxR: 9, strength: 0.75, focus: 0.2, glow: 0 }
  grade: PostGrade | null = null
  readonly clearColor = new THREE.Color(0x070504)

  private r: THREE.WebGLRenderer
  private quad!: THREE.Mesh
  private qs!: THREE.Scene
  private qc!: THREE.OrthographicCamera
  private mDof!: THREE.ShaderMaterial
  private mBright!: THREE.ShaderMaterial
  private mBlur!: THREE.ShaderMaterial
  private mFinal!: THREE.ShaderMaterial
  private depthMat!: THREE.MeshDepthMaterial
  private rts: Array<THREE.WebGLRenderTarget> = []
  private w = 0
  private h = 0
  private sceneRT!: THREE.WebGLRenderTarget
  private depthRT!: THREE.WebGLRenderTarget
  private dofRT!: THREE.WebGLRenderTarget
  private bl: Array<THREE.WebGLRenderTarget> = []
  private tmp: Array<THREE.WebGLRenderTarget> = []

  constructor(renderer: THREE.WebGLRenderer) {
    this.r = renderer
    this.ok = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')
    if (!this.ok) return
    const tri = new THREE.BufferGeometry()
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    this.quad = new THREE.Mesh(tri)
    this.quad.frustumCulled = false
    this.qs = new THREE.Scene()
    this.qs.add(this.quad)
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const sm = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false })
    const T = null
    const dep = (): DepthUniforms => ({ tDepth: { value: T }, near: { value: 0.02 }, far: { value: 3 }, focus: { value: 0.2 }, strength: { value: 1 } })
    this.mDof = sm(FRAG_DOF, { tScene: { value: T }, texel: { value: new THREE.Vector2() }, maxR: { value: 8 }, ...dep() })
    this.mBright = sm(FRAG_BRIGHT, { tScene: { value: T }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.9 } })
    this.mBlur = sm(FRAG_BLUR, { tSrc: { value: T }, dir: { value: new THREE.Vector2() } })
    this.mFinal = sm(FRAG_FINAL, {
      tScene: { value: T },
      tDof: { value: T },
      tB0: { value: T },
      tB1: { value: T },
      tB2: { value: T },
      tB3: { value: T },
      tB4: { value: T },
      exposure: { value: 1 },
      bloom: { value: 0.5 },
      vig: { value: 0.35 },
      grain: { value: 0.02 },
      time: { value: 0 },
      aspect: { value: 0.56 },
      glow: { value: 0 },
      shadowTint: { value: new THREE.Vector3(0.02, 0.01, 0.003) },
      highTint: { value: new THREE.Vector3(1, 1, 1) },
      sat: { value: 1.1 },
      ca: { value: 0 },
      ...dep(),
    })
    this.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  }

  private makeRT(w: number, h: number, opts: THREE.RenderTargetOptions = {}): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      generateMipmaps: false,
      ...opts,
    })
    this.rts.push(rt)
    return rt
  }

  /** w, h in drawing-buffer pixels. */
  resize(w: number, h: number) {
    if (!this.ok || (w === this.w && h === this.h)) return
    this.w = w
    this.h = h
    this.rts.forEach((t) => t.dispose())
    this.rts = []
    this.sceneRT = this.makeRT(w, h, { depthBuffer: true, samples: 4 })
    this.depthRT = this.makeRT(w >> 1, h >> 1, { type: THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })
    this.dofRT = this.makeRT(w >> 1, h >> 1)
    this.bl = []
    this.tmp = []
    for (let i = 0; i < 5; i++) {
      const ww = Math.max(2, w >> (i + 1))
      const hh = Math.max(2, h >> (i + 1))
      this.bl.push(this.makeRT(ww, hh))
      this.tmp.push(this.makeRT(ww, hh))
    }
  }

  private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat
    this.r.setRenderTarget(target)
    this.r.render(this.qs, this.qc)
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, time: number) {
    const r = this.r
    const p = this.params
    const { w, h } = this
    r.setRenderTarget(this.sceneRT)
    r.clear()
    r.render(scene, camera)

    // depth: opaque layer-0 geometry only
    const prevMask = camera.layers.mask
    camera.layers.set(0)
    scene.overrideMaterial = this.depthMat
    const bg = scene.background
    const fog = scene.fog
    scene.background = null
    scene.fog = null
    r.setRenderTarget(this.depthRT)
    r.setClearColor(0xffffff, 1)
    r.clear()
    r.render(scene, camera)
    scene.overrideMaterial = null
    scene.background = bg
    scene.fog = fog
    camera.layers.mask = prevMask
    r.setClearColor(this.clearColor, 1)

    const setDepth = (m: THREE.ShaderMaterial) => {
      const u = m.uniforms
      u.tDepth.value = this.depthRT.texture
      u.near.value = camera.near
      u.far.value = camera.far
      u.focus.value = p.focus
      u.strength.value = p.strength
    }
    // depth of field (half res)
    setDepth(this.mDof)
    this.mDof.uniforms.tScene.value = this.sceneRT.texture
    this.mDof.uniforms.texel.value.set(2 / w, 2 / h)
    this.mDof.uniforms.maxR.value = p.maxR * 0.5
    this.pass(this.mDof, this.dofRT)

    // bloom
    this.mBright.uniforms.tScene.value = this.sceneRT.texture
    this.mBright.uniforms.texel.value.set(1 / w, 1 / h)
    this.mBright.uniforms.threshold.value = p.threshold
    this.pass(this.mBright, this.bl[0])
    for (let i = 0; i < 5; i++) {
      const bw = this.bl[i].width
      const bh = this.bl[i].height
      if (i > 0) {
        // downsample the previous level by blurring it into this one
        this.mBlur.uniforms.tSrc.value = this.bl[i - 1].texture
        this.mBlur.uniforms.dir.value.set(1 / this.bl[i - 1].width, 0)
        this.pass(this.mBlur, this.tmp[i])
      } else {
        this.mBlur.uniforms.tSrc.value = this.bl[0].texture
        this.mBlur.uniforms.dir.value.set(1 / bw, 0)
        this.pass(this.mBlur, this.tmp[0])
      }
      this.mBlur.uniforms.tSrc.value = this.tmp[i].texture
      this.mBlur.uniforms.dir.value.set(0, 1 / bh)
      this.pass(this.mBlur, this.bl[i])
    }

    const u = this.mFinal.uniforms
    setDepth(this.mFinal)
    u.tScene.value = this.sceneRT.texture
    u.tDof.value = this.dofRT.texture
    for (let i = 0; i < 5; i++) u[`tB${i}`].value = this.bl[i].texture
    u.exposure.value = p.exposure
    u.bloom.value = p.bloom
    u.vig.value = p.vig
    u.grain.value = p.grain
    u.time.value = (time % 10) * 7.0
    u.aspect.value = w / h
    u.glow.value = p.glow
    if (this.grade) {
      u.shadowTint.value.fromArray(this.grade.shadow)
      u.highTint.value.fromArray(this.grade.high)
      u.sat.value = this.grade.sat
      u.ca.value = this.grade.ca
    }
    this.pass(this.mFinal, null)
  }

  dispose() {
    if (!this.ok) return
    this.rts.forEach((t) => t.dispose())
    this.rts = []
    ;[this.mDof, this.mBright, this.mBlur, this.mFinal, this.depthMat].forEach((m) => m.dispose())
    this.quad.geometry.dispose()
  }
}
