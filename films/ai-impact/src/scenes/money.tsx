import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { areaPath, Curve, Dot, GridY, lin, linePath, stepPath, TimeTicks, toXY, valueAt } from "../charts";
import { CAPEX, CAPEX_CO, LOSERS, NVDA, NVDA_MILES, NVDA_REV, SO, T0, T1, VALUATIONS, yr } from "../data";
import { CL, EBACK, EIO, EO, fmt, Glass, In, Odometer, progAt, Tag } from "../fx";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { FONT, K } from "../theme";
import { Head, Src } from "../ui";
import { LaneZoom } from "../zoom";

const HEAD = { position: "absolute", left: 120, top: 128 } as const;

// ───────── 01-1 Capex: four companies' calendar-year cash capex, 2026 = guidance; a China panel ─────────

export const Capex: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 230, y: 330, w: 1020, h: 540 };
  const sy = lin(0, 800, box.y + box.h, box.y);
  const bw = 140;
  const step = box.w / CAPEX.length;
  return (
    <AbsoluteFill>
      <LaneZoom lane="money" to={box} />
      <div style={HEAD}>
        <Head at={0.6} size={72} parts={["大厂一年砸的钱，四年涨到", { t: "快 5 倍", c: K.money }, "。"]} />
      </div>
      <GridY box={box} ticks={[0, 200, 400, 600, 800]} sy={sy} fmt={(v) => (v ? `${v}` : "0")} opacity={progAt(frame, 0.6, 1)} />
      <div style={{ position: "absolute", left: box.x - 112, top: box.y - 52, fontFamily: FONT, fontSize: 21, color: K.muted, opacity: progAt(frame, 0.6, 1) }}>亿美元 / 年</div>
      {CAPEX.map((c, i) => {
        const at = 1.4 + i * 0.75 + (c.guide ? 0.6 : 0);
        const p = progAt(frame, at, 1.2, EBACK);
        const x = box.x + step * i + (step - bw) / 2;
        let acc = 0;
        const total = c.msft + c.goog + c.amzn + c.meta;
        return (
          <React.Fragment key={c.y}>
            {CAPEX_CO.map((co) => {
              const v = c[co.k];
              const y0 = sy(acc * p);
              acc += v;
              const y1 = sy(acc * p);
              return (
                <div
                  key={co.k}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y1,
                    width: bw,
                    height: Math.max(0, y0 - y1 - 2),
                    background: c.guide ? `repeating-linear-gradient(135deg, ${co.color}ee 0 10px, ${co.color}88 10px 18px)` : co.color,
                    borderRadius: 4,
                    opacity: p > 0.01 ? 1 : 0,
                  }}
                />
              );
            })}
            <div style={{ position: "absolute", left: x + bw / 2, top: sy(total * p) - 58, transform: "translateX(-50%)", opacity: progAt(frame, at + 0.3, 0.6), whiteSpace: "nowrap", textAlign: "center" }}>
              <span style={{ fontFamily: FONT, fontSize: c.guide ? 40 : 32, fontWeight: 900, color: c.guide ? K.money : K.fg }}>
                {c.guide ? "约 " : ""}
                {fmt(Math.round(total * Math.min(1, p) * 10))}
              </span>
            </div>
            <div style={{ position: "absolute", left: x + bw / 2, top: box.y + box.h + 12, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 26, fontWeight: 700, color: c.guide ? K.money : K.sub, whiteSpace: "nowrap" }}>
              {c.y}
              {c.guide ? " 指引" : ""}
            </div>
          </React.Fragment>
        );
      })}
      {/* legend */}
      <div style={{ position: "absolute", left: box.x + 20, top: box.y - 6, display: "flex", gap: 22, opacity: progAt(frame, 1.4, 1) }}>
        {CAPEX_CO.map((co) => (
          <div key={co.k} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.sub }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: co.color }} />
            {co.name}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: box.x + 30, top: box.y + 60 }}>
        <In at={6.4} from="left">
          <Tag color={K.money} size={30}>
            2026 年 ≈ 每天 20 亿美元
          </Tag>
        </In>
      </div>
      {/* China panel */}
      <In at={7.2} from="flip" style={{ position: "absolute", left: 1350, top: 330 }}>
        <Glass glow={K.money} style={{ width: 450, height: 540, padding: "30px 34px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: K.fg }}>中国大厂也在加速</div>
          <div style={{ fontSize: 22, color: K.muted, marginTop: 6 }}>资本开支，亿元人民币</div>
          {[
            { n: "阿里 FY2024", v: 321 },
            { n: "阿里 FY2025", v: 860 },
            { n: "阿里 FY2026", v: 1261 },
          ].map((r, i) => {
            const q = progAt(frame, 7.8 + i * 0.5, 1, EO);
            return (
              <div key={r.n} style={{ marginTop: i ? 14 : 26 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 700, color: K.sub }}>
                  <span>{r.n}</span>
                  <span style={{ color: K.fg, fontVariantNumeric: "tabular-nums" }}>{fmt(Math.round(r.v * q))}</span>
                </div>
                <div style={{ height: 14, marginTop: 6, width: `${(r.v / 1261) * 100 * q}%`, background: K.money, borderRadius: 7 }} />
              </div>
            );
          })}
          <div style={{ marginTop: 34, borderTop: `1px solid ${K.line}`, paddingTop: 22 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: K.sub }}>腾讯 2026 上半年</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: K.fg }}>847 亿元</span>
              <span style={{ fontSize: 30, fontWeight: 900, color: K.money }}>+82%</span>
            </div>
          </div>
        </Glass>
      </In>
      <Src>微软、Alphabet、亚马逊、Meta 现金流量表"购置固定资产"（SEC 10-K/10-Q）· 2026 为各公司指引，口径不一 · "每天 20 亿"为推算 · 阿里 20-F、腾讯中期报告</Src>
    </AbsoluteFill>
  );
};

// ───────── 01-2 Nvidia: month-end market cap, trillion milestones, the DeepSeek notch, quarterly revenue ─────────

export const Nvidia: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 230, y: 300, w: 1170, h: 560 };
  const sx = lin(T0 - 0.02, T1 + 0.04, box.x, box.x + box.w);
  const sy = lin(0, 6, box.y + box.h, box.y);
  const pts = toXY(NVDA, sx, sy);
  const d = linePath(pts);
  const area = areaPath(d, pts[0][0], pts[pts.length - 1][0], box.y + box.h);
  const draw = progAt(frame, 0.8, 5, (t) => t);
  const tNow = T0 + (T1 + 0.01 - T0) * draw;
  const vNow = valueAt(NVDA, Math.min(T1, tNow));
  const ds = yr("2025-01-27");
  const dsOn = tNow >= ds;
  const dsAge = dsOn ? (tNow - ds) / ((T1 - T0) / (5 * FPB)) : 0; // frames since passing
  const flash = dsOn ? Math.max(0, 1 - dsAge / 12) : 0;
  return (
    <AbsoluteFill>
      <LaneZoom lane="money" to={box} />
      <div style={HEAD}>
        <Head at={0.4} size={72} parts={["卖铲子的英伟达：市值涨到", { t: "约 13 倍", c: K.money }, "。"]} />
      </div>
      <GridY box={box} ticks={[0, 1, 2, 3, 4, 5, 6]} sy={sy} fmt={(v) => (v ? `${v}` : "0")} opacity={progAt(frame, 0.5, 1)} />
      <div style={{ position: "absolute", left: box.x - 128, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>万亿美元</div>
      <TimeTicks box={box} sx={sx} years={[2023, 2024, 2025, 2026]} opacity={progAt(frame, 0.5, 1)} />
      <Curve id="nvda" box={box} d={d} area={area} color={K.money} draw={draw} width={4.5} />
      {NVDA_MILES.map((m) => {
        const t = yr(m.d);
        if (tNow < t) return null;
        const o = Math.min(1, (tNow - t) * 8);
        const x = sx(t);
        return (
          <div key={m.d} style={{ position: "absolute", left: x, top: sy(m.v) - 74, opacity: o, transform: `translateY(${(1 - o) * 12}px)` }}>
            <div style={{ position: "absolute", left: 0, top: 30, height: 44, borderLeft: `2px solid ${K.money}` }} />
            <div style={{ position: "absolute", left: 0, top: 0, padding: "2px 10px", borderRadius: "0 8px 8px 0", background: K.money, color: K.bg, fontFamily: FONT, fontSize: 20, fontWeight: 900, whiteSpace: "nowrap" }}>
              {m.t} · {m.d.slice(0, 7)}
            </div>
          </div>
        );
      })}
      {dsOn ? (
        <>
          <Dot x={sx(ds)} y={sy(2.9)} color={K.red} r={9} pulse={flash} />
          <div style={{ position: "absolute", left: sx(ds) - 20, top: sy(2.9) + 34, width: 420, opacity: Math.min(1, dsAge / 6), fontFamily: FONT }}>
            <div style={{ fontSize: 27, fontWeight: 900, color: K.red, whiteSpace: "nowrap" }}>2025-01-27 · DeepSeek 日</div>
            <div style={{ fontSize: 23, fontWeight: 700, color: K.fg, marginTop: 4, lineHeight: 1.35 }}>
              一天 −17%，蒸发约 5,890 亿美元
              <br />
              <span style={{ color: K.muted, fontWeight: 600 }}>美国公司单日最大的市值损失</span>
            </div>
          </div>
        </>
      ) : null}
      {draw > 0.02 ? <Dot x={sx(Math.min(T1, tNow))} y={sy(vNow)} color={K.money} r={8} /> : null}
      <div style={{ position: "absolute", left: box.x + 20, top: sy(0.42) - 64, fontFamily: FONT, opacity: progAt(frame, 0.8, 0.6) }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: K.fg }}>0.42 万亿</div>
        <div style={{ fontSize: 20, color: K.muted, fontWeight: 600 }}>2022-11-30</div>
      </div>
      <div style={{ position: "absolute", left: box.x + 30, top: box.y + 10, opacity: progAt(frame, 1, 0.8) }}>
        <Odometer value={vNow} decimals={2} size={78} color={K.money} suffix=" 万亿" />
        <div style={{ fontFamily: FONT, fontSize: 20, color: K.muted, fontWeight: 600, opacity: progAt(frame, 5.8, 0.8) }}>2026-10-21 收盘 · 纪录 5.77 万亿（10-06）</div>
      </div>
      {/* revenue inset */}
      <In at={6.2} from="flip" style={{ position: "absolute", left: 1460, top: 420 }}>
        <Glass glow={K.money} style={{ width: 360, height: 440, padding: "26px 26px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>季度营收</div>
          <div style={{ fontSize: 20, color: K.muted, marginTop: 4 }}>亿美元 · 2022 年 10 月季 → 2026 年 7 月季</div>
          <div style={{ position: "absolute", left: 26, right: 26, bottom: 70, height: 240, display: "flex", alignItems: "flex-end", gap: 4 }}>
            {NVDA_REV.map(([q, v], i) => {
              const g = progAt(frame, 6.6 + i * 0.08, 0.8, EO);
              return <div key={q} style={{ flex: 1, height: (v / 100) * 240 * g, background: i === NVDA_REV.length - 1 ? K.money : `${K.money}99`, borderRadius: 3 }} />;
            })}
          </div>
          <div style={{ position: "absolute", left: 26, right: 26, bottom: 24, display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 900 }}>
            <span>59</span>
            <span style={{ color: K.money }}>962</span>
          </div>
        </Glass>
      </In>
      <Src>收盘价 × SEC 封面股数 · 英伟达财报 · DeepSeek 日：Bloomberg 2025-01-27 · "约 13 倍"= 5.35 ÷ 0.42</Src>
    </AbsoluteFill>
  );
};

// ───────── 01-3 Valuations: two private AI companies, one funding round per step ─────────

const OAI = "#1fc9a2";
const ANT = "#ee8a5e";

export const Valuations: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 220, y: 330, w: 1200, h: 520 };
  const sx = lin(yr("2024-08"), yr("2026-11"), box.x, box.x + box.w);
  const sy = lin(0, 10000, box.y + box.h, box.y);
  const draw = progAt(frame, 0.6, 4.2, (t) => t);
  const tNow = yr("2024-08") + (yr("2026-11") - yr("2024-08")) * draw;
  const series = [
    { k: "OpenAI", c: OAI, pts: VALUATIONS.openai },
    { k: "Anthropic", c: ANT, pts: VALUATIONS.anthropic },
  ];
  const sum = progAt(frame, 5.2, 1, EBACK);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["两家没上市的公司，估值合计", { t: "1.8 万亿美元", c: K.money }, "。"]} />
      </div>
      <GridY box={box} ticks={[0, 2500, 5000, 7500, 10000]} sy={sy} fmt={(v) => (v ? fmt(v) : "0")} opacity={progAt(frame, 0.3, 1)} />
      <div style={{ position: "absolute", left: box.x - 128, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>投后估值 · 亿美元</div>
      <TimeTicks box={box} sx={sx} years={[2025, 2026]} />
      {series.map((s) => {
        const pts = s.pts.map((p) => [sx(yr(p.d)), sy(p.v)] as [number, number]);
        const xEnd = sx(T1);
        const d = stepPath(pts, xEnd);
        return (
          <React.Fragment key={s.k}>
            <Curve id={`val-${s.k}`} box={box} d={d} area={areaPath(d, pts[0][0], xEnd, box.y + box.h)} color={s.c} draw={draw} width={5} areaOpacity={0.22} />
            {s.pts.map((p, i) => {
              const t = yr(p.d);
              if (tNow < t) return null;
              const o = Math.min(1, (tNow - t) * 10);
              const last = i === s.pts.length - 1;
              return (
                <React.Fragment key={p.d}>
                  <Dot x={pts[i][0]} y={pts[i][1]} color={s.c} r={last ? 9 : 6} opacity={o} />
                  <div style={{ position: "absolute", left: pts[i][0] + 10, top: pts[i][1] - (last ? 52 : 40), fontFamily: FONT, opacity: o, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: last ? 40 : 26, fontWeight: 900, color: s.c }}>{fmt(p.v)}</span>
                    <span style={{ fontSize: 17, color: K.muted, fontWeight: 600, marginLeft: 6 }}>{p.d}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 1480, top: 340, display: "flex", flexDirection: "column", gap: 22, fontFamily: FONT }}>
        {series.map((s, i) => (
          <In key={s.k} at={0.6 + i * 0.5} from="right">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: s.c }} />
              <span style={{ fontSize: 34, fontWeight: 900, color: K.fg }}>{s.k}</span>
            </div>
          </In>
        ))}
        <In at={5.2} from="scale">
          <Glass glow={K.money} style={{ width: 330, padding: "20px 24px", boxSizing: "border-box", transform: `scale(${0.9 + 0.1 * sum})` }}>
            <div style={{ fontSize: 22, color: K.muted, fontWeight: 600 }}>8,520 + 9,650 亿</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: K.money }}>≈ 1.8 万亿</div>
          </Glass>
        </In>
        <In at={6} from="fade">
          <div style={{ width: 330, fontSize: 20, lineHeight: 1.45, color: K.muted, fontWeight: 600 }}>两家都已秘密递交上市文件（2026-06）。Anthropic 的数字是 Anthropic 自己的数据；本片作者 Claude 是 Anthropic 的模型。</div>
        </In>
      </div>
      <Src>投后估值 · OpenAI：CNBC、FT（2024–2026）· Anthropic：融资公告 Series E–H（2025–2026，自报）</Src>
    </AbsoluteFill>
  );
};

// ───────── 01-4 Stack Overflow: questions per month ebb away ─────────

export const StackOverflow: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 170, y: 330, w: 1580, h: 520 };
  const n = SO.length;
  const bw = box.w / n;
  const sy = lin(0, 130000, box.y + box.h, box.y);
  const xOf = (i: number) => box.x + i * bw;
  const chat = SO.findIndex(([d]) => d === "2022-11");
  const big = progAt(frame, 4.6, 1, EBACK);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={76} parts={["程序员，", { t: "不再上网问人了", c: K.chip }, "。"]} />
      </div>
      <GridY box={box} ticks={[0, 50000, 100000]} sy={sy} fmt={(v) => (v ? `${v / 10000} 万` : "0")} />
      {SO.map(([d, v], i) => {
        const g = progAt(frame, 0.5 + i * 0.06, 0.7, EO);
        const after = i >= chat;
        return <div key={d} style={{ position: "absolute", left: xOf(i) + 1, top: sy(v * g), width: bw - 3, height: box.y + box.h - sy(v * g), background: after ? K.chip : `${K.chip}55`, borderRadius: "3px 3px 0 0", opacity: g > 0 ? 1 : 0 }} />;
      })}
      <div style={{ position: "absolute", left: xOf(chat) - 2, top: box.y - 20, height: box.h + 20, borderLeft: `2px dashed ${K.fg}aa` }} />
      <div style={{ position: "absolute", left: xOf(chat) + 10, top: box.y - 26, fontFamily: FONT, fontSize: 22, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>ChatGPT 发布</div>
      {[2022, 2023, 2024, 2025, 2026].map((y) => {
        const i = SO.findIndex(([d]) => d === `${y}-01`);
        return (
          <div key={y} style={{ position: "absolute", left: xOf(i) + 4, top: box.y + box.h + 10, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.muted }}>
            {y}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1010, top: 380, opacity: progAt(frame, 4.6, 0.5), transform: `scale(${0.85 + 0.15 * big})`, transformOrigin: "left center", fontFamily: FONT }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>每月新问题</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 4 }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: K.fg, letterSpacing: -2 }}>109,120</span>
          <span style={{ fontSize: 64, fontWeight: 900, color: K.muted }}>→</span>
          <span style={{ fontSize: 96, fontWeight: 900, color: K.chip, letterSpacing: -2 }}>971</span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "baseline", marginTop: 2 }}>
          <span style={{ fontSize: 24, color: K.muted, fontWeight: 600 }}>2022-11 → 2026-09</span>
          <span style={{ fontSize: 54, fontWeight: 900, color: K.red }}>−99%</span>
        </div>
      </div>
      <Src>Stack Exchange API，本片自取 2026-10-22 · 2014 年 3 月峰值 207,169，ChatGPT 之前已跌了近一半</Src>
    </AbsoluteFill>
  );
};

// ───────── 01-5 The losers: a ticker wall, three dated shocks, and fair play ─────────

const SHOCKS = [
  { d: "2023-05-02", t: "Chegg 一天 −48%" },
  { d: "2026-02-03", t: "法律、研究股一天 −13% 到 −21%" },
  { d: "2026-02-20", t: "网络安全股一天 −8%" },
];

export const Losers: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={68} parts={["AI 每往前一步，就有一个行业", { t: "股价跳水", c: K.red }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 236, display: "flex", gap: 18 }}>
        {SHOCKS.map((s, i) => (
          <In key={s.d} at={0.8 + i * 0.4} from="down">
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${K.red}88`, background: `${K.red}14`, fontFamily: FONT, fontSize: 23, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>
              <span style={{ color: K.red, fontWeight: 900 }}>{s.d}</span>
              {s.t}
            </div>
          </In>
        ))}
      </div>
      {LOSERS.map((g, gi) => {
        const x = 120 + (gi % 2) * 850;
        const y = 330 + Math.floor(gi / 2) * 270;
        return (
          <In key={g.g} at={1.4 + gi * 0.35} from="flip" style={{ position: "absolute", left: x, top: y }}>
            <Glass style={{ width: 820, height: 250, padding: "18px 26px", boxSizing: "border-box" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: K.muted }}>{g.g}</div>
              {g.rows.map((r, ri) => {
                const q = progAt(frame, 1.8 + gi * 0.35 + ri * 0.25, 1.2, EO);
                return (
                  <div key={r.n} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: ri ? 4 : 10, borderTop: ri ? `1px solid ${K.grid}` : undefined, paddingTop: ri ? 4 : 0 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: K.fg }}>
                      {r.n}
                      {r.note ? <span style={{ fontSize: 18, color: K.muted, marginLeft: 10, fontWeight: 600 }}>{r.note}</span> : null}
                    </span>
                    <span style={{ fontSize: 46, fontWeight: 900, color: K.red, fontVariantNumeric: "tabular-nums" }}>−{Math.round(-r.v * q)}%</span>
                  </div>
                );
              })}
            </Glass>
          </In>
        );
      })}
      <div style={{ position: "absolute", left: 120, top: 878 }}>
        <In at={2.0} from="up">
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            <span style={{ color: K.green, fontWeight: 900 }}>说句公道话：</span>多数公司收入还在涨，跌的是预期。
            <span style={{ fontSize: 24, color: K.muted, fontWeight: 600 }}>　Salesforce +11%、Adobe +13%（最新一季同比）</span>
          </div>
        </In>
      </div>
      <Src>收盘价距 2025-06 以来窗口高点的最深回撤（Chegg 自 2021 年峰值）· 收入：最新一季同比，SEC XBRL · Bloomberg 2026-02-20</Src>
    </AbsoluteFill>
  );
};
