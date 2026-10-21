import * as THREE from 'three';
import { loadReplay, replayValue, replayFrame, emptyReplay, type ReplayMode, type ReplayStatus, type ReplayData } from './neural-replay';
import { createReplayBody } from './replay-scene';
import { createBodyLayer } from './body-scene';
import { JOURNEY_SECONDS, journeyAt, smooth, type JourneyPlayback } from './fly-journey';
import { isWorldPaused, subscribeWorldPlayback } from '~/lib/world-playback';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { decodeNeurons, traceConnections, type NeuralData, type NeuralMeta, type TraceEdge } from './neural-network';

export type NeuralState = {
	selected: number;
	blocked: number;
	trace: number;
	filter: number;
	reset: number;
	stimulus?: number;
	replaySeek?: number;
	seekVersion?: number;
	interrupted?: boolean;
	actionMode?: ReplayMode;
};
export function createNeuralScene(
	host: HTMLElement,
	read: () => NeuralState,
	select: (index: number) => void,
	ready: (data: NeuralData) => void,
	fail: (error: unknown) => void,
	interact: () => void,
	circuitUpdate: (state: ReplayStatus) => void,
	readJourney: () => JourneyPlayback = () => ({ seconds: JOURNEY_SECONDS, playing: false, story: false, autoRotate: false, reset: 0 }),
) {
	let disposed = false,
		frame = 0,
		dirty = true,
		data: NeuralData | undefined,
		previous: NeuralState | undefined;
	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	} catch (error) {
		fail(error);
		return () => {};
	}
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	host.appendChild(renderer.domElement);
	renderer.domElement.setAttribute('aria-hidden', 'true');
	const scene = new THREE.Scene(),
		camera = new THREE.PerspectiveCamera(38, 1, 0.01, 150);
	camera.up.set(0, 0, 1);
	camera.position.set(0, -16, 0);
	const orbit = new OrbitControls(camera, renderer.domElement);
	orbit.enablePan = false;
	orbit.minDistance = 3;
	orbit.maxDistance = 32;
	orbit.enableDamping = true;
	let userCamera = false;
	const takeCamera = () => {
		userCamera = true;
		interact();
	};
	orbit.addEventListener('start', takeCamera);
	const onChange = () => {
		dirty = true;
	};
	orbit.addEventListener('change', onChange);
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const uniforms = {
		cord: { value: 0 },
		replay: { value: 0 },
		worldScale: { value: 1 },
		opacity: { value: 0.28 },
		uFilter: { value: -1 },
		ratio: { value: renderer.getPixelRatio() },
	};
	const material = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		uniforms,
		vertexShader: `attribute vec3 tint; attribute float activity; attribute float category; uniform float replay; varying float glow; varying vec3 vColor; varying float visible; uniform float uFilter; uniform float ratio; uniform float cord; uniform float worldScale;
    void main(){glow=activity*replay; vColor=mix(tint,vec3(1.,.76,.36),min(1.,glow)); visible=(uFilter<0. || abs(category-uFilter)<.1)?1.:.055; visible*=position.z<1.5?cord:1.; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp((1.7+glow*3.)*ratio*16.*worldScale/(-p.z),.65,8.);}`,
		fragmentShader: `varying vec3 vColor; varying float visible; varying float glow; uniform float opacity;
    void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,(1.-smoothstep(.15,1.,d))*min(1.,opacity+glow*.8)*visible);}`,
	});
	let cloud: THREE.Points | undefined;
	let replayData: ReplayData | undefined;
	const activityById = new Map<number, number>();
	let activityAttribute: THREE.BufferAttribute | undefined;
	const neuralRoot = new THREE.Group();
	scene.add(neuralRoot);
	const routes = new THREE.Group();
	neuralRoot.add(routes);
	const replayBody = createReplayBody(
		scene,
		() => {
			replayBodyReady = true;
			whenReady();
		},
		fail,
	);

	let bodyReady = false,
		neuralReady = false,
		replayBodyReady = false;
	const whenReady = () => {
		if (bodyReady && neuralReady && replayBodyReady && replayData && data) ready(data);
	};
	const body = createBodyLayer(
		scene,
		() => {
			bodyReady = true;
			whenReady();
		},
		fail,
	);
	scene.add(new THREE.HemisphereLight('#e9e4db', '#2b1d17', 1.6));
	for (const [color, intensity, x, y, z] of [
		['#fff0d8', 3, 4, -5, 8],
		['#b9dfea', 2.5, -4, 4, 5],
		['#ed9567', 1.4, -4, -1, 0],
	] as const) {
		const l = new THREE.DirectionalLight(color, intensity);
		l.position.set(x, y, z);
		scene.add(l);
	}
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.92;
	let routeEdges: TraceEdge[] = [],
		pulsePoints: THREE.Points | undefined,
		pulseStart = 0;
	const position = (index: number) => new THREE.Vector3().fromArray(data!.positions, index * 3);
	const clearRoutes = () => {
		for (const child of [...routes.children]) {
			if (child instanceof THREE.LineSegments || child instanceof THREE.Points) {
				child.geometry.dispose();
				(child.material as THREE.Material).dispose();
			}
			routes.remove(child);
		}
		pulsePoints = undefined;
	};
	const rebuild = (s: NeuralState) => {
		if (!data) return;
		clearRoutes();
		routeEdges = traceConnections(data, s.selected, 3, s.blocked);
		const lines: number[] = [],
			colors: number[] = [];
		for (const e of routeEdges) {
			lines.push(...position(e.from).toArray(), ...position(e.to).toArray());
			const c = new THREE.Color(['#fcdb9d', '#f395ad', '#91daeb'][e.depth]);
			colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
		geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
		routes.add(
			new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthTest: false })),
		);
		const selectedGeo = new THREE.BufferGeometry().setFromPoints([position(s.selected)]);
		routes.add(new THREE.Points(selectedGeo, new THREE.PointsMaterial({ color: '#fff2b8', size: 0.1, depthTest: false })));
		if (s.blocked >= 0)
			routes.add(
				new THREE.Points(
					new THREE.BufferGeometry().setFromPoints([position(s.blocked)]),
					new THREE.PointsMaterial({ color: '#ff566e', size: 0.13, depthTest: false }),
				),
			);
		pulsePoints = new THREE.Points(
			new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(routeEdges.length * 3), 3)),
			new THREE.PointsMaterial({ color: '#fff7dd', size: 0.065, transparent: true, depthTest: false }),
		);
		pulsePoints.visible = false;
		routes.add(pulsePoints);
	};
	const controller = new AbortController();
	const load = async () => {
		const base = '/assets/worlds/flybody/neural/';
		const get = async (url: string) => {
			const r = await fetch(base + url, { signal: controller.signal });
			if (!r.ok) throw new Error(`MaleCNS asset HTTP ${r.status}`);
			return r;
		};
		const meta = (await (await get('manifest.json')).json()) as NeuralMeta;
		const [nodes, edges] = await Promise.all([get(meta.nodes).then((r) => r.arrayBuffer()), get(meta.edges).then((r) => r.arrayBuffer())]);
		if (disposed) return;
		data = decodeNeurons(meta, nodes, edges);
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
		const colors = new Float32Array(meta.count * 3),
			categories = new Float32Array(meta.count);
		const palette = ['#7bb6df', '#d1a9dd', '#ffb978', '#fb729f', '#9de4ce'];
		for (let i = 0; i < meta.count; i++) {
			new THREE.Color(palette[data.groups[i]]).toArray(colors, i * 3);
			categories[i] = data.groups[i];
		}
		geometry.setAttribute('tint', new THREE.BufferAttribute(colors, 3));
		geometry.setAttribute('category', new THREE.BufferAttribute(categories, 1));
		activityAttribute = new THREE.BufferAttribute(new Float32Array(meta.count), 1);
		geometry.setAttribute('activity', activityAttribute);
		for (let i = 0; i < meta.count; i++) activityById.set(data.ids[i], i);
		cloud = new THREE.Points(geometry, material);
		neuralRoot.add(cloud);
		neuralReady = true;
		whenReady();
		dirty = true;
	};
	loadReplay(controller.signal)
		.then((result) => {
			replayData = result;
			whenReady();
		})
		.catch((error) => {
			if (!disposed) fail(error);
		});
	load().catch((error) => {
		if (!disposed) fail(error);
	});
	let lastAspect = 0;
	const resetCamera = () => {
		userCamera = false;
		camera.position.set(0, -Math.max(15, 9 / camera.aspect), 0);
		orbit.target.set(0, 0, 0);
		orbit.update();
		dirty = true;
	};
	const resize = () => {
		const { width, height } = host.getBoundingClientRect();
		if (!width || !height) return;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
		if (Math.abs(lastAspect - camera.aspect) > 0.01) resetCamera();
		lastAspect = camera.aspect;
		dirty = true;
	};
	const observer = new ResizeObserver(resize);
	observer.observe(host);
	resize();
	const ray = new THREE.Raycaster();
	ray.params.Points.threshold = 0.035;
	let down = { x: 0, y: 0 };
	const pointerDown = (event: PointerEvent) => {
		down = { x: event.clientX, y: event.clientY };
	};
	const pointerUp = (event: PointerEvent) => {
		if (!readJourney().atlas || !data || !cloud || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
		const rect = host.getBoundingClientRect();
		ray.setFromCamera(
			new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, (-(event.clientY - rect.top) / rect.height) * 2 + 1),
			camera,
		);
		const hit = ray
			.intersectObject(cloud)
			.find((h) => h.index !== undefined && (read().filter < 0 || data!.groups[h.index] === read().filter));
		if (hit?.index !== undefined) {
			interact();
			select(hit.index);
		}
	};
	renderer.domElement.addEventListener('pointerdown', pointerDown);
	renderer.domElement.addEventListener('pointerup', pointerUp);
	const onLost = (event: Event) => {
		event.preventDefault();
		fail(new Error('WebGL context lost'));
	};
	renderer.domElement.addEventListener('webglcontextlost', onLost);

	const bodyRotation = new THREE.Quaternion();
	const identity = new THREE.Quaternion();
	const brainCentre = new THREE.Vector3(0, 0, 3.05);
	const anchor = new THREE.Vector3(),
		offset = new THREE.Vector3(),
		atlasCamera = new THREE.Vector3();
	let atlas = 0,
		replayTime = 0,
		lastCircuitUi = 0,
		lastStimulus = 0,
		lastCircuitReset = -1;
	let replayMode: ReplayMode = 'walk';
	let lastSeek = -1;
	let lastRenderedReplay = -1;

	let lastSeconds = -1,
		lastReset = -1,
		lastFrame = performance.now(),
		drift = 0;
	const rebase = () => {
		lastFrame = performance.now();
	};
	const unsubscribe = subscribeWorldPlayback({ onResume: rebase });
	document.addEventListener('visibilitychange', rebase);
	const render = (now: number) => {
		frame = requestAnimationFrame(render);

		const dt = Math.min((now - lastFrame) / 1000, 0.5);
		lastFrame = now;
		if (document.hidden || isWorldPaused()) return;
		const journey = readJourney(),
			pose = journeyAt(journey.seconds);
		if (journey.reset !== lastReset || Math.abs(journey.seconds - lastSeconds) > 0.0001) {
			userCamera = false;
			dirty = true;
		}
		lastReset = journey.reset;
		lastSeconds = journey.seconds;
		const input = read();
		const mode = input.actionMode ?? 'walk';
		if (input.reset !== lastCircuitReset || (input.stimulus ?? 0) !== lastStimulus || mode !== replayMode || journey.seconds < 16)
			replayTime = 0;
		lastCircuitReset = input.reset;
		lastStimulus = input.stimulus ?? 0;
		replayMode = mode;
		const targetAtlas = journey.atlas ? 1 : 0;
		atlas = reduced.matches ? targetAtlas : THREE.MathUtils.damp(atlas, targetAtlas, 5, dt);
		if (Math.abs(atlas - targetAtlas) < 0.001) atlas = targetAtlas;
		const track = replayData?.tracks[mode];
		if (input.seekVersion !== undefined && input.seekVersion !== lastSeek) {
			replayTime = Math.max(0, Math.min(2.49, input.replaySeek ?? 0));
			lastSeek = input.seekVersion;
		}
		if (track && journey.seconds >= 18 && !journey.atlas && !input.interrupted && (!journey.story || journey.playing))
			replayTime = Math.min((track.count - 1) * track.dt, replayTime + dt * 0.25);
		if (track && now - lastCircuitUi > 100) {
			circuitUpdate({
				...emptyReplay(),
				time: replayTime,
				mode,
				duration: (track.count - 1) * track.dt,
				channels: Array.from({ length: 6 }, (_, i) => replayValue(track, replayTime, i)),
				speed: replayValue(track, replayTime, 6),
			});
			lastCircuitUi = now;
		}
		if (activityAttribute && track) {
			const values = activityAttribute.array as Float32Array;
			values.fill(0);
			const { a } = replayFrame(track, replayTime);
			for (let f = Math.max(0, a - 7); f <= a; f++)
				for (let e = track.offsets[f]; e < track.offsets[f + 1]; e++) {
					const i = activityById.get(track.activity[e * 2]);
					if (i === undefined) continue;
					values[i] = Math.min(1, values[i] + track.activity[e * 2 + 1] * Math.exp(-(replayTime - f * track.dt) / 0.025) * 0.5);
				}
			activityAttribute.needsUpdate = true;
		}
		if (replayTime !== lastRenderedReplay) {
			dirty = true;
			lastRenderedReplay = replayTime;
		}
		const wide = camera.aspect > 1.15;
		replayBody.update(replayData, track, replayTime, pose.action * (1 - atlas), wide);

		const headFrame = body.update(pose, atlas),
			head = headFrame.position;
		neuralRoot.visible = pose.brainOpacity > 0.001;
		const isolated = pose.isolate;
		const lift = pose.action * (wide ? 0.35 : 2.5);
		neuralRoot.scale.setScalar(THREE.MathUtils.lerp(headFrame.scale, 1, isolated));
		bodyRotation.copy(headFrame.quaternion);
		neuralRoot.quaternion.copy(bodyRotation).slerp(identity, isolated);
		anchor.copy(brainCentre).multiplyScalar(neuralRoot.scale.x).applyQuaternion(neuralRoot.quaternion);
		neuralRoot.position
			.copy(head)
			.multiplyScalar(1 - isolated)
			.add(new THREE.Vector3(wide ? -3.3 * pose.action * (1 - atlas) : 0, 0, lift * (1 - atlas)))
			.sub(anchor.multiplyScalar(1 - atlas));

		uniforms.opacity.value = (0.25 - isolated * 0.07) * pose.brainOpacity;
		uniforms.worldScale.value = neuralRoot.scale.x;
		uniforms.cord.value = atlas;
		routes.visible = atlas > 0.98;
		uniforms.replay.value = pose.action * (1 - atlas);

		if (journey.story && journey.autoRotate && !userCamera) drift = journey.seconds;
		if (
			!journey.story &&
			journey.autoRotate &&
			!reduced.matches &&
			!userCamera &&
			!(pose.action > 0 && input.interrupted) &&
			(journey.playing || !journey.story)
		)
			// Match the fixed image projection until the material dissolve completes.
			drift += dt;
		if (!userCamera) {
			const sway = reduced.matches ? 0 : Math.sin((drift - 3.3) * 0.26) * 0.16 * smooth(3.3, 5, drift);
			const framing = Math.max(1, 0.94 / camera.aspect);
			anchor.copy(head).multiplyScalar(pose.headFocus);
			offset
				.set(8, -11, 6)
				.multiplyScalar(framing)
				.lerp(new THREE.Vector3(2.8 * (1 - pose.turn), -4.1, 1).multiplyScalar(Math.max(1, 1.2 / camera.aspect)), pose.headFocus);
			offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), sway);
			camera.position.copy(anchor).add(offset);
			atlasCamera.set(Math.sin(sway) * 15, -Math.cos(sway) * Math.max(15, 9 / camera.aspect), Math.sin(sway * 0.7) * 1.2);
			const distance = Math.max(14, 11 / camera.aspect);
			const isolatedCamera = new THREE.Vector3(Math.sin(sway) * distance, -Math.cos(sway) * distance, 0.4 * pose.action);
			camera.position.lerp(isolatedCamera, isolated).lerp(atlasCamera, atlas);
			orbit.target
				.copy(anchor)
				.multiplyScalar(1 - isolated)
				.add(new THREE.Vector3(0, 0, 0.4 * pose.action * (1 - atlas)));
			camera.lookAt(orbit.target);
			dirty = true;
		}
		const s = read();
		orbit.enableDamping = !reduced.matches;
		orbit.update();
		if (data && s !== previous) {
			if (!previous || s.selected !== previous.selected || s.blocked !== previous.blocked) rebuild(s);
			if (previous && s.reset !== previous.reset) userCamera = false;
			if (previous && s.trace !== previous.trace) pulseStart = now;
			uniforms.uFilter.value = s.filter;
			previous = s;
			dirty = true;
		}
		const elapsed = (now - pulseStart) / 1000,
			animating = pulseStart > 0 && elapsed < 3.5 && !reduced.matches;
		if (pulsePoints) {
			pulsePoints.visible = animating;
			if (animating) {
				const attr = pulsePoints.geometry.getAttribute('position');
				routeEdges.forEach((e, i) => {
					const t = elapsed - e.depth * 0.85;
					const p = t >= 0 && t <= 0.85 ? position(e.from).lerp(position(e.to), t / 0.85) : new THREE.Vector3(1000, 1000, 1000);
					attr.setXYZ(i, p.x, p.y, p.z);
				});
				attr.needsUpdate = true;
				dirty = true;
			} else if (pulseStart > 0) {
				pulseStart = 0;
				dirty = true;
			}
		}
		if (dirty) {
			renderer.render(scene, camera);
			dirty = false;
		}
	};
	frame = requestAnimationFrame(render);
	return () => {
		disposed = true;
		controller.abort();
		unsubscribe();
		document.removeEventListener('visibilitychange', rebase);
		cancelAnimationFrame(frame);
		observer.disconnect();
		orbit.removeEventListener('start', takeCamera);
		body.dispose();
		orbit.removeEventListener('change', onChange);
		orbit.dispose();
		renderer.domElement.removeEventListener('pointerdown', pointerDown);
		renderer.domElement.removeEventListener('pointerup', pointerUp);
		renderer.domElement.removeEventListener('webglcontextlost', onLost);
		clearRoutes();
		replayBody.dispose();

		cloud?.geometry.dispose();
		material.dispose();
		renderer.dispose();
		renderer.domElement.remove();
	};
}
