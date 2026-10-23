// 截图工具：通过 CDP 驱动无头 Chrome，支持真实等待、滚动与整页截图。
// 用法: node scripts/ui-shot.mjs <url> <out.png> [options]
//   --width=1600 --height=1000   视口尺寸
//   --wait=3000                  加载后真实等待毫秒
//   --scroll=<y|#selector>       截图前滚动到指定位置
//   --full                       整页截图（captureBeyondViewport）
//   --click=<selector>           截图前点击元素
//   --mobile                     等价于 --width=390 --height=844
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const args = process.argv.slice(2)
const url = args[0]
const out = args[1]
if (!url || !out) {
  console.error('usage: node scripts/ui-shot.mjs <url> <out.png> [--width=] [--height=] [--wait=] [--scroll=] [--full] [--click=] [--mobile]')
  process.exit(1)
}
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}
const has = (name) => args.includes(`--${name}`)
const mobile = has('mobile')
const width = Number(opt('width', mobile ? 390 : 1600))
const height = Number(opt('height', mobile ? 844 : 1000))
const wait = Number(opt('wait', 2500))
const scroll = opt('scroll', null)
const clickSel = opt('click', null)
const full = has('full')

const port = 9222 + Math.floor(Math.random() * 500)
// 独立的临时配置目录：不带它，Chrome 会把请求交给正在运行的那个 Chrome，在作者屏幕上弹出窗口。
const profile = mkdtempSync(join(tmpdir(), 'ui-shot-'))
const chrome = spawn(CHROME, [
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--window-size=${width},${height}`,
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const body = await new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path: '/json/list' }, (res) => {
          let data = ''
          res.on('data', (c) => (data += c))
          res.on('end', () => resolve(data))
        }).on('error', reject)
      })
      const pages = JSON.parse(body)
      const page = pages.find((p) => p.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch { /* retry */ }
    await sleep(200)
  }
  throw new Error('chrome devtools not ready')
}

async function main() {
  const ws = new WebSocket(await getWsUrl())
  let seq = 0
  const pending = new Map()
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  await new Promise((r) => { ws.onopen = r })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url })
  await sleep(wait)

  const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true })).result?.value

  if (clickSel) await evalJs(`document.querySelector(${JSON.stringify(clickSel)})?.click()`)
  if (scroll) {
    if (scroll.startsWith('#')) {
      await evalJs(`document.querySelector(${JSON.stringify(scroll)})?.scrollIntoView({behavior:'instant',block:'start'})`)
    } else {
      await evalJs(`window.scrollTo({top:${Number(scroll)},behavior:'instant'})`)
    }
    await sleep(1200)
  }

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: full,
  })
  writeFileSync(out, Buffer.from(shot.data, 'base64'))
  const size = await evalJs('JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,y:window.scrollY})')
  console.log(`${out} · page ${size}`)
  ws.close()
  chrome.kill()
  rmSync(profile, { recursive: true, force: true })
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  chrome.kill()
  rmSync(profile, { recursive: true, force: true })
  process.exit(1)
})
