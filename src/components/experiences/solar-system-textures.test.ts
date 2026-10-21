import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { useLazyTexture, useTextureStatus, retryFailedTextures } from './solar-system-textures'

it('reports a failed texture, retries on request, and then exposes the loaded texture', async () => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
	const url = '/assets/test-retry-texture.jpg'
	let attempts = 0
	const texture = new THREE.Texture<HTMLImageElement>(document.createElement('img'))
	const mock = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad, _progress, onError) => {
		queueMicrotask(() => {
			if (++attempts === 1) onError?.(new Error('offline'))
			else onLoad?.(texture)
		})
		return texture
	})
	function Probe() {
		const loaded = useLazyTexture(url)
		const status = useTextureStatus([url])
		return createElement('span', null, `${status}:${Boolean(loaded)}`)
	}
	const container = document.createElement('div')
	const root = createRoot(container)
	try {
		await act(async () => {
			root.render(createElement(Probe))
		})
		expect(container.textContent).toBe('error:false')
		await act(async () => {
			retryFailedTextures()
		})
		expect(container.textContent).toBe('ready:true')
		expect(attempts).toBe(2)
	} finally {
		await act(async () => root.unmount())
		mock.mockRestore()
		vi.unstubAllGlobals()
		texture.dispose()
	}
})
