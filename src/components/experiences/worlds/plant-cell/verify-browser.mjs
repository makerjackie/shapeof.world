// Functional checks only. Screenshots use the user's separate gpu-shot.mjs.
// Never attach to an existing browser or open a visible window.
// node src/components/experiences/worlds/plant-cell/verify-browser.mjs <private-output-dir>
import { chromium } from 'playwright'
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

if (!process.argv[2]) throw new Error('Pass a private output directory.')
const output = resolve(process.argv[2]), base = 'http://127.0.0.1:3241'
const reportName = process.argv.find(arg=>arg.startsWith('--report='))?.slice(9) ?? 'browser.json'
if (!/^[a-z0-9_.-]+\.json$/i.test(reportName)) throw new Error('Report must be a JSON filename.')
const report = { startedAt: new Date().toISOString(), browser: 'dedicated headless Chrome / Metal', checks: {}, performance: {}, errors: [], httpErrors: [], limitations: ['Mobile viewport emulation is not physical phone evidence.', 'FPS measures requestAnimationFrame intervals; screenshots are captured separately with gpu-shot.mjs.'] }
let browser, profile
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const check = (name, pass, evidence) => {
  report.checks[name] = { pass: Boolean(pass), evidence }
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
}
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
    const object = name => { const o = root.scene.getObjectByName(name); return o ? { rotation: o.rotation.toArray().slice(0,3), position: o.position.toArray(), scale:o.scale.toArray(), visible:o.visible, count:o.count } : null }
    result.waterWall=object('cell-water-wall');result.protoplast=object('cell-water-protoplast');
    result.lights=root.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,intensity:o.intensity}));
    result.fov=root.camera.fov;result.viewOffset=root.camera.view?.offsetX;
    result.cargo={}; for(const name of ['wall-chloroplasts','streaming-mitochondria','streaming-peroxisomes']){const mesh=root.scene.getObjectByName(name);if(mesh)result.cargo[name]=Array.from(mesh.instanceMatrix.array.slice(12,15))}
    const chl=root.scene.getObjectByName('wall-chloroplasts');if(chl){const heights=Array.from({length:chl.count},(_,i)=>chl.instanceMatrix.array[i*16+13]).sort((a,b)=>b-a);result.topMean=heights.slice(0,40).reduce((a,b)=>a+b,0)/40}
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
async function objectPoint(page, name, local = [0,0,0]) {
  return page.evaluate(async ({name,local}) => {
    const canvas = document.querySelector('.pc-scene canvas')
    const url = performance.getEntriesByType('resource').map(e=>e.name).find(url=>/\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(url))
    const fiber = await import(url), root = fiber._roots.get(canvas).store.getState()
    const object = root.scene.getObjectByName(name)
    if (!object) return null
    const point = root.camera.position.clone().set(...local)
    object.localToWorld(point); point.project(root.camera)
    const rect=canvas.getBoundingClientRect()
    return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2}
  },{name,local})
}
async function fps(page) {
  return page.evaluate(() => new Promise(resolve => {
    const frames=[],start=performance.now();let previous=start
    const tick=now=>{frames.push(now-previous);previous=now;if(now-start<2500)requestAnimationFrame(tick);else{const sorted=frames.slice(1).sort((a,b)=>a-b);resolve({fps:1000*frames.length/(now-start),p95:sorted[Math.floor(sorted.length*.95)],frames:frames.length})}}
    requestAnimationFrame(tick)
  }))
}
try {
  profile = await mkdtemp(join(tmpdir(), 'plant-cell-verify-'))
  // Persistent context passes this new profile as Chrome's --user-data-dir.
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
  const litLights=(await state(page)).lights
  const movingA=await state(page);await wait(1600);const movingB=await state(page)
  check('rotor moves; stator holds',JSON.stringify(movingA.rotor?.rotation)!==JSON.stringify(movingB.rotor?.rotation)&&JSON.stringify(movingA.stator?.rotation)===JSON.stringify(movingB.stator?.rotation),{before:movingA,after:movingB})
  await page.selectOption('#pc-time','0');await wait(200)
  const pausedA=await state(page);await wait(700);const pausedB=await state(page)
  check('pause freezes motor',JSON.stringify(pausedA.rotor?.rotation)===JSON.stringify(pausedB.rotor?.rotation),{before:pausedA.rotor,after:pausedB.rotor})
  await page.selectOption('#pc-time','0.001')
  await page.locator('.pc-light-switch').click();await wait(600)
  const darkA=await state(page);await wait(800);const darkB=await state(page)
  check('darkness locks motor',Number(darkB.data.actualPpfd)===0&&JSON.stringify(darkA.rotor?.rotation)===JSON.stringify(darkB.rotor?.rotation),{before:darkA,after:darkB})
  check('molecular display lights stay on in darkness',JSON.stringify(darkB.lights)===JSON.stringify(litLights),{lit:litLights,dark:darkB.lights})
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
  {
    const query=await navigate(page,'scale=-7.5&light=0&speed=0&t=17.5&az=90&el=25&capture=1')
    const overlays=await page.evaluate(()=>[...document.querySelectorAll('.pc-experience [data-experience-overlay]')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none').length)
    check('capture and initial params',Number(query.data.actualPpfd)===0&&query.speed==='0'&&overlays===0&&Math.abs(Number(query.data.yaw)-90)<.01&&Math.abs(Number(query.data.pitch)-25)<.01,{query,visibleOverlays:overlays})
    await navigate(page,'scale=-3.86&speed=60')
    await page.locator('#pc-light').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await wait(150)
    const hint=await page.locator('.pc-light-hint').textContent().catch(()=>null)
    await wait(6200)
    check('hint expires and respects speed',hint&&!hint.includes('×60')&&await page.locator('.pc-light-hint').count()===0,{hint})
    await navigate(page,'scale=-3.86&speed=0')
    const nucleus = await objectPoint(page,'cell-nucleus')
    let organelle=null
    // The nucleus center may lie on the removed half of the section. Probe its
    // exposed rim instead of assuming the center is a visible raycast target.
    if(nucleus) for(const [dx,dy] of [[0,0],[20,0],[-20,0],[0,20],[0,-20],[25,25],[-25,-25]]) {
      await page.mouse.move(nucleus.x+dx,nucleus.y+dy); await wait(100)
      organelle=await page.locator('[data-organelle-label]').textContent({timeout:250}).catch(()=>null)
      if(organelle)break
    }
    check('L2 organelle inspection',Boolean(organelle),{nucleus,organelle})
    await page.mouse.move(20,60)
    if(!await page.locator('[data-pc-guide]').isVisible()) await page.locator('.pc-freebar .experience-freebar-summary').click()
    await page.locator('[data-pc-guide]').click();await page.waitForFunction(()=>Number(document.querySelector('.pc-scene canvas')?.dataset.scale)>-.65,{},{timeout:20000})
    const guideOpen=await page.locator('.guide-tour').isVisible().catch(()=>false)
    const guideState=await state(page)
    await page.mouse.move(750,450);await page.mouse.down();await page.mouse.move(800,460);await page.mouse.up();await wait(300)
    const guideClosed=await page.locator('.guide-tour').isVisible().catch(()=>false)
    check('optional guide and canvas takeover',guideOpen&&!guideClosed&&Number(guideState.data.scale)>-.7,{guideOpen,guideClosed,scale:guideState.data.scale})
    await navigate(page,'scale=-7.34&speed=0')
    const motorPoint=await objectPoint(page,'atp-heavy-atoms',[0,6,0])
    if(motorPoint){await page.mouse.click(motorPoint.x,motorPoint.y);await wait(300)}
    const molecularLabel=await page.locator('[data-molecule-label]').textContent().catch(()=>null)
    check('molecular inspection',Boolean(molecularLabel?.includes('6FKF')),{motorPoint,molecularLabel})
  }


  await navigate(page,'scale=-3.86&speed=60')
  await page.locator('#pc-light').focus();await page.keyboard.press('End')
  let startSim=Number((await state(page)).data.simulationSeconds)
  await page.waitForFunction(t=>Number(document.querySelector('canvas').dataset.simulationSeconds)>=t+300,startSim,{timeout:20000})
  const strong=await state(page)
  await page.locator('#pc-light').focus();await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight')
  startSim=Number((await state(page)).data.simulationSeconds)
  await page.waitForFunction(t=>Number(document.querySelector('canvas').dataset.simulationSeconds)>=t+300,startSim,{timeout:20000})
  const weak=await state(page)
  check('chloroplasts relocate under changed light',weak.topMean>strong.topMean+.1,{strong:strong.topMean,weak:weak.topMean})
  await navigate(page,'scale=-3.86&speed=3600')
  await wait(600)
  check('fast time preserves the manual lamp',Number((await state(page)).data.actualPpfd)===400,(await state(page)).data)
  if(!await page.locator('[data-pc-day-cycle]').isVisible())await page.locator('.pc-freebar .experience-freebar-summary').click()
  await page.locator('[data-pc-day-cycle]').click()
  const dayStart=Number((await state(page)).data.simulationSeconds),cycle=[]
  while(Number((await state(page)).data.simulationSeconds)-dayStart<86400&&cycle.length<160){await wait(300);const d=(await state(page)).data;cycle.push({time:Number(d.simulationSeconds),light:Number(d.actualPpfd),starch:Number(d.starch)})}
  const starchValues=cycle.map(c=>c.starch), peak=Math.max(...starchValues),low=Math.min(...starchValues)
  check('day and night cycle accumulates and consumes starch',cycle.at(-1).time-dayStart>=86400&&cycle.some(c=>c.light===0)&&cycle.some(c=>c.light>300)&&peak-low>.05,{cycle})

  await navigate(page,'scale=-3.86&speed=1')
  const flowA=await state(page);await wait(2000);const flowB=await state(page)
  const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))
  check('hero perspective and cytoplasmic streaming',flowB.fov>=28&&flowB.fov<=32&&distance(flowA.cargo['streaming-mitochondria'],flowB.cargo['streaming-mitochondria'])>1,{a:flowA.cargo,b:flowB.cargo,fov:flowB.fov})
  await page.selectOption('#pc-time','0');await wait(300)
  const stopA=await state(page);await wait(800);const stopB=await state(page)
  check('pause freezes physiology and cargo',stopA.data.simulationSeconds===stopB.data.simulationSeconds&&JSON.stringify(stopA.cargo)===JSON.stringify(stopB.cargo),{a:stopA.cargo,b:stopB.cargo})
  await page.selectOption('#pc-time','3600')
  if(!await page.locator('[data-water=drought]').isVisible())await page.locator('.pc-freebar .experience-freebar-summary').click()
  await page.locator('[data-water=drought]').click()
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.waterPsi)<-1.7999,{},{timeout:30000})
  const drought=await state(page)
  check('drought collapses wall and protoplast together',Number(drought.data.waterVolume)<.70&&JSON.stringify(drought.waterWall.scale)===JSON.stringify(drought.protoplast.scale)&&drought.readouts.includes('0.00 MPa'),drought)
  await page.locator('[data-water=normal]').click()
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.waterVolume)>.9999,{},{timeout:15000})
  const recovered=await state(page)
  check('rehydration restores volume',Number(recovered.data.waterVolume)===1,recovered.data)
  await page.locator('[data-water=saltwater]').click()
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.waterVolume)<.511,{},{timeout:15000})
  // Snapshot-driven geometry/readouts refresh at 5 Hz, after the frame model.
  await page.waitForFunction(()=>document.querySelector('.pc-readout')?.textContent.includes('-2.44'),{},{timeout:5000})
  await wait(250)
  const salt=await state(page)
  check('saltwater shrinks protoplast inside unchanged wall',salt.waterWall.scale.every(v=>Math.abs(v-1)<.0001)&&salt.protoplast.scale[0]<.77,salt)
  await navigate(page,'scale=-3.86&water=saltwater&speed=0')
  // Probe the exposed gap; thin filaments are also checked by geometry below.
  const gapPoint=await objectPoint(page,'cell-saline-gap',[13.3,16,-5])
  if(gapPoint){await page.mouse.move(gapPoint.x,gapPoint.y);await wait(250)}
  const gapLabel=await page.locator('[data-organelle-label]').textContent().catch(()=>null)
  check('saltwater gap inspection',Boolean(gapLabel?.includes('外液')||gapLabel?.includes('赫氏')), {gapPoint,gapLabel})
  await navigate(page,'scale=-4.6&water=saltwater&speed=0&az=60&el=15')
  const strandPoints=await page.evaluate(async()=>{
    const canvas=document.querySelector('canvas'),url=performance.getEntriesByType('resource').map(e=>e.name).find(u=>/\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(u))
    const fiber=await import(url),root=fiber._roots.get(canvas).store.getState(),mesh=root.scene.getObjectByName('cell-hechtian-strands'),positions=mesh.geometry.getAttribute('position'),points=[]
    // Midpoint of each rendered tube; opposite vertices cancel the radius.
    for(let i=0;i<40;i++){
      const a=i*45+20,b=a+2,p=root.camera.position.clone().set((positions.getX(a)+positions.getX(b))/2,(positions.getY(a)+positions.getY(b))/2,(positions.getZ(a)+positions.getZ(b))/2)
      mesh.localToWorld(p)
      if(mesh.material.clippingPlanes.some(plane=>plane.distanceToPoint(p)<0))continue
      p.project(root.camera);const x=(p.x+1)*800,y=(1-p.y)*500
      if(x>330&&x<1450&&y>180&&y<820)points.push({x,y})
    }
    return points
  })
  let strandLabel=null
  for(const p of strandPoints){await page.mouse.move(p.x,p.y);await wait(150);strandLabel=await page.locator('[data-organelle-label=cell-hechtian-strands]').textContent({timeout:250}).catch(()=>null);if(strandLabel)break}
  check('Hechtian strand inspection',Boolean(strandLabel),{candidates:strandPoints.length,strandLabel})
  await navigate(page,'scale=-3.86&water=drought&wt=.5&speed=0')
  check('water progress URL initializes intermediate pressure',Math.abs(Number((await state(page)).data.waterPsi)+1.1)<.001,(await state(page)).data)
  await navigate(page,'scale=-3.86&capture=1')
  const centered=await state(page)
  check('capture removes desktop panel offset',centered.viewOffset===0,{viewOffset:centered.viewOffset})
  await page.goto(`${base}/en/plant-cell?scale=-3.86&water=saltwater&speed=0&ghost=0`)
  await page.waitForFunction(()=>document.querySelector('.pc-heading h1')?.textContent==='Mesophyll cell',{},{timeout:20000})
  const english=await state(page)
  check('English water readouts',english.readouts.includes('Relative cell volume')&&!english.readouts.includes('水势'),{readouts:english.readouts})
  await navigate(page,'scale=-.62')
  const leafCanvas=await page.locator('canvas').elementHandle()
  for(const label of ['叶片截面','叶肉细胞','叶绿体','类囊体膜','ATP 合酶']){await page.locator('.pc-layer-names button').filter({hasText:label}).click();await wait(3200)}
  const same=await page.evaluate(c=>c===document.querySelector('canvas'),leafCanvas)
  check('whole leaf to motor retains one canvas',same&&Number((await state(page)).data.scale)<-7.3,{same})

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

  await navigate(phone,'scale=-7.7')
  const motorBounds=await phone.evaluate(async()=>{
    const canvas=document.querySelector('canvas'),url=performance.getEntriesByType('resource').map(e=>e.name).find(u=>/\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(u))
    const fiber=await import(url),root=fiber._roots.get(canvas).store.getState(),motor=root.scene.getObjectByName('atp-heavy-atoms'),point=root.camera.position.clone()
    let min=Infinity,max=-Infinity
    motor.updateWorldMatrix(true,true)
    motor.traverse(o=>{if(o.isInstancedMesh){const arr=o.instanceMatrix.array;for(let i=0;i<o.count;i+=5){point.set(arr[i*16+12],arr[i*16+13],arr[i*16+14]);o.localToWorld(point);point.project(root.camera);min=Math.min(min,point.y);max=Math.max(max,point.y)}}})
    return {fraction:(max-min)/2,min,max}
  })
  check('portrait motor occupies 55–65 percent of height',motorBounds.fraction>=.55&&motorBounds.fraction<=.65,motorBounds)
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
  const path=join(output,`logs/${reportName}`)
  await writeFile(path,JSON.stringify(report,null,2)+'\n')
  console.log(`${report.status}: ${path}`)
  console.log(JSON.stringify({failed:Object.entries(report.checks).filter(([,c])=>!c.pass).map(([name])=>name),performance:report.performance,errors:report.errors}))
}
