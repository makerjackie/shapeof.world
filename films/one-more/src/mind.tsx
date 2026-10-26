// Chapter B (1:00–1:57): inside the head. The monkey experiment (uncertainty), the two systems (liking, wanting),
// the near-miss slot machine (the one discovery), tonight's two lines, and knowing versus wanting.
import React from "react";
import { BrainSvg, bpt, HOTSPOTS, NODE } from "./brain";
import { Box, clamp01, EIN, EIO, EO, ESO, lerp, Neon, Note, polar, ramp, Say, star, Tag, tween, useT, win } from "./kit";
import { HAN, K, NUM } from "./theme";
import { A_END, B, sB, sC } from "./timing";

const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });

// ---------- the monkey experiment ----------
const CUES = [0, 0.25, 0.5, 0.75, 1];
const cueX = (i: number) => 960 + (i - 2) * 232;
const CUE_Y = 690;
const sig = (p: number) => 330 * 4 * p * (1 - p);

const Monkey: React.FC<{ t: number }> = ({ t }) => {
  const o = 1 - ramp(t, sB(2.35), sB(2.75));
  if (t > sB(2.8)) return null;
  // the point of light left by the fall becomes the 50% cue
  const seed = ramp(t, B.start - 0.2, sB(0.28), EO);
  const els: React.ReactNode[] = [];
  CUES.forEach((p, i) => {
    const k = ramp(t, sB(0.15) + Math.abs(i - 2) * 0.22, sB(0.15) + Math.abs(i - 2) * 0.22 + 0.5, EO);
    if (k <= 0) return;
    const x = cueX(i);
    const r = 58 * k;
    els.push(<circle key={`c${i}`} cx={x} cy={CUE_Y} r={r} fill="#0b1426" stroke={K.cyan} strokeWidth={3} opacity={k} />);
    if (p > 0 && p < 1) {
      const a1 = -90 + 360 * p;
      const [x1, y1] = polar(x, CUE_Y, r - 8, a1);
      els.push(<path key={`p${i}`} d={`M ${x} ${CUE_Y} L ${x} ${CUE_Y - r + 8} A ${r - 8} ${r - 8} 0 ${p > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={K.cyan} opacity={0.8 * k} />);
    } else if (p === 1) {
      els.push(<circle key={`p${i}`} cx={x} cy={CUE_Y} r={r - 8} fill={K.cyan} opacity={0.8 * k} />);
    }
    // the anticipation signal rising above each cue
    const h = sig(p) * ramp(t, sB(0.95) + i * 0.08, sB(1.65) + i * 0.08, EIO);
    if (h > 1) {
      const top = CUE_Y - 82 - h;
      const d = `M ${x - 44} ${CUE_Y - 82} C ${x - 10} ${CUE_Y - 84}, ${x + 18} ${top + h * 0.5}, ${x + 40} ${top}`;
      els.push(<Neon key={`s${i}`} d={d} color={K.want} width={4} core={K.wantHi} />);
    }
  });
  // the hill through the tops
  const hill = ramp(t, sB(1.6), sB(2.15), EIO);
  if (hill > 0) {
    const pts = CUES.map((p, i) => [cueX(i) + 40, CUE_Y - 82 - sig(p)]);
    const d = `M ${pts[0][0] - 60} ${pts[0][1]} C ${pts[1][0] - 70} ${pts[1][1] - 30}, ${pts[2][0] - 110} ${pts[2][1]}, ${pts[2][0]} ${pts[2][1]} C ${pts[2][0] + 110} ${pts[2][1]}, ${pts[3][0] + 70} ${pts[3][1] - 30}, ${pts[4][0] + 40} ${pts[4][1]}`;
    els.push(<path key="hill" d={d} fill="none" stroke={K.wantHi} strokeWidth={2.5} strokeDasharray="9 9" opacity={0.8 * hill} />);
  }
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
        {seed < 1 ? <circle cx={960} cy={lerp(540, CUE_Y, seed)} r={4 + 54 * seed} fill="none" stroke={K.want} strokeWidth={3} opacity={1 - seed * 0.6} /> : null}
        {els}
      </svg>
      <div style={{ position: "absolute", inset: 0, opacity: o }}>
        {CUES.map((p, i) => (
          <Tag key={i} x={cueX(i)} y={CUE_Y + 98} at={sB(0.3) + Math.abs(i - 2) * 0.22} out={sB(2.6)} color={K.fg} size={34}>
            <span style={{ fontFamily: NUM, fontWeight: 700 }}>{p === 0 ? "0" : `${p * 100}%`}</span>
          </Tag>
        ))}
        <Tag x={960} y={CUE_Y + 156} at={sB(0.6)} out={sB(2.6)} color={K.sub} size={26}>
          能喝到果汁的可能
        </Tag>
        <Tag x={cueX(2) + 40} y={CUE_Y - 82 - sig(0.5) - 40} at={sB(1.75)} out={sB(2.6)} color={K.wantHi} size={32}>
          期待最强
        </Tag>
      </div>
    </>
  );
};

// ---------- tonight's two lines ----------
const MATCH_MIN = [0, 22, 47, 72, 97, 122, 147, 172, 197, 227];
const RESULT = ["", "W", "L", "N", "W", "L", "N", "L", "N", "L"];
const LIKE_V = [0.8, 0.82, 0.72, 0.62, 0.64, 0.52, 0.42, 0.36, 0.27, 0.2];
const WANT_V = [0.5, 0.47, 0.58, 0.71, 0.68, 0.76, 0.86, 0.88, 0.94, 0.97];
const CH = { x0: 330, x1: 1700, y0: 860, h: 470 };
const mx = (m: number) => CH.x0 + ((CH.x1 - CH.x0) * m) / 227;
const vy = (v: number) => CH.y0 - v * CH.h;
const valAt = (vals: number[], m: number) => {
  for (let i = 1; i < MATCH_MIN.length; i++) {
    if (m <= MATCH_MIN[i]) {
      // each match moves the line in the few minutes after it ends, then it drifts
      const a = MATCH_MIN[i - 1];
      const u = clamp01((m - a) / Math.min(8, MATCH_MIN[i] - a));
      return lerp(vals[i - 1], vals[i], EIO(u)) + 0.01 * Math.sin(m * 0.16 + vals[0] * 9);
    }
  }
  return vals[vals.length - 1];
};
const linePath = (vals: number[], m: number) => {
  const pts: string[] = [];
  for (let q = 0; q <= m; q += 1.5) pts.push(`${mx(q).toFixed(1)},${vy(valAt(vals, q)).toFixed(1)}`);
  pts.push(`${mx(m).toFixed(1)},${vy(valAt(vals, m)).toFixed(1)}`);
  return `M ${pts.join(" L ")}`;
};
const clock = (m: number) => {
  const tot = 22 * 60 + Math.round(m);
  const h = Math.floor(tot / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
};

const Night: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sB(10.3), sB(13.3), 0.4, 0.35);
  if (o <= 0) return null;
  const m = 227 * ramp(t, sB(10.55), sB(12.55), EIO);
  const axis = ramp(t, sB(10.32), sB(10.7), EO);
  // the scissors: shade where wanting runs above liking
  const shade: string[] = [];
  for (let q = 0; q <= m; q += 2) {
    const a = valAt(WANT_V, q);
    const b = valAt(LIKE_V, q);
    if (a > b) shade.push(`${mx(q)},${vy(a)}`);
  }
  const shadeBack: string[] = [];
  for (let q = Math.floor(m / 2) * 2; q >= 0; q -= 2) {
    const a = valAt(WANT_V, q);
    const b = valAt(LIKE_V, q);
    if (a > b) shadeBack.push(`${mx(q)},${vy(b)}`);
  }
  const end = ramp(t, sB(12.6), sB(12.95), EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={CH.x0} x2={CH.x0 + (CH.x1 - CH.x0) * axis} y1={CH.y0} y2={CH.y0} stroke={K.fg} strokeOpacity={0.35} strokeWidth={2} />
        {[0, 60, 120, 180, 227].map((q) => (
          <line key={q} x1={mx(q)} x2={mx(q)} y1={CH.y0} y2={CH.y0 + 12} stroke={K.fg} strokeOpacity={0.35 * axis} strokeWidth={2} />
        ))}
        {shade.length > 2 ? <polygon points={[...shade, ...shadeBack].join(" ")} fill={K.want} opacity={0.12} /> : null}
        {m > 0.5 ? <Neon d={linePath(LIKE_V, m)} color={K.like} width={5} core={K.likeHi} /> : null}
        {m > 0.5 ? <Neon d={linePath(WANT_V, m)} color={K.want} width={5} core={K.wantHi} /> : null}
        {/* the cursor of tonight */}
        {m > 0.5 ? <line x1={mx(m)} x2={mx(m)} y1={CH.y0} y2={CH.y0 - CH.h - 30} stroke={K.fg} strokeOpacity={0.25} strokeWidth={2} strokeDasharray="4 8" /> : null}
        {MATCH_MIN.slice(1).map((q, i) => {
          if (q > m) return null;
          const r = RESULT[i + 1];
          const c = r === "W" ? K.cyan : r === "N" ? K.want : "#8a93a6";
          return <circle key={q} cx={mx(q)} cy={CH.y0} r={r === "N" ? 9 : 7} fill={c} />;
        })}
        {m > 0.5 ? (
          <>
            <circle cx={mx(m)} cy={vy(valAt(LIKE_V, m))} r={9} fill={K.likeHi} />
            <circle cx={mx(m)} cy={vy(valAt(WANT_V, m))} r={9} fill={K.wantHi} />
          </>
        ) : null}
        {end > 0 ? <line x1={mx(227) + 30} x2={mx(227) + 30} y1={vy(valAt(WANT_V, 227))} y2={vy(valAt(LIKE_V, 227))} stroke={K.fg} strokeWidth={2} opacity={end} /> : null}
      </svg>
      {[0, 60, 120, 180].map((q) => (
        <Tag key={q} x={mx(q)} y={CH.y0 + 40} at={sB(10.4)} out={sB(13.4)} color={K.muted} size={24}>
          <span style={{ fontFamily: NUM, fontWeight: 600 }}>{clock(q)}</span>
        </Tag>
      ))}
      {m > 0.5 ? (
        <div style={{ position: "absolute", left: mx(m), top: CH.y0 - CH.h - 66, transform: "translateX(-50%)", fontFamily: NUM, fontWeight: 300, fontSize: 40, color: K.fg, fontVariantNumeric: "tabular-nums" }}>{clock(m)}</div>
      ) : null}
      {MATCH_MIN.slice(1).map((q, i) => {
        const r = RESULT[i + 1];
        if (q > m || r !== "N") return null;
        return (
          <div key={q} style={{ position: "absolute", left: mx(q), top: CH.y0 + 64, transform: "translateX(-50%)", fontFamily: HAN, fontWeight: 800, fontSize: 24, color: K.wantHi, whiteSpace: "nowrap" }}>
            差一点
          </div>
        );
      })}
      {m > 30 ? (
        <>
          <div style={{ position: "absolute", left: mx(m) + 20, top: vy(valAt(LIKE_V, m)) - 18, fontFamily: HAN, fontWeight: 800, fontSize: 30, color: K.like, whiteSpace: "nowrap" }}>喜欢</div>
          <div style={{ position: "absolute", left: mx(m) + 20, top: vy(valAt(WANT_V, m)) - 18, fontFamily: HAN, fontWeight: 800, fontSize: 30, color: K.want, whiteSpace: "nowrap" }}>想要</div>
        </>
      ) : null}
    </div>
  );
};

// ---------- the slot machines (Clark et al. 2009) ----------
type Sym = "star" | "dia" | "dot";
const SYMS: Sym[] = ["star", "dia", "dot", "star", "dia", "dot"];
const symPath = (s: Sym, x: number, y: number, r: number) =>
  s === "star" ? star(x, y, r) : s === "dia" ? `M ${x} ${y - r} L ${x + r * 0.8} ${y} L ${x} ${y + r} L ${x - r * 0.8} ${y} Z` : `M ${x - r * 0.7} ${y} A ${r * 0.7} ${r * 0.7} 0 1 0 ${x + r * 0.7} ${y} A ${r * 0.7} ${r * 0.7} 0 1 0 ${x - r * 0.7} ${y}`;
const symColor = (s: Sym) => (s === "star" ? K.gold : s === "dia" ? K.cyan : K.like);

// One machine: three reels; `final` is the symbol index each reel stops on, `off` how far below the payline (0 = on it).
const Machine: React.FC<{ x: number; y: number; t: number; stops: number[]; final: number[]; off: number[]; glow: number; o: number }> = ({ x, y, t, stops, final, off, glow, o }) => {
  const W = 520;
  const H = 290;
  const reelW = 140;
  const step = 96;
  const els: React.ReactNode[] = [];
  for (let r = 0; r < 3; r++) {
    const rx = x - reelW - 12 + r * (reelW + 12);
    const spin = t < stops[r] ? (t - sB(7.3)) * 26 : 0;
    const settle = t >= stops[r] ? Math.exp(-(t - stops[r]) * 10) * Math.cos((t - stops[r]) * 30) * 0.25 : 0;
    const pos = t < stops[r] ? spin : final[r] - off[r] + settle;
    for (let k = -2; k <= 2; k++) {
      const idx = Math.floor(pos) + k;
      const frac = pos - Math.floor(pos);
      const sy = y + (k - frac) * step;
      if (Math.abs(sy - y) > H / 2 - 10) continue;
      const s = SYMS[((idx % 6) + 6) % 6];
      const fade = 1 - Math.abs(sy - y) / (H / 2);
      els.push(<path key={`${r}-${k}`} d={symPath(s, rx, sy, 33)} fill={symColor(s)} opacity={(t < stops[r] ? 0.45 : 1) * fade} />);
    }
  }
  return (
    <g opacity={o}>
      <rect x={x - W / 2 - 20} y={y - H / 2 - 20} width={W + 40} height={H + 40} rx={28} fill="#0b1222" stroke={glow > 0 ? K.want : "#3a4560"} strokeWidth={3 + 3 * glow} />
      {glow > 0 ? <rect x={x - W / 2 - 34} y={y - H / 2 - 34} width={W + 68} height={H + 68} rx={38} fill="none" stroke={K.want} strokeWidth={14} opacity={0.16 * glow} /> : null}
      <clipPath id={`clip-${x}`}>
        <rect x={x - W / 2} y={y - H / 2} width={W} height={H} rx={16} />
      </clipPath>
      <rect x={x - W / 2} y={y - H / 2} width={W} height={H} rx={16} fill="#060a14" />
      <g clipPath={`url(#clip-${x})`}>{els}</g>
      <line x1={x - W / 2 - 8} x2={x + W / 2 + 8} y1={y} y2={y} stroke={K.fg} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 6" />
    </g>
  );
};

const Slots: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sB(7.25), sB(10.35), 0.4, 0.35);
  if (o <= 0) return null;
  const L = 640;
  const R = 1330;
  const MY = 560;
  const happy = ramp(t, sB(8.2), sB(8.6), EO);
  const again = ramp(t, sB(8.75), sB(9.1), EO);
  const glow = ramp(t, sB(9.2), sB(9.5), EO);
  // the third reel of the left machine stops one symbol below the line: mark it
  const miss = ramp(t, sB(8.15), sB(8.45), EO);
  const mxr = L + 140 + 12;
  const bars = (x: number, hv: number, wv: number) => (
    <>
      {[
        [K.like, hv * happy],
        [K.want, wv * again],
      ].map(([c, v], i) => (
        <g key={i}>
          <rect x={x - 170} y={MY + 210 + i * 58} width={380} height={22} rx={11} fill="#ffffff" opacity={0.07} />
          <rect x={x - 170} y={MY + 210 + i * 58} width={380 * (v as number)} height={22} rx={11} fill={c as string} />
        </g>
      ))}
    </>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Machine x={L} y={MY} t={t} stops={[sB(7.7), sB(7.85), sB(8.1)]} final={[0, 0, 0]} off={[0, 0, 1]} glow={glow} o={1} />
        <Machine x={R} y={MY} t={t} stops={[sB(7.75), sB(7.9), sB(8.1)]} final={[0, 1, 2]} off={[0, 0, 0]} glow={0} o={1 - 0.45 * glow} />
        {miss > 0 ? (
          <g opacity={miss}>
            <circle cx={mxr} cy={MY + 96} r={50} fill="none" stroke={K.want} strokeWidth={4} />
            <path d={`M ${mxr + 66} ${MY + 96} L ${mxr + 66} ${MY + 10}`} stroke={K.wantHi} strokeWidth={3} markerEnd="" />
            <path d={`M ${mxr + 56} ${MY + 24} L ${mxr + 66} ${MY + 8} L ${mxr + 76} ${MY + 24}`} fill="none" stroke={K.wantHi} strokeWidth={3} strokeLinejoin="round" />
          </g>
        ) : null}
        {bars(L, 0.26, 0.86)}
        {bars(R, 0.46, 0.5)}
      </svg>
      <Tag x={mxr + 86} y={MY + 52} at={sB(8.2)} out={sB(10.4)} color={K.wantHi} size={26} anchor="left">
        差一格
      </Tag>
      <Tag x={L} y={MY - 200} at={sB(8.15)} out={sB(10.4)} color={K.wantHi} size={42}>
        差一点
      </Tag>
      <Tag x={R} y={MY - 200} at={sB(8.15)} out={sB(10.4)} color={K.sub} size={42}>
        差很远
      </Tag>
      {[L, R].map((x) => (
        <React.Fragment key={x}>
          <Tag x={x - 188} y={MY + 221} at={sB(8.2)} out={sB(10.4)} color={K.like} size={27} anchor="right">
            开心
          </Tag>
          <Tag x={x - 188} y={MY + 279} at={sB(8.75)} out={sB(10.4)} color={K.want} size={27} anchor="right">
            想再来
          </Tag>
        </React.Fragment>
      ))}
    </div>
  );
};

// ---------- the brain across the chapter ----------
const brainPose = (t: number) => {
  // centre-right for the two systems, small at the left while the two lines leave it, centre-right again for knowing
  const x = t < sB(6.3) ? 1240 : t < sB(7.4) ? tween(t, sB(6.25), sB(6.7), 1240, 430, ESO) : t < sB(13.2) ? 430 : tween(t, sB(13.2), sB(13.8), 1100, 1240, ESO) - 50 * ramp(t, sB(13.8), sB(17), (u) => u);
  const y = t < sB(6.3) ? 570 : t < sB(13.2) ? tween(t, sB(6.25), sB(6.7), 570, 600, ESO) : 570;
  const s = t < sB(6.3) ? 1.05 : t < sB(13.2) ? tween(t, sB(6.25), sB(6.7), 1.05, 0.56, ESO) : tween(t, sB(13.2), sB(13.8), 0.9, 1.08, ESO) + 0.14 * ramp(t, sB(13.8), sB(17), (u) => u);
  return { x, y, s };
};

const TwoLines: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sB(6.3), sB(7.3), 0.3, 0.35);
  if (o <= 0) return null;
  const g = ramp(t, sB(6.35), sB(7.0), EIO);
  const x0 = 640;
  const x1 = lerp(x0, 1800, g);
  const wave = (yy: number, ph: number) => {
    const pts: string[] = [];
    for (let x = x0; x <= x1; x += 12) pts.push(`${x},${(yy + 16 * Math.sin((x - x0) / 120 + t * 1.6 + ph)).toFixed(1)}`);
    return `M ${pts.join(" L ")}`;
  };
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <Neon d={wave(578, 0)} color={K.like} width={5} core={K.likeHi} />
      <Neon d={wave(618, 0)} color={K.want} width={5} core={K.wantHi} />
    </svg>
  );
};

export const MindWorld: React.FC = () => {
  const t = useT();
  if (t < A_END || t > sC(1.6)) return null;
  const pose = brainPose(t);
  const brainO = Math.max(win(t, sB(2.5), sB(7.3), 0.3, 0.35), win(t, sB(13.2), sC(1.5), 0.4, 0.5));
  const draw = t < sB(13) ? ramp(t, sB(2.5), sB(3.3), EIO) : 1;
  const flash = t > sB(15.4) ? Math.exp(-(t - sB(15.4)) * 1.6) : 0;
  const shrink = ramp(t, sC(0.5), sC(1.4), EIN);
  const bx = lerp(pose.x, 1040, shrink);
  const by = lerp(pose.y, 440, shrink);
  const bs = lerp(pose.s, 0.12, shrink);
  const st = {
    draw,
    o: brainO,
    like: t < sB(13) ? ramp(t, sB(3.45), sB(3.95), EO) : 0.35,
    want: t < sB(13) ? ramp(t, sB(4.35), sB(5.1), EIO) : 1,
    flow: t < sB(13) ? 0.4 : t < sB(14.8) ? 0.35 : 0.8 + 0.2 * flash,
    know: t < sB(13) ? 0 : ramp(t, sB(14.25), sB(14.7), EO) * (1 - 0.7 * ramp(t, sB(15.4), sB(15.7), EO)),
    flash: t < sB(13) ? 0 : flash,
  };
  const L = (p: [number, number]) => bpt(bx, by, bs, p);
  const [lx, ly] = L(HOTSPOTS[0]);
  const [wx, wy] = L([430, 150]);
  const [kx, ky] = L(NODE.pfc);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Monkey t={t} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <BrainSvg id="mind" x={bx} y={by} s={bs} st={st} t={t} />
      </svg>
      <TwoLines t={t} />
      <Slots t={t} />
      <Night t={t} />
      {/* labels on the brain */}
      <Tag x={lx - 40} y={ly + 70} at={sB(3.5)} out={sB(6.25)} color={K.like} size={34} anchor="right">
        喜欢 · 几个小点
      </Tag>
      <Tag x={wx + 40} y={wy - 40} at={sB(4.45)} out={sB(6.25)} color={K.want} size={34} anchor="left">
        想要 · 一大片
      </Tag>
      <Tag x={kx - 30} y={ky - 70} at={sB(14.3)} out={sB(17)} color={K.know} size={34} anchor="right">
        知道
      </Tag>
      <Tag x={wx + 60} y={wy - 30} at={sB(14.85)} out={sB(17)} color={K.want} size={34} anchor="left">
        想要
      </Tag>
      <Tag x={1640} y={576} at={sB(6.8)} out={sB(7.3)} color={K.like} size={30} anchor="left">
        喜欢
      </Tag>
      <Tag x={1640} y={616} at={sB(6.85)} out={sB(7.3)} color={K.want} size={30} anchor="left">
        想要
      </Tag>
      <MindText />
      <Note at={sB(0.25)} out={sB(2.5)}>猴子实验 · Fiorillo 等，Science 2003 · 信号为示意</Note>
      <Note at={sB(3.5)} out={sB(6.25)}>在大鼠脑里，管“喜欢”的热点每个只有约 1 立方毫米（Peciña & Berridge 2005）· 脑区位置为示意</Note>
      <Note at={sB(7.35)} out={sB(10.3)}>Clark 等，Neuron 2009：差一点时，大脑里平时为赢而亮的区域也亮了；只在自己动手转时出现 · 条形为示意</Note>
      <Note at={sB(10.5)} out={sB(13.3)}>示意：一个人一夜里的“喜欢”和“想要”</Note>
    </div>
  );
};

const MindText: React.FC = () => (
  <>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(0.12)} out={sB(1.45)} size={56} parts={["科学家给猴子看五种信号，"]} />
      <Say at={sB(0.5)} out={sB(1.45)} size={56} parts={["代表能喝到果汁的可能。"]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(1.5)} out={sB(2.5)} size={60} parts={["一半一半的时候，"]} />
      <Say at={sB(1.78)} out={sB(2.5)} size={60} parts={["它脑子里的", want("期待"), "，最强。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={sB(2.6)} out={sB(3.4)} size={64} parts={["大脑里，"]} />
      <Say at={sB(2.8)} out={sB(3.4)} size={64} parts={["有两套不同的系统。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={sB(3.45)} out={sB(4.35)} size={60} parts={["一套管", like("“喜欢”"), "："]} />
      <Say at={sB(3.7)} out={sB(4.35)} size={52} weight={700} color={K.sub} parts={["这让我开心吗？"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={sB(4.4)} out={sB(5.25)} size={60} parts={["一套管", want("“想要”"), "："]} />
      <Say at={sB(4.65)} out={sB(5.25)} size={52} weight={700} color={K.sub} parts={["我还要不要？"]} />
    </Box>
    <Box x={110} y={380} gap={14}>
      <Say at={sB(5.3)} out={sB(6.25)} size={58} parts={[want("“想要”"), "那一套，大得多，"]} />
      <Say at={sB(5.6)} out={sB(6.25)} size={58} parts={["也更容易被点燃。"]} />
    </Box>
    <Box x={110} y={170} gap={14}>
      <Say at={sB(6.35)} out={sB(7.25)} size={60} parts={["平时，它们一起走："]} />
      <Say at={sB(6.6)} out={sB(7.25)} size={60} parts={["喜欢什么，就想要什么。"]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(7.3)} out={sB(8.12)} size={56} parts={[{ t: "2009", num: true }, " 年，剑桥的一个老虎机实验："]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(8.2)} out={sB(9.15)} size={56} parts={["差一点就中，比差很远", like("更难受"), "，"]} />
      <Say at={sB(8.75)} out={sB(9.15)} size={56} parts={["却", want("更想再来一把"), "。"]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(9.2)} out={sB(10.3)} size={92} weight={900} parts={["更难受，", { t: "却更想要。", mark: true }]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(10.35)} out={sB(11.2)} size={52} weight={700} parts={["游戏里，每一局都是你自己动手。"]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(11.25)} out={sB(12.6)} size={54} parts={[like("“喜欢”"), "早就往下走了，"]} />
      <Say at={sB(11.8)} out={sB(12.6)} size={54} parts={[want("“想要”"), "还在往上。"]} />
    </Box>
    <Box x={110} y={150} gap={14}>
      <Say at={sB(12.65)} out={sB(13.3)} size={64} weight={900} parts={["这就是凌晨 ", { t: "1:47", num: true }, " 的你。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={sB(13.4)} out={sB(14.25)} size={62} parts={["那“明知道该停”的你呢？"]} />
    </Box>
    <Box x={110} y={380} gap={16}>
      <Say at={sB(14.3)} out={sB(15.4)} size={56} parts={[{ t: "“知道”", c: K.know }, "很慢，要想。"]} />
      <Say at={sB(14.85)} out={sB(15.4)} size={56} parts={[want("“想要”"), "很快，不用想。"]} />
    </Box>
    <Box x={110} y={380} gap={16}>
      <Say at={sB(15.45)} out={sB(16.2)} size={56} parts={["刚输的那一秒："]} />
      <Say at={sB(15.65)} out={sB(16.2)} size={56} parts={[want("想要"), "最强，", { t: "知道", c: K.know }, "最弱。"]} />
    </Box>
    <Box x={110} y={380} gap={16}>
      <Say at={sB(16.25)} out={sC(0.9)} size={60} parts={["不是你意志力差。"]} />
      <Say at={sB(16.6)} out={sC(0.9)} size={60} parts={["是做决定的那个你，"]} />
      <Say at={sB(16.9)} out={sC(0.9)} size={60} parts={[{ t: "不在现场", c: K.know }, "。"]} />
    </Box>
  </>
);
