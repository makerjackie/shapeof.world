import { useEffect, useMemo, useState } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import { buildAdder, primitiveCircuit, type Circuit, type Gate } from './logic-model'
export type LogicLesson = 'not' | 'nand' | 'full' | 'four'

function GateShape({ x, y, gate, resolved, selected, onSelect }: { x:number;y:number;gate:Gate;resolved:boolean;selected:boolean;onSelect:()=>void }) {
  return <g className="cz-gate" data-value={resolved ? Number(gate.value) : 'pending'} data-selected={selected} onClick={onSelect} role="button" tabIndex={0} aria-label={`${gate.id} ${gate.kind}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onSelect()}}>
    <path d={gate.kind==='NOT'?`M${x},${y-21} L${x+46},${y} L${x},${y+21} Z`:`M${x},${y-21} H${x+25} A21,21 0 0 1 ${x+25},${y+21} H${x} Z`} />
    <circle cx={x+51} cy={y} r="5" /><text x={x+23} y={y+4}>{gate.kind==='NOT'?'NOT':'&'}</text>
    <text className="cz-gate-value" x={x+69} y={y+5}>{resolved?Number(gate.value):'·'}</text>
  </g>
}
function Network({ circuit, bit, step, selected, select }: { circuit:Circuit;bit:number;step:number;selected:string;select:(id:string)=>void }) {
  const tx=useExperienceI18n()
  const gates=circuit.gates.filter(g=>g.bit===bit)
  const simple=gates.length===1
  const positions: Record<string,[number,number]>={}
  const suffixes=['n','x','y','p','q','r','s']
  const points: [number,number][]=[[110,165],[245,85],[245,245],[375,165],[500,165],[620,85],[620,245]]
  if(simple) positions.Y=[320,165]
  else { suffixes.forEach((s,i)=>{positions[`b${bit}${s}`]=points[i]});positions[`S${bit}`]=[755,165];positions[`C${bit+1}`]=[755,315] }
  const sources:Record<string,[number,number]> = simple ? gates[0].kind==='NOT' ? {A:[40,165]} : {A:[40,115],B:[40,215]} : {[`A${bit}`]:[30,50],[`B${bit}`]:[30,275],[`C${bit}`]:[365,330]}
  const start=(id:string):[number,number]=>positions[id]?[positions[id][0]+56,positions[id][1]]:sources[id]??[0,0]
  return <svg className="cz-network" viewBox={simple?'0 0 620 360':'0 0 870 390'} aria-label={tx('门电路信号图')}>
    <defs><pattern id="cz-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".12"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#cz-dot-grid)"/>
    {gates.flatMap(gate=>gate.inputs.map((input,i)=>{
      const [x1,y1]=start(input), [x2,gy]=positions[gate.id], y2=gy+(gate.inputs.length===1?0:i===0?-11:11)
      const mid=x1+(x2-x1)*(.43+i*.13)
      const known=circuit.depths[input]<=step
      return <path key={`${gate.id}-${i}`} d={`M${x1},${y1} H${mid} V${y2} H${x2}`} className="cz-wire" data-value={known?Number(circuit.values[input]):'pending'}/>
    }))}
    {Object.entries(sources).map(([id,[x,y]])=><g key={id}><circle cx={x} cy={y} r="5" className="cz-pin" data-value={Number(circuit.values[id])}/><text x={x+7} y={y-12} className="cz-input-label">{id} = {circuit.depths[id]<=step?Number(circuit.values[id]):'·'}</text></g>)}
    {gates.map(gate=><GateShape key={gate.id} gate={gate} x={positions[gate.id][0]} y={positions[gate.id][1]} resolved={step>=gate.depth} selected={selected===gate.id} onSelect={()=>select(gate.id)}/>)}
    {!simple&&<><text x="754" y="132">{tx('和')} S{bit}</text><text x="746" y="365">{tx('进位')} C{bit+1}</text><text x="354" y="131">XOR</text></>}
    {simple&&<text x="415" y="170">Y = {step?circuit.result:'·'}</text>}
  </svg>
}

export function LogicLab({ onClose, onInteract }: {onClose:()=>void;onInteract:()=>void}) {
  const tx=useExperienceI18n()
  const [lesson,setLesson]=useState<LogicLesson>('not')
  const [a,setA]=useState('3'),[b,setB]=useState('5')
  const [inputA,setInputA]=useState(false),[inputB,setInputB]=useState(false),[carryIn,setCarryIn]=useState(false)
  const [step,setStep]=useState(0),[running,setRunning]=useState(false),[bit,setBit]=useState(0),[selected,setSelected]=useState('')
  const [slow,setSlow]=useState(false),[zoomGates,setZoomGates]=useState(false)
  const circuit=useMemo(()=>lesson==='not'||lesson==='nand'?primitiveCircuit(lesson,inputA,inputB):buildAdder(Number(a),Number(b),lesson==='full'?1:4,lesson==='full'&&carryIn),[lesson,inputA,inputB,a,b,carryIn])
  const done=step>=circuit.maxDepth
  useEffect(()=>{setStep(0);setRunning(false);setBit(0);setSelected('')},[circuit])
  useEffect(()=>{
    if(!running||done)return
    const timer=setTimeout(()=>setStep(s=>Math.min(circuit.maxDepth,s+1)),slow?850:350)
    return()=>clearTimeout(timer)
  },[running,step,done,circuit.maxDepth,slow])
  const lessons=[{id:'not',label:tx('反相器')},{id:'nand',label:tx('与非门')},{id:'full',label:tx('一位全加器')},{id:'four',label:tx('四位加法器')}] as const
  const chosen=circuit.gates.find(g=>g.id===selected)
  const enter=(id:LogicLesson)=>{onInteract();if(id==='full'){setA('1');setB('1')}setLesson(id)}
  return <section className="cz-logic" data-lesson={lesson} data-step={step} data-done={done} aria-label={tx('算一次加法')}>
    <div className="cz-logic-main">
      <div className="cz-logic-head"><div><p>{tx('门级教学模型 · 非真实 ALU 网表')}</p><h1>{tx('把开关，连成计算。')}</h1></div><button className="cz-back" onClick={onClose}>{tx('返回尺度旅程')}</button></div>
      <nav className="cz-lessons" aria-label={tx('从开关到加法')}>{lessons.map(l=><button key={l.id} aria-pressed={lesson===l.id} onClick={()=>enter(l.id)}>{l.label}</button>)}</nav>
      <div className="cz-logic-message">{lesson==='not'?tx('一个输入翻过来：0 变 1，1 变 0。'):lesson==='nand'?tx('只有两个输入都为 1，与非门才输出 0。'):lesson==='full'?tx('两个数位加一个进位，得到一个和、一个新进位。'):tx('从最低位开始，进位依次传给下一位。')}</div>
      {lesson==='four'&&<div className="cz-bit-chain" aria-label={tx('四位进位链')}>
        {[0,1,2,3].map(i=><button key={i} aria-pressed={bit===i} onClick={()=>{onInteract();setBit(i)}}><small>{tx('第')} {i} {tx('位')}</small><span>{Number(a)>>i&1} + {Number(b)>>i&1} + <b data-value={circuit.depths[`C${i}`]<=step?Number(circuit.values[`C${i}`]):'pending'}>{circuit.depths[`C${i}`]<=step?Number(circuit.values[`C${i}`]):'·'}</b></span><strong>S{i} = {step>=circuit.depths[`S${i}`]?Number(circuit.values[`S${i}`]):'·'}</strong><em>C{i+1} {step>=circuit.depths[`C${i+1}`]?Number(circuit.values[`C${i+1}`]):'·'}</em></button>)}
      </div>}
      <div className="cz-network-wrap" data-zoom={zoomGates}><Network circuit={circuit} bit={bit} step={step} selected={selected} select={id=>{onInteract();setSelected(id)}}/></div>
      {(lesson==='not'||lesson==='nand')&&<div className="cz-switch-bank"><span>{tx('晶体管状态')}</span>{[{id:'Pₐ',on:!inputA},{id:'Nₐ',on:inputA},...(lesson==='nand'?[{id:'Pᵦ',on:!inputB},{id:'Nᵦ',on:inputB}]:[])].map(s=><b key={s.id} data-on={s.on}>{s.id} {s.on?tx('通'):tx('断')}</b>)}</div>}
      <button className="cz-gate-zoom" onClick={()=>{onInteract();setZoomGates(v=>!v)}}>{zoomGates?tx('总览门图'):tx('放大门图')}</button>
      <div className="cz-network-caption">{lesson==='not'?tx('CMOS 反相器由一个 PMOS 和一个 NMOS 配合开关。'):lesson==='nand'?tx('CMOS 与非门的上拉并联，下拉串联，共四个晶体管。'):tx('每一位用 9 个与非门；两组四门网络完成异或，最后一门产生进位。')}
        {chosen&&<span>{chosen.id}: {chosen.kind} ({chosen.inputs.map(i=>`${i}=${circuit.values[i]?1:0}`).join(', ')}) = {chosen.value?1:0}</span>}
      </div>
    </div>
    <aside className="cz-logic-controls">
      <h2>{lesson==='four'||lesson==='full'?tx('算一次加法'):tx('试试输入')}</h2>
      {lesson==='not'||lesson==='nand'?<div className="cz-boolean-inputs"><button onClick={()=>{onInteract();setInputA(v=>!v)}}>A <b>{Number(inputA)}</b></button>{lesson==='nand'&&<button onClick={()=>{onInteract();setInputB(v=>!v)}}>B <b>{Number(inputB)}</b></button>}</div>:<div className="cz-number-inputs"><label>A<input type="number" aria-label={tx('第一个数')} min="0" max={lesson==='full'?1:15} value={a} onChange={e=>{onInteract();setA(e.target.value===''?'':String(Math.max(0,Math.min(lesson==='full'?1:15,Math.trunc(Number(e.target.value))))))}}/></label><b>+</b><label>B<input type="number" aria-label={tx('第二个数')} min="0" max={lesson==='full'?1:15} value={b} onChange={e=>{onInteract();setB(e.target.value===''?'':String(Math.max(0,Math.min(lesson==='full'?1:15,Math.trunc(Number(e.target.value))))))}}/></label></div>}
      {lesson==='full'&&<button className="cz-carry-input" onClick={()=>{onInteract();setCarryIn(v=>!v)}}>{tx('输入进位')} C0 = {Number(carryIn)}</button>}
      <div className="cz-logic-result" aria-live="polite" data-result={done?circuit.result:'pending'}><small>{tx('输出')}</small><output>{done?lesson==='four'||lesson==='full'?`${lesson==='full'?Number(a)&1:Number(a)} + ${lesson==='full'?Number(b)&1:Number(b)}${lesson==='full'?` + ${Number(carryIn)}`:''} = ${circuit.result}`:`Y = ${circuit.result}`:tx('等待信号')}</output>{(lesson==='four'||lesson==='full')&&<span>{done?circuit.result.toString(2).padStart(lesson==='four'?5:2,'0'):'·····'} <small>{tx('二进制')}</small></span>}</div>
      <div className="cz-signal-legend"><i data-value="1"/>1 <i data-value="0"/>0 <i data-value="pending"/>{tx('未到达')}</div>
      <button className="cz-primary" onClick={()=>{onInteract();if(done)setStep(0);setRunning(r=>done?true:!r)}}>{running&&!done?tx('暂停信号'):done?tx('再算一次'):tx('运行信号')}</button>
      <div className="cz-logic-stepping"><button onClick={()=>{onInteract();setRunning(false);setStep(s=>Math.min(circuit.maxDepth,s+1))}} disabled={done}>{tx('下一拍')}</button><output>{step} / {circuit.maxDepth}</output><button onClick={()=>{onInteract();setSlow(v=>!v)}}>{slow?'0.4×':'1×'}</button></div>
      <p className="cz-logic-explain">{tx('先经过反相器理解“非”，再把与非门组成异或与进位。这里的 36 门模型只用与非门完成四位加法。')}</p>
      <p className="cz-logic-footnote">{tx('信号按逻辑依赖逐拍展开；这是教学顺序，不是芯片的真实传播时间。')}</p>
    </aside>
  </section>
}
