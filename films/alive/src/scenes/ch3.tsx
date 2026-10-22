import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, random } from "remotion";
import { CL, EIO, EO, In, Odometer, progAt } from "../fx";
import { Icon, Person } from "../icons";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Box, Head, Src } from "../ui";

// ---------- 86 s: the one discovery, on the music's re-entry ----------
// The Harvard Study of Adult Development: the Grant Study (268 Harvard sophomores, classes of 1939–1944) and the
// Glueck Study (456 men who grew up in Boston's inner city), followed since 1938. A playhead runs along the years;
// the men age; by 2017 (Harvard Gazette) 19 and 40 of them were still living. Then the threads between them light up.

const AX = { x0: 140, x1: 1780, y: 860 };
const yearX = (y: number) => AX.x0 + ((y - 1938) / (2026 - 1938)) * (AX.x1 - AX.x0);
const FP = { x: 16, y: 27, h: 22 };
type Cohort = { n: number; cols: number; x: number; alive2017: number; name: string; who: string };
const COHORTS: Cohort[] = [
  { n: 268, cols: 17, x: 170, alive2017: 19, name: "Grant 组", who: "268 名哈佛大二学生" },
  { n: 456, cols: 24, x: 470, alive2017: 40, name: "Glueck 组", who: "456 名波士顿市中心长大的男孩" },
];
const BOTTOM = 800;
const posOf = (c: Cohort, i: number) => {
  const rows = Math.ceil(c.n / c.cols);
  const row = Math.floor(i / c.cols);
  return { x: c.x + (i % c.cols) * FP.x + FP.x / 2, y: BOTTOM - (rows - 1 - row) * FP.y };
};
const topOf = (c: Cohort) => BOTTOM - Math.ceil(c.n / c.cols) * FP.y - 10;
// Which men are among the 2017 survivors (fixed at random).
const SURV = COHORTS.map((c) => {
  const idx = Array.from({ length: c.n }, (_, i) => i).sort((a, b) => random(`s${c.n}${a}`) - random(`s${c.n}${b}`));
  return new Set(idx.slice(0, c.alive2017));
});
// Threads: each man to a near neighbour or two.
const THREADS = COHORTS.map((c, ci) => {
  const out: [number, number][] = [];
  for (let i = 0; i < c.n; i++) {
    const n = random(`tn${ci}-${i}`) < 0.6 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const dx = Math.floor(random(`tx${ci}-${i}-${k}`) * 3) - 1;
      const dy = Math.floor(random(`ty${ci}-${i}-${k}`) * 3) - 1;
      const j = i + dy * c.cols + dx;
      if (j >= 0 && j < c.n && j !== i) out.push([i, j]);
    }
  }
  return out;
});

export const Harvard: React.FC = () => {
  const frame = useBeatFrame();
  const appear = progAt(frame, 0.3, 1.6, EO);
  const play = progAt(frame, 2.2, 6, EIO);
  const year = 1938 + (2017 - 1938) * play;
  const ageing = interpolate(year, [1945, 2005], [0, 1], CL);
  const passing = interpolate(year, [1985, 2017], [0, 1], CL);
  const web = progAt(frame, 10, 3, EIO);
  const axis = progAt(frame, 0.5, 1.5, EO);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* Threads (relationships), the reveal. */}
        {COHORTS.map((c, ci) =>
          THREADS[ci].map(([i, j], k) => {
            const t = interpolate(web * 1.25 - (k / THREADS[ci].length) * 0.25, [0, 0.4], [0, 1], CL);
            if (t <= 0) return null;
            const a = posOf(c, i);
            const b = posOf(c, j);
            return <line key={`${ci}-${k}`} x1={a.x} y1={a.y - 12} x2={a.x + (b.x - a.x) * t} y2={a.y - 12 + (b.y - a.y) * t} stroke={K.gold} strokeWidth={1.4} strokeOpacity={0.6} />;
          }),
        )}
        {COHORTS.map((c, ci) =>
          Array.from({ length: c.n }, (_, i) => {
            const p = posOf(c, i);
            const a = Math.min(1, Math.max(0, appear * 1.4 - (i / c.n) * 0.4));
            if (a <= 0) return null;
            const gone = !SURV[ci].has(i) && random(`d${ci}${i}`) < passing * (1 - c.alive2017 / c.n) * 1.08;
            const head = interpolateColors(ageing, [0, 1], ["#c98a5a", "#e8e6e1"]);
            const body = ci === 0 ? K.themeHi : K.sub;
            return <Person key={`${ci}-${i}`} x={p.x} y={p.y} h={FP.h} color={body} head={head} age={ageing} o={a * (gone ? 0.45 : 0.95)} outline={gone} />;
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
        {/* Age markers for the Harvard men (born around 1920). */}
        {[
          [1940, "约 20 岁"],
          [1970, "约 50 岁"],
          [2000, "约 80 岁"],
        ].map(([y]) => (
          <g key={y as number} opacity={interpolate(year, [(y as number) - 2, (y as number) + 2], [0, 1], CL)}>
            <circle cx={yearX(y as number)} cy={AX.y} r={5} fill={K.fg} />
          </g>
        ))}
      </svg>
      {[1938, 1960, 1980, 2000, 2017, 2026].map((y) => (
        <div key={y} style={{ position: "absolute", left: yearX(y) - 40, width: 80, top: AX.y + 14, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.muted, opacity: axis }}>{y}</div>
      ))}
      {[
        [1940, "约 20 岁"],
        [1970, "约 50 岁"],
        [2000, "约 80 岁"],
      ].map(([y, t]) => (
        <div key={y as number} style={{ position: "absolute", left: yearX(y as number) - 50, width: 100, top: AX.y - 44, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 900, color: K.fg, opacity: interpolate(year, [(y as number) - 2, (y as number) + 2], [0, 1], CL) }}>{t}</div>
      ))}
      <div style={{ position: "absolute", left: yearX(year) - 70, width: 140, top: AX.y - 100, textAlign: "center", opacity: play > 0 && play < 1 ? 1 : play >= 1 ? 0.0 : 0 }}>
        <Odometer value={Math.floor(year)} size={40} sep={false} color={K.themeHi} />
      </div>
      <div style={{ position: "absolute", left: yearX(2017) - 150, width: 300, top: AX.y - 104, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.sub, opacity: progAt(frame, 8.2, 0.8, EO) * (1 - web) }}>
        2017 年仍健在：19 人 · 40 人
      </div>
      {COHORTS.map((c, i) => (
        <div key={c.name} style={{ position: "absolute", left: c.x, top: topOf(c) - 70, fontFamily: FONT }}>
          <In at={0.6 + i * 0.4} from="up" dist={14}>
            <div style={{ fontSize: 30, fontWeight: 900, color: i === 0 ? K.themeHi : K.fg }}>{c.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>{c.who}</div>
          </In>
        </div>
      ))}
      <Box x={110} y={92}>
        <Head at={0} parts={["1938 年起，哈佛", { t: "跟踪了两组人的一生", c: K.theme }, "："]} size={64} />
      </Box>
      <Box x={930} y={330} style={{ gap: 14 }}>
        <In at={9} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub }}>跟到老，最能预示他们健康、快乐的——</div>
        </In>
        <Head at={10.5} parts={[{ t: "是关系，", c: K.gold }, "不是成就。"]} size={96} />
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

