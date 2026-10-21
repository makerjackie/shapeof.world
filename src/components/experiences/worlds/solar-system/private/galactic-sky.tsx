import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Original directional sky illustration, not a measured Milky Way panorama.
 * Camera rotation changes the view; translating across the Solar System does not.
 * Clip-space depth makes the backdrop independent of the scene's AU/km range.
 */
export function GalacticSky({ blendRef }: { blendRef: React.MutableRefObject<number> }) {
	const material = useRef<THREE.ShaderMaterial>(null)
	const uniforms = useMemo(
		() => ({
			inverseProjection: { value: new THREE.Matrix4() },
			cameraRotation: { value: new THREE.Matrix3() },
			exposure: { value: 0 },
		}),
		[],
	)
	useFrame(({ camera }) => {
		if (!material.current) return
		const u = material.current.uniforms
		u.inverseProjection.value.copy(camera.projectionMatrixInverse)
		u.cameraRotation.value.setFromMatrix4(camera.matrixWorld)
		u.exposure.value = blendRef.current
	})
	return (
		<mesh frustumCulled={false} renderOrder={-100}>
			<planeGeometry args={[2, 2]} />
			<shaderMaterial
				key="directional-galaxy"
				ref={material}
				uniforms={uniforms}
				depthTest={false}
				depthWrite={false}
				toneMapped={false}
				vertexShader={`varying vec2 skyUv; void main() { skyUv = uv; gl_Position = vec4(position.xy,0.999999,1.0); }`}
				fragmentShader={`
				uniform mat4 inverseProjection;
				uniform mat3 cameraRotation;
				uniform float exposure;
				varying vec2 skyUv;
				float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
				float noise(vec3 p) {
					vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
					return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
						mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
				}
				void main() {
					vec4 ray = inverseProjection * vec4(skyUv*2.0-1.0,1.0,1.0);
					vec3 direction = normalize(cameraRotation * ray.xyz);
					float latitude = dot(direction, normalize(vec3(0.60,-0.20,0.15)));
					float clouds = noise(direction*9.0)*0.55+noise(direction*24.0)*0.3+noise(direction*70.0)*0.15;
					float bandLatitude = latitude / 0.20;
					float band = exp(-bandLatitude * bandLatitude);
					float dustLatitude = (latitude + 0.045 * (clouds - 0.5)) / 0.033;
					float dust = exp(-dustLatitude * dustLatitude);
					vec3 color = vec3(0.001,0.002,0.004) + exposure * band * (0.3+clouds*0.7) * vec3(0.065,0.070,0.10) * (1.0-dust*0.78);
					gl_FragColor = vec4(color,1.0);
					#include <colorspace_fragment>
				}`}
			/>
		</mesh>
	)
}
