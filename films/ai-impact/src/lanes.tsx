import React from "react";
import { areaPath, Box, Curve, Dot, lin, linePath, stepPath, toXY, valueAt } from "./charts";
import { DRAM_REV, NVDA, PJM, PJM_PLOT, Pt, T0, T1, UNRATE, YOUNG_EXPOSED, yr } from "./data";
import { FONT, K, LaneKey, LANES } from "./theme";

// The main prop: the AI era as four lanes on one time axis, 2022-11-30 (ChatGPT) → today, with room for the
// forecast fan. Each lane plots one real series on a zero-based axis, so the shapes are honest: money (Nvidia market
// cap), chips (global DRAM revenue), power (PJM capacity price), work (US unemployment rate).

export const LANE_BOX: Box = { x: 360, y: 214, w: 1440, h: 660 };
const GAP = 20;

type Station = { d: string; t: string; below?: boolean };
const STATIONS: Record<LaneKey, Station[]> = {
  money: [
    { d: "2023-05-30", t: "破 1 万亿" },
    { d: "2024-06-18", t: "全球市值第一" },
    { d: "2025-01-27", t: "DeepSeek 日", below: true },
    { d: "2026-02-03", t: "软件股暴跌", below: true },
  ],
  chip: [
    { d: "2023-10-17", t: "美国第二轮管制" },
    { d: "2024-12-02", t: "管制高带宽内存" },
    { d: "2025-04-04", t: "中国管制稀土" },
    { d: "2026-06-25", t: "苹果涨价", below: true },
  ],
  power: [
    { d: "2024-07-30", t: "容量价暴涨" },
    { d: "2024-09-20", t: "三里岛重启协议", below: true },
    { d: "2025-07-22", t: "撞上价格上限", below: true },
  ],
  work: [
    { d: "2023-05-02", t: "Chegg 暴跌" },
    { d: "2023-07-14", t: "好莱坞演员罢工", below: true },
    { d: "2025-08-26", t: "\"金丝雀\"论文" },
  ],
};

const SERIES: Record<LaneKey, { pts: Pt[]; max: number; step?: boolean }> = {
  money: { pts: NVDA, max: 6.2 },
  chip: { pts: DRAM_REV, max: 165 },
  power: { pts: PJM_PLOT, max: 360, step: true },
  work: { pts: UNRATE, max: 10 },
};

export const laneRect = (i: number, box: Box = LANE_BOX): Box => {
  const h = (box.h - GAP * 3) / 4;
  return { x: box.x, y: box.y + i * (h + GAP), w: box.w, h };
};

export type LanesProps = {
  box?: Box;
  draw?: number | number[]; // 0–1 reveal per lane
  stations?: number; // 0–1 station labels
  focus?: LaneKey | null;
  dimOthers?: number; // 0–1
  domainEnd?: number; // fractional year
  fan?: number; // 0–1 forecast cones
  young?: number; // 0–1 the young-workers line in the work lane
  cohort?: number; // 0–1 the class-of-2022 bar
  flash?: number; // 0–1 extra glow
  labels?: boolean;
  today?: boolean;
  dot?: number; // 0–1 the live dot at the end of each curve
};

export const domainOf = (end?: number) => ({ t0: T0 - 0.03, t1: end ?? T1 + 0.1 });

export const Lanes: React.FC<LanesProps> = ({
  box = LANE_BOX,
  draw = 1,
  stations = 0,
  focus = null,
  dimOthers = 0,
  domainEnd,
  fan = 0,
  young = 0,
  cohort = 0,
  flash = 0,
  labels = true,
  today = true,
  dot = 1,
}) => {
  const { t0, t1 } = domainOf(domainEnd);
  const sx = lin(t0, t1, box.x, box.x + box.w);
  const xToday = sx(T1);
  const years = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031].filter((y) => y > t0 && y < t1);
  const axisY = box.y + box.h + 8;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* year grid */}
      {years.map((y) => (
        <React.Fragment key={y}>
          <div style={{ position: "absolute", left: sx(y), top: box.y - 6, height: box.h + 14, borderLeft: `1px dashed ${K.grid}` }} />
          <div style={{ position: "absolute", left: sx(y) + 8, top: axisY + 4, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: y > 2026 ? K.dim : K.muted }}>{y}</div>
        </React.Fragment>
      ))}
      {LANES.map((lane, i) => {
        const r = laneRect(i, box);
        const s = SERIES[lane.key];
        const sy = lin(0, s.max, r.y + r.h - 6, r.y + 10);
        const pts = toXY(s.pts, sx, sy);
        const xEnd = s.step ? sx(T1) : pts[pts.length - 1][0];
        const d = s.step ? stepPath(pts, xEnd) : linePath(pts);
        const area = areaPath(d, pts[0][0], xEnd, r.y + r.h);
        const p = Array.isArray(draw) ? draw[i] : draw;
        const off = focus && focus !== lane.key ? dimOthers : 0;
        const on = focus === lane.key;
        const tEnd = t0 + (T1 + 0.02 - t0) * p;
        const vEnd = s.step ? (PJM.filter((q) => yr(q.d) <= tEnd).pop()?.v ?? PJM[0].v) : valueAt(s.pts, Math.min(T1, tEnd));
        return (
          <div key={lane.key} style={{ position: "absolute", inset: 0, opacity: 1 - off * 0.82 }}>
            {/* lane bed */}
            <div
              style={{
                position: "absolute",
                left: r.x - 8,
                top: r.y,
                width: r.w + 16,
                height: r.h,
                borderRadius: 14,
                background: `linear-gradient(90deg, ${lane.color}${on ? "1c" : "0e"}, ${lane.color}05 70%)`,
                border: `1px solid ${lane.color}${on ? "55" : "22"}`,
              }}
            />
            {labels ? (
              <div style={{ position: "absolute", right: 1920 - r.x + 28, top: r.y + r.h / 2, transform: "translateY(-50%)", textAlign: "right", fontFamily: FONT }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: lane.color, lineHeight: 1 }}>{lane.name}</div>
                <div style={{ fontSize: 21, fontWeight: 600, color: K.muted, marginTop: 8, whiteSpace: "nowrap" }}>{lane.series}</div>
              </div>
            ) : null}
            <Curve id={`lane-${lane.key}-${box.x}-${box.y}`} box={{ ...r, x: box.x, w: (xToday - box.x) + 4 }} d={d} area={area} color={lane.color} draw={p} width={on ? 5 : 3.5} glow={0.35 + flash * 0.65} areaOpacity={0.3 + flash * 0.25} />
            {p > 0.02 && dot > 0 ? <Dot x={Math.min(xEnd, sx(tEnd))} y={sy(vEnd)} color={lane.color} r={6} opacity={dot} /> : null}
            {/* stations */}
            {stations > 0
              ? STATIONS[lane.key].map((st, k) => {
                  const tt = yr(st.d);
                  if (tt > tEnd) return null;
                  const x = sx(tt);
                  const v = s.step ? (PJM.filter((q) => yr(q.d) <= tt).pop()?.v ?? 0) : valueAt(s.pts, tt);
                  const y = sy(v);
                  const o = Math.max(0, Math.min(1, stations * STATIONS[lane.key].length - k));
                  return (
                    <React.Fragment key={st.d}>
                      <div style={{ position: "absolute", left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: "50%", background: K.bg, border: `2.5px solid ${lane.color}`, opacity: o }} />
                      <div
                        style={{
                          position: "absolute",
                          left: x,
                          top: st.below ? y + 12 : y - 36,
                          transform: "translateX(-50%)",
                          fontFamily: FONT,
                          fontSize: 19,
                          fontWeight: 700,
                          color: lane.color,
                          whiteSpace: "nowrap",
                          opacity: o * 0.92,
                          padding: "1px 7px",
                          borderRadius: 6,
                          background: "rgba(7,9,11,0.72)",
                        }}
                      >
                        {st.t}
                      </div>
                    </React.Fragment>
                  );
                })
              : null}
            {/* the young-workers line, in the work lane only (its own index scale: Nov 2022 = 1) */}
            {lane.key === "work" && young > 0 ? <YoungLine r={r} sx={sx} p={young} /> : null}
            {/* forecast cone (shape only, not to scale) */}
            {fan > 0 ? <Cone r={r} x0={xToday} x1={box.x + box.w} y0={sy(SERIES[lane.key].step ? PJM[PJM.length - 1].v : s.pts[s.pts.length - 1][1])} color={lane.color} p={fan} up={lane.key !== "work"} /> : null}
          </div>
        );
      })}
      {/* start and today markers */}
      <div style={{ position: "absolute", left: sx(T0), top: box.y - 44, height: box.h + 52, borderLeft: `2px solid ${K.sub}66` }} />
      <div style={{ position: "absolute", left: sx(T0) + 10, top: box.y - 50, fontFamily: FONT, fontSize: 21, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>2022-11-30 · ChatGPT 发布</div>
      {today ? (
        <>
          <div style={{ position: "absolute", left: xToday, top: box.y - 44, height: box.h + 52, borderLeft: `2px dashed ${K.fg}aa` }} />
          <div style={{ position: "absolute", right: 1920 - xToday + 10, top: box.y - 50, fontFamily: FONT, fontSize: 21, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>今天 · 2026-10-22</div>
        </>
      ) : null}
      {cohort > 0 ? <Cohort box={box} sx={sx} p={cohort} /> : null}
    </div>
  );
};

const YoungLine: React.FC<{ r: Box; sx: (t: number) => number; p: number }> = ({ r, sx, p }) => {
  const sy = lin(0.84, 1.16, r.y + r.h - 6, r.y + 6);
  const pts = toXY(YOUNG_EXPOSED, sx, sy);
  const d = linePath(pts);
  const last = pts[pts.length - 1];
  return (
    <>
      <Curve id="young-line" box={{ ...r, w: last[0] - r.x + 6 }} d={d} color={K.red} draw={p} width={3} dash="10 7" glow={0.5} />
      <div style={{ position: "absolute", right: 1920 - last[0] + 10, top: last[1] + 8, textAlign: "right", fontFamily: FONT, fontSize: 19, fontWeight: 700, color: K.red, whiteSpace: "nowrap", opacity: Math.max(0, p * 2 - 1), lineHeight: 1.25 }}>
        22–25 岁 · 最易被 AI 替代的岗位
        <div style={{ fontSize: 16, color: K.muted, fontWeight: 500 }}>就业指数，另一把尺子</div>
      </div>
    </>
  );
};

const Cone: React.FC<{ r: Box; x0: number; x1: number; y0: number; color: string; p: number; up: boolean }> = ({ r, x0, x1, y0, color, p, up }) => {
  const x = x0 + (x1 - x0) * p;
  const spread = (r.h * 0.85) * p;
  const yc = up ? Math.max(r.y + 8, y0 - spread * 0.55) : y0 - spread * 0.1;
  const yHi = Math.max(r.y - 4, yc - spread * 0.5);
  const yLo = Math.min(r.y + r.h, yc + spread * 0.5);
  const d = `M${x0},${y0} L${x},${yHi} L${x},${yLo} Z`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id={`cone-${color.slice(1)}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0.06} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#cone-${color.slice(1)})`} />
      <path d={`M${x0},${y0} L${x},${yc}`} stroke={color} strokeWidth={3} strokeDasharray="10 9" fill="none" />
    </svg>
  );
};

// Class of 2022: September 2022 to June 2026, the four years of the film.
const Cohort: React.FC<{ box: Box; sx: (t: number) => number; p: number }> = ({ box, sx, p }) => {
  const a = sx(yr("2022-09-01"));
  const b = sx(yr("2026-06-30"));
  const y = box.y + box.h + 56;
  return (
    <div style={{ position: "absolute", left: a, top: y, width: b - a, height: 34, opacity: Math.min(1, p * 3) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 17, border: `2px solid ${K.gold}88`, background: "rgba(255,209,102,0.06)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p * 100}%`, borderRadius: 17, background: `linear-gradient(90deg, ${K.gold}55, ${K.gold}cc)` }} />
      <div style={{ position: "absolute", left: 16, top: 3, fontFamily: FONT, fontSize: 21, fontWeight: 900, color: K.bg, whiteSpace: "nowrap", opacity: p > 0.3 ? 1 : 0 }}>2022 级大学生 · 2022 年 9 月入学 → 2026 年 6 月毕业</div>
    </div>
  );
};
