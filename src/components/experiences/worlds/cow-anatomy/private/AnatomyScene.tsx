import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { systems, type SystemId } from '../cow-data';
import { useExperienceI18n } from '~/i18n/experience';
// Muted atlas colours retain distinctions between organs and vessels.
const systemTones: Record<SystemId, string> = {
	surface: '#bda587',
	skeletal: '#ad9471',
	digestive: '#b47863',
	respiratory: '#bb8275',
	circulatory: '#a24f43',
	nervous: '#b4935f',
	urinary: '#ad8372',
};
const materialTones: Record<string, string> = {
	red: '#a35348',
	blue: '#718e8a',
	Tooth: '#d8c8aa',
	Cartilage: '#93a69a',
	hooves: '#786450',
	Tail: '#786450',
	nerves: '#baa16b',
	brain: '#c99a75',
	eye_black: '#554636',
	eyeball: '#d8cbb5',
	eye_iris: '#8f7054',
	trachea: '#c2ac8c',
	gallbladder: '#879775',
	liver: '#986453',
	spleen: '#a4776e',
	kidney: '#a16a58',
	bladder: '#c3a782',
};
function Model({ system, opacity }: { system: SystemId; opacity: number }) {
	const { viewport } = useThree();
	const { scene } = useGLTF('/assets/cow/bessie-anatomy.glb');
	const bounds = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
	}, [scene]);
	const { model, materials } = useMemo(() => {
		const model = scene.clone(true);
		model.position.sub(bounds.center);
		const materials: THREE.Material[] = [];
		const names = new Set<string>(systems.map((s) => s.node));
		const selected = systems.find((s) => s.id === system)!;
		model.children.forEach((c) => {
			c.visible = !names.has(c.name) || c.name === selected.node || c.name === 'body';
		});
		model.traverse((o) => {
			if (!(o instanceof THREE.Mesh)) return;
			let p: THREE.Object3D | null = o;
			let surface = false;
			while (p) {
				if (p.name === 'body') surface = true;
				p = p.parent;
			}
			const convert = (source: THREE.Material) => {
				const m = new THREE.MeshStandardMaterial({
					color: materialTones[source.name] ?? systemTones[system],
					roughness: 0.9,
					metalness: 0,
				});
				materials.push(m);
				m.side = THREE.DoubleSide;
				m.roughness = 0.82;
				m.metalness = 0;
				if (surface) {
					m.color = new THREE.Color(system === 'surface' ? (materialTones[source.name] ?? systemTones.surface) : '#927858');
					m.side = system === 'surface' ? THREE.FrontSide : THREE.BackSide;
					m.transparent = system !== 'surface';
					m.opacity = system === 'surface' ? 1 : opacity;
					m.depthWrite = system === 'surface';
				}
				return m;
			};
			o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
		});
		return { model, materials };
	}, [scene, bounds, system, opacity]);
	useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
	const scale = Math.min(viewport.width / bounds.size.x, viewport.height / bounds.size.y) * 0.84;
	return (
		<group scale={scale} rotation={[0, system === 'surface' ? -0.32 : -0.15, 0]}>
			<primitive object={model} dispose={null} />
			{system === 'surface' &&
				[-1, 1].map((side) => (
					<mesh
						key={side}
						position={[-65 - bounds.center.x, 27 - bounds.center.y, side * 7.7 - bounds.center.z]}
						scale={[1.05, 0.75, 0.28]}
					>
						<sphereGeometry args={[1, 24, 16]} />
						<meshStandardMaterial color="#44392c" roughness={0.5} />
					</mesh>
				))}
		</group>
	);
}
export default function AnatomyScene({
	system,
	opacity,
	reset,
	onInteract,
}: {
	system: SystemId;
	opacity: number;
	reset: number;
	onInteract: () => void;
}) {
	const tx = useExperienceI18n();
	return (
		<Canvas
			key={reset}
			camera={{ position: [0, 0, 9], fov: 39 }}
			dpr={[1, 1.7]}
			onPointerDown={onInteract}
			aria-label={tx('拖动旋转牛的解剖模型')}
		>
			<ambientLight intensity={1.3} />
			<directionalLight position={[3, 7, 8]} intensity={1.6} />
			<directionalLight position={[-4, 1, -5]} intensity={0.7} color="#f3dec0" />
			<Suspense
				fallback={
					<Html center style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#8c765e' }}>
						{tx('正在打开解剖模型…')}
					</Html>
				}
			>
				<Model system={system} opacity={opacity} />
			</Suspense>
			<OrbitControls makeDefault enablePan={false} minDistance={6} maxDistance={14} enableDamping={false} />
		</Canvas>
	);
}
