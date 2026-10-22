import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowCounterClockwise } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { BeatResult, BeatSteps, Conclusion, DoHint, GuessCard, SkipButton, beatIndex, useFiveBeats } from '~/components/experiences/five-beat'
import { worldPath } from '~/lib/world-urls'
import { sampleHydrogenPosition } from '../particle-model'
import { bodyQuarkKg, protonMassMeV, protonQuarks, quarkMassMeV, quarkSum, weightSources, type QuarkFlavour } from './weight-model'
import './FrontDoor.css'

/*
 * The front door of the particle museum: one everyday question walked through
 * five beats (ask, guess, do, see, get it), then the museum opens behind it.
 * One canvas draws a powers-of-ten dive from you on a scale into a proton,
 * then the three quarks become the only thing you can move.
 */

type Guess = 'all' | 'half' | 'tiny'
type L = [string, string]

const BODY_KG = 60
const LAYER_ZOOM = 28
const DIVE_SECONDS = 5.2
const quarkSumMeV = quarkSum(protonQuarks)
const bodyQuarks = bodyQuarkKg(BODY_KG)
const percent = (quarkSumMeV / protonMassMeV * 100).toFixed(1)
const percentOfProton = (mev: number, digits: number) => (mev / protonMassMeV * 100).toFixed(digits) + '%'

// The journey through scales runs quarks → atoms → cells → life → Earth → solar system → galaxies;
// during the five beats only the current stop is shown.
const journeyHere: L = ['夸克', 'Quarks']
const guesses: Array<{ id: Guess; text: L }> = [
	{ id: 'all', text: ['差不多全部', 'Nearly all of it'] },
	{ id: 'half', text: ['大约一半', 'About half'] },
	{ id: 'tiny', text: ['只有 1% 左右', 'Only about 1%'] },
]
const diveCaptions: L[] = [
	['你站在秤上：' + BODY_KG + ' 公斤。镜头钻进你的手指。', 'You on a scale: ' + BODY_KG + ' kg. The camera dives into your finger.'],
	['一个原子，约 0.3 纳米宽。几乎全是空的。', 'One atom, about 0.3 nanometres across. Almost all empty.'],
	['正中间的原子核，比原子小几万倍。', 'The nucleus at its centre, tens of thousands of times smaller.'],
	['核里的一个质子。里面是三颗夸克。', 'One proton from the nucleus. Inside: three quarks.'],
]
// `?poster` keeps the numbers and drops word labels, so one captured frame serves both languages.
const posterFrame = typeof location !== 'undefined' && new URLSearchParams(location.search).has('poster')
const colors = { u: '#ff9d5c', d: '#5fc8cc', proton: '#ff8f6b', neutron: '#c9c1b3', cloud: '111,183,255' }

type QuarkState = { flavour: QuarkFlavour; onPan: boolean; x: number; y: number }
type Layout = { cx: number; cy: number; u: number; px: number; py: number; pr: number; sceneTop: number; sceneBottom: number }

const cloud = Array.from({ length: 520 }, () => sampleHydrogenPosition())
const nucleus: Array<[number, number, boolean]> = [[0, 0, true], [1.55, 0.35, false], [-1.5, 0.45, true], [0.5, -1.5, false], [-0.75, -1.35, true], [0.85, 1.45, true], [-0.75, 1.55, false], [1.95, -1.05, true], [-2.05, -0.65, false], [0.05, 2.75, true], [0.25, -2.85, false], [2.25, 1.6, false]]

export function FrontDoor({ controls, en, onEnterMuseum }: { controls: ExperienceControls; en: boolean; onEnterMuseum: () => void }) {
	const t = (value: L) => value[en ? 1 : 0]
	const { beat, beatRef, guess, goto, choose, restart: restartBeats } = useFiveBeats<Guess>(controls, { start: 'ask' })
	const [onPan, setOnPan] = useState(0)
	const [caption, setCaption] = useState(0)
	const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null)
	const top = useRef<HTMLDivElement>(null), card = useRef<HTMLDivElement>(null)
	const quarks = useRef<QuarkState[]>(protonQuarks.map(flavour => ({ flavour, onPan: false, x: 0, y: 0 })))
	const drag = useRef<{ index: number; startX: number; startY: number; moved: boolean } | null>(null)
	const layout = useRef<Layout | null>(null)
	const diveStart = useRef<number | null>(null)
	const reduced = useRef(false)

	const placeOnPan = (index: number) => {
		const quark = quarks.current[index]
		if (!quark || quark.onPan) return
		quark.onPan = true
		const count = quarks.current.filter(q => q.onPan).length
		setOnPan(count)
		controls.registerInteraction()
		if (count === 3) window.setTimeout(() => { if (beatRef.current === 'do') goto('see') }, 700)
	}
	const placeNext = () => placeOnPan(quarks.current.findIndex(q => !q.onPan))
	const restart = () => {
		quarks.current.forEach(q => { q.onPan = false })
		setOnPan(0); setCaption(0); diveStart.current = null; restartBeats()
	}

	useEffect(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)')
		reduced.current = media.matches
		const element = canvas.current, container = root.current
		if (!element || !container) return
		const ctx = element.getContext('2d')
		if (!ctx) return
		let frame = 0, width = 0, height = 0, layoutBlend = 0, lastCaption = -1
		const resize = () => {
			const dpr = Math.min(devicePixelRatio || 1, 2)
			width = container.clientWidth; height = container.clientHeight
			element.width = Math.round(width * dpr); element.height = Math.round(height * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}
		const observer = new ResizeObserver(resize)
		observer.observe(container)
		resize()

		const draw = (now: number) => {
			frame = requestAnimationFrame(draw)
			const time = now / 1000
			const b = beatIndex(beatRef.current)
			if (diveStart.current === null) diveStart.current = time
			const diveT = reduced.current ? 1 : Math.min(1, (time - diveStart.current) / DIVE_SECONDS)
			const z = 3 * easeInOut(diveT)
			if (b === 0 && diveT >= 1) goto('guess')
			const captionIndex = Math.min(3, Math.floor(z + 0.35))
			if (captionIndex !== lastCaption) { lastCaption = captionIndex; setCaption(captionIndex) }

			const box = container.getBoundingClientRect()
			const sceneTop = posterFrame ? height * 0.1 : (top.current?.getBoundingClientRect().bottom ?? box.top + 140) - box.top + 6
			const sceneBottom = posterFrame ? height * 0.9 : (card.current?.getBoundingClientRect().top ?? box.bottom - 220) - box.top - 10
			const sceneH = Math.max(160, sceneBottom - sceneTop)
			const wide = width >= 760 && width > sceneH * 1.25
			layoutBlend += ((b >= 2 ? 1 : 0) - layoutBlend) * (reduced.current ? 1 : 0.08)
			const solo = { cx: width / 2, cy: sceneTop + sceneH / 2, u: Math.min(width * 0.4, sceneH * 0.44) }
			const paired = wide
				? { cx: width * 0.4, cy: sceneTop + sceneH * 0.5, u: Math.min(width * 0.2, sceneH * 0.4), px: width * 0.72, py: sceneTop + sceneH * 0.62 }
				: { cx: width / 2, cy: sceneTop + sceneH * 0.36, u: Math.min(width * 0.34, sceneH * 0.27), px: width / 2, py: sceneTop + sceneH * 0.86 }
			const L: Layout = {
				cx: mix(solo.cx, paired.cx, layoutBlend), cy: mix(solo.cy, paired.cy, layoutBlend), u: mix(solo.u, paired.u, layoutBlend),
				px: paired.px, py: paired.py, pr: Math.min(wide ? width * 0.11 : width * 0.24, sceneH * 0.17), sceneTop, sceneBottom,
			}
			layout.current = L

			ctx.clearRect(0, 0, width, height)
			const backdrop = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, Math.max(width, height) * 0.7)
			backdrop.addColorStop(0, '#141a24'); backdrop.addColorStop(1, '#05070a')
			ctx.fillStyle = backdrop; ctx.fillRect(0, 0, width, height)

			for (let layer = 0; layer < 4; layer++) {
				const d = z - layer
				const alpha = smoothstep(-0.6, -0.12, d) * (layer === 3 ? 1 : 1 - smoothstep(0.32, 0.78, d))
				if (alpha <= 0.002) continue
				const unit = L.u * LAYER_ZOOM ** Math.min(d, 1.2)
				ctx.save(); ctx.globalAlpha = alpha
				if (layer === 0) drawPerson(ctx, L.cx, L.cy, unit * 0.46, time, t(['你', 'You']))
				if (layer === 1) drawAtom(ctx, L.cx, L.cy, unit, time, reduced.current)
				if (layer === 2) drawNucleus(ctx, L.cx, L.cy, unit)
				if (layer === 3) drawProton(ctx, L, unit, time, reduced.current, quarks.current, b, drag.current, en)
				ctx.restore()
			}
			if (layoutBlend > 0.02) drawScale(ctx, L, quarks.current, layoutBlend, b, en)
			if (b === 2 && !drag.current) drawHint(ctx, L, quarks.current, time, reduced.current, t(['拖我上秤', 'Drag me onto the scale']))
		}
		frame = requestAnimationFrame(draw)
		return () => { cancelAnimationFrame(frame); observer.disconnect() }
	}, [en, goto])

	const pointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const b = beatIndex(beatRef.current)
		const box = event.currentTarget.getBoundingClientRect()
		const x = event.clientX - box.left, y = event.clientY - box.top
		if (event.type === 'pointerdown') {
			if (b === 0) { diveStart.current = -1e9; return }
			if (b !== 2) return
			const index = quarks.current.findIndex(q => !q.onPan && Math.hypot(q.x - x, q.y - y) < Math.max(34, (layout.current?.u ?? 100) * 0.26))
			if (index < 0) return
			event.currentTarget.setPointerCapture(event.pointerId)
			drag.current = { index, startX: x, startY: y, moved: false }
			quarks.current[index].x = x; quarks.current[index].y = y
		} else if (event.type === 'pointermove' && drag.current) {
			const quark = quarks.current[drag.current.index]
			quark.x = x; quark.y = y
			if (Math.hypot(x - drag.current.startX, y - drag.current.startY) > 6) drag.current.moved = true
		} else if ((event.type === 'pointerup' || event.type === 'pointercancel') && drag.current) {
			const L = layout.current, current = drag.current
			drag.current = null
			const overPan = L && Math.hypot(x - L.px, y - L.py) < L.pr * 1.5
			if (event.type === 'pointerup' && (!current.moved || overPan)) placeOnPan(current.index)
		}
	}

	const mine = guesses.find(g => g.id === guess)
	const right = guess === 'tiny'
	const at = beatIndex(beat)
	const sub = at <= 1 ? t(diveCaptions[caption]) : at === 2 ? t(['现实里夸克拿不出来；这里的读数是间接测出来的。', 'In reality quarks cannot be taken out; these readings are inferred indirectly.'])
		: at === 3 ? t(['质子还是那么重，夸克只占一点点。', 'The proton weighs the same; the quarks are a sliver.'])
			: t(['你摸到的每一样东西，都是这样。', 'The same goes for everything you touch.'])

	return <div className="smf-door" ref={root} data-beat={at}>
		<canvas ref={canvas} className="smf-scene" data-beat={at} onPointerDown={pointer} onPointerMove={pointer} onPointerUp={pointer} onPointerCancel={pointer}
			aria-label={t(['从站在秤上的你一路放大到一个质子；质子里有三颗夸克', 'A dive from you on a scale down into one proton, with three quarks inside'])} />
		<div className="smf-top" ref={top}>
			<div className="smf-journey" aria-label={t(['尺度之旅', 'Journey through scales'])}><span>{t(['尺度之旅', 'Journey through scales'])}</span><span className="is-here">{t(journeyHere)}</span></div>
			<BeatSteps beat={beat} />
			<h1 data-experience-content-start="true">{t(['你的体重是从哪儿来的？', 'Where does your weight come from?'])}</h1>
			<p className="smf-sub" aria-live="polite">{sub}</p>
		</div>
		<div className="smf-card" ref={card} aria-live="polite">
			{beat === 'ask' && <p className="smf-dive">{t(['点一下画面，跳过镜头。', 'Tap the picture to skip the dive.'])}</p>}
			{beat === 'guess' && <GuessCard
				question={t(['先猜一下：把质子里的三颗夸克单独放上秤，它们占质子重量的多少？', 'First, a guess: put the three quarks from a proton on a scale by themselves. How much of the proton’s weight do they make up?'])}
				options={guesses.map(g => ({ id: g.id, label: t(g.text) }))}
				onChoose={choose}
				skip={t(['不猜，直接玩', 'Skip the guess'])}
				toLab={{ label: t(['直接进博物馆', 'Go straight to the museum']), onClick: onEnterMuseum }} />}
			{beat === 'do' && <DoHint
				hint={t(['把三颗夸克拖到秤上', 'Drag the three quarks onto the scale'])}
				tail={t(['，看看它们一共多重。', ' and see what they weigh together.'])}
				meter={<span className="smf-meter">{t(['秤上', 'On the scale'])} <b>{onPan}/3</b></span>}
				fallback={{ label: t(['拖不动？点这里放一颗', 'Can’t drag? Place one']), onClick: placeNext }} />}
			{beat === 'see' && <BeatResult
				verdict={mine && (right ? t(['猜对了', 'You got it']) : t(['比你猜的少得多', 'Far less than you guessed']))}
				right={right}
				mine={mine && t(['你猜：', 'You guessed: ']) + t(mine.text) + t(['。', '.'])}
				next={{ label: t(['那剩下的是什么？', 'So what is the rest?']), onClick: () => goto('know') }}>
				<div className="smf-bars" role="img" aria-label={t(['质子 100%（938.3 MeV），三颗夸克 ' + percent + '%（9.0 MeV）', 'Proton 100% (938.3 MeV), three quarks ' + percent + '% (9.0 MeV)'])}>
					<div><span>{t(['整个质子', 'Whole proton'])}</span><i style={{ width: '100%' }} /><b>100%<small> · {protonMassMeV.toFixed(1)} MeV</small></b></div>
					<div><span>{t(['三颗夸克', 'Three quarks'])}</span><i className="is-quarks" style={{ width: `${quarkSumMeV / protonMassMeV * 100}%` }} /><b>{percent}%<small> · {quarkSumMeV.toFixed(1)} MeV</small></b></div>
				</div>
				<div className="smf-you">
					<PersonIcon /><div><b>{BODY_KG} kg</b><span>{t(['你', 'You'])}</span></div>
					<ArrowRight size={18} aria-hidden="true" />
					<BottleIcon /><div><b>{bodyQuarks.toFixed(2)} kg</b><span>{t(['你身上所有夸克本身', 'All the quarks in you, by themselves'])}</span></div>
				</div>
				<p className="smf-small">{t(['约等于一瓶矿泉水。按质子、中子各一半估算；电子只占约 0.03%。', 'About one bottle of water. Estimated with equal protons and neutrons; electrons add about 0.03%.'])}</p>
			</BeatResult>}
			{beat === 'know' && <Conclusion
				sentence={t(['你的体重，大多是被关住的能量。', 'Most of your weight is trapped energy.'])}
				source={<>{t(['你的体重只有约 1% 来自夸克本身，另外 99% 是把夸克锁在质子和中子里的能量。', 'Only about 1% of your weight is the quarks themselves; the other 99% is the energy that locks them inside protons and neutrons.'])}<br />{t(['出处：', 'Sources: '])}{weightSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}<br />{t(['夸克从不单独出现，质量是间接推得的；能量就是质量，E = mc²。', 'Quarks never appear alone, so their masses are inferred; energy is mass, E = mc².'])}</>}
				cta={<button className="smf-primary smf-wide" onClick={onEnterMuseum}>{t(['走进基本粒子博物馆', 'Enter the particle museum'])}<ArrowRight size={18} /></button>}
				next={{ href: worldPath('periodic-table', en ? 'en' : 'zh'), kicker: t(['下一个问题 · 尺度之旅往外走一层', 'Next question · one step out']), question: t(['元素符号背后，物质是什么模样？', 'What does matter look like behind an element symbol?']) }}>
				<SkipButton onClick={restart}><ArrowCounterClockwise size={14} />{t(['再走一遍', 'Play again'])}</SkipButton>
			</Conclusion>}
		</div>
	</div>
}

function drawPerson(ctx: CanvasRenderingContext2D, hx: number, hy: number, u: number, time: number, you: string) {
	const bx = hx - 0.62 * u, feet = hy + 1.0 * u
	ctx.strokeStyle = '#f4efe2'; ctx.fillStyle = '#e9e1cf'; ctx.lineCap = 'round'
	ctx.beginPath(); ctx.arc(bx, hy - 0.62 * u, 0.13 * u, 0, Math.PI * 2); ctx.fill()
	ctx.beginPath(); ctx.roundRect(bx - 0.17 * u, hy - 0.45 * u, 0.34 * u, 0.62 * u, 0.12 * u); ctx.fill()
	ctx.lineWidth = 0.1 * u
	ctx.beginPath(); ctx.moveTo(bx - 0.08 * u, hy + 0.12 * u); ctx.lineTo(bx - 0.1 * u, feet - 0.06 * u); ctx.moveTo(bx + 0.08 * u, hy + 0.12 * u); ctx.lineTo(bx + 0.1 * u, feet - 0.06 * u); ctx.stroke()
	ctx.lineWidth = 0.08 * u
	ctx.beginPath(); ctx.moveTo(bx - 0.17 * u, hy - 0.36 * u); ctx.lineTo(bx - 0.3 * u, hy + 0.05 * u); ctx.moveTo(bx + 0.15 * u, hy - 0.36 * u); ctx.lineTo(hx, hy); ctx.stroke()
	const pulse = 0.05 * u * (1 + Math.sin(time * 4))
	ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(1.5, 0.012 * u)
	ctx.beginPath(); ctx.arc(hx, hy, 0.07 * u + pulse, 0, Math.PI * 2); ctx.stroke()
	ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(hx, hy, Math.max(2, 0.025 * u), 0, Math.PI * 2); ctx.fill()
	ctx.fillStyle = '#2b3240'; ctx.beginPath(); ctx.roundRect(bx - 0.42 * u, feet, 0.84 * u, 0.1 * u, 0.03 * u); ctx.fill()
	ctx.fillStyle = '#7fd8a4'; ctx.font = `700 ${Math.max(10, 0.07 * u)}px system-ui, sans-serif`; ctx.textAlign = 'center'
	ctx.fillText(BODY_KG + ' kg', bx, feet + 0.075 * u)
	ctx.fillStyle = '#ffd166'; ctx.font = `700 ${Math.max(11, 0.09 * u)}px system-ui, sans-serif`
	ctx.fillText(you, bx, hy - 0.84 * u)
	ctx.textAlign = 'start'
}

function drawAtom(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number, time: number, still: boolean) {
	const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, u)
	glow.addColorStop(0, `rgba(${colors.cloud},0.24)`); glow.addColorStop(0.7, `rgba(${colors.cloud},0.08)`); glow.addColorStop(1, `rgba(${colors.cloud},0)`)
	ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, u, 0, Math.PI * 2); ctx.fill()
	ctx.fillStyle = 'rgba(170,210,255,0.6)'
	const k = u / 3.4
	for (const p of cloud) ctx.fillRect(cx + p.x * k, cy + p.y * k, 1.5, 1.5)
	for (let i = 0; i < 6; i++) {
		const a = i * 1.7 + (still ? 0 : time * (0.5 + i * 0.08)), r = u * (0.3 + i * 0.09)
		const x = cx + Math.cos(a) * r, y = cy + Math.sin(a * 1.3) * r * 0.8
		const g = ctx.createRadialGradient(x, y, 0, x, y, 8)
		g.addColorStop(0, 'rgba(200,230,255,0.95)'); g.addColorStop(1, `rgba(${colors.cloud},0)`)
		ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill()
	}
	ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill()
}

function drawNucleus(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number) {
	const r = u * 0.3
	for (const [x, y, proton] of [...nucleus].reverse()) {
		const bx = cx + x * r * 1.05, by = cy + y * r * 1.05
		const g = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r)
		const base = proton ? colors.proton : colors.neutron
		g.addColorStop(0, '#fff6ec'); g.addColorStop(0.25, base); g.addColorStop(1, shade(base))
		ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill()
	}
}

function quarkHome(L: Layout, unit: number, slot: number, time: number, still: boolean): [number, number] {
	const a = -Math.PI / 2 + slot * Math.PI * 2 / 3
	const jitter = still ? 0 : 0.06
	return [L.cx + Math.cos(a) * unit * 0.42 + Math.sin(time * 3.1 + slot * 2) * unit * jitter, L.cy + Math.sin(a) * unit * 0.42 + Math.cos(time * 2.7 + slot) * unit * jitter]
}

function drawProton(ctx: CanvasRenderingContext2D, L: Layout, unit: number, time: number, still: boolean, quarks: QuarkState[], beat: number, drag: { index: number } | null, en: boolean) {
	const { cx, cy } = L
	const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 1.05)
	const intensity = beat >= 3 ? 0.62 + 0.08 * Math.sin(time * 2) : 0.42
	glow.addColorStop(0, `rgba(255,170,110,${intensity})`); glow.addColorStop(0.6, `rgba(255,120,80,${intensity * 0.45})`); glow.addColorStop(1, 'rgba(255,110,70,0)')
	ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, unit * 1.05, 0, Math.PI * 2); ctx.fill()
	ctx.strokeStyle = 'rgba(255,200,160,0.25)'; ctx.lineWidth = 1
	ctx.beginPath(); ctx.arc(cx, cy, unit, 0, Math.PI * 2); ctx.stroke()
	// Sea sparkles: quark–antiquark pairs and gluons flickering in the field.
	for (let i = 0; i < 26; i++) {
		const phase = (time * 0.9 + i * 0.37) % 1
		if (still && i > 10) break
		const a = i * 2.39, r = unit * (0.15 + ((i * 0.61) % 0.8))
		ctx.fillStyle = `rgba(255,230,200,${0.5 * Math.sin(Math.PI * phase)})`
		ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.2 + 1.5 * Math.sin(Math.PI * phase), 0, Math.PI * 2); ctx.fill()
	}
	const homes = quarks.map((q, i) => quarkHome(L, unit, i, time, still))
	const inside = quarks.map((q, i) => !q.onPan && drag?.index !== i)
	for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
		const [ax, ay] = inside[i] ? homes[i] : [quarks[i].x, quarks[i].y]
		const [bx, by] = inside[j] ? homes[j] : [quarks[j].x, quarks[j].y]
		if (quarks[i].onPan || quarks[j].onPan) continue
		drawGluon(ctx, ax, ay, bx, by, time, still)
	}
	quarks.forEach((q, i) => {
		if (q.onPan) return
		if (drag?.index !== i) { q.x = homes[i][0]; q.y = homes[i][1] }
		drawQuark(ctx, q.x, q.y, Math.max(14, unit * 0.17), q.flavour)
	})
	if (beat >= 2) {
		ctx.fillStyle = '#f4efe2'; ctx.textAlign = 'center'
		ctx.font = `700 ${Math.max(13, unit * 0.1)}px system-ui, sans-serif`
		ctx.fillText((posterFrame ? '' : en ? 'Proton ' : '质子 ') + '100%', cx, cy - unit * 1.12 - Math.max(11, unit * 0.075))
		ctx.font = `600 ${Math.max(10, unit * 0.07)}px system-ui, sans-serif`; ctx.fillStyle = 'rgba(244,239,226,0.65)'
		ctx.fillText(protonMassMeV.toFixed(1) + ' MeV', cx, cy - unit * 1.12 + 2)
		// The 99% is the answer, so it waits for 懂.
		if (beat >= 4) {
			ctx.font = `800 ${Math.max(22, unit * 0.32)}px system-ui, sans-serif`; ctx.fillStyle = '#ffd9a8'
			ctx.fillText('99%', cx, cy + unit * 0.1)
			ctx.font = `600 ${Math.max(11, unit * 0.08)}px system-ui, sans-serif`; ctx.fillStyle = '#f4efe2'
			if (!posterFrame) ctx.fillText(en ? 'trapped energy' : '被关住的能量', cx, cy + unit * 0.3)
		}
		ctx.textAlign = 'start'
	}
}

function drawGluon(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, time: number, still: boolean) {
	const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length
	ctx.strokeStyle = `rgba(255,214,150,${still ? 0.55 : 0.4 + 0.25 * Math.sin(time * 9 + ax)})`; ctx.lineWidth = 2
	ctx.beginPath()
	for (let s = 0; s <= 40; s++) {
		const f = s / 40, wave = Math.sin(f * Math.PI * 9 - (still ? 0 : time * 8)) * 5 * Math.sin(f * Math.PI)
		const x = ax + dx * f + nx * wave, y = ay + dy * f + ny * wave
		if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y)
	}
	ctx.stroke()
}

function drawQuark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flavour: QuarkFlavour) {
	const base = colors[flavour]
	const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r)
	g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, base); g.addColorStop(1, shade(base))
	ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
	ctx.fillStyle = '#0b0e13'; ctx.textAlign = 'center'; ctx.font = `italic 700 ${r * 1.05}px Georgia, serif`
	ctx.fillText(flavour, x, y + r * 0.33); ctx.textAlign = 'start'
}

function drawScale(ctx: CanvasRenderingContext2D, L: Layout, quarks: QuarkState[], blend: number, beat: number, en: boolean) {
	const { px, py, pr } = L
	ctx.save(); ctx.globalAlpha = Math.min(1, blend * 1.4)
	ctx.fillStyle = '#1d2430'; ctx.strokeStyle = 'rgba(244,239,226,0.35)'; ctx.lineWidth = 1.5
	ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
	ctx.fillStyle = '#2b3240'; ctx.fillRect(px - pr * 0.08, py + pr * 0.2, pr * 0.16, pr * 0.35)
	ctx.beginPath(); ctx.roundRect(px - pr * 0.62, py + pr * 0.52, pr * 1.24, pr * 0.42, 8); ctx.fill()
	const loaded = quarks.filter(q => q.onPan)
	const reading = quarkSum(loaded.map(q => q.flavour))
	// The scale reads in percent of the proton; MeV is the small print.
	ctx.fillStyle = beat >= 3 ? '#ffd166' : '#7fd8a4'; ctx.textAlign = 'center'; ctx.font = `800 ${Math.max(14, pr * 0.22)}px system-ui, sans-serif`
	ctx.fillText(percentOfProton(reading, 1), px, py + pr * 0.8)
	ctx.fillStyle = 'rgba(244,239,226,0.6)'; ctx.font = `600 ${Math.max(10, pr * 0.11)}px system-ui, sans-serif`; ctx.textAlign = 'left'
	ctx.fillText(reading.toFixed(1) + ' MeV', px + pr * 0.62 + 8, py + pr * 0.8)
	ctx.textAlign = 'center'
	ctx.fillStyle = 'rgba(244,239,226,0.65)'; ctx.font = `600 ${Math.max(11, pr * 0.13)}px system-ui, sans-serif`; ctx.fillText(en ? 'Quark scale' : '夸克秤', px, py - pr * 0.6)
	const r = Math.max(12, pr * 0.2), labelled = pr >= 70
	loaded.forEach((q, i) => {
		q.x = px + (i - (loaded.length - 1) / 2) * r * 2.3
		q.y = py - r * 0.55
		drawQuark(ctx, q.x, q.y, r, q.flavour)
		if (!labelled) return
		ctx.fillStyle = '#f4efe2'; ctx.font = `600 ${Math.max(10, r * 0.55)}px system-ui, sans-serif`; ctx.textAlign = 'center'
		ctx.fillText(percentOfProton(quarkMassMeV[q.flavour], 2), q.x, q.y + r * 1.75 + pr * 0.1)
	})
	ctx.textAlign = 'start'; ctx.restore()
}

function drawHint(ctx: CanvasRenderingContext2D, L: Layout, quarks: QuarkState[], time: number, still: boolean, label: string) {
	const next = quarks.find(q => !q.onPan)
	if (!next) return
	const f = still ? 0.5 : (time * 0.6) % 1
	const x = mix(next.x, L.px, easeInOut(f)), y = mix(next.y, L.py - L.pr * 0.3, easeInOut(f))
	ctx.save()
	ctx.setLineDash([5, 7]); ctx.strokeStyle = 'rgba(255,209,102,0.55)'; ctx.lineWidth = 2
	ctx.beginPath(); ctx.moveTo(next.x, next.y); ctx.lineTo(L.px, L.py - L.pr * 0.3); ctx.stroke(); ctx.setLineDash([])
	ctx.globalAlpha = still ? 1 : Math.sin(Math.PI * f)
	ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill()
	ctx.globalAlpha = 1
	ctx.font = '700 14px system-ui, sans-serif'; ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center'
	ctx.fillText(label, next.x, next.y - Math.max(26, L.u * 0.27))
	ctx.restore()
}

function PersonIcon() {
	return <svg viewBox="0 0 24 40" width="22" height="36" aria-hidden="true"><circle cx="12" cy="5" r="4" fill="currentColor" /><rect x="6" y="10" width="12" height="15" rx="4" fill="currentColor" /><path d="M9 25v13M15 25v13" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>
}

function BottleIcon() {
	return <svg viewBox="0 0 20 40" width="18" height="36" aria-hidden="true"><path d="M7 2h6v5l3 4v26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11l3-4z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M5 18h10v18H5z" fill="currentColor" opacity=".55" /></svg>
}

function mix(a: number, b: number, f: number) { return a + (b - a) * f }
function smoothstep(a: number, b: number, x: number) { const f = Math.max(0, Math.min(1, (x - a) / (b - a))); return f * f * (3 - 2 * f) }
function easeInOut(f: number) { return f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2 }
function shade(hex: string) {
	const n = parseInt(hex.slice(1), 16)
	const c = (v: number) => Math.round(v * 0.45).toString(16).padStart(2, '0')
	return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`
}
