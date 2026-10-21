import type { Color, Material } from 'three'

const papers = new WeakMap<Material, { value: Color }>()

const WORLD_POSITION = /* glsl */`
#ifdef USE_FOG
  vec4 songxiFogPosition = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    songxiFogPosition = batchingMatrix * songxiFogPosition;
  #endif
  #ifdef USE_INSTANCING
    songxiFogPosition = instanceMatrix * songxiFogPosition;
  #endif
  songxiFogWorldPosition = (modelMatrix * songxiFogPosition).xyz;
#endif
`

// Keep the height/noise field identical to createPaintMaterial. A different
// field on foliage would leave dark trees floating above dissolved hill feet.
const FOG_PARAMETERS = /* glsl */`
#ifdef USE_FOG
  varying vec3 songxiFogWorldPosition;
  uniform vec3 songxiFogPaper;
  float songxiFogHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float songxiFogNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(songxiFogHash(i), songxiFogHash(i + vec2(1.0, 0.0)), f.x),
      mix(songxiFogHash(i + vec2(0.0, 1.0)), songxiFogHash(i + 1.0), f.x), f.y);
  }
#endif
`

const FOG_FRAGMENT = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float songxiHaze = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float songxiHaze = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  float songxiMistHeight = 31.0 + songxiFogNoise(songxiFogWorldPosition.xz * .012) * 24.0;
  float songxiLowMist = 1.0 - smoothstep(songxiMistHeight * .20, songxiMistHeight, songxiFogWorldPosition.y);
  float songxiPockets = .62 + .38 * songxiFogNoise(songxiFogWorldPosition.xz * .006 + vec2(3.1, 1.7));
  songxiHaze = max(songxiHaze, songxiLowMist * smoothstep(95.0, 340.0, vFogDepth) * songxiPockets * .80);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, songxiFogPaper, min(songxiHaze, .985));
#endif
`

/**
 * Apply the painted landscape's fog to built-in mesh/line materials, including
 * instanced leaves. Call before first render; leave custom ShaderMaterials alone.
 * Scene fog uniforms remain live, so the existing fog control needs no new hook.
 */
export function applySongxiFog<M extends Material>(material: M, paper: Color): M {
  const existing = papers.get(material)
  if (existing) { existing.value = paper; return material }
  const uniform = { value: paper }
  papers.set(material, uniform)
  const previousCompile = material.onBeforeCompile
  const previousCacheKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(material, shader, renderer)
    if (!shader.vertexShader.includes('#include <project_vertex>') || !shader.fragmentShader.includes('#include <fog_fragment>')) {
      throw new Error('Songxi fog requires Three.js built-in fog shader chunks')
    }
    shader.uniforms.songxiFogPaper = uniform
    shader.vertexShader = `#ifdef USE_FOG\nvarying vec3 songxiFogWorldPosition;\n#endif\n${shader.vertexShader}`
      .replace('#include <project_vertex>', `#include <project_vertex>\n${WORLD_POSITION}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <fog_pars_fragment>', `#include <fog_pars_fragment>\n${FOG_PARAMETERS}`)
      // Stock fog runs after output encoding; this field must mix in linear
      // light, like the rock shader, and must not apply distance fog twice.
      .replace('#include <fog_fragment>', '')
      .replace('#include <colorspace_fragment>', `${FOG_FRAGMENT}\n#include <colorspace_fragment>`)
  }
  material.customProgramCacheKey = () => `${previousCacheKey}:songxi-height-fog-v1`
  material.needsUpdate = true
  return material
}
