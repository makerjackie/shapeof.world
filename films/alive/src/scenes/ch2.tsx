import React from "react";
import { AbsoluteFill, interpolateColors, random } from "remotion";
import { COLS, EMPTY, geo, GridBox, LifeGrid, ROWS } from "../grid";
import { EBACK, EIO, EO, In, progAt } from "../fx";
import { Icon, IconName } from "../icons";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Branch, branchPts, LIFE_BRANCHES, TBranch, TipLabel, TREE, Trunk } from "../tree";
import { Box, Head, Src } from "../ui";

// A field of n small dots, one per study.
const Dots: React.FC<{ n: number; cols: number; at: number; color: string; pitch?: number; r?: number }> = ({ n, cols, at, color, pitch = 22, r = 6 }) => {
  const frame = useBeatFrame();
  const rows = Math.ceil(n / cols);
  return (
    <svg width={cols * pitch} height={rows * pitch} style={{ display: "block" }}>
      {Array.from({ length: n }, (_, i) => {
        const p = progAt(frame, at + (i / n) * 1.5, 0.5, EO);
        return <circle key={i} cx={(i % cols) * pitch + pitch / 2} cy={Math.floor(i / cols) * pitch + pitch / 2} r={r * p} fill={color} fillOpacity={0.85} />;
      })}
    </svg>
  );
};

// ---------- 52 s: a loved thing, stamped with "should" ----------

const STAMPS: [string, number, number, number][] = [
  // text, beat, x offset, rotation
  ["每天打卡", 2.5, -40, -9],
  ["考核", 4.5, 120, 7],
  ["必须完成", 6.5, 10, -4],
];
const CARD = { x: 170, y: 330, s: 380 };
const GREY = "#6d6f72";

export const Stamp: React.FC = () => {
  const frame = useBeatFrame();
  const drain = STAMPS.reduce((a, [, at]) => a + progAt(frame, at + 0.15, 0.8, EO) / STAMPS.length, 0);
  const col = interpolateColors(drain, [0, 1], [K.theme, GREY]);
  const glow = 1 - drain;
  return (
    <AbsoluteFill>
      {/* The card: a loved thing, its hours lit in a small calendar. */}
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.s, height: CARD.s }}>
        <In at={0} from="scale">
          <div style={{ position: "relative", width: CARD.s, height: CARD.s, borderRadius: 34, background: `${col}22`, border: `4px solid ${col}`, boxShadow: `0 0 ${20 + 90 * glow}px ${K.theme}${Math.round(0x55 * glow).toString(16).padStart(2, "0")}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <Icon name="brush" size={120} color={col} w={1.6} />
            <svg width={7 * 30} height={4 * 30}>
              {Array.from({ length: 28 }, (_, i) => {
                const on = random(`cal${i}`) < 0.75 - 0.55 * drain;
                return <rect key={i} x={(i % 7) * 30 + 3} y={Math.floor(i / 7) * 30 + 3} width={24} height={24} rx={5} fill={on ? col : K.fg} fillOpacity={on ? 0.85 : 0.1} />;
              })}
            </svg>
          </div>
        </In>
        {STAMPS.map(([t, at, dx, rot]) => {
          const p = progAt(frame, at, 0.55, EBACK);
          if (p <= 0) return null;
          return (
            <div key={t} style={{ position: "absolute", left: 40 + dx, top: 70 + STAMPS.findIndex((s) => s[0] === t) * 95, transform: `rotate(${rot}deg) scale(${1 + (1 - p) * 1.6})`, opacity: Math.min(1, p * 3), padding: "8px 22px", border: `5px solid ${K.steelHi}`, borderRadius: 12, color: K.steelHi, fontFamily: FONT, fontSize: 44, fontWeight: 900, whiteSpace: "nowrap", background: "rgba(7,9,11,0.55)" }}>
              {t}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: CARD.x, width: CARD.s, top: CARD.y + CARD.s + 22, textAlign: "center", fontFamily: FONT, fontSize: 36, fontWeight: 900, color: col }}>喜欢的事</div>
      {/* The research, in three steps. */}
      <div style={{ position: "absolute", left: 790, top: 300, width: 1050, fontFamily: FONT }}>
        <In at={1} from="fade">
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Dots n={128} cols={16} at={1} color={K.steelHi} pitch={20} r={5.5} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 64, fontWeight: 900, color: K.fg, lineHeight: 1 }}>128 <span style={{ fontSize: 34 }}>项实验</span></span>
              <span style={{ fontSize: 26, fontWeight: 600, color: K.sub }}>Deci 等 1999 的元分析</span>
            </div>
          </div>
        </In>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
          {(
            [
              ["coin", "一组人做完就给奖励，另一组不给", 3],
              ["clock", "奖励停了，看自由时间里谁还主动去做", 5],
              ["brush", "拿过奖励的那组，主动去做的更少", 7],
            ] as [IconName, string, number][]
          ).map(([ic, t, at], i) => (
            <In key={i} at={at} from="left" dist={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ width: 44, height: 44, borderRadius: 22, background: `${K.steel}33`, border: `2px solid ${K.steel}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: K.steelHi }}>{i + 1}</span>
                <Icon name={ic} size={34} color={K.steelHi} />
                <span style={{ fontSize: 34, fontWeight: 700, color: i === 2 ? K.fg : K.sub }}>{t}</span>
              </div>
            </In>
          ))}
        </div>
        <In at={9} from="fade">
          <div style={{ marginTop: 30, display: "inline-block", padding: "8px 18px", borderRadius: 12, border: `1.5px dashed ${K.muted}`, fontSize: 24, fontWeight: 600, color: K.sub }}>
            有争议：Cameron & Pierce 1994 的元分析认为，总体影响很小
          </div>
        </In>
      </div>
      <Box x={110} y={92} style={{ gap: 8 }}>
        <Head at={0} parts={["把喜欢的事，变成", { t: "“应该”", c: K.steelHi }, "，"]} size={68} />
        <Head at={9} parts={["兴趣", { t: "可能会变淡", c: K.sub }, "。"]} size={68} />
      </Box>
      <Src>Deci、Koestner、Ryan 1999 · 128 项实验：与任务挂钩的奖励，降低之后的自发投入（自由选择上 d ≈ −0.36 到 −0.40）· 学界有争议</Src>
    </AbsoluteFill>
  );
};

// ---------- 60 s: a loved square that nobody pushes keeps growing across the years ----------

const GR: GridBox = { x: 790, y: 250, pitch: 13, cell: 10 };
const GG = geo(GR);
const SEED = { col: 14, row: 30 };
// When each square lights (0–1 of the growth), or Infinity if never: a widening, wandering vine to the right.
const GROW_T = (() => {
  const t = new Float32Array(COLS * ROWS).fill(Infinity);
  for (let col = SEED.col; col < COLS; col++) {
    const k = (col - SEED.col) / (COLS - SEED.col);
    const centre = SEED.row + 7 * Math.sin((col - SEED.col) / 8) - 6 * k;
    const half = 0.6 + k * 9;
    for (let row = 0; row < ROWS; row++) {
      const d = Math.abs(row - centre);
      if (d > half + random(`gw${col}-${row}`) * 1.5) continue;
      t[col * ROWS + row] = Math.min(1, k * 0.85 + (d / (half + 1)) * 0.12 + random(`gt${col}-${row}`) * 0.04);
    }
  }
  return t;
})();

export const Grow: React.FC = () => {
  const frame = useBeatFrame();
  const g = progAt(frame, 1, 10, EIO);
  const seed = progAt(frame, 0.2, 0.8, EBACK);
  const paint = (col: number, row: number) => {
    if (col === SEED.col && row === SEED.row && seed > 0) return { c: K.themeHi, o: 0.6 + 0.4 * seed };
    const t = GROW_T[col * ROWS + row];
    if (t === Infinity || g < t) return EMPTY;
    const age = g - t;
    return { c: age < 0.05 ? K.themeHi : interpolateColors(random(`gc${col}-${row}`), [0, 1], [K.theme, K.gold]), o: Math.min(0.95, 0.35 + age * 6) };
  };
  const front = SEED.col + (COLS - SEED.col) * Math.min(1, g / 0.85);
  return (
    <AbsoluteFill>
      <LifeGrid {...GR} paint={paint}>
        {seed > 0 ? <circle cx={GG.colX(SEED.col) + GR.cell / 2} cy={GG.rowY(SEED.row) + GR.cell / 2} r={14 + 20 * (1 - seed)} fill="none" stroke={K.themeHi} strokeWidth={2} opacity={seed * (1 - g * 2)} /> : null}
        {g > 0.02 && g < 1 ? <line x1={GG.colX(Math.min(COLS - 1, front)) + 6} y1={GR.y - 10} x2={GG.colX(Math.min(COLS - 1, front)) + 6} y2={GR.y + GG.h + 10} stroke={K.themeHi} strokeWidth={1.5} strokeOpacity={0.5} /> : null}
      </LifeGrid>
      <div style={{ position: "absolute", left: GG.colX(SEED.col) - 40, top: GG.rowY(SEED.row) - 74, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.themeHi, whiteSpace: "nowrap" }}>
        <In at={0.5} out={6} from="fade">
          <div style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(7,9,11,0.85)", border: `1.5px solid ${K.theme}` }}>一个真心喜欢的格子</div>
          <div style={{ marginLeft: 44, width: 2, height: 22, background: K.themeHi }} />
        </In>
      </div>
      {[0, 20, 40, 60, 79].map((a) => (
        <div key={a} style={{ position: "absolute", left: GG.colX(a) - 35, width: 80, top: GR.y + GG.h + 12, textAlign: "center", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>{a} 岁</div>
      ))}
      <Box x={110} y={250} style={{ gap: 14 }}>
        <Head at={0} parts={["真感兴趣的时候，"]} size={68} />
        <Head at={2.5} parts={[{ t: "不用催", c: K.theme }, "，"]} size={68} />
        <Head at={4} parts={["自己就走远了。"]} size={68} />
      </Box>
      <div style={{ position: "absolute", left: 110, top: 600, width: 620, fontFamily: FONT }}>
        <In at={6} from="up" dist={20}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Dots n={183} cols={16} at={6} color={K.theme} pitch={17} r={4.5} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: K.fg, lineHeight: 1 }}>183 <span style={{ fontSize: 28 }}>项研究</span></span>
              <span style={{ fontSize: 30, fontWeight: 900, color: K.sub }}>约 21 万人</span>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub, marginTop: 18, lineHeight: 1.4 }}>
            发自内心的动机，和做得好不好
            <br />
            中到强相关（ρ 0.21–0.45）· 相关，不是因果
          </div>
        </In>
      </div>
      <Src>Cerasoli、Nicklin、Ford 2014 · 183 项研究、212,468 人的元分析：内在动机预测表现，有无外部激励都成立</Src>
    </AbsoluteFill>
  );
};

// ---------- 69 s: the fair word, on the interlude ----------

const OBLIG: [number, number, string, IconName, number][] = [
  // branch index, position along it, text, icon, beat
  [3, 0.72, "交房租", "key", 2],
  [1, 0.58, "照顾家人", "people", 2.7],
  [2, 0.5, "养家糊口", "bowl", 3.4],
];

export const Fair: React.FC = () => {
  const frame = useBeatFrame();
  const bs: TBranch[] = LIFE_BRANCHES.map((b) => ({ ...b, grow: 1, o: 0.8 }));
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {bs.map((b, i) => (
          <Branch key={i} g={TREE} b={b} />
        ))}
        <Trunk g={TREE} glow={0.5} />
      </svg>
      {bs.map((b, i) => (
        <TipLabel key={i} g={TREE} b={b} o={0.55} size={26} />
      ))}
      {OBLIG.map(([bi, u, t, ic, at]) => {
        const pts = branchPts(TREE, bs[bi]);
        const [x, y] = pts[Math.round(u * (pts.length - 1))];
        const p = progAt(frame, at, 1, EBACK);
        if (p <= 0) return null;
        const sw = Math.sin((frame - at * FPB) / 8) * 6 * Math.max(0, 1 - (frame - at * FPB) / 50);
        return (
          <div key={t} style={{ position: "absolute", left: x - 2, top: y, transformOrigin: "0 0", transform: `translateY(${(1 - p) * -80}px) rotate(${sw}deg)`, opacity: Math.min(1, p * 2) }}>
            <div style={{ width: 2, height: 34, background: K.sub }} />
            <div style={{ marginLeft: -70, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 14, background: "#1d222b", border: `2px solid ${K.steelHi}`, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>
              <Icon name={ic} size={30} color={K.steelHi} />
              {t}
            </div>
          </div>
        );
      })}
      <Box x={960} y={84} cx style={{ gap: 6 }}>
        <Head at={0} parts={["有些事，", { t: "不喜欢也得做", c: K.steelHi }, "。"]} size={72} />
        <Head at={6.5} parts={["没关系，", { t: "那是支线", c: K.steelHi }, "。"]} size={72} />
      </Box>
    </AbsoluteFill>
  );
};

// ---------- 76 s: a branch breaks; the trunk carries on ----------

export const Break: React.FC = () => {
  const frame = useBeatFrame();
  const fall = progAt(frame, 9.5, 3.5, EIO);
  const carry = progAt(frame, 12.5, 1, EO);
  const bs: TBranch[] = LIFE_BRANCHES.map((b, i) => ({ ...b, grow: 1, o: i === 1 ? 1 : 0.75, ...(i === 1 && frame >= 9.5 * FPB ? { cut: 0.42, fall } : {}) }));
  const crack = progAt(frame, 9.5, 0.7, EO);
  const cp = branchPts(TREE, bs[1]);
  const [cx, cy] = cp[Math.round(0.42 * (cp.length - 1))];
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {bs.map((b, i) => (
          <Branch key={i} g={TREE} b={b} />
        ))}
        <Trunk g={TREE} glow={0.5 + 0.5 * carry} run={carry > 0 ? ((frame - 12.5 * FPB) / (FPB * 5)) % 1 : undefined} />
        {crack > 0 && crack < 1 ? <circle cx={cx} cy={cy} r={8 + 60 * crack} fill="none" stroke={K.fg} strokeOpacity={0.7 * (1 - crack)} strokeWidth={2.5} /> : null}
      </svg>
      {bs.map((b, i) => (
        <TipLabel key={i} g={TREE} b={b} o={i === 1 ? 1 - fall : 0.6} size={26} />
      ))}
      <Box x={960} y={84} cx style={{ gap: 6 }}>
        <Head at={0} out={9} parts={["别把支线，", { t: "当成活着的意义", c: K.theme }, "。"]} size={72} />
      </Box>
      <Box x={960} y={84} cx style={{ gap: 6 }}>
        <Head at={10} parts={[{ t: "支线会断，", c: K.steelHi }]} size={72} />
        <Head at={12.5} parts={[{ t: "主线一直在", c: K.theme }, "。"]} size={84} />
      </Box>
    </AbsoluteFill>
  );
};

