import type { Particle, SceneKind } from '../particle-data'

export const exhibitLabels: Record<SceneKind, [string, string]> = {
 'proton': ['核子里的束缚', 'Bound in a nucleon'], 'meson': ['夸克与反夸克', 'Quark–antiquark pair'],
 'top-decay': ['衰变为 b 与 W', 'Decay to b and W'], 'atom': ['电子位置分布', 'Electron distribution'],
 'cosmic': ['从大气到地面', 'Through the atmosphere'], 'tau-shower': ['短暂出现后衰变', 'A short life, then decay'],
 'oscillation': ['中微子味振荡', 'Neutrino oscillation'], 'photon-wave': ['电磁场的传播', 'An electromagnetic wave'],
 'flux-tube': ['夸克之间的作用', 'Interaction of quarks'], 'beta-decay': ['参与 β 衰变', 'Beta decay'],
 'z-exchange': ['中性弱相互作用', 'Neutral weak interaction'], 'higgs-field': ['与质量的联系', 'The connection to mass'],
}

/** Original subject diagrams, not particle portraits. Radius never encodes mass or size. */
export function ExhibitPreview({ particle }: { particle: Particle }) {
 const kind=particle.scene
 const node=(x:number,y:number,r=4)=> <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none"/>
 return <svg className="sm-exhibit-preview" viewBox="0 0 140 76" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true" data-exhibit={kind}>
  {(kind==='proton'||kind==='meson')&&<>
   <ellipse cx="70" cy="38" rx="49" ry="29" opacity=".12" fill="currentColor" stroke="none"/>
   {kind==='proton'?<><path d="M48 49Q64 24 70 20Q91 32 95 51Q70 62 48 49" opacity=".55"/>{node(48,49)}{node(70,20)}{node(95,51)}<text x="48" y="42">u</text><text x="70" y="13">{particle.id==='d'?'d':'u'}</text><text x="96" y="43">d</text></>:<><path d="M42 38Q70 23 98 38Q70 52 42 38" opacity=".55"/>{node(42,38)}{node(98,38)}<text x="42" y="26">{particle.symbol}</text><text x="98" y="26">{particle.symbol}̄</text></>}
  </>}
  {kind==='atom'&&<>{[25,19,12].map((r,i)=><circle key={r} cx="70" cy="38" r={r} fill="currentColor" fillOpacity={.04+i*.025} strokeOpacity=".12"/>)}{Array.from({length:35},(_,i)=>{const a=i*2.399,r=4+Math.sqrt(i)*3.7;return <circle key={i} cx={70+Math.cos(a)*r} cy={38+Math.sin(a)*r} r=".9" fill="currentColor" stroke="none" opacity=".55"/>})}{node(70,38,2)}</>}
  {kind==='cosmic'&&<><path d="M10 62Q70 51 130 62M10 21Q70 8 130 21" opacity=".25"/><path className="sm-preview-flow" d="M53 4L70 24L61 48L71 63M70 24L101 47" strokeDasharray="3 3"/>{node(61,48,3)}<text x="52" y="47">μ</text></>}
  {(kind==='top-decay'||kind==='tau-shower')&&<><path d="M17 38H57M57 38Q78 19 119 16M57 38Q87 47 118 61"/>{kind==='tau-shower'&&<path d="M57 38H122" strokeDasharray="3 3"/>}<circle className="sm-preview-pulse" cx="57" cy="38" r="9" strokeOpacity=".3"/>{node(57,38,3)}<text x="24" y="28">{particle.symbol}</text>{kind==='top-decay'&&<><text x="119" y="11">b</text><text x="119" y="73">W⁺</text></>}</>}
  {kind==='oscillation'&&<><path className="sm-preview-flow" d="M17 39H95" strokeDasharray="2 4"/>{node(17,39,3)}<rect x="100" y="17" width="25" height="43" rx="3" opacity=".4"/>{[0,1,2].map((i)=><rect key={i} x={104+i*6} y={27+i*6} width="3" height={26-i*6} fill="currentColor" opacity={particle.id===['ve','vmu','vtau'][i]?1:.25} stroke="none"/>)}<text x="48" y="24">{particle.symbol}</text></>}
  {kind==='photon-wave'&&<><path d="M8 38H132" opacity=".2"/><path className="sm-preview-flow" d="M8 38Q18 7 28 38T48 38T68 38T88 38T108 38T128 38" strokeWidth="1.8"/><text x="121" y="16">E</text></>}
  {kind==='flux-tube'&&<>{node(26,38)}{node(114,38)}<path className="sm-preview-flow" d="M31 38C45 12 49 64 61 38S77 64 89 38S102 25 109 38"/><text x="26" y="25">q</text><text x="114" y="25">q</text></>}
  {kind==='beta-decay'&&<><path d="M15 22H65L119 56M65 22L88 48L123 23" strokeDasharray="3 2"/><text x="18" y="15">d</text><text x="65" y="15">u</text><text x="86" y="66">W⁻*</text><text x="125" y="17">e⁻</text><text x="126" y="69">ν̄e</text></>}
  {kind==='z-exchange'&&<><path d="M15 12L54 38L15 64M125 12L86 38L125 64"/><path className="sm-preview-flow" d="M54 38H86" strokeDasharray="3 3"/><text x="70" y="29">Z*</text></>}
  {kind==='higgs-field'&&<>{[0,1,2,3,4].map(i=><path key={i} d={`M12 ${16+i*11}Q70 ${4+i*11} 128 ${16+i*11}`} opacity=".18"/>)}<circle className="sm-preview-pulse" cx="70" cy="38" r="17" opacity=".5"/><text x="70" y="42">H</text></>}
 </svg>
}
