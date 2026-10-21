export interface Nuclide { symbol: string; mass: number; protons: number }
export interface SynthesisReaction {
 symbol: string
 beam: Nuclide
 target: Nuclide
 product: Nuclide
 neutrons: number
 sourceUrl: string
 sourceTitle: string
 context: string
 contextEn: string
}

export const nuclideText = (n: Nuclide) => `${n.symbol}-${n.mass}`
export const reactionText = (r: SynthesisReaction) => `${nuclideText(r.target)} + ${nuclideText(r.beam)} → ${nuclideText(r.product)} + ${r.neutrons}n`

// Explanatory nucleon packing, not measured nuclear positions, colour or trajectories.
// Every dot represents one nucleon; isotope labels supply the independently sourced counts.
function nucleus(n: Nuclide, x: number, y: number, prefix: string): string {
 const radius = 4.5
 const spread = 4.3
 let dots = ''
 for (let i = 0; i < n.mass; i++) {
  const angle = i * 2.399963229728653
  const distance = Math.sqrt(i) * spread
  const proton = Math.floor((i + 1) * n.protons / n.mass) > Math.floor(i * n.protons / n.mass)
  dots += `<circle cx="${(Math.cos(angle) * distance).toFixed(2)}" cy="${(Math.sin(angle) * distance).toFixed(2)}" r="${radius}" fill="url(#${prefix}-${proton ? 'p' : 'n'})" stroke="#ffffff" stroke-width=".55"/>`
 }
 return `<g transform="translate(${x} ${y})">${dots}</g>`
}

function label(n: Nuclide, x: number, y: number): string {
 return `<text x="${x}" y="${y}" text-anchor="middle" fill="#3d595b" font-family="Georgia,serif" font-size="30"><tspan font-size="17" dy="-13">${n.mass}</tspan><tspan dy="13">${n.symbol}</tspan></text>`
}

/** All inputs are repository-owned scientific records. Only element symbols enter SVG markup. */
export function synthesisSvg(r: SynthesisReaction, animated = false): string {
 for (const n of [r.beam, r.target, r.product]) {
  if (!/^[A-Z][a-z]?$/.test(n.symbol) || !Number.isInteger(n.mass) || n.mass < n.protons || n.mass > 310) throw new Error('Invalid synthesis nuclide')
 }
 const prefix = `synthesis-${r.symbol}`
 const compound = { ...r.product, mass: r.target.mass + r.beam.mass }
 const style = animated ? `<style>
 .pm-fusion-beam{animation:pm-fusion-beam 4.8s ease-in-out both}.pm-fusion-target{animation:pm-fusion-target 4.8s ease-in-out both}.pm-fusion-compound{animation:pm-fusion-compound 4.8s ease-in-out both}.pm-fusion-product{animation:pm-fusion-product 4.8s ease-in-out both}.pm-fusion-emission{animation:pm-fusion-emission 4.8s ease-out both}
 @keyframes pm-fusion-beam{0%,8%{transform:translateX(0);opacity:1}31%{transform:translateX(135px);opacity:1}34%,100%{transform:translateX(135px);opacity:0}}
 @keyframes pm-fusion-target{0%,31%{opacity:1}34%,100%{opacity:0}}
 @keyframes pm-fusion-compound{0%,31%{opacity:0;transform:translateX(0)}34%,43%{opacity:1;transform:translateX(0)}54%,100%{opacity:0;transform:translateX(210px)}}
 @keyframes pm-fusion-product{0%,43%{opacity:0;transform:translateX(-210px)}57%,100%{opacity:1;transform:translateX(0)}}
 @keyframes pm-fusion-emission{0%,44%{opacity:0;transform:translate(-190px,32px)}62%,100%{opacity:1;transform:translate(0,0)}}
 @media(prefers-reduced-motion:reduce){.pm-fusion-beam,.pm-fusion-target,.pm-fusion-compound,.pm-fusion-product,.pm-fusion-emission{animation:none}.pm-fusion-compound{opacity:0}}
 </style>` : ''
 let emitted = ''
 for (let i = 0; i < r.neutrons; i++) emitted += `<circle cx="${475 + i * 18}" cy="${135 - i * 9}" r="5" fill="url(#${prefix}-n)"/><path d="M${460 + i * 18},${153 - i * 9}l-14,18" stroke="#91aaac" stroke-width="1" opacity=".5"/>`
 return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
 <defs><radialGradient id="${prefix}-p" cx="30%" cy="25%"><stop stop-color="#e1c59a"/><stop offset="1" stop-color="#a17d4f"/></radialGradient><radialGradient id="${prefix}-n" cx="30%" cy="25%"><stop stop-color="#c1d9d6"/><stop offset="1" stop-color="#688a8a"/></radialGradient><radialGradient id="${prefix}-light"><stop stop-color="#e9ede7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>${style}
 <ellipse cx="380" cy="260" rx="240" ry="195" fill="url(#${prefix}-light)"/>
 <path d="M50 248H588M244 147V328M464 136V332" stroke="#b9c8c3" stroke-width="1" stroke-dasharray="2 9" opacity=".65"/>
 <path d="M336 248h29l-7-5m7 5-7 5" fill="none" stroke="#8eaa9e" stroke-width="1.5"/>
 <g class="pm-fusion-beam">${nucleus(r.beam, 109, 248, prefix)}</g>
 <g class="pm-fusion-target">${nucleus(r.target, 244, 248, prefix)}</g>
${animated ? `<g class="pm-fusion-compound" opacity="0">${nucleus(compound, 244, 248, prefix)}</g>` : ''}
 <g class="pm-fusion-product">${nucleus(r.product, 454, 248, prefix)}</g>
 <g class="pm-fusion-emission">${emitted}<text x="510" y="106" text-anchor="middle" fill="#6b8585" font-family="Georgia,serif" font-size="20">${r.neutrons} n</text></g>
 ${label(r.beam, 109, 365)}${label(r.target, 244, 365)}${label(r.product, 454, 365)}
 <text x="176" y="365" text-anchor="middle" fill="#8c9f98" font-size="25">+</text><text x="349" y="365" text-anchor="middle" fill="#8c9f98" font-size="25">→</text>
 </svg>`
}
