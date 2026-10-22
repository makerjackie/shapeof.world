import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '~/i18n/index';
import { useExperienceI18n } from '~/i18n/experience';
import { CELL_SIZE, cowCells } from './cow-cells';
import { copy } from './copy';
import { outline } from './CowMap';
import { assignFates, type Fate } from './yield-model';

// Scene units follow the CowMap outline. The cow stands on y = 450; bins sit underneath.
const VIEW = { x: 60, y: 40, w: 900, h: 720 };
const KNIFE_START = 78;
const KNIFE_END = 792;
const BIN_COLS = 22;
const BIN_BOTTOM = 650;
const BIN_X: Record<Exclude<Fate, 'meat'>, number> = { offal: 92, trim: 478 };
const FATE_STAGE: Record<Fate, number> = { offal: 1, trim: 2, meat: 3 };
const FLY_MS = 700;
// Horns, ear, far legs and tail from CowMap, drawn faintly so the blocks read as a cow.
const DETAILS = {
	farLegs: 'M343 312 L366 363 L351 416 L365 442 L341 448 L327 422 L337 365 L318 329 M694 308 L669 366 L678 411 L666 443 L643 443 L650 409 L641 366 L652 312',
	horns: 'M156 151 Q145 116 157 93 Q157 128 176 141 M183 151 Q207 120 222 136 Q207 155 185 165 M151 173 Q114 156 111 175 Q130 189 151 182',
	tail: 'M746 157 Q783 210 783 298 Q782 326 795 351',
	tuft: 'M795 335 Q813 353 803 378 Q781 363 786 347Z',
};
const COLORS = { hide: '#b48a66', offal: '#8e6b55', trim: '#eadcc0', meat: '#cf4b40', ink: '#f4eadb', muted: '#b9a895' };

type Props = {
	stage: number;
	knifeActive: boolean;
	showMeat: boolean;
	onCut: () => void;
	onInteract: () => void;
};

export function CowScene({ stage, knifeActive, showMeat, onCut, onInteract }: Props) {
	const tx = useExperienceI18n();
	const { locale } = useI18n();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fates = useMemo(() => assignFates(cowCells), []);
	const targets = useMemo(() => {
		const counters = { offal: 0, trim: 0 };
		return cowCells.map((_, i) => {
			const fate = fates[i];
			if (fate === 'meat') return null;
			const k = counters[fate]++;
			return { x: BIN_X[fate] + (k % BIN_COLS) * CELL_SIZE, y: BIN_BOTTOM - Math.floor(k / BIN_COLS) * CELL_SIZE };
		});
	}, [fates]);
	const live = useRef({ stage, knifeActive, showMeat, onCut, onInteract, locale, tx });
	live.current = { stage, knifeActive, showMeat, onCut, onInteract, locale, tx };
	const motion = useRef({ starts: new Float64Array(cowCells.length).fill(Number.NaN), knife: KNIFE_START, drag: null as null | { px: number; knife: number }, touched: false });

	// A stage reached without the knife (button or keyboard) sends the rest of that pile in a sweep.
	useEffect(() => {
		const now = performance.now();
		const m = motion.current;
		cowCells.forEach((c, i) => {
			if (FATE_STAGE[fates[i]] <= stage && Number.isNaN(m.starts[i])) m.starts[i] = now + ((c.x - KNIFE_START) / (KNIFE_END - KNIFE_START)) * 450;
		});
		if (stage === 0) m.starts.fill(Number.NaN);
		m.knife = KNIFE_START;
	}, [stage, fates]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const cowPath = new Path2D(outline);
		const details = { farLegs: new Path2D(DETAILS.farLegs), horns: new Path2D(DETAILS.horns), tail: new Path2D(DETAILS.tail), tuft: new Path2D(DETAILS.tuft) };
		let frame = 0;
		let scale = 1;
		let ox = 0;
		let oy = 0;
		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(rect.width * dpr);
			canvas.height = Math.round(rect.height * dpr);
			scale = Math.min(rect.width / VIEW.w, rect.height / VIEW.h);
			ox = (rect.width - VIEW.w * scale) / 2 - VIEW.x * scale;
			oy = (rect.height - VIEW.h * scale) / 2 - VIEW.y * scale;
			ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		const toScene = (clientX: number) => (clientX - canvas.getBoundingClientRect().left - ox) / scale;

		const sweep = (knife: number, now: number) => {
			const m = motion.current;
			const next = live.current.stage + 1;
			cowCells.forEach((c, i) => {
				if (FATE_STAGE[fates[i]] === next && Number.isNaN(m.starts[i]) && c.x <= knife) m.starts[i] = now + (i % 7) * 18;
			});
		};
		const advance = (knife: number) => {
			const m = motion.current;
			m.knife = Math.max(KNIFE_START, Math.min(KNIFE_END, knife));
			sweep(m.knife, performance.now());
			if (m.knife >= KNIFE_END) {
				m.drag = null;
				sweep(Infinity, performance.now());
				live.current.onCut();
			}
		};
		const down = (e: PointerEvent) => {
			if (!live.current.knifeActive) return;
			live.current.onInteract();
			motion.current.touched = true;
			motion.current.drag = { px: toScene(e.clientX), knife: motion.current.knife };
			canvas.setPointerCapture(e.pointerId);
		};
		const move = (e: PointerEvent) => {
			const drag = motion.current.drag;
			if (drag && live.current.knifeActive) advance(drag.knife + toScene(e.clientX) - drag.px);
		};
		const up = () => (motion.current.drag = null);
		const key = (e: KeyboardEvent) => {
			if (!live.current.knifeActive || e.key !== 'ArrowRight') return;
			e.preventDefault();
			live.current.onInteract();
			motion.current.touched = true;
			advance(motion.current.knife + 90);
		};
		canvas.addEventListener('pointerdown', down);
		canvas.addEventListener('pointermove', move);
		canvas.addEventListener('pointerup', up);
		canvas.addEventListener('pointercancel', up);
		canvas.addEventListener('keydown', key);

		// Sizes are in scene units, but never smaller than `minPx` on screen.
		const label = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center', minPx = 12) => {
			ctx.font = `600 ${Math.max(size, minPx / scale)}px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
			ctx.textAlign = align;
			ctx.fillStyle = color;
			ctx.fillText(text, x, y);
		};
		const pileLabel = (text: string, x: number) => {
			const [name, weight] = text.split(' · ');
			label(name, x, 684, 17, COLORS.muted, 'left');
			label(weight, x, 684 + Math.max(22, 16 / scale), 20, COLORS.ink, 'left', 14);
		};

		const draw = (now: number) => {
			const { stage: s, knifeActive: active, showMeat: meatLabel, locale: l } = live.current;
			const m = motion.current;
			const t = now / 1000;
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.restore();

			ctx.fillStyle = 'rgba(180, 138, 102, 0.22)';
			ctx.fill(details.farLegs);
			ctx.fill(details.horns);
			ctx.fill(details.tuft);
			ctx.strokeStyle = 'rgba(180, 138, 102, 0.4)';
			ctx.lineWidth = 7;
			ctx.lineCap = 'round';
			ctx.stroke(details.tail);
			ctx.lineWidth = 1.5;
			ctx.stroke(details.horns);

			// The empty outline stays, so what is gone remains visible.
			ctx.setLineDash([6, 6]);
			ctx.lineWidth = 1.5;
			ctx.strokeStyle = 'rgba(244, 234, 219, 0.28)';
			ctx.stroke(cowPath);
			ctx.setLineDash([]);

			// You, beside the cow, at 1.7 m against a cow about 1.4 m at the back.
			ctx.fillStyle = 'rgba(244, 234, 219, 0.2)';
			ctx.beginPath();
			ctx.arc(895, 92, 24, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.roundRect(866, 122, 58, 170, 22);
			ctx.fill();
			ctx.beginPath();
			ctx.roundRect(870, 270, 22, 180, 10);
			ctx.roundRect(898, 270, 22, 180, 10);
			ctx.fill();
			label(copy.youLabel(l), 895, 58, 17, COLORS.muted, 'center', 11);

			const size = CELL_SIZE * 0.82;
			const half = size / 2;
			cowCells.forEach((c, i) => {
				const fate = fates[i];
				const start = m.starts[i];
				let x = c.x;
				let y = c.y;
				let color = s >= 1 && fate !== 'offal' ? COLORS[fate] : COLORS.hide;
				if (!Number.isNaN(start) && now >= start) {
					const target = targets[i]!;
					const k = reduced ? 1 : Math.min(1, (now - start) / FLY_MS);
					const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
					x = c.x + (target.x - c.x) * e;
					y = c.y + (target.y - c.y) * e - Math.sin(Math.PI * e) * 70;
					color = COLORS[fate];
				} else if (s === 0 && !reduced) {
					y += Math.sin(t * 1.8 - c.x * 0.012) * 1.4;
				}
				ctx.fillStyle = color;
				ctx.globalAlpha = color === COLORS.hide ? 0.72 + ((i * 37) % 11) / 40 : 0.95;
				ctx.fillRect(x - half, y - half, size, size);
			});
			ctx.globalAlpha = 1;

			if (s === 0) label(copy.cowLabel(l), 425, 100, 26, COLORS.ink, 'center', 15);
			if (meatLabel) label(copy.pile(l, 'meat'), 425, 100, 26, COLORS.meat, 'center', 16);
			if (s >= 1) pileLabel(copy.pile(l, 'offal'), BIN_X.offal - CELL_SIZE / 2);
			if (s >= 2) pileLabel(copy.pile(l, 'trim'), BIN_X.trim - CELL_SIZE / 2);

			if (active) {
				const hint = !m.touched && !m.drag && !reduced;
				const kx = m.knife + (hint ? Math.max(0, Math.sin(t * 3)) * 14 : 0);
				ctx.setLineDash([4, 7]);
				ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(kx, 112);
				ctx.lineTo(kx, 462);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = '#e9e4da';
				ctx.beginPath();
				ctx.roundRect(kx - 22, 66, 44, 42, 4);
				ctx.fill();
				ctx.fillStyle = '#5b3a29';
				ctx.beginPath();
				ctx.roundRect(kx - 7, 30, 14, 38, 5);
				ctx.fill();
				if (m.knife === KNIFE_START) label(tx('向右拖刀 →'), kx + 34, 94, 22, '#ffd166', 'left', 14);
			}
			frame = requestAnimationFrame(draw);
		};
		frame = requestAnimationFrame(draw);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			canvas.removeEventListener('pointerdown', down);
			canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerup', up);
			canvas.removeEventListener('pointercancel', up);
			canvas.removeEventListener('keydown', key);
		};
	}, [fates, targets]);

	return (
		<canvas
			ref={canvasRef}
			className={`ca-scene ${knifeActive ? 'ca-scene-active' : ''}`}
			tabIndex={knifeActive ? 0 : -1}
			aria-label={tx('一头由 600 个方块拼成的牛，每块 1 公斤。向右拖刀，把它分开。')}
		/>
	);
}
