import * as T from 'three'
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js'
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js'
import {carAssetUrl, CAR_ASSET_BYTES, type AssetProgress} from './asset-config'

type Progress = (state: AssetProgress) => void
const received = new Map<string, {loaded: number; total: number}>()
const pending = new Map<string, Promise<ArrayBuffer>>()
async function bytes(file: string, phase: AssetProgress['phase'], progress: Progress) {
	const url = carAssetUrl(file)
	let task = pending.get(url)
	if (!task) {
		task = (async () => {
			const response = await fetch(url)
			if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
			const total = Number(response.headers.get('content-length')) || 0
			const reader = response.body?.getReader()
			if (!reader) return response.arrayBuffer()
			const chunks: Uint8Array[] = []
			let loaded = 0
			while (true) {
				const {done, value} = await reader.read()
				if (done) break
				chunks.push(value)
				loaded += value.length
				received.set(file, {loaded, total})
				const files = phase === 'body' ? ['car.glb', 'studio.hdr'] : ['engine.glb']
				const sum = files.reduce(
					(a, f) => {
						const v = received.get(f)
						return {loaded: a.loaded + (v?.loaded ?? 0), total: a.total + (v?.total || CAR_ASSET_BYTES[f] || 0)}
					},
					{loaded: 0, total: 0},
				)
				progress({phase, ...sum, ready: false})
			}
			const result = new Uint8Array(loaded)
			let offset = 0
			for (const chunk of chunks) {
				result.set(chunk, offset)
				offset += chunk.length
			}
			return result.buffer
		})()
		pending.set(url, task)
		task.catch(() => pending.delete(url))
	}
	return task
}
export async function loadCarAsset(
	file: string,
	renderer: T.WebGLRenderer,
	phase: AssetProgress['phase'],
	progress: Progress,
): Promise<GLTF> {
	const draco = new DRACOLoader().setDecoderPath(carAssetUrl('decoders/draco/gltf/'))
	const ktx = new KTX2Loader().setTranscoderPath(carAssetUrl('decoders/basis/')).detectSupport(renderer)
	try {
		const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx)
		const data = await bytes(file, phase, progress)
		return await loader.parseAsync(data, CAR_RESOURCE_PATH())
	} finally {
		draco.dispose()
		ktx.dispose()
	}
}
const CAR_RESOURCE_PATH = () => carAssetUrl('')
export async function loadStudio(progress: Progress) {
	const data = await bytes('studio.hdr', 'body', progress)
	const parsed = new RGBELoader().parse(data)
	const texture = new T.DataTexture(parsed.data, parsed.width, parsed.height, T.RGBAFormat, parsed.type)
	texture.mapping = T.EquirectangularReflectionMapping
	texture.colorSpace = T.LinearSRGBColorSpace
	texture.minFilter = T.LinearFilter
	texture.magFilter = T.LinearFilter
	texture.needsUpdate = true
	return texture
}
