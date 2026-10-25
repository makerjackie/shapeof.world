/** Production-only browser benchmark. Headless Chrome owns a temporary profile.
 * node .../measure-performance.mjs <output.json> [--device=desktop|mobile] [--runs=3] [--ids=a,b] [--seconds=3]
 * No screenshots here: visual acceptance uses the owner's gpu-shot.mjs.
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { loadavg } from 'node:os'
const output=process.argv[2], opt=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.split('=').slice(1).join('=')??fallback
if(!output)throw Error('Provide an output JSON path')
const ids=opt('ids','cloverleaf,t-junction,crossroads-yield,crossroads-signal,roundabout,crossroads-channelized,continuous-flow,diamond,ddi,parclo,trumpet,turbine,stack,huangjuewan').split(',')
const devices={desktop:{width:1512,height:900,deviceScaleFactor:2,cpu:1},mobile:{width:390,height:844,deviceScaleFactor:3,cpu:4}}
const result=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{started:new Date().toISOString(),seconds:Number(opt('seconds',2)),rows:[],errors:[]}
result.rows=result.rows.filter(row=>(row.state!=='tour'||row.stage?.guide==='true')&&(row.state!=='compare'||row.comparison===true)&&(!['compare-open','pressure-start'].includes(row.state)||row.run<=3))
const save=()=>writeFileSync(output,JSON.stringify(result,null,2))
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--headless=new','--ignore-gpu-blocklist','--use-angle=metal']})
try {
 for(const device of opt('device','desktop,mobile').split(',')){
  let run=1
  const repetitions=Number(opt('runs',3))
  if(result.rows.filter(r=>r.device===device&&r.id===ids.at(-1)&&r.state==='tour').length>=repetitions)continue
  const vp=devices[device], context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.deviceScaleFactor,hasTouch:device==='mobile'})
  const page=await context.newPage(),cdp=await context.newCDPSession(page)
  page.on('pageerror',e=>{result.errors.push({device,run,message:e.message});save()})
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:vp.cpu})
  await page.addInitScript(()=>{
   window.__perf={frames:[],long:[]}; let last=0
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__perf.long.push({start:e.startTime,ms:e.duration})}).observe({type:'longtask',buffered:true})
   const tick=t=>{if(last)window.__perf.frames.push({start:last,ms:t-last});last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick)
  })
  const coldTrials=result.rows.filter(r=>r.device===device&&r.state==='load').length>=repetitions?1:repetitions
  for(run=1;run<=coldTrials;run++){
   await cdp.send('Network.clearBrowserCache')
   await page.goto(`${opt('base','http://127.0.0.1:3211')}/road-design`,{waitUntil:'load',timeout:120000})
   await page.waitForSelector('.road-design-experience[data-vehicles]',{timeout:120000});await page.waitForTimeout(1800)
   const info=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').at(-1),encoded:e.encodedBodySize,decoded:e.decodedBodySize})),long:window.__perf.long,firstFrame:window.__perf.frames[0]?.start}})
   if(!result.rows.some(row=>row.device===device&&row.run===run&&row.state==='load')){result.rows.push({device,run,id:'cloverleaf',state:'load',...info,load:loadavg()});save()}
  }
  const click=async selector=>{
   const reveal=selector==='.rd-pressure-toggle'&&await page.locator(selector).count()===0
   if(reveal){await page.locator('.experience-freebar-summary').click();await page.waitForTimeout(350)}
   await page.evaluate(s=>{const e=document.querySelector(s);if(!e)throw Error(`missing ${s}`);e.click()},selector)
   if(reveal){await page.locator('.experience-freebar-summary').click();await page.waitForTimeout(400)}
  }
  const setRange=async(value)=>{
   const reveal=await page.locator('input[aria-label="需求倍率"]').count()===0
   if(reveal){await page.locator('.experience-freebar-summary').click();await page.waitForTimeout(350)}
   await page.evaluate(value=>{const e=document.querySelector('input[aria-label="需求倍率"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(value));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},value)
   if(reveal){await page.locator('.experience-freebar-summary').click();await page.waitForTimeout(400)}
  }
  const button=async text=>page.evaluate(text=>{const b=[...document.querySelectorAll('.rd-freebar button')].find(b=>b.textContent.trim()===text);if(!b)throw Error(`missing ${text}`);b.click()},text)
  const mark=()=>page.evaluate(()=>performance.now())
  const collect=async(id,state,start)=>{
   const row=await page.evaluate(start=>{const end=performance.now(),p=window.__perf,frames=p.frames.filter(e=>e.start+e.ms>=start&&e.start<end),long=p.long.filter(e=>e.start+e.ms>=start&&e.start<end),stage=document.querySelector('.road-design-experience'),c=document.querySelector('canvas');return {start,end,elapsed:end-start,fps:frames.length*1000/Math.max(1,frames.reduce((s,e)=>s+e.ms,0)),worstMs:Math.max(0,...frames.map(e=>e.ms)),longTaskMs:long.reduce((s,e)=>s+e.ms,0),longestTaskMs:Math.max(0,...long.map(e=>e.ms)),longTasks:long,stage:{...stage.dataset},comparison:Boolean(document.querySelector('.rd-compare')),pixels:[c.width,c.height],postPixels:[Number(c.dataset.postWidth),Number(c.dataset.postHeight)],camera:c.dataset.camera}},start)
   result.rows=result.rows.filter(r=>!(r.device===device&&r.run===run&&r.id===id&&r.state===state));result.rows.push({device,run,id,state,...row,load:loadavg()});save();console.log(JSON.stringify({device,run,id,state,fps:+row.fps.toFixed(1),worst:+row.worstMs.toFixed(1),long:+row.longTaskMs.toFixed(1)}))
  }
  const gesture=async(seconds)=>{
   const cx=vp.width*.5,cy=vp.height*.43,start=Date.now();await page.mouse.move(cx,cy);await page.mouse.down()
   let i=0;while(Date.now()-start<seconds*1000){await page.mouse.move(cx+Math.sin(i*.25)*vp.width*.11,cy+Math.cos(i*.2)*vp.height*.045);await page.waitForTimeout(40);i++}
   await page.mouse.up();await page.mouse.wheel(0,-60);await page.waitForTimeout(100);await page.mouse.wheel(0,60)
  }
  const measure=async(id,state,secs=result.seconds)=>{for(run=1;run<=repetitions;run++){if(result.rows.some(row=>row.device===device&&row.run===run&&row.id===id&&row.state===state))continue;const start=await mark();if(state==='tour')await page.waitForTimeout(secs*1000);else if(state==='compare'){await page.mouse.move(vp.width*.5,vp.height*.5);await page.mouse.wheel(0,120);await page.waitForTimeout(secs*1000);await page.mouse.wheel(0,-120)}else await gesture(secs);await collect(id,state,start)}}
  const setBlueprint=async value=>{if(await page.getAttribute('.road-design-experience','data-blueprint')!==String(value)){await button('图纸');await page.waitForTimeout(1200)}}
  for(const id of ids){
   if(result.rows.filter(row=>row.device===device&&row.id===id&&row.state==='low').length>=repetitions)continue
   await button('1×');await setBlueprint(false)
   for(run=1;run<=repetitions;run++){
    if(result.rows.some(r=>r.device===device&&r.run===run&&r.id===id&&r.state==='switch'))continue
    const away=id==='t-junction'?'cloverleaf':'t-junction'
    await click(`[data-design-id="${away}"]`);await page.waitForFunction(id=>document.querySelector('.road-design-experience')?.getAttribute('data-design')===id,away);await page.waitForTimeout(1700)
    const start=await mark();await click(`[data-design-id="${id}"]`)
    await page.waitForFunction(id=>document.querySelector('.road-design-experience')?.getAttribute('data-design')===id,id)
    await page.waitForTimeout(1700);await collect(id,'switch',start)
   }
   if(await page.getAttribute('.road-design-experience','data-design')!==id){await click(`[data-design-id="${id}"]`);await page.waitForFunction(id=>document.querySelector('.road-design-experience')?.getAttribute('data-design')===id,id);await page.waitForTimeout(1700)}
   await page.waitForTimeout(600);await measure(id,'default')
   await setRange(2.5);await button('16×');await page.waitForTimeout(12000);await measure(id,'demand-max-16x')
   await button('1×');await page.waitForTimeout(600);await measure(id,'demand-max')
   await button('1×');await setRange(1);await setBlueprint(true);await measure(id,'blueprint');await setBlueprint(false)
   for(const [key,state]of[['2','top'],['3','close'],['4','low']]){
    await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press(key);await page.waitForTimeout(1700);await measure(id,state,2)
   }
  }
  await button('1×');await setBlueprint(false)
  await click('[data-design-id="huangjuewan"]');await page.waitForFunction(()=>document.querySelector('.road-design-experience')?.getAttribute('data-design')==='huangjuewan');await page.waitForTimeout(2000)
  let start
  for(run=1;run<=repetitions;run++){
   start=await mark();await button('对比');await page.waitForSelector('.rd-compare');await page.waitForTimeout(500)
   if(!result.rows.some(r=>r.device===device&&r.run===run&&r.state==='compare-open'))await collect('all','compare-open',start)
   if(run<repetitions)await click('.rd-compare header button')
  }
  await measure('all','compare');await click('.rd-compare header button')
  for(run=1;run<=repetitions;run++){
   start=await mark();await click('.rd-pressure-toggle');await page.waitForTimeout(2500)
   if(!result.rows.some(r=>r.device===device&&r.run===run&&r.state==='pressure-start'))await collect('huangjuewan','pressure-start',start)
   if(run<repetitions)await click('.rd-pressure-toggle')
  }
  await measure('huangjuewan','pressure');await click('.rd-pressure-toggle')
  await click('.rd-heading .rd-tour-button')
  const tourIds=['t-junction','crossroads-yield','crossroads-signal','roundabout','crossroads-channelized','continuous-flow','diamond','ddi','parclo','trumpet','cloverleaf','turbine','stack','huangjuewan']
  for(let i=0;i<14;i++){
   const id=tourIds[i];await page.waitForFunction(id=>document.querySelector('.road-design-experience')?.getAttribute('data-design')===id,id,{timeout:120000});await page.waitForTimeout(1800);await measure(id,'tour',2)
   start=await mark();await click('.guide-stage-continue');if(i<13){await page.waitForTimeout(1800);await collect(await page.getAttribute('.road-design-experience','data-design'),'tour-switch',start)}
  }
  await context.close()
 }
}finally{result.finished=new Date().toISOString();save();await browser.close()}
