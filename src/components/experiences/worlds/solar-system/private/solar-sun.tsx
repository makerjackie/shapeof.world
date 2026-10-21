import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { bodyRadius, SUN_RADIUS_KM, type ScaleMode } from '../scale-model'

/** Warm-color photosphere illustration. No UV mosaic or measured sunspot claim. */
export function Sun({
	hidden,
	mode,
	registerBody,
}: {
	hidden: boolean
	mode: ScaleMode
	registerBody: (id: string, obj: THREE.Object3D | null) => void
}) {
	const root = useRef<THREE.Group>(null)
	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				toneMapped: false,
				vertexShader: `
			#include <common>
			#include <logdepthbuf_pars_vertex>
			varying vec3 vLocal;
			varying vec3 vNormal;
			varying vec3 vView;
			void main() {
				vLocal = normalize(position);
				vNormal = normalize(normalMatrix * normal);
				vec4 mv = modelViewMatrix * vec4(position, 1.0);
				vView = -mv.xyz;
				gl_Position = projectionMatrix * mv;
				#include <logdepthbuf_vertex>
			}`,
				fragmentShader: `
			#include <common>
			#include <logdepthbuf_pars_fragment>
			varying vec3 vLocal;
			varying vec3 vNormal;
			varying vec3 vView;
			float hash(vec3 p) {
				p = fract(p * 0.3183099 + 0.1); p *= 17.0;
				return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
			}
			float noise(vec3 p) {
				vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
				return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
					mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
			}
			float spot(vec3 p, vec3 center, float radius) {
				float d = length(p - normalize(center));
				float penumbra = 1.0 - smoothstep(radius * 0.75, radius * 1.6, d);
				float umbra = 1.0 - smoothstep(radius * 0.3, radius * 0.72, d);
				return 0.35 * penumbra + 0.55 * umbra;
			}
			void main() {
				#include <logdepthbuf_fragment>
				vec3 p = normalize(vLocal);
				float mu = max(0.0, dot(normalize(vNormal), normalize(vView)));
				float limb = 0.38 + 0.62 * pow(mu, 0.55);
				// Seamless object-space granulation: detail stays on the sphere when orbiting.
				float granules = noise(p * 180.0) * 0.7 + noise(p * 390.0) * 0.3;
				float detail = 0.78 + granules * 0.30;
				float spots = spot(p, vec3(-0.38,0.2,0.91), 0.028) + spot(p,vec3(-0.30,0.18,0.94),0.017)
					+ spot(p,vec3(0.5,-0.25,-0.83),0.023);
				vec3 warm = mix(vec3(1.0, 0.21, 0.012), vec3(1.0, 0.58, 0.08), pow(mu, 0.65));
				vec3 photosphere = warm * limb * detail * (1.0 - min(spots,0.92));
				gl_FragColor = vec4(photosphere, 1.0);
				#include <colorspace_fragment>
			}`,
			}),
		[],
	)
	const halo = useMemo(() => {
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = 256
		const ctx = canvas.getContext('2d')!
		const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
		// The sprite is radius * 2.8 across, so texture radius 0.714 is the
		// photosphere edge: keep the corona a thin ring just outside it instead
		// of a broad glow that swallows the inner planets.
		gradient.addColorStop(0, 'rgba(255,173,58,0)')
		gradient.addColorStop(0.70, 'rgba(255,173,58,0)')
		gradient.addColorStop(0.745, 'rgba(255,168,52,0.26)')
		gradient.addColorStop(0.82, 'rgba(255,168,52,0.09)')
		gradient.addColorStop(1, 'rgba(255,165,48,0)')
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, 256, 256)
		const texture = new THREE.CanvasTexture(canvas)
		texture.colorSpace = THREE.SRGBColorSpace
		return texture
	}, [])
	useEffect(() => {
		registerBody('sun', root.current)
		return () => registerBody('sun', null)
	}, [registerBody])
	useEffect(
		() => () => {
			material.dispose()
			halo.dispose()
		},
		[material, halo],
	)
	const radius = bodyRadius(SUN_RADIUS_KM, mode)
	return (
		<group ref={root}>
			<group visible={!hidden}>
				<mesh name="sun" material={material}>
					<sphereGeometry args={[radius, 96, 64]} />
				</mesh>
				<sprite scale={[radius * 2.8, radius * 2.8, 1]}>
					<spriteMaterial map={halo} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
				</sprite>
			</group>
			<pointLight intensity={1.6} distance={0} decay={0} color="#fff4e0" />
		</group>
	)
}
