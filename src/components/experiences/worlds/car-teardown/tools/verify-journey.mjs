// Run at the repo root; one headless Chrome, an isolated temporary profile.
import {chromium} from 'playwright'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
const profile = mkdtempSync(`${tmpdir()}/car-journey-`)
const context = await chromium.launchPersistentContext(profile, {channel: 'chrome', headless: true, viewport: {width: 1600, height: 1000}})
const page = await context.newPage(),
	errors = [],
	results = []
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000))
const out = process.env.CAR_EVIDENCE_DIR || '.local/car-evidence'
page.on('pageerror', (e) => errors.push(String(e)))
const shot = async (name) => {
	await page.screenshot({path: `${out}/shots/round-2-task-${name}.png`})
}
const slider = async (name, value) => page.getByRole('slider', {name, exact: true}).fill(String(value))
async function enter(mobile = false) {
	await page.setViewportSize(mobile ? {width: 390, height: 844} : {width: 1600, height: 1000})
	const cdp = await context.newCDPSession(page)
	await cdp.send('Network.clearBrowserCache')
	const start = Date.now()
	await page.goto('http://127.0.0.1:3221/car-teardown')
	await page.waitForFunction(() => document.querySelector('.ct-world')?.dataset.ready === 'true')
	return start
}
const choose = async (name) => {
	await page.getByRole('button', {name, exact: true}).click()
	await page.waitForTimeout(600)
}
try {
	for (const mobile of [false, true]) {
		const start = await enter(mobile),
			id = mobile ? '5' : '1'
		await shot(`${id}-01-entry`)
		await choose('发动机')
		await page.waitForFunction(() => window.__carScene?.userData.carInspection?.engineLoaded)
		const a = await page.evaluate(() => window.__carScene.userData.carInspection.angle)
		await page.waitForTimeout(500)
		const b = await page.evaluate(() => window.__carScene.userData.carInspection.angle)
		if (a === b) throw Error('Engine did not animate')
		await page.getByText('曲轴转一圈，每个活塞上下一次。两圈完成四个冲程。', {exact: true}).waitFor()
		await shot(`${id}-02-engine`)
		results.push({
			task: Number(id),
			steps: 1,
			seconds: (Date.now() - start) / 1000,
			pass: Date.now() - start < 30000,
			answer: '每圈上一次、下一次；两圈四冲程',
			motion: [a, b],
		})
	}
	{
		const start = await enter()
		await shot('2-01-entry')
		await page.getByRole('button', {name: /^拆开/}).click()
		await page.waitForFunction(() => Number(document.querySelector('.ct-world').dataset.explode) > 0.99)
		await shot('2-02-explode')
		await choose('变速箱')
		await page.waitForFunction(() => window.__carScene.userData.carInspection.gear === 1)
		const first = await page.evaluate(() => window.__carScene.userData.carInspection.wheelRpm)
		await shot('2-03-gearbox')
		await page.getByRole('button', {name: '3 挡', exact: true}).click()
		await page.waitForFunction(() => window.__carScene.userData.carInspection.gear === 3)
		const third = await page.evaluate(() => window.__carScene.userData.carInspection.wheelRpm)
		await shot('2-04-third')
		results.push({task: 2, steps: 3, seconds: (Date.now() - start) / 1000, pass: third > first, first, third, ratio: third / first})
	}
	{
		const start = await enter()
		await shot('3-01-entry')
		await choose('转向')
		await shot('3-02-steering')
		await slider('方向盘角度', 400)
		await page.waitForTimeout(600)
		await shot('3-03-turned')
		const text = await page.locator('.ct-steering-panel').innerText()
		if (!text.includes('内侧轮走的圆更小')) throw Error('Turning explanation missing')
		results.push({task: 3, steps: 2, seconds: (Date.now() - start) / 1000, pass: true, text})
	}
	{
		const start = await enter()
		await shot('4-01-entry')
		await choose('刹车')
		await shot('4-02-brakes')
		await choose('前卡钳特写')
		await slider('踏板力', 300)
		await page.waitForTimeout(600)
		await shot('4-03-clamped')
		const text = await page.locator('.ct-brake-panel').innerText()
		results.push({task: 4, steps: 3, seconds: (Date.now() - start) / 1000, pass: text.includes('94.4'), text})
	}
	// Actual rendered CAD binds at successive angles, rather than a duplicate animation.
	await choose('发动机')
	await page.waitForFunction(() => window.__carScene.userData.carInspection?.engineLoaded)
	const states = []
	for (const angle of [0, 90, 180, 470, 700]) {
		await slider('曲轴角度', angle)
		await page.waitForTimeout(100)
		states.push(
			await page.evaluate(() => {
				const scene = window.__carScene.getObjectByName('cad-engine').children[0]
				return {
					angle: scene.userData.crankAngle,
					nodes: scene.children
						.filter((n) => n.userData.cylinder === 1 && ['piston', 'rod', 'valve'].includes(n.userData.kind))
						.map((n) => ({name: n.name, kind: n.userData.kind, side: n.userData.side, p: n.position.toArray(), r: n.rotation.x})),
				}
			}),
		)
	}
	const pistons = states.map((s) => s.nodes.find((n) => n.name.includes('Hollow_skirted_piston'))?.p[1])
	if (Math.abs(pistons[0] - pistons[2] - 0.1) > 1e-6) throw Error('Rendered stroke is not 100 mm')
	await shot('cad-ignition')
	// Request timing proves that CAD and chassis are deferred on a clean entry.
	await enter()
	const initial = await page.evaluate(() =>
		performance
			.getEntriesByType('resource')
			.filter((r) => /car-assets\/v2/.test(r.name))
			.map((r) => ({url: r.name.split('/v2/')[1], encoded: r.encodedBodySize, transfer: r.transferSize})),
	)
	if (!initial.some((r) => r.url === 'car.glb')) throw Error('No body resource timing evidence')
	if (initial.some((r) => r.url === 'engine.glb')) throw Error('Engine was loaded eagerly')
	await choose('发动机')
	await page.waitForFunction(() => window.__carScene.userData.carInspection?.engineLoaded)
	const complete = await page.evaluate(() =>
		performance
			.getEntriesByType('resource')
			.filter((r) => /car-assets\/v2/.test(r.name))
			.map((r) => ({url: r.name.split('/v2/')[1], encoded: r.encodedBodySize, transfer: r.transferSize})),
	)
	const result = {results, states, initial, complete, errors, kind: 'Automated novice-path proxy; not a human comprehension study'}
	writeFileSync(`${out}/logs/round-2-journey.json`, JSON.stringify(result, null, 2))
	console.log(
		JSON.stringify(
			results.map(({text, ...r}) => r),
			null,
			2,
		),
	)
	if (errors.length) throw Error(errors.join('\n'))
} finally {
	await context.close()
	rmSync(profile, {recursive: true, force: true})
}
