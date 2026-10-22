import { useId } from 'react';
import { useI18n } from '~/i18n/index';
import { useExperienceI18n } from '~/i18n/experience';

// Culinary regions, deliberately not individual muscle boundaries. Left-facing lateral view.
export const regions = [
	{ id: 'tongue', d: 'M96 257 Q117 247 150 256 L150 269 Q119 279 98 271Z', x: 122, y: 267 },
	{ id: 'neck', d: 'M171 171 Q215 122 256 145 L279 176 L248 251 L192 259 L159 215Z', x: 221, y: 207 },
	{ id: 'chuck-flap', d: 'M261 145 Q307 138 342 145 L352 220 Q324 230 295 234 Q278 224 266 208 L279 176Z', x: 305, y: 184 },
	{
		id: 'chuck-tender',
		d: 'M266 208 Q278 224 295 234 Q324 230 352 220 L361 286 Q335 300 309 305 Q281 295 262 278 L248 251Z',
		x: 306,
		y: 264,
	},
	{ id: 'brisket', d: 'M192 259 L248 251 L262 278 L309 305 L295 343 Q245 338 224 305Z', x: 260, y: 308 },
	{ id: 'front-shank', d: 'M294 342 L319 315 L343 331 L332 384 L324 427 L300 433 L289 397Z', x: 313, y: 385 },
	{ id: 'loin', d: 'M344 144 Q490 157 634 142 Q648 162 659 185 Q506 210 352 202Z', x: 491, y: 176 },
	{ id: 'flank', d: 'M359 284 Q477 312 637 261 L650 299 Q584 350 420 345 Q381 340 352 329Z', x: 494, y: 322 },
	{
		id: 'tender',
		d: 'M637 142 Q706 126 741 163 Q771 215 733 299 Q713 320 685 334 Q663 319 650 299 L637 261 L659 185 Q648 162 637 142Z',
		x: 699,
		y: 234,
	},
	{ id: 'hind-shank', d: 'M685 334 L714 314 L734 343 L713 379 L720 429 L697 430 L681 386Z', x: 705, y: 376 },
	{ id: 'tripe', d: 'M444 243 Q445 213 478 219 Q509 218 512 247 Q509 280 478 280 Q448 277 444 243Z', x: 479, y: 249 },
] as const;
export const shortNames: Record<string, string> = {
	tongue: '牛舌',
	neck: '脖仁',
	'chuck-flap': '匙仁',
	'chuck-tender': '匙柄',
	brisket: '胸口朥',
	'front-shank': '三花趾',
	loin: '吊龙',
	flank: '肥胼',
	tender: '嫩肉',
	'hind-shank': '五花趾',
	tripe: '牛百叶',
};
export const outline =
	'M96 248 Q106 229 118 208 Q119 184 145 166 L161 146 Q174 140 183 157 L204 151 Q232 129 264 137 Q304 132 345 137 Q476 151 634 134 Q709 117 745 155 Q768 185 759 242 Q754 276 744 304 L735 342 Q723 365 720 380 L732 445 L705 450 Q695 426 690 401 L683 369 L672 333 Q639 359 591 367 Q469 376 357 346 Q343 365 337 386 L333 443 L304 448 L300 414 Q288 386 283 348 Q249 344 225 311 Q204 292 187 279 L157 276 Q118 289 96 275 Q90 270 96 248Z';
export function CowMap({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
	const tx = useExperienceI18n();
	const { locale } = useI18n();
	const uid = useId().replaceAll(':', '');
	return (
		<svg className="ca-cow-map" viewBox="70 80 750 420" role="group" aria-label={tx('点选牛身上的部位')}>
			<defs>
				<linearGradient id={`${uid}-hide`} x2="0.6" y2="1">
					<stop stopColor="#4a392e" />
					<stop offset=".5" stopColor="#5a4537" />
					<stop offset="1" stopColor="#3a2c23" />
				</linearGradient>
				<clipPath id={`${uid}-body`}>
					<path d={outline} />
				</clipPath>
			</defs>
			<ellipse cx="458" cy="461" rx="288" ry="9" fill="#59402a" opacity=".06" />
			<path
				d="M343 312 L366 363 L351 416 L365 442 L341 448 L327 422 L337 365 L318 329 M694 308 L669 366 L678 411 L666 443 L643 443 L650 409 L641 366 L652 312"
				fill="#3a2d25"
				stroke="#7d6655"
				strokeWidth="1.4"
			/>
			<path d="M746 157 Q783 210 783 298 Q782 326 795 351" fill="none" stroke="#6d5848" strokeWidth="9" strokeLinecap="round" />
			<path d="M795 335 Q813 353 803 378 Q781 363 786 347Z" fill="#2c221c" />
			<path d={outline} fill={`url(#${uid}-hide)`} stroke="#8d7462" strokeWidth="1.5" strokeLinejoin="round" />
			<g clipPath={`url(#${uid}-body)`}>
				<path d="M350 208 Q500 214 637 196 L637 261 Q490 310 359 284Z" fill="#4f3c30" />
				{regions.map((r, i) => (
					<g
						key={r.id}
						role="button"
						tabIndex={0}
						aria-label={tx(shortNames[r.id])}
						aria-pressed={selected === r.id}
						className={`ca-region ${selected === r.id ? 'selected' : ''}`}
						onClick={() => onSelect(r.id)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onSelect(r.id);
							}
						}}
					>
						<path
							d={r.d}
							className="ca-region-fill"
							fill={r.id === 'brisket' ? '#cdb58c' : r.id === 'tripe' || r.id === 'tongue' ? '#8e6b55' : ['#b8473e', '#c55247', '#ad4038', '#bf4c42'][i % 4]}
							stroke="#1a1310"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
					</g>
				))}
			</g>
			<path
				d="M156 151 Q145 116 157 93 Q157 128 176 141 M183 151 Q207 120 222 136 Q207 155 185 165"
				fill="#5e493a"
				stroke="#8d7462"
				strokeWidth="1.5"
			/>
			<path d="M151 173 Q114 156 111 175 Q130 189 151 182" fill="#5e493a" stroke="#8d7462" strokeWidth="1.5" />
			<path
				d="M121 211 Q141 193 166 199 M104 240 Q122 243 135 237 M176 214 Q169 238 154 248"
				fill="none"
				stroke="#8d7462"
				strokeWidth="1.5"
			/>
			<ellipse cx="143" cy="210" rx="4" ry="3" fill="#120d0a" />
			<circle cx="144" cy="209" r="1" fill="#fff6e5" />
			<ellipse cx="103" cy="257" rx="4" ry="3" fill="#74543e" />
			<path d="M303 436 L334 432 L333 450 L300 450Z M704 438 L730 437 L735 450 L701 452Z" fill="#1d1612" />
			<path d="M316 438V450 M718 440L720 451" stroke="#5e493a" />
			{regions.map((r, i) => {
				const outside = r.id === 'tongue' || r.id === 'front-shank' || r.id === 'hind-shank';
				const x = r.id === 'tongue' ? 130 : r.id === 'front-shank' ? 243 : r.id === 'hind-shank' ? 769 : r.x;
				const y = r.id === 'tongue' ? 318 : r.id === 'front-shank' || r.id === 'hind-shank' ? 393 : r.y;
				return (
					<g
						key={`label-${r.id}`}
						className={`ca-map-label ${outside ? 'ca-map-label-outside' : ''} ${selected === r.id ? 'selected' : ''}`}
						pointerEvents="none"
						aria-hidden="true"
					>
						{outside && <path d={`M${r.x} ${r.y} L${x} ${y - 23}`} fill="none" stroke="#a08876" strokeWidth="1.2" />}
						<text className="ca-region-number" x={x} y={y - 9} textAnchor="middle">
							{String(i + 1).padStart(2, '0')}
						</text>
						<text className="ca-region-name" x={x} y={y + 12} textAnchor="middle" data-locale={locale}>
							{tx(shortNames[r.id])}
						</text>
					</g>
				);
			})}
			<text className="ca-map-note" x="470" y="483" textAnchor="middle">
				{tx('餐饮分区示意 · 非精确肌肉边界')}
			</text>
		</svg>
	);
}
