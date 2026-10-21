import { useId } from 'react';
import type { Cut } from './cow-data';
import { seeded } from './meat-model';
const contour =
	'M-123 -47 C-118 -98 -43 -107 17 -91 C71 -93 126 -63 128 -13 C145 45 85 86 22 92 C-26 104 -80 79 -113 43 C-143 12 -142 -10 -123 -47Z';
/** Original vector illustration: exaggerated tissue motifs, not a histology specimen. */
export function MeatSlice({
	cut,
	heat = 0,
	angle = 90,
	thickness = 1.5,
	plate = true,
	slices = 1,
}: {
	cut: Cut;
	heat?: number;
	angle?: number;
	thickness?: number;
	plate?: boolean;
	slices?: number;
}) {
	const id = useId().replaceAll(':', '');
	const seed = cut.atlas[0] + cut.atlas[1] * 4 + 1;
	const fat = cut.id === 'brisket';
	const tendon = cut.structure === 'tendon';
	const tripe = cut.id === 'tripe';
	const meat = heat === 2 ? '#796254' : heat === 1 ? '#b78073' : fat ? '#dac693' : tripe ? '#bda88d' : '#ad3b36';
	return (
		<svg className="ca-meat" viewBox="0 0 390 330" aria-hidden="true">
			<defs>
				<radialGradient id={`${id}-porcelain`}>
					<stop stopColor="#fdfbf2" />
					<stop offset=".72" stopColor="#f4f0e4" />
					<stop offset=".88" stopColor="#d5d8c9" />
					<stop offset=".94" stopColor="#faf6e9" />
					<stop offset="1" stopColor="#bcc4b4" />
				</radialGradient>
				<linearGradient id={`${id}-meat`} x2=".6" y2="1">
					<stop stopColor={heat ? '#b69b87' : fat ? '#f8eac2' : '#d97664'} />
					<stop offset=".5" stopColor={meat} />
					<stop offset="1" stopColor={heat ? '#715b4e' : fat ? '#c3a57d' : '#73282b'} />
				</linearGradient>
				<clipPath id={`${id}-clip`}>
					<path d={contour} />
				</clipPath>
				<filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
					<feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed={seed} />
					<feColorMatrix type="saturate" values="0" />
					<feComponentTransfer>
						<feFuncA type="linear" slope=".17" />
					</feComponentTransfer>
					<feBlend in="SourceGraphic" mode="soft-light" />
				</filter>
			</defs>
			{plate && (
				<>
					<ellipse cx="197" cy="187" rx="176" ry="127" fill="#594937" opacity=".12" />
					<ellipse cx="195" cy="172" rx="176" ry="128" fill={`url(#${id}-porcelain)`} />
					<ellipse cx="195" cy="172" rx="159" ry="114" fill="none" stroke="#526c5b" strokeWidth="1.8" />
					<ellipse cx="195" cy="172" rx="151" ry="106" fill="none" stroke="#526c5b" strokeWidth=".6" />
				</>
			)}
			{Array.from({ length: Math.min(slices, 5) }, (_, layer) => (
				<g
					key={layer}
					className="ca-slice-piece"
					transform={`translate(${195 + (layer - (slices - 1) / 2) * 12} ${165 + layer * 5}) rotate(${-18 + layer * 17}) scale(${heat === 2 ? 0.8 : heat === 1 ? 0.92 : 1})`}
				>
					<path d={contour} transform={`translate(0 ${thickness * 2})`} fill={fat ? '#ac8c5d' : '#6e2929'} opacity=".8" />
					<path d={contour} fill={`url(#${id}-meat)`} stroke={fat ? '#f5e7c2' : '#e6b6a0'} strokeWidth="3" />
					<g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-grain)`}>
						{Array.from({ length: 95 }, (_, i) => {
							const y = -110 + i * 2.5;
							return (
								<path
									key={i}
									d={`M-160 ${y} Q-50 ${y + 8 + seeded(i, seed) * 14} 10 ${y - 5} T160 ${y + 7}`}
									transform={`rotate(${90 - angle})`}
									stroke={i % 3 === 0 ? '#f1bdab' : '#631e29'}
									strokeWidth={i % 3 === 0 ? 0.7 : 0.45}
									opacity={fat ? 0.15 : 0.4}
									fill="none"
								/>
							);
						})}
						{Array.from({ length: fat ? 42 : cut.id === 'neck' ? 37 : cut.id === 'flank' ? 22 : 12 }, (_, i) => {
							const x = seeded(i, seed) * 280 - 140,
								y = seeded(i + 90, seed) * 200 - 100;
							return (
								<path
									key={`f${i}`}
									d={`M${x} ${y} q${8 + seeded(i + 30, seed) * 20} -12 28 -5 t 24 -8`}
									stroke={fat ? '#fff0c7' : '#f4d4b8'}
									strokeWidth={fat ? 5 : cut.id === 'neck' ? 2.8 : 1.4}
									fill="none"
									opacity=".8"
								/>
							);
						})}
						{cut.id === 'chuck-tender' && <path d="M-120 48 Q-35 5 3 6 T127 -48" fill="none" stroke="#f2dfbe" strokeWidth="10" />}
						{tendon &&
							Array.from({ length: cut.id === 'hind-shank' ? 5 : 3 }, (_, i) => (
								<ellipse
									key={`t${i}`}
									cx={-70 + i * 34}
									cy={Math.sin(i * 2) * 21}
									rx="28"
									ry={48 + seeded(i, seed) * 14}
									transform={`rotate(${i * 14 - 25})`}
									fill="none"
									stroke="#ebd5b6"
									strokeWidth="5"
								/>
							))}
						{tripe &&
							Array.from({ length: 27 }, (_, i) => (
								<path
									key={`o${i}`}
									d={`M${-124 + i * 10} -103 Q${-100 + i * 9} 0 ${-144 + i * 10} 109`}
									stroke="#f7e9cc"
									strokeWidth="4"
									fill="none"
								/>
							))}
						<path d={contour} fill="none" stroke="#ffdcc1" strokeWidth="7" opacity=".35" />
					</g>
				</g>
			))}
		</svg>
	);
}
