import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceCamera = readFileSync(
  resolve('vendor/black-hole-shader/black_hole/demo/camera_view/camera_view.js'),
  'utf8',
)
const bundledDemo = readFileSync(resolve('public/vendor/black-hole/demo.html'), 'utf8')
const cameraBlock = bundledDemo.slice(
  bundledDemo.indexOf('class CameraView'),
  bundledDemo.indexOf('(function(model) {', bundledDemo.indexOf('class CameraView')),
)

describe('black-hole flyby camera input', () => {
  it('uses pointer capture and client coordinates for continuous touch rotation', () => {
    for (const code of [sourceCamera, cameraBlock]) {
      expect(code).toContain("this.canvas.style.touchAction = 'none'")
      expect(code).toContain("this.canvas.addEventListener('pointerdown'")
      expect(code).toContain('this.canvas.setPointerCapture(event.pointerId)')
      expect(code).toContain('event.clientX')
      expect(code).toContain('event.clientY')
      expect(code).toContain('this.canvas.dataset.cameraYaw')
      expect(code).toContain('this.canvas.dataset.cameraPitch')
      expect(code).not.toContain('event.screenX')
      expect(code).not.toContain('event.screenY')
    }
  })

  it('keeps a non-passive touch fallback and reports real iframe interactions', () => {
    for (const code of [sourceCamera, cameraBlock]) {
      expect(code).toContain("this.canvas.addEventListener('touchstart'")
      expect(code).toContain("window.addEventListener('touchmove'")
      expect(code).toContain('{passive: false}')
    }
    expect(cameraBlock).toContain("type: 'oneworld:black-hole:interaction'")
  })

  it('keeps an interactive poster fallback when advanced WebGL extensions are missing', () => {
    for (const code of [sourceCamera, cameraBlock]) {
      expect(code).toContain('this.installFallback()')
      expect(code).toContain("url('source-poster.jpg')")
      expect(code).toContain("type: 'oneworld:black-hole:ready', fallback: true")
      expect(code).toContain('this.canvas.style.backgroundPosition')
    }
  })

  it('reports fallback readiness in the iframe task before the host waits for paint', () => {
    for (const code of [sourceCamera, cameraBlock]) {
      const fallback = code.slice(code.indexOf('  installFallback()'), code.indexOf('  onRender()'))
      const notification = fallback.slice(
        fallback.lastIndexOf('    renderFallbackPose();'),
        fallback.lastIndexOf('\n  }'),
      )
      const messages: unknown[] = []
      const pendingFrames: FrameRequestCallback[] = []
      const iframeWindow = {
        location: { origin: 'http://127.0.0.1:8000' },
        parent: { postMessage: (message: unknown) => messages.push(message) },
        requestAnimationFrame: (callback: FrameRequestCallback) => pendingFrames.push(callback),
      }
      // WebKit can assign the parent as MessageEvent.source inside the RAF
      // callback. Readiness must leave the iframe before that callback runs.
      new Function('window', 'renderFallbackPose', notification)(iframeWindow, () => {})
      expect(messages).toEqual([{ type: 'oneworld:black-hole:ready', fallback: true }])
    }
  })

})
