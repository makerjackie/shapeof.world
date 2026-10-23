/** Display coordinates only. These intentionally enlarged layers have no physical units. */
export type ProfilePoint = readonly [r: number, z: number]
export type MaterialKey = 'casing' | 'explosive' | 'pusher' | 'reflector' | 'core' | 'source'
export type Part = {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  configuration: 'implosion' | 'gun' | 'thermonuclear'
  order: number
  material: MaterialKey
  profiles: ReadonlyArray<{id: string; points: ProfilePoint[]; displacement: readonly [number, number, number]}>
  scale: readonly [number, number, number]
  anchor: readonly [number, number, number]
}

/** Closed meridian of a display shell; its two halves remain independent objects. */
function shell(outer: number, inner: number, half: 1 | -1): ProfilePoint[] {
  const points: ProfilePoint[] = []
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI / 2
    points.push([Math.cos(a) * outer, Math.sin(a) * outer * half])
  }
  for (let i = 48; i >= 0; i--) {
    const a = (i / 48) * Math.PI / 2
    points.push([Math.cos(a) * inner, Math.sin(a) * inner * half])
  }
  points.push(points[0])
  return points
}

function profiles(id: string, outer: number, inner: number, separation: number) {
  return ([1, -1] as const).map((half) => ({
    id: `${id}-${half === 1 ? 'upper' : 'lower'}`,
    points: shell(outer, inner, half),
    displacement: [0, half === 1 ? separation * 1.65 : 0, 0] as const,
  }))
}

export const MATERIALS = {
  casing: {surface: '#5a5f57', cut: '#8b9096', hatch: 1, metalness: 0.52, roughness: 0.55},
  explosive: {surface: '#b8955a', cut: '#c9a35a', hatch: 2, metalness: 0.05, roughness: 0.73},
  pusher: {surface: '#939ba2', cut: '#b9c1c8', hatch: 3, metalness: 0.35, roughness: 0.7},
  reflector: {surface: '#3f4753', cut: '#4b5563', hatch: 4, metalness: 0.45, roughness: 0.62},
  core: {surface: '#8a5a40', cut: '#c8744a', hatch: 0, metalness: 0.28, roughness: 0.7},
  source: {surface: '#f2d48a', cut: '#f2d48a', hatch: 0, metalness: 0.25, roughness: 0.38},
} as const

export const PARTS: ReadonlyArray<Part> = [
  {
    id: 'casing', name: '弹壳与尾翼', nameEn: 'Casing & tail', order: 1, configuration: 'implosion', material: 'casing',
    description: '外壳包住内部结构，尾翼稳定飞行。这里借用“胖子”复制品的外形。',
    descriptionEn: 'The casing encloses the device; the tail stabilizes flight. This silhouette refers to museum replicas of Fat Man.',
    profiles: profiles('casing', 2.24, 2.12, 1.6), scale: [1.5, 1, 1], anchor: [-1.857, 1.3, 1.238],
  },
  {
    id: 'explosive', name: '高能炸药层', nameEn: 'Explosive layer', order: 2, configuration: 'implosion', material: 'explosive',
    description: '化学爆轰向内汇聚。这里只用一层均匀球壳表示。',
    descriptionEn: 'A chemical detonation converges inward. Only a uniform spherical layer is shown here.',
    profiles: profiles('explosive', 1.94, 1.65, 1.2), scale: [1, 1, 1], anchor: [-1.15, 0.76, 1.15],
  },
  {
    id: 'pusher', name: '推进层', nameEn: 'Pusher', order: 3, configuration: 'implosion', material: 'pusher',
    description: '把向内的挤压传向更深的层。动画中的压缩量是示意。',
    descriptionEn: 'Passes the inward compression to the inner layers. The amount of compression in the animation is illustrative.',
    profiles: profiles('pusher', 1.59, 1.4, 0.86), scale: [1, 1, 1], anchor: [-0.951, -0.65, 0.951],
  },
  {
    id: 'reflector', name: '反射层', nameEn: 'Reflector', order: 4, configuration: 'implosion', material: 'reflector',
    description: '把部分中子送回核心，也凭惯性延缓它散开。',
    descriptionEn: 'Returns some neutrons to the core and briefly delays its expansion through inertia.',
    profiles: profiles('reflector', 1.34, 1.1, 0.54), scale: [1, 1, 1], anchor: [0.651, 0.8, 0.651],
  },
  {
    id: 'core', name: '可裂变核心', nameEn: 'Fissile core', order: 5, configuration: 'implosion', material: 'core',
    description: '原子核裂开，释放能量和中子。新的中子可以使更多原子核裂开。',
    descriptionEn: 'Nuclei split, releasing energy and neutrons. These neutrons can split more nuclei.',
    profiles: profiles('core', 1.01, 0.26, 0.26), scale: [1, 1, 1], anchor: [0.467, -0.45, 0.467],
  },
  {
    id: 'source', name: '中子源', nameEn: 'Neutron source', order: 6, configuration: 'implosion', material: 'source',
    description: '在压缩阶段放出第一批中子。这里只用一颗亮珠表示。',
    descriptionEn: 'Releases the first neutrons during compression. Shown only as a small glowing bead.',
    profiles: profiles('source', 0.18, 0, 0), scale: [1, 1, 1], anchor: [0, 0, 0],
  },
]
