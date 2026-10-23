import React from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { AbsoluteFill, random } from "remotion";
import { feature } from "topojson-client";
import world110Topo from "world-atlas/countries-110m.json";
import { FONT, SERIF } from "../theme";
import { Door, Person } from "../v2/art";
import { ChatBox, Walker } from "./art";
import { Backdrop, C, EBACK, EIO, EO, lerp, Line, Lines, pr, Src, useT } from "./kit";
import { BAR, BEAT, bar } from "./timing";

// 间奏 (片中 56–64) and 05 真相 (64–80). Silence: "可是". Three lines shot up; the jobless line barely moved. Then the
// row of doors by age, the youngest door slams narrower on the music's return (bar 64 = track bar 48), and why.

export const TRUTH = {
  s29: "可是。",
  s30: ["AI 投资最多的美国，", "失业率四年几乎没动。"],
  s31: ["那它到底，", "抢了谁的饭碗？"],
  s33: ["变窄的，", "是第一份工作的门。"],
  s34: ["美国的程序员里，", "新人少两成，老手多两成。"],
  s35: ["老手的饭碗没动，", "少的，是新人那一碗。"],
  s36: ["41 国用 AI 的公司：", "多招老手，少招新人。"],
  s37: ["留给新人练手的活，", "老手直接交给了它。"],
  s38: ["它最会的，", "正是写得进课本的东西。"],
  s39: ["而经验，只能在干活里", "一年一年地磨。"],
  s40: ["好在，有了它，", "新人能磨得快一点。"],
} as const;

// ── 29 · bars 56–58: silence ──
export const But: React.FC = () => {
  const t = useT();
  const b0 = bar(56);
  return (
    <AbsoluteFill>
      <Backdrop glow="#ffffff" at={[50, 50]} strength={0.03} />
      <Line at={b0 + 0.25} text={TRUTH.s29} size={140} center y={450} out={bar(58) - 0.1} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)", opacity: pr(t, b0, 0.6) }} />
    </AbsoluteFill>
  );
};

// ── 30 · bars 58–60: three lines shot up; one crawls along the floor ──
export const Flat: React.FC = () => {
  const t = useT();
  const b0 = bar(58);
  const X0 = 700;
  const X1 = 1680;
  const Y0 = 900;
  const draw = pr(t, b0 + 0.2, BAR * 1.2, EIO);
  const ups = [
    { name: "英伟达 ×12", c: C.cyan, k: 1 },
    { name: "大厂投入 ×5", c: C.gold, k: 0.62 },
    { name: "AI 干活时长 ×260", c: C.violet, k: 0.85 },
  ];
  const curve = (k: number, u: number) => Y0 - Math.pow(u, 2.2) * 560 * k;
  const path = (f: (u: number) => number, upto: number) =>
    Array.from({ length: 41 }, (_, i) => i / 40)
      .filter((u) => u <= upto)
      .map((u, i) => `${i === 0 ? "M" : "L"}${lerp(X0, X1, u)},${f(u)}`)
      .join(" ");
  const ue = (u: number) => Y0 - (3.6 + 0.6 * Math.pow(u, 1.4)) * 6; // unemployment on a 0–100 % feel: a hair above the floor
  return (
    <AbsoluteFill>
      <Backdrop glow="#ffffff" at={[60, 70]} strength={0.04} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="rgba(244,240,232,0.25)" strokeWidth={2} />
        {ups.map((u) => (
          <path key={u.name} d={path((x) => curve(u.k, x), 1)} stroke={u.c} strokeWidth={5} fill="none" opacity={0.22} />
        ))}
        <path d={path(ue, draw)} stroke={C.fg} strokeWidth={8} fill="none" strokeLinecap="round" />
      </svg>
      {ups.map((u) => (
        <div key={u.name} style={{ position: "absolute", left: X1 + 16, top: curve(u.k, 1) - 18, fontFamily: FONT, fontSize: 24, fontWeight: 800, color: u.c, opacity: 0.45, whiteSpace: "nowrap" }}>
          {u.name}
        </div>
      ))}
      <div style={{ position: "absolute", left: X0 - 20, top: Y0 - 80, transform: "translateX(-100%)", fontFamily: FONT, textAlign: "right", opacity: pr(t, b0 + 0.2, 0.4), whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>美国失业率</div>
        <div style={{ fontSize: 46, fontWeight: 900, color: C.fg }}>3.6%</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.muted }}>2022.11</div>
      </div>
      <div style={{ position: "absolute", left: X1 + 16, top: Y0 - 64, fontFamily: FONT, opacity: pr(t, b0 + 0.2 + BAR * 1.2, 0.4), whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: C.fg }}>4.2%</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.muted }}>2026.09</div>
      </div>
      <Lines at={b0} a={TRUTH.s30[0]} b={TRUTH.s30[1]} out={bar(60) - 0.05} />
      <Src at={b0 + 0.3}>美国失业率 3.6%（2022-11）→ 4.2%（2026-09），美国劳工统计局 · 美国 2025 年私营 AI 投资 2,859 亿美元，全球第一（斯坦福 AI 指数 2026）· 耶鲁 Budget Lab（2026-10）："还没看到明确的 AI 痕迹" · 三条曲线为示意</Src>
    </AbsoluteFill>
  );
};

// ── 31–32 · bars 60–64: along the row of doors by age; the camera stops at 22–25 ──
const AGES = ["50 岁以上", "41–49 岁", "35–40 岁", "26–34 岁", "22–25 岁"];
export const DOORS_X = (i: number) => 260 + i * 380;
export const Doors: React.FC<{ narrow?: number; focus?: number; showText?: boolean }> = ({ narrow = 0, focus = 0, showText = true }) => {
  const t = useT();
  const b0 = bar(60);
  const pan = pr(t, b0 + 0.3, BAR * 1.6, EIO);
  const camX = -lerp(0, DOORS_X(4) - 960, Math.max(pan, focus));
  const scale = lerp(1, 1.15, focus);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[50, 70]} strength={0.08 + 0.08 * focus} />
      <AbsoluteFill style={{ transform: `translateX(${camX * scale}px) scale(${scale})`, transformOrigin: "50% 80%" }}>
        <div style={{ position: "absolute", left: -400, right: -1600, top: 900, height: 2, background: "rgba(244,240,232,0.18)" }} />
        {AGES.map((age, i) => {
          const young = i === 4;
          const w = young ? lerp(200, 112, narrow) : 200;
          return (
            <div key={age} style={{ position: "absolute", left: DOORS_X(i) - w / 2, top: 900 - 420 }}>
              <Door w={w} h={420} light={young ? 0.9 : 0.55} frame={young && narrow > 0 ? `rgba(255,209,102,${0.5 + 0.5 * narrow})` : "#3a4250"} />
              <div style={{ position: "absolute", left: w / 2, top: -64, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: young ? C.gold : C.sub, whiteSpace: "nowrap" }}>{age}</div>
            </div>
          );
        })}
        {/* people walking into the older doors */}
        {[0, 1, 2, 3].map((i) =>
          [0, 1].map((k) => {
            const ph = ((t * 0.18 + k * 0.5 + i * 0.13) % 1);
            return (
              <div key={`${i}${k}`} style={{ position: "absolute", left: DOORS_X(i) - 120 + ph * 120, top: 900 - 110, opacity: Math.min(1, (1 - ph) * 4) * 0.8 }}>
                <Walker h={110} t={t} speed={1} color="#56606e" bag={k === 1} />
              </div>
            );
          }),
        )}
        {/* the graduate at the youngest door, back to us */}
        <div style={{ position: "absolute", left: DOORS_X(4) - 32 - 130, top: 900 - 140, opacity: pr(t, b0 + BAR * 1.4, 0.5) }}>
          <Person h={140} color="#6b7686" cap={1} />
        </div>
      </AbsoluteFill>
      {showText ? <Lines at={b0} a={TRUTH.s31[0]} b={TRUTH.s31[1]} out={bar(62) - 0.05} /> : null}
    </AbsoluteFill>
  );
};
export const DoorsPan: React.FC = () => <Doors />;

// ── 33 · bars 64–66: the music returns; the youngest door slams narrower ──
export const SLAM_AT = bar(64);
export const Slam: React.FC = () => {
  const t = useT();
  const narrow = pr(t, SLAM_AT + 0.05, 0.22, EBACK);
  return (
    <AbsoluteFill>
      <Doors narrow={narrow} focus={1} showText={false} />
      <Lines at={SLAM_AT + 0.15} a={TRUTH.s33[0]} b={TRUTH.s33[1]} kw="第一份工作" kwAt={SLAM_AT + 4 * BEAT} out={bar(66) - 0.05} />
    </AbsoluteFill>
  );
};

// ── 34 · bars 66–68: coders: the young row loses a desk, the experienced row gains one ──
const Desk: React.FC<{ on: number; color: string }> = ({ on, color }) => (
  <div style={{ position: "relative", width: 150, height: 150, opacity: lerp(0.18, 1, on) }}>
    <div style={{ position: "absolute", left: 30, top: 6 }}>
      <Person h={88} color={color} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 96, width: 150, height: 16, borderRadius: 4, background: "#3a4250" }} />
    <div style={{ position: "absolute", left: 40, top: 52, width: 70, height: 44, borderRadius: 6, background: "#1a2028", border: `2px solid ${C.cyan}` }} />
  </div>
);
export const Coders: React.FC = () => {
  const t = useT();
  const b0 = bar(66);
  const go = pr(t, b0 + 2 * BEAT, 0.5, EIO);
  const add = pr(t, b0 + 3 * BEAT, 0.5, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[60, 60]} strength={0.08} />
      {[0, 1].map((row) => {
        const y = row === 0 ? 420 : 680;
        const young = row === 0;
        return (
          <React.Fragment key={row}>
            <div style={{ position: "absolute", left: 120, top: y + 40, fontFamily: FONT, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: young ? C.gold : C.fg }}>{young ? "22–25 岁" : "41–49 岁"}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: young ? C.red : C.green, opacity: young ? go : add }}>{young ? "约 −19%" : "约 +20%"}</div>
            </div>
            {Array.from({ length: young ? 5 : 6 }).map((_, i) => {
              const on = young ? (i === 4 ? 1 - go : 1) : i === 5 ? add : 1;
              return (
                <div key={i} style={{ position: "absolute", left: 520 + i * 190, top: y }}>
                  <Desk on={on} color={young ? "#7b8696" : "#56606e"} />
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      <Lines at={b0} a={TRUTH.s34[0]} b={TRUTH.s34[1]} out={bar(68) - 0.05} />
      <Src at={b0 + 0.3}>美国软件开发岗位，2022-11 → 2026-06（从论文图中读出）· 全部 AI 最擅长的工作里，22–25 岁约 −11%，最不擅长的约 +10% · 斯坦福 Brynjolfsson 等，ADP 工资单，每月数百万员工；描述性证据，不是因果</Src>
    </AbsoluteFill>
  );
};

// ── 35 · bars 68–70: bowls ──
const Bowl: React.FC<{ full: number }> = ({ full }) => (
  <svg width="120" height="80" viewBox="0 0 120 80" style={{ display: "block", overflow: "visible" }}>
    {full > 0 ? <ellipse cx="60" cy="22" rx={44} ry={14} fill="#f4efe2" opacity={full} /> : null}
    {full > 0 ? (
      <g opacity={full}>
        <path d="M44,12 Q50,-6 56,10" stroke="rgba(244,240,232,0.4)" strokeWidth="3" fill="none" />
        <path d="M66,10 Q72,-8 78,8" stroke="rgba(244,240,232,0.4)" strokeWidth="3" fill="none" />
      </g>
    ) : null}
    <path d="M8,24 Q60,32 112,24 Q104,70 60,74 Q16,70 8,24 Z" fill="#c9d4df" />
    <path d="M8,24 Q60,32 112,24" stroke="#8fa3b5" strokeWidth="3" fill="none" />
    <path d="M30,46 Q60,52 90,46" stroke="#4d6b88" strokeWidth="4" fill="none" />
  </svg>
);
export const BOWL_AT = bar(68) + 3 * BEAT;
export const Bowls: React.FC = () => {
  const t = useT();
  const b0 = bar(68);
  const gone = pr(t, BOWL_AT, 0.45, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[60, 60]} strength={0.1} />
      {[0, 1].map((row) => {
        const y = row === 0 ? 470 : 720;
        const young = row === 1;
        return (
          <React.Fragment key={row}>
            <div style={{ position: "absolute", left: 120, top: y + 10, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: young ? C.gold : C.fg, whiteSpace: "nowrap" }}>{young ? "新人" : "老手"}</div>
            <div style={{ position: "absolute", left: 480, top: y + 74, width: 1260, height: 14, borderRadius: 7, background: "#3a4250" }} />
            {Array.from({ length: 6 }).map((_, i) => {
              const last = young && i === 5;
              return (
                <div key={i} style={{ position: "absolute", left: 520 + i * 200, top: y - (last ? gone * 40 : 0), opacity: last ? 1 - gone : pr(t, b0 + 0.1 + i * 0.05, 0.3) }}>
                  <Bowl full={1} />
                </div>
              );
            })}
            {young ? <div style={{ position: "absolute", left: 520 + 5 * 200 + 10, top: y + 30, width: 100, height: 40, borderRadius: "50%", border: "3px dashed rgba(255,209,102,0.6)", opacity: gone }} /> : null}
          </React.Fragment>
        );
      })}
      <Lines at={b0} a={TRUTH.s35[0]} b={TRUTH.s35[1]} out={bar(70) - 0.05} />
      <Src at={b0 + 0.3}>同一研究：26 岁以上的员工没有这个缺口；变化来自少招新人，不是多裁员（Brynjolfsson、Chandar、Chen，2026-08）</Src>
    </AbsoluteFill>
  );
};

// ── 36 · bars 70–72: 41 countries, the same tilt (no country is singled out; the paper's list is not on screen) ──
const world110 = feature(world110Topo as never, (world110Topo as never as { objects: { countries: never } }).objects.countries) as unknown as { features: unknown[] };
const worldD = (() => {
  const proj = geoNaturalEarth1().fitExtent(
    [
      [0, 0],
      [1100, 520],
    ],
    { type: "FeatureCollection", features: world110.features } as never,
  );
  return geoPath(proj)({ type: "FeatureCollection", features: world110.features } as never) ?? "";
})();
export const Countries: React.FC = () => {
  const t = useT();
  const b0 = bar(70);
  const map = pr(t, b0 + 0.1, 0.8, EO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[55, 55]} strength={0.1} />
      <svg width={1100} height={520} style={{ position: "absolute", left: 640, top: 360, opacity: 0.55 * map }}>
        <path d={worldD} fill="rgba(77,212,255,0.10)" stroke="rgba(77,212,255,0.45)" strokeWidth={1} />
      </svg>
      <div style={{ position: "absolute", left: 1190, top: 520, transform: `translateX(-50%) scale(${lerp(0.8, 1, pr(t, b0 + 0.4, 0.4, EBACK))})`, opacity: pr(t, b0 + 0.4, 0.4), textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: C.fg }}>41 个国家</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.sub }}>1.25 亿条招聘广告</div>
      </div>
      <div style={{ position: "absolute", left: 760, top: 850, display: "flex", gap: 70, fontFamily: FONT, opacity: pr(t, b0 + 1.4, 0.5), whiteSpace: "nowrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>老员工</div>
          <div style={{ fontSize: 60, fontWeight: 900, color: C.green }}>+6.7%</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>新人</div>
          <div style={{ fontSize: 60, fontWeight: 900, color: C.red }}>−2.5%</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>总招聘</div>
          <div style={{ fontSize: 60, fontWeight: 900, color: C.fg }}>还在涨</div>
        </div>
      </div>
      <Lines at={b0} a={TRUTH.s36[0]} b={TRUTH.s36[1]} out={bar(72) - 0.05} />
      <Src at={b0 + 0.3}>Chandar（斯坦福）& Klein Teeselink（伦敦国王学院），2026-09：比较 41 国用 AI 和不用 AI 的公司，五年变化（新人 −2.5% 据该校新闻稿，彭博报道为 −3%）</Src>
    </AbsoluteFill>
  );
};

// ── 37 · bars 72–74: before / now ──
const Stack: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ position: "relative", width: 130, height: 30 + n * 14 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ position: "absolute", left: (i % 2) * 6, bottom: i * 14, width: 120, height: 16, borderRadius: 3, background: "#ece6da", border: "1px solid rgba(25,35,31,0.3)" }} />
    ))}
  </div>
);
export const Handoff: React.FC = () => {
  const t = useT();
  const b0 = bar(72);
  const give1 = pr(t, b0 + 0.4, 0.7, EIO);
  const give2 = pr(t, b0 + 0.4 + 2 * BEAT, 0.7, EIO);
  const panel = (x: number, label: string, toBot: boolean, g: number) => (
    <div style={{ position: "absolute", left: x, top: 380, width: 640, height: 560, borderRadius: 26, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.glassLine}` }}>
      <div style={{ position: "absolute", left: 28, top: 20, fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: toBot ? C.cyan : C.gold }}>{label}</div>
      <div style={{ position: "absolute", left: 70, top: 260 }}>
        <Person h={200} color="#56606e" />
        <div style={{ position: "absolute", left: 30, top: 230, fontFamily: FONT, fontSize: 24, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>老手</div>
      </div>
      <div style={{ position: "absolute", left: lerp(150, 380, g), top: lerp(330, 300, g) - Math.sin(g * Math.PI) * 60 }}>
        <Stack n={5} />
      </div>
      {toBot ? (
        <div style={{ position: "absolute", left: 400, top: 250, transform: "scale(0.28)", transformOrigin: "0 0" }}>
          <ChatBox t={t} w={760} h={420} />
        </div>
      ) : (
        <div style={{ position: "absolute", left: 440, top: 300 }}>
          <Person h={170} color="#7b8696" />
          <div style={{ position: "absolute", left: 22, top: 200, fontFamily: FONT, fontSize: 24, fontWeight: 800, color: C.gold, whiteSpace: "nowrap" }}>新人</div>
        </div>
      )}
      {toBot ? (
        <div style={{ position: "absolute", left: 470, top: 384, opacity: 0.45 }}>
          <Person h={120} color="#7b8696" />
          <div style={{ position: "absolute", left: 4, top: 128, fontFamily: FONT, fontSize: 22, fontWeight: 800, color: C.muted, whiteSpace: "nowrap" }}>新人，空着手</div>
        </div>
      ) : null}
    </div>
  );
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[55, 60]} strength={0.08} />
      {panel(250, "以前", false, give1)}
      {panel(1010, "现在", true, give2)}
      <Lines at={b0} a={TRUTH.s37[0]} b={TRUTH.s37[1]} out={bar(74) - 0.05} />
      <Src at={b0 + 0.3}>论文作者的推测：AI 可能在替代过去撑起入门岗位的那些能检查对错、按流程走的活，同时放大老员工的作用（Brynjolfsson 等，2026-08）· 画面为示意</Src>
    </AbsoluteFill>
  );
};

// ── 38 · bars 74–76: the textbook flies into the box ──
export const Textbook: React.FC = () => {
  const t = useT();
  const b0 = bar(74);
  const open = pr(t, b0 + 0.2, 0.5, EO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[60, 60]} strength={0.1} />
      <div style={{ position: "absolute", left: 560, top: 470, width: 560, height: 360, opacity: open }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 280, height: 360, background: "#ece6da", borderRadius: "10px 0 0 10px", transformOrigin: "100% 50%", transform: `perspective(900px) rotateY(${lerp(80, 8, open)}deg)` }} />
        <div style={{ position: "absolute", left: 280, top: 0, width: 280, height: 360, background: "#f3eee3", borderRadius: "0 10px 10px 0" }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: 30, top: 34 + i * 30, height: 8, width: `${[80, 70, 76, 60, 82, 68, 74, 50, 78, 64][i]}%`, borderRadius: 4, background: "rgba(25,35,31,0.35)", opacity: 1 - pr(t, b0 + 0.6 + i * 0.12, 0.3) }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: FONT, fontSize: 26, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>写得下来、能检查对错的知识</div>
      </div>
      {Array.from({ length: 10 }).map((_, i) => {
        const p = pr(t, b0 + 0.6 + i * 0.12, 0.7, EIO);
        if (p <= 0 || p >= 1) return null;
        return <div key={i} style={{ position: "absolute", left: lerp(870, 1460, p), top: lerp(500 + i * 30, 560, p) - Math.sin(p * Math.PI) * 120, width: lerp(180, 40, p), height: 8, borderRadius: 4, background: C.cyan, opacity: 0.8 }} />;
      })}
      <div style={{ position: "absolute", left: 1330, top: 460, transform: "scale(0.42)", transformOrigin: "0 0" }}>
        <ChatBox t={t} w={760} h={420} />
      </div>
      <Lines at={b0} a={TRUTH.s38[0]} b={TRUTH.s38[1]} out={bar(76) - 0.05} />
      <Src at={b0 + 0.3}>论文作者的推测：AI 更能替代写得下来、能检查对错的知识，更能帮上靠实践、师傅带、反复碰到真实情况攒下的经验（Brynjolfsson 等，2026-08）</Src>
    </AbsoluteFill>
  );
};

// ── 39 · bars 76–78: seasons through the window ──
export const Seasons: React.FC = () => {
  const t = useT();
  const b0 = bar(76);
  const k = pr(t, b0 + 0.2, BAR * 1.8, (x) => x) * 4;
  const season = Math.min(3, Math.floor(k));
  const colors = ["#7fb38a", "#d9b25a", "#c97b4a", "#a9bfd6"];
  const names = ["第 1 年", "第 2 年", "第 3 年", "第 4 年"];
  return (
    <AbsoluteFill>
      <Backdrop glow={colors[season]} at={[70, 40]} strength={0.1} />
      <div style={{ position: "absolute", left: 1220, top: 340, width: 520, height: 360, borderRadius: 12, border: "10px solid #3a4250", background: `linear-gradient(180deg, ${colors[season]}55, ${colors[season]}22)`, overflow: "hidden" }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const ph = (t * 0.3 + random(`lf${i}`)) % 1;
          return <div key={i} style={{ position: "absolute", left: random(`lx${i}`) * 500, top: ph * 360, width: 12, height: 12, borderRadius: season === 3 ? 6 : 2, background: colors[season], opacity: 0.8 }} />;
        })}
        <div style={{ position: "absolute", left: 250, top: 0, bottom: 0, width: 10, background: "#3a4250" }} />
      </div>
      <div style={{ position: "absolute", left: 1480, top: 720, transform: "translateX(-50%)", fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: C.fg, whiteSpace: "nowrap" }}>{names[season]}</div>
      <div style={{ position: "absolute", left: 640, top: 900, width: 520, height: 16, borderRadius: 4, background: "#3a4250" }} />
      <div style={{ position: "absolute", left: 700, top: 690 }}>
        <Person h={210} color="#7b8696" />
      </div>
      <div style={{ position: "absolute", left: 900, top: 650 }}>
        <Person h={250} color="#56606e" />
      </div>
      <div style={{ position: "absolute", left: 760, top: 820, width: 120, height: 70, borderRadius: 6, background: "#1a2028", border: `2px solid ${C.cyan}` }} />
      <Lines at={b0} a={TRUTH.s39[0]} b={TRUTH.s39[1]} out={bar(78) - 0.05} />
    </AbsoluteFill>
  );
};

// ── 40 · bars 78–80: two months with AI ≈ six months without ──
export const Faster: React.FC = () => {
  const t = useT();
  const b0 = bar(78);
  const grow = pr(t, b0 + 0.3, 1.0, EIO);
  const bars: [string, string, string][] = [
    ["用 AI", "入职 2 个月", C.cyan],
    ["不用 AI", "入职 6 个月以上", "#8e96a3"],
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[60, 60]} strength={0.1} />
      {bars.map(([a, b2, c], i) => (
        <div key={a} style={{ position: "absolute", left: 760 + i * 380, top: 900 - 420 * grow, width: 200, height: 420 * grow, borderRadius: "16px 16px 0 0", background: c, opacity: 0.9 }}>
          <div style={{ position: "absolute", left: 100, top: 420 * grow + 20, transform: "translateX(-50%)", textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: c }}>{a}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.sub }}>{b2}</div>
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 760, width: 580, top: 900 - 420 - 70, textAlign: "center", fontFamily: FONT, fontSize: 40, fontWeight: 900, color: C.fg, opacity: pr(t, b0 + 1.3, 0.4), whiteSpace: "nowrap" }}>干得一样好</div>
      <div style={{ position: "absolute", left: 600, right: 500, top: 900, height: 2, background: "rgba(244,240,232,0.2)" }} />
      <Lines at={b0} a={TRUTH.s40[0]} b={TRUTH.s40[1]} out={bar(80) - 0.05} />
      <Src at={b0 + 0.3}>一项 5,179 名客服的研究（Brynjolfsson、Li、Raymond，NBER）：用 AI 的新人入职 2 个月，表现和不用 AI、入职 6 个月以上的员工相当；一家公司、早期的 AI 工具</Src>
    </AbsoluteFill>
  );
};

