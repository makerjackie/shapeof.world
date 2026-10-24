// Functional checks only. Screenshots use the user's separate gpu-shot.mjs.
// Never attach to an existing browser or open a visible window.
// node src/components/experiences/worlds/plant-cell/verify-round3.mjs <private-output-dir>
import { chromium } from 'playwright'
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

if (!process.argv[2]) throw new Error('Pass a private output directory.')
const output = resolve(process.argv[2]), base = 'http://127.0.0.1:3241'
const phaseA = process.argv.includes('--phase=a')
const report = { startedAt: new Date().toISOString(), browser: 'dedicated headless Chrome / Metal', checks: {}, performance: {}, errors: [], httpErrors: [], limitations: ['Mobile viewport emulation is not physical phone evidence.', 'FPS measures requestAnimationFrame intervals; screenshots are captured separately with gpu-shot.mjs.'] }
let browser, profile
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const check = (name, pass, evidence) => { report.checks[name] = { pass: Boolean(pass), evidence } }
async function state(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('.pc-scene canvas')
    const result = { data: { ...canvas?.dataset }, heading: document.querySelector('.pc-heading h1')?.textContent, readouts: document.querySelector('.pc-readout')?.textContent, speed: document.querySelector('#pc-time')?.value, label: document.querySelector('.pc-molecular-label')?.textContent }
    const url = performance.getEntriesByType('resource').map(e => e.name).find(url => /\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(url))
    if (!url) return result
    const fiber = await import(url), root = fiber._roots?.get(canvas)?.store?.getState()
    if (!root) return result
    const gl = root.gl.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info')
    result.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    result.camera = root.camera.quaternion.toArray()
    result.render = { ...root.gl.info.render }
    const object = name => { const o = root.scene.getObjectByName(name); return o ? { rotation: o.rotation.toArray().slice(0,3), position: o.position.toArray(), visible:o.visible, count:o.count } : null }
    result.rotor = object('pc-atp-rotor'); result.stator = object('pc-atp-stator')
    return result
  })
}
async function navigate(page, query) {
  await page.goto(`${base}/plant-cell?ghost=0&${query}`, { waitUntil:'domcontentloaded', timeout:60000 })
  await page.locator('.pc-scene canvas[data-scale]').waitFor({ timeout:60000 })
  await wait(2500)
  return state(page)
}
async function fps(page) {
  return page.evaluate(() => new Promise(resolve => {
    const frames=[],start=performance.now();let previous=start
    const tick=now=>{frames.push(now-previous);previous=now;if(now-start<2500)requestAnimationFrame(tick);else{const sorted=frames.slice(1).sort((a,b)=>a-b);resolve({fps:1000*frames.length/(now-start),p95:sorted[Math.floor(sorted.length*.95)],frames:frames.length})}}
    requestAnimationFrame(tick)
  }))
}
try {
  profile = await mkdtemp(join(tmpdir(), 'plant-round3-verify-'))
  const context = await chromium.launchPersistentContext(profile, { channel:'chrome', headless:true, viewport:{width:1600,height:1000},deviceScaleFactor:1, args:['--headless=new','--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--mute-audio','--hide-scrollbars','--disable-background-timer-throttling','--disable-renderer-backgrounding'] })
  browser = context.browser()
  await context.addInitScript(() => performance.setResourceTimingBufferSize(20000))
  const page=await context.newPage()
  const observe = page => {
    page.on('pageerror',e=>report.errors.push(String(e)))
    page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGL|THREE|Uncaught/.test(m.text()))report.errors.push(m.text())})
    page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/assets/posters/'))report.httpErrors.push({url:r.url(),status:r.status()})})
  }
  observe(page)
  for(const [label,scale] of [['hero',-3.86],['handoff',-6.5],['membrane',-6.85],['motor',-7.5]]) {
    const result=await navigate(page,`scale=${scale}`)
    check(`${label} renders`,Math.abs(Number(result.data.scale)-scale)<.002&&result.render?.calls>0,result)
    report.performance[label]=await fps(page)
  }
  const movingA=await state(page);await wait(1600);const movingB=await state(page)
  check('rotor moves; stator holds',JSON.stringify(movingA.rotor?.rotation)!==JSON.stringify(movingB.rotor?.rotation)&&JSON.stringify(movingA.stator?.rotation)===JSON.stringify(movingB.stator?.rotation),{before:movingA,after:movingB})
  await page.selectOption('#pc-time','0');await wait(200)
  const pausedA=await state(page);await wait(700);const pausedB=await state(page)
  check('pause freezes motor',JSON.stringify(pausedA.rotor?.rotation)===JSON.stringify(pausedB.rotor?.rotation),{before:pausedA.rotor,after:pausedB.rotor})
  await page.selectOption('#pc-time','0.001')
  await page.locator('.pc-light-switch').click();await wait(600)
  const darkA=await state(page);await wait(800);const darkB=await state(page)
  check('darkness locks motor',Number(darkB.data.actualPpfd)===0&&JSON.stringify(darkA.rotor?.rotation)===JSON.stringify(darkB.rotor?.rotation),{before:darkA,after:darkB})
  await navigate(page,'scale=-6.2')
  await page.evaluate(()=>{window.__pcCanvas=document.querySelector('.pc-scene canvas');window.__pcSweep={running:true,frames:[]};const sample=()=>{const c=document.querySelector('.pc-scene canvas');window.__pcSweep.frames.push({s:Number(c?.dataset.scale),same:c===window.__pcCanvas});if(window.__pcSweep.running)requestAnimationFrame(sample)};requestAnimationFrame(sample)})
  await page.mouse.move(800,600)
  for(let i=0;i<6;i++){await page.mouse.wheel(0,-200);await wait(250)}
  await wait(1000)
  const sweep=await page.evaluate(()=>{window.__pcSweep.running=false;return window.__pcSweep.frames})
  check('one continuous canvas L3 to L5',sweep.every((f,i)=>f.same&&Number.isFinite(f.s)&&(i===0||f.s<=sweep[i-1].s+.001))&&sweep.at(-1).s<=-7.69,{frames:sweep.length,first:sweep[0],last:sweep.at(-1),maxJump:Math.max(...sweep.slice(1).map((f,i)=>Math.abs(f.s-sweep[i].s)))})
  const orbitA=await state(page)
  await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(950,500,{steps:20});await page.mouse.up();await wait(500)
  const orbitB=await state(page)
  check('molecular orbit responds',JSON.stringify(orbitA.camera)!==JSON.stringify(orbitB.camera),{before:orbitA.camera,after:orbitB.camera})
  if(!phaseA){
    const query=await navigate(page,'scale=-7.5&light=0&speed=0&t=17.5&az=90&el=25&capture=1')
    const overlays=await page.evaluate(()=>[...document.querySelectorAll('.pc-experience [data-experience-overlay]')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none').length)
    check('capture and initial params',Number(query.data.actualPpfd)===0&&query.speed==='0'&&overlays===0&&Math.abs(Number(query.data.yaw)-90)<.01&&Math.abs(Number(query.data.pitch)-25)<.01,{query,visibleOverlays:overlays})
    await navigate(page,'scale=-3.86&speed=60')
    await page.locator('#pc-light').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await wait(150)
    const hint=await page.locator('.pc-light-hint').textContent().catch(()=>null)
    await wait(6200)
    check('hint expires and respects speed',hint&&!hint.includes('×60')&&await page.locator('.pc-light-hint').count()===0,{hint})
  }
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})
  await mobile.addInitScript(() => performance.setResourceTimingBufferSize(20000))
  const phone=await mobile.newPage();observe(phone)
  const phoneState=await navigate(phone,'scale=-7.5')
  report.performance.mobileMotor=await fps(phone)
  check('mobile molecular scene',phoneState.render?.calls>0&&phoneState.heading?.includes('ATP'),phoneState)
  const cdp=await mobile.newCDPSession(phone)
  const touch=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,140,440),touch(2,250,440)]})
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,140-i*4,440),touch(2,250+i*4,440)]});await wait(35)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(500)
  const pinched=await state(phone)
  check('mobile pinch',Number(pinched.data.scale)<Number(phoneState.data.scale)-.05,{before:phoneState.data.scale,after:pinched.data.scale})
  await cdp.detach();await mobile.close()
  check('runtime errors absent',report.errors.length===0&&report.httpErrors.length===0,{errors:report.errors,httpErrors:report.httpErrors})
  report.status=Object.values(report.checks).every(c=>c.pass)?'passed':'failed'
  if(report.status!=='passed')process.exitCode=1
} catch(error){report.status='failed';report.errors.push(String(error?.stack??error));process.exitCode=1}
finally{
  await browser?.close().catch(()=>{})
  if (profile) await rm(profile, { recursive:true, force:true, maxRetries:5, retryDelay:200 }).catch(()=>{})
  report.finishedAt=new Date().toISOString()
  await mkdir(join(output,'logs'),{recursive:true})
  const path=join(output,`logs/round-3.browser${phaseA?'-a':''}.json`)
  await writeFile(path,JSON.stringify(report,null,2)+'\n')
  console.log(`${report.status}: ${path}`)
  console.log(JSON.stringify({failed:Object.entries(report.checks).filter(([,c])=>!c.pass).map(([name])=>name),performance:report.performance,errors:report.errors}))
}
