// Counting geometry only: these spheres and shell circles are not physical trajectories.
export type Point3 = { x: number; y: number; z: number }
export type AtomPose = { x: number; y: number; scale: number }
export type Nucleon = Point3 & { key: string; kind: 'proton' | 'neutron'; radius: number }

export function rotatePoint(point: Point3, pose: Pick<AtomPose, 'x' | 'y'>): Point3 {
 const x = pose.x * Math.PI / 180, y = pose.y * Math.PI / 180
 const horizontal = point.x * Math.cos(y) + point.z * Math.sin(y)
 const depth = -point.x * Math.sin(y) + point.z * Math.cos(y)
 return { x: horizontal, y: point.y * Math.cos(x) - depth * Math.sin(x), z: point.y * Math.sin(x) + depth * Math.cos(x) }
}

export function shellPoint(index: number, shellCount: number, angle: number): Point3 {
 const radius = shellCount === 1 ? 88 : 55 + index * 65 / (shellCount - 1)
 return rotatePoint({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 }, { x: -16 + index % 3 * 12, y: -14 + index * 5 })
}

// Close-packed lattice, ordered from the centre outwards. Stable keys keep an
// isotope change local to its neutrons; the centroid keeps even hydrogen centred.
const sites: Point3[] = []
for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) for (let z = -7; z <= 7; z++) {
 if ((x + y + z) % 2 === 0) sites.push({ x, y, z })
}
sites.sort((a, b) => a.x ** 2 + a.y ** 2 + a.z ** 2 - b.x ** 2 - b.y ** 2 - b.z ** 2 || (a.x * 17 + a.y * 31 + a.z * 47) - (b.x * 17 + b.y * 31 + b.z * 47))

export function nucleusGeometry(protons: number, neutrons: number): Nucleon[] {
 const particles = (['proton', 'neutron'] as const).flatMap((kind, offset) =>
  Array.from({ length: kind === 'proton' ? protons : neutrons }, (_, i) => ({ ...sites[i * 2 + offset], key: `${kind}-${i}`, kind })))
 if (!particles.length) return []
 const centre = particles.reduce((sum, p) => ({ x: sum.x + p.x / particles.length, y: sum.y + p.y / particles.length, z: sum.z + p.z / particles.length }), { x: 0, y: 0, z: 0 })
 const centred = particles.map(p => ({ ...p, x: p.x - centre.x, y: p.y - centre.y, z: p.z - centre.z }))
 const extent = Math.max(...centred.map(p => Math.hypot(p.x, p.y, p.z)))
 const spacing = Math.min(12, 29 / (extent + .72))
 return centred.map(p => ({ ...p, x: p.x * spacing, y: p.y * spacing, z: p.z * spacing, radius: spacing * .72 }))
}
