import { useEffect, useState, useSyncExternalStore } from 'react'
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

type TextureStatus = 'loading' | 'ready' | 'error'
const statuses = new Map<string, TextureStatus>()
const listeners = new Set<() => void>()
let statusVersion = 0
let retryVersion = 0
const subscribe = (listener: () => void) => {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}
const publish = () => {
	statusVersion++
	listeners.forEach((listener) => listener())
}
export function retryFailedTextures() {
	retryVersion++
	publish()
}
export function useTextureStatus(urls: string[]) {
	useSyncExternalStore(
		subscribe,
		() => statusVersion,
		() => 0,
	)
	if (urls.some((url) => statuses.get(url) === 'error')) return 'error'
	return urls.some((url) => statuses.get(url) !== 'ready') ? 'loading' : 'ready'
}

const loader = new THREE.TextureLoader()
const cache = new Map<string, Promise<THREE.Texture>>()

function loadTexture(url: string, srgb: boolean): Promise<THREE.Texture> {
	const key = `${url}|${srgb ? 's' : 'l'}`
	let pending = cache.get(key)
	if (!pending) {
		statuses.set(url, 'loading')
		publish()
		pending = new Promise<THREE.Texture>((resolve, reject) => {
			loader.load(
				url,
				(tex) => {
					tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
					tex.anisotropy = 16
					tex.wrapS = THREE.RepeatWrapping
					statuses.set(url, 'ready')
					publish()
					resolve(tex)
				},
				undefined,
				() => {
					cache.delete(key)
					statuses.set(url, 'error')
					publish()
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
	const retry = useSyncExternalStore(
		subscribe,
		() => retryVersion,
		() => 0,
	)
	const [tex, setTex] = useState<THREE.Texture | null>(null)
	useEffect(() => {
		setTex(null)
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
	}, [url, srgb, retry])
	return tex
}
