import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * 太阳系真实贴图懒加载。
 * 贴图均为 NASA / Björn Jónsson / CC BY 4.0 来源，见 public/assets/solar-system/SOURCES.md。
 * 调用方在纹理返回 null 期间用低模色球占位，ready 后自行淡入。
 */

const BASE = '/assets/solar-system'

export const SUN_TEXTURE_URL = `${BASE}/sun.jpg`
export const MOON_TEXTURE_URL = `${BASE}/moon.jpg`
export const SATURN_RING_TEXTURE_URL = `${BASE}/saturn-rings.webp`
export const EARTH_DAY_TEXTURE_URL = `${BASE}/earth-day.jpg`
export const EARTH_NIGHT_TEXTURE_URL = `${BASE}/earth-night.jpg`
export const EARTH_CLOUDS_TEXTURE_URL = `${BASE}/earth-clouds.jpg`
export const MOON_LROC_TEXTURE_URL = `${BASE}/moon-lroc-2k.jpg`

export function planetTextureUrl(id: string) {
  return `${BASE}/${id}.jpg`
}

const loader = new THREE.TextureLoader()
const cache = new Map<string, Promise<THREE.Texture>>()

function loadTexture(url: string, srgb: boolean): Promise<THREE.Texture> {
  const key = `${url}|${srgb ? 's' : 'l'}`
  let pending = cache.get(key)
  if (!pending) {
    pending = new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
          tex.anisotropy = 16
          tex.wrapS = THREE.RepeatWrapping
          resolve(tex)
        },
        undefined,
        () => {
          cache.delete(key)
          reject(new Error(`texture failed to load: ${url}`))
        },
      )
    })
    cache.set(key, pending)
  }
  return pending
}

/** 懒加载贴图：未就绪时返回 null，就绪后返回 THREE.Texture（跨组件共享缓存） */
export function useLazyTexture(url: string | null, srgb = true): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) return
    let alive = true
    loadTexture(url, srgb)
      .then((t) => {
        if (alive) setTex(t)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [url, srgb])
  return tex
}
