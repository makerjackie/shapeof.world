import { useEffect, useMemo, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FeatureCollection } from 'geojson';
import { useExperienceI18n } from '~/i18n/experience';
import earthUrl from './earth-china.geojson?url';
import doe from './doe-events.json';
import { COUNTRY_COLORS, ERA_SITES } from './era-sites';
import { activityFocus, markerRadius, siteActivity } from './era-activity';
import { useI18n } from '~/i18n';

function xyz(lon: number, lat: number, r = 3.115) {
	const a = (lon * Math.PI) / 180,
		b = (lat * Math.PI) / 180;
	return new T.Vector3(Math.cos(b) * Math.cos(a) * r, Math.sin(b) * r, -Math.cos(b) * Math.sin(a) * r);
}

export function EraGlobe({
	year,
	active,
	playing,
	onSite,
	onInteract,
}: {
	year: number;
	active: boolean;
	playing: boolean;
	onSite: (id: string) => void;
	onInteract: () => void;
}) {
	const tx = useExperienceI18n(),
		{ locale } = useI18n(),
		host = useRef<HTMLDivElement>(null);
	const activity = useMemo(() => siteActivity(year), [year]);
	const latest = useRef({ year, active, playing, activity, onSite, onInteract });
	latest.current = { year, active, playing, activity, onSite, onInteract };
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
		let dragging = false,
			follow = true;
		orbit.addEventListener('start', () => {
			dragging = true;
			follow = false;
			latest.current.onInteract();
		});
		orbit.addEventListener('end', () => {
			dragging = false;
		});
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
		const siteGeometry = new T.SphereGeometry(1, 20, 12);
		const siteMeshes = ERA_SITES.map((s) => {
			const mesh = new T.Mesh(siteGeometry, new T.MeshBasicMaterial({ color: COUNTRY_COLORS[s.country], transparent: true }));
			mesh.position.copy(xyz(s.lon, s.lat, 3.14));
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
		let focus: ReturnType<typeof activityFocus> = null,
			changedAt = 0,
			lastTime = 0,
			wasPlaying = false;
		const desired = new T.Vector3(),
			projected = new T.Vector3();
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
		const render = (now = performance.now()) => {
			frame = requestAnimationFrame(render);
			if (!latest.current.active) return;
			const delta = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
			lastTime = now;
			if (latest.current.playing && !wasPlaying) follow = true;
			wasPlaying = latest.current.playing;
			const y = latest.current.year;
			if (dataYear !== y) {
				dataYear = y;
				changedAt = now;
				focus = activityFocus(y) ?? focus;
				if (!dragging) follow = true;
				let count = 0;
				for (const e of doe.events) {
					if (Number(e.date.slice(0, 4)) > y || !e.coordinates) continue;
					xyz(e.coordinates[0], e.coordinates[1]).toArray(positions, count * 3);
					count++;
				}
				points.geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
				points.geometry.setDrawRange(0, count);
			}
			if (follow && !dragging && focus) {
				desired.copy(xyz(focus.lon, focus.lat, camera.position.length()));
				if (reducedMotion) camera.position.copy(desired);
				else camera.position.lerp(desired, 1 - Math.exp(-delta * 2.4)).setLength(desired.length());
			}
			orbit.update();
			const elapsed = now - changedAt;
			const pulse = reducedMotion || elapsed > 1100 ? 1 : 1 + 0.18 * Math.sin((Math.PI * elapsed) / 1100);
			const labels: Array<{ element: HTMLElement; x: number; y: number }> = [];
			siteMeshes.forEach((mesh, i) => {
				const s = latest.current.activity[i];
				mesh.visible = s.start <= y;
				mesh.scale.setScalar(markerRadius(s.annual) * ((s.annual ?? 0) > 0 ? pulse : 1));
				mesh.material.color.set(COUNTRY_COLORS[s.countCountry]);
				mesh.material.opacity = (s.annual ?? 0) > 0 ? 1 : 0.55;
				const label = el.querySelector<HTMLElement>(`[data-site-label="${s.id}"]`);
				if (!label) return;
				projected.copy(mesh.position).project(camera);
				const visible = mesh.position.dot(camera.position) > mesh.position.lengthSq();
				label.style.visibility = visible ? 'visible' : 'hidden';
				if (visible)
					labels.push({ element: label, x: ((projected.x + 1) * el.clientWidth) / 2, y: ((1 - projected.y) * el.clientHeight) / 2 + 12 });
			});
			let lastBottom = -Infinity;
			for (const label of labels.sort((a, b) => a.y - b.y)) {
				const y = el.clientWidth < 500 ? Math.max(label.y, lastBottom + 4) : label.y;
				label.element.style.transform = `translate(${label.x}px, ${y}px) translateX(-50%)`;
				lastBottom = y + label.element.offsetHeight;
			}
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
			{activity
				.filter((s) => (s.annual ?? 0) > 0)
				.map((s) => (
					<button key={s.id} className="na-site-label" data-site-label={s.id} onClick={() => onSite(s.id)}>
						{locale === 'en' ? s.en : s.zh}
						<b>{s.annual}</b>
					</button>
				))}
			{failed && <p role="alert">{tx('地球暂时无法显示，年度数据仍可查看。')}</p>}
		</div>
	);
}
