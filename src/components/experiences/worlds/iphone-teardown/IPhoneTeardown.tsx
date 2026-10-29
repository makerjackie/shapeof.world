import {Component, memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {CameraControls, Environment, Lightformer, ContactShadows} from '@react-three/drei'
import {ArrowCounterClockwise, ArrowLeft, ArrowRight, Eye, Info, Pause, Play, X} from '@phosphor-icons/react'
import * as T from 'three'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {GuideTour} from '~/components/experiences/GuideTour'
import {useExperienceI18n} from '~/i18n/experience'
import {isWorldPaused} from '~/lib/world-playback'
import {addByte, advanceCell, cameraOptics, displayLight, hapticMotion, phonePower, powerShare, radioLink, type CellState, type Lab, type SystemId} from './model'
import {PARTS, SYSTEMS} from './parts'
import {partPosition, PhoneAssembly} from './PhoneAssembly'
import {CameraLab, ComputeLab, DisplayLab, HapticsLab, PowerLab, RadioLab, type LabSettings} from './Labs'
import {DiagramLine} from './render-kit'
import './styles/IPhoneTeardown.css'

const DEFAULT: LabSettings={rgb:[82,176,166],touch:null,a:37,b:91,objectM:.65,focusM:.65,frequencyGHz:3.5,distanceKm:2,bits:[1,0,1,1,0,0,1,0],hapticHz:175,forceN:.025,power:{brightness:.55,workload:.25,radio:.3,charging:false}}
const PATHS={photo:['wide','soc','ram','oled','nand'],game:['nand','ram','soc','oled','motor'],call:['antenna1','modem','soc','earpiece']}
type Workflow=keyof typeof PATHS
const SHADOWS={type:T.PCFShadowMap}
const Studio=memo(function Studio(){return <><ambientLight intensity={.75}/><directionalLight position={[7,12,15]} intensity={3.5} castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.0006}/><directionalLight position={[-12,3,4]} intensity={2} color="#adc9df"/><directionalLight position={[3,5,-12]} intensity={4} color="#ebd6b8"/><Environment resolution={64}><Lightformer position={[0,9,6]} scale={[12,5,1]} intensity={4}/><Lightformer position={[-8,1,-1]} rotation={[0,Math.PI/2,0]} scale={[4,16,1]} intensity={2.5}/><Lightformer position={[7,3,-4]} rotation={[0,-Math.PI/2,0]} scale={[3,12,1]} intensity={3}/></Environment></>})
class SceneBoundary extends Component<{children:ReactNode;message:string},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<div className="ip-scene-error" role="alert">{this.props.message}</div>:this.props.children}}
function CameraRig({view,revision,explode}:{view:Lab;revision:number;explode:number}){
 const camera=useRef<CameraControls>(null),{size}=useThree()
 useEffect(()=>{const c=camera.current;if(!c)return
  const narrow=size.width<600,aspect=size.width/Math.max(1,size.height)
  const factor=Math.max(1,(view==='assembly'?.73:view==='display'?.8:1.15)/aspect)*(view==='assembly'&&explode>.8?1.18:1)
  const eye=view==='assembly'?(narrow?[22,13,32]:[19,12,29]):view==='camera'?[9,7,17]:view==='display'?[5.5,4.5,23]:[3,5,17]
  const targetY=view==='display'?-.6:view==='assembly'||view==='camera'?0:-.45
  void c.setLookAt(eye[0]*factor,targetY+(eye[1]-targetY)*factor,eye[2]*factor,0,targetY,0,true)
 },[view,revision,size.width,size.height,explode>.8])
 return <CameraControls ref={camera} makeDefault minDistance={2} maxDistance={90} minPolarAngle={.12} maxPolarAngle={Math.PI-.12} dollySpeed={.65}/>
}
function RunningPhone({explode,clock,workflow}:{explode:number;clock:React.RefObject<number>;workflow:Workflow}) {
 const group=useRef<T.Group>(null)
 const positions=useMemo(()=>PATHS[workflow].map(id=>partPosition(PARTS.find(p=>p.id===id)!,explode)).map(p=>new T.Vector3(p[0],p[1],p[2]+.36)),[explode,workflow])
 const path=useMemo(()=>new T.CatmullRomCurve3(positions),[positions])
 useFrame(()=>group.current?.children.forEach((dot,i)=>dot.position.copy(path.getPoint((clock.current*.17+i/8)%1))))
 return <group><DiagramLine points={positions.map(p=>p.toArray() as [number,number,number])} color="#ceb58e" opacity={.4}/><group ref={group}>{Array.from({length:8},(_,i)=><mesh key={i}><sphereGeometry args={[.055,10,10]}/><meshBasicMaterial color="#e7c891" toneMapped={false}/></mesh>)}</group></group>
}
function Time({clock,paused,speed}:{clock:React.RefObject<number>;paused:boolean;speed:number}){useFrame((_,dt)=>{if(!paused&&!isWorldPaused())clock.current+=Math.min(dt,.05)*speed});return null}
function Scene({view,settings,cell,paused,speed,revision,explode,selected,glass,labels,workflow,highlight,onSelect,onTouch,tx,onInteract}:{view:Lab;settings:LabSettings;cell:CellState;paused:boolean;speed:number;revision:number;explode:number;selected:string|null;glass:boolean;labels:boolean;workflow:Workflow;highlight:SystemId|null;onSelect:(id:string)=>void;onTouch:(p:[number,number])=>void;tx:(s:string)=>string;onInteract:()=>void}) {
 const clock=useRef(0),labProps={settings,cell,clock,onTouch}
 return <Canvas shadows={SHADOWS} dpr={[1,1.65]} camera={{position:[19,12,29],fov:34,near:.05,far:180}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onPointerDown={onInteract} onWheel={onInteract}>
  <Time {...{clock,paused,speed}}/><CameraRig view={view} revision={revision} explode={explode}/><Studio/>
  {view==='assembly'?<><PhoneAssembly {...{explode,selected,glass,labels,onSelect,tx,highlight}}/><RunningPhone explode={explode} clock={clock} workflow={workflow}/><ContactShadows position={[0,-8.5,0]} scale={50} opacity={.25} blur={2.8} far={24} resolution={256} frames={1}/></>:view==='display'?<DisplayLab {...labProps}/>:view==='compute'?<ComputeLab {...labProps}/>:view==='camera'?<CameraLab {...labProps}/>:view==='power'?<PowerLab {...labProps}/>:view==='radio'?<RadioLab {...labProps}/>:<HapticsLab {...labProps}/>}
 </Canvas>
}
function Slider({label,value,min=0,max=1,step=.01,onChange,unit}:{label:string;value:number;min?:number;max?:number;step?:number;onChange:(v:number)=>void;unit?:string}) {
 return <label className="ip-slider"><span>{label}<output>{unit??value.toFixed(2)}</output></span><input aria-label={label} type="range" {...{value,min,max,step}} onChange={e=>onChange(Number(e.target.value))}/></label>
}
function Readout({label,value,unit}:{label:string;value:string;unit?:string}){return <div className="ip-readout"><span>{label}</span><output>{value}<small>{unit}</small></output></div>}
export function IPhoneTeardown({controls}:{controls:ExperienceControls}) {
 const tx=useExperienceI18n(),[view,setView]=useState<Lab>('assembly'),[settings,setSettings]=useState<LabSettings>(DEFAULT),[cell,setCell]=useState<CellState>({soc:.67,temperature:23,seconds:0})
 const [explode,setExplode]=useState(.58),[selected,setSelected]=useState<string|null>('soc'),[glass,setGlass]=useState(false),[labels,setLabels]=useState(false),[paused,setPaused]=useState(false),[speed,setSpeed]=useState(1),[revision,setRevision]=useState(0),[guide,setGuide]=useState(false),[details,setDetails]=useState(false),[workflow,setWorkflow]=useState<Workflow>('photo'),[highlight,setHighlight]=useState<SystemId|null>(null),[mobilePanel,setMobilePanel]=useState(true),[visited,setVisited]=useState<Lab[]>(['assembly'])
 const finished=useRef(false),modalRef=useRef<HTMLElement>(null)
 const interact=useCallback(()=>controls.registerInteraction(),[controls.registerInteraction])
 const change=useCallback(<K extends keyof LabSettings>(key:K,value:LabSettings[K])=>{interact();setSettings(p=>({...p,[key]:value}))},[interact])
 const powerChange=(key:keyof LabSettings['power'],value:number|boolean)=>{interact();setSettings(p=>({...p,power:{...p.power,[key]:value}}))}
 const choose=useCallback((v:Lab)=>{interact();setView(v);setHighlight(null);setMobilePanel(true);setVisited(p=>p.includes(v)?p:[...p,v])},[interact])
 const reset=useCallback(()=>{interact();setSettings({...DEFAULT,rgb:[...DEFAULT.rgb],bits:[...DEFAULT.bits],power:{...DEFAULT.power}});setCell({soc:.67,temperature:23,seconds:0});setExplode(.58);setSelected('soc');setGlass(false);setLabels(false);setPaused(false);setSpeed(1);setWorkflow('photo');setHighlight(null);setRevision(n=>n+1)},[interact])
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)');if(mq.matches)setPaused(true);const listener=()=>{if(mq.matches)setPaused(true)};mq.addEventListener('change',listener);return()=>mq.removeEventListener('change',listener)},[])
 useEffect(()=>{if(view!=='power')return;let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),delta=Math.min(.5,(now-last)/1000);last=now;if(paused||isWorldPaused())return;setCell(previous=>{let state=previous,remaining=delta*speed*60;while(remaining>0){const dt=Math.min(5,remaining);state=advanceCell(state,dt,settings.power);remaining-=dt}return state})},200);return()=>clearInterval(timer)},[view,paused,speed,settings.power])
 useEffect(()=>{if(visited.length===SYSTEMS.length&&!finished.current){finished.current=true;controls.finish()}},[visited,controls.finish])
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(details)setDetails(false);else setView('assembly');return}if(e.target instanceof HTMLElement&&(e.target.matches('input,textarea,select,button')||e.target.isContentEditable))return;if(e.code==='Space'){e.preventDefault();interact();setPaused(p=>!p)}if(e.key.toLowerCase()==='r')reset()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[reset,interact,details])
 useEffect(()=>{if(!details)return;const previous=document.activeElement as HTMLElement|null;modalRef.current?.querySelector('button')?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[details])
 const system=SYSTEMS.find(s=>s.id===view)!,part=PARTS.find(p=>p.id===selected),p=phonePower(settings.power,cell.soc),display=displayLight(settings.rgb),optics=cameraOptics(settings.objectM,settings.focusM),sum=addByte(settings.a,settings.b),link=radioLink(settings.frequencyGHz,settings.distanceKm),haptic=hapticMotion(settings.hapticHz,settings.forceN,0)
 const guideSteps=[
  {title:tx('先把手机拆开'),body:tx('拖动拆解程度，旋转到背面。点选电池、芯片或镜头，沿着拍照、游戏、通话的路径追踪数据。'),action:()=>{choose('assembly');setExplode(.7)}},
  {title:tx('走进一块发光的屏幕'),body:tx('单独关闭红、绿或蓝，观察微观子像素和下方混合色。再点一下屏幕，留下触控位置。'),action:()=>choose('display')},
  {title:tx('看一次进位走完八位'),body:tx('选择两个输入数，从最低位看起。每一级的进位都进入下一级，最后得到九位结果。'),action:()=>choose('compute')},
  {title:tx('让光，准确落在传感器上'),body:tx('改变物体距离，再调焦。计算出的成像平面与传感器平面重合时，弥散圈接近零。'),action:()=>choose('camera')},
  {title:tx('追踪每一瓦去了哪里'),body:tx('同时改变亮度、计算和无线负载。接上充电器，看锂离子与外电路电子反向移动。'),action:()=>choose('power')},
  {title:tx('最后，探索数字与触感'),body:tx('在无线实验里翻转几个比特，再去触觉实验寻找共振峰。所有这些系统都在同一部手机里协作。'),action:()=>choose('radio')},
 ]
 return <div className="ip-world" data-view={view} data-panel={mobilePanel} data-paused={paused} data-explored={visited.length}>
  <div className="ip-stage" aria-label={tx('可旋转、缩放的手机拆解与实验场景')}><SceneBoundary message={tx('三维场景未能启动，请刷新后重试。')}><Scene {...{view,settings,cell,paused,speed,revision,explode,selected,glass,labels,workflow,highlight,tx}} onSelect={id=>{interact();setSelected(id);setMobilePanel(true)}} onTouch={point=>change('touch',point)} onInteract={interact}/></SceneBoundary></div>
  <div className="ip-heading"><span className="ip-eyebrow">{tx('内部世界')} <i/> IPHONE 13</span><h1>{system.id==='assembly'?tx('一部手机，拆到底。'):tx(system.label)}</h1><p>{tx(system.caption)}</p></div>
  <nav className="ip-systems" aria-label={tx('手机系统')}>
   {SYSTEMS.map((s,i)=><button key={s.id} aria-pressed={view===s.id} onClick={()=>choose(s.id)}><small>{String(i+1).padStart(2,'0')}</small><span>{tx(s.label)}</span><i style={{background:visited.includes(s.id)?s.color:'transparent'}}/></button>)}
  </nav>
  <aside className="ip-panel" aria-label={tx('探索与仪器')}>
   <button className="ip-panel-toggle" onClick={()=>setMobilePanel(v=>!v)} aria-expanded={mobilePanel}>{tx('探索与仪器')}<span>{mobilePanel?'−':'+'}</span></button>
   <div className="ip-panel-body">
   {view==='assembly'?<>
    <div className="ip-section-label">{tx('分解与观察')}<span>01 / 07</span></div>
    <Slider label={tx('拆解程度')} value={explode} onChange={v=>{interact();setExplode(v)}} unit={`${Math.round(explode*100)}%`}/>
    <div className="ip-tool-pair"><button aria-pressed={glass} onClick={()=>{interact();setGlass(v=>!v)}}><Eye size={15}/>{tx('透视玻璃')}</button><button aria-pressed={labels} onClick={()=>{interact();setLabels(v=>!v)}}>{tx('零件标记')}</button></div>
    <div className="ip-section-label">{tx('让系统一起工作')}</div>
    <div className="ip-segments">{(['photo','game','call'] as const).map((w,i)=><button key={w} aria-pressed={workflow===w} onClick={()=>{interact();setWorkflow(w);setExplode(v=>Math.max(v,.45))}}>{tx(['拍照','游戏','通话'][i])}</button>)}</div>
    <div className="ip-data-route">{PATHS[workflow].map((id,i)=><span key={`${id}-${i}`}><button onClick={()=>{interact();setSelected(id)}}>{tx(PARTS.find(p=>p.id===id)!.name)}</button>{i<PATHS[workflow].length-1&&<ArrowRight size={11}/>}</span>)}</div>
    <label className="ip-select-label">{tx('检查一个零件')}<select value={selected??''} onChange={e=>{interact();setSelected(e.target.value||null)}}><option value="">{tx('选择零件')}</option>{PARTS.map(pt=><option key={pt.id} value={pt.id}>{tx(pt.name)}</option>)}</select></label>
    {part&&<section className="ip-part-description"><span className="ip-part-index">{String(PARTS.indexOf(part)+1).padStart(2,'0')} / {PARTS.length}</span><h2>{tx(part.name)}</h2><p>{tx(part.detail)}</p><div className="ip-part-actions"><button aria-pressed={highlight===part.system} onClick={()=>{interact();setHighlight(v=>v===part.system?null:part.system)}}>{highlight===part.system?tx('显示所有系统'):tx('单独看这个系统')}</button>{part.system!=='body'&&<button onClick={()=>choose(part.system as Lab)}>{tx('进入实验')}<ArrowRight size={14}/></button>}</div></section>}
   </>:view==='display'?<>
    <div className="ip-section-label">{tx('发光子像素')}<span>RGB / OLED</span></div>
    {settings.rgb.map((v,i)=><Slider key={i} label={tx(['红','绿','蓝'][i])} value={v} min={0} max={255} step={1} onChange={n=>{const next=[...settings.rgb] as [number,number,number];next[i]=n;change('rgb',next)}} unit={`${v} / 255`}/>)}
    <div className="ip-segments"><button onClick={()=>change('rgb',[0,0,0])}>{tx('全黑')}</button><button onClick={()=>change('rgb',[255,255,255])}>{tx('白色')}</button><button onClick={()=>change('rgb',[255,156,43])}>{tx('琥珀色')}</button></div>
    <Readout label={tx('相对亮度')} value={`${(display.luminance*100).toFixed(1)}`} unit="%"/>
    <p className="ip-explanation">{tx('下方色带是三种光的混合。读数先把 sRGB 编码变成线性光，再按亮度权重相加。黑色意味着发光关闭。')}</p>
    <div className="ip-facts"><span>1170 × 2532</span><span>460 ppi</span><span>6.1″ OLED</span></div>
    <p className="ip-explanation">{tx('点一下像素阵列，记录触控位置。网格是电极结构示意；RGB 条纹不是原机子像素排布。扫描线按 1/120 慢放。')}</p>
    {settings.touch&&<div className="ip-touch-result">{tx('触点已记录')} · X {settings.touch[0].toFixed(2)} / Y {settings.touch[1].toFixed(2)}<button onClick={()=>change('touch',null)}>{tx('清除')}</button></div>}
   </>:view==='compute'?<>
    <div className="ip-section-label">{tx('芯片里的分工')}<span>A15</span></div><div className="ip-facts"><span>6 CPU</span><span>4 GPU</span><span>16 NEURAL</span></div>
    <p className="ip-explanation">{tx('CPU 执行通用指令，GPU 并行处理图形，神经网络引擎加速特定计算。缓存和内存让数据及时到达。功能区不是原机版图。')}</p>
    <div className="ip-section-label">{tx('进入一个八位加法器')}</div>
    <Slider label={tx('输入 A')} value={settings.a} min={0} max={255} step={1} onChange={v=>change('a',v)} unit={`${settings.a}`}/><Slider label={tx('输入 B')} value={settings.b} min={0} max={255} step={1} onChange={v=>change('b',v)} unit={`${settings.b}`}/>
    <div className="ip-binary"><span>A <b>{settings.a.toString(2).padStart(8,'0')}</b></span><span>B <b>{settings.b.toString(2).padStart(8,'0')}</b></span><span>Σ <b>{sum.total.toString(2).padStart(9,'0')}</b></span></div>
    <Readout label={tx('完整结果')} value={`${sum.total}`} unit={sum.carry?tx('含进位'):tx('无溢出')}/><p className="ip-explanation">{tx('每一级把 A、B 和上一级进位相加。画面从左边最低位开始；这是独立的真实逻辑计算，不是 A15 电路复刻。')}</p>
    <button className="ip-inline-action" onClick={()=>{change('a',255);change('b',1)}}>{tx('试试 255 + 1')}<ArrowRight size={14}/></button>
   </>:view==='camera'?<>
    <div className="ip-section-label">{tx('光学实验台')}<span>1/f = 1/u + 1/v</span></div>
    <Slider label={tx('物体距离')} value={settings.objectM} min={.2} max={3} step={.01} onChange={v=>change('objectM',v)} unit={`${settings.objectM.toFixed(2)} m`}/><Slider label={tx('对焦距离')} value={settings.focusM} min={.2} max={3} step={.01} onChange={v=>change('focusM',v)} unit={`${settings.focusM.toFixed(2)} m`}/>
    <div className="ip-readout-pair"><Readout label={tx('成像距离')} value={optics.image.toFixed(4)} unit="mm"/><Readout label={tx('弥散圈直径')} value={(optics.blurMm*1000).toFixed(2)} unit="μm"/></div>
    <button className="ip-inline-action" onClick={()=>change('focusM',settings.objectM)}>{tx('把焦点对准物体')}<ArrowRight size={14}/></button>
    <div className="ip-focus-preview" aria-label={tx('计算弥散圈后的测试图')}><div style={{filter:`blur(${Math.min(8,optics.blurMm*350)}px)`}}>{Array.from({length:18},(_,i)=><i key={i} style={{height:`${32+(i%5)*12}%`}}/>)}</div><small>{tx('传感器测试图')}</small></div>
    <p className="ip-explanation">{tx('物体靠近时，像面远离镜头。传感器没有位于像面上，光就形成一个小圆而不是一个点。自动对焦用马达调整镜片位置。')}</p>
    <p className="ip-explanation">{tx('光学采用理想薄透镜、参考焦距 4.2 mm 和固定 ƒ/1.6。像距差在场景中放大 30 倍；不是原机多片非球面镜头的光线追迹。')}</p>
    <div className="ip-facts"><span>12 MP</span><span>ƒ/1.6 WIDE</span><span>RGGB</span></div>
   </>:view==='power'?<>
    <div className="ip-section-label">{tx('能量账本')}<span>{tx('电源时间')} ×60</span></div>
    <Slider label={tx('屏幕亮度')} value={settings.power.brightness} onChange={v=>powerChange('brightness',v)} unit={`${Math.round(settings.power.brightness*100)}%`}/><Slider label={tx('计算负载')} value={settings.power.workload} onChange={v=>powerChange('workload',v)} unit={`${Math.round(settings.power.workload*100)}%`}/><Slider label={tx('无线负载')} value={settings.power.radio} onChange={v=>powerChange('radio',v)} unit={`${Math.round(settings.power.radio*100)}%`}/>
    <button className="ip-inline-action" aria-pressed={settings.power.charging} onClick={()=>powerChange('charging',!settings.power.charging)}>{settings.power.charging?tx('拔下充电器'):tx('接上 20 W 充电器')}<ArrowRight size={14}/></button>
    <div className="ip-readout-pair"><Readout label={tx('电池电量')} value={(cell.soc*100).toFixed(1)} unit="%"/><Readout label={tx('系统负载')} value={p.load.toFixed(2)} unit="W"/><Readout label={tx('电池电流')} value={Math.abs(p.currentA).toFixed(2)} unit="A"/><Readout label={tx('估算剩余使用')} value={p.hours.toFixed(1)} unit="h"/></div>
    <div className="ip-energy-meter">{(['display','compute','radio','other'] as const).map((key,i)=><i key={key} style={{width:`${powerShare(p[key],p.load)*100}%`,background:['#8faf9c','#ac98bf','#93a7c6','#677880'][i]}}/>)}</div>
    <p className="ip-explanation">{tx('绿色粒子表示电解质里的锂离子，金色粒子表示外电路电子。充电时两者方向反转。粒子数量、速度和电池层厚度都是示意。')}</p>
    <Slider label={tx('设置初始电量')} value={cell.soc} min={.01} max={1} onChange={v=>{interact();setCell(c=>({...c,soc:v}))}} unit={`${Math.round(cell.soc*100)}%`}/>
    <small className="ip-model-note">{tx('参考电池 12 Wh；各系统功率与充电曲线为教学参数，不预测真实 iPhone 续航。')}</small>
   </>:view==='radio'?<>
    <div className="ip-section-label">{tx('数字进入载波')}<span>BPSK</span></div><div className="ip-bits">{settings.bits.map((v,i)=><button key={i} aria-label={`${tx('比特')} ${i+1}`} aria-pressed={!!v} onClick={()=>change('bits',settings.bits.map((b,j)=>j===i?1-b:b))}>{v}</button>)}</div>
    <p className="ip-explanation">{tx('点一下比特。0 和 1 使用相差半个周期的载波相位。这是 BPSK 原理实验；真实蜂窝系统还包含编码、多载波和更复杂的调制。')}</p>
    <Slider label={tx('载波频率')} value={settings.frequencyGHz} min={.7} max={3.5} step={.1} onChange={v=>change('frequencyGHz',v)} unit={`${settings.frequencyGHz.toFixed(1)} GHz`}/><Slider label={tx('基站距离')} value={settings.distanceKm} min={.1} max={10} step={.1} onChange={v=>change('distanceKm',v)} unit={`${settings.distanceKm.toFixed(1)} km`}/>
    <div className="ip-readout-pair"><Readout label={tx('自由空间损耗')} value={link.loss.toFixed(1)} unit="dB"/><Readout label={tx('接收信噪比')} value={link.snrDb.toFixed(1)} unit="dB"/><Readout label={tx('香农容量上界')} value={link.capacityMbps.toFixed(1)} unit="Mbit/s"/><Readout label={tx('波长')} value={(link.wavelengthM*100).toFixed(1)} unit="cm"/></div>
    <p className="ip-model-note">{tx('自由空间、20 MHz 带宽、23 dBm 发射、15 dBi 基站增益、7 dB 噪声系数。无建筑遮挡或干扰，容量上界不是实测网速。')}</p>
   </>:<>
    <div className="ip-section-label">{tx('弹簧、质量与线圈')}<span>F = m·a + c·v + k·x</span></div>
    <Slider label={tx('驱动频率')} value={settings.hapticHz} min={80} max={260} step={1} onChange={v=>change('hapticHz',v)} unit={`${settings.hapticHz} Hz`}/><Slider label={tx('驱动力幅值')} value={settings.forceN} min={0} max={.06} step={.001} onChange={v=>change('forceN',v)} unit={`${(settings.forceN*1000).toFixed(0)} mN`}/>
    <div className="ip-readout-pair"><Readout label={tx('位移幅值')} value={haptic.amplitudeMm.toFixed(3)} unit="mm"/><Readout label={tx('共振频率')} value="175" unit="Hz"/></div>
    <button className="ip-inline-action" onClick={()=>change('hapticHz',175)}>{tx('回到共振峰')}<ArrowRight size={14}/></button>
    <p className="ip-explanation">{tx('电磁力驱动质量来回运动，弹簧把它拉回，阻尼消耗能量。在同样的驱动力下，接近共振频率会产生更大的运动。')}</p>
    <p className="ip-model-note">{tx('2 g 移动质量、175 Hz 共振、Q=6 均为参考参数，非 Taptic Engine 实测。运动按 1/100 慢放，位移放大 12 倍。曲线来自稳态受迫阻尼振子。')}</p>
   </>}
   </div>
  </aside>
  <div className="ip-playback"><button aria-label={paused?tx('继续'):tx('暂停')} onClick={()=>{interact();setPaused(v=>!v)}}>{paused?<Play size={17} weight="fill"/>:<Pause size={17} weight="fill"/>}</button><select aria-label={tx('播放速度')} value={speed} onChange={e=>{interact();setSpeed(Number(e.target.value))}}>{[.25,1,4].map(v=><option key={v} value={v}>{v}×</option>)}</select><span className="ip-playback-line"/><button aria-label={tx('恢复默认参数与镜头')} onClick={reset}><ArrowCounterClockwise size={17}/></button><button className="ip-guide-button" onClick={()=>{interact();setGuide(true)}}>{tx('导览')}</button><button aria-label={tx('模型与来源')} onClick={()=>setDetails(true)}><Info size={18}/></button></div>
  <div className="ip-stage-note"><span>{view==='assembly'?tx('拖动旋转 · 滚轮缩放 · 点选零件'):tx('拖动旋转 · 滚轮放大细节')}</span><small>{tx('原创教学模型 · 非工程 CAD')}</small></div>
  {view!=='assembly'&&<button className="ip-back" onClick={()=>choose('assembly')}><ArrowLeft size={14}/>{tx('回到整机')}</button>}
  {details&&<div className="ip-modal-shade" onClick={()=>setDetails(false)}><section ref={modalRef} className="ip-modal" role="dialog" aria-modal="true" aria-label={tx('模型与来源')} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDetails(false);return}if(e.key!=='Tab')return;const nodes=modalRef.current?.querySelectorAll<HTMLElement>('button,a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}><button className="ip-modal-close" aria-label={tx('关闭')} onClick={()=>setDetails(false)}><X size={20}/></button><span className="ip-eyebrow">{tx('结构 · 计算 · 边界')}</span><h2>{tx('哪些是真实的？')}</h2><p>{tx('外形尺寸与公开配置参照 Apple iPhone 13。内部是原创程序化教学模型：零件布局、几何与拆解路径不来自生产 CAD，不能作为维修或拆机指南。')}</p><p>{tx('八位加法器、薄透镜、sRGB 线性光混合、能量守恒、自由空间链路和受迫振子都由画面参数计算。各实验的模型边界写在仪器旁。')}</p><p>{tx('这是一张可探索的系统地图，不声称覆盖手机全部工程细节。触控网格、芯片功能区、离子粒子与数据脉冲用于解释机制。')}</p><a href="https://support.apple.com/en-us/111872" target="_blank" rel="noreferrer">Apple · iPhone 13 {tx('技术规格')}</a><a href="https://www.energy.gov/science/doe-explainsbatteries" target="_blank" rel="noreferrer">DOE · {tx('锂离子电池原理')}</a><a href="https://www.sony-semicon.com/en/technology/is/index.html" target="_blank" rel="noreferrer">Sony · CMOS {tx('图像传感器')}</a><p className="ip-model-note">{tx('所有场景几何、材质和图表均为原创生成，无第三方拆机照片或模型。完整参数与引用见世界源码中的 SOURCES.md。')}</p></section></div>}
  <GuideTour worldId="iphone-teardown" steps={guideSteps} defaultOpen={guide} placement="stage" stagePlan={[{position:'bottom-left',mobilePosition:'top-left',treatment:'caption',tone:'light',width:'narrow',motion:'fade'}]} onExit={()=>setGuide(false)} exitLabel={tx('自由探索')}/>
 </div>
}
