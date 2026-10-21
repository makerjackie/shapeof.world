import type { ExhibitEffect, ExhibitExperiment } from './reaction-model'

/** Colour marks the illustrated phenomenon, not a fictional element affinity. */
const treatments: Record<ExhibitEffect, { color: string; cue: [string,string]; glyph: string }> = {
 bubbles: {color:'#8bdde6',cue:['释放氢气','Hydrogen released'],glyph:'H₂O'},
 deposit: {color:'#e3b187',cue:['析出铜','Copper deposited'],glyph:'Cu²⁺'},
 oxide: {color:'#dab276',cue:['生成氧化物','Oxide formed'],glyph:'O₂'},
 burn: {color:'#f7dda2',cue:['燃烧 · 白光','Combustion · white light'],glyph:'O₂'},
 melt: {color:'#b1d8dc',cue:['熔化','Melting'],glyph:'35°C'},
 glow: {color:'#ffaf81',cue:['电激发 · 发光','Excitation · light'],glyph:'↯'},
 still: {color:'#b7c9b7',cue:['无明显反应','No visible reaction'],glyph:'H₂O'},
 decay: {color:'#c6c3e6',cue:['α 衰变','Alpha decay'],glyph:'t½'},
}
export function reactionPresentation(experiment:ExhibitExperiment,locale:'zh'|'en') {
 const style=treatments[experiment.effect]
 return {...style,cue:style.cue[locale==='en'?1:0],glyph:experiment.id==='Cu-iron'?'Fe²⁺':style.glyph,
  kind:experiment.effect==='decay'?(locale==='en'?'NUCLEAR DECAY':'核衰变'):experiment.effect==='melt'?(locale==='en'?'PHASE CHANGE':'物态变化'):experiment.effect==='glow'?(locale==='en'?'EXCITATION':'电激发'):(locale==='en'?'CHEMICAL OBSERVATION':'物质与反应')}
}
