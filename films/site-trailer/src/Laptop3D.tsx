import React, { Suspense, useLayoutEffect, useMemo, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { ContactShadows, Environment, RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MONO } from "./theme";

// A generic laptop modelled from primitives (no brand, no downloaded model): an aluminium base with a recessed
// keyboard and trackpad, a hinge, and a lid with a black glass bezel. Lit by a Poly Haven studio HDRI (CC0) plus a
// warm key and a cool rim, standing on a dark floor with a contact shadow. The screen itself is not a texture: the
// page (browser bar + 16:9 page area) is a DOM layer warped onto the screen's projected corners with a CSS
// homography, so videos stay sharp and the page can fill the 1920×1080 frame exactly when the camera is square on.
// Units: 1 = 10 cm.
export const W = 1920;
export const H = 1080;
const BAR_PX = 74; // browser bar height in page pixels
const FOV = 30; // vertical, degrees

const BASE = { w: 3.1, d: 2.15, h: 0.14 };
const LID = { w: 3.1, h: 2.08, t: 0.07, tilt: (14 * Math.PI) / 180 };
const HINGE = new THREE.Vector3(0, BASE.h, -BASE.d / 2 + 0.04);
const DW = 2.86; // display width
const DH = (DW * (H + BAR_PX)) / W; // display height (bar + page)
const DY = LID.h - 0.1 - DH / 2; // display centre, lid space

// Lid space → world.
const lidMatrix = new THREE.Matrix4().compose(HINGE, new THREE.Quaternion().setFromEuler(new THREE.Euler(-LID.tilt, 0, 0)), new THREE.Vector3(1, 1, 1));
const lidPoint = (x: number, y: number) => new THREE.Vector3(x, y, 0.004).applyMatrix4(lidMatrix);
const DISPLAY = [lidPoint(-DW / 2, DY + DH / 2), lidPoint(DW / 2, DY + DH / 2), lidPoint(DW / 2, DY - DH / 2), lidPoint(-DW / 2, DY - DH / 2)];
const PAGE_H = (DW * H) / W;
const PAGE_CENTRE = lidPoint(0, DY - DH / 2 + PAGE_H / 2);
const NORMAL = new THREE.Vector3(0, 0, 1).transformDirection(lidMatrix);
const LID_UP = new THREE.Vector3(0, 1, 0).transformDirection(lidMatrix);

export type Pose = { pos: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3 };
// Square on to the page, at the distance where its 16:9 area exactly fills the frame.
const FULL_D = PAGE_H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
export const fullPose = (): Pose => ({ pos: PAGE_CENTRE.clone().addScaledVector(NORMAL, FULL_D), target: PAGE_CENTRE.clone(), up: LID_UP.clone() });
// In front of the screen, k times the full-frame distance, moved by (dx, dy) in world units and aimed `aim` below
// the page centre (so a raised camera looks down across the keyboard).
export const screenPose = (k: number, dx = 0, dy = 0, aim = 0): Pose => {
  const p = fullPose();
  p.pos = PAGE_CENTRE.clone().addScaledVector(NORMAL, FULL_D * k).add(new THREE.Vector3(dx, dy, 0));
  p.target.add(new THREE.Vector3(dx * 0.2, -aim, 0));
  p.up = new THREE.Vector3(0, 1, 0);
  return p;
};
// A three-quarter view from distance r at azimuth az (degrees, negative = from the left), looking at `look`.
export const orbitPose = (look: THREE.Vector3, az: number, r: number, h: number): Pose => {
  const a = (az * Math.PI) / 180;
  return { pos: look.clone().add(new THREE.Vector3(Math.sin(a) * r, h, Math.cos(a) * r)), target: look.clone(), up: new THREE.Vector3(0, 1, 0) };
};
export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  pos: a.pos.clone().lerp(b.pos, t),
  target: a.target.clone().lerp(b.target, t),
  up: a.up.clone().lerp(b.up, t).normalize(),
});

const cameraFor = (pose: Pose) => {
  const c = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 200);
  c.position.copy(pose.pos);
  c.up.copy(pose.up);
  c.lookAt(pose.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
};

// CSS matrix3d that maps the w×h page rectangle onto the quad q (TL, TR, BR, BL) in frame pixels (Heckbert).
const homography = (q: [number, number][], w: number, h: number) => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3, f = y0;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(9)).join(",")})`;
};

const Rig: React.FC<{ pose: Pose }> = ({ pose }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = FOV;
    camera.near = 0.05;
    camera.far = 200;
    camera.position.copy(pose.pos);
    camera.up.copy(pose.up);
    camera.lookAt(pose.target);
    camera.updateProjectionMatrix();
  }, [camera, pose]);
  return null;
};

// Holds the Remotion frame while the HDRI loads.
const Loading: React.FC = () => {
  const [handle] = useState(() => delayRender("laptop environment"));
  useLayoutEffect(() => () => continueRender(handle), [handle]);
  return null;
};

const KEY_COLS = 14;
const Keyboard: React.FC = () => {
  const keys = useMemo(() => {
    const out: { x: number; z: number; w: number }[] = [];
    const pitch = 0.196, size = 0.168;
    for (let r = 0; r < 5; r++) for (let c = 0; c < KEY_COLS; c++) out.push({ x: (c - (KEY_COLS - 1) / 2) * pitch, z: -0.9 + r * pitch, w: size });
    // bottom row: modifiers either side of a long space bar
    const z = -0.9 + 5 * pitch;
    for (const c of [0, 1, 2, 11, 12, 13]) out.push({ x: (c - (KEY_COLS - 1) / 2) * pitch, z, w: size });
    out.push({ x: 0, z, w: pitch * 7 + size });
    return out;
  }, []);
  return (
    <group position={[0, BASE.h, 0]}>
      <mesh position={[0, 0.0008, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.86, 1.26]} />
        <meshStandardMaterial color="#1c1d21" roughness={0.65} metalness={0.3} />
      </mesh>
      {keys.map((k, i) => (
        <RoundedBox key={i} args={[k.w, 0.02, 0.168]} radius={0.01} smoothness={2} position={[k.x, 0.008, k.z]}>
          <meshStandardMaterial color="#232428" roughness={0.45} />
        </RoundedBox>
      ))}
      <RoundedBox args={[1.12, 0.006, 0.7]} radius={0.003} smoothness={2} position={[0, 0.001, 0.6]}>
        <meshPhysicalMaterial color="#62666d" metalness={0.85} roughness={0.22} clearcoat={0.4} />
      </RoundedBox>
    </group>
  );
};

const Model: React.FC = () => {
  const alu = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#9a9ea6", metalness: 0.72, roughness: 0.36, clearcoat: 0.15, clearcoatRoughness: 0.4 }), []);
  return (
    <group>
      <RoundedBox args={[BASE.w, BASE.h, BASE.d]} radius={0.06} smoothness={5} position={[0, BASE.h / 2, 0]} material={alu} />
      <Keyboard />
      <mesh position={[0, HINGE.y, HINGE.z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, 2.5, 32]} />
        <meshStandardMaterial color="#1b1c1f" metalness={0.6} roughness={0.4} />
      </mesh>
      <group position={HINGE} rotation={[-LID.tilt, 0, 0]}>
        <RoundedBox args={[LID.w, LID.h, LID.t]} radius={0.05} smoothness={5} position={[0, LID.h / 2, -LID.t / 2 - 0.004]} material={alu} />
        {/* black glass over the whole front of the lid */}
        <RoundedBox args={[LID.w - 0.06, LID.h - 0.06, 0.006]} radius={0.04} smoothness={4} position={[0, LID.h / 2, 0]}>
          <meshPhysicalMaterial color="#050506" roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.05} />
        </RoundedBox>
        <mesh position={[0, LID.h - 0.05, 0.004]}>
          <circleGeometry args={[0.012, 24]} />
          <meshStandardMaterial color="#0a0b0d" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

export const Laptop3D: React.FC<{ pose: Pose; glare?: number; children: React.ReactNode }> = ({ pose, glare = 1, children }) => {
  const cam = cameraFor(pose);
  const quad = DISPLAY.map((p) => {
    const v = p.clone().project(cam);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H] as [number, number];
  });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#07080b", overflow: "hidden" }}>
      <ThreeCanvas width={W} height={H} camera={{ fov: FOV, near: 0.05, far: 200, position: [0, 2, 8] }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}>
        <Rig pose={pose} />
        <color attach="background" args={["#07080b"]} />
        <fog attach="fog" args={["#07080b", 9, 26]} />
        <Suspense fallback={<Loading />}>
          <Environment files={staticFile("hdri/studio_small_08_1k.hdr")} environmentIntensity={0.9} />
        </Suspense>
        <directionalLight position={[-4, 6, 5]} intensity={6.5} color="#ffcf9e" />
        <pointLight position={[-1.5, 3.2, 3.2]} intensity={6} distance={9} decay={1.6} color="#ffd9b0" />
        <directionalLight position={[5, 3.5, -4]} intensity={1.8} color="#a9bfff" />
        <ambientLight intensity={0.16} />
        <Model />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.55} metalness={0.1} />
        </mesh>
        <ContactShadows position={[0, 0.002, 0]} scale={10} blur={2.6} far={3} opacity={0.8} resolution={1024} frames={1} />
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H + BAR_PX, transformOrigin: "0 0", transform: homography(quad, W, H + BAR_PX), overflow: "hidden", background: "#000" }}>
        <Browser />
        <div style={{ position: "absolute", left: 0, top: BAR_PX, width: W, height: H, overflow: "hidden" }}>{children}</div>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: glare, background: "linear-gradient(118deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 30%, transparent 44%)" }} />
      </div>
    </div>
  );
};

const Browser: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, width: W, height: BAR_PX, background: "linear-gradient(#202227, #1a1c20)", borderBottom: "2px solid rgba(255,255,255,0.06)" }}>
    <div style={{ position: "absolute", left: 32, top: 28, display: "flex", gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: "#3b3e44" }} />
      ))}
    </div>
    <div style={{ position: "absolute", left: W / 2 - 370, top: 15, width: 740, height: 44, borderRadius: 22, background: "#111215", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <svg width="16" height="20" viewBox="0 0 9 11">
        <rect x="0.5" y="4.5" width="8" height="6" rx="1.2" fill="#8a8a85" />
        <path d="M2.2 4.6 V3.2 a2.3 2.3 0 0 1 4.6 0 V4.6" stroke="#8a8a85" strokeWidth="1.2" fill="none" />
      </svg>
      <span style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 1, color: "#cfcfca" }}>shapeof.world</span>
    </div>
  </div>
);

export const LAPTOP_CENTRE = new THREE.Vector3(0, 0.9, -0.3);
