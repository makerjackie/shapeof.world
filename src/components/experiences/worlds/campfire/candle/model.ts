/** Qualitative optical illustration inherited from fire-gravity, not reacting-flow measurements. */
export function flameShape(gravity: number) {
  const g = Number.isFinite(gravity) ? Math.max(0, Math.min(1, gravity)) : 1
  const buoyancy = Math.sqrt(g)
  return { gravity: g, height: .78 + .92 * buoyancy, radius: .60 - .29 * buoyancy }
}
export function relax(current: number, target: number, dt: number) { return current + (target-current)*(1-Math.exp(-Math.max(0,dt)*3)) }
export const FRAME = { scale:3.5, offset:.6 }
export const CANDLE_REGIONS = [
  { id:'whole',label:'全貌',title:'一根蜡烛，三种不同的区域',body:'静止空气中的小烛火较平顺，是层流；篝火有强烈的湍流卷动。',fact:'点一层，剖开黄光',focus:0,x:0,y:.8 },
  { id:'core',label:'焰心',title:'暗处，蜡正在变成气体',body:'液蜡沿烛芯上升、汽化。焰心富含蜡蒸气，少氧；暗处也有燃料。',fact:'富燃料 · 少氧 · 比反应边缘凉',focus:1,x:.04,y:.35 },
  { id:'luminous',label:'内焰',title:'黄色来自热烟炱',body:'蜡蒸气分解生成烟炱，热颗粒发黄光。亮度也受颗粒多少影响，不能单独判断温度。',fact:'烟炱发光 · 最亮未必最热',focus:2,x:.12,y:.92 },
  { id:'outer',label:'外焰',title:'薄薄的外侧，氧气进来了',body:'外侧燃料遇见氧，反应更充分。外缘常比黄色亮区热，却不那么亮。',fact:'反应薄层 · 蓝色外缘增强示意',focus:3,x:.21,y:.72 },
] as const
export type CandleRegion = typeof CANDLE_REGIONS[number]['id']
