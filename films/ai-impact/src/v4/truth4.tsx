import { geoNaturalEarth1, geoPath } from "d3-geo";
import React from "react";
import { AbsoluteFill } from "remotion";
import { feature } from "topojson-client";
import world110Topo from "world-atlas/countries-110m.json";
import { Odometer } from "../fx";
import { FONT, SERIF } from "../theme";
import { Door, Person } from "../v2/art";
import { ChatBox, Walker } from "../v3/art";
import { BAR, bar, BEAT } from "../v3/timing";
import { At, bump, clamp01, E, Key, lerp, Plane, pr, rnd, spring, Stage, useT } from "./engine";
import { Fine, Words } from "./type";

// 间奏 可是 (片中 56–64) and 05 真相 (64–80), PLAN-v4 S29–S40. Black, then warm amber. One long take along a row of
// doors by age; the youngest door slams narrow on the music's return; then the evidence, the camera moving on from
// each picture to the next instead of cutting.

const B = (n: number) => bar(n);
const GOLD = "#ffd166";
const CYAN = "#4dd4ff";
const RED = "#ff5a5f";
const GREEN = "#3ddc97";
const FG = "#f4f0e8";

// ── S29 · 可是 (B56 → B58) ──
export const But4: React.FC = () => {
  const t = useT();
  if (t < B(56) || t > B(58) + 0.1) return null;
  const s = lerp(0.97, 1.03, pr(t, B(56), BAR * 2, E.lin));
  return (
    <AbsoluteFill style={{ transform: `scale(${s})` }}>
      <Words at={B(56) + 0.3} lines={["可是。"]} x={960} y={420} size={170} serif align="center" reveal="blur" cps={6} out={B(58) - 0.15} outStyle="blur" />
    </AbsoluteFill>
  );
};

// ── S30 · three lines shoot up, one stays on the floor (B58 → B60) ──
export const Flat4: React.FC = () => {
  const t = useT();
  if (t < B(58) - 0.05 || t > B(60) + 0.1) return null;
  const L = 2600;
  const draw = pr(t, B(58) + 0.2, BAR * 1.6, E.inOut);
  const keys: Key[] = [
    [B(58), { x: 500, y: -260, z: 0.82 }],
    [B(60) + 0.1, { x: 1850, y: -300, z: 0.86 }, E.inOut],
  ];
  const ups = [
    { name: "英伟达 ×12", c: CYAN, k: 1 },
    { name: "AI 干活时长 ×260", c: "#a78bfa", k: 0.85 },
    { name: "大厂投入 ×5", c: GOLD, k: 0.6 },
  ];
  const curve = (k: number, u: number) => -Math.pow(u, 2.2) * 2600 * k;
  const path = (f: (u: number) => number, upto: number) =>
    Array.from({ length: 61 }, (_, i) => i / 60)
      .filter((u) => u <= upto)
      .map((u, i) => `${i === 0 ? "M" : "L"}${u * L},${f(u)}`)
      .join(" ");
  const ue = (u: number) => -(3.6 + 0.6 * Math.pow(u, 1.4)) * 9;
  const tipX = draw * L;
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        <div style={{ position: "absolute", left: -400, top: 0, width: L + 1200, height: 2, background: "rgba(244,240,232,0.25)" }} />
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          {ups.map((u) => (
            <path key={u.name} d={path((x) => curve(u.k, x), 1)} stroke={u.c} strokeWidth={6} fill="none" opacity={0.2} />
          ))}
          <path d={path(ue, draw)} stroke={FG} strokeWidth={10} fill="none" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.6))" }} />
          <circle cx={tipX} cy={ue(draw)} r={14} fill={FG} />
        </svg>
        {ups.map((u, i) => (
          <At key={u.name} x={0.5 * L + i * 160} y={curve(u.k, 0.5) - 60}>
            <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 800, color: u.c, opacity: 0.5, whiteSpace: "nowrap" }}>{u.name}</div>
          </At>
        ))}
        <At x={-30} y={-150}>
          <div style={{ transform: "translateX(-100%)", fontFamily: FONT, textAlign: "right", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#b8b8b3" }}>美国失业率</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: FG }}>3.6%</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#8a8a85" }}>2022.11</div>
          </div>
        </At>
        <At x={tipX + 40} y={-160} o={pr(t, B(58) + 0.2 + BAR * 1.5, 0.4)}>
          <div style={{ fontFamily: FONT, whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: FG }}>4.2%</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#8a8a85" }}>2026.09</div>
          </div>
        </At>
      </Plane>
      <Words at={B(58) + 0.1} lines={["AI 投资最多的美国，", "失业率四年几乎没动。"]} x={110} y={140} size={76} kw={["几乎没动"]} kwColor={FG} />
      <Fine at={B(58) + 0.4} out={B(60) - 0.1}>
        美国失业率 3.6%（2022-11）→ 4.2%（2026-09），美国劳工统计局 · 美国 2025 年私营 AI 投资 2,859 亿美元，全球第一（斯坦福 AI 指数 2026）· 耶鲁 Budget Lab（2026-10）："还没看到明确的 AI 痕迹" · 三条曲线为示意
      </Fine>
    </Stage>
  );
};

// ── S31–S33 · the doors by age, one long take; the youngest slams narrow (B60 → B66) ──
const AGES = ["50 岁以上", "41–49 岁", "35–40 岁", "26–34 岁", "22–25 岁"];
const DX = (i: number) => i * 600;
const DW = 260;
const DH = 540;
export const SLAM4 = B(64);
export const Corridor4: React.FC = () => {
  const t = useT();
  if (t < B(60) - 0.05 || t > B(66) + 0.05) return null;
  const narrow = spring(t, SLAM4 + 0.03, 2.6, 9);
  const keys: Key[] = [
    [B(60), { x: -200, y: -280, z: 1.0 }],
    [B(63), { x: DX(4) - 330, y: -330, z: 1.05 }, E.inOut],
    [SLAM4 - 0.02, { x: DX(4) - 380, y: -380, z: 1.22 }, E.lin],
    [SLAM4 + 0.12, { x: DX(4) - 380, y: -380, z: 1.12 }, E.out],
    [B(66) - 0.3, { x: DX(4) - 380, y: -400, z: 1.0 }, E.out],
    [B(66) + 0.05, { x: DX(4) - 380, y: -800, z: 0.7 }, E.in],
  ];
  const shake = bump(t, SLAM4, 0.01, 0.35) * 26;
  const glow = pr(t, SLAM4, 0.5);
  const grad = pr(t, B(62) + 0.2, 0.6);
  return (
    <Stage keys={keys} drift={0} shake={shake}>
      <Plane>
        <div style={{ position: "absolute", left: -1200, top: 0, width: 5200, height: 2, background: "rgba(244,240,232,0.18)" }} />
        {AGES.map((age, i) => {
          const young = i === 4;
          const w = young ? lerp(DW, 130, narrow) : DW;
          const fade = young ? 1 : 1 - 0.75 * pr(t, SLAM4, 0.4);
          return (
            <At key={age} x={DX(i) - w / 2} y={-DH} o={fade}>
              {young ? <div style={{ position: "absolute", left: -300, top: -200, width: w + 600, height: DH + 400, background: `radial-gradient(ellipse at 50% 60%, rgba(255,209,102,${0.18 + 0.35 * glow}), transparent 60%)` }} /> : null}
              <Door w={w} h={DH} light={young ? 0.9 : 0.55} frame={young && narrow > 0 ? `rgba(255,209,102,${0.5 + 0.5 * clamp01(narrow)})` : "#3a4250"} />
              <div style={{ position: "absolute", left: w / 2, top: -76, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 40, fontWeight: 900, color: young ? GOLD : "#b8b8b3", whiteSpace: "nowrap", opacity: young ? 1 : 1 - pr(t, SLAM4, 0.3) }}>{age}</div>
              {/* light spilling onto the floor */}
              <div style={{ position: "absolute", left: -w * 0.3, top: DH, width: w * 1.6, height: 160, background: `linear-gradient(180deg, rgba(255,209,102,${young ? 0.22 : 0.1}), transparent)`, clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" }} />
            </At>
          );
        })}
        {[0, 1, 2, 3].map((i) =>
          [0, 1].map((k) => {
            const ph = (t * 0.2 + k * 0.5 + i * 0.13) % 1;
            return (
              <At key={`${i}${k}`} x={DX(i) - 170 + ph * 170} y={-150} o={Math.min(1, (1 - ph) * 4) * 0.85}>
                <Walker h={150} t={t} speed={1} color="#56606e" bag={k === 1} />
              </At>
            );
          }),
        )}
        <At x={DX(4) - 230} y={-190} o={grad}>
          <Person h={190} color="#6b7686" cap={1} />
        </At>
      </Plane>
      <Words at={B(60) + 0.15} lines={["那它到底，", "抢了谁的饭碗？"]} x={110} y={140} size={80} kw={["谁的饭碗"]} out={B(62) - 0.1} />
      <AbsoluteFill style={{ background: GOLD, opacity: bump(t, SLAM4, 0.01, 0.25) * 0.25, mixBlendMode: "screen" }} />
      <Words at={SLAM4 + 0.12} lines={["变窄的，", "是第一份工作的门。"]} x={110} y={120} size={96} reveal="slam" gap={0.45} kw={["第一份工作"]} kwAt={SLAM4 + 4 * BEAT} out={B(66) - 0.2} />
    </Stage>
  );
};

// ── S34 + S35 · desks, then bowls (B66 → B70) ──
const Desk: React.FC<{ on: number; color: string; bowl: number; t: number }> = ({ on, color, bowl }) => (
  <div style={{ position: "relative", width: 170, height: 170, opacity: lerp(0.15, 1, on) }}>
    <div style={{ position: "absolute", left: 38, top: 6 }}>
      <Person h={96} color={color} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 106, width: 170, height: 18, borderRadius: 4, background: "#4a3f33" }} />
    <div style={{ position: "absolute", left: 46, top: 58, width: 80, height: 48, borderRadius: 6, background: "#1a2028", border: `2px solid ${CYAN}`, opacity: 1 - bowl, transform: `scale(${1 - 0.4 * bowl})` }} />
    <svg width="110" height="70" viewBox="0 0 120 80" style={{ position: "absolute", left: 30, top: 40, opacity: bowl, transform: `scale(${0.6 + 0.4 * bowl})`, overflow: "visible" }}>
      <ellipse cx="60" cy="22" rx={44} ry={14} fill="#f4efe2" />
      <path d="M44,12 Q50,-6 56,10" stroke="rgba(244,240,232,0.5)" strokeWidth="3" fill="none" />
      <path d="M8,24 Q60,32 112,24 Q104,70 60,74 Q16,70 8,24 Z" fill="#d8c9a8" />
      <path d="M30,46 Q60,52 90,46" stroke="#8a6a3d" strokeWidth="4" fill="none" />
    </svg>
  </div>
);
export const BOWL4 = B(68) + 3 * BEAT;
export const Rows4: React.FC = () => {
  const t = useT();
  if (t < B(66) - 0.05 || t > B(70) + 0.05) return null;
  const keys: Key[] = [
    [B(66) - 0.05, { x: 260, y: 900, z: 0.9 }],
    [B(66) + 0.6, { x: 330, y: 60, z: 1.16 }, E.out],
    [B(68), { x: 340, y: 50, z: 1.2 }, E.lin],
    [B(70) + 0.05, { x: 380, y: 40, z: 1.28 }, E.lin],
  ];
  const go = pr(t, B(66) + 2 * BEAT, 0.6, E.inOut);
  const add = spring(t, B(66) + 3 * BEAT, 2, 8);
  const bowl = pr(t, B(68) + 0.1, 0.6, E.inOut);
  const gone = pr(t, BOWL4, 0.5, E.inOut);
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        {[0, 1].map((row) => {
          const young = row === 0;
          const y = young ? -130 : 150;
          return (
            <React.Fragment key={row}>
              <At x={-210} y={y + 30}>
                <div style={{ fontFamily: FONT, whiteSpace: "nowrap", textAlign: "right", transform: "translateX(-100%)" }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: young ? GOLD : FG }}>{young ? (bowl > 0.5 ? "新人" : "22–25 岁") : bowl > 0.5 ? "老手" : "41–49 岁"}</div>
                  <div style={{ fontSize: 52, fontWeight: 900, color: young ? RED : GREEN, opacity: (young ? go : clamp01(add)) * (1 - bowl) }}>{young ? "约 −19%" : "约 +20%"}</div>
                </div>
              </At>
              {Array.from({ length: young ? 5 : 6 }).map((_, i) => {
                const last = young && i === 4;
                const extra = !young && i === 5;
                const on = last ? 1 - go * 0.85 : extra ? clamp01(add) : 1;
                const lift = last ? gone * 60 : 0;
                return (
                  <At key={i} x={-150 + i * 210} y={y - lift} o={last && bowl > 0.5 ? 1 - gone : 1} s={extra ? lerp(0.6, 1, clamp01(add)) : 1}>
                    <Desk on={bowl > 0.5 && last ? 1 : on} color={young ? "#8b96a6" : "#5f6878"} bowl={bowl} t={t} />
                  </At>
                );
              })}
              {young ? (
                <At x={-150 + 4 * 210 + 40} y={y + 70} o={gone}>
                  <div style={{ width: 100, height: 40, borderRadius: "50%", border: "3px dashed rgba(255,209,102,0.7)" }} />
                </At>
              ) : null}
            </React.Fragment>
          );
        })}
      </Plane>
      <Words at={B(66) + 0.1} lines={["美国的程序员里，", "新人少两成，老手多两成。"]} x={110} y={130} size={74} kw={["新人少两成", "老手多两成"]} kwAt={B(66) + 3 * BEAT + 0.2} out={B(68) - 0.1} />
      <Words at={B(68) + 0.1} lines={["老手的饭碗没动，", "少的，是新人那一碗。"]} x={110} y={130} size={74} kw={["新人那一碗"]} kwAt={BOWL4 + 0.2} />
      <Fine at={B(66) + 0.4} out={B(68) - 0.1}>
        美国软件开发岗位，2022-11 → 2026-06（从论文图中读出）· 全部 AI 最擅长的工作里，22–25 岁约 −11%，最不擅长的约 +10% · 斯坦福 Brynjolfsson 等，ADP 工资单，每月数百万员工；描述性证据，不是因果
      </Fine>
      <Fine at={B(68) + 0.3} out={B(70) - 0.1}>
        同一研究：26 岁以上的员工没有这个缺口；变化来自少招新人，不是多裁员（Brynjolfsson、Chandar、Chen，2026-08）
      </Fine>
    </Stage>
  );
};

// ── S36 · 41 countries (B70 → B72) ──
const world110 = feature(world110Topo as never, (world110Topo as never as { objects: { countries: never } }).objects.countries) as unknown as { features: unknown[] };
const WORLD_D = (() => {
  const proj = geoNaturalEarth1().fitExtent(
    [
      [0, 0],
      [1700, 820],
    ],
    { type: "FeatureCollection", features: world110.features } as never,
  );
  return geoPath(proj)({ type: "FeatureCollection", features: world110.features } as never) ?? "";
})();
export const Countries4: React.FC = () => {
  const t = useT();
  if (t < B(70) - 0.05 || t > B(72) + 0.05) return null;
  const map = pr(t, B(70), 0.8);
  const n = Math.round(lerp(1, 41, pr(t, B(70) + 0.3, 1.2, E.inOut)));
  const s = lerp(1.08, 1.0, pr(t, B(70), BAR * 2, E.lin));
  const scan = pr(t, B(70) + 0.2, 1.4, E.inOut);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})` }}>
      <svg width={1700} height={820} style={{ position: "absolute", left: 110, top: 200, opacity: 0.6 * map }}>
        <defs>
          <linearGradient id="scan4" x1="0" y1="0" x2="1" y2="0">
            <stop offset={Math.max(0, scan - 0.08)} stopColor="rgba(255,209,102,0.05)" />
            <stop offset={scan} stopColor="rgba(255,209,102,0.45)" />
            <stop offset={Math.min(1, scan + 0.02)} stopColor="rgba(255,209,102,0.08)" />
          </linearGradient>
        </defs>
        <path d={WORLD_D} fill="url(#scan4)" stroke="rgba(255,209,102,0.35)" strokeWidth={1} />
      </svg>
      <div style={{ position: "absolute", left: 960, top: 420, transform: "translateX(-50%)", textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.85)", opacity: pr(t, B(70) + 0.25, 0.4) }}>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 170, fontWeight: 900, color: FG, fontVariantNumeric: "tabular-nums" }}>{n}</span>
          <span style={{ fontSize: 80, fontWeight: 900, color: FG }}>个国家</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: "#c9bfa8" }}>1.25 亿条招聘广告</div>
      </div>
      <div style={{ position: "absolute", left: 960, top: 760, transform: "translateX(-50%)", display: "flex", gap: 90, fontFamily: FONT, whiteSpace: "nowrap", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>
        {[
          ["老员工", "+6.7%", GREEN],
          ["新人", "−2.5%", RED],
          ["总招聘", "还在涨", FG],
        ].map(([a, b, c], i) => {
          const p = spring(t, B(71) + i * BEAT * 0.8, 2, 8);
          return (
            <div key={a} style={{ textAlign: "center", opacity: clamp01(p * 2), transform: `translateY(${(1 - clamp01(p)) * 30}px)` }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#c9bfa8" }}>{a}</div>
              <div style={{ fontSize: 76, fontWeight: 900, color: c }}>{b}</div>
            </div>
          );
        })}
      </div>
      <Words at={B(70) + 0.1} lines={["41 国用 AI 的公司：", "多招老手，少招新人。"]} x={110} y={110} size={72} kw={["少招新人"]} kwColor={RED} kwAt={B(71) + 0.6} />
      <Fine at={B(70) + 0.4} out={B(72) - 0.1}>
        Chandar（斯坦福）& Klein Teeselink（伦敦国王学院），2026-09：比较 41 国用 AI 和不用 AI 的公司，五年变化（新人 −2.5% 据该校新闻稿，彭博报道为 −3%）
      </Fine>
    </AbsoluteFill>
  );
};

// ── S37 + S38 · before / now, then the textbook (B72 → B76): one dolly to the right ──
const Stack: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ position: "relative", width: 150, height: 34 + n * 16 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ position: "absolute", left: (i % 2) * 7, bottom: i * 16, width: 140, height: 18, borderRadius: 3, background: "#ece6da", border: "1px solid rgba(25,35,31,0.3)" }} />
    ))}
  </div>
);
const PANEL_W = 900;
export const Handoff4: React.FC = () => {
  const t = useT();
  if (t < B(72) - 0.05 || t > B(76) + 0.05) return null;
  const keys: Key[] = [
    [B(72) - 0.05, { x: 450, y: 60, z: 0.9 }],
    [B(73), { x: 520, y: 60, z: 0.93 }, E.lin],
    [B(73) + 0.7, { x: 1500, y: 60, z: 0.93 }, E.inOut],
    [B(74) - 0.1, { x: 1540, y: 60, z: 0.95 }, E.lin],
    [B(74) + 0.6, { x: 2900, y: 80, z: 1.0 }, E.inOut],
    [B(76) + 0.05, { x: 3000, y: 80, z: 1.06 }, E.lin],
  ];
  const give1 = pr(t, B(72) + 0.45, 0.8, E.inOut);
  const give2 = pr(t, B(73) + 0.75, 0.8, E.inOut);
  const panel = (x: number, label: string, toBot: boolean, g: number) => (
    <At x={x} y={-200}>
      <div style={{ position: "relative", width: PANEL_W, height: 660, borderRadius: 30, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <div style={{ position: "absolute", left: 36, top: 26, fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: toBot ? CYAN : GOLD }}>{label}</div>
        <div style={{ position: "absolute", left: 110, top: 300 }}>
          <Person h={250} color="#5f6878" />
          <div style={{ position: "absolute", left: 40, top: 270, fontFamily: FONT, fontSize: 32, fontWeight: 800, color: "#b8b8b3", whiteSpace: "nowrap" }}>老手</div>
        </div>
        <div style={{ position: "absolute", left: lerp(230, 560, g), top: lerp(380, 340, g) - Math.sin(g * Math.PI) * 120, transform: `rotate(${Math.sin(g * Math.PI) * -12}deg)` }}>
          <Stack n={6} />
        </div>
        {toBot ? (
          <>
            <div style={{ position: "absolute", left: 540, top: 260, transform: "scale(0.42)", transformOrigin: "0 0" }}>
              <ChatBox t={t} w={760} h={420} />
            </div>
            <div style={{ position: "absolute", left: 660, top: 460, opacity: 0.5 }}>
              <Person h={150} color="#8b96a6" />
              <div style={{ position: "absolute", left: -10, top: 160, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: "#8a8a85", whiteSpace: "nowrap" }}>新人，空着手</div>
            </div>
          </>
        ) : (
          <div style={{ position: "absolute", left: 620, top: 340 }}>
            <Person h={210} color="#8b96a6" />
            <div style={{ position: "absolute", left: 30, top: 228, fontFamily: FONT, fontSize: 32, fontWeight: 800, color: GOLD, whiteSpace: "nowrap" }}>新人</div>
          </div>
        )}
      </div>
    </At>
  );
  const open = pr(t, B(74) + 0.3, 0.5);
  const TB = { x: 2400, y: -150 };
  const BOX = { x: 3200, y: -200 };
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        {panel(0, "以前", false, give1)}
        {panel(1060, "现在", true, give2)}
        {/* the textbook and what flies out of it */}
        <At x={TB.x} y={TB.y} o={open}>
          <div style={{ position: "relative", width: 640, height: 420 }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 320, height: 420, background: "#ece6da", borderRadius: "12px 0 0 12px", transformOrigin: "100% 50%", transform: `perspective(900px) rotateY(${lerp(80, 8, open)}deg)` }} />
            <div style={{ position: "absolute", left: 320, top: 0, width: 320, height: 420, background: "#f3eee3", borderRadius: "0 12px 12px 0" }}>
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} style={{ position: "absolute", left: 34, top: 38 + i * 32, height: 9, width: `${[80, 70, 76, 60, 82, 68, 74, 50, 78, 64, 72][i]}%`, borderRadius: 4, background: "rgba(25,35,31,0.35)", opacity: 1 - pr(t, B(74) + 0.8 + i * 0.12, 0.3) }} />
              ))}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 444, textAlign: "center", fontFamily: FONT, fontSize: 32, fontWeight: 800, color: "#c9bfa8", whiteSpace: "nowrap" }}>写得下来、能检查对错的知识</div>
          </div>
        </At>
        {Array.from({ length: 11 }).map((_, i) => {
          const p = pr(t, B(74) + 0.8 + i * 0.12, 0.75, E.inOut);
          if (p <= 0 || p >= 1) return null;
          return <At key={i} x={lerp(TB.x + 360, BOX.x + 60, p)} y={lerp(TB.y + 40 + i * 32, BOX.y + 120, p) - Math.sin(p * Math.PI) * 160}><div style={{ width: lerp(220, 50, p), height: 9, borderRadius: 4, background: CYAN, boxShadow: `0 0 12px ${CYAN}` }} /></At>;
        })}
        <At x={BOX.x} y={BOX.y} s={0.55} o={pr(t, B(74) + 0.2, 0.4)}>
          <div style={{ position: "absolute", left: -200, top: -150, width: 1160, height: 720, background: "radial-gradient(ellipse, rgba(77,212,255,0.18), transparent 62%)" }} />
          <ChatBox t={t} w={760} h={420} />
        </At>
      </Plane>
      <Words at={B(72) + 0.1} lines={["留给新人练手的活，", "老手直接交给了它。"]} x={110} y={120} size={74} kw={["交给了它"]} kwColor={CYAN} kwAt={B(73) + 1.3} out={B(74) - 0.1} />
      <Words at={B(74) + 0.15} lines={["它最会的，", "正是写得进课本的东西。"]} x={110} y={120} size={74} kw={["写得进课本"]} kwColor={CYAN} />
      <Fine at={B(72) + 0.4} out={B(76) - 0.1}>
        论文作者的推测：AI 可能在替代过去撑起入门岗位的那些能检查对错、按流程走的活，同时放大老员工的作用；它更能替代写得下来的知识，更能帮上靠实践攒下的经验（Brynjolfsson 等，2026-08）· 画面为示意
      </Fine>
    </Stage>
  );
};

// ── S39 · seasons through the window (B76 → B78) ──
export const Seasons4: React.FC = () => {
  const t = useT();
  if (t < B(76) - 0.05 || t > B(78) + 0.05) return null;
  const k = pr(t, B(76) + 0.2, BAR * 1.8, E.lin) * 4;
  const season = Math.min(3, Math.floor(k));
  const colors = ["#7fb38a", "#d9b25a", "#c97b4a", "#a9bfd6"];
  const names = ["第 1 年", "第 2 年", "第 3 年", "第 4 年"];
  const s = lerp(1.0, 1.08, pr(t, B(76), BAR * 2, E.lin));
  const flash = bump(t, B(76) + 0.2 + (Math.floor(k) * BAR * 1.8) / 4, 0.02, 0.3);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "60% 60%" }}>
      <div style={{ position: "absolute", left: 1060, top: 250, width: 700, height: 480, borderRadius: 14, border: "14px solid #4a3f33", background: `linear-gradient(180deg, ${colors[season]}66, ${colors[season]}22)`, overflow: "hidden", boxShadow: `0 0 ${80 + 60 * flash}px ${colors[season]}44` }}>
        {Array.from({ length: 22 }).map((_, i) => {
          const ph = (t * (season === 3 ? 0.18 : 0.32) + rnd(`lf${i}`)) % 1;
          return <div key={i} style={{ position: "absolute", left: rnd(`lx${i}`) * 680 + Math.sin(t * 2 + i) * 20, top: ph * 480, width: season === 3 ? 10 : 16, height: season === 3 ? 10 : 10, borderRadius: season === 3 ? 5 : 3, background: season === 3 ? "#eef4fb" : colors[season], opacity: 0.85, transform: `rotate(${t * 90 + i * 20}deg)` }} />;
        })}
        <div style={{ position: "absolute", left: 343, top: 0, bottom: 0, width: 14, background: "#4a3f33" }} />
      </div>
      <div style={{ position: "absolute", left: 1410, top: 770, transform: "translateX(-50%)", fontFamily: SERIF, fontSize: 56, fontWeight: 700, color: FG, whiteSpace: "nowrap" }}>{names[season]}</div>
      <div style={{ position: "absolute", left: 360, top: 900, width: 680, height: 20, borderRadius: 4, background: "#4a3f33" }} />
      <div style={{ position: "absolute", left: 430, top: 650 + Math.sin(t * 3) * 2 }}>
        <Person h={250} color="#8b96a6" />
      </div>
      <div style={{ position: "absolute", left: 690, top: 600 }}>
        <Person h={300} color="#5f6878" />
      </div>
      <div style={{ position: "absolute", left: 520, top: 800, width: 150, height: 90, borderRadius: 8, background: "#1a2028", border: `2px solid ${CYAN}` }} />
      <Words at={B(76) + 0.1} lines={["而经验，只能在干活里", "一年一年地磨。"]} x={110} y={120} size={76} kw={["一年一年地磨"]} kwAt={B(77) + 0.3} />
    </AbsoluteFill>
  );
};

// ── S40 · two months with AI ≈ six months without (B78 → B80) ──
export const Faster4: React.FC = () => {
  const t = useT();
  if (t < B(78) - 0.05 || t > B(80) + 0.05) return null;
  const grow = spring(t, B(78) + 0.35, 1.2, 5);
  const bars: [string, string, string][] = [
    ["用 AI", "入职 2 个月", CYAN],
    ["不用 AI", "入职 6 个月以上", "#8e96a3"],
  ];
  const s = lerp(1.06, 1.0, pr(t, B(78), BAR * 2, E.out));
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "50% 90%" }}>
      {bars.map(([a, b2, c], i) => {
        const h = 460 * Math.max(0, grow);
        return (
          <div key={a} style={{ position: "absolute", left: 700 + i * 360, top: 880 - h, width: 220, height: h, borderRadius: "18px 18px 0 0", background: c, opacity: 0.92, boxShadow: i === 0 ? `0 0 50px ${CYAN}55` : undefined }}>
            <div style={{ position: "absolute", left: 110, top: h + 18, transform: "translateX(-50%)", textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: c }}>{a}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#b8b8b3" }}>{b2}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 640, width: 700, top: 880 - 460 - 90, textAlign: "center", fontFamily: FONT, fontSize: 52, fontWeight: 900, color: FG, opacity: pr(t, B(79), 0.4), transform: `scale(${lerp(0.8, 1, pr(t, B(79), 0.4, E.back))})`, whiteSpace: "nowrap" }}>干得一样好</div>
      <div style={{ position: "absolute", left: 560, width: 860, top: 880, height: 2, background: "rgba(244,240,232,0.25)" }} />
      <Words at={B(78) + 0.1} lines={["好在，有了它，", "新人能磨得快一点。"]} x={110} y={120} size={76} kw={["快一点"]} kwColor={CYAN} kwAt={B(79) + 0.2} />
      <Fine at={B(78) + 0.4} out={B(80) - 0.1}>
        一项 5,179 名客服的研究（Brynjolfsson、Li、Raymond，NBER）：用 AI 的新人入职 2 个月，表现和不用 AI、入职 6 个月以上的员工相当；一家公司、早期的 AI 工具
      </Fine>
    </AbsoluteFill>
  );
};
