// Round 2: headless Chrome, temporary profile, one browser, visible UI actions.
import { chromium } from 'playwright'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve,join } from 'node:path'
import assert from 'node:assert/strict'
const [base='http://localhost:3252',folder]=process.argv.slice(2)
if(!folder)throw new Error('Pass the private screenshot directory')
const out=resolve(folder);mkdirSync(out,{recursive:true})
const profile=mkdtempSync(join(tmpdir(),'chip-journey-'))
const report={automated:true,humanComprehension:'PENDING',tasks:[],errors:[],warnings:[],sequence:[],closeSequence:[]}
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1600,height:1000},deviceScaleFactor:1,args:['--headless=new','--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--mute-audio','--hide-scrollbars']})
const page=context.pages()[0]
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')report.warnings.push(m.text())})
const shot=async name=>{const path=join(out,`round-2-${name}.png`);await page.screenshot({path});return path}
const world=page.locator('.cz-world')
async function settled(){await page.waitForFunction(()=>document.querySelector('.cz-world')?.getAttribute('data-flying')==='false');await page.waitForTimeout(500)}
async function go(query='',mobile=false,en=false){await page.setViewportSize(mobile?{width:390,height:844}:{width:1600,height:1000});await page.goto(`${base}/${en?'en/':''}chip-zoom${query}`,{waitUntil:'networkidle'});await page.locator('.cz-world[data-ready="true"]').waitFor({timeout:30000});await settled()}
async function scale(id){const labels={phone:'手机',package:'封装',die:'硅片',layers:'开放电路',cell:'标准单元',transistor:'晶体管',atoms:'原子'};await page.locator('.cz-ladder>button').filter({hasText:labels[id]}).click();await settled();assert.equal(await world.getAttribute('data-view'),id)}
async function task(id,run){const result={id,steps:[],seconds:0,pass:false};await shot(`${id}-00-start`);const start=performance.now();const step=async(label,action)=>{const t=performance.now();await action();await settled();result.steps.push({label,seconds:(performance.now()-t)/1000,screenshot:await shot(`${id}-${String(result.steps.length+1).padStart(2,'0')}`)})};await run(step);result.seconds=(performance.now()-start)/1000;result.pass=true;report.tasks.push(result)}
try{
 await go()
 report.gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)})
 await task('phone-to-transistor',async step=>{
  await step('从手机继续放大',()=>page.getByRole('button',{name:'继续放大',exact:true}).click())
  assert.equal(await world.getAttribute('data-view'),'package')
  await step('从封装继续放大',()=>page.getByRole('button',{name:'继续放大',exact:true}).click())
  await step('换到真实开放电路',()=>page.getByRole('button',{name:'换到真实开放电路',exact:true}).click())
  for(let i=1;i<=5;i++)await step(`剥开第${i}层`,async()=>{await page.getByRole('button',{name:/剥开最上层/}).click();assert.equal(await world.getAttribute('data-peeled'),String(i))})
  await step('放大真实单元',()=>page.getByRole('button',{name:'放大一个真实单元',exact:true}).click())
  await step('进入晶体管',()=>page.getByRole('button',{name:'让一个晶体管导通',exact:true}).click())
  assert.equal(await world.getAttribute('data-view'),'transistor')
 })
 await task('transistor',async step=>{
  await step('给栅极加电压',()=>page.getByRole('button',{name:/给栅极加电压/}).click());assert.equal(await world.getAttribute('data-flowing'),'true')
  await step('保持沟道，断开漏源偏压',()=>page.getByRole('button',{name:/断开漏源电压/}).click());assert.equal(await world.getAttribute('data-flowing'),'false')
  await step('恢复漏源偏压',()=>page.getByRole('button',{name:/接上漏源电压/}).click())
  await step('切换鳍式',()=>page.getByRole('button',{name:'鳍式',exact:true}).click());assert.ok(await page.getByText('把沟道竖成鳍，栅从三面包住它，更容易关住电流。').isVisible())
  await step('切换环栅',()=>page.getByRole('button',{name:'环栅',exact:true}).click())
  await step('撤去栅极电压',()=>page.getByRole('button',{name:/撤去栅极电压/}).click());assert.equal(await world.getAttribute('data-flowing'),'false')
  await step('比较头发尺度',()=>page.getByRole('button',{name:'和头发比',exact:true}).click());assert.ok(await page.getByText('100 μm ÷ 70 nm ≈ 1,428').isVisible());await page.getByRole('button',{name:'关闭',exact:true}).click()
 })
 for(const id of ['phone','package','die','layers','cell','transistor','atoms']){await scale(id);await shot(`scale-${id}-desktop`)}
 await scale('layers');await page.getByRole('button',{name:'放回所有层',exact:true}).click();await page.getByRole('button',{name:'俯视',exact:true}).click();await settled();await shot('metal-top')
 await page.getByRole('button',{name:'倾斜并拉开',exact:true}).click();await page.waitForTimeout(1800);await shot('metal-tilted')
 await scale('transistor');for(const [id,label] of [['planar','平面'],['fin','鳍式'],['gaa','环栅']]){await page.getByRole('button',{name:label,exact:true}).click();await settled();await shot(`transistor-${id}`)}
 await scale('layers');for(let i=0;i<5;i++)await page.getByRole('button',{name:/剥开最上层/}).click();await page.waitForTimeout(500)
 await page.getByRole('button',{name:'放大一个真实单元',exact:true}).click()
 for(let i=0;i<12;i++){await page.waitForTimeout(50);report.closeSequence.push({frame:i,scale:Number(await world.getAttribute('data-scale')),stage:await world.getAttribute('data-view'),screenshot:await shot(`layout-to-cell-${String(i).padStart(2,'0')}`)})}await settled()
 await scale('phone');await page.locator('.cz-ladder>button').filter({hasText:'原子'}).click()
 for(let i=0;i<14;i++){await page.waitForTimeout(130);report.sequence.push({frame:i,scale:Number(await world.getAttribute('data-scale')),stage:await world.getAttribute('data-view'),screenshot:await shot(`zoom-sequence-${String(i).padStart(2,'0')}`)})}await settled()
 await page.getByRole('button',{name:'算一次加法',exact:true}).click();assert.equal(await page.locator('.cz-scene').isVisible(),false)
 await task('adder-6-plus-7',async step=>{
  await step('反相器输入设为1',()=>page.getByRole('button',{name:/^A 0$/}).click())
  await step('运行反相器信号',async()=>{await page.getByRole('button',{name:'运行信号',exact:true}).click();await page.waitForTimeout(450)})
  await step('查看与非门',()=>page.getByRole('button',{name:'与非门',exact:true}).click())
  await step('查看一位全加器',()=>page.getByRole('button',{name:'一位全加器',exact:true}).click())
  await step('进入四位加法器',()=>page.getByRole('button',{name:'四位加法器',exact:true}).click())
  await step('输入6',()=>page.getByRole('spinbutton',{name:'第一个数',exact:true}).fill('6'))
  await step('输入7',()=>page.getByRole('spinbutton',{name:'第二个数',exact:true}).fill('7'));await shot('adder-process-00-inputs')
  for(let tick=1;tick<=6;tick++){await step(`信号推进第${tick}拍`,()=>page.getByRole('button',{name:'下一拍',exact:true}).click());if([1,3,6].includes(tick))await shot(`adder-process-${tick}`)}
  await step('运行剩余信号',async()=>{await page.getByRole('button',{name:'运行信号',exact:true}).click();await page.locator('.cz-logic[data-done="true"]').waitFor({timeout:20000})})
  assert.equal(await page.locator('.cz-logic-result').getAttribute('data-result'),'13');assert.ok(await page.getByText('6 + 7 = 13',{exact:true}).isVisible());await shot('adder-6-plus-7-result')
 })
 for(let i=0;i<4;i++){await page.locator('.cz-bit-chain>button').nth(i).click();await shot(`adder-bit-${i}`)}
 await page.getByRole('spinbutton',{name:'第一个数',exact:true}).fill('15');await page.getByRole('spinbutton',{name:'第二个数',exact:true}).fill('15');await page.getByRole('button',{name:'运行信号',exact:true}).click();await page.locator('.cz-logic[data-done="true"]').waitFor({timeout:20000});assert.equal(await page.locator('.cz-logic-result').getAttribute('data-result'),'30');await shot('adder-overflow-30')
 await go('',true)
 await task('mobile-journey',async step=>{
  for(const id of ['package','die','layers'])await step(`进入${id}`,()=>scale(id))
  for(let i=1;i<=5;i++)await step(`剥开第${i}层`,()=>page.getByRole('button',{name:/剥开最上层/}).click())
  await step('放大真实单元',()=>page.getByRole('button',{name:'放大一个真实单元',exact:true}).click())
  await step('进入晶体管',()=>page.getByRole('button',{name:'让一个晶体管导通',exact:true}).click())
  await step('给栅极加电压',()=>page.getByRole('button',{name:/给栅极加电压/}).click())
  await step('放大到原子',()=>page.getByRole('button',{name:'继续到原子',exact:true}).click())
  assert.equal(await world.getAttribute('data-view'),'atoms');assert.ok(await page.getByRole('button',{name:'让这些开关算一次加法',exact:true}).isVisible())
 })
 for(const id of ['phone','layers','transistor','atoms']){await scale(id);await shot(`mobile-${id}`)}
 await scale('layers');const startScale=Number(await world.getAttribute('data-scale'));const box=await page.locator('.cz-scene').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2
 const cdp=await context.newCDPSession(page)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy},{x:cx+30,y:cy}]})
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-30-i*5,y:cy},{x:cx+30+i*5,y:cy}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled()
 report.pinch={from:startScale,to:Number(await world.getAttribute('data-scale'))};assert.ok(report.pinch.to<report.pinch.from-.3);await shot('mobile-pinch')
 await go('',true,true)
 assert.ok(!/[\u3400-\u9fff]/u.test(await world.innerText()),'English journey has no untranslated Chinese')
 await page.getByRole('button',{name:'Add two numbers',exact:true}).click();await page.getByRole('button',{name:'Four-bit adder',exact:true}).click();await page.getByRole('spinbutton',{name:'First number',exact:true}).fill('6');await page.getByRole('spinbutton',{name:'Second number',exact:true}).fill('7');await page.getByRole('button',{name:'Run signals',exact:true}).click();await page.locator('.cz-logic[data-done="true"]').waitFor({timeout:20000});await shot('mobile-adder-english');await page.getByRole('button',{name:'Enlarge gate diagram',exact:true}).click();assert.equal(await page.locator('.cz-network-wrap').getAttribute('data-zoom'),'true');await shot('mobile-gate-detail');assert.ok(!/[\u3400-\u9fff]/u.test(await page.locator('.cz-logic').innerText()),'English logic has no untranslated Chinese')
 const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(dimensions.width<=dimensions.viewport)
 assert.deepEqual(report.errors,[])
}finally{
 report.warnings=[...new Set(report.warnings)];writeFileSync(join(out,'round-2-playwright.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.tasks.map(t=>({id:t.id,steps:t.steps.length,seconds:t.seconds,pass:t.pass}))));await context.close();rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})
}
