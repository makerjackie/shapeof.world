// Elevation for the 3D city's hills (src/world/terrain.json): AWS Terrain Tiles (Terrarium, zoom 11; SRTM-derived,
// public-domain sources), stitched from /tmp/tower3-dem/t_<x>_<y>.png and resampled onto a 200 m grid in the
// film's local metres. Usage: node tools/terrain-prep.mjs [demDir]
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const DIR = process.argv[2] || "/tmp/tower3-dem";
const ORIGIN = [114.06, 22.54];
const KX = 111320 * Math.cos((22.54 * Math.PI) / 180);
const KY = 110574;
const Z = 11;
const XS = [1670, 1671, 1672, 1673, 1674, 1675];
const YS = [890, 891, 892, 893, 894];
const TW = XS.length * 256;
const TH = YS.length * 256;
const elev = new Float32Array(TW * TH);
for (const [ix, tx] of XS.entries())
  for (const [iy, ty] of YS.entries()) {
    const raw = execFileSync("/opt/homebrew/bin/ffmpeg", ["-nostdin", "-loglevel", "error", "-i", `${DIR}/t_${tx}_${ty}.png`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 24 });
    for (let py = 0; py < 256; py++)
      for (let px = 0; px < 256; px++) {
        const o = (py * 256 + px) * 3;
        elev[(iy * 256 + py) * TW + ix * 256 + px] = raw[o] * 256 + raw[o + 1] + raw[o + 2] / 256 - 32768;
      }
  }
const N = 2 ** Z * 256;
const lonOf = (X) => (X / N) * 360 - 180;
const latOf = (Y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / N))) * 180) / Math.PI;
const Xof = (lon) => ((lon + 180) / 360) * N;
const Yof = (lat) => ((1 - Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / Math.PI) / 2) * N;
const X0 = XS[0] * 256;
const Y0 = YS[0] * 256;
const sample = (lon, lat) => {
  const fx = Xof(lon) - X0;
  const fy = Yof(lat) - Y0;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  if (x0 < 0 || y0 < 0 || x0 >= TW - 1 || y0 >= TH - 1) return 0;
  const tx = fx - x0;
  const ty = fy - y0;
  const e = (x, y) => elev[y * TW + x];
  return (e(x0, y0) * (1 - tx) + e(x0 + 1, y0) * tx) * (1 - ty) + (e(x0, y0 + 1) * (1 - tx) + e(x0 + 1, y0 + 1) * tx) * ty;
};
const DX = 200;
const gx0 = -52000;
const gy0 = -32000;
const nx = 535;
const ny = 361;
const out = new Int16Array(nx * ny);
let max = 0;
for (let j = 0; j < ny; j++)
  for (let i = 0; i < nx; i++) {
    const x = gx0 + i * DX;
    const y = gy0 + j * DX;
    const h = Math.max(0, Math.round(sample(ORIGIN[0] + x / KX, ORIGIN[1] + y / KY)));
    out[j * nx + i] = h;
    max = Math.max(max, h);
  }
fs.writeFileSync("src/world/terrain.json", JSON.stringify({ x0: gx0, y0: gy0, dx: DX, nx, ny, h: Buffer.from(out.buffer).toString("base64") }));
console.log("terrain.json", nx, ny, "max", max, "m", lonOf(X0).toFixed(3), latOf(Y0).toFixed(3), fs.statSync("src/world/terrain.json").size, "bytes");
