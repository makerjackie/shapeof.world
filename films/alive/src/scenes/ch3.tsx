import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, random } from "remotion";
import { CL, EIO, EO, In, Odometer, progAt } from "../fx";
import { Icon, Person } from "../icons";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Box, Head, Src } from "../ui";

// ---------- 86 s: the one discovery, on the music's re-entry ----------
// The Harvard Study of Adult Development: the Grant Study (268 Harvard sophomores, classes of 1939–1944) and the
// Glueck Study (456 men who grew up in Boston's inner city), followed since 1938. One figure stands for 4 men. A
// playhead runs along the years and the men age (grey heads, a stoop); by 2017 (Harvard Gazette) 19 and 40 of them
// were still living, about 5 and 10 figures. On the reveal a few calm gold threads join them.

const AX = { x0: 140, x1: 1780, y: 860 };
const yearX = (y: number) => AX.x0 + ((y - 1938) / (2026 - 1938)) * (AX.x1 - AX.x0);
const PER = 4;
const FP = { x: 32, y: 52, h: 40 };
type Cohort = { n: number; cols: number; x: number; alive2017: number; name: string; who: string; color: string };
const COHORTS: Cohort[] = [
  { n: 268, cols: 10, x: 150, alive2017: 19, name: "Grant 组", who: "268 名哈佛大二学生", color: K.themeHi },
  { n: 456, cols: 13, x: 520, alive2017: 40, name: "Glueck 组", who: "456 名波士顿市中心长大的男孩", color: K.steelHi },
];
const figs = (c: Cohort) => Math.round(c.n / PER);
const BOTTOM = 790;
const posOf = (c: Cohort, i: number) => {
  const rows = Math.ceil(figs(c) / c.cols);
  const row = Math.floor(i / c.cols);
  return { x: c.x + (i % c.cols) * FP.x + FP.x / 2, y: BOTTOM - (rows - 1 - row) * FP.y };
};
const topOf = (c: Cohort) => BOTTOM - Math.ceil(figs(c) / c.cols) * FP.y - 4;
// The order the figures pass away in (fixed at random); the last few stand for the 2017 survivors.
const RANK = COHORTS.map((c) => {
  const order = Array.from({ length: figs(c) }, (_, i) => i).sort((a, b) => random(`o${c.n}${a}`) - random(`o${c.n}${b}`));
  const r = new Array<number>(order.length);
  order.forEach((f, k) => (r[f] = k));
  return r;
});
// A calm few threads per cohort, between near neighbours, no figure in two.
const THREADS = COHORTS.map((c, ci) => {
  const out: [number, number][] = [];
  const n = figs(c);
  for (let k = 0; out.length < (ci ? 16 : 10) && k < 400; k++) {
    const i = Math.floor(random(`ta${ci}-${k}`) * n);
    const dx = Math.floor(random(`tx${ci}-${k}`) * 5) - 2;
    const dy = Math.floor(random(`ty${ci}-${k}`) * 3) - 1;
    const j = i + dy * c.cols + dx;
    if (j < 0 || j >= n || j === i || Math.abs((i % c.cols) - (j % c.cols)) > 2) continue;
    if (out.some(([a, b]) => a === i || b === i || a === j || b === j)) continue;
    out.push([i, j]);
  }
  return out;
});

export const Harvard: React.FC = () => {
  const frame = useBeatFrame();
  const appear = progAt(frame, 0.3, 1.6, EO);
  const play = progAt(frame, 2.2, 6, EIO);
  const year = 1938 + (2017 - 1938) * play;
  const ageing = interpolate(year, [1945, 2010], [0, 1], CL);
  const passing = interpolate(year, [1985, 2017], [0, 1], CL);
  const web = progAt(frame, 10.5, 2.5, EIO);
  const axis = progAt(frame, 0.5, 1.5, EO);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* A few threads (relationships), the reveal. */}
        {COHORTS.map((c, ci) =>
          THREADS[ci].map(([i, j], k) => {
            const t = interpolate(web * 1.3 - (k / THREADS[ci].length) * 0.3, [0, 0.5], [0, 1], CL);
            if (t <= 0) return null;
            const a = posOf(c, i);
            const b = posOf(c, j);
            const ay = a.y - FP.h * 0.75;
            const by = b.y - FP.h * 0.75;
            const my = Math.min(ay, by) - 22;
            return <path key={`${ci}-${k}`} d={`M ${a.x} ${ay} Q ${(a.x + b.x) / 2} ${my} ${b.x} ${by}`} stroke={K.gold} strokeWidth={2.4} strokeOpacity={0.85} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} strokeLinecap="round" />;
          }),
        )}
        {COHORTS.map((c, ci) =>
          Array.from({ length: figs(c) }, (_, i) => {
            const p = posOf(c, i);
            const a = Math.min(1, Math.max(0, appear * 1.4 - (i / figs(c)) * 0.4));
            if (a <= 0) return null;
            const survivors = Math.round(c.alive2017 / PER);
            const gone = RANK[ci][i] >= survivors && RANK[ci][i] - survivors < passing * (figs(c) - survivors);
            const head = interpolateColors(ageing, [0, 1], ["#b9794c", "#f1efe9"]);
            const linked = web > 0.3 && THREADS[ci].some(([x, y]) => x === i || y === i);
            return <Person key={`${ci}-${i}`} x={p.x} y={p.y} h={FP.h * (1 - 0.08 * ageing)} color={linked ? K.gold : c.color} head={head} age={ageing} o={a * (gone ? 0.5 : 0.95)} outline={gone} />;
          }),
        )}
        {/* The years. */}
        <line x1={AX.x0} y1={AX.y} x2={AX.x0 + (AX.x1 - AX.x0) * axis} y2={AX.y} stroke={K.sub} strokeWidth={2} />
        {[1938, 1960, 1980, 2000, 2017, 2026].map((y) => (
          <line key={y} x1={yearX(y)} y1={AX.y - 6} x2={yearX(y)} y2={AX.y + 6} stroke={K.sub} strokeWidth={2} opacity={axis} />
        ))}
        {play > 0 ? (
          <g>
            <line x1={AX.x0} y1={AX.y} x2={yearX(year)} y2={AX.y} stroke={K.theme} strokeWidth={5} strokeLinecap="round" />
            <circle cx={yearX(year)} cy={AX.y} r={9} fill={K.themeHi} />
          </g>
        ) : null}
        {[1940, 1970, 2000].map((y) => (
          <circle key={y} cx={yearX(y)} cy={AX.y} r={5} fill={K.fg} opacity={interpolate(year, [y - 2, y + 2], [0, 1], CL)} />
        ))}
      </svg>
      {[1938, 1960, 1980, 2000, 2017, 2026].map((y) => (
        <div key={y} style={{ position: "absolute", left: yearX(y) - 40, width: 80, top: AX.y + 14, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.muted, opacity: axis }}>{y}</div>
      ))}
      {(
        [
          [1940, "约 20 岁"],
          [1970, "约 50 岁"],
          [2000, "约 80 岁"],
        ] as [number, string][]
      ).map(([y, t]) => (
        <div key={y} style={{ position: "absolute", left: yearX(y) - 50, width: 100, top: AX.y - 44, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 900, color: K.fg, opacity: interpolate(year, [y - 2, y + 2], [0, 1], CL) }}>{t}</div>
      ))}
      <div style={{ position: "absolute", left: yearX(year) - 70, width: 140, top: AX.y - 100, textAlign: "center", opacity: play > 0 && play < 1 ? 1 : 0 }}>
        <Odometer value={Math.floor(year)} size={40} sep={false} color={K.themeHi} />
      </div>
      <div style={{ position: "absolute", left: yearX(2017) - 150, width: 300, top: AX.y - 104, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.sub, opacity: progAt(frame, 8.2, 0.8, EO) * (1 - web) }}>
        2017 年仍健在：19 人 · 40 人
      </div>
      {COHORTS.map((c, i) => (
        <div key={c.name} style={{ position: "absolute", left: c.x, top: topOf(c) - 66, fontFamily: FONT }}>
          <In at={0.6 + i * 0.4} from="up" dist={14}>
            <div style={{ fontSize: 30, fontWeight: 900, color: c.color }}>{c.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>{c.who}</div>
          </In>
        </div>
      ))}
      <div style={{ position: "absolute", left: 1000, top: 210, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.muted }}>
        <In at={1.5} from="fade">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width={24} height={36}>
              <Person x={12} y={35} h={34} color={K.sub} />
            </svg>
            每个小人 = 4 个人
          </div>
        </In>
      </div>
      <Box x={110} y={92}>
        <Head at={0} parts={["1938 年起，哈佛", { t: "跟踪了两组人的一生", c: K.theme }, "："]} size={64} />
      </Box>
      <Box x={1000} y={330} style={{ gap: 14 }}>
        <In at={9} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 700, color: K.sub }}>跟到老，最能预示他们健康、快乐的——</div>
        </In>
        <Head at={10.5} parts={[{ t: "是关系，", c: K.gold }, "不是成就。"]} size={88} />
        <In at={13} from="fade">
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.fg }}>
            <Icon name="heart" size={30} color={K.gold} />
            50 岁时对关系最满意的人，80 岁时最健康
          </div>
        </In>
      </Box>
      <Src>哈佛成人发展研究 · 研究官网、Harvard Gazette 2017 · 只有男性，观察性研究，相关不等于因果</Src>
    </AbsoluteFill>
  );
};

// ---------- 97 s: the meta-analysis behind it ----------

const BARS = [
  { label: "关系较弱", v: 1, c: "#8a8c8e", note: "×1" },
  { label: "关系较强", v: 1.5, c: K.theme, note: "×1.5" },
];

export const Survive: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 400, fontFamily: FONT }}>
        <In at={0.5} from="fade">
          <svg width={19 * 28} height={8 * 28}>
            {Array.from({ length: 148 }, (_, i) => {
              const p = progAt(frame, 0.5 + (i / 148) * 1.6, 0.5, EO);
              return <circle key={i} cx={(i % 19) * 28 + 14} cy={Math.floor(i / 19) * 28 + 14} r={8.5 * p} fill={K.steelHi} fillOpacity={0.85} />;
            })}
          </svg>
          <div style={{ marginTop: 22, fontSize: 60, fontWeight: 900, color: K.fg, lineHeight: 1 }}>148 <span style={{ fontSize: 32 }}>项研究</span></div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 900, color: K.sub }}>合计 30.9 万人</div>
        </In>
      </div>
      <div style={{ position: "absolute", left: 780, top: 420, width: 1050, fontFamily: FONT }}>
        <In at={2} from="fade">
          <div style={{ fontSize: 32, fontWeight: 700, color: K.sub, marginBottom: 34 }}>跟踪期间活下来的几率（比值）</div>
        </In>
        {BARS.map((b, i) => {
          const p = progAt(frame, 2.5 + i * 1.2, 1.4, EO);
          return (
            <div key={b.label} style={{ marginBottom: 48, opacity: Math.min(1, p * 2) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 32, fontWeight: 900, color: i ? K.fg : K.sub, marginBottom: 10 }}>
                <Icon name="people" size={32} color={b.c} />
                {b.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 560 * b.v * p, height: 96, borderRadius: 12, background: b.c, boxShadow: i ? `0 0 40px ${K.theme}55` : undefined }} />
                <span style={{ fontSize: i ? 80 : 52, fontWeight: 900, color: b.c }}>{b.note}</span>
              </div>
            </div>
          );
        })}
      </div>
      <Box x={110} y={110} style={{ gap: 8 }}>
        <Head at={0} parts={["关系更紧密的人，"]} size={76} />
        <Head at={1.5} parts={["存活几率高 ", { t: "50%", c: K.theme }, "。"]} size={76} />
      </Box>
      <Src>Holt-Lunstad、Smith、Layton 2010 · PLoS Medicine · 148 项研究、30.9 万人 · 观察性研究合并，相关不是因果</Src>
    </AbsoluteFill>
  );
};

