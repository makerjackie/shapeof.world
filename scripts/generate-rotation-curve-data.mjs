/**
 * 生成「暗物质」世界的旋转曲线观测数据 → public/assets/dark-matter/rotation-curves.json
 *
 * 数据来源（真实观测）：
 *   SPARC 数据库（Spitzer Photometry & Accurate Rotation Curves，175 个晚型星系）
 *   Lelli, McGaugh & Schombert 2016, AJ, 152, 157 —— http://astroweb.cwru.edu/SPARC/
 *   使用 Newtonian Mass Models（Rotmod_LTG.zip）中的 NGC 6503：
 *   列为 Rad(kpc), Vobs, errV, Vgas, Vdisk, Vbul, SBdisk, SBbul（Vdisk 按 3.6μm Υ*=0.5 的质量模型）。
 *
 * 处理流程：
 *   1. 下载 Rotmod_LTG.zip，解出 NGC6503_rotmod.dat（系统 unzip，无 npm 依赖）。
 *   2. 银河系预设为示意曲线（太阳半径 8.2 kpc、平坦 ≈220 km/s），在脚本内手工构造并标注 schematic。
 *   3. 对每个星系拟合三件套的粗网格：盘星质比缩放 diskScale（0.4–1.0）、NFW 晕结构 r200（c=10 固定）、
 *      晕质量比 ratio（黄金分割搜索）。ratio 定义为「观测半径 Rmax 内 晕质量 / 可见质量」，
 *      即 v_halo(Rmax)² / v_bar(Rmax)²（M = v²·R/G，公共因子约去）。
 *   4. 拟合误差 χ²/点：errEff = max(vErr, 5%·vObs)（教学化误差下限，避免追逐个别抖动的测点）。
 *
 * 运行：node scripts/generate-rotation-curve-data.mjs
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SPARC_ZIP_URL = 'https://astroweb.cwru.edu/SPARC/Rotmod_LTG.zip'
const SPARC_MEMBER = 'NGC6503_rotmod.dat'
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'public/assets/dark-matter/rotation-curves.json')

// ---------------------------------------------------------------------------
// 模型（与 src/components/experiences/dark-matter-model.ts 保持一致）
// ---------------------------------------------------------------------------

/** NFW 圆周速度：v(r)，参数 v200 [km/s]、r200 [kpc]、浓度 c */
function nfwVelocity(r, v200, r200, c) {
  const rs = r200 / c
  const x = Math.max(r, 1e-6) / rs
  const f = (u) => Math.log(1 + u) - u / (1 + u)
  return v200 * Math.sqrt((f(x) / x) / (f(c) / c))
}

/** 可见物质（气体² + 盘²·diskScale，按平方速度线性内插；超出数据范围按开普勒衰减） */
function baryonicVelocity(galaxy, r, diskScale) {
  const pts = galaxy.points
  const n = pts.length
  const sq = (i) => galaxy.components.gas[i] ** 2 + diskScale * galaxy.components.disk[i] ** 2
  if (r <= 0) return 0
  if (r < pts[0].r) return Math.sqrt(sq(0)) * Math.sqrt(r / pts[0].r) // 中心线性升到首点
  if (r >= pts[n - 1].r) {
    const vLast = Math.sqrt(sq(n - 1))
    return vLast * Math.sqrt(pts[n - 1].r / r) // 开普勒衰减
  }
  let i = 0
  while (i < n - 2 && r > pts[i + 1].r) i += 1
  const t = (r - pts[i].r) / (pts[i + 1].r - pts[i].r)
  return Math.sqrt(sq(i) + (sq(i + 1) - sq(i)) * t)
}

/** 晕速度：ratio 定义使 v_halo(Rmax) = v_bar(Rmax)·√ratio */
function haloVelocity(galaxy, ratio, r, diskScale) {
  const { r200, c, rMax } = galaxy
  if (ratio <= 0) return 0
  const vBarAtMax = baryonicVelocity(galaxy, rMax, diskScale)
  const unit = nfwVelocity(rMax, 1, r200, c)
  const v200 = (vBarAtMax * Math.sqrt(ratio)) / unit
  return nfwVelocity(r, v200, r200, c)
}

function totalVelocity(galaxy, ratio, r, diskScale) {
  const vb = baryonicVelocity(galaxy, r, diskScale)
  const vh = haloVelocity(galaxy, ratio, r, diskScale)
  return Math.sqrt(vb * vb + vh * vh)
}

function chi2PerPoint(galaxy, ratio, diskScale) {
  let sum = 0
  galaxy.points.forEach((p, i) => {
    const errEff = Math.max(p.vErr, 0.05 * p.v)
    const z = (totalVelocity(galaxy, ratio, p.r, diskScale) - p.v) / errEff
    sum += z * z
    void i
  })
  return sum / galaxy.points.length
}

function goldenMin(fn, lo, hi, iters = 60) {
  const g = 0.6180339887498949
  let x1 = hi - g * (hi - lo)
  let x2 = lo + g * (hi - lo)
  let f1 = fn(x1)
  let f2 = fn(x2)
  for (let i = 0; i < iters; i += 1) {
    if (f1 > f2) {
      lo = x1
      x1 = x2
      f1 = f2
      x2 = lo + g * (hi - lo)
      f2 = fn(x2)
    } else {
      hi = x2
      x2 = x1
      f2 = f1
      x1 = hi - g * (hi - lo)
      f1 = fn(x1)
    }
  }
  const x = (lo + hi) / 2
  return { x, f: fn(x) }
}

/** 粗网格 + 黄金分割：返回 { diskScale, r200, ratio, chi2 } */
function fitGalaxy(galaxy) {
  let best = null
  // diskScale 下限 0.6：避免「无盘」退化拟合，保持可见物质内区抬升的教学形态
  for (let ds = 0.6; ds <= 1.001; ds += 0.1) {
    for (let r200 = 60; r200 <= 260; r200 += 10) {
      const g = { ...galaxy, r200 }
      const res = goldenMin((ratio) => chi2PerPoint(g, ratio, ds), 0.05, 8, 50)
      if (!best || res.f < best.chi2) {
        best = { diskScale: Number(ds.toFixed(2)), r200, ratio: res.x, chi2: res.f }
      }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// SPARC NGC 6503
// ---------------------------------------------------------------------------

function fetchSparcNgc6503() {
  const work = join(tmpdir(), `sparc-rotmod-${process.pid}`)
  mkdirSync(work, { recursive: true })
  const zipPath = join(work, 'Rotmod_LTG.zip')
  console.log(`下载 ${SPARC_ZIP_URL}`)
  execFileSync('curl', ['-fsSL', '--max-time', '90', '-o', zipPath, SPARC_ZIP_URL])
  const datPath = join(work, SPARC_MEMBER)
  execFileSync('unzip', ['-o', '-q', zipPath, SPARC_MEMBER, '-d', work])
  const text = readFileSync(datPath, 'utf8')
  rmSync(work, { recursive: true, force: true })

  const points = []
  const gas = []
  const disk = []
  let distanceMpc = null
  for (const line of text.split('\n')) {
    const head = line.match(/^#\s*Distance\s*=\s*([\d.]+)\s*Mpc/)
    if (head) distanceMpc = Number(head[1])
    if (line.startsWith('#') || !line.trim()) continue
    const cols = line.trim().split(/\s+/).map(Number)
    const [r, v, vErr, vGas, vDisk] = cols
    points.push({ r, v, vErr })
    gas.push(vGas)
    disk.push(vDisk)
  }
  if (points.length === 0) throw new Error('SPARC 数据解析失败')
  return { points, components: { gas, disk }, distanceMpc }
}

// ---------------------------------------------------------------------------
// 银河系（示意）：太阳半径 8.2 kpc、平坦 ≈220 km/s
// ---------------------------------------------------------------------------

function milkyWaySchematic() {
  // 示意测点（参考公开综述曲线形状：Sofue 2013 以来的平坦 ≈220 km/s，外侧误差渐大）
  const rs = [1.5, 3, 4.5, 6, 8.2, 10, 12, 14, 16, 19, 22, 25, 28, 31]
  const vs = [196, 218, 226, 223, 220, 219, 222, 223, 221, 218, 215, 212, 208, 205]
  const errs = [12, 9, 8, 7, 6, 6, 7, 8, 9, 10, 12, 14, 16, 18]
  // 示意分解：v = Vp·√f(r/Rp)，f(u)=u·e^{1-u}（峰在 Rp，外侧按指数盘衰减）；
  // 盘 Rp≈7.5 kpc（≈2.2·Rd，Rd≈3.4 kpc），核球 Rp≈0.8 kpc，气体外侧缓升。
  const shape = (r, rp) => {
    const u = Math.max(r / rp, 1e-6)
    return u * Math.exp(1 - u)
  }
  const disk = rs.map((r) =>
    Number(Math.hypot(212 * Math.sqrt(shape(r, 7.5)), 172 * Math.sqrt(shape(r, 0.8))).toFixed(2)),
  )
  const gas = rs.map((r) => Number(Math.min(18, 4 + r * 0.5).toFixed(2)))
  return {
    points: rs.map((r, i) => ({ r, v: vs[i], vErr: errs[i] })),
    components: { gas, disk },
    distanceMpc: null,
  }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

const ngc = fetchSparcNgc6503()
const mw = milkyWaySchematic()

const galaxies = []
for (const entry of [
  {
    id: 'ngc6503',
    name: 'NGC 6503',
    nameZh: 'NGC 6503 漩涡星系',
    schematic: false,
    ...ngc,
  },
  {
    id: 'milky-way',
    name: 'Milky Way',
    nameZh: '银河系（示意）',
    schematic: true,
    ...mw,
  },
]) {
  const rMax = entry.points[entry.points.length - 1].r
  const fit = fitGalaxy({ ...entry, rMax, r200: 120, c: 10 })
  const g = {
    id: entry.id,
    name: entry.name,
    nameZh: entry.nameZh,
    schematic: entry.schematic,
    distanceMpc: entry.distanceMpc,
    rMax: Number(rMax.toFixed(2)),
    halo: { r200: fit.r200, c: 10, diskScale: fit.diskScale, bestRatio: Number(fit.ratio.toFixed(3)) },
    points: entry.points,
    components: entry.components,
  }
  galaxies.push(g)
  const vbMax = baryonicVelocity({ ...g }, rMax, fit.diskScale)
  console.log(
    `${entry.name}: r200=${fit.r200} kpc, diskScale=${fit.diskScale}, bestRatio=${fit.ratio.toFixed(2)}, ` +
      `χ²/点=${fit.chi2.toFixed(2)}, v_bar(Rmax)=${vbMax.toFixed(1)} km/s`,
  )
  // 自检：晕=0 时应明显失配
  const chi20 = chi2PerPoint({ ...g }, 0, fit.diskScale)
  console.log(`  对照：ratio=0 时 χ²/点=${chi20.toFixed(1)}（应 ≫ 阈值）`)
}

const out = {
  generatedAt: new Date().toISOString(),
  source: {
    name: 'SPARC 数据库（Lelli, McGaugh & Schombert 2016）',
    url: 'http://astroweb.cwru.edu/SPARC/',
    file: SPARC_ZIP_URL,
    note: 'NGC 6503 为真实观测（Newtonian Mass Models，Vdisk 按 3.6μm Υ*=0.5，diskScale 为教学化星质比缩放）；银河系为示意曲线。',
  },
  galaxies,
}

mkdirSync(join(OUT, '..'), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`已写出 ${OUT}（${galaxies.length} 个星系）`)
