import { DEFAULT_INPUTS, clampLight, type PlantInputs } from './model'
import { clampScale, getActiveLayer, MOBILE_HERO_SCALE, SCALE_DEFAULT } from './scale-model'

/** Read once on entry; navigation and controls never rewrite the URL. */
export function parseCaptureParams(search: string, mobile = false) {
  const query = new URLSearchParams(search)
  const number = (key: string): number | undefined => {
    const raw = query.get(key)
    if (raw === null || raw.trim() === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
  const scale = clampScale(number('scale') ?? (mobile ? MOBILE_HERO_SCALE : SCALE_DEFAULT))
  const molecular = ['membrane', 'motor'].includes(getActiveLayer(scale))
  const speed = number('speed')
  const manualSpeed = speed !== undefined && [0, .001, 1, 60, 3600].includes(speed)
  const timeScale = manualSpeed && speed !== 0 ? speed as PlantInputs['timeScale'] : molecular ? .001 : 1
  const az = number('az'), el = number('el'), time = number('t') ?? 8
  return {
    scale, manualSpeed,
    touched: query.has('scale') || az !== undefined || el !== undefined || query.get('capture') === '1',
    inputs: { ...DEFAULT_INPUTS, I: clampLight(number('light') ?? DEFAULT_INPUTS.I), timeScale, playing: speed !== 0 } satisfies PlantInputs,
    daySeconds: ((time % 24 + 24) % 24) * 3600,
    // Degrees relative to the current anatomical frame. Missing axes keep their default.
    orbit: az !== undefined || el !== undefined ? {
      azimuth: az === undefined ? undefined : ((az % 360 + 360) % 360) * Math.PI / 180,
      elevation: el === undefined ? undefined : Math.max(-20, Math.min(70, el)) * Math.PI / 180,
    } : undefined,
    capture: query.get('capture') === '1',
  }
}
