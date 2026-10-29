import './styles/ChipZoom.css'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowCounterClockwise, ArrowDown, ArrowRight, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { ChipScene, type Frame } from './scene'
import { LogicLab } from './LogicLab'
import { PALETTE, PEEL_LAYERS, transistorState, type Layout } from './model'
import { STAGES, SCALES, SCALE_MIN, SCALE_MAX, stageIndex, ruler, formatLength, fittedFieldScale, type Stage, type TransistorKind } from './scale-model'
import { useJourney } from './use-journey'
import layoutUrl from './data/alu-layout.json.gz?url'
import { decodeLayout } from './load-layout'
const query=(name:string)=>typeof window==='undefined'?null:new URLSearchParams(window.location.search).get(name)
const initialStage=():Stage=>{const value=query('stage')??query('view');return STAGES.some(s=>s.id===value)?value as Stage:'phone'}
export function ChipZoom({controls}:{controls:ExperienceControls}) {
 const tx=useExperienceI18n(),opening=useRef(0),sceneElement=useRef<HTMLDivElement>(null),frameElement=useRef<HTMLDivElement>(null),panelElement=useRef<HTMLElement>(null)
 const [layout,setLayout]=useState<Layout|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[ready,setReady]=useState(false)
 const [peeled,setPeeled]=useState(()=>initialStage()==='cell'?5:0),[spacing,setSpacing]=useState(.1),[tilt,setTilt]=useState(0)
 const [gate,setGate]=useState(0),[drain,setDrain]=useState(1.8),[kind,setKind]=useState<TransistorKind>('planar'),[cutaway,setCutaway]=useState(true)
 const [playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[revision,setRevision]=useState(0),[phoneOpen,setPhoneOpen]=useState(.75),[packageOpen,setPackageOpen]=useState(.75),[region,setRegion]=useState('cpu')
 const [guide,setGuide]=useState(false),[details,setDetails]=useState(false),[hair,setHair]=useState(false),[logic,setLogic]=useState(()=>query('mode')==='logic')
 const [canvasSize,setCanvasSize]=useState({width:900,height:600}),[frame,setFrame]=useState<Frame>({left:190,top:195,right:355,bottom:150}),[panelHeight,setPanelHeight]=useState(250)
 const interact=useCallback(()=>{cancelAnimationFrame(opening.current);controls.registerInteraction()},[controls])
 const {scale,flying,fly,scrub}=useJourney(initialStage(),sceneElement,interact)
 const index=stageIndex(scale),stage=STAGES[index].id,state=transistorState(gate,drain),colors=PALETTE
 useEffect(()=>{
  // The canvas is full-bleed (no visible box); the framed area is where each specimen is fitted.
  const el=frameElement.current,scene=sceneElement.current;if(!el||!scene)return
  const measure=()=>{const f=el.getBoundingClientRect(),s=scene.getBoundingClientRect(),next={left:f.left-s.left,top:f.top-s.top,right:s.right-f.right,bottom:s.bottom-f.bottom}
   setFrame(p=>Math.abs(p.left-next.left)+Math.abs(p.top-next.top)+Math.abs(p.right-next.right)+Math.abs(p.bottom-next.bottom)<1?p:next);setCanvasSize(p=>Math.abs(p.width-f.width)+Math.abs(p.height-f.height)<1?p:{width:f.width,height:f.height})}
  const observer=new ResizeObserver(measure);observer.observe(el);observer.observe(scene);measure();return()=>observer.disconnect()
 },[])
 useEffect(()=>{
  const abort=new AbortController();setFailed(false)
  fetch(layoutUrl,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error(`Layout HTTP ${r.status}`);return r.arrayBuffer()}).then(buffer=>{if(!abort.signal.aborted)setLayout(decodeLayout(buffer))}).catch(()=>{if(!abort.signal.aborted)setFailed(true)})
  return()=>abort.abort()
 },[retry])
 useEffect(()=>{const el=panelElement.current;if(!el)return;const observer=new ResizeObserver(entries=>setPanelHeight(entries[0].borderBoxSize?.[0]?.blockSize??el.getBoundingClientRect().height));observer.observe(el);return()=>observer.disconnect()},[])
 useEffect(()=>{
  if(!ready||initialStage()!=='phone'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const start=performance.now();setPhoneOpen(0)
  const tick=(now:number)=>{const t=Math.min(1,(now-start)/2200);setPhoneOpen(.75*t*t*(3-2*t));if(t<1)opening.current=requestAnimationFrame(tick)}
  opening.current=requestAnimationFrame(tick)
  return()=>cancelAnimationFrame(opening.current)
 },[ready])
 const onReady=useCallback(()=>setReady(true),[])
 const next=()=>fly(STAGES[Math.min(index+1,6)].id)
 const choose=(id:Stage)=>{setLogic(false);if(id==='cell')setPeeled(5);fly(id)}
 const layerNames=[tx('第四层金属'),tx('第三层金属'),tx('第二层金属'),tx('第一层金属'),tx('局部互连')]
 const titles=[tx('从手里，走进硅里。'),tx('拆开封装，找到硅片。'),tx('一小片硅，各有分工。'),tx('先看花纹，再剥开。'),tx('看清一个逻辑单元。'),tx('电压，让硅成为开关。'),tx('最后，是排列整齐的原子。')]
 const subtitles=[tx('这是一台自制示意手机。处理器藏在电路板上。'),tx('焊球连到电路板，封装保护里面的裸片。'),tx('点一个功能区。位置和面积为示意，不对应真实型号。'),tx('换到 Tiny Tapeout 02 真实开放电路，平面来自 GDS。'),tx('粉色栅跨过绿色有源区，交叉处形成晶体管。'),tx('栅极用电场改变沟道；源漏之间的电压推动电流。'),tx('硅是金刚石型晶格，每个内部原子连着四个邻居。')]
 const stageNotes=[tx('自制手机 · 无品牌 · 尺寸示意'),tx('自制封装 · 结构与尺寸示意'),tx('自制功能区 · 不表示面积比例'),tx('TT02 ALU · 150 × 170 μm · 真实平面，Z 轴夸张'),tx('真实反相器 · 相邻单元与 M1/M2 走线为示意'),tx('三种结构为独立示意，不是同一芯片的放大照片'),tx('球与棒表示位置和近邻关系，不是原子外观')]
 const regionDescriptions:Record<string,string>={cpu:tx('CPU 按指令处理通用任务。'),gpu:tx('GPU 把许多相似运算同时展开。'),cache:tx('缓存把常用数据留在处理器附近。'),npu:tx('NPU 为神经网络中的重复计算安排专用通路。')}
 const fieldScale=fittedFieldScale(scale,canvasSize.width/Math.max(1,canvasSize.height)),scaleBar=ruler(fieldScale,canvasSize.width)
 const guideSteps=[
  {title:tx('从手里，到封装'),body:tx('沿着尺度梯子放大，先找到手机里的芯片。手机、封装与功能区都是自制示意。'),action:()=>choose('phone')},
  {title:tx('走到真实的线与开关'),body:tx('换到一块开放电路，剥开四层金属与局部互连，再进入真实单元。'),action:()=>choose('layers')},
  {title:tx('用电场打开一条路'),body:tx('提高栅源电压，比较平面、鳍式与环栅怎样控制沟道。'),action:()=>choose('transistor')},
  {title:tx('让开关算一次加法'),body:tx('从反相器、与非门走到四位加法器，输入两个数，跟着进位走。'),action:()=>setLogic(true)},
 ]
 return <div className="cz-world" style={{'--cz-panel-height':`${panelHeight}px`} as CSSProperties} data-view={stage} data-scale={scale.toFixed(5)} data-flying={flying} data-peeled={peeled} data-ready={ready} data-flowing={state.flowing} data-kind={kind} data-capture={query('capture')==='1'} data-mode={logic?'logic':'journey'}>
  <div className="cz-frame" ref={frameElement} aria-hidden="true"/>
  <div className="cz-scene" ref={sceneElement} style={{'--fl':`${frame.left}px`,'--ft':`${frame.top}px`,'--fr':`${frame.right}px`,'--fb':`${frame.bottom}px`} as CSSProperties} aria-label={tx('可旋转和连续缩放的芯片旅程')}>
   {layout&&<ChipScene layout={layout} scale={scale} fieldScale={fieldScale} peeled={peeled} spacing={spacing} frame={frame} gate={gate} drain={drain} playing={playing} speed={speed} tilt={tilt} revision={revision} kind={kind} cutaway={cutaway} phoneOpen={phoneOpen} packageOpen={packageOpen} region={region} onRegion={id=>{interact();setRegion(id)}} onInteract={interact} onReady={onReady} onNext={next}/>}
   {!ready&&<div className="cz-loading" role="status">{failed?<>{tx('版图加载失败')}<button onClick={()=>setRetry(v=>v+1)}>{tx('重新加载')}</button></>:tx('正在展开真实版图')}</div>}
  </div>
  <div className="cz-heading"><p>{stage==='layers'||stage==='cell'?tx('真实开放版图'):stage==='atoms'?tx('硅晶格模型'):tx('结构示意')}</p><h1>{titles[index]}</h1><span>{subtitles[index]}</span></div>
  <nav className="cz-ladder" aria-label={tx('探索尺度')}>
   {STAGES.map((s,i)=><button key={s.id} aria-pressed={!logic&&index===i} onClick={()=>choose(s.id)}><i/><span>{tx(s.label)}</span><small>{s.mark==='示意'?tx('示意'):s.mark}</small></button>)}
   <label className="cz-scale-scrub"><span>{tx('连续缩放')}</span><input type="range" min={SCALE_MIN} max={SCALE_MAX} step="0.001" value={scale} aria-label={tx('连续缩放')} onChange={e=>scrub(Number(e.target.value))}/></label>
  </nav>
  <div className="cz-scale-readout"><span>{stage==='transistor'?tx('示意视野'):tx('视野宽度')} {formatLength(10**fieldScale)}</span><i style={{width:scaleBar.pixels}}/><b>{scaleBar.label}</b><small>{stageNotes[index]}</small></div>
  <aside ref={panelElement} className="cz-panel" aria-label={stage==='transistor'?tx('晶体管控制'):tx('探索当前尺度')}>
   {stage==='layers'||stage==='cell'?<>
    <div className="cz-panel-title"><h2>{peeled===5||stage==='cell'?tx('已到晶体管层'):tx('下面，还有什么？')}</h2><output>{stage==='cell'?5:peeled} / 5</output></div>
    <div className="cz-layer-list">{PEEL_LAYERS.map((mask,i)=><button key={mask} className="cz-layer" data-removed={i<peeled||stage==='cell'} aria-label={`${tx('查看')} ${mask.toUpperCase()}`} onClick={()=>{interact();setPeeled(i);if(stage==='cell')fly('layers')}}><i style={{background:colors[mask]}}/><b>{mask.toUpperCase()}</b><span>{layerNames[i]}</span><small>{i<peeled?tx('已移开'):i===peeled?tx('最上层'):''}</small></button>)}</div>
    {stage==='layers'&&peeled<5?<button className="cz-primary" disabled={!ready||flying} onClick={()=>{interact();setPeeled(p=>Math.min(5,p+1))}}><ArrowDown size={18}/>{tx('剥开最上层')}<b>{PEEL_LAYERS[peeled].toUpperCase()}</b></button>:<button className="cz-primary" onClick={()=>choose(stage==='cell'?'transistor':'cell')}>{stage==='cell'?tx('让一个晶体管导通'):tx('放大一个真实单元')}<ArrowRight size={18}/></button>}
    <p className="cz-feedback" aria-live="polite">{stage==='cell'?tx('真实单元 sky130_fd_sc_hd__inv_2；有 NMOS 与 PMOS。'):peeled===0?tx('实际四层铝金属，下面还有局部互连。'):peeled===5?tx('露出有源区与栅，继续放大看交叉处。'):`${tx('已移开')} ${PEEL_LAYERS[peeled-1].toUpperCase()}${tx('，继续向下看。')}`}</p>
    {stage==='layers'&&<><div className="cz-view-buttons"><button aria-pressed={tilt===0} onClick={()=>{interact();setTilt(0);setSpacing(.1);setRevision(v=>v+1)}}>{tx('俯视')}</button><button aria-pressed={tilt>0} onClick={()=>{interact();setTilt(1);setSpacing(.9)}}>{tx('倾斜并拉开')}</button></div><label className="cz-spacing">{tx('竖向夸张')}<input type="range" min="0.06" max="1.2" step="0.02" value={spacing} aria-label={tx('竖向夸张')} onChange={e=>{interact();setSpacing(Number(e.target.value))}}/></label></>}
    <button className="cz-text-button" onClick={()=>{interact();setPeeled(0);if(stage==='cell')fly('layers')}}><ArrowCounterClockwise size={14}/>{tx('放回所有层')}</button>
    {stage==='cell'&&<button className="cz-secondary" onClick={()=>{interact();setLogic(true)}}>{tx('算一次加法')}</button>}
   </>:stage==='transistor'?<>
    <div className="cz-kind-switch" aria-label={tx('晶体管结构')}>{([{id:'planar',label:tx('平面')},{id:'fin',label:tx('鳍式')},{id:'gaa',label:tx('环栅')}] as const).map(k=><button key={k.id} aria-pressed={kind===k.id} onClick={()=>{interact();setKind(k.id)}}>{k.label}</button>)}</div>
    <p className="cz-shape-explain">{kind==='planar'?tx('栅只从上方控制平面的沟道。'):kind==='fin'?tx('把沟道竖成鳍，栅从三面包住它，更容易关住电流。'):tx('把沟道做成悬空薄片，栅从四周环绕，进一步加强控制。')}</p>
    {kind==='fin'&&<small className="cz-source-dimension">{tx('公开示例：鳍宽 8 nm、鳍高 42 nm；结构示意')}</small>}
    <div className="cz-panel-title"><h2>{state.flowing?tx('电流通过了'):state.channel?tx('有沟道，还没有电流'):tx('现在，开关关着')}</h2><span className="cz-state" data-on={state.flowing}>{state.flowing?tx('通'):tx('断')}</span></div>
    <label className="cz-voltage"><span>{tx('栅源电压')}<output>{gate.toFixed(2)} <small>V</small></output></span><input type="range" min="0" max="1.8" step="0.05" value={gate} aria-label={tx('栅源电压')} onChange={e=>{interact();setGate(Number(e.target.value))}}/><div className="cz-threshold"><span>0 V</span><span>{tx('阈值示意')} 0.65 V</span><span>1.8 V</span></div></label>
    <button className="cz-primary" onClick={()=>{interact();setGate(gate>.65?0:1.4)}}>{gate>.65?tx('撤去栅极电压'):tx('给栅极加电压')}<b>{gate>.65?'0 V':'1.4 V'}</b></button>
    <p className="cz-cause" aria-live="polite">{state.flowing?tx('栅压形成沟道，漏源电压推动电流。'):state.channel?tx('沟道已形成；漏源电压为零，没有持续净电流。'):tx('提高栅压，观察栅下的沟道。')}</p>
    <button className="cz-bias" aria-pressed={drain>0} onClick={()=>{interact();setDrain(drain>0?0:1.8)}}>{drain>0?tx('断开漏源电压'):tx('接上漏源电压')}<span>{drain.toFixed(1)} V</span></button>
    <div className="cz-transistor-tools"><button onClick={()=>{interact();setCutaway(v=>!v)}} aria-pressed={cutaway}>{cutaway?tx('合上剖切'):tx('剖开栅极')}</button><button onClick={()=>setHair(v=>!v)}>{tx('和头发比')}</button></div>
    <button className="cz-secondary" onClick={()=>choose('atoms')}>{tx('继续到原子')}<ArrowRight size={14}/></button>
   </>:<>
    <h2>{stage==='phone'?tx('先找到芯片'):stage==='package'?tx('外面是连接，里面是硅'):stage==='die'?tx('不同区域，处理不同任务'):tx('原子不是小小的晶体管')}</h2>
    <p className="cz-stage-body">{stage==='phone'?tx('屏幕像书页一样翻开，下面是电池、电路板和处理器。点亮框里的处理器，继续向里。'):stage==='package'?tx('封装把微小的裸片接到更大的电路板上。抬起上盖，看见里面的硅。'):stage==='die'?regionDescriptions[region]:tx('晶体管由大量原子构成。硅晶格的重复边长约 0.543 nm；图中只显示一小块晶格。')}</p>
    {(stage==='phone'||stage==='package')&&<label className="cz-spacing">{tx('拆开外层')}<input type="range" min="0" max="1" step="0.01" value={stage==='phone'?phoneOpen:packageOpen} aria-label={tx('拆开外层')} onChange={e=>{interact();(stage==='phone'?setPhoneOpen:setPackageOpen)(Number(e.target.value))}}/></label>}
    {stage==='die'&&<div className="cz-regions">{['cpu','gpu','cache','npu'].map(id=><button key={id} aria-pressed={region===id} onClick={()=>{interact();setRegion(id)}}>{id==='cache'?tx('缓存'):id.toUpperCase()}</button>)}</div>}
    {index<6?<button className="cz-primary" onClick={next} disabled={flying}>{stage==='die'?tx('换到真实开放电路'):tx('继续放大')}<ArrowRight size={18}/></button>:<button className="cz-primary" onClick={()=>{interact();setLogic(true)}}>{tx('让这些开关算一次加法')}<ArrowRight size={18}/></button>}
    {stage==='die'&&<p className="cz-sample-switch">{tx('下一站换样本：不是这款示意 SoC，而是 SKY130 的 TT02 ALU 宏。')}</p>}
    {stage==='atoms'&&<button className="cz-text-button" onClick={()=>choose('phone')}>{tx('回到手里的手机')}</button>}
   </>}
  </aside>
  <div className="cz-toolbar"><button aria-label={playing?tx('暂停动画'):tx('播放动画')} onClick={()=>{interact();setPlaying(v=>!v)}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button>{stage==='transistor'&&<button onClick={()=>setSpeed(speed===1?.3:1)}>{speed}×</button>}<button onClick={()=>{interact();setRevision(v=>v+1)}}>{tx('复位镜头')}</button><button onClick={()=>setGuide(v=>!v)}>{tx('导览')}</button><button onClick={()=>setDetails(v=>!v)}>{tx('真实与示意')}</button><button className="cz-lab-entry" onClick={()=>{interact();setLogic(v=>!v)}}>{logic?tx('返回尺度旅程'):tx('算一次加法')}</button></div>
  {hair&&<div className="cz-note cz-hair"><button className="cz-close" aria-label={tx('关闭')} onClick={()=>setHair(false)}>×</button><h2>{tx('头发，和一排开关')}</h2><div className="cz-hair-strip"/><strong>100 μm ÷ 70 nm ≈ 1,428</strong><p>{tx('取约 100 μm 宽的头发作比较，约能跨过 1,400 个晶体管栅极节距。')}</p><p>{tx('70 nm 是公开的 Intel 14 nm 工艺栅极节距，含相邻栅的间隔；不是完整晶体管宽度，也不是本页 SKY130 的尺寸。')}</p><a href="https://science.nasa.gov/resource/orion-microchip-at-500x-magnification/" target="_blank" rel="noreferrer">NASA · {tx('头发宽度')}</a><a href="https://www.intel.com/content/dam/www/public/us/en/documents/technology-briefs/bohr-14nm-idf-2014-brief.pdf" target="_blank" rel="noreferrer">Intel · {tx('栅极节距')}</a></div>}
  {details&&<div className="cz-note"><button className="cz-close" aria-label={tx('关闭')} onClick={()=>setDetails(false)}>×</button><h2>{tx('哪些是真的？')}</h2><p>{tx('手机、封装、功能区是自制示意，不对应某款产品。进入开放电路时切换到 Ryan Cornateanu 的 Tiny Tapeout 02 ALU。')}</p><p>{tx('GDS 保留实际平面图形。只显示 M1–M4、局部互连、接触孔与器件掩膜。颜色、厚度和层距用于辨认，介质等层省略。')}</p><p>{tx('三种晶体管独立建模，结构不按比例。共用的 0.65 V 阈值和电流模型只用于因果实验，不能比较不同工艺性能。')}</p><p>{tx('加法器是独立的 36 个与非门教学网表，不是 ALU 宏的真实仿真。原子位置取金刚石型晶格，原子半径与键为示意。')}</p></div>}
  {logic&&<LogicLab onClose={()=>setLogic(false)} onInteract={interact}/>}
  <GuideTour worldId="chip-zoom" steps={guideSteps} defaultOpen={guide} placement="stage" stagePlan={[{position:'bottom-left',mobilePosition:'top-left',treatment:'caption',tone:'light',width:'narrow',motion:'fade'}]} onExit={()=>setGuide(false)} exitLabel={tx('自由探索')}/>
 </div>
}
