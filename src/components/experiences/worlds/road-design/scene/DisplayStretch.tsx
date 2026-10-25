import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { Network } from '../sim/types'
import { terrainHeight } from '../sim/terrain'

// Retained vehicle/trail materials may reuse an existing WebGL program across
// networks. Refresh that program's uniform map as well as the compile hook.
const compiledUniforms = new WeakMap<T.Material, Record<string, T.IUniform>>()
const StretchContext = createContext<{ network: Network; factor: { value: number } } | null>(null)
export function StretchAnchor({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const context = useContext(StretchContext), group = useRef<T.Group>(null)
  useFrame(() => { if (context && group.current) { const ground = terrainHeight(context.network, position[0], position[2]); group.current.position.y = ground + (position[1] - ground) * context.factor.value } })
  return <group ref={group} position={position}>{children}</group>
}

/** Post-project only infrastructure vertices, around their local terrain datum.
 * The network, ground mesh, motion integration and reported heights stay in metres.
 * Applying after custom ribbon expansion also handles instanced vehicles and piers. */
export function DisplayStretch({ network, enabled, children }: { network: Network; enabled: boolean; children: ReactNode }) {
  const group = useRef<T.Group>(null)
  const assets = useMemo(() => {
    const grid = network.terrain
    const texture = new T.DataTexture(new Float32Array(grid?.values ?? [0]), grid?.width ?? 1, grid?.height ?? 1, T.RedFormat, T.FloatType)
    texture.minFilter = texture.magFilter = T.LinearFilter; texture.needsUpdate = true
    return { texture, uniforms: {
      rdStretch: { value: 1 }, rdTerrain: { value: texture },
      rdBounds: { value: new T.Vector4(grid?.originX ?? 0, grid?.originZ ?? 0, grid ? (grid.width - 1) * grid.step : 1, grid ? (grid.height - 1) * grid.step : 1) },
      rdClipToWorld: { value: new T.Matrix4() }, rdWorldToClip: { value: new T.Matrix4() },
    }, materials: new Map<T.Material, { compile: T.Material['onBeforeCompile']; key: T.Material['customProgramCacheKey'] }>() }
  }, [network])
  useLayoutEffect(() => () => {
    assets.texture.dispose()
    for (const [material, old] of assets.materials) { material.onBeforeCompile = old.compile; material.customProgramCacheKey = old.key; material.needsUpdate = true }
  }, [assets])
  useFrame(({ camera }, dt) => {
    const u = assets.uniforms
    u.rdStretch.value = T.MathUtils.damp(u.rdStretch.value, enabled ? 2.5 : 1, 5, Math.min(dt, .1))
    u.rdClipToWorld.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse)
    u.rdWorldToClip.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    group.current?.traverse(object => {
      const materials = (object as T.Mesh).material
      if (!materials) return
      for (const material of Array.isArray(materials) ? materials : [materials]) {
        if (assets.materials.has(material)) continue
        const old = { compile: material.onBeforeCompile, key: material.customProgramCacheKey }
        const key = old.key.call(material)
        assets.materials.set(material, old)
        const existing = compiledUniforms.get(material)
        if(existing)Object.assign(existing,u)
        material.onBeforeCompile = (shader, renderer) => {
          old.compile.call(material, shader, renderer)
          Object.assign(shader.uniforms, u)
          compiledUniforms.set(material,shader.uniforms)
          shader.vertexShader = 'uniform float rdStretch; uniform sampler2D rdTerrain; uniform vec4 rdBounds; uniform mat4 rdClipToWorld; uniform mat4 rdWorldToClip;\n' + shader.vertexShader
          const end = shader.vertexShader.lastIndexOf('}')
          shader.vertexShader = shader.vertexShader.slice(0, end) + `
            if (rdStretch > 1.001) {
            vec4 rdWorld = rdClipToWorld * gl_Position;
            rdWorld /= rdWorld.w;
            vec2 rdUv = (rdWorld.xz-rdBounds.xy)/rdBounds.zw;
            vec2 rdSize=vec2(textureSize(rdTerrain,0));
            rdUv=(clamp(rdUv,0.0,1.0)*(rdSize-1.0)+0.5)/rdSize;
            float rdGround=texture2D(rdTerrain,rdUv).r;
            rdWorld.y=rdGround+(rdWorld.y-rdGround)*rdStretch;
            gl_Position=rdWorldToClip*rdWorld;
            }
          ` + shader.vertexShader.slice(end)
        }
        material.customProgramCacheKey = () => `${key}-terrain-stretch-v2`
        material.needsUpdate = true
      }
    })
  }, -1)
  return <StretchContext.Provider value={{network, factor: assets.uniforms.rdStretch}}><group ref={group}>{children}</group></StretchContext.Provider>
}
