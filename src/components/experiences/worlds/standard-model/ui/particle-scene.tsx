import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { Particle } from '../particle-data'
import '../styles/scenes.css'
import { sampleHydrogenPosition } from '../particle-model'

/**
 * Behaviour exhibits. Particles have no appearance to photograph; every scene
 * is an original schematic of what the particle does, labelled as such.
 * CSS keyframes (scenes.css) carry the ambient loops; the confinement
 * scene needs a physics loop, which owns its DOM nodes imperatively.
 */
export function ParticleScene({ particle, reduced, en = false, onInteract }: { particle: Particle; reduced: boolean; en?: boolean; onInteract: () => void }) {
	const [runId, setRunId] = useState(0)
	const replay = () => {
		onInteract()
		setRunId(id => id + 1)
	}
	return <div className={`sm-scene sm-scene-${particle.scene}`} data-reduced={reduced || undefined}>
		<svg viewBox="0 0 420 300" className="sm-scene-canvas" role="group" aria-label={(en ? particle.nameEn : particle.name) + ' · ' + L(en, '行为示意', 'Behaviour schematic')}>
			<defs>
				<radialGradient id="sm-scene-bag" cx="50%" cy="46%" r="60%">
					<stop offset="0%" stopColor="#fffdf4" stopOpacity=".9" />
					<stop offset="62%" stopColor="#f3efdd" stopOpacity=".55" />
					<stop offset="100%" stopColor="#e7e2cd" stopOpacity=".08" />
				</radialGradient>
				<radialGradient id="sm-scene-flash" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#fff" stopOpacity=".95" />
					<stop offset="45%" stopColor="#ffe9b8" stopOpacity=".5" />
					<stop offset="100%" stopColor="#ffe9b8" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="sm-scene-sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#2e4653" stopOpacity=".16" />
					<stop offset="70%" stopColor="#9db4bb" stopOpacity=".1" />
					<stop offset="100%" stopColor="#c8b98a" stopOpacity=".22" />
				</linearGradient>
			</defs>
			{(particle.scene === 'proton' || particle.scene === 'meson')
				? <ConfinementScene
					labels={particle.scene === 'proton' ? (particle.id === 'd' ? ['u', 'd', 'd'] : ['u', 'u', 'd']) : [particle.symbol, ANTI[particle.id] ?? `${particle.symbol}̄`]}
					reduced={reduced} en={en} onInteract={onInteract} />
				: <Fragmentish runId={runId}>
					{particle.scene === 'top-decay' && <TopDecayScene reduced={reduced} en={en} />}
					{particle.scene === 'atom' && <AtomScene en={en} measured={runId > 0} />}
					{particle.scene === 'cosmic' && <CosmicScene reduced={reduced} en={en} />}
					{particle.scene === 'tau-shower' && <TauShowerScene reduced={reduced} en={en} />}
					{particle.scene === 'oscillation' && <OscillationScene reduced={reduced} en={en} flavor={particle.id === 've' ? 0 : particle.id === 'vmu' ? 1 : 2} />}
					{particle.scene === 'photon-wave' && <PhotonScene reduced={reduced} en={en} />}
					{particle.scene === 'flux-tube' && <FluxTubeScene reduced={reduced} en={en} />}
					{particle.scene === 'beta-decay' && <BetaDecayScene reduced={reduced} en={en} />}
					{particle.scene === 'z-exchange' && <ZExchangeScene reduced={reduced} en={en} />}
					{particle.scene === 'higgs-field' && <HiggsFieldScene reduced={reduced} en={en} />}
				</Fragmentish>}
		</svg>
		{particle.scene === 'atom' && <button className="sm-measure" onClick={replay}>{L(en, '测量一次电子位置', 'Measure electron position')}</button>}
	</div>
}

const ANTI: Record<string, string> = { c: 'c̄', s: 's̄', b: 'b̄' }

/** Scene labels are drawn inside the SVG; they follow the interface language. */
const L = (en: boolean, zh: string, en_: string) => (en ? en_ : zh)

/** Remount helper: bumping the key restarts every CSS animation inside. */
function Fragmentish({ runId, children }: { runId: number; children: ReactNode }) {
	return <g key={runId} className="sm-scene-run">{children}</g>
}

/* ---------------------------------------------------------------- */
/* Confinement: the one scene you can grab. Pull hard enough and     */
/* the string snaps, its energy turning into a new quark pair.       */
/* ---------------------------------------------------------------- */

interface QuarkBody { x: number; y: number; vx: number; vy: number; home: [number, number] }

function ConfinementScene({ labels, reduced, en, onInteract }: { labels: string[]; reduced: boolean; en: boolean; onInteract: () => void }) {
	const root = useRef<SVGGElement>(null)
	const active = useRef<number | null>(null)
	const target = useRef<{ x: number; y: number } | null>(null)
	const [touched, setTouched] = useState(false)
	const [pulling, setPulling] = useState(false)
	const homes: [number, number][] = labels.length === 3 ? [[154, 110], [272, 125], [206, 211]] : [[143, 150], [277, 150]]
	const bodies = useRef<QuarkBody[]>(homes.map(home => ({ x: home[0], y: home[1], vx: 0, vy: 0, home })))
	const paint = () => {
		const node = root.current
		if (!node) return
		const list = bodies.current
		node.querySelectorAll<SVGGElement>('.sm-conf-quark').forEach((orb, i) => orb.setAttribute('transform', `translate(${list[i].x},${list[i].y})`))
		const paths = node.querySelectorAll<SVGPathElement>('.sm-conf-string')
		let index = 0
		for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
			const a = list[i], b = list[j], path = paths[index++]
			const distance = Math.hypot(a.x-b.x,a.y-b.y)
			path.setAttribute('d', `M ${a.x} ${a.y} Q ${(a.x+b.x)/2-(b.y-a.y)*.12} ${(a.y+b.y)/2+(b.x-a.x)*.12} ${b.x} ${b.y}`)
			path.style.strokeWidth = `${2 + Math.max(0,distance-120)*.035}`
			path.style.strokeOpacity = `${Math.min(.95,.4+Math.max(0,distance-120)*.005)}`
		}
	}
	useLayoutEffect(() => { paint() }, [])
	useEffect(() => {
		if (reduced) return
		let frame = 0, last = 0, time = 0
		const tick = (now: number) => {
			const dt = Math.min(2, (now-(last || now))/16.667); last = now
			if (!document.hidden) {
				time += dt/60
				bodies.current.forEach((q,i) => {
					const dragging = active.current === i && target.current
					const x = dragging ? target.current!.x : q.home[0]+Math.sin(time*1.3+i*2)*3
					const y = dragging ? target.current!.y : q.home[1]+Math.cos(time*1.1+i*2)*3
					q.vx = (q.vx+(x-q.x)*.065*dt)*Math.pow(.83,dt)
					q.vy = (q.vy+(y-q.y)*.065*dt)*Math.pow(.83,dt)
					q.x += q.vx*dt; q.y += q.vy*dt
				})
				paint()
			}
			frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frame)
	}, [reduced])
	const move = (event: ReactPointerEvent<SVGElement>) => {
		const svg = event.currentTarget.ownerSVGElement, matrix = svg?.getScreenCTM()
		if (!svg || !matrix) return
		const pt = svg.createSVGPoint(); pt.x=event.clientX; pt.y=event.clientY
		const local = pt.matrixTransform(matrix.inverse())
		target.current = { x:Math.max(35,Math.min(385,local.x)), y:Math.max(40,Math.min(250,local.y)) }
		if (reduced && active.current !== null) { Object.assign(bodies.current[active.current],target.current); paint() }
	}
	const release = () => {
		active.current=null; target.current=null; setPulling(false)
		if (reduced) { bodies.current.forEach(q => { q.x=q.home[0]; q.y=q.home[1] }); paint() }
	}
	return <g ref={root} className="sm-conf">
		<defs>
			<radialGradient id="sm-quark-copper" cx="30%" cy="25%" r="80%"><stop stopColor="#f4d6a8"/><stop offset=".35" stopColor="#ce9660"/><stop offset=".72" stopColor="#a86434"/><stop offset="1" stopColor="#714323"/></radialGradient>
			<radialGradient id="sm-confinement-cloud"><stop stopColor="#d8a969" stopOpacity=".22"/><stop offset=".7" stopColor="#d8a969" stopOpacity=".08"/><stop offset="1" stopColor="#d8a969" stopOpacity="0"/></radialGradient>
		</defs>
		<ellipse cx="210" cy="150" rx="172" ry="125" fill="url(#sm-confinement-cloud)" />
		{Array.from({length:labels.length === 3 ? 3 : 1},(_,i)=><path key={i} className="sm-conf-string" fill="none" stroke="#af713c"/>)}
		{labels.map((label,i)=><g key={i} className="sm-conf-quark" role="button" tabIndex={0}
			aria-label={`${label} · ${L(en, '按回车拉开或松手', 'Enter to stretch or release')}`}
			style={{cursor:pulling?'grabbing':'grab'}}
			onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onInteract();setTouched(true);if(active.current===i){release()}else{active.current=i;target.current={x:i===0?55:365,y:80};setPulling(true);if(reduced){Object.assign(bodies.current[i],target.current);paint()}}}}}
			onBlur={release}
			onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);active.current=i;setPulling(true);setTouched(true);onInteract();move(event)}}
			onPointerMove={event=>{if(active.current===i)move(event)}}
			onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
			<circle r="32" fill="transparent"/>
			<circle r="25" fill="#b0703c" fillOpacity=".07"/>
			<circle className="sm-conf-orb" r="19" fill="url(#sm-quark-copper)" fillOpacity={isAnti(label)?.65:1}/>
			<text y="5" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">{label}</text>
		</g>)}
		{!touched && !reduced && <g className="sm-pull-hint" data-experience-overlay="true" aria-hidden="true"><path d="M132 88 Q105 67 80 75 M80 75 l12 -12 M80 75 l17 4" fill="none" stroke="#a36d3d" strokeWidth="1.2"/><circle cx="136" cy="93" r="8" fill="none" stroke="#a36d3d" strokeWidth="1"/></g>}
		<text data-experience-overlay="true" x="210" y="286" textAnchor="middle" className="sm-conf-label">{pulling ? L(en,'距离增大，储存的能量增加','Greater separation stores more energy') : L(en,'拉开一颗夸克，再松手','Pull a quark away, then release')}</text>
	</g>
}

function isAnti(label: string) { return label.includes('̄') || label.includes('\u0304') }

/* ---------------------------------------------------------------- */
/* Ambient loops: staged replays of real processes, always labelled. */
/* ---------------------------------------------------------------- */

function TopDecayScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-top">
		{!reduced
			? <g className="sm-top-live">
				<g className="sm-top-born">
					<circle cx="130" cy="150" r="17" fill="#b0703c" />
					<text x="130" y="156" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">t</text>
				</g>
				<g className="sm-top-split">
					<g className="sm-top-w">
						<circle cx="262" cy="112" r="13" fill="#4a81b0" />
						<text x="262" y="117" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">W⁺</text>
					</g>
					<g className="sm-top-b">
						<circle cx="262" cy="192" r="13" fill="#b0703c" fillOpacity=".7" />
						<text x="262" y="197" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">b</text>
					</g>
					<g className="sm-top-decay2">
						<circle cx="356" cy="92" r="10" fill="#4e8970" fillOpacity=".85" />
						<text x="356" y="96" className="sm-scene-tag" textAnchor="middle">μ⁺</text>
						<circle cx="372" cy="136" r="7" fill="#4e8970" fillOpacity=".5" />
						<text x="372" y="139" className="sm-scene-tag" textAnchor="middle">ν</text>
					</g>
				</g>
				<path className="sm-top-track" d="M148 150 C 190 142 216 128 250 118" fill="none" />
				<path className="sm-top-track" d="M148 150 C 190 158 216 172 250 186" fill="none" />
				<path className="sm-top-track sm-top-track-2" d="M276 106 C 310 98 330 96 346 94" fill="none" />
				<path className="sm-top-track sm-top-track-2" d="M270 122 C 310 128 340 132 364 135" fill="none" />
			</g>
			: <g>
				<circle cx="130" cy="150" r="17" fill="#b0703c" fillOpacity=".6" />
				<text x="130" y="156" className="sm-scene-tag" textAnchor="middle">t</text>
				<circle cx="262" cy="112" r="13" fill="#4a81b0" fillOpacity=".8" />
				<text x="262" y="117" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">W⁺</text>
				<circle cx="262" cy="192" r="13" fill="#b0703c" fillOpacity=".5" />
				<text x="262" y="197" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">b</text>
				<path d="M148 150 C 190 142 216 128 250 118" fill="none" stroke="#b0703c" strokeOpacity=".35" strokeDasharray="3 5" />
				<path d="M148 150 C 190 158 216 172 250 186" fill="none" stroke="#b0703c" strokeOpacity=".35" strokeDasharray="3 5" />
			</g>}
		<text x="130" y="112" className="sm-scene-note" textAnchor="middle">{L(en, '诞生 → 5×10⁻²⁵ s 后衰变', 'Born → decays within 5×10⁻²⁵ s')}</text>
	</g>
}

function AtomScene({ en, measured }: { en: boolean; measured: boolean }) {
	const [position] = useState(() => sampleHydrogenPosition())
	return <g className="sm-atom">
		<defs><radialGradient id="sm-electron-density"><stop stopColor="#4e8970" stopOpacity=".5"/><stop offset=".35" stopColor="#4e8970" stopOpacity=".22"/><stop offset=".7" stopColor="#4e8970" stopOpacity=".04"/><stop offset="1" stopColor="#4e8970" stopOpacity="0"/></radialGradient></defs>
		<circle cx="210" cy="145" r="120" fill="url(#sm-electron-density)"/>
		<circle cx="210" cy="145" r="5" fill="#b0703c"/>
		<text x="210" y="168" className="sm-scene-tag" textAnchor="middle">p⁺</text>
		{measured && <g transform={`translate(${210+position.x*32},${145+position.y*32})`}><circle r="12" fill="none" stroke="#4e8970" strokeOpacity=".5"/><circle r="4" fill="#4e8970"/></g>}
		<text x="210" y="268" className="sm-scene-note" textAnchor="middle">{L(en, measured ? '一个落点；再次测量使用重新制备的氢原子' : '概率云不是轨道；一次测量得到一个位置', measured ? 'One outcome; next trial uses a freshly prepared atom' : 'A probability cloud, not an orbit')}</text>
	</g>
}

function CosmicScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-cosmic">
		<rect x="60" y="24" width="300" height="252" rx="10" fill="url(#sm-scene-sky)" />
		<line x1="60" y1="120" x2="360" y2="120" stroke="#5b6f6d" strokeOpacity=".25" strokeDasharray="4 7" />
		<line x1="60" y1="206" x2="360" y2="206" stroke="#8a7f5f" strokeOpacity=".3" strokeDasharray="4 7" />
		<text x="72" y="44" className="sm-scene-note">{L(en, '15 km 高空，宇宙线撞出 μ 子', 'A cosmic ray makes a μ 15 km up')}</text>
		<text x="72" y="136" className="sm-scene-note">{L(en, '大气层', 'Atmosphere')}</text>
		<text x="72" y="222" className="sm-scene-note">{L(en, '地面', 'Ground')}</text>
		{!reduced
			? <g className="sm-cosmic-mu">
				<circle r="8" cx="210" cy="60" fill="#4e8970" />
				<circle className="sm-cosmic-clock" cx="210" cy="60" r="11" fill="none" stroke="#4e8970" strokeWidth="1.6" strokeDasharray="42 27" />
			</g>
			: <g>
				<circle cx="210" cy="60" r="8" fill="#4e8970" />
				<circle cx="210" cy="228" r="8" fill="#4e8970" fillOpacity=".45" />
				<line x1="210" y1="60" x2="210" y2="228" stroke="#4e8970" strokeOpacity=".3" strokeDasharray="3 6" />
			</g>}
		<text x="344" y="270" className="sm-scene-note" textAnchor="end">{L(en, '它的钟走得慢，所以能落到地面', 'Its clock runs slow — that is why it lands')}</text>
	</g>
}

function TauShowerScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-tau">
		{!reduced
			? <g className="sm-tau-live">
				<g className="sm-tau-appear">
					<circle cx="120" cy="150" r="15" fill="#4e8970" />
					<text x="120" y="155" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">τ</text>
				</g>
				<g className="sm-tau-spray">
					<path className="sm-tau-track" d="M150 150 C 220 150 260 128 340 112" fill="none" />
					<path className="sm-tau-track" d="M150 150 C 225 155 265 152 345 152" fill="none" />
					<path className="sm-tau-track" d="M150 150 C 220 158 255 175 330 196" fill="none" />
					<circle className="sm-tau-flash" cx="150" cy="150" r="40" fill="url(#sm-scene-flash)" />
				</g>
			</g>
			: <g>
				<circle cx="120" cy="150" r="15" fill="#4e8970" />
				<text x="120" y="155" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">τ</text>
				<path d="M150 150 C 220 150 260 128 340 112" fill="none" stroke="#4e8970" strokeOpacity=".45" strokeWidth="2" strokeDasharray="3 5" />
				<path d="M150 150 C 225 155 265 152 345 152" fill="none" stroke="#4e8970" strokeOpacity=".45" strokeWidth="2" strokeDasharray="3 5" />
				<path d="M150 150 C 220 158 255 175 330 196" fill="none" stroke="#4e8970" strokeOpacity=".45" strokeWidth="2" strokeDasharray="3 5" />
			</g>}
		<text x="120" y="110" className="sm-scene-note" textAnchor="middle">{L(en, '平均寿命 2.9×10⁻¹³ s', 'Average lifetime 2.9×10⁻¹³ s')}</text>
	</g>
}

function OscillationScene({ reduced, en, flavor }: { reduced: boolean; en: boolean; flavor: 0 | 1 | 2 }) {
	const flavors = ['νe', 'νμ', 'ντ']
	return <g className="sm-osc">
		<circle cx="66" cy="150" r="24" fill="#e8b64c" fillOpacity=".8" />
		<text x="66" y="198" className="sm-scene-tag" textAnchor="middle">{L(en, '中微子源', 'Neutrino source')}</text>
		<rect x="318" y="114" width="70" height="72" rx="8" fill="#5b6052" fillOpacity=".14" stroke="#5b6052" strokeOpacity=".4" />
		<text x="353" y="212" className="sm-scene-tag" textAnchor="middle">{L(en, '探测器', 'Detector')}</text>
		{!reduced
			? <g className="sm-osc-beam">
				<circle className="sm-osc-pulse" r="7" cx="94" cy="150" />
				<path className="sm-osc-trail" d="M100 150 L 314 150" fill="none" strokeWidth="4" strokeLinecap="round" />
			</g>
			: <line x1="94" y1="150" x2="314" y2="150" stroke="#4e8970" strokeWidth="3" strokeDasharray="4 6" />}
		<g>
			{flavors.map((f, i) => <g key={f} transform={`translate(${168 + i * 40},58)`} className={`sm-osc-bar${i === flavor ? ' is-focus' : ''}`}>
				<rect className="sm-osc-height" x="0" y="0" width="16" rx="3" fill="#4e8970" fillOpacity={.25 + i * .16} />
				<text x="8" y="50" className="sm-scene-tag" textAnchor="middle">{f}</text>
			</g>)}
		</g>
		<text x="210" y="258" className="sm-scene-note" textAnchor="middle">{L(en, '探测器截到的口味比例随距离变化——它有质量', 'The flavour mix shifts with distance — it has mass')}</text>
	</g>
}

function PhotonScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	const wave = 'M20 150 C 40 96, 60 96, 80 150 S 120 204, 140 150 S 180 96, 200 150 S 240 204, 260 150 S 300 96, 320 150 S 360 204, 400 150'
	return <g className="sm-photon">
		<line x1="16" y1="150" x2="404" y2="150" stroke="#5b6f6d" strokeOpacity=".3" strokeDasharray="2 6" />
		{!reduced
			? <g className="sm-photon-live">
				<path className="sm-photon-wave" d={wave} fill="none" />

			</g>
			: <path d={wave} fill="none" stroke="#4a81b0" strokeWidth="3" strokeLinecap="round" />}
		<text x="34" y="82" className="sm-scene-tag">{L(en, '电磁波的电场分量示意', 'Electric component of an EM wave')}</text>
		<text x="330" y="52" className="sm-scene-note">{L(en, '以光速 c 传播', 'Light speed c')}</text>
		{!reduced && <circle className="sm-photon-packet" r="6" cx="20" cy="150" fill="#4a81b0" />}
	</g>
}

function FluxTubeScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-flux">
		<circle className="sm-flux-q1" cx="120" cy="150" r="15" fill="#c25b4e" />
		<text x="120" y="188" className="sm-scene-tag" textAnchor="middle">{L(en, '夸克', 'Quark')}</text>
		<circle className="sm-flux-q2" cx="300" cy="150" r="15" fill="#3f6fb5" />
		<text x="300" y="188" className="sm-scene-tag" textAnchor="middle">{L(en, '夸克', 'Quark')}</text>
		{!reduced
			? <g className="sm-flux-live">
				<path className="sm-flux-tube" d="M138 146 C 180 134 240 134 282 146" fill="none" />
				<g className="sm-flux-pulse"><circle r="8" cx="138" cy="144" fill="#5b8770" /><text x="138" y="148" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">g</text></g>
			</g>
			: <path d="M138 146 C 180 134 240 134 282 146" fill="none" stroke="#5b8770" strokeWidth="2.4" strokeDasharray="4 4" />}
		<text x="210" y="70" className="sm-scene-note" textAnchor="middle">{L(en, '胶子交换改变夸克的色荷', 'Gluon exchange changes quark colour charge')}</text>
		<text x="210" y="248" className="sm-scene-note" textAnchor="middle">{L(en, '「颜色」是荷的名字，不是可见光', '"Colour" names a charge, not visible light')}</text>
	</g>
}

function BetaDecayScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-beta">
		{!reduced
			? <g className="sm-beta-live">
				<g className="sm-beta-nucleus">
					<circle cx="140" cy="150" r="32" fill="#e7e2cd" stroke="#8a7f5f" strokeOpacity=".4" />
					<circle cx="128" cy="140" r="8" fill="#b0703c" fillOpacity=".85" />
					<circle cx="152" cy="144" r="8" fill="#b0703c" fillOpacity=".6" />
					<circle className="sm-beta-quark" cx="140" cy="164" r="8" fill="#b0703c" fillOpacity=".7" />
					<text x="140" y="104" className="sm-scene-tag" textAnchor="middle">{L(en, '中子 (u d d)', 'Neutron (u d d)')}</text>
				</g>
				<g className="sm-beta-w">
					<circle cx="236" cy="196" r="10" fill="#4a81b0" />
					<text x="236" y="200" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">W⁻</text>
				</g>
				<g className="sm-beta-products">
					<circle className="sm-beta-e" cx="328" cy="236" r="7" fill="#4e8970" />
					<text x="340" y="260" className="sm-scene-tag" textAnchor="middle">e⁻</text>
					<circle className="sm-beta-nu" cx="354" cy="186" r="5.5" fill="#4e8970" fillOpacity=".5" />
					<text x="366" y="174" className="sm-scene-tag" textAnchor="middle">ν̄e</text>
				</g>
				<path className="sm-beta-wtrack" d="M172 162 C 196 176 214 184 226 192" fill="none" />
				<g className="sm-beta-result">
					<text x="140" y="204" className="sm-scene-tag" textAnchor="middle">{L(en, '→ 质子 (u u d)', '→ Proton (u u d)')}</text>
				</g>
			</g>
			: <g>
				<circle cx="140" cy="150" r="32" fill="#e7e2cd" stroke="#8a7f5f" strokeOpacity=".4" />
				<text x="140" y="104" className="sm-scene-tag" textAnchor="middle">{L(en, '中子 (u d d)', 'Neutron (u d d)')}</text>
				<text x="140" y="204" className="sm-scene-tag" textAnchor="middle">{L(en, '→ 质子 (u u d)', '→ Proton (u u d)')}</text>
				<circle cx="236" cy="196" r="10" fill="#4a81b0" />
				<text x="236" y="200" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">W⁻</text>
				<circle cx="328" cy="236" r="7" fill="#4e8970" />
				<text x="340" y="260" className="sm-scene-tag" textAnchor="middle">e⁻</text>
				<circle cx="354" cy="186" r="5.5" fill="#4e8970" fillOpacity=".5" />
				<text x="366" y="174" className="sm-scene-tag" textAnchor="middle">ν̄e</text>
			</g>}
	</g>
}

function ZExchangeScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-z">
		{!reduced
			? <g className="sm-z-live">
				<g className="sm-z-in1"><circle cx="30" cy="200" r="9" fill="#4e8970" /><text x="30" y="228" className="sm-scene-tag" textAnchor="middle">e⁻</text></g>
				<g className="sm-z-in2"><circle cx="390" cy="96" r="8" fill="#4e8970" fillOpacity=".55" /><text x="390" y="80" className="sm-scene-tag" textAnchor="middle">ν</text></g>
				<g className="sm-z-boson"><circle cx="210" cy="151" r="15" fill="#4a81b0" /><text x="210" y="156" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">Z</text></g>
				<g className="sm-z-out1"><path className="sm-z-track" d="M226 146 C 262 138 306 142 372 168" fill="none" /><circle cx="372" cy="168" r="9" fill="#4e8970" fillOpacity=".8" /></g>
				<g className="sm-z-out2"><path className="sm-z-track" d="M194 146 C 160 128 116 116 60 112" fill="none" /><circle cx="60" cy="112" r="8" fill="#4e8970" fillOpacity=".4" /></g>
			</g>
			: <g>
				<circle cx="30" cy="200" r="9" fill="#4e8970" />
				<circle cx="390" cy="96" r="8" fill="#4e8970" fillOpacity=".55" />
				<circle cx="210" cy="151" r="15" fill="#4a81b0" />
				<text x="210" y="156" className="sm-scene-tag sm-scene-tag-light" textAnchor="middle">Z</text>
				<path d="M30 200 C 100 190 150 172 196 154" fill="none" stroke="#4e8970" strokeOpacity=".4" strokeDasharray="3 5" />
				<path d="M390 96 C 320 106 268 128 224 148" fill="none" stroke="#4e8970" strokeOpacity=".4" strokeDasharray="3 5" />
			</g>}
		<text x="210" y="270" className="sm-scene-note" textAnchor="middle">{L(en, '只交换推力，不改变任何一方身份', 'A push is exchanged; no one changes identity')}</text>
	</g>
}

function HiggsFieldScene({ reduced, en }: { reduced: boolean; en: boolean }) {
	return <g className="sm-higgs">
		{Array.from({length:13},(_,i)=><path key={i} d={`M45 ${65+i*13} Q210 ${40+i*13} 375 ${65+i*13}`} stroke="#ad8439" strokeOpacity=".13" fill="none"/>)}
		<g transform="translate(122 146)"><circle r="46" fill="#4a81b0" fillOpacity=".06"/><circle r="10" fill="#4a81b0"/><text y="5" textAnchor="middle" className="sm-scene-tag sm-scene-tag-light">γ</text></g>
		<g transform="translate(294 146)"><circle className={reduced?'':'sm-higgs-drag'} r="38" fill="#ad8439" fillOpacity=".12"/><circle r="23" fill="none" stroke="#ad8439" strokeOpacity=".45"/><circle r="10" fill="#4e8970"/><text y="5" textAnchor="middle" className="sm-scene-tag sm-scene-tag-light">e</text></g>
		<text x="122" y="224" textAnchor="middle" className="sm-scene-tag">{L(en,'光子 · 无静止质量','Photon · zero rest mass')}</text>
		<text x="294" y="224" textAnchor="middle" className="sm-scene-tag">{L(en,'电子 · 有静止质量','Electron · nonzero mass')}</text>
		<text x="210" y="270" textAnchor="middle" className="sm-scene-note">{L(en,'场的耦合，不是摩擦阻力','Field coupling, not friction')}</text>
	</g>
}
