/** Each view frames a specific traffic mechanism. Metres, independent of simulation. */
type Triple = [number, number, number]
export interface Presentation { position: Triple; target: Triple; mobile: Triple; mobileTarget?: Triple; fov: number; mobileFov?: number; conflicts?: boolean; left?: boolean; stretch?: boolean; weaving?: boolean; phases?: boolean }
export const PRESENTATIONS: Record<string, Presentation> = {
  't-junction': { position: [68, 78, 98], mobile: [72, 105, 116], target: [0, 0, 7], fov: 48, conflicts: true },
  'crossroads-yield': { position: [64, 90, 90], mobile: [62, 104, 105], target: [0, 0, 0], fov: 48, conflicts: true },
  'crossroads-signal': { position: [68, 78, 96], mobile: [65, 102, 113], target: [0, 0, 0], fov: 48, conflicts: true, phases: true },
  roundabout: { position: [64, 104, 87], mobile: [60, 123, 99], target: [0, 0, 0], fov: 48, conflicts: true },
  'crossroads-channelized': { position: [80, 122, 112], mobile: [72, 155, 134], target: [0, 0, 0], fov: 52, conflicts: true, phases: true },
  'continuous-flow': { position: [26, 280, 230], mobile: [15, 380, 290], target: [0, 0, 0], fov: 55, mobileFov: 58, left: true, phases: true },
  diamond: { position: [0, 150, 280], mobile: [265, 280, 70], target: [0, 10, 0], fov: 52, mobileFov: 60, conflicts: true, phases: true },
  ddi: { position: [0, 210, 280], mobile: [280, 310, 65], target: [0, 5, 0], fov: 52, mobileFov: 60, left: true },
  parclo: { position: [180, 320, 380], mobile: [330, 450, 170], target: [0, 5, 0], fov: 56, mobileFov: 60, left: true },
  trumpet: { position: [260, 310, 460], mobile: [370, 470, 380], target: [-30, 8, 110], fov: 54, mobileFov: 60, left: true },
  cloverleaf: { position: [225, 164, 290], mobile: [340, 330, 480], target: [0, 10, 0], mobileTarget: [0, 10, 0], fov: 60, mobileFov: 62, weaving: true },
  turbine: { position: [60, 610, 390], mobile: [65, 820, 450], target: [0, 23, 0], fov: 57, mobileFov: 64, left: true, stretch: true },
  stack: { position: [310, 150, 365], mobile: [335, 205, 430], target: [0, 38, 0], fov: 57, mobileFov: 66, left: true, stretch: true },
  huangjuewan: { position: [205, 118, 300], mobile: [240, 115, 345], target: [-10, 20, -40], mobileTarget: [0, 35, -15], fov: 42, mobileFov: 62 },
}

export function defaultOverlays(id: string, firstHero = false) {
  const view = PRESENTATIONS[id]
  return { conflicts: !firstHero && !!view.conflicts, left: !firstHero && !!view.left, stretch: !firstHero && !!view.stretch, weaving: !firstHero && !!view.weaving }
}
