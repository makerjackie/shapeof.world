/** A two-spool, separate-flow turbofan reference cycle. SI throughout.
 * See SOURCES.md: this is a 0-D energy/momentum model, not an engine map. */
export const AIR = { cp: 1004.5, gamma: 1.4, R: 287.0 }
export const GAS = { cp: 1150, gamma: 1.33, R: 1150 * .33 / 1.33 }
export type EngineSettings = {
  throttle: number; altitude: number; mach: number; bypass: number
  compressorRatio: number; compressorEfficiency: number
}
export const DEFAULT_SETTINGS: EngineSettings = {
  throttle: .76, altitude: 0, mach: 0, bypass: 8,
  compressorRatio: 22, compressorEfficiency: .88,
}
export type Station = { id: string; name: string; temperature: number; pressure: number; x: number; color: string }
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

export function atmosphere(altitude: number) {
  const h = clamp(altitude, 0, 12000)
  const temperature = h <= 11000 ? 288.15 - .0065 * h : 216.65
  const pressure = h <= 11000 ? 101325 * (temperature / 288.15) ** 5.25588 : 22632.06 * Math.exp(-(h - 11000) * 9.80665 / (AIR.R * temperature))
  return { temperature, pressure, density: pressure / (AIR.R * temperature) }
}

/** Convergent nozzle, with explicit pressure thrust when choked.
 * Required exit area follows prescribed mass flow; no fixed-area map matching. */
export function nozzle(totalTemperature: number, totalPressure: number, ambientPressure: number, massFlow: number, gas = AIR) {
  if (totalPressure <= ambientPressure || massFlow <= 0) return { speed: 0, pressure: ambientPressure, area: 0, pressureThrust: 0, choked: false }
  const criticalRatio = ((gas.gamma + 1) / 2) ** (gas.gamma / (gas.gamma - 1))
  const choked = totalPressure / ambientPressure >= criticalRatio
  const pressure = choked ? totalPressure / criticalRatio : ambientPressure
  const staticTemperature = totalTemperature * (pressure / totalPressure) ** ((gas.gamma - 1) / gas.gamma)
  const speed = Math.sqrt(Math.max(0, 2 * .98 * gas.cp * (totalTemperature - staticTemperature)))
  const density = pressure / (gas.R * staticTemperature)
  const area = massFlow / Math.max(1e-9, density * speed)
  return { speed, pressure, area, pressureThrust: (pressure - ambientPressure) * area, choked }
}

export function engineCycle(settings: EngineSettings) {
  const throttle = clamp(settings.throttle, .1, 1)
  const bpr = clamp(settings.bypass, 0, 12)
  const efficiency = clamp(settings.compressorEfficiency, .76, .94)
  const ambient = atmosphere(settings.altitude)
  const mach = clamp(settings.mach, 0, .85)
  const flightSpeed = mach * Math.sqrt(AIR.gamma * AIR.R * ambient.temperature)
  const ram = 1 + .5 * (AIR.gamma - 1) * mach ** 2
  const t2 = ambient.temperature * ram
  const p2 = ambient.pressure * ram ** (AIR.gamma / (AIR.gamma - 1)) * .995
  const spool = .3 + .7 * throttle
  const fanRatio = 1 + .52 * spool ** 2
  const t13 = t2 * (1 + (fanRatio ** ((AIR.gamma - 1) / AIR.gamma) - 1) / .91)
  const p13 = p2 * fanRatio
  const pressureRatio = 1 + (clamp(settings.compressorRatio, 8, 35) - 1) * spool ** 2
  const t3 = t13 * (1 + (pressureRatio ** ((AIR.gamma - 1) / AIR.gamma) - 1) / efficiency)
  const p3 = p13 * pressureRatio
  const t4 = Math.max(t3 + 100, 850 + 800 * throttle)
  const p4 = p3 * .95
  const fuelRatio = Math.max(0, (GAS.cp * t4 - AIR.cp * t3) / (.99 * 43e6 - GAS.cp * t4))
  const fanWork = AIR.cp * (t13 - t2)
  const compressorWork = AIR.cp * (t3 - t13)
  const t45 = t4 - compressorWork / ((1 + fuelRatio) * GAS.cp * .99)
  const p45 = p4 * Math.max(.01, 1 - (t4 - t45) / (.92 * t4)) ** (GAS.gamma / (GAS.gamma - 1))
  const t5 = t45 - fanWork * (1 + bpr) / ((1 + fuelRatio) * GAS.cp * .99)
  const p5 = p45 * Math.max(.01, 1 - (t45 - t5) / (.92 * t45)) ** (GAS.gamma / (GAS.gamma - 1))
  // Deliberate off-design closure, rather than a hidden claim to a real map.
  const coreFlow = 55 * p2 / 101325 * Math.sqrt(288.15 / t2) * (.3 + .7 * throttle)
  const bypassFlow = coreFlow * bpr
  const coreNozzle = nozzle(t5, p5, ambient.pressure, coreFlow * (1 + fuelRatio), GAS)
  const fanNozzle = nozzle(t13, p13 * .98, ambient.pressure, bypassFlow)
  const coreThrust = coreFlow * ((1 + fuelRatio) * coreNozzle.speed - flightSpeed) + coreNozzle.pressureThrust
  const fanThrust = bypassFlow * (fanNozzle.speed - flightSpeed) + fanNozzle.pressureThrust
  const thrust = coreThrust + fanThrust
  const fuelFlow = coreFlow * fuelRatio
  const stations: Station[] = [
    { id: '2', name: '进气', temperature: t2, pressure: p2, x: -4.5, color: '#88cbd7' },
    { id: '13', name: '风扇出口', temperature: t13, pressure: p13, x: -3.2, color: '#77b8cd' },
    { id: '3', name: '压气机出口', temperature: t3, pressure: p3, x: -.7, color: '#e8bb76' },
    { id: '4', name: '燃烧室出口', temperature: t4, pressure: p4, x: 1.1, color: '#f18c53' },
    { id: '45', name: '高压涡轮出口', temperature: t45, pressure: p45, x: 1.9, color: '#d8a279' },
    { id: '5', name: '低压涡轮出口', temperature: t5, pressure: p5, x: 3.5, color: '#adabb2' },
  ]
  return {
    ambient, flightSpeed, spool, fanRatio, pressureRatio, fuelRatio, coreFlow, bypassFlow,
    fuelFlow, coreThrust, fanThrust, thrust,
    tsfc: thrust > 1 ? fuelFlow / thrust * 1e6 : null,
    compressorPower: coreFlow * compressorWork,
    fanPower: coreFlow * (1 + bpr) * fanWork,
    hptPower: coreFlow * (1 + fuelRatio) * GAS.cp * (t4 - t45) * .99,
    lptPower: coreFlow * (1 + fuelRatio) * GAS.cp * (t45 - t5) * .99,
    lowRpm: 3300 * spool, highRpm: 12000 * (.46 + .54 * throttle),
    stations, coreNozzle, fanNozzle,
    feasible: t5 > ambient.temperature && p5 > ambient.pressure && thrust > 0,
  }
}

export const PRESETS: { name: string; settings: EngineSettings }[] = [
  { name: '地面起飞', settings: { ...DEFAULT_SETTINGS, throttle: 1 } },
  { name: '高空巡航', settings: { ...DEFAULT_SETTINGS, altitude: 11000, mach: .8, throttle: .7 } },
  { name: '低涵道比', settings: { ...DEFAULT_SETTINGS, bypass: 1.5, throttle: .9 } },
  { name: '压气机效率下降', settings: { ...DEFAULT_SETTINGS, compressorEfficiency: .76 } },
]

/** Equal pressure-ratio stage allocation, consistent with the aggregate cycle.
 * This is a teaching allocation, not a resolved stage map or blade-flow solution. */
export function compressorStages(cycle: ReturnType<typeof engineCycle>, count = 9) {
  const inlet = cycle.stations[1], exit = cycle.stations[2]
  const exponent = (AIR.gamma - 1) / AIR.gamma
  const rise = exit.temperature - inlet.temperature
  return Array.from({ length: count }, (_, i) => {
    const f0 = i / count, f1 = (i + 1) / count
    const fraction = (f: number) => (cycle.pressureRatio ** (exponent * f) - 1) / (cycle.pressureRatio ** exponent - 1)
    const temperature = inlet.temperature + rise * fraction(f1)
    const previousTemperature = inlet.temperature + rise * fraction(f0)
    return { index: i, temperature, pressure: inlet.pressure * cycle.pressureRatio ** f1, power: cycle.coreFlow * AIR.cp * (temperature - previousTemperature) }
  })
}
