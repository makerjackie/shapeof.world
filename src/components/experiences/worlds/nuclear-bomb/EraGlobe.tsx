import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FeatureCollection } from 'geojson';
import { useExperienceI18n } from '~/i18n/experience';
import earthUrl from './earth-china.geojson?url';
import doe from './doe-events.json';
import { COUNTRY_COLORS, ERA_SITES } from './era-sites';

function xyz(lon: number, lat: number, r = 3.115) {
	const a = (lon * Math.PI) / 180,
		b = (lat * Math.PI) / 180;
	return new T.Vector3(Math.cos(b) * Math.cos(a) * r, Math.sin(b) * r, -Math.cos(b) * Math.sin(a) * r);
}

export function EraGlobe({
	year,
	active,
	onSite,
	onInteract,
}: {
	year: number;
	active: boolean;
	onSite: (id: string) => void;
	onInteract: () => void;
}) {
	const tx = useExperienceI18n(),
		host = useRef<HTMLDivElement>(null);
	const latest = useRef({ year, active, onSite, onInteract });
	latest.current = { year, active, onSite, onInteract };
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		if (!host.current) return;
		const el = host.current;
		let renderer: T.WebGLRenderer;
		try {
			renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
		} catch {
			setFailed(true);
			return;
		}
		renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
		renderer.outputColorSpace = T.SRGBColorSpace;
		renderer.toneMapping = T.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.95;
		el.appendChild(renderer.domElement);
		const scene = new T.Scene(),
			camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
		camera.position.set(-1.9, 4.7, -12.8);
		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.enablePan = false;
		orbit.minDistance = 8;
		orbit.maxDistance = 20;
		orbit.addEventListener('start', () => latest.current.onInteract());
		scene.add(new T.HemisphereLight('#f5faff', '#b0b8ba', 1.4));
		const key = new T.DirectionalLight('#fff9f0', 1.6);
		key.position.set(-5, 6, -8);
		scene.add(key);
		const globe = new T.Mesh(
			new T.SphereGeometry(3.1, 128, 80),
			new T.MeshStandardMaterial({ color: '#dce6e9', roughness: 0.6, metalness: 0 }),
		);
		scene.add(globe);
		const dots = new T.Group();
		scene.add(dots);
		const siteGeometry = new T.SphereGeometry(0.028, 12, 8);
		const siteMeshes = ERA_SITES.map((s) => {
			const mesh = new T.Mesh(siteGeometry, new T.MeshBasicMaterial({ color: COUNTRY_COLORS[s.country] }));
			mesh.position.copy(xyz(s.lon, s.lat, 3.13));
			mesh.userData.site = s.id;
			dots.add(mesh);
			return mesh;
		});
		const positions = new Float32Array(doe.events.length * 3);
		const points = new T.Points(
			new T.BufferGeometry(),
			new T.PointsMaterial({ color: '#587a90', size: 0.025, sizeAttenuation: true, transparent: true, opacity: 0.7 }),
		);
		scene.add(points);
		let dataYear = -1,
			disposed = false,
			frame = 0,
			texture: T.CanvasTexture | undefined;
		void fetch(earthUrl)
			.then((r) => r.json())
			.then((data) => {
				const geo = data as FeatureCollection;
				if (disposed) return;
				const cv = document.createElement('canvas');
				cv.width = 3072;
				cv.height = 1536;
				const ctx = cv.getContext('2d')!;
				ctx.fillStyle = '#dce6e9';
				ctx.fillRect(0, 0, cv.width, cv.height);
				for (const f of geo.features) {
					if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
					const polygons = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
					ctx.beginPath();
					for (const polygon of polygons)
						for (const ring of polygon) {
							ring.forEach((p, i) => {
								const x = ((p[0] + 180) / 360) * cv.width,
									y = ((90 - p[1]) / 180) * cv.height;
								i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
							});
							ctx.closePath();
						}
					ctx.fillStyle = f.properties?.ADM0_A3 === 'CHN' ? '#8eabbc' : '#aebfc8';
					ctx.fill('evenodd');
					ctx.strokeStyle = '#e9edef';
					ctx.lineWidth = 0.8;
					ctx.stroke();
				}
				ctx.strokeStyle = '#b4c5ce80';
				ctx.lineWidth = 0.7;
				for (let lon = -180; lon <= 180; lon += 30) {
					ctx.beginPath();
					ctx.moveTo(((lon + 180) / 360) * cv.width, 0);
					ctx.lineTo(((lon + 180) / 360) * cv.width, cv.height);
					ctx.stroke();
				}
				for (let lat = -60; lat <= 60; lat += 30) {
					ctx.beginPath();
					ctx.moveTo(0, ((90 - lat) / 180) * cv.height);
					ctx.lineTo(cv.width, ((90 - lat) / 180) * cv.height);
					ctx.stroke();
				}
				texture = new T.CanvasTexture(cv);
				texture.colorSpace = T.SRGBColorSpace;
				globe.material.map = texture;
				globe.material.color.set('#ffffff');
				globe.material.needsUpdate = true;
			})
			.catch(() => setFailed(true));
		const resize = () => {
			const w = el.clientWidth,
				h = el.clientHeight;
			if (!w || !h) return;
			renderer.setSize(w, h);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		const observer = new ResizeObserver(resize);
		observer.observe(el);
		resize();
		const ray = new T.Raycaster(),
			cursor = new T.Vector2();
		let down = [0, 0];
		const start = (e: PointerEvent) => {
			down = [e.clientX, e.clientY];
		};
		const click = (e: PointerEvent) => {
			if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
			const r = el.getBoundingClientRect();
			cursor.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
			ray.setFromCamera(cursor, camera);
			const hit = ray.intersectObjects(siteMeshes.filter((s) => s.visible))[0];
			if (hit && hit.distance < ray.intersectObject(globe)[0]?.distance + 0.06) latest.current.onSite(hit.object.userData.site);
		};
		renderer.domElement.addEventListener('pointerdown', start);
		renderer.domElement.addEventListener('pointerup', click);
		const render = () => {
			frame = requestAnimationFrame(render);
			if (!latest.current.active) return;
			const y = latest.current.year;
			if (dataYear !== y) {
				dataYear = y;
				siteMeshes.forEach((m, i) => {
					m.visible = ERA_SITES[i].start <= y;
					m.scale.setScalar(y <= ERA_SITES[i].end ? 1.8 : 0.8);
				});
				let count = 0;
				for (const e of doe.events) {
					if (Number(e.date.slice(0, 4)) > y || !e.coordinates) continue;
					xyz(e.coordinates[0], e.coordinates[1]).toArray(positions, count * 3);
					count++;
				}
				points.geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
				points.geometry.setDrawRange(0, count);
			}
			orbit.update();
			renderer.render(scene, camera);
		};
		render();
		return () => {
			disposed = true;
			cancelAnimationFrame(frame);
			observer.disconnect();
			orbit.dispose();
			texture?.dispose();
			scene.traverse((o) => {
				if (o instanceof T.Mesh || o instanceof T.Points) {
					o.geometry.dispose();
					const mats = Array.isArray(o.material) ? o.material : [o.material];
					mats.forEach((m) => m.dispose());
				}
			});
			renderer.dispose();
			renderer.domElement.remove();
		};
	}, []);
	return (
		<div className="na-globe" ref={host} aria-label={tx('可旋转的核试验地球仪')}>
			{failed && <p role="alert">{tx('地球暂时无法显示，年度数据仍可查看。')}</p>}
		</div>
	);
}
