import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { BIG, COLS, geo, LifeGrid, ROWS, WEEKS } from "../grid";
import { CL, EBACK, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { AgeTicks, Branch, LIFE_BRANCHES, TBranch, TipLabel, TREE, TreeGeo, Trunk } from "../tree";
import { Box, Head, Src } from "../ui";

// ---------- 0 s: the claim over the life tree ----------

const CLAIM_TREE: TreeGeo = { ...TREE, y: 700 };
const claimBranches = (frame: number): TBranch[] =>
  LIFE_BRANCHES.map((b, i) => ({ ...b, dy: b.dy * 0.8, grow: i < 2 ? 1 : progAt(frame, i - 1, 1.6, EO), o: 0.85 }));

// A soft glow and a thin ring opening out from behind the sentence on the first beat.
const Bloom: React.FC<{ frame: number; y?: number }> = ({ frame, y = 260 }) => {
  const t = frame / 40;
  if (t < 0 || t > 1) return null;
  const e = EO(t);
  const glow = 300 + 1300 * e;
  const ring = 200 + 1500 * e;
  return (
    <>
      <div style={{ position: "absolute", left: 960 - glow / 2, top: y - glow / 2, width: glow, height: glow, borderRadius: "50%", background: `radial-gradient(circle, ${K.themeHi}55 0%, ${K.theme}22 40%, transparent 70%)`, opacity: 1 - t }} />
      <div style={{ position: "absolute", left: 960 - ring / 2, top: y - ring / 2, width: ring, height: ring, borderRadius: "50%", border: `3px solid ${K.themeHi}`, opacity: 0.6 * (1 - t) }} />
    </>
  );
};

export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const hit = frame >= 0 ? Math.max(0, 1 - frame / 24) : 0;
  const bs = claimBranches(frame);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {bs.map((b, i) => (
          <Branch key={i} g={CLAIM_TREE} b={b} />
        ))}
        <Trunk g={CLAIM_TREE} glow={0.5 + 0.5 * hit} />
        <AgeTicks g={CLAIM_TREE} o={0.8} />
      </svg>
      {bs.map((b, i) => (
        <TipLabel key={i} g={CLAIM_TREE} b={b} o={i < 2 ? 1 : progAt(frame, i - 1 + 1.2, 0.8, EO)} size={26} />
      ))}
      <Bloom frame={frame} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", justifyContent: "center", transform: `scale(${1 + 0.025 * hit})` }}>
        <div style={{ fontFamily: FONT, fontSize: 104, fontWeight: 900, color: K.fg, letterSpacing: -2, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.85)" }}>
          <span style={{ color: K.theme }}>活着是主线，</span>其他都是支线。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 4 s: a life fills up, week by week ----------

const G = geo(BIG);
const FILLED = "#efe2cc";

// Squares filled up to week `w` (fractional), the newest ones glowing warm.
export const weekPaint = (w: number) => (col: number, row: number) => {
  const i = col * ROWS + row;
  if (i >= w) return null;
  const age = w - i;
  if (age < 70) return { c: age < 20 ? K.themeHi : K.theme, o: 0.95 - age * 0.004 };
  return { c: FILLED, o: 0.55 };
};

const Callout: React.FC<{ x: number; y: number; at: number; children: React.ReactNode; align?: "left" | "right"; w?: number }> = ({ x, y, at, children, align = "left", w = 260 }) => (
  <div style={{ position: "absolute", left: align === "left" ? x : x - w, top: y, width: w, textAlign: align }}>
    <In at={at} from="fade">
      <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.fg, lineHeight: 1.25 }}>{children}</div>
    </In>
  </div>
);

export const Weeks: React.FC = () => {
  const frame = useBeatFrame();
  const fill = WEEKS * progAt(frame, 0.4, 8, EIO);
  const lead = progAt(frame, 0.5, 1, EO);
  const colB = progAt(frame, 2, 1, EO);
  const topB = progAt(frame, 5.5, 1.2, EO);
  const weeks = Math.floor(fill);
  return (
    <AbsoluteFill>
      <LifeGrid {...BIG} paint={weekPaint(fill)} appear={() => Math.min(1, progAt(frame, -0.4, 0.8, EO))}>
        {/* 一格 = 一周 */}
        <path d={`M 330 232 L 352 232 L ${BIG.x + 5} ${BIG.y + 6}`} stroke={K.fg} strokeWidth={2} fill="none" opacity={lead} />
        <rect x={BIG.x - 3} y={BIG.y - 3} width={BIG.cell + 6} height={BIG.cell + 6} rx={3} fill="none" stroke={K.themeHi} strokeWidth={2} opacity={lead} />
        {/* 一列 = 一年 */}
        <g opacity={colB}>
          <path d={`M ${BIG.x - 18} ${BIG.y} L ${BIG.x - 26} ${BIG.y} L ${BIG.x - 26} ${BIG.y + G.h} L ${BIG.x - 18} ${BIG.y + G.h}`} stroke={K.fg} strokeWidth={2} fill="none" />
          <line x1={330} y1={G.midY} x2={BIG.x - 26} y2={G.midY} stroke={K.fg} strokeWidth={2} />
        </g>
        {/* 79 列 = 79 岁 */}
        <g opacity={topB}>
          <path d={`M ${BIG.x} ${BIG.y - 16} L ${BIG.x} ${BIG.y - 26} L ${BIG.x + G.w * topB} ${BIG.y - 26} L ${BIG.x + G.w * topB} ${BIG.y - 16}`} stroke={K.fg} strokeWidth={2} fill="none" />
          {[0, 10, 20, 30, 40, 50, 60, 70].map((a) => (
            <line key={a} x1={G.colX(a)} y1={BIG.y - 26} x2={G.colX(a)} y2={BIG.y - 20} stroke={K.fg} strokeWidth={2} opacity={G.colX(a) <= BIG.x + G.w * topB ? 1 : 0} />
          ))}
        </g>
      </LifeGrid>
      <Callout x={60} y={208} at={0.5}>一格<br />= 一周</Callout>
      <Callout x={60} y={G.midY - 42} at={2}>一列 = 一年<br /><span style={{ fontSize: 26, color: K.sub }}>52 周</span></Callout>
      <div style={{ position: "absolute", left: BIG.x, width: G.w, top: BIG.y - 82, display: "flex", justifyContent: "center", opacity: topB }}>
        <span style={{ fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.fg }}>79 列 = 79 岁</span>
      </div>
      {/* Counters on the right: the week and the age the fill has reached. */}
      <div style={{ position: "absolute", left: 1600, top: 380, display: "flex", flexDirection: "column", gap: 20, fontFamily: FONT }}>
        <In at={0.4} from="fade">
          <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>第</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <Odometer value={Math.max(1, weeks)} size={84} color={K.theme} />
            <span style={{ fontSize: 36, fontWeight: 900, color: K.fg }}>周</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
            <Odometer value={Math.min(COLS, Math.floor(weeks / ROWS))} size={60} color={K.fg} />
            <span style={{ fontSize: 30, fontWeight: 900, color: K.sub }}>岁</span>
          </div>
        </In>
      </div>
      <OnGrid at={8.8} out={99} />
      <Src>2024 年中国人均预期寿命 79.0 岁 · 国家卫健委 · 79 年 × 52 周 = 4108 格</Src>
    </AbsoluteFill>
  );
};

// The conclusion label laid on the grid itself.
const OnGrid: React.FC<{ at: number; out: number }> = ({ at, out }) => (
  <div style={{ position: "absolute", left: BIG.x, width: G.w, top: G.midY - 80, display: "flex", justifyContent: "center" }}>
    <In at={at} out={out} from="scale">
      <div style={{ padding: "18px 44px", borderRadius: 22, background: "rgba(7,9,11,0.86)", border: `3px solid ${K.theme}`, boxShadow: `0 0 60px ${K.theme}55`, fontFamily: FONT, fontWeight: 900, fontSize: 92, color: K.fg, whiteSpace: "nowrap" }}>
        79 岁 <span style={{ color: K.sub, fontSize: 70 }}>≈</span> <span style={{ color: K.theme }}>4,100 周</span>
      </div>
    </In>
  </div>
);

// ---------- 10 s: one life → one year → one week, then the question ----------

const YC = 30; // the year we zoom into
const PICK = 18; // the week we open
const Q = { pitch: 76, cell: 64 }; // one year as 13 × 4
const QX = 960 - (13 * Q.pitch - (Q.pitch - Q.cell)) / 2;
const QY = 420;
const H = { pitch: 34, cell: 30 }; // one week as 24 hours × 7 days
const HW = 24 * H.pitch - (H.pitch - H.cell);
const HX = 960 - HW / 2 + 40;
const HY = 470;
const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const QUARTERS = ["1–3 月", "4–6 月", "7–9 月", "10–12 月"];

export const Zoom: React.FC = () => {
  const frame = useBeatFrame();
  const focus = progAt(frame, 0.8, 1, EO);
  const lift = progAt(frame, 2.6, 1.6, EIO);
  const open = progAt(frame, 5.8, 1.6, EIO);
  const gridO = 1 - 0.65 * focus - 0.3 * lift;
  return (
    <AbsoluteFill>
      <LifeGrid {...BIG} paint={(c, r) => (c === YC && lift > 0.02 ? { c: FILLED, o: 0 } : { c: FILLED, o: 0.55 })} o={Math.max(0.05, gridO)}>
        <rect x={G.colX(YC) - 4} y={BIG.y - 4} width={BIG.cell + 8} height={G.h + 8} rx={4} fill="none" stroke={K.themeHi} strokeWidth={2.5} opacity={focus * (1 - lift)} />
      </LifeGrid>
      <OnGrid at={-2} out={1} />
      {/* The year's 52 squares fly out into four rows of 13. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: ROWS }, (_, r) => {
          const m = progAt(frame, 2.6 + (r % 13) * 0.04 + Math.floor(r / 13) * 0.08, 1.4, EIO);
          if (focus <= 0.01) return null;
          const tx = QX + (r % 13) * Q.pitch;
          const ty = QY + Math.floor(r / 13) * Q.pitch;
          const x = interpolate(m, [0, 1], [G.colX(YC), tx]);
          const y = interpolate(m, [0, 1], [G.rowY(r), ty]);
          const s = interpolate(m, [0, 1], [BIG.cell, Q.cell]);
          const isPick = r === PICK;
          // The picked week grows into the week block; the others fade away.
          const gx = interpolate(open, [0, 1], [x, HX]);
          const gy = interpolate(open, [0, 1], [y, HY]);
          const gw = interpolate(open, [0, 1], [s, HW]);
          const gh = interpolate(open, [0, 1], [s, 7 * H.pitch - (H.pitch - H.cell)]);
          if (isPick) return <rect key={r} x={gx} y={gy} width={gw} height={gh} rx={6} fill={K.theme} fillOpacity={0.9 * (1 - open) + 0.08 * open} stroke={K.themeHi} strokeWidth={2} strokeOpacity={open} />;
          return <rect key={r} x={x} y={y} width={s} height={s} rx={4 + 4 * m} fill={FILLED} fillOpacity={(0.55 + 0.25 * m) * (1 - open)} />;
        })}
        {/* The week: 24 hours × 7 days. */}
        {open > 0.6
          ? Array.from({ length: 168 }, (_, k) => {
              const h = k % 24;
              const d = Math.floor(k / 24);
              const a = interpolate(open, [0.6 + (h / 24) * 0.25, 0.75 + (h / 24) * 0.25], [0, 1], CL);
              return <rect key={k} x={HX + h * H.pitch} y={HY + d * H.pitch} width={H.cell} height={H.cell} rx={4} fill={FILLED} fillOpacity={0.5 * a} />;
            })
          : null}
      </svg>
      {/* Year labels. */}
      <div style={{ opacity: lift * (1 - open) }}>
        {QUARTERS.map((q, i) => (
          <div key={q} style={{ position: "absolute", left: QX - 150, width: 130, textAlign: "right", top: QY + i * Q.pitch + 14, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.sub }}>{q}</div>
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, top: QY - 110, display: "flex", justifyContent: "center", fontFamily: FONT, fontSize: 56, fontWeight: 900, color: K.fg }}>
          30 岁这一年 = <span style={{ color: K.theme, marginLeft: 16 }}>52 周</span>
        </div>
      </div>
      {/* Week labels. */}
      <div style={{ opacity: interpolate(open, [0.7, 1], [0, 1], CL) }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ position: "absolute", left: HX - 80, width: 60, textAlign: "right", top: HY + i * H.pitch - 2, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.sub }}>周{d}</div>
        ))}
        {[0, 6, 12, 18, 24].map((h) => (
          <div key={h} style={{ position: "absolute", left: HX + h * H.pitch - 2 - (h === 24 ? 4 : 0), top: HY - 36, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.muted }}>{h}</div>
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, top: HY + 7 * H.pitch + 24, display: "flex", justifyContent: "center", fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg }}>
          一周 = 7 天 × 24 小时 = <span style={{ color: K.theme, marginLeft: 12 }}>168 小时</span>
        </div>
      </div>
      <Box x={960} y={150} cx>
        <Head at={7.5} parts={["这 4100 个星期，", { t: "都去哪了", c: K.theme }, "？"]} size={84} />
      </Box>
    </AbsoluteFill>
  );
};

// ---------- 17 s: the title card, on the music's first main section ----------

export const TitleCard: React.FC = () => {
  const frame = useBeatFrame();
  const p = progAt(frame, 0, 1.4, EBACK);
  const sub = progAt(frame, 1.6, 1, EO);
  const rule = progAt(frame, 0.6, 1.6, EO);
  const tg: TreeGeo = { ...TREE, y: 640 };
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: 0.4 }}>
        {LIFE_BRANCHES.map((b, i) => (
          <Branch key={i} g={tg} b={{ ...b, grow: 1 }} />
        ))}
        <Trunk g={tg} glow={0.9} run={(frame / (16 * 8)) % 1} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(7,9,11,0.88) 0%, rgba(7,9,11,0.55) 38%, transparent 68%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 340, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ fontFamily: FONT, fontSize: 170, fontWeight: 900, letterSpacing: -6, color: K.fg, opacity: Math.min(1, p * 1.5), transform: `scale(${0.88 + 0.12 * p})`, whiteSpace: "nowrap" }}>活着是主线</div>
        <div style={{ width: 760 * rule, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${K.theme}, ${K.themeHi})` }} />
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: K.sub, opacity: sub, letterSpacing: 8, whiteSpace: "nowrap" }}>· 世界的形状 ·</div>
      </div>
    </AbsoluteFill>
  );
};

