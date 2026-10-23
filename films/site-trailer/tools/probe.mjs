import { createRequire } from 'node:module'
const require = createRequire('/Volumes/DevSSD/Projects/code/shapeof.world/package.json')
const { chromium } = require('playwright')
const mode = process.argv[2]
const opts = mode === 'headed' ? { channel: 'chrome', headless: false, args: ['--window-size=1920,1180'] }
  : mode === 'chrome-new-headless' ? { channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }
  : { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] }
const t0 = Date.now()
const b = await chromium.launch(opts)
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const info = await p.evaluate(() => {
  const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl')
  if (!gl) return 'no gl'
  const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
})
console.log(mode, 'renderer:', info)
await p.goto('https://shapeof.world/black-hole-flyby?capture=1&ghost=0', { waitUntil: 'load', timeout: 90000 })
await p.waitForTimeout(8000)
const fps = await p.evaluate(() => new Promise(r => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(f); else r(n / 2) }; requestAnimationFrame(f) }))
console.log(mode, 'rAF fps:', fps, 'elapsed', Date.now() - t0)
await p.screenshot({ path: `/Volumes/DevSSD/Projects/code/shapeof.world-reports/site-trailer/stills/probe-${mode}.jpg`, quality: 80 })
await b.close()
