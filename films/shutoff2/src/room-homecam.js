// The little home security camera on 林工's bookshelf: the white pan-tilt kind every Chinese home has. A round base,
// a short neck, a round head with a glossy black faceplate, the lens with its ring, a cold status LED, and a catch-light
// on the lens glass. pan/tilt in radians; local −Z is where the lens looks at pan = tilt = 0.
import * as THREE from 'three';
import { toonMaterial } from './materials.js';

export function makeHomeCam() {
  const root = new THREE.Group();
  const white = toonMaterial({ color: '#eceef1', id: 84, spec: 0.7, rim: 0.45 });
  const white2 = toonMaterial({ color: '#dfe2e7', id: 85, spec: 0.5, rim: 0.3 });
  const black = toonMaterial({ color: '#0d0f15', id: 86, spec: 1 });
  const lensM = toonMaterial({ color: '#040509', id: 87, spec: 1 });
  const ringM = toonMaterial({ color: '#5c6274', id: 88, spec: 1 });
  // base: a soft puck with a groove
  const prof = [[0, 0], [0.034, 0], [0.037, 0.003], [0.038, 0.009], [0.036, 0.013], [0.03, 0.016], [0.018, 0.018], [0, 0.018]].map(([x, y]) => new THREE.Vector2(x, y));
  root.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), white2));
  const groove = new THREE.Mesh(new THREE.TorusGeometry(0.0375, 0.0012, 6, 40).rotateX(Math.PI / 2), black); groove.position.y = 0.0075; root.add(groove);
  // pan stage → neck → tilt stage → head
  const pan = new THREE.Group(); pan.position.y = 0.018; root.add(pan);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.019, 0.022, 24), white2); neck.position.y = 0.011; pan.add(neck);
  const tilt = new THREE.Group(); tilt.position.y = 0.052; pan.add(tilt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.041, 40, 28), white); tilt.add(head);
  // seam around the head's equator, and the faceplate on the front (−Z)
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.0412, 0.0008, 6, 48).rotateX(Math.PI / 2), black); tilt.add(seam);
  const plate = new THREE.Mesh(new THREE.SphereGeometry(0.0414, 40, 20, 0, Math.PI * 2, 0, 0.72).rotateX(-Math.PI / 2), black); tilt.add(plate);
  // lens: a ring and a dark glass dome, slightly proud of the faceplate
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0022, 12, 36), ringM); ring.position.z = -0.0405; tilt.add(ring);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.0098, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 0.45), lensM); glass.position.z = -0.0405; tilt.add(glass);
  // status LED (cold) and a small IR sensor dot
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.0021, 14), toonMaterial({ color: '#000', id: 124, unlit: true, emissive: '#8fdcff', emissiveGain: 2.2 }));
  led.position.set(0.0, -0.0205, -0.0364); led.rotation.set(-0.5, Math.PI, 0); tilt.add(led);
  const ir = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 12), toonMaterial({ color: '#1c1f28', id: 89, spec: 1 }));
  ir.position.set(0.0, 0.0215, -0.0357); ir.rotation.set(0.5, Math.PI, 0); tilt.add(ir);
  // catch-light: the phone's glow caught in the lens (a curved sliver), shown after the servo step
  const catchM = toonMaterial({ color: '#000', id: 125, unlit: true, emissive: '#dfe9ff', emissiveGain: 1.6 });
  const glint = new THREE.Mesh(new THREE.RingGeometry(0.0042, 0.0064, 20, 1, 2.2, 1.1), catchM);
  glint.position.set(0, 0, -0.0452); glint.rotation.y = Math.PI; tilt.add(glint);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0013, 10), catchM); dot.position.set(-0.003, 0.0035, -0.0454); dot.rotation.y = Math.PI; tilt.add(dot);
  // the lens centre in the cam's local space at rest (for cameras looking out of it)
  const lensLocal = new THREE.Vector3(0, 0.018 + 0.052, -0.046);
  return {
    root, pan, tilt, glint, dot, led, lensLocal,
    set(panRad, tiltRad, glintOn = 1) {
      pan.rotation.y = panRad; tilt.rotation.x = tiltRad;
      glint.visible = dot.visible = glintOn > 0.5;
    },
  };
}
