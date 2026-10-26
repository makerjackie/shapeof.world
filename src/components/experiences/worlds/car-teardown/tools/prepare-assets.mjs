import fs from 'node:fs'
import path from 'node:path'
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {draco, prune, dedup} from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import * as T from 'three'
const out = path.resolve('.local/car-assets/v2')
fs.mkdirSync(out, {recursive: true})
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule()})
const point = new T.Vector3()
function bake(doc, mesh, matrix) {
	const result = doc.createMesh(mesh.getName())
	for (const primitive of mesh.listPrimitives()) {
		const p = primitive.clone(),
			pos = primitive.getAttribute('POSITION').clone()
		pos.setArray(new Float32Array(pos.getArray()))
		for (let i = 0; i < pos.getCount(); i++) {
			pos.getElement(i, point.toArray())
			const v = []
			pos.getElement(i, v)
			point.fromArray(v).applyMatrix4(matrix)
			pos.setElement(i, point.toArray())
		}
		p.setAttribute('POSITION', pos)
		const old = primitive.getAttribute('NORMAL')
		if (old) {
			const n = old.clone().setArray(new Float32Array(old.getArray())),
				normal = new T.Matrix3().getNormalMatrix(matrix)
			for (let i = 0; i < n.getCount(); i++) {
				const v = []
				n.getElement(i, v)
				point.fromArray(v).applyMatrix3(normal).normalize()
				n.setElement(i, point.toArray())
			}
			p.setAttribute('NORMAL', n)
		}
		if (p.getAttribute('TANGENT')) p.setAttribute('TANGENT', null)
		result.addPrimitive(p)
	}
	return result
}
function ancestors(n) {
	const a = []
	for (let p = n; p; p = p.getParentNode()) a.push(p.getName())
	return a
}
function meshBounds(mesh) {
	const box = new T.Box3()
	for (const p of mesh.listPrimitives()) {
		const a = p.getAttribute('POSITION')
		for (let i = 0; i < a.getCount(); i++) {
			const v = []
			a.getElement(i, v)
			box.expandByPoint(point.fromArray(v))
		}
	}
	return box
}
function smallAxis(meshes, pivot) {
	const c = Array.from({length: 3}, () => [0, 0, 0])
	for (const mesh of meshes)
		for (const p of mesh.listPrimitives()) {
			const a = p.getAttribute('POSITION')
			for (let i = 0; i < a.getCount(); i++) {
				const v = []
				a.getElement(i, v)
				for (let k = 0; k < 3; k++) v[k] -= pivot[k]
				for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[j][k] += v[j] * v[k]
			}
		}
	const e = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1],
	]
	for (let it = 0; it < 20; it++) {
		let p = 0,
			q = 1
		for (const [i, j] of [
			[0, 1],
			[0, 2],
			[1, 2],
		])
			if (Math.abs(c[i][j]) > Math.abs(c[p][q])) {
				p = i
				q = j
			}
		const a = 0.5 * Math.atan2(2 * c[p][q], c[q][q] - c[p][p]),
			cs = Math.cos(a),
			sn = Math.sin(a)
		for (let k = 0; k < 3; k++) {
			const x = c[k][p],
				y = c[k][q]
			c[k][p] = cs * x - sn * y
			c[k][q] = sn * x + cs * y
		}
		for (let k = 0; k < 3; k++) {
			const x = c[p][k],
				y = c[q][k]
			c[p][k] = cs * x - sn * y
			c[q][k] = sn * x + cs * y
			const u = e[k][p],
				v = e[k][q]
			e[k][p] = cs * u - sn * v
			e[k][q] = sn * u + cs * v
		}
	}
	const idx = [0, 1, 2].sort((a, b) => c[a][a] - c[b][b])[0]
	const axis = new T.Vector3(e[0][idx], e[1][idx], e[2][idx])
	if (axis.z < 0) axis.negate()
	return axis.normalize()
}
async function body() {
	const doc = await io.read('.local/car-assets/carconcept/compressed/CarConcept.gltf')
	for (const extension of doc.getRoot().listExtensionsUsed()) if (extension.extensionName === 'KHR_materials_variants') extension.dispose()
	for (const m of doc.getRoot().listMaterials()) {
		if (/Khronos/i.test(m.getEmissiveTexture()?.getURI() || '')) m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0])
		if (m.getName().startsWith('Paint 1')) {
			m.setBaseColorFactor([0.1, 0.18, 0.19, 1]).setRoughnessFactor(0.26).setNormalScale(0.03)
		}
		if (m.getName() === 'Tireside') m.setBaseColorTexture(null).setNormalTexture(null).setBaseColorFactor([0.012, 0.015, 0.017, 1])
	}
	const oldNodes = doc.getRoot().listNodes(),
		oldScenes = doc.getRoot().listScenes(),
		scene = doc.createScene('Unbranded concept coupe')
	const conversion = new T.Matrix4().makeRotationY(Math.PI / 2)
	conversion.setPosition(-0.0858091116, 0, 0)
	const wheelPivots = {}
	for (const n of oldNodes)
		if (/^Wheel(Front|Rear)[LR]$/.test(n.getName()))
			wheelPivots[n.getName()] = new T.Vector3()
				.setFromMatrixPosition(conversion.clone().multiply(new T.Matrix4().fromArray(n.getWorldMatrix())))
				.toArray()
	const entries = []
	for (const n of oldNodes) {
		if (!n.getMesh()) continue
		const name = n.getName(),
			chain = ancestors(n)
		if (/Engine|Axles|License Plate|InteriorSteeringEmblem|BrakePad|BrakeDisc/.test(name)) continue
		let kind = 'body',
			key = 'body'
		const wheel = chain.find((s) => /^Wheel(Front|Rear)[LR]$/.test(s))
		if (wheel) {
			kind = 'wheel'
			key = wheel
		} else if (chain.some((s) => /^BodyDoor[LR]Color1$/.test(s))) {
			key = chain.find((s) => /^BodyDoor[LR]Color1$/.test(s))
			kind = 'door'
		} else if (chain.includes('BodyHood')) {
			key = 'hood'
			kind = 'hood'
		} else if (chain.includes('InteriorRearHatch')) {
			key = 'hatch'
			kind = 'hatch'
		} else if (name.startsWith('Interior')) {
			kind = 'interior'
			key = 'interior'
		}
		const world = conversion.clone().multiply(new T.Matrix4().fromArray(n.getWorldMatrix()))
		// This concept's central controls originally fill the front engine envelope.
		// Move the lower central dash, steering and pedals rearward as rigid parts.
		if (/InteriorDashMid|InteriorSteering|InteriorPedal/.test(name)) world.premultiply(new T.Matrix4().makeTranslation(-0.48, 0, 0))
		const mesh = bake(doc, n.getMesh(), world)
		entries.push({name, kind, key, mesh})
	}
	const wheelRotations = {}
	for (const [key, p] of Object.entries(wheelPivots)) {
		const axis = smallAxis(
			entries.filter((e) => e.key === key).map((e) => e.mesh),
			p,
		)
		wheelRotations[key] = new T.Quaternion().setFromUnitVectors(axis, new T.Vector3(0, 0, 1))
	}
	const pivots = {...wheelPivots, hood: [2.29357946, 0.1760146, 0], hatch: [-0.51555216, 0, 0]}
	for (const e of entries) {
		const p = pivots[e.key] ?? [0, 0, 0]
		let mesh = e.mesh
		if (e.kind === 'wheel') {
			const m = new T.Matrix4()
				.makeRotationFromQuaternion(wheelRotations[e.key])
				.multiply(new T.Matrix4().makeTranslation(-p[0], -p[1], -p[2]))
			mesh = bake(doc, mesh, m)
		} else if (e.kind === 'hood' || e.kind === 'hatch') mesh = bake(doc, mesh, new T.Matrix4().makeTranslation(-p[0], -p[1], -p[2]))
		const node = doc
			.createNode(e.name || `${e.key}-tire`)
			.setMesh(mesh)
			.setExtras({kind: e.kind, key: e.key, bindOrigin: p})
		if (e.kind !== 'wheel') node.setTranslation(p)
		scene.addChild(node)
	}
	for (const n of oldNodes) n.dispose()
	for (const s of oldScenes) s.dispose()
	await doc.transform(prune(), dedup(), draco({quantizePosition: 14, quantizeNormal: 10}))
	await io.write(path.join(out, 'car.glb'), doc)
	return {wheelPivots}
}
async function engine() {
	const doc = await io.read(path.join(out, 'engine-beveled.glb')),
		oldNodes = doc.getRoot().listNodes(),
		oldScenes = doc.getRoot().listScenes(),
		scene = doc.createScene('CAD I4, motion-ready groups')
	// Blender exports Y-up. Restore original CAD X/Y/Z before converting to engine coordinates.
	const cad = new T.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, -0.225, 0, 1, 0, 0, 0, 0, 0, 1)
	const groups = new Map(),
		palette = {}
	const materials = {
		aluminum: [0.44, 0.47, 0.49, 1],
		iron: [0.16, 0.18, 0.19, 1],
		steel: [0.53, 0.56, 0.57, 1],
		rubber: [0.016, 0.021, 0.025, 1],
		plastic: [0.035, 0.053, 0.061, 1],
		bronze: [0.32, 0.23, 0.14, 1],
	}
	for (const [key, color] of Object.entries(materials))
		palette[key] = doc
			.createMaterial(key)
			.setBaseColorFactor(color)
			.setMetallicFactor(key === 'rubber' || key === 'plastic' ? 0 : 0.76)
			.setRoughnessFactor(key === 'steel' ? 0.26 : key === 'rubber' ? 0.79 : 0.48)
			.setDoubleSided(true)
	const metadata = []
	for (const n of oldNodes) {
		if (!n.getMesh()) continue
		const name = (ancestors(n).find((s) => /^\d{3}_/.test(s)) ?? n.getName()).replace(/\.\d{3}$/, '')
		if (!name) continue
		// Accurate cam profiles, helical valve springs and routed hoses are generated at runtime.
		if (/Overhead.camshaft|helical.valve.spring|Accessory.drive.tangent.belt/.test(name)) continue
		let kind = 'static',
			cylinder = 0,
			side = 0,
			pivot = [0, 0, 0],
			neutral = 0
		const cyl = /Connecting.rod.(\d)|Piston.ring.(\d)|Hollow.skirted.piston.(\d)|Piston.wrist.pin.(\d)/.exec(name)
		if (cyl) {
			cylinder = Number(cyl.slice(1).find(Boolean))
			const x = 0.144 - (cylinder - 1) * 0.096
			const phase = cylinder === 1 || cylinder === 4 ? Math.PI / 4 : (Math.PI * 5) / 4
			const y = 0.05 * Math.cos(phase),
				z = 0.05 * Math.sin(phase)
			if (/Connecting.rod/.test(name)) {
				kind = 'rod'
				pivot = [x, y, z]
				neutral = -Math.asin(z / 0.175)
			} else {
				kind = 'piston'
				pivot = [x, 0.175 * Math.cos(Math.asin(z / 0.175)) + y, 0]
			}
		}
		if (/Crankshaft.journals/.test(name)) {
			kind = 'crank'
			pivot = [0, 0, 0]
			neutral = Math.PI / 4
		}
		if (/Flywheel|Grooved.crank|Crank.pulley/.test(name)) {
			kind = 'crank'
			pivot = [0, 0, 0]
		}
		if (/Alternator.shaft|Alternator.belt-plane.pulley/.test(name)) {
			kind = 'alternator'
			pivot = [0, 0.115, -0.17]
		}
		const valve = /(Poppet.valve|Valve.spring.retainer|Valve.spring.lower.seat).(\d).(-?17).(-?1)$/.exec(name)
		if (valve) {
			kind = /lower.seat/.test(name) ? 'static' : 'valve'
			cylinder = Number(valve[2])
			side = Number(valve[4])
		}
		const cover = /valve.cover|Valve.cover|Oil.filler/.test(name)
		const head = /cylinder.head|head.sealing|Camshaft.bearing|Cam.bearing/.test(name)
		let mat = /Cylinder.block/.test(name)
			? 'iron'
			: /Piston|Crankshaft|Flywheel|piston|valve|bolt|fastener/i.test(name)
				? 'steel'
				: /belt|boot|filter/i.test(name)
					? 'rubber'
					: /cover|Intake.plenum|Throttle/i.test(name)
						? 'plastic'
						: 'aluminum'
		if (kind === 'rod') mat = 'steel'
		const matrix = new T.Matrix4()
			.makeRotationX(-neutral)
			.multiply(new T.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]))
			.multiply(cad)
			.multiply(new T.Matrix4().fromArray(n.getWorldMatrix()))
		const mesh = bake(doc, n.getMesh(), matrix)
		for (const p of mesh.listPrimitives()) p.setMaterial(palette[mat])
		let group = groups.get(name)
		if (!group) {
			group = doc
				.createNode(name)
				.setTranslation(pivot)
				.setExtras({kind, cylinder, side, bindOrigin: pivot, neutral, cover, head, material: mat})
			groups.set(name, group)
			scene.addChild(group)
			metadata.push({name, kind, cylinder, side, bindOrigin: pivot, neutral, cover, head})
		}
		group.addChild(doc.createNode(n.getName()).setMesh(mesh))
	}
	for (const n of oldNodes) n.dispose()
	for (const s of oldScenes) s.dispose()
	await doc.transform(prune(), dedup(), draco({quantizePosition: 15, quantizeNormal: 10}))
	await io.write(path.join(out, 'engine.glb'), doc)
	return metadata
}
const car = await body(),
	parts = await engine()
for (const type of ['draco/gltf', 'basis']) {
	const dest = path.join(out, 'decoders', type)
	fs.mkdirSync(dest, {recursive: true})
	for (const f of fs.readdirSync(path.join('node_modules/three/examples/jsm/libs', type)))
		fs.copyFileSync(path.join('node_modules/three/examples/jsm/libs', type, f), path.join(dest, f))
}
fs.copyFileSync('.local/car-assets/wooden-studio-15/wooden_studio_15_1k.hdr', path.join(out, 'studio.hdr'))
const manifest = {
	date: '2026-10-26',
	car,
	parts,
	files: Object.fromEntries(['car.glb', 'engine.glb', 'studio.hdr'].map((f) => [f, fs.statSync(path.join(out, f)).size])),
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(manifest.files)
