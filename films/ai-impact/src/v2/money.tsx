import React from "react";
import { AbsoluteFill } from "remotion";
import { Odometer } from "../fx";
import { CAPEX, NVDA, yr } from "../data";
import { FONT } from "../theme";
import { DataHall } from "./art";
import { Backdrop, C, Cam, EBACK, EIO, EO, Glass, Label, lerp, Line, pr, Src, useT } from "./kit";

// ── 0:12–0:18 · Nvidia: ¥10,000 put in on the day ChatGPT came out rides the line up to about ¥12.3 万. ──
const NB = { x: 170, y: 440, w: 1420, h: 520 };
const T0 = yr("2022-11-30");
const T1 = yr("2026-10-21");
const R_MAX = 14;
const nx = (d: string) => NB.x + ((yr(d) - T0) / (T1 - T0)) * NB.w;
const ny = (r: number) => NB.y + NB.h - (r / R_MAX) * NB.h;
const NPTS: [number, number][] = NVDA.map(([d, v]) => [nx(d), ny(v / NVDA[0][1])]);
// The curve is market cap; the card's money follows its shape, scaled so the end is the share-price result
// (16.92 → 221.97 USD, × 6.72 / 7.1 ≈ 12.3 万元).
const R_END = NVDA[NVDA.length - 1][1] / NVDA[0][1];
const wan = (r: number) => 1 + ((r - 1) * (12.3 - 1)) / (R_END - 1);

const along = (pts: [number, number][], k: number) => {
  const f = k * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const u = f - i;
  return { x: lerp(pts[i][0], pts[i + 1][0], u), y: lerp(pts[i][1], pts[i + 1][1], u), n: i + 1, u };
};

export const Nvidia: React.FC = () => {
  const t = useT();
  const draw = pr(t, 12.58, 2.5, EIO);
  const tip = along(NPTS, draw);
  const shown = [...NPTS.slice(0, tip.n), [tip.x, tip.y] as [number, number]];
  const d = shown.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${d}L${tip.x.toFixed(1)},${NB.y + NB.h}L${NB.x},${NB.y + NB.h}Z`;
  const r = (NB.y + NB.h - tip.y) / NB.h * R_MAX;
  const land = pr(t, 15.08, 0.35, EBACK);
  const punch = t >= 15.08 ? Math.max(0, 1 - (t - 15.08) / 0.35) : 0;
  const cardIn = pr(t, 12.33, 0.4, EBACK);
  const value = draw >= 1 ? 12.3 : wan(Math.max(1, r));
  const flip = Math.max(0, Math.min(1, (tip.x - 420) / 420));
  return (
    <AbsoluteFill>
      <Backdrop glow={C.orange} at={[78, 40]} strength={0.1 + 0.1 * draw} />
      {/* grid: 1×, 5×, 10× */}
      {[1, 5, 10].map((g) => (
        <React.Fragment key={g}>
          <div style={{ position: "absolute", left: NB.x, width: NB.w, top: ny(g), height: 1, background: g === 1 ? "rgba(244,240,232,0.28)" : C.line }} />
          <div style={{ position: "absolute", left: NB.x + NB.w + 18, top: ny(g) - 15, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.muted }}>{g === 1 ? "本金" : `${g} 倍`}</div>
        </React.Fragment>
      ))}
      {[2023, 2024, 2025, 2026].map((y) => (
        <div key={y} style={{ position: "absolute", left: nx(`${y}-01-01`), top: NB.y + NB.h + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.muted }}>
          {y}
        </div>
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="nv-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.orange} stopOpacity="0.32" />
            <stop offset="1" stopColor={C.orange} stopOpacity="0" />
          </linearGradient>
        </defs>
        {draw > 0 ? <path d={area} fill="url(#nv-area)" /> : null}
        {draw > 0 ? <path d={d} fill="none" stroke={C.orange} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" /> : null}
        <circle cx={tip.x} cy={tip.y} r={10 + 6 * punch} fill={C.fg} stroke={C.orange} strokeWidth={5} opacity={pr(t, 12.4, 0.2)} />
      </svg>
      {/* the money card riding the tip */}
      <div style={{ position: "absolute", left: tip.x + lerp(24, -24, flip), top: tip.y - 24, transform: `translate(${-100 * flip}%, -100%) scale(${(0.6 + 0.4 * cardIn) * (1 + 0.1 * punch)})`, transformOrigin: `${100 * flip}% 100%`, opacity: Math.min(1, cardIn * 2) }}>
        <Glass x={0} y={0} w={400} h={150} glow={land > 0 ? C.gold : C.orange} style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 26, top: 18, fontSize: 22, fontWeight: 700, color: C.sub, whiteSpace: "nowrap" }}>{land > 0 ? "今天（推算）" : "ChatGPT 发布那天买入"}</div>
          <div style={{ position: "absolute", left: 22, top: 50 }}>
            <Odometer value={value} decimals={1} size={70} prefix="¥" suffix=" 万" color={land > 0 ? C.gold : C.fg} />
          </div>
        </Glass>
      </div>
      <Label x={NB.x + NB.w} y={ny(R_END) + 90} anchor="right" size={26} color={C.orange} at={15.08} weight={800}>
        英伟达（美国芯片公司）
      </Label>
      <Line at={12.08} text="四年前买 1 万元英伟达，" />
      <Line at={15.08} y={262} text="今天约 12 万。" kw="12 万" kwAt={15.58} />
      <Src at={12.4}>英伟达收盘价（拆股调整）16.92 → 221.97 美元，2022-11-30 → 2026-10-21 · 汇率约 7.1 → 6.72 · 推算，不计分红和税费 · 曲线为市值走势</Src>
    </AbsoluteFill>
  );
};

// ── 0:18–0:26 · Capex: four companies pour money into data halls, ¥135 亿 every day; then the camera slides to the
// five years of spending, 2026 almost five times 2022. ──
const CO = [
  { k: "amzn", name: "亚马逊", color: "#ff9f43" },
  { k: "goog", name: "谷歌", color: "#ffc078" },
  { k: "msft", name: "微软", color: "#e07a2e" },
  { k: "meta", name: "Meta（脸书母公司）", color: "#ffe0b8" },
] as const;
const BADGE_X = [250, 520, 790, 1110];
const HALL = { x: 230, y: 700, w: 900, h: 270 };

const Coin: React.FC<{ s: number }> = ({ s }) => (
  <div style={{ width: s, height: s, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #ffe7a8, #f2b53c 60%, #b8801f)", boxShadow: "0 0 12px rgba(255,209,102,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: s * 0.55, color: "#7a4d0c" }}>¥</div>
);

const totals = CAPEX.map((c) => c.amzn + c.goog + c.msft + c.meta);
const COL = { x: 1920 + 330, w: 150, gap: 110, base: 960, top: 470 };
const colH = (v: number) => (v / totals[totals.length - 1]) * (COL.base - COL.top);

export const Capex: React.FC = () => {
  const t = useT();
  const pour = pr(t, 18.33, 0.4) * (1 - pr(t, 22.08, 0.4));
  const perDay = pr(t, 18.58, 1.5, EIO) * 135;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.orange} at={[40, 70]} strength={0.14} />
      <Cam keys={[[18.08, 0, 0, 1], [22.08, 0, 0, 1], [22.83, -1920, 0, 1]]}>
        {/* ── part one: pouring ── */}
        {CO.map((c, i) => {
          const p = pr(t, 18.08 + i * 0.12, 0.4, EBACK);
          return (
            <div key={c.k} style={{ position: "absolute", left: BADGE_X[i], top: 410, transform: `translate(-50%, ${(1 - p) * 30}px)`, opacity: Math.min(1, p * 2), padding: "12px 24px", borderRadius: 16, background: "rgba(255,255,255,0.07)", border: `2px solid ${c.color}`, fontFamily: FONT, fontSize: 30, fontWeight: 900, color: C.fg, whiteSpace: "nowrap" }}>
              {c.name}
            </div>
          );
        })}
        {CO.map((c, i) =>
          Array.from({ length: 7 }).map((_, k) => {
            const ph = ((t - 18.33) * 1.6 + k / 7) % 1;
            if (t < 18.33 || pour <= 0) return null;
            const x0 = BADGE_X[i];
            const y0 = 470;
            const x1 = HALL.x + HALL.w / 2 + (i - 1.5) * 90;
            const y1 = HALL.y + 10;
            const x = lerp(x0, x1, ph);
            const y = lerp(y0, y1, ph * ph);
            return (
              <div key={`${c.k}${k}`} style={{ position: "absolute", left: x - 16, top: y - 16, opacity: pour * Math.min(1, (1 - ph) * 6) }}>
                <Coin s={32} />
              </div>
            );
          }),
        )}
        <div style={{ position: "absolute", left: HALL.x, top: HALL.y, opacity: pr(t, 18.08, 0.4) }}>
          <DataHall w={HALL.w} h={HALL.h} n={8} lit={0.3 + 0.7 * pr(t, 18.58, 2, EIO)} t={t} color={C.orange} />
        </div>
        <Label x={1300} y={470} size={32} color={C.sub} at={18.33} weight={800}>
          四家加起来，每一天
        </Label>
        <div style={{ position: "absolute", left: 1290, top: 520, opacity: pr(t, 18.4, 0.3) }}>
          <Odometer value={perDay} size={170} prefix="¥" suffix=" 亿" color={t >= 20.08 ? C.gold : C.fg} />
        </div>
        <Label x={1300} y={720} size={24} color={C.muted} at={20.08}>
          2026 年合计约 7,350 亿美元（公司指引）
        </Label>
        <Label x={1300} y={760} size={24} color={C.muted} at={20.33}>
          ÷ 365 天，按 6.72 换成人民币
        </Label>
        {/* ── part two: five years ── */}
        {CAPEX.map((c, i) => {
          const g = pr(t, 22.33 + i * 0.5, 0.5, EBACK);
          const x = COL.x + i * (COL.w + COL.gap);
          let acc = 0;
          return (
            <React.Fragment key={c.y}>
              {CO.map((co) => {
                const v = c[co.k];
                const h = colH(v) * Math.min(1, g);
                const top = COL.base - (acc + h);
                acc += h;
                return (
                  <div
                    key={co.k}
                    style={{
                      position: "absolute",
                      left: x,
                      width: COL.w,
                      top,
                      height: Math.max(0, h - 3),
                      borderRadius: 4,
                      background: c.guide ? `repeating-linear-gradient(135deg, ${co.color}, ${co.color} 10px, ${co.color}aa 10px, ${co.color}aa 20px)` : co.color,
                    }}
                  />
                );
              })}
              <div style={{ position: "absolute", left: x + COL.w / 2, top: COL.base + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 26, fontWeight: 800, color: c.guide ? C.orange : C.sub, whiteSpace: "nowrap" }}>
                {c.guide ? "2026 指引" : c.y}
              </div>
            </React.Fragment>
          );
        })}
        {/* ×4.9 */}
        {(() => {
          const p = pr(t, 25.08, 0.45, EO);
          if (p <= 0) return null;
          const xa = COL.x + COL.w / 2;
          const xb = COL.x + 4 * (COL.w + COL.gap) + COL.w / 2;
          const ya = COL.base - colH(totals[0]) - 24;
          const yb = COL.top - 24;
          return (
            <>
              <svg width={3840} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                <path d={`M${xa},${ya} Q${(xa + xb) / 2},${ya - 40} ${lerp(xa, xb, p)},${lerp(ya, yb, p)}`} fill="none" stroke={C.gold} strokeWidth={4} strokeDasharray="10 10" />
              </svg>
              <div style={{ position: "absolute", left: xb, top: yb - 20, transform: `translate(-50%, -100%) scale(${0.7 + 0.3 * p})`, opacity: p, fontFamily: FONT, fontSize: 84, fontWeight: 900, color: C.gold, whiteSpace: "nowrap" }}>×4.9</div>
            </>
          );
        })()}
        <div style={{ position: "absolute", left: 1920 + 1590, top: 520, display: "flex", flexDirection: "column", gap: 18, opacity: pr(t, 22.83, 0.4) }}>
          {CO.map((c) => (
            <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontSize: 26, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: c.color }} />
              {c.name}
            </div>
          ))}
          <div style={{ fontFamily: FONT, fontSize: 21, color: C.muted, marginTop: 8, whiteSpace: "nowrap" }}>斜纹 = 公司指引（预测）</div>
        </div>
      </Cam>
      <Line at={18.08} text="四家大厂，每天砸 135 亿元。" kw="135 亿元" kwAt={20.08} />
      <Line at={22.08} y={262} text="是 2022 年的快 5 倍。" kw="快 5 倍" kwAt={25.08} />
      <Src at={18.4}>资本开支：亚马逊、谷歌母公司 Alphabet、微软、Meta 财报（现金流量表）· 2026 年为公司指引，口径不尽相同 · 每天 135 亿元、×4.9 为推算</Src>
    </AbsoluteFill>
  );
};
