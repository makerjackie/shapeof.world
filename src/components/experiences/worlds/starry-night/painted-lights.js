// The existing public-domain reproduction supplies pigment colours. These are
// baked into closed, volumetric pigment bodies at load time.
export async function readPaintingPigments(document) {
  const image = document.querySelector('.reference-painting');
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return (x, y) => {
    const px = Math.max(0, Math.min(canvas.width - 1, x));
    const py = Math.max(0, Math.min(canvas.height - 1, y));
    const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
    const at = (a, b, k) => data[(Math.min(canvas.height - 1, b) * canvas.width + Math.min(canvas.width - 1, a)) * 4 + k] / 255;
    return [0, 1, 2].map(k => (at(ix, iy, k) * (1 - fx) + at(ix + 1, iy, k) * fx) * (1 - fy)
      + (at(ix, iy + 1, k) * (1 - fx) + at(ix + 1, iy + 1, k) * fx) * fy);
  };
}

export function buildPaintedLight(batch, domePoint, pigment, { source, x, y, radius, moon = false, depth = 0 }) {
  // A closed ellipsoid retains the painted front silhouette while presenting
  // a curved body when a flight passes beside or behind it. No facing-camera plane.
  const slices = moon ? 144 : 80, rings = moon ? 72 : 40;
  const center = domePoint(x, y, depth), thickness = radius * (moon ? .64 : .78);
  const point = (theta, phi) => {
    const u = Math.sin(theta) * Math.cos(phi), v = Math.cos(theta);
    const z = Math.sin(theta) * Math.sin(phi), distance = Math.hypot(u, v);
    const color = pigment(source[0] + u * source[2], source[1] - v * source[2]);
    const fade = Math.max(0, Math.min(1, (1 - distance) / .14));
    const ink = color.map((c, k) => [0.10, 0.21, 0.38][k] * (1 - fade) + c * fade);
    const normal = [u / radius, v / radius, z / thickness];
    const length = Math.hypot(...normal);
    return { p: [center[0] + u * radius, center[1] + v * radius, center[2] + z * thickness],
      normal: normal.map(n => n / length), color: ink };
  };
  const triangle = (a, b, c) => {
    for (const v of [a, b, c]) batch.vert(v.p, v.normal, [0, 0], v.color, 1.0, 13);
  };
  for (let j = 0; j < rings; j++) for (let i = 0; i < slices; i++) {
    const a = point(j / rings * Math.PI, i / slices * Math.PI * 2);
    const b = point((j + 1) / rings * Math.PI, i / slices * Math.PI * 2);
    const c = point((j + 1) / rings * Math.PI, (i + 1) / slices * Math.PI * 2);
    const d = point(j / rings * Math.PI, (i + 1) / slices * Math.PI * 2);
    triangle(a, b, c); triangle(a, c, d);
  }
}
