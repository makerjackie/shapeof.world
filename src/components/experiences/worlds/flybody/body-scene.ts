import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { belongsToPart, separation } from './flybody-model';
import type { journeyAt } from './fly-journey';

/** Licensed mesh, shared with the measured neural atlas in one persistent scene. */
export function createBodyLayer(scene: THREE.Scene, ready: () => void, fail: (error: unknown) => void) {
	const root = new THREE.Group();
	scene.add(root);
	root.scale.setScalar(15);
	let disposed = false;
	let head: THREE.Object3D | undefined;
	const headPosition = new THREE.Vector3(),
		headCentre = new THREE.Vector3(),
		headQuaternion = new THREE.Quaternion();
	const restHead = new THREE.Quaternion();
	let brainScale = 0.15;
	const halves: Array<{ node: THREE.Mesh; sign: number }> = [];
	const moving: Array<{ node: THREE.Object3D; rest: THREE.Vector3; delta: THREE.Vector3 }> = [];
	const surfaces: Array<{ mesh: THREE.Mesh; material: THREE.MeshPhysicalMaterial; opacity: number; head: boolean }> = [];
	const disposeTree = (object: THREE.Object3D) =>
		object.traverse((node) => {
			if (node instanceof THREE.Mesh) {
				node.geometry.dispose();
				for (const m of Array.isArray(node.material) ? node.material : [node.material]) m.dispose();
			}
		});
	new GLTFLoader().load(
		'/assets/worlds/flybody/flybody-2b19f4083255.glb',
		(gltf) => {
			if (disposed) {
				disposeTree(gltf.scene);
				return;
			}
			const fly = gltf.scene;
			fly.position.sub(new THREE.Box3().setFromObject(fly).getCenter(new THREE.Vector3()));
			root.add(fly);
			fly.traverse((node) => {
				const delta = separation(node.name);
				if (delta.some(Boolean)) moving.push({ node, rest: node.position.clone(), delta: new THREE.Vector3(...delta) });
				if (node.name === 'head') {
					head = node;
					restHead.copy(node.quaternion);
				}
				if (!(node instanceof THREE.Mesh)) return;
				const oldGeometry = node.geometry;
				oldGeometry.deleteAttribute('normal');
				node.geometry = mergeVertices(oldGeometry, 0.000001);
				node.geometry.computeVertexNormals();
				oldGeometry.dispose();
				const original = node.material as THREE.MeshStandardMaterial;
				const eye = /red/.test(node.name);
				const wing = /wing/.test(node.name);
				const material = new THREE.MeshPhysicalMaterial({
					color: original.color,
					opacity: original.opacity,
					transparent: true,
					side: THREE.DoubleSide,
					roughness: eye ? 0.25 : wing ? 0.38 : 0.58,
					metalness: 0,
					clearcoat: eye ? 0.5 : 0.13,
					clearcoatRoughness: 0.3,
					depthWrite: original.opacity >= 1,
				});
				material.forceSinglePass = true;
				original.dispose();
				node.material = material;
				surfaces.push({ mesh: node, material, opacity: material.opacity, head: belongsToPart(node.name, 'head') });
			});
			root.updateWorldMatrix(true, true);
			if (!head) {
				fail(new Error('Fly head anchor missing'));
				return;
			}
			// Fit the atlas to the actual head shell's local bounds, not the neck joint.
			const shell = head.getObjectByName('mesh_head') as THREE.Mesh;
			const shellGeometry = shell.geometry.clone().applyMatrix4(shell.matrix);
			shellGeometry.computeBoundingBox();
			shellGeometry.boundingBox!.getCenter(headCentre);
			brainScale = (shellGeometry.boundingBox!.getSize(new THREE.Vector3()).x / 6.5) * 0.88;
			shellGeometry.dispose();
			// Split shell and compound eyes in head coordinates. This is an illustrative opening.
			for (const mesh of [...head.children]) {
				if (!(mesh instanceof THREE.Mesh) || !mesh.name.startsWith('mesh_head')) continue;
				const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
				geometry.applyMatrix4(mesh.matrix);
				const positions = geometry.getAttribute('position'),
					normals = geometry.getAttribute('normal');
				for (const sign of [-1, 1]) {
					const p: number[] = [],
						n: number[] = [];
					for (let i = 0; i < positions.count; i += 3) {
						const side = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3 >= headCentre.x ? 1 : -1;
						if (side !== sign) continue;
						for (let j = i; j < i + 3; j++) {
							p.push(positions.getX(j) - headCentre.x, positions.getY(j) - headCentre.y, positions.getZ(j) - headCentre.z);
							n.push(normals.getX(j), normals.getY(j), normals.getZ(j));
						}
					}
					const g = new THREE.BufferGeometry();
					g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
					g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
					const m = (mesh.material as THREE.MeshPhysicalMaterial).clone(),
						part = new THREE.Mesh(g, m);
					part.position.copy(headCentre);
					head.add(part);
					halves.push({ node: part, sign });
					surfaces.push({ mesh: part, material: m, opacity: m.opacity, head: true });
				}
				geometry.dispose();
				head.remove(mesh);
				mesh.geometry.dispose();
				(mesh.material as THREE.Material).dispose();
				const idx = surfaces.findIndex((s) => s.mesh === mesh);
				if (idx >= 0) surfaces.splice(idx, 1);
			}
			ready();
		},
		undefined,
		(error) => {
			if (!disposed) fail(error);
		},
	);
	return {
		root,
		update(pose: ReturnType<typeof journeyAt>, atlas = 0) {
			root.visible = atlas < 0.999 && pose.bodyOpacity > 0.001;
			for (const { node, rest, delta } of moving) node.position.copy(rest).addScaledVector(delta, pose.spread);
			if (head)
				head.quaternion
					.copy(restHead)
					.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (-pose.turn * Math.PI) / 2));
			for (const { node, sign } of halves) {
				node.position.copy(headCentre);
				node.position.x += sign * pose.open * 0.041;
				node.rotation.y = sign * pose.open * 0.35;
			}
			for (const { mesh, material, opacity, head: isHead } of surfaces) {
				const focusOpacity = isHead || mesh.name.includes('_T1_') ? 1 : 1 - pose.headFocus * 0.96;
				material.opacity = opacity * pose.bodyOpacity * focusOpacity * (1 - atlas);
				material.depthWrite = material.opacity > 0.95;
				material.roughness = (isHead ? 0.45 : 0.58) - pose.structure * 0.12;
				material.emissive.set(isHead ? '#3a1824' : '#17212b');
				material.emissiveIntensity = pose.structure * 0.2;
			}
			root.updateWorldMatrix(true, true);
			if (head) {
				headPosition.copy(headCentre);
				head.localToWorld(headPosition);
				head.getWorldQuaternion(headQuaternion);
			}
			return { position: headPosition, quaternion: headQuaternion, scale: brainScale * 15 };
		},
		dispose() {
			disposed = true;
			disposeTree(root);
			scene.remove(root);
		},
	};
}
