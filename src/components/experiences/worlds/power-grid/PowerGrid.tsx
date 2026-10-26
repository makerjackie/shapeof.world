import './styles/PowerGrid.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { GridScene, type SceneState } from './GridScene'
import { FrequencyChart } from './FrequencyChart'
import { DEFAULT, END_TIME, simulate, sampleAt, nadirUntil, type Run, type Settings } from './model'

export function PowerGrid({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [settings, setSettings] = useState<Settings>({...DEFAULT})
  const [run, setRun] = useState<Run|null>(null), [previous, setPrevious] = useState<Run|null>(null)
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(true), [speed, setSpeed] = useState(1)
  const [chapter, setChapter] = useState('frequency'), [insight, setInsight] = useState(0), [viewRevision, setViewRevision] = useState(0)
  const [wire, setWire] = useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('style')==='blueprint')
  const [reduced] = useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [windowSeconds, setWindowSeconds] = useState(30)
  const sceneState = useRef<SceneState>({hz:50,tripped:false,shed:0,playing:true,reduced})
  const point = run ? sampleAt(run,time) : { hz:50, mechanicalMW:0, shedMW:0, rocof:0 }
  const nadir = run ? nadirUntil(run,time) : null
  sceneState.current = {hz:point.hz,tripped:!!run,shed:point.shedMW,playing:playing&&chapter==='frequency',reduced}
  const register = controls.registerInteraction
  const trip = useCallback(() => { register(); setRun(simulate(settings)); setTime(0); setPlaying(true); setInsight(0); setWindowSeconds(30) }, [register,settings])
  const reset = () => { register(); if(run)setPrevious({...run,samples:run.samples.filter(p=>p.t<=time),nadir:nadirUntil(run,time)}); setRun(null); setTime(0); setPlaying(true); setWindowSeconds(30) }
  const change = (next: Partial<Settings>) => { register(); if(run)setPrevious({...run,samples:run.samples.filter(p=>p.t<=time),nadir:nadirUntil(run,time)}); setSettings(s=>({...s,...next})); setRun(null); setTime(0); setPlaying(true); setWindowSeconds(30) }
  const seek = (at:number) => { register(); if(!run)setRun(simulate(settings)); setTime(at); setPlaying(false); if(at>30)setWindowSeconds(180) }
  useEffect(()=>{
    if(!run||!playing||chapter!=='frequency')return
    let frame=0,last=performance.now()
    const tick=(now:number)=>{ const dt=Math.min(.1,(now-last)/1000); last=now; if(!document.hidden&&!isWorldPaused())setTime(t=>Math.min(END_TIME,t+dt*speed)); frame=requestAnimationFrame(tick) }
    frame=requestAnimationFrame(tick); return()=>cancelAnimationFrame(frame)
  },[run,playing,speed,chapter])
  useEffect(()=>{ if(time>=END_TIME)setPlaying(false) },[time])
  const explanations = [
    { title: '第一秒：惯性', text: '转子里存着动能。发电突然少了，仍在联网的转子一边减速，一边释放动能，让频率下降得慢一些。', at:.8 },
    { title: '随后：调速器', text: '调速器感到转速变慢，增加汽轮机或水轮机的输入。它能止住下跌，但通常会留下频率偏差。', at:8 },
    { title: '更久：调度', text: '调度继续调整功率指令，让频率回到 50 Hz。本模型从第 15 秒开始，观察三分钟的恢复。', at:120 },
  ]
  const steps=useMemo(()=>[
    {title:'先拉掉一台机组',body:'按“拉闸”，看曲线往下走。最低频率会留下来，不用抢着读数。'},
    {title:'换成低惯性',body:'在相同的机组损失下，比较最初的下跌。旋转的质量越少，频率越容易改变。'},
    {title:'让城市先少用一点',body:'低于教学保护线持续 0.2 秒，就切掉 500 MW 负荷。保住频率，也意味着有人暂时失去供电。'},
  ],[])
  return <div className={`pg-world ${wire?'pg-blueprint':''}`} data-testid="power-grid" data-time={time.toFixed(2)} data-tripped={!!run}>
    <header className="pg-header">
      <div><h1>{tx('电网的形状')}</h1><p>{tx('一台机组停下来，整张网一起回应。')}</p></div>
      <nav aria-label={tx('电网视图')}>
        {[['frequency','频率'],['balance','一天的平衡'],['china','中国这张网']].map(([id,label])=><button key={id} aria-pressed={chapter===id} onClick={()=>{setChapter(id);register()}}>{tx(label)}{id!=='frequency'&&<small>{tx('筹备中')}</small>}</button>)}
      </nav>
    </header>
    {chapter==='frequency'?<main className="pg-workbench">
      <section className="pg-stage" aria-label={tx('简化电网模型')}>
        <GridScene state={sceneState} wire={wire} onInteract={register} resetView={viewRevision}/>
        <div className="pg-stage-label"><span>{tx('发电')}</span><span>{tx('输电')}</span><span>{tx('用电')}</span></div>
        <div className="pg-stage-footer"><span>{tx('单一同步区 · 结构示意 · 转动已放慢')}</span><button onClick={()=>{setViewRevision(v=>v+1);register()}}>{tx('复位视角')}</button></div>
        {point.shedMW>0&&point.hz>50&&<p className="pg-rebound">{tx('切负荷后需求少了，机组增发还没退下来。')}</p>}
        <div className="pg-scene-status" data-alert={point.shedMW>0} role="status">{point.shedMW>0?`${tx('已切负荷')} ${point.shedMW.toFixed(0)} MW`:run?`${tx('机组已断开')} · −${settings.lossMW} MW`:tx('三组机组联网运行')}</div>
      </section>
      <aside className="pg-operation">
        <h2>{tx('如果突然少了一台？')}</h2>
        <p className="pg-invitation">{tx('拉开红色开关，看这张网怎样接住它。')}</p>
        <button className="pg-trip" onClick={trip} disabled={!!run} data-testid="trip"><span className="pg-switch" aria-hidden="true"/>{run?tx('机组已跳闸'):tx('拉闸')}<small>−{settings.lossMW.toLocaleString('en')} MW</small></button>
        <div className="pg-presets"><button aria-pressed={settings.inertia===5} onClick={()=>change({inertia:5})}>{tx('常规惯性')}</button><button aria-pressed={settings.inertia===1.5} onClick={()=>change({inertia:1.5})}>{tx('低惯性')}</button></div>
        <p className="pg-config-note">{tx('换一种惯性，再拉闸比较。')}</p>
        <div className="pg-explanation">
          <div className="pg-explanation-tabs">{explanations.map((e,i)=><button key={e.at} aria-pressed={insight===i} onClick={()=>{setInsight(i);register()}}>{tx(e.title)}</button>)}</div>
          <p data-testid="explanation">{tx(explanations[insight].text)}</p>
          {insight===0&&<div className="pg-rocof"><span>{tx('刚跳闸的下降速度')}</span><b>{(-50*(settings.lossMW/10000)/(2*settings.inertia)).toFixed(2)} Hz/s</b></div>}
          {run&&<button className="pg-text-button" onClick={()=>seek(explanations[insight].at)}>{tx('停在这一刻')} <span>{explanations[insight].at} s</span></button>}
        </div>
        <details className="pg-settings"><summary>{tx('调整实验')}</summary>
          <label>{tx('跳闸功率')}<select value={settings.lossMW} onChange={e=>change({lossMW:Number(e.target.value)})}>{[500,1000,2000,2500].map(v=><option key={v} value={v}>{v} MW</option>)}</select></label>
          <label>{tx('可用备用')}<select value={settings.reserveMW} onChange={e=>change({reserveMW:Number(e.target.value)})}>{[400,1500,2500].map(v=><option key={v} value={v}>{v} MW</option>)}</select></label>
          {(['governor','agc','protection'] as const).map((key,i)=><label key={key}>{tx(['调速器','自动调度 AGC','低频切负荷'][i])}<input type="checkbox" checked={settings[key]} onChange={e=>change({[key]:e.target.checked})}/></label>)}
          <p>{tx('参数改变后实验归零。保护是教学设定，不代表任何实际电网。')}</p>
        </details>
      </aside>
      <section className="pg-frequency" aria-label={tx('频率记录')}>
        <div className="pg-readings">
          <div><span>{tx('现在')}</span><strong data-testid="frequency">{point.hz.toFixed(2)}<small>Hz</small></strong></div>
          <div className="pg-nadir" data-active={!!run}><span>{tx('最低频率')}</span><strong data-testid="nadir">{(nadir?.hz??50).toFixed(2)}<small>Hz</small></strong></div>
          <div className="pg-recovery"><span>{tx('机组增发')}</span><strong>{point.mechanicalMW.toFixed(0)}<small>MW</small></strong></div>
          <div className="pg-time"><span>{tx('跳闸后')}</span><strong>{time.toFixed(1)}<small>s</small></strong></div>
        </div>
        {(point.hz<47||point.hz>53)&&<p className="pg-model-limit" role="status">{tx('大幅偏离，超出此模型的可靠范围。')}</p>}
        <FrequencyChart run={run} time={time} previous={previous} windowSeconds={windowSeconds}/>
        <div className="pg-playback">
          <button onClick={()=>{setPlaying(v=>!v);register()}} disabled={!run}>{playing?tx('暂停'):tx('继续')}</button>
          <button onClick={reset}>{tx('再试一次')}</button>
          <label>{tx('速度')}<select aria-label={tx('播放速度')} value={speed} onChange={e=>{setSpeed(Number(e.target.value));register()}}>{[.25,1,4].map(v=><option key={v} value={v}>{v}×</option>)}</select></label>
          <button className="pg-end" onClick={()=>seek(END_TIME)} disabled={!run}>{tx('看三分钟后')}</button>
        </div>
        <label className="pg-scrub"><span>{tx('回看')}</span><input aria-label={tx('回看时间')} type="range" min="0" max={END_TIME} step=".1" value={time} disabled={!run} onChange={e=>seek(Number(e.target.value))}/><button onClick={()=>{setWindowSeconds(v=>v===30?180:30);register()}}>{windowSeconds} s</button></label>
        <div className="pg-chart-note">{previous?<span>{tx('灰色虚线：上一次实验')}</span>:<span>{tx('红点记录最低值与保护动作')}</span>}<span>{tx('摇摆方程 · 下垂控制 · AGC')}</span></div>
      </section>
    </main>:<section className="pg-placeholder"><span>{tx('正在准备这一视图')}</span><h2>{tx(chapter==='balance'?'太阳落山以后，谁来接班？':'从西部的电站，到东部的城市。')}</h2><p>{tx(chapter==='balance'?'将在一天的负荷曲线上调节风、光、水、煤与储能，观察净负荷和爬坡。':'将用电站、特高压主干线与年份，观察西电东送的网络生长。')}</p><button onClick={()=>setChapter('frequency')}>{tx('先玩频率实验')}</button></section>}
    <footer className="pg-footer"><span>{tx('教学模型，非实时电网')}</span><button onClick={()=>{setWire(v=>!v);register()}}>{wire?tx('模型台'):tx('工程图')}</button></footer>
    <GuideTour worldId="power-grid" steps={steps} placement="stage" stagePlan={steps.map(()=>({position:'center-left',mobilePosition:'bottom-center',tone:'light',width:'narrow',treatment:'caption'}))} />
  </div>
}
