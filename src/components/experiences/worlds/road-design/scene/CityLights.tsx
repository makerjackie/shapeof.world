import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { Lamp } from './NightWorld'

/** Far streets are decorative GPU points; they never enter the traffic model. */
export function CityLights({ lamps }: { lamps: Lamp[] }) {
  const assets = useMemo(() => {
    const positions: number[] = [], colors: number[] = [], moves: number[] = [], sizes: number[] = []
    let seed = 3311
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
    const add = (x: number, y: number, z: number, rgb: number[], size: number, direction = 0, speed = 0) => {
      positions.push(x, y, z); colors.push(...rgb); sizes.push(size); moves.push(direction, speed)
    }
    for (let street = -2940; street <= 2940; street += 120) {
      if (Math.abs(street) < 180) continue
      for (let along = -2980; along <= 2980; along += 36) {
        if (Math.hypot(street, along) < 740 || Math.hypot(street, along) > 3020) continue
        add(street, 8.2, along, [1.85, 1.08, 0.37], 1.8)
        add(along, 8.2, street, [1.85, 1.08, 0.37], 1.8)
      }
      for (let i = 0; i < 22; i++) {
        const along = (random() - 0.5) * 5900
        if (Math.hypot(street, along) < 750 || Math.hypot(street, along) > 3000) continue
        const direction = random() < 0.5 ? -1 : 1, speed = 4 + random() * 5
        const white = direction > 0
        add(street + direction * 2.5, 0.9, along, white ? [2.4, 2.05, 1.55] : [2.8, 0.1, 0.035], 1.9, direction, speed)
        add(along, 0.9, street - direction * 2.5, white ? [2.4, 2.05, 1.55] : [2.8, 0.1, 0.035], 1.9, direction * 2, speed)
      }
    }
    for (const lamp of lamps) {
      const p = lamp.position, angle = lamp.rotation
      add(p.x + (lamp.urban ? Math.cos(angle) * 2.8 : 0), p.y + lamp.height, p.z - (lamp.urban ? Math.sin(angle) * 2.8 : 0), lamp.urban ? [3, 1.8, 0.8] : [3, 2.75, 2.15], lamp.urban ? 9 : 12)
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('lightColor', new T.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('lightSize', new T.Float32BufferAttribute(sizes, 1))
    geometry.setAttribute('motion', new T.Float32BufferAttribute(moves, 2))
    const material = new T.ShaderMaterial({
      uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute vec3 lightColor; attribute float lightSize; attribute vec2 motion;
        uniform float time; uniform float pixelRatio; varying vec3 glowColor; varying float nearLamp;
        void main(){vec3 p=position;
          if(abs(motion.x)>0.5){float offset=mod(time*motion.y,120.0)-60.0;
            if(abs(motion.x)<1.5) p.z+=offset*sign(motion.x); else p.x+=offset*sign(motion.x);}
          vec4 view=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*view;
          nearLamp=step(4.0,lightSize);
          gl_PointSize=mix(clamp(1600.0/-view.z,0.8,1.9),clamp(lightSize*550.0/-view.z,5.0,23.0),nearLamp)*pixelRatio;
          float haze=exp(-max(0.0,-view.z-450.0)*0.00068);
          glowColor=lightColor*haze*mix(0.42,1.0,nearLamp);
        }`,
      fragmentShader: `varying vec3 glowColor; varying float nearLamp;
        void main(){float radius=length(gl_PointCoord-0.5)*2.0;if(radius>1.0)discard;
          float glow=mix(exp(-radius*radius*4.0),exp(-radius*radius*5.5)*0.23,nearLamp);
          gl_FragColor=vec4(glowColor,glow);}`,
    })
    return { geometry, material }
  }, [lamps])
  useFrame(({ clock, gl }) => { assets.material.uniforms.time.value = clock.elapsedTime; assets.material.uniforms.pixelRatio.value = gl.getPixelRatio() })
  useEffect(() => () => { assets.geometry.dispose(); assets.material.dispose() }, [assets])
  return <points geometry={assets.geometry} material={assets.material} frustumCulled={false} />
}
