import * as T from 'three'

type Branch = {box: T.Box3; left?: Branch; right?: Branch; triangles?: number[]}
type Surface = {mesh: T.Mesh; root: Branch; inverse: T.Matrix4; world: T.Matrix4}

/** Exact triangle tests, with reusable spatial bounds for the exhibit's static meshes. */
export class OcclusionIndex {
  private readonly surfaces: Surface[] = []
  private readonly ray = new T.Ray()
  private readonly a = new T.Vector3()
  private readonly b = new T.Vector3()
  private readonly c = new T.Vector3()
  private readonly hit = new T.Vector3()
  private readonly direction = new T.Vector3()

  constructor(objects: T.Mesh[]) {
    const trees = new Map<T.BufferGeometry, Branch>()
    const seen = new Set<T.Mesh>()
    for (const object of objects) object.traverse((item) => {
      if (!(item instanceof T.Mesh) || seen.has(item)) return
      seen.add(item)
      let root = trees.get(item.geometry)
      if (!root) {
        root = this.build(item.geometry)
        trees.set(item.geometry, root)
      }
      this.surfaces.push({mesh: item, root, inverse: new T.Matrix4(), world: new T.Matrix4().makeScale(0, 0, 0)})
    })
  }

  sync() {
    for (const surface of this.surfaces) if (!surface.world.equals(surface.mesh.matrixWorld)) {
      surface.world.copy(surface.mesh.matrixWorld)
      surface.inverse.copy(surface.world).invert()
    }
  }

  occludes(worldRay: T.Ray, distance: number) {
    for (const surface of this.surfaces) {
      const e = surface.inverse.elements, d = worldRay.direction
      this.direction.set(e[0] * d.x + e[4] * d.y + e[8] * d.z, e[1] * d.x + e[5] * d.y + e[9] * d.z, e[2] * d.x + e[6] * d.y + e[10] * d.z)
      const scale = this.direction.length()
      this.ray.origin.copy(worldRay.origin).applyMatrix4(surface.inverse)
      this.ray.direction.copy(this.direction).multiplyScalar(1 / scale)
      if (this.intersects(surface.root, surface.mesh, distance * distance * scale * scale)) return true
    }
    return false
  }

  private intersects(branch: Branch, mesh: T.Mesh, limitSquared: number): boolean {
    if (!this.ray.intersectBox(branch.box, this.hit)) return false
    if (!branch.box.containsPoint(this.ray.origin) && this.hit.distanceToSquared(this.ray.origin) >= limitSquared) return false
    if (branch.left && branch.right) return this.intersects(branch.left, mesh, limitSquared) || this.intersects(branch.right, mesh, limitSquared)
    const geometry = mesh.geometry
    for (const triangle of branch.triangles!) {
      this.vertices(geometry, triangle)
      const material = Array.isArray(mesh.material) ? mesh.material[geometry.groups.find((g) => triangle * 3 >= g.start && triangle * 3 < g.start + g.count)?.materialIndex ?? 0] : mesh.material
      const hit = material.side === T.BackSide
        ? this.ray.intersectTriangle(this.c, this.b, this.a, true, this.hit)
        : this.ray.intersectTriangle(this.a, this.b, this.c, material.side !== T.DoubleSide, this.hit)
      if (hit && hit.distanceToSquared(this.ray.origin) < limitSquared) return true
    }
    return false
  }

  private vertices(geometry: T.BufferGeometry, triangle: number) {
    const positions = geometry.getAttribute('position'), index = geometry.index
    this.a.fromBufferAttribute(positions, index ? index.getX(triangle * 3) : triangle * 3)
    this.b.fromBufferAttribute(positions, index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1)
    this.c.fromBufferAttribute(positions, index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2)
  }

  private build(geometry: T.BufferGeometry) {
    const count = (geometry.index?.count ?? geometry.getAttribute('position').count) / 3
    const boxes = Array.from({length: count}, (_, triangle) => {
      this.vertices(geometry, triangle)
      return new T.Box3().setFromPoints([this.a, this.b, this.c])
    })
    const centers = boxes.map((box) => box.getCenter(new T.Vector3()))
    const split = (triangles: number[]): Branch => {
      const box = new T.Box3()
      for (const triangle of triangles) box.union(boxes[triangle])
      if (triangles.length <= 8) return {box, triangles}
      const size = box.getSize(new T.Vector3())
      const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z'
      triangles.sort((a, b) => centers[a][axis] - centers[b][axis])
      const middle = triangles.length >> 1
      return {box, left: split(triangles.slice(0, middle)), right: split(triangles.slice(middle))}
    }
    return split(Array.from({length: count}, (_, i) => i))
  }
}
