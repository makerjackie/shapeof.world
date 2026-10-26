// Headless, fresh-profile task rehearsal. Usage: node <this-file> <base-url> <out-dir>
// Actions use visible labels, never injected React state or hidden controls.
import { chromium } from 'playwright'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import assert from 'node:assert/strict'

const [base = 'http://localhost:3252', output] = process.argv.slice(2)
if (!output) throw new Error('Pass an output directory; screenshots are private review artifacts.')
const out = resolve(output)
mkdirSync(out, { recursive: true })
const report = { automated: true, humanComprehension: 'PENDING', base, tasks: [], errors: [], warnings: [] }
for (let attempt = 0; ; attempt++) {
  try { if ((await fetch(`${base}/chip-zoom`)).ok) break } catch { /* server may still be starting */ }
  if (attempt >= 30) throw new Error(`Development server is not ready: ${base}`)
  await new Promise(resolve => setTimeout(resolve, 500))
}

async function session(id, mobile, run, locale = 'zh') {
  const profile = mkdtempSync(join(tmpdir(), 'chip-zoom-qa-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: true,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1600, height: 1000 },
    deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: locale === 'zh' ? 'zh-CN' : 'en-US',
    args: ['--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--hide-scrollbars'],
  })
  try {
    const page = context.pages()[0]
    page.on('pageerror', error => report.errors.push({ id, message: error.message }))
    page.on('console', message => { if (message.type() === 'warning') report.warnings.push(message.text()) })
    const start = performance.now()
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}chip-zoom`, { waitUntil: 'networkidle' })
    await page.locator('.cz-world[data-ready="true"]').waitFor({ timeout: 30000 })
    const loadSeconds = (performance.now() - start) / 1000
    const result = { id, viewport: mobile ? '390×844' : '1600×1000', loadSeconds, steps: [], seconds: 0, pass: false }
    result.gpu = await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2')
      const info = gl?.getExtension('WEBGL_debug_renderer_info')
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown'
    })
    const screen = async name => {
      const file = join(out, `round-1-${id}-${name}.png`)
      await page.screenshot({ path: file })
      return file
    }
    await screen('00-start')
    const clock = performance.now()
    const step = async (label, action) => {
      const started = performance.now()
      await action()
      await page.waitForTimeout(650) // allow the physical removal animation to settle
      result.steps.push({ label, seconds: (performance.now() - started) / 1000, screenshot: await screen(String(result.steps.length + 1).padStart(2, '0')) })
    }
    await run(page, step)
    result.seconds = (performance.now() - clock) / 1000
    result.pass = true
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert.ok(dimensions.width <= dimensions.viewport, 'No horizontal page overflow')
    report.tasks.push(result)
  } finally {
    await context.close()
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 })
  }
}

try {
  for (const mobile of [false, true]) {
    await session(mobile ? 'task-mobile-peel' : 'task-desktop-peel', mobile, async (page, step) => {
      for (let i = 1; i <= 5; i++) {
        await step(`剥开第 ${i} 层`, async () => {
          await page.getByRole('button', { name: /剥开最上层/ }).click()
          assert.equal(await page.locator('.cz-world').getAttribute('data-peeled'), String(i))
        })
      }
      assert.ok(await page.getByRole('heading', { name: '已到晶体管层' }).isVisible())
      await step('放大真实单元，看清有源区与栅交叉', async () => {
        await page.getByRole('button', { name: '放大一个真实单元' }).click()
        assert.equal(await page.locator('.cz-world').getAttribute('data-view'), 'cell')
        assert.ok(await page.getByText(/sky130_fd_sc_hd__inv_2/).isVisible())
      })
      const button = page.getByRole('button', { name: '让一个晶体管导通' })
      const box = await button.boundingBox()
      assert.ok(box && box.y >= 0 && box.y + box.height <= (mobile ? 844 : 1000))
    })
  }
  await session('task-transistor', false, async (page, step) => {
    await step('进入晶体管', () => page.getByRole('button', { name: '原理示意 晶体管' }).click())
    assert.equal(await page.locator('.cz-world').getAttribute('data-flowing'), 'false')
    await step('给栅极加电压', async () => {
      await page.getByRole('button', { name: /给栅极加电压/ }).click()
      assert.equal(await page.locator('.cz-world').getAttribute('data-flowing'), 'true')
      assert.ok(await page.getByText('栅源电压超过阈值，硅表面形成沟道。漏源电压推动电子从源极流向漏极。').isVisible())
    })
    await step('移去漏源偏压：保持沟道但无电流', async () => {
      await page.getByRole('button', { name: /断开漏源电压/ }).click()
      assert.equal(await page.locator('.cz-world').getAttribute('data-flowing'), 'false')
      assert.ok(await page.getByText('沟道已经形成；漏源电压为零，没有持续的净电流。').isVisible())
    })
    await step('恢复漏源偏压', async () => {
      await page.getByRole('button', { name: /接上漏源电压/ }).click()
      assert.equal(await page.locator('.cz-world').getAttribute('data-flowing'), 'true')
    })
    await step('撤去栅压', async () => {
      await page.getByRole('button', { name: /撤去栅极电压/ }).click()
      assert.equal(await page.locator('.cz-world').getAttribute('data-flowing'), 'false')
    })
  })
  await session('english', true, async (page, step) => {
    const text = await page.locator('.cz-world').innerText()
    assert.ok(!/[\u3400-\u9fff]/u.test(text), `Untranslated text: ${text.match(/[\u3400-\u9fff]+/gu)}`)
    await step('Peel the top layer', () => page.getByRole('button', { name: /Peel the top layer/ }).click())
    await step('Switch to transistor', () => page.getByRole('button', { name: 'Schematic Transistor' }).click())
    await step('Apply gate voltage', () => page.getByRole('button', { name: /Apply gate voltage/ }).click())
    assert.equal(await page.locator('.cz-world').getAttribute('data-flowing'), 'true')
  }, 'en')
  assert.deepEqual(report.errors, [])
} finally {
  report.warnings = [...new Set(report.warnings)]
  writeFileSync(join(out, 'round-1-playwright.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report.tasks.map(({ id, steps, seconds, pass }) => ({ id, steps: steps.length, seconds, pass }))))
}
