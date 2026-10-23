import React from "react";
import { AbsoluteFill } from "remotion";
import { Odometer } from "../fx";
import { MiniRam } from "../samples/art";
import { FONT } from "../theme";
import { Silhouette } from "../v2/art";
import { Gpu } from "./art";
import { Backdrop, C, EBACK, EIO, EO, lerp, Lines, pr, Src, useT } from "./kit";
import { CARD, CartCard } from "./opening";
import { BAR, BEAT, bar } from "./timing";

// 03 账单 · 片中 36–46. It eats cards, memory and power; a shut nuclear plant restarts; by 2030 data centres use a
// Japan's worth of electricity; the memory factories serve AI first; so the stick in the opening cart costs 3,800.

export const CH3 = {
  s19: ["AI 很能吃。", "吃显卡，吃内存，还吃电。"],
  s20: ["为了喂它，美国连", "关掉的核电站都要重启。"],
  s21: ["2030 年，全球机房", "要用掉一个日本的电。"],
  s22: ["AI 的显卡也要内存，", "工厂先把货给了它。"],
  s23: ["所以，开头那根内存条，", "才涨到了 3,800。"],
} as const;

const Bolt: React.FC<{ s: number; color?: string }> = ({ s, color = C.violet }) => (
  <svg width={s * 0.6} height={s} viewBox="0 0 30 50" style={{ display: "block" }}>
    <path d="M18,0 L2,28 L14,28 L10,50 L28,18 L16,18 Z" fill={color} />
  </svg>
);

// ── 19 · bars 36–38: three pipes into the data centre ──
export const Eats: React.FC = () => {
  const t = useT();
  const b0 = bar(36);
  const DC = { x: 1180, y: 380, w: 600, h: 520 };
  const pipes = [
    { y: 470, label: "显卡", color: C.cyan, item: (k: number) => <Gpu w={90} t={t} glow={1} id={`pg${k}`} /> },
    { y: 640, label: "内存", color: "#8fd3ff", item: () => <MiniRam w={84} color={C.cyan} fill="#1c2733" /> },
    { y: 810, label: "电", color: C.violet, item: () => <Bolt s={48} /> },
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.violet} at={[70, 60]} strength={0.12} />
      <div style={{ position: "absolute", left: DC.x, top: DC.y, width: DC.w, height: DC.h, borderRadius: 26, background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))", border: `1px solid ${C.glassLine}`, boxShadow: "0 40px 90px rgba(0,0,0,0.55)", opacity: pr(t, b0, 0.4) }}>
        <div style={{ position: "absolute", left: 30, top: 22, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: C.fg }}>AI 数据中心</div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 40 + i * 92, top: 90, width: 70, height: 390, borderRadius: 10, background: "linear-gradient(180deg, #232a35, #151a21)", border: "1px solid #303948" }}>
            {Array.from({ length: 10 }).map((__, u) => {
              const on = Math.sin(t * 2.6 + i * 1.3 + u * 0.8) > -0.3;
              return <div key={u} style={{ position: "absolute", left: 10, top: 14 + u * 37, width: 8, height: 8, borderRadius: 4, background: on ? (u % 3 ? C.green : C.cyan) : "#323a46" }} />;
            })}
          </div>
        ))}
      </div>
      {pipes.map((p, k) => {
        const o = pr(t, b0 + 0.3 + k * BEAT, 0.4, EO);
        return (
          <React.Fragment key={p.label}>
            <div style={{ position: "absolute", left: 300, top: p.y - 12, width: DC.x - 300, height: 24, borderRadius: 12, background: `linear-gradient(90deg, transparent, ${p.color}44)`, opacity: o }} />
            <div style={{ position: "absolute", left: 200, top: p.y - 26, transform: "translateX(-100%)", fontFamily: FONT, fontSize: 46, fontWeight: 900, color: p.color, opacity: o, whiteSpace: "nowrap" }}>{p.label}</div>
            {Array.from({ length: 6 }).map((_, i) => {
              const ph = ((t - (b0 + 0.3 + k * BEAT)) * 0.55 + i / 6) % 1;
              if (t < b0 + 0.3 + k * BEAT) return null;
              return (
                <div key={i} style={{ position: "absolute", left: lerp(240, DC.x - 60, ph), top: p.y - 22, opacity: o * Math.min(1, ph * 6) * Math.min(1, (1 - ph) * 6) }}>
                  {p.item(i)}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      <Lines at={b0} a={CH3.s19[0]} b={CH3.s19[1]} out={bar(38) - 0.05} />
    </AbsoluteFill>
  );
};

// ── 20 · bars 38–40: the line runs to Three Mile Island; the cooling towers light up ──
const CoolingTower: React.FC<{ w: number; h: number; lit: number; t: number; seed: number }> = ({ w, h, lit, t, seed }) => (
  <div style={{ position: "relative", width: w, height: h }}>
    {Array.from({ length: 6 }).map((_, i) => {
      const ph = ((t * 0.25 + i / 6 + seed * 0.3) % 1) * lit;
      return <div key={i} style={{ position: "absolute", left: w * 0.5 - 40 - ph * 30 + i * 6, top: -20 - ph * 220, width: 80 + ph * 120, height: 80 + ph * 120, borderRadius: "50%", background: `rgba(220,226,235,${0.16 * (1 - ph) * lit})` }} />;
    })}
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M${w * 0.12},${h} Q${w * 0.32},${h * 0.45} ${w * 0.2},0 L${w * 0.8},0 Q${w * 0.68},${h * 0.45} ${w * 0.88},${h} Z`} fill="#1d2430" stroke={`rgba(167,139,250,${0.35 + 0.5 * lit})`} strokeWidth={3} />
      <rect x={w * 0.3} y={h * 0.55} width={w * 0.4} height={6} rx={3} fill={`rgba(167,139,250,${0.8 * lit})`} />
    </svg>
  </div>
);
export const NUKE_AT = bar(38) + 2 * BEAT;
export const Nuclear: React.FC = () => {
  const t = useT();
  const b0 = bar(38);
  const line = pr(t, b0 + 0.2, 0.9, EIO);
  const lit = pr(t, NUKE_AT, 0.8, EO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.violet} at={[66, 60]} strength={0.1 + 0.08 * lit} />
      <div style={{ position: "absolute", left: 1040, top: 470 }}>
        <CoolingTower w={280} h={420} lit={lit} t={t} seed={0} />
      </div>
      <div style={{ position: "absolute", left: 1350, top: 470 }}>
        <CoolingTower w={280} h={420} lit={lit} t={t} seed={1} />
      </div>
      <div style={{ position: "absolute", left: 1660, top: 700, width: 150, height: 190, borderRadius: "75px 75px 6px 6px", background: "#1d2430", border: `3px solid rgba(167,139,250,${0.35 + 0.5 * lit})` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d="M200,880 L1040,880" stroke={C.violet} strokeWidth={6} strokeDasharray="840" strokeDashoffset={840 * (1 - line)} />
        <line x1={0} x2={1920} y1={890} y2={890} stroke="rgba(244,240,232,0.15)" strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: 120, top: 780, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: C.sub, opacity: pr(t, b0, 0.4) }}>AI 数据中心 ←</div>
      <div style={{ position: "absolute", left: 1340, top: 920, transform: "translateX(-50%)", fontFamily: FONT, textAlign: "center", opacity: pr(t, NUKE_AT + 0.2, 0.4), whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.fg }}>美国三里岛核电站</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.muted, marginTop: 4 }}>微软签约购电 · 计划 2027 年重启</div>
      </div>
      <Lines at={b0} a={CH3.s20[0]} b={CH3.s20[1]} out={bar(40) - 0.05} />
      <Src at={b0 + 0.3}>三里岛 1 号机组 835 兆瓦，2019 年因亏损关闭；2024-09 微软签 20 年购电协议，计划 2027 年重启（Constellation）· 1979 年出事故的是 2 号机组</Src>
    </AbsoluteFill>
  );
};

// ── 21 · bars 40–42: by 2030, a Japan's worth of electricity ──
export const JapanPower: React.FC = () => {
  const t = useT();
  const b0 = bar(40);
  const fill = pr(t, b0 + 0.5, BAR * 1.1, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.violet} at={[68, 58]} strength={0.14} />
      <div style={{ position: "absolute", left: 1060, top: 300 }}>
        <Silhouette id="392" w={640} h={620} fill="rgba(167,139,250,0.06)" stroke="rgba(167,139,250,0.6)" level={fill} levelColor={C.violet} />
        <div style={{ position: "absolute", left: 470, top: 560, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: C.violet, opacity: pr(t, b0 + 0.3, 0.4), whiteSpace: "nowrap" }}>日本</div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 520, fontFamily: FONT, opacity: pr(t, b0 + 0.4, 0.4) }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.sub }}>2030 年，全球数据中心一年用电</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <Odometer value={lerp(4150, 9450, fill)} size={110} color={C.violet} />
          <span style={{ fontSize: 46, fontWeight: 900, color: C.violet }}>亿度</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.sub, marginTop: 6 }}>2024 年是 4,150 亿度</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: C.fg, marginTop: 20, opacity: pr(t, b0 + 0.5 + BAR * 1.1, 0.4) }}>≈ 日本一年的用电</div>
      </div>
      <Lines at={b0} a={CH3.s21[0]} b={CH3.s21[1]} out={bar(42) - 0.05} />
      <Src at={b0 + 0.3}>IEA（国际能源署）《能源与 AI》：数据中心用电 2024 年约 415 TWh，2030 年约 945 TWh，略多于日本今天一年的用电（预测，包括所有数据中心）</Src>
    </AbsoluteFill>
  );
};

// ── 22 · bars 42–44: the factory ships to AI first; the PC lane waits ──
export const Factory: React.FC = () => {
  const t = useT();
  const b0 = bar(42);
  const crates = 14;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[60, 60]} strength={0.1} />
      <div style={{ position: "absolute", left: 640, top: 420, width: 300, height: 330, borderRadius: 18, background: "linear-gradient(180deg, #273140, #19202a)", border: "2px solid #3a4556", fontFamily: FONT, opacity: pr(t, b0, 0.4) }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: -112, textAlign: "center", fontSize: 30, fontWeight: 900, color: C.fg }}>内存工厂</div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 30 + i * 85, top: -42, width: 40, height: 50, background: "#273140", border: "2px solid #3a4556", borderBottom: "none" }} />
        ))}
      </div>
      {/* two lanes */}
      <div style={{ position: "absolute", left: 940, top: 500, width: 560, height: 16, borderRadius: 8, background: "rgba(77,212,255,0.3)" }} />
      <div style={{ position: "absolute", left: 940, top: 700, width: 560, height: 16, borderRadius: 8, background: "rgba(244,240,232,0.12)" }} />
      <div style={{ position: "absolute", left: 1530, top: 470, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: C.cyan, whiteSpace: "nowrap" }}>AI 机房 · 先发</div>
      <div style={{ position: "absolute", left: 1530, top: 670, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: C.sub, whiteSpace: "nowrap" }}>电脑、手机</div>
      {Array.from({ length: crates }).map((_, i) => {
        const toAI = i % 5 !== 4;
        const start = b0 + 0.3 + i * 0.22;
        const p = pr(t, start, toAI ? 1.1 : 2.4, (x) => x);
        if (p <= 0 || p >= 1) return null;
        return (
          <div key={i} style={{ position: "absolute", left: lerp(900, 1460, p), top: toAI ? 446 : 646, width: 60, height: 50, borderRadius: 8, background: toAI ? "rgba(77,212,255,0.75)" : "rgba(244,240,232,0.4)", boxShadow: toAI ? "0 0 18px rgba(77,212,255,0.6)" : undefined }} />
        );
      })}
      <div style={{ position: "absolute", left: 1200, top: 740, padding: "4px 16px", borderRadius: 10, background: "rgba(255,90,95,0.18)", color: C.red, fontFamily: FONT, fontSize: 28, fontWeight: 900, opacity: pr(t, b0 + 1.6, 0.4), transform: `scale(${lerp(0.6, 1, pr(t, b0 + 1.6, 0.4, EBACK))})` }}>缺货</div>
      <Lines at={b0} a={CH3.s22[0]} b={CH3.s22[1]} out={bar(44) - 0.05} />
      <Src at={b0 + 0.3}>AI 显卡要的高带宽内存，2026 年底约占三大内存厂晶圆的 22%（TrendForce 预测），加上服务器内存优先供货，留给电脑、手机的少了 · 韩国 SK 海力士今年二季度一个季度的利润，超过去年全年</Src>
    </AbsoluteFill>
  );
};

// ── 23 · bars 44–46: back to the opening cart: that is why the stick costs 3,800 ──
export const CartAgain: React.FC = () => {
  const t = useT();
  const b0 = bar(44);
  const s = 0.62;
  const pcs = pr(t, b0 + 1.0, 0.8, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.red} at={[64, 50]} strength={0.14} />
      <div style={{ position: "absolute", left: 1020, top: 330, width: CARD.w, height: CARD.h, transformOrigin: "0 0", transform: `scale(${s})`, opacity: pr(t, b0, 0.4) }}>
        <CartCard price={3800} priceColor={C.red} priceScale={1} showPrice month="2026 年 7 月" stock="缺货" ramGone={0} struck={1} id="again" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => {
        const gone = i >= 8;
        return (
          <div key={i} style={{ position: "absolute", left: 1040 + i * 66, top: 760, opacity: gone ? 1 - 0.8 * pcs : 1 }}>
            <svg width="52" height="44" viewBox="0 0 52 44">
              <rect x="4" y="2" width="44" height="30" rx="4" fill={gone ? "rgba(255,90,95,0.25)" : "rgba(244,240,232,0.25)"} />
              <rect x="18" y="34" width="16" height="6" fill={gone ? "rgba(255,90,95,0.25)" : "rgba(244,240,232,0.25)"} />
            </svg>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1040, top: 830, fontFamily: FONT, opacity: pr(t, b0 + 1.0, 0.4), whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.fg }}>全球电脑，少卖了五分之一</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.muted, marginTop: 4 }}>苹果全线涨价："从未见过零部件涨价这么多、这么快"</div>
      </div>
      <Lines at={b0} a={CH3.s23[0]} b={CH3.s23[1]} out={bar(46) - 0.05} />
      <Src at={b0 + 0.3}>2026 年三季度全球电脑出货 −21%（Counterpoint）· 苹果 2026-06-25 全线涨价及声明（CNBC）· 32G DDR5 内存条 900 → 3,800 元（央视财经，2026-07）</Src>
    </AbsoluteFill>
  );
};

