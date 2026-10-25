/** Separate from the scored trials: sampling profiler perturbs timing. */
import { chromium } from 'playwright'
import { mkdirSync,writeFileSync } from 'node:fs'
const out=process.argv[2];if(!out)throw Error('Output directory required');mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--headless=new','--ignore-gpu-blocklist','--use-angle=metal']})
const only=process.argv.find(a=>a.startsWith('--ids='))?.slice(6).split(',')
try{
 for(const [id,cpu]of[['cloverleaf',1],['roundabout',4],['huangjuewan',4],['stack',1],['crossroads-signal',1],['t-junction',1],['crossroads-yield',1]].filter(([id])=>!only||only.includes(id))){
  const context=await browser.newContext({viewport:cpu===4?{width:390,height:844}:{width:1512,height:900},deviceScaleFactor:cpu===4?3:2})
  const page=await context.newPage(),cdp=await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start')
  await page.goto(`http://127.0.0.1:3211/road-design?design=${id}&profile=1`,{waitUntil:'load'});await page.waitForSelector('.road-design-experience[data-vehicles]',{timeout:120000});await page.waitForTimeout(2000)
  const initial=await cdp.send('Profiler.stop');writeFileSync(`${out}/${id}-load.cpuprofile`,JSON.stringify(initial.profile))
  // Profile the actual design-change commit separately from cold startup.
  const select=async design=>{await page.evaluate(id=>document.querySelector(`[data-design-id="${id}"]`).click(),design);await page.waitForFunction(id=>document.querySelector('[data-design]')?.dataset.design===id,design,{timeout:120000});await page.waitForTimeout(1500)}
  await select('t-junction');await cdp.send('Profiler.start');await select(id)
  const switching=await cdp.send('Profiler.stop');writeFileSync(`${out}/${id}-switch.cpuprofile`,JSON.stringify(switching.profile))
  if(await page.locator('input[aria-label="需求倍率"]').count()===0){await page.locator('.experience-freebar-summary').click();await page.waitForTimeout(350)}
  await page.evaluate(()=>{const e=document.querySelector('input[aria-label="需求倍率"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'2.5');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='16×').click()})
  if(await page.getAttribute('.experience-freebar-summary','aria-expanded')==='true'){await page.locator('.experience-freebar-summary').click()}
  await page.waitForTimeout(10000)
  const root=await browser.newBrowserCDPSession(),targets=(await root.send('Target.getTargets')).targetInfos
  const worker=targets.find(t=>t.type==='worker'&&t.url.includes('traffic.worker'))
  let workerRPC
  if(worker){
   const {sessionId}=await root.send('Target.attachToTarget',{targetId:worker.targetId,flatten:false});let seq=0;const pending=new Map()
   root.on('Target.receivedMessageFromTarget',event=>{if(event.sessionId!==sessionId)return;const message=JSON.parse(event.message),p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(message.error):p.resolve(message.result)}})
   workerRPC=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});root.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject)})
   await workerRPC('Profiler.enable');await workerRPC('Profiler.setSamplingInterval',{interval:1000});await workerRPC('Profiler.start')
  }
  await cdp.send('Profiler.start');await page.waitForTimeout(6000)
  writeFileSync(`${out}/${id}-render.json`,JSON.stringify(await page.evaluate(()=>window.__roadPerf??[])))
  if(workerRPC){const workerProfile=await workerRPC('Profiler.stop');writeFileSync(`${out}/${id}-worker.cpuprofile`,JSON.stringify(workerProfile.profile))}
  await root.detach()
  const steady=await cdp.send('Profiler.stop');writeFileSync(`${out}/${id}-16x.cpuprofile`,JSON.stringify(steady.profile))
  for(const [state,profile]of[['load',initial.profile],['switch',switching.profile],['16x',steady.profile]]){
   const nodes=new Map(profile.nodes.map(n=>[n.id,n])),weights=new Map()
   profile.samples?.forEach((id,i)=>weights.set(id,(weights.get(id)??0)+(profile.timeDeltas[i]??0)))
   const top=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([id,us])=>({ms:us/1000,...nodes.get(id).callFrame}))
   console.log(JSON.stringify({id,cpu,state,top}));writeFileSync(`${out}/${id}-${state}-top.json`,JSON.stringify(top,null,2))
  }
  // Follow up the city states that can fluctuate under concurrent GPU load.
  if(['t-junction','crossroads-yield'].includes(id)){
   await page.evaluate(()=>[...document.querySelectorAll('.rd-freebar button')].find(b=>b.textContent.trim()==='1×').click())
   for(const state of ['demand-1x','close']){
    if(state==='close'){await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('3')}
    await page.waitForTimeout(2000);await cdp.send('Profiler.start')
    const x=cpu===4?195:756,y=cpu===4?360:387
    await page.mouse.move(x,y);await page.mouse.down()
    for(let i=0;i<120;i++){await page.mouse.move(x+Math.sin(i*.25)*100,y+Math.cos(i*.2)*35);await page.waitForTimeout(50)}
    await page.mouse.up();const capture=await cdp.send('Profiler.stop')
    writeFileSync(`${out}/${id}-${state}.cpuprofile`,JSON.stringify(capture.profile))
    writeFileSync(`${out}/${id}-${state}-render.json`,JSON.stringify(await page.evaluate(()=>window.__roadPerf?.slice(-360)??[])))
   }
  }
  await cdp.send('Profiler.disable');await cdp.detach();await context.close()
 }
}finally{await browser.close()}

process.exit(0)
