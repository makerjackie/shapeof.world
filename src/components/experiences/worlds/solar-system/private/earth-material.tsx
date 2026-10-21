import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLazyTexture, EARTH_NIGHT_TEXTURE_URL } from '~/components/experiences/solar-system-textures'

// Existing NASA assets: natural-color 4K surface and uncrushed historical cloud composite.
// Source and rights: public/assets/solar-system/SOURCES.md and earth-spin-orbit/SOURCES.md.
const DAY = '/assets/solar-system/earth-bmng-4k.jpg'
const CLOUDS = '/assets/earth-spin-orbit/clouds-nasa-2k.jpg'
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

/** View-space lighting avoids cancellation of small Earth radii at true AU distances. */
export function EarthMaterial({ layer, sunDirection }: { layer: 'surface' | 'clouds' | 'atmosphere'; sunDirection: THREE.Vector3 }) {
	const day = useLazyTexture(layer === 'surface' ? DAY : null)
	const night = useLazyTexture(layer === 'surface' ? EARTH_NIGHT_TEXTURE_URL : null)
	const clouds = useLazyTexture(layer === 'clouds' ? CLOUDS : null, false)
	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {
					uDay: { value: null },
					uNight: { value: null },
					uClouds: { value: null },
					uReady: { value: 0 },
					uNightReady: { value: 0 },
					uSun: { value: new THREE.Vector3(1, 0, 0) },
				},
				transparent: layer !== 'surface',
				depthWrite: layer === 'surface',
				side: layer === 'atmosphere' ? THREE.BackSide : THREE.FrontSide,
				blending: layer === 'atmosphere' ? THREE.AdditiveBlending : THREE.NormalBlending,
				vertexShader,
				fragmentShader: `
      uniform sampler2D uDay, uNight, uClouds;
      uniform float uReady, uNightReady;
      uniform vec3 uSun;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal), v = normalize(vView), l = normalize(uSun);
        float incidence = dot(n, l);
        float daylight = smoothstep(-0.07, 0.12, incidence);
        float diffuse = max(incidence, 0.0);
        float limb = pow(1.0 - abs(dot(n, v)), 3.5);
        ${
					layer === 'surface'
						? `
          vec3 albedo = mix(vec3(0.015, 0.075, 0.16), texture2D(uDay, vUv).rgb, uReady);
          vec3 color = albedo * (0.012 + 1.65 * diffuse);
          // Approximate ocean mask from blue dominance, not bathymetry or measured BRDF.
          float water = smoothstep(0.012, 0.065, albedo.b - max(albedo.r, albedo.g));
          float glint = pow(max(dot(n, normalize(l + v)), 0.0), 90.0) * water * daylight;
          color += vec3(0.75, 0.86, 1.0) * glint * 0.28;
          color += vec3(0.035, 0.24, 0.58) * limb * daylight * 0.48;
          vec3 lights = texture2D(uNight, vUv).rgb;
          color += lights * vec3(1.0, 0.82, 0.55) * (1.0 - smoothstep(-0.22, 0.02, incidence)) * uNightReady * 0.85;
          gl_FragColor = vec4(color, 1.0);
        `
						: layer === 'clouds'
							? `
          float density = texture2D(uClouds, vUv).r;
          float alpha = smoothstep(0.07, 0.88, density) * uReady * 0.96;
          vec3 color = vec3(1.0, 0.985, 0.96) * (0.012 + 1.65 * diffuse);
          color += vec3(0.03, 0.11, 0.25) * limb * daylight;
          gl_FragColor = vec4(color, alpha);
        `
							: `
          float lit = smoothstep(-0.15, 0.35, incidence);
          float glow = pow(1.0 - abs(dot(n, v)), 2.8) * lit;
          gl_FragColor = vec4(vec3(0.12, 0.42, 1.0) * 1.25, glow * 0.55);
        `
				}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
			}),
		[layer],
	)
	useEffect(() => () => material.dispose(), [material])
	useFrame(({ camera }, delta) => {
		material.uniforms.uSun.value.copy(sunDirection).transformDirection(camera.matrixWorldInverse)
		material.uniforms.uDay.value = day
		material.uniforms.uNight.value = night
		material.uniforms.uClouds.value = clouds
		const ready = layer === 'surface' ? day : clouds
		if (ready) material.uniforms.uReady.value = Math.min(1, material.uniforms.uReady.value + delta * 2)
		material.uniforms.uNightReady.value = night ? 1 : 0
	})
	return <primitive object={material} attach="material" />
}
