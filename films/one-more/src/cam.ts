// A 2D camera over a world whose origin is the "再来一局" button. SVG shapes go inside <g transform={camG(cam)}>;
// HTML labels are placed with w2s() so type stays crisp and never uses centred SVG text.
export type Cam = { cx: number; cy: number; z: number };

export const camG = (c: Cam) => `translate(960 540) scale(${c.z}) translate(${-c.cx} ${-c.cy})`;
export const w2s = (c: Cam, x: number, y: number): [number, number] => [960 + c.z * (x - c.cx), 540 + c.z * (y - c.cy)];
export const mixCam = (a: Cam, b: Cam, k: number): Cam => ({ cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, z: a.z * Math.pow(b.z / a.z, k) });

// Camera path from keys [[t, cam, ease?], ...]; the ease of a key shapes the move that ends there. Zoom interpolates
// geometrically so pushes feel even.
export type CamKey = [number, Cam, ((x: number) => number)?];
export const camAt = (t: number, k: CamKey[], ease: (x: number) => number) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return mixCam(k[i - 1][1], k[i][1], (k[i][2] ?? ease)(Math.max(0, Math.min(1, u))));
    }
  }
  return k[k.length - 1][1];
};
