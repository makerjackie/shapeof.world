import React from "react";
import { AbsoluteFill } from "remotion";
import { COLS, EMPTY, geo, GridBox, LifeGrid } from "../grid";
import { EBACK, EIO, EO, In, progAt, Tag } from "../fx";
import { Icon, IconName, Person } from "../icons";
import { useBeatFrame } from "../kit";
import { FONT, K, USE } from "../theme";
import { FPB } from "../timing";
import { Branch, LIFE_BRANCHES, TBranch, TipLabel, TREE, Trunk, ageX, trunkY } from "../tree";
import { Box, Head, Src } from "../ui";

// ---------- 22 s: an average day, spread over a life ----------
// 2018 time-use survey (NBS, 11 provinces, everyone 15+), minutes a day; they add up to 1440. Each category gets
// round(4108 × minutes / 1440) of the life's squares, painted in reading order (row by row), so the areas are the
// true shares. Years = minutes / 1440 × 79 (derived, flagged on screen).
type Cat = { name: string; icon: IconName; min: number; n: number; c: string };
const CATS: Cat[] = [
  { name: "睡觉休息", icon: "moon", min: 559, n: 1595, c: USE.sleep },
  { name: "吃饭、洗漱", icon: "bowl", min: 154, n: 439, c: USE.meals },
  { name: "工作", icon: "bag", min: 264, n: 753, c: USE.work },
  { name: "路上", icon: "bus", min: 38, n: 108, c: USE.travel },
  { name: "家务、照顾家人", icon: "home", min: 162, n: 462, c: USE.chores },
  { name: "学习", icon: "book", min: 27, n: 77, c: USE.study },
  { name: "自己的时间", icon: "sun", min: 236, n: 674, c: USE.free },
];
const STARTS = CATS.reduce<number[]>((a, c, i) => [...a, (a[i - 1] ?? 0) + (i ? CATS[i - 1].n : 0)], []);
const HAVE = [2, 3, 4]; // work, travel, chores: the things you have to do
const D: GridBox = { x: 110, y: 250, pitch: 14, cell: 11 };
const DG = geo(D);
const catOf = (idx: number) => {
  for (let i = CATS.length - 1; i >= 0; i--) if (idx >= STARTS[i]) return i;
  return 0;
};
const bandY = (i: number) => D.y + ((STARTS[i] + CATS[i].n / 2) / COLS) * D.pitch;
const bandSpan = (ids: number[]) => [D.y + (STARTS[ids[0]] / COLS) * D.pitch, D.y + ((STARTS[ids[ids.length - 1]] + CATS[ids[ids.length - 1]].n) / COLS) * D.pitch - (D.pitch - D.cell)];
const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const LABEL_X = 1300;
const rowY = (i: number) => 262 + i * 106;

export const LifeDay: React.FC = () => {
  const frame = useBeatFrame();
  const paintAt = (i: number) => 1 + 1.7 * i;
  const phase2 = progAt(frame, 16, 1.2, EIO);
  const prog = CATS.map((_, i) => progAt(frame, paintAt(i), 1.4, EIO));
  const paint = (col: number, row: number) => {
    const idx = row * COLS + col;
    const i = catOf(idx);
    const p = prog[i];
    if ((idx - STARTS[i]) / CATS[i].n >= p) return EMPTY;
    const base = i === 0 ? 0.62 - 0.45 * phase2 : HAVE.includes(i) ? 0.85 : 0.8 - (i === 6 ? 0 : 0.35 * phase2);
    return { c: CATS[i].c, o: base };
  };
  const labelsO = 1 - phase2;
  const [h0, h1] = bandSpan(HAVE);
  const [m0, m1] = bandSpan([1]);
  const [f0, f1] = bandSpan([5, 6]);
  const br = progAt(frame, 16.5, 1.2, EO);
  const bracket = (y0: number, y1: number, c: string) => (
    <path d={`M ${D.x + DG.w + 8} ${y0} L ${D.x + DG.w + 18} ${y0} L ${D.x + DG.w + 18} ${y1} L ${D.x + DG.w + 8} ${y1} M ${D.x + DG.w + 18} ${(y0 + y1) / 2} L ${LABEL_X - 16} ${(y0 + y1) / 2}`} stroke={c} strokeWidth={2.5} fill="none" opacity={br} />
  );
  return (
    <AbsoluteFill>
      <LifeGrid {...D} paint={paint}>
        {/* Leaders from each band to its label (phase 1). */}
        {CATS.map((c, i) => {
          const o = progAt(frame, paintAt(i) + 0.4, 0.8, EO) * labelsO;
          if (o <= 0.01) return null;
          const y0 = bandY(i);
          const y1 = rowY(i) + 26;
          const xe = D.x + DG.w;
          return <path key={i} d={`M ${xe + 6} ${y0} L ${xe + 30} ${y0} L ${LABEL_X - 50} ${y1} L ${LABEL_X - 14} ${y1}`} stroke={c.c} strokeWidth={2} fill="none" opacity={0.8 * o} />;
        })}
        {bracket(m0, m1, USE.meals)}
        {bracket(h0, h1, USE.work)}
        {bracket(f0, f1, USE.free)}
      </LifeGrid>
      {/* Phase 1: seven labels, one per category. */}
      {CATS.map((c, i) => {
        const o = progAt(frame, paintAt(i) + 0.3, 0.8, EO) * labelsO;
        if (o <= 0.01) return null;
        const years = (c.min / 1440) * 79;
        return (
          <div key={i} style={{ position: "absolute", left: LABEL_X, top: rowY(i), width: 560, height: 52, display: "flex", alignItems: "center", gap: 14, opacity: o, transform: `translateX(${(1 - o) * 30}px)`, fontFamily: FONT }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${c.c}26`, border: `2px solid ${c.c}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={c.icon} size={30} color={c.c} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: K.fg }}>{c.name}</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: K.muted }}>每天 {hm(c.min)}</span>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 44, fontWeight: 900, color: c.c, fontVariantNumeric: "tabular-nums" }}>
              {years.toFixed(1)}<span style={{ fontSize: 26, marginLeft: 6 }}>年</span>
            </div>
          </div>
        );
      })}
      {/* Phase 2: the waking day in three parts. */}
      <div style={{ position: "absolute", left: LABEL_X, top: 300, width: 560, opacity: phase2, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: K.muted, fontSize: 28, fontWeight: 700 }}>
          <Icon name="moon" size={28} color={USE.sleep} />睡着的时间先不算
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: K.sub, marginTop: 12 }}>醒着的每一天：14 小时 41 分 = 100%</div>
      </div>
      <Group y={(m0 + m1) / 2} at={16.5} c={USE.meals} pct="17%" name="吃饭、洗漱" small />
      <Group y={(h0 + h1) / 2} at={17} c={USE.work} pct="53%" name="要做的事" note="工作 + 路上 + 家务、照顾家人 · 每天 7:44" big />
      <Group y={(f0 + f1) / 2} at={17.5} c={USE.free} pct="30%" name="自己的时间" note="含学习 · 每天 4:23" />
      <div style={{ position: "absolute", left: LABEL_X, top: (h0 + h1) / 2 + 88 }}>
        <In at={18.5} from="fade">
          <Tag color={K.sub} size={22}>推算 · 含不上班的人</Tag>
        </In>
      </div>
      <Box x={110} y={92} style={{ gap: 10 }}>
        <Head at={0} out={15.6} parts={["把平均的一天，", { t: "摊到一生", c: K.theme }, "："]} size={64} />
      </Box>
      <Box x={110} y={92} style={{ gap: 10 }}>
        <Head at={16} parts={["醒着的时间里，", { t: "一半多", c: USE.work }, "给了“要做的事”。"]} size={64} />
      </Box>
      <div style={{ position: "absolute", left: 112, top: 178, opacity: 1 - phase2 }}>
        <In at={0.5} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 600, color: K.sub }}>一格一周 · 按 2018 年 15 岁以上居民的平均一天 × 79 年推算 · 含不上班的人</div>
        </In>
      </div>
      <Src>国家统计局 · 2018 年全国时间利用调查（11 省市，48,580 人）· 年数 = 每天分钟数 ÷ 1440 × 79 · 53% = 7:44 ÷ 14:41</Src>
    </AbsoluteFill>
  );
};

const Group: React.FC<{ y: number; at: number; c: string; pct: string; name: string; note?: string; big?: boolean; small?: boolean }> = ({ y, at, c, pct, name, note, big, small }) => (
  <div style={{ position: "absolute", left: LABEL_X, top: y - (big ? 62 : small ? 26 : 44) }}>
    <In at={at} from="left" dist={20}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, fontFamily: FONT, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: big ? 110 : small ? 40 : 64, fontWeight: 900, color: c, letterSpacing: big ? -3 : 0, lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: big ? 40 : small ? 28 : 34, fontWeight: 900, color: K.fg }}>{name}</span>
      </div>
      {note ? <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: K.sub, marginTop: 6, whiteSpace: "nowrap" }}>{note}</div> : null}
    </In>
  </div>
);

// ---------- 37 s: the life tree; branches are named, then the trunk ----------

export const lifeBranches = (frame: number, start = 0.5, step = 1, o = 1): TBranch[] =>
  LIFE_BRANCHES.map((b, i) => ({ ...b, grow: progAt(frame, start + i * step, 1.8, EO), o }));

export const Tree: React.FC = () => {
  const frame = useBeatFrame();
  const bs = lifeBranches(frame, 0.4, 0.9);
  const named = progAt(frame, 9.5, 1.2, EO);
  const fadeB = 1 - 0.45 * named;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {bs.map((b, i) => (
          <Branch key={i} g={TREE} b={{ ...b, o: fadeB }} />
        ))}
        <Trunk g={TREE} glow={0.5 + 0.5 * named} run={named > 0 ? ((frame - 9.5 * FPB) / (FPB * 6)) % 1 : undefined} />
        <circle cx={TREE.x0} cy={trunkY(TREE, TREE.x0)} r={30} fill={K.bg} stroke={K.theme} strokeWidth={3} opacity={named} />
      </svg>
      {bs.map((b, i) => (
        <TipLabel key={i} g={TREE} b={{ ...b, o: fadeB }} o={progAt(frame, 0.4 + i * 0.9 + 1.2, 0.8, EO)} size={28} />
      ))}
      <div style={{ position: "absolute", left: TREE.x0 - 18, top: trunkY(TREE, TREE.x0) - 18, opacity: named }}>
        <Icon name="heart" size={36} color={K.theme} />
      </div>
      <div style={{ position: "absolute", left: TREE.x0 - 40, top: trunkY(TREE, TREE.x0) + 40, opacity: named, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.theme }}>活着</div>
      <div style={{ position: "absolute", left: ageX(TREE, 79) - 30, top: trunkY(TREE, ageX(TREE, 79)) + 26, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.muted }}>79 岁</div>
      <Box x={960} y={84} cx style={{ gap: 6 }}>
        <Head at={0} out={9} parts={["上学、工作、赚钱、买房、升职——"]} size={60} />
        <Head at={3} out={9} parts={[{ t: "这些，是支线", c: K.steelHi }, "。"]} size={76} />
      </Box>
      <Box x={960} y={120} cx>
        <Head at={9.5} parts={["中间这条，", { t: "是主线：活着", c: K.theme }, "。"]} size={80} />
      </Box>
    </AbsoluteFill>
  );
};

// ---------- 45 s: Gallup, one figure = 2 % of workers ----------

const ROWS_G = [
  { name: "全球", groups: [10, 32, 8], pct: ["20%", "64%", "16%"], y: 520, at: 3 },
  { name: "东亚", groups: [9, 33, 8], pct: ["18%", "66%", "16%"], y: 790, at: 5.5 },
];
const GKIND = [
  { label: "敬业", c: K.theme },
  { label: "不敬业", c: "#9a9c9e" },
  { label: "主动消极", c: K.steelLo },
];
const GX = 330;
const GP = 30;

export const Gallup: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {ROWS_G.map((r, ri) => {
          const lit = progAt(frame, r.at, 1, EO);
          let k = 0;
          return r.groups.map((n, gi) =>
            Array.from({ length: n }, () => {
              const i = k++;
              const pop = progAt(frame, 0.5 + ri * 0.6 + i * 0.025, 0.8, EBACK);
              if (pop <= 0) return null;
              const x = GX + i * GP + 12;
              const base = gi === 0 ? K.fg : GKIND[gi].c;
              const c = gi === 0 && lit > 0.05 ? K.theme : base;
              const o = gi === 0 ? 0.4 + 0.6 * lit : gi === 1 ? 0.45 : 0.75;
              return (
                <g key={`${ri}-${i}`} transform={`translate(0 ${(1 - Math.min(1, pop)) * 20})`}>
                  {gi === 0 && lit > 0.05 ? <circle cx={x} cy={r.y - 24} r={22} fill={K.theme} fillOpacity={0.18 * lit} /> : null}
                  <Person x={x} y={r.y} h={46} color={c} o={o * Math.min(1, pop)} />
                </g>
              );
            }),
          );
        })}
        {/* Group brackets. */}
        {ROWS_G.map((r, ri) => {
          const b = progAt(frame, r.at + 1, 1, EO);
          let s = 0;
          return r.groups.map((n, gi) => {
            const x0 = GX + s * GP;
            s += n;
            const x1 = GX + s * GP - 6;
            return <path key={`${ri}b${gi}`} d={`M ${x0} ${r.y + 12} L ${x0} ${r.y + 20} L ${x0 + (x1 - x0) * b} ${r.y + 20}`} stroke={GKIND[gi].c} strokeWidth={2.5} fill="none" opacity={b} />;
          });
        })}
      </svg>
      {ROWS_G.map((r, ri) => {
        let s = 0;
        return (
          <React.Fragment key={ri}>
            <div style={{ position: "absolute", left: 110, top: r.y - 62, fontFamily: FONT }}>
              <In at={0.5 + ri * 0.6} from="left" dist={20}>
                <div style={{ fontSize: 44, fontWeight: 900, color: K.fg }}>{r.name}</div>
              </In>
            </div>
            {r.groups.map((n, gi) => {
              const x0 = GX + s * GP;
              s += n;
              return (
                <div key={gi} style={{ position: "absolute", left: x0, top: r.y + 28, fontFamily: FONT, whiteSpace: "nowrap" }}>
                  <In at={r.at + 1 + gi * 0.2} from="up" dist={14}>
                    <span style={{ fontSize: gi === 0 ? 40 : 28, fontWeight: 900, color: GKIND[gi].c }}>{r.pct[gi]}</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: K.sub, marginLeft: 8 }}>{GKIND[gi].label}</span>
                  </In>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", right: 90, top: 262, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: K.muted, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width={20} height={30}>
          <Person x={10} y={29} h={28} color={K.sub} />
        </svg>
        每个小人 = 2% 的员工
      </div>
      <Box x={110} y={100} style={{ gap: 12 }}>
        <Head at={0} parts={["对工作提不起劲？"]} size={72} />
        <In at={1.5} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.sub }}>全世界的员工里，真正投入工作的，只有五分之一。</div>
        </In>
      </Box>
      <Box x={960} y={900} cx>
        <Head at={8} parts={[{ t: "你不是一个人", c: K.theme }, "。"]} size={72} />
      </Box>
      <Src>盖洛普 · 全球职场现状 2026 · 2025 年数据 · “敬业”按盖洛普的定义，自评问卷 · 东亚为区域均值，不等于中国</Src>
    </AbsoluteFill>
  );
};

