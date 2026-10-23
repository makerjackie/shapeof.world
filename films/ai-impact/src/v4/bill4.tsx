import React from "react";
import { Odometer } from "../fx";
import { MiniRam } from "../samples/art";
import { FONT } from "../theme";
import { Silhouette } from "../v2/art";
import { Gpu } from "../v3/art";
import { CARD, CartCard } from "../v3/opening";
import { BAR, bar, BEAT } from "../v3/timing";
import { At, bump, clamp01, E, Key, lerp, Plane, pr, spring, Stage, useT } from "./engine";
import { Fine, Tag, Words } from "./type";

// 03 账单 · 片中 36–46 (PLAN-v4 S19–S23). Heat. The data hall eats through three pipes, and the words of the sentence
// are written on the pipes; the camera follows the power line out to a nuclear plant, cranes up to Japan filling with
// power, drops into the memory factory, and rides a crate back to the cart from the opening.

const B = (n: number) => bar(n);
const VIOLET = "#a78bfa";
const CYAN = "#4dd4ff";
const RED = "#ff5a5f";
const FG = "#f4f0e8";

const Bolt: React.FC<{ s: number; color?: string }> = ({ s, color = VIOLET }) => (
  <svg width={s * 0.6} height={s} viewBox="0 0 30 50" style={{ display: "block", filter: `drop-shadow(0 0 10px ${color})` }}>
    <path d="M18,0 L2,28 L14,28 L10,50 L28,18 L16,18 Z" fill={color} />
  </svg>
);

// world: the hall at x 0..700; pipes run left; the plant far left at x -3400; Japan above the plant; the factory below.
const HALLX = 260;
const PIPES = [
  { y: -120, word: "吃显卡，", color: CYAN, at: B(36) + 2 * BEAT },
  { y: 110, word: "吃内存，", color: "#8fd3ff", at: B(37) },
  { y: 340, word: "还吃电。", color: VIOLET, at: B(37) + 2 * BEAT },
];
export const NUKE = B(38) + 2 * BEAT;
const PLANT = { x: -3600, y: 420 };

const CoolingTower: React.FC<{ w: number; h: number; lit: number; t: number; seed: number }> = ({ w, h, lit, t, seed }) => (
  <div style={{ position: "relative", width: w, height: h }}>
    {Array.from({ length: 8 }).map((_, i) => {
      const ph = ((t * 0.28 + i / 8 + seed * 0.3) % 1) * lit;
      return <div key={i} style={{ position: "absolute", left: w * 0.5 - 50 - ph * 40 + i * 6, top: -30 - ph * 300, width: 100 + ph * 160, height: 100 + ph * 160, borderRadius: "50%", background: `rgba(230,224,240,${0.18 * (1 - ph) * lit})` }} />;
    })}
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M${w * 0.12},${h} Q${w * 0.32},${h * 0.45} ${w * 0.2},0 L${w * 0.8},0 Q${w * 0.68},${h * 0.45} ${w * 0.88},${h} Z`} fill="#1d1a26" stroke={`rgba(167,139,250,${0.35 + 0.6 * lit})`} strokeWidth={4} />
      <rect x={w * 0.3} y={h * 0.55} width={w * 0.4} height={8} rx={4} fill={`rgba(167,139,250,${0.9 * lit})`} />
    </svg>
  </div>
);

export const Bill: React.FC = () => {
  const t = useT();
  if (t < B(36) || t > B(42) + 0.05) return null;
  const keys: Key[] = [
    [B(36), { x: 120, y: 700, z: 0.9, r: 6 }],
    [B(36) + 0.6, { x: -60, y: 0, z: 0.9, r: 0 }, E.out],
    [B(38) - 0.3, { x: -40, y: 20, z: 0.98 }, E.lin],
    [B(38) + 0.9, { x: PLANT.x + 700, y: 120, z: 0.82 }, E.inOut],
    [B(40) - 0.1, { x: PLANT.x + 680, y: 100, z: 0.86 }, E.lin],
    [B(40) + 0.9, { x: PLANT.x + 520, y: -1600, z: 0.8 }, E.inOut],
    [B(42) + 0.05, { x: PLANT.x + 500, y: -1650, z: 0.86 }, E.lin],
  ];
  const lit = pr(t, NUKE, 0.8);
  const line = pr(t, B(38) - 0.2, 1.1, E.inOut);
  const jp = pr(t, B(40) + 0.6, BAR * 1.1, E.inOut);
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        {/* the hall */}
        <At x={HALLX} y={-400} o={pr(t, B(36), 0.4)}>
          <div style={{ position: "absolute", left: -200, top: -150, width: 1100, height: 1100, background: "radial-gradient(ellipse, rgba(255,106,61,0.22), transparent 62%)" }} />
          <div style={{ width: 640, height: 800, borderRadius: 30, background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 40px 90px rgba(0,0,0,0.55)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 32, top: 24, fontFamily: FONT, fontSize: 38, fontWeight: 900, color: FG }}>AI 数据中心</div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: 40 + i * 98, top: 100, width: 76, height: 660, borderRadius: 10, background: "linear-gradient(180deg, #2a2224, #17131a)", border: "1px solid #3a3036" }}>
                {Array.from({ length: 17 }).map((__, u) => {
                  const on = Math.sin(t * 3.2 + i * 1.3 + u * 0.8) > -0.2;
                  return <div key={u} style={{ position: "absolute", left: 12, top: 16 + u * 38, width: 9, height: 9, borderRadius: 5, background: on ? (u % 3 ? "#ffb347" : RED) : "#3a2e30" }} />;
                })}
              </div>
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 200, background: `linear-gradient(0deg, rgba(255,90,61,${0.18 + 0.08 * Math.sin(t * 5)}), transparent)` }} />
          </div>
        </At>
        {/* three pipes; each word of the sentence is written on its pipe */}
        {PIPES.map((p, k) => {
          const o = pr(t, p.at - 0.2, 0.35);
          return (
            <React.Fragment key={k}>
              <div style={{ position: "absolute", left: k === 2 ? PLANT.x + 600 : -1400, top: p.y - 18, width: k === 2 ? HALLX - (PLANT.x + 600) : HALLX + 1400, height: 36, borderRadius: 18, background: `linear-gradient(90deg, ${p.color}10, ${p.color}55)`, opacity: k === 2 ? Math.max(o, line) : o, boxShadow: `0 0 30px ${p.color}33` }} />
              {Array.from({ length: k === 2 ? 26 : 9 }).map((_, i) => {
                if (t < p.at - 0.2) return null;
                const span = k === 2 ? HALLX - PLANT.x - 600 : 1640;
                const ph = (((t - p.at) * (k === 2 ? 0.35 : 0.5) + i / (k === 2 ? 26 : 9)) % 1 + 1) % 1;
                const x = (k === 2 ? PLANT.x + 600 : -1400) + ph * span;
                return (
                  <At key={i} x={x} y={p.y - 30} o={o * clamp01(ph * 8) * clamp01((1 - ph) * 8)}>
                    {k === 0 ? <Gpu w={110} t={t} glow={1} id={`bp${i}`} /> : k === 1 ? <MiniRam w={110} color={CYAN} fill="#1c2733" /> : <Bolt s={60} />}
                  </At>
                );
              })}
              <Words at={p.at} lines={[p.word]} x={-960} y={p.y - 112} size={86} colors={[p.color]} reveal="pop" cps={12} />
            </React.Fragment>
          );
        })}
        <Words at={B(36) + 0.1} lines={["AI 很能吃。"]} x={-960} y={-470} size={132} reveal="slam" kw={["很能吃"]} kwColor="#ff8a5c" />
        {/* the plant */}
        <At x={PLANT.x - 380} y={PLANT.y - 540}>
          <CoolingTower w={330} h={540} lit={lit} t={t} seed={0} />
        </At>
        <At x={PLANT.x} y={PLANT.y - 540}>
          <CoolingTower w={330} h={540} lit={lit} t={t} seed={1} />
        </At>
        <div style={{ position: "absolute", left: PLANT.x + 380, top: PLANT.y - 240, width: 180, height: 240, borderRadius: "90px 90px 8px 8px", background: "#1d1a26", border: `4px solid rgba(167,139,250,${0.35 + 0.6 * lit})` }} />
        <div style={{ position: "absolute", left: PLANT.x - 1400, top: PLANT.y, width: 6000, height: 3, background: "rgba(244,240,232,0.15)" }} />
        <At x={PLANT.x + 80} y={PLANT.y + 40}>
          <Tag at={NUKE + 0.25} text="美国三里岛核电站" sub="微软签约购电 · 计划 2027 年重启" size={46} align="center" />
        </At>
        <Words at={B(38) + 0.7} lines={["为了喂它，美国连", "关掉的核电站都要重启。"]} x={-2950} y={-380} size={80} kw={["关掉的核电站"]} kwColor={VIOLET} kwAt={NUKE + 0.2} out={B(40) + 0.3} outStyle="down" />
        {/* Japan, above the plant */}
        <At x={PLANT.x + 300} y={-2030} o={pr(t, B(40) + 0.3, 0.5)}>
          <Silhouette id="392" w={760} h={740} fill="rgba(167,139,250,0.06)" stroke="rgba(167,139,250,0.7)" level={jp} levelColor={VIOLET} />
          <div style={{ position: "absolute", left: 560, top: 680, fontFamily: FONT, fontSize: 44, fontWeight: 900, color: VIOLET, whiteSpace: "nowrap" }}>日本</div>
        </At>
        <At x={-4130} y={-1750} o={pr(t, B(40) + 0.5, 0.4)}>
          <div style={{ fontFamily: FONT, whiteSpace: "nowrap", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#c9c0dc" }}>2030 年，全球数据中心一年用电</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <Odometer value={lerp(4150, 9450, jp)} size={130} color={VIOLET} />
              <span style={{ fontSize: 56, fontWeight: 900, color: VIOLET }}>亿度</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#a69cbc" }}>2024 年是 4,150 亿度</div>
          </div>
        </At>
        <Words at={B(40) + 0.35} lines={["2030 年，全球机房", "要用掉一个日本的电。"]} x={-4130} y={-2112} size={84} kw={["一个日本"]} kwColor={VIOLET} kwAt={B(40) + 0.6 + BAR * 1.1} />
      </Plane>
      <Fine at={B(38) + 0.6} out={B(40) - 0.05}>
        三里岛 1 号机组 835 兆瓦，2019 年因亏损关闭；2024-09 微软签 20 年购电协议，计划 2027 年重启（Constellation）· 1979 年出事故的是 2 号机组
      </Fine>
      <Fine at={B(40) + 0.4} out={B(42) - 0.05}>
        IEA（国际能源署）《能源与 AI》：数据中心用电 2024 年约 415 TWh，2030 年约 945 TWh，略多于日本今天一年的用电（预测）
      </Fine>
    </Stage>
  );
};

// ── S22 + S23 · the memory factory, then a crate back to the cart (B42 → B46) ──
const FAC = { x: -900, y: -120 };
const LANE_AI = -60;
const LANE_PC = 260;
const CARTX = 2600;
export const Factory4: React.FC = () => {
  const t = useT();
  if (t < B(42) - 0.05 || t > B(46) + 0.05) return null;
  const keys: Key[] = [
    [B(42) - 0.05, { x: -200, y: -900, z: 0.8 }],
    [B(42) + 0.6, { x: 0, y: 40, z: 0.9 }, E.out],
    [B(44) - 0.35, { x: 120, y: 60, z: 0.95 }, E.lin],
    [B(44) + 0.7, { x: CARTX, y: 0, z: 1.0 }, E.inOut],
    [B(46) + 0.05, { x: CARTX, y: -10, z: 1.06 }, E.lin],
  ];
  const ride = pr(t, B(44) - 0.35, 1.05, E.inOut);
  const pcs = pr(t, B(45), 0.8, E.inOut);
  const crateX = lerp(900, CARTX - 300, ride);
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        {/* factory */}
        <At x={FAC.x} y={FAC.y} o={pr(t, B(42), 0.4)}>
          <div style={{ position: "relative", width: 420, height: 520, borderRadius: 22, background: "linear-gradient(180deg, #2c2a33, #1a1820)", border: "2px solid #45404f", boxShadow: "0 40px 90px rgba(0,0,0,0.5)" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ position: "absolute", left: 50 + i * 120, top: -70, width: 56, height: 74, background: "#2c2a33", border: "2px solid #45404f", borderBottom: "none" }}>
                {Array.from({ length: 4 }).map((_, k) => {
                  const ph = ((t * 0.5 + k / 4 + i * 0.3) % 1);
                  return <div key={k} style={{ position: "absolute", left: 10 - ph * 20, top: -40 - ph * 160, width: 40 + ph * 60, height: 40 + ph * 60, borderRadius: "50%", background: `rgba(220,214,230,${0.12 * (1 - ph)})` }} />;
                })}
              </div>
            ))}
            {/* a wafer turning */}
            <div style={{ position: "absolute", left: 90, top: 110, width: 240, height: 240, borderRadius: "50%", background: "conic-gradient(from 0deg, #3d5a73, #8fb4cf, #3d5a73, #6c8aa3, #3d5a73)", transform: `rotate(${t * 40}deg)`, boxShadow: "0 0 40px rgba(143,211,255,0.25)" }}>
              <div style={{ position: "absolute", inset: 20, borderRadius: "50%", backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: FONT, fontSize: 40, fontWeight: 900, color: FG }}>内存工厂</div>
          </div>
        </At>
        {/* two lanes */}
        <div style={{ position: "absolute", left: FAC.x + 420, top: LANE_AI, width: 1500, height: 18, borderRadius: 9, background: "rgba(77,212,255,0.35)", boxShadow: "0 0 20px rgba(77,212,255,0.3)" }} />
        <div style={{ position: "absolute", left: FAC.x + 420, top: LANE_PC, width: CARTX - FAC.x - 700, height: 18, borderRadius: 9, background: "rgba(244,240,232,0.12)" }} />
        <At x={700} y={LANE_AI - 100}>
          <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 900, color: CYAN, whiteSpace: "nowrap" }}>AI 机房 · 先发</div>
        </At>
        <At x={FAC.x + 480} y={LANE_PC + 40}>
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: "#b8b8b3", whiteSpace: "nowrap" }}>电脑、手机</div>
        </At>
        {Array.from({ length: 40 }).map((_, i) => {
          const start = B(42) + 0.2 + i * 0.09;
          const p = pr(t, start, 0.75, E.lin);
          if (p <= 0 || p >= 1) return null;
          return <At key={i} x={lerp(FAC.x + 420, FAC.x + 1900, p)} y={LANE_AI - 66}><div style={{ width: 80, height: 62, borderRadius: 10, background: "rgba(77,212,255,0.8)", boxShadow: "0 0 22px rgba(77,212,255,0.7)" }} /></At>;
        })}
        {/* the one crate for the PCs, slow, which the camera follows to the cart */}
        <At x={t < B(44) - 0.35 ? lerp(FAC.x + 440, 900, pr(t, B(42) + 0.4, B(44) - 0.75 - B(42), E.lin)) : crateX} y={LANE_PC - 66}>
          <div style={{ width: 80, height: 62, borderRadius: 10, background: "rgba(244,240,232,0.45)" }} />
        </At>
        <At x={260} y={LANE_PC + 60}>
          <div style={{ transform: `scale(${spring(t, B(43) + 0.2, 2, 8)})`, padding: "6px 22px", borderRadius: 12, background: "rgba(255,90,95,0.2)", color: RED, fontFamily: FONT, fontSize: 42, fontWeight: 900, whiteSpace: "nowrap", border: `2px solid ${RED}` }}>缺货</div>
        </At>
        {/* the cart from the opening, and the PCs that did not sell */}
        <At x={CARTX - CARD.w * 0.4} y={-210} s={0.8} o={pr(t, B(44) + 0.2, 0.4)}>
          <CartCard price={3800} priceColor={RED} priceScale={1 + 0.12 * bump(t, B(45), 0.03, 0.4)} showPrice month="2026 年 7 月" stock="缺货" ramGone={0} struck={1} id="b4cart" />
        </At>
        {Array.from({ length: 10 }).map((_, i) => {
          const gone = i >= 8;
          return (
            <At key={i} x={CARTX - 470 + i * 96} y={270} o={pr(t, B(44) + 0.6 + i * 0.03, 0.3) * (gone ? 1 - 0.8 * pcs : 1)}>
              <svg width="72" height="60" viewBox="0 0 52 44">
                <rect x="4" y="2" width="44" height="30" rx="4" fill={gone ? "rgba(255,90,95,0.35)" : "rgba(244,240,232,0.3)"} />
                <rect x="18" y="34" width="16" height="6" fill={gone ? "rgba(255,90,95,0.35)" : "rgba(244,240,232,0.3)"} />
              </svg>
            </At>
          );
        })}
        <At x={CARTX - 470} y={350} o={pr(t, B(45), 0.4)}>
          <div style={{ fontFamily: FONT, whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: FG }}>全球电脑，少卖了五分之一</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#8a8a85", marginTop: 6 }}>苹果全线涨价："从未见过零部件涨价这么多、这么快"</div>
          </div>
        </At>
      </Plane>
      <Words at={B(42) + 0.2} lines={["AI 的显卡也要内存，", "工厂先把货给了它。"]} x={120} y={130} size={78} kw={["先把货给了它"]} kwColor={CYAN} kwAt={B(43)} out={B(44) - 0.3} />
      <Words at={B(44) + 0.4} lines={["所以，开头那根内存条，", "才涨到了 3,800。"]} x={960} y={110} size={80} align="center" kw={["3,800"]} kwColor={RED} kwAt={B(45)} />
      <Fine at={B(42) + 0.4} out={B(44) - 0.1}>
        AI 显卡要的高带宽内存，2026 年底约占三大内存厂晶圆的 22%（TrendForce 预测），加上服务器内存优先供货 · SK 海力士今年二季度一个季度的利润，超过去年全年
      </Fine>
      <Fine at={B(44) + 0.6} out={B(46) - 0.1}>
        2026 年三季度全球电脑出货 −21%（Counterpoint）· 苹果 2026-06-25 全线涨价及声明（CNBC）
      </Fine>
    </Stage>
  );
};
