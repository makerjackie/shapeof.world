import { useRef, useState } from 'react'
import type { ParticleId } from '../particle-data'
import { cmsZmumuEvent, eventRay, type EvidenceProjection } from './event-data'
import './EvidenceEvent.css'

export interface EvidenceEventProps {
	particleId: ParticleId
	en: boolean
}

/** A compact, source-backed event card for the Z and muon entries only. */
export function EvidenceEvent({ particleId, en }: EvidenceEventProps) {
	const [projection, setProjection] = useState<EvidenceProjection>('transverse')
	const [turn, setTurn] = useState(0)
	const drag = useRef<{ x: number; turn: number } | null>(null)
	if (particleId !== 'z' && particleId !== 'mu') return null
	const title = en ? 'One real CMS event' : '一件真实的 CMS 事件'
	const subtitle = en ? 'Z → μ⁺μ⁻ candidate · reconstructed data' : 'Z → μ⁺μ⁻ 候选事件 · 重建数据'
	const projectionLabel = projection === 'transverse'
		? (en ? 'Transverse projection (x–y)' : '横向投影（x–y）')
		: (en ? 'Longitudinal projection (x–z)' : '纵向投影（x–z）')

	return <article className="sm-evidence-event" aria-label={title}>
		<div className="sm-evidence-event__heading">
			<div>
				<p className="sm-evidence-event__eyebrow">{en ? 'EVIDENCE CARD' : '真实数据证据'}</p>
				<h3>{title}</h3>
				<p>{subtitle}</p>
			</div>
			<div className="sm-evidence-event__mass"><strong>{cmsZmumuEvent.invariantMassGeV.toFixed(2)}</strong><span>GeV/c²</span></div>
		</div>
		<div className="sm-evidence-event__stage">
			<svg viewBox="-170 -170 340 340" role="img" aria-label={projectionLabel}
				onPointerDown={event => { drag.current = { x: event.clientX, turn }; event.currentTarget.setPointerCapture(event.pointerId) }}
				onPointerMove={event => { if (drag.current) setTurn(drag.current.turn + (event.clientX - drag.current.x) / 140) }}
				onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
				<circle r="142" className="sm-evidence-event__guide" />
				<circle r="5" className="sm-evidence-event__vertex" />
				<line x1="-150" y1="0" x2="150" y2="0" className="sm-evidence-event__axis" />
				<line x1="0" y1="-150" x2="0" y2="150" className="sm-evidence-event__axis" />
				<text x="145" y="-5" className="sm-evidence-event__axis-label">x</text>
				<text x="5" y="-145" className="sm-evidence-event__axis-label">{projection === 'transverse' ? 'y' : 'z'}</text>
				{cmsZmumuEvent.muons.map((muon, index) => {
					const ray = eventRay(muon, projection, turn)
					return <g key={muon.label} className={index === 0 ? 'is-minus' : 'is-plus'}>
						<line x1="0" y1="0" x2={ray.x} y2={ray.y} className="sm-evidence-event__track" />
						<circle cx={ray.x} cy={ray.y} r="3.5" className="sm-evidence-event__track-end" />
						<text x={ray.x * .76} y={ray.y * .76} className="sm-evidence-event__label">{muon.label}</text>
					</g>
				})}
			</svg>
			<p className="sm-evidence-event__caption">{en ? 'Two-dimensional projection of reconstructed momentum vectors (GeV/c). Drag to rotate around z; the guide ring is not detector geometry.' : '重建动量向量（GeV/c）的二维投影。拖动可绕 z 轴旋转；圆环只是阅读辅助，不代表探测器几何。'}</p>
		</div>
		<div className="sm-evidence-event__controls">
			<button type="button" onClick={() => setProjection(value => value === 'transverse' ? 'longitudinal' : 'transverse')}>{projectionLabel}</button>
			<button type="button" onClick={() => setTurn(0)}>{en ? 'Reset rotation' : '重置旋转'}</button>
			<span>{en ? `Run ${cmsZmumuEvent.run} · Event ${cmsZmumuEvent.event}` : `运行 ${cmsZmumuEvent.run} · 事件 ${cmsZmumuEvent.event}`}</span>
		</div>
		<p className="sm-evidence-event__note">{en ? 'This is a two-dimensional projection of reconstructed momentum vectors from a real event. They are not measured hit points and not the shape of the parent Z boson. A candidate is evidence for an event selection, not proof from one event.' : '这是一个真实事件中重建动量向量的二维投影，不是实测轨迹点，也不是 Z 玻色子的外形。候选事件能说明筛选结果，单个事件不能证明发现。'}</p>
		<a className="sm-evidence-event__source" href="https://opendata.cern.ch/record/307" target="_blank" rel="noreferrer">{en ? 'CERN Open Data record 307 · DOI 10.7483/OPENDATA.CMS.XBN9.HFGT' : 'CERN Open Data 记录 307 · DOI 10.7483/OPENDATA.CMS.XBN9.HFGT'}</a>
	</article>
}

export default EvidenceEvent
