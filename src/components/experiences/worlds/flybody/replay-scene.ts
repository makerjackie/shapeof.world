import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { replayFrame, replayValue, type ReplayData, type ReplayTrack } from './neural-replay';

/** Exact upstream IK segment transforms, quaternion-interpolated for display. */
export function createReplayBody(scene: THREE.Scene, ready: () => void, fail: (error: unknown) => void) {
	const root = new THREE.Group(),
		fly = new THREE.Group();
	root.add(fly);
	scene.add(root);
	root.visible = false;
	const meshes = new Map<string, THREE.Object3D>();
	let disposed = false;
	const resources: THREE.Mesh[] = [];
	new GLTFLoader().load(
		'/assets/worlds/flybody/replay/v1/body.glb',
		(g) => {
			if (disposed) {
				g.scene.traverse((n) => {
					if (n instanceof THREE.Mesh) {
						n.geometry.dispose();
						(n.material as THREE.Material).dispose();
					}
				});
				return;
			}
			fly.add(g.scene);
			g.scene.traverse((n) => {
				meshes.set(n.name, n);
				if (n instanceof THREE.Mesh) resources.push(n);
			});
			ready();
		},
		undefined,
		(error) => {
			if (!disposed) fail(error);
		},
	);
	const floor = new THREE.GridHelper(7, 20, '#806d83', '#45364b');
	floor.rotation.x = Math.PI / 2;
	floor.position.z = -0.04;
	(floor.material as THREE.Material).transparent = true;
	root.add(floor);
	const ma = new THREE.Matrix4(),
		mb = new THREE.Matrix4(),
		pa = new THREE.Vector3(),
		pb = new THREE.Vector3(),
		qa = new THREE.Quaternion(),
		qb = new THREE.Quaternion(),
		scale = new THREE.Vector3();
	function readMatrix(target: THREE.Matrix4, array: Float32Array, offset: number) {
		target.fromArray(array, offset).transpose();
	}
	return {
		update(data: ReplayData | undefined, track: ReplayTrack | undefined, time: number, amount: number, wide: boolean) {
			root.visible = amount > 0.001 && !!data && !!track;
			if (!data || !track) return;
			root.position.set(wide ? 3.6 : 0, 0, wide ? -1.1 : -2.5);
			root.scale.setScalar(wide ? 1.65 : 1.45);
			fly.rotation.set(0.08, -0.06, -0.4 + replayValue(track, time, 8), 'ZYX');
			const { a, b, mix } = replayFrame(track, time);
			data.segments.forEach((name, i) => {
				const mesh = meshes.get(name);
				if (!mesh) return;
				readMatrix(ma, track.poses, (a * data.segments.length + i) * 16);
				readMatrix(mb, track.poses, (b * data.segments.length + i) * 16);
				ma.decompose(pa, qa, scale);
				mb.decompose(pb, qb, scale);
				mesh.position.copy(pa).lerp(pb, mix);
				mesh.quaternion.copy(qa).slerp(qb, mix);
			});
			for (const m of resources) {
				const mat = m.material as THREE.MeshStandardMaterial;
				mat.transparent = true;
				mat.opacity = amount * (m.name.includes('wing') ? 0.3 : 1);
				mat.depthWrite = mat.opacity > 0.95;
			}
			(floor.material as THREE.Material).opacity = amount * 0.22;
			floor.position.x = -(replayValue(track, time, 10) % 0.35);
		},
		dispose() {
			disposed = true;
			for (const m of resources) {
				m.geometry.dispose();
				(m.material as THREE.Material).dispose();
			}
			floor.geometry.dispose();
			(floor.material as THREE.Material).dispose();
			scene.remove(root);
		},
	};
}
