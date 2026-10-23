import { geoContains, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import React from "react";
import { AbsoluteFill } from "remotion";
import { feature } from "topojson-client";
import world110Topo from "world-atlas/countries-110m.json";
import land110Topo from "world-atlas/land-110m.json";
import { FONT, SERIF } from "../theme";
import { Mail } from "../v2/art";
import { Frame, markY, Pencil } from "../v3/door";
import { BAR, bar, BEAT } from "../v3/timing";
import { At, bump, clamp01, E, Key, lerp, Plane, pr, rnd, spring, Stage, useT } from "./engine";
import { Fine, Stamp, Tag, Words } from "./type";

// 01 惊奇 · 片中 10–20 (PLAN-v4 S6–S10). Deep-blue night. The chat box multiplies into a swarm the camera falls back
// through; the camera dives into one box and finds the door frame with its first mark; a whip pan to three medals; a
// glint becomes the flash of a phone camera in exam week; the phone shrinks into a light on the night Earth.

const B = (n: number) => bar(n);
const CYAN = "#4dd4ff";
const FG = "#f4f0e8";

// ── S6 · the swarm (B10 → B12.25) ──
const N = 340;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const swarm = Array.from({ length: N }, (_, i) => {
  const r = 90 + Math.sqrt(i / N) * 2600 + rnd(`sr${i}`) * 120;
  const a = i * GOLDEN;
  return { x: Math.cos(a) * r * 1.5, y: Math.sin(a) * r * 0.85, d: [0.55, 0.8, 1, 1.25][i % 4], born: B(9.75) + 2.2 * Math.pow(i / N, 0.5), tint: rnd(`st${i}`), ph: rnd(`sp${i}`) * 6.28 };
});
const DIVE = 6; // the box the camera dives into (on the d = 1 plane)
const RACE0 = B(11) - 0.05;
const RACE_D = BAR * 0.8;

const Bubble: React.FC<{ tint: number; p: number }> = ({ tint, p }) => (
  <div
    style={{
      width: 132,
      height: 78,
      borderRadius: 18,
      transform: `scale(${p})`,
      opacity: clamp01(p * 1.5),
      background: tint > 0.75 ? "rgba(77,212,255,0.28)" : "rgba(244,240,232,0.09)",
      border: `1.5px solid ${tint > 0.75 ? "rgba(77,212,255,0.8)" : "rgba(244,240,232,0.28)"}`,
      boxShadow: tint > 0.75 ? "0 0 30px rgba(77,212,255,0.45)" : undefined,
      padding: "16px 16px",
      boxSizing: "border-box",
    }}
  >
    <div style={{ height: 9, width: `${60 + tint * 30}%`, borderRadius: 5, background: "rgba(244,240,232,0.55)", marginBottom: 10 }} />
    <div style={{ height: 9, width: `${40 + (1 - tint) * 40}%`, borderRadius: 5, background: "rgba(244,240,232,0.3)" }} />
  </div>
);

export const Swarm: React.FC = () => {
  const t = useT();
  if (t < B(9.75) - 0.1 || t > B(12.25) + 0.05) return null;
  const tgt = swarm[DIVE];
  const keys: Key[] = [
    [B(9.75), { x: 0, y: 0, z: 2.1, r: -2 }],
    [B(12) - 0.1, { x: 120, y: 40, z: 0.42, r: 3 }, E.inOut],
    [B(12.25), { x: tgt.x, y: tgt.y, z: 7, r: 0 }, E.in],
  ];
  const race = 9 * pr(t, RACE0, RACE_D, E.lin);
  const raceIn = pr(t, RACE0 - 0.2, 0.4);
  const lanes = [
    { y: 742, name: "ChatGPT", color: CYAN, p: clamp01(race / 2), label: race >= 2 ? "2 个月" : `${Math.floor(race)} 个月`, done: race >= 2 },
    { y: 842, name: "TikTok（抖音海外版）", color: "#8e96a3", p: clamp01(race / 9), label: `${Math.min(9, Math.floor(race))} 个月`, done: race >= 9 },
  ];
  const TX = 1060;
  const TW = 640;
  const dive = pr(t, B(12) - 0.1, 0.35, E.in);
  return (
    <AbsoluteFill>
      <Stage keys={keys} drift={0}>
        {[0.55, 0.8, 1, 1.25].map((d) => (
          <Plane key={d} d={d}>
            {swarm.map((b, i) => {
              if (b.d !== d) return null;
              const p = spring(t, b.born, 1.6, 7);
              if (p <= 0) return null;
              return (
                <At key={i} x={b.x - 66 + Math.sin(t * 0.8 + b.ph) * 18} y={b.y - 39 + Math.cos(t * 0.6 + b.ph) * 14} o={i === DIVE ? 1 : 1 - dive * 0.6}>
                  <Bubble tint={i === 0 || i === DIVE ? 1 : b.tint} p={p} />
                </At>
              );
            })}
          </Plane>
        ))}
      </Stage>
      {/* words and the race sit in front of the swarm */}
      <AbsoluteFill style={{ opacity: 1 - dive }}>
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,8,18,0.85) 0%, rgba(3,8,18,0.55) 40%, transparent 62%)" }} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(3,8,18,0.8) 0%, transparent 38%)", opacity: raceIn }} />
        <Words at={B(10) + 0.15} lines={["5 天，100 万人；"]} x={130} y={330} size={104} kw={["100 万人"]} kwColor={CYAN} />
        <Words at={B(11) - 0.15} lines={["2 个月，1 亿人。"]} x={130} y={470} size={104} kw={["1 亿人"]} kwColor={CYAN} />
        {raceIn > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: raceIn }}>
            <div style={{ position: "absolute", left: TX + TW, top: 712, width: 4, height: 200, background: "#ffd166", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: TX + TW, top: 668, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 28, fontWeight: 900, color: "#ffd166", whiteSpace: "nowrap" }}>1 亿用户</div>
            {lanes.map((l) => (
              <React.Fragment key={l.name}>
                <div style={{ position: "absolute", left: TX - 24, top: l.y + 4, transform: "translateX(-100%)", fontFamily: FONT, fontSize: 32, fontWeight: 900, color: l.color, whiteSpace: "nowrap" }}>{l.name}</div>
                <div style={{ position: "absolute", left: TX, top: l.y, width: TW, height: 50, borderRadius: 25, background: "rgba(244,240,232,0.07)" }} />
                <div style={{ position: "absolute", left: TX, top: l.y, width: Math.max(50, TW * l.p), height: 50, borderRadius: 25, background: l.color, boxShadow: l.done ? `0 0 34px ${l.color}` : undefined }} />
                <div style={{ position: "absolute", left: TX + Math.max(50, TW * l.p) + 16, top: l.y + 4, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: FG, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{l.label}</div>
              </React.Fragment>
            ))}
            <div style={{ position: "absolute", left: TX + TW * (2 / 9) + 10, top: 668 }}>
              <Stamp at={RACE0 + RACE_D * (2 / 9) + 0.12} text="史上最快" color="#ffd166" size={40} rot={-7} />
            </div>
          </div>
        ) : null}
        <Fine at={B(10) + 0.4} out={B(12) - 0.1}>
          5 天 100 万：OpenAI CEO Altman 2022-12-05 发帖（公司自报）· 2 个月 1 亿：UBS 引 Similarweb 估算的月活 · TikTok 约 9 个月
        </Fine>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── S7 + S8 · the door frame and its first mark, then a whip to the medals (B12.25 → B16) ──
const DOOR = { x: 0, floor: 460, w: 400, h: 720 };
const MARK_AT = B(12.25) + 0.85;
const MX = 2000; // medals, world x (close enough that the whip streaks both)
const medals = [
  { at: B(14) + 0.2, dx: -470, ribbon: ["#2f6fb0", "#1d4f86"] as [string, string], a: "IMO", b: "35/42", title: "国际数学奥赛金牌线", sub: "谷歌 Gemini · 2025 · 官方认证" },
  { at: B(14) + 0.2 + 2 * BEAT, dx: 0, ribbon: ["#26385a", "#c9a24a"] as [string, string], a: "诺贝尔", b: "2024", title: "诺贝尔物理学奖", sub: "神经网络的奠基人" },
  { at: B(14) + 0.2 + 4 * BEAT, dx: 470, ribbon: ["#26385a", "#c9a24a"] as [string, string], a: "诺贝尔", b: "2024", title: "诺贝尔化学奖", sub: "用 AI 预测蛋白质结构" },
];

const Medal: React.FC<{ r: number; ribbon: [string, string]; a: string; b: string; shine: number }> = ({ r, ribbon, a, b, shine }) => (
  <div style={{ position: "relative", width: r * 2, height: r * 2 + 240 }}>
    <svg width={r * 2} height={250} viewBox={`0 0 ${r * 2} 250`} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M${r - 70},0 L${r - 22},250 L${r + 22},250 L${r - 10},0 Z`} fill={ribbon[0]} />
      <path d={`M${r + 70},0 L${r + 22},250 L${r - 22},250 L${r + 10},0 Z`} fill={ribbon[1]} />
    </svg>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 230,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #fff4c2, #f2c44f 35%, #b98a22 75%, #7d5a12)",
        boxShadow: `0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 6px rgba(255,240,190,0.35), 0 0 ${80 * Math.sin(shine * Math.PI)}px rgba(255,209,102,0.6)`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: r * 0.16, borderRadius: "50%", border: "3px solid rgba(110,78,14,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: SERIF, color: "rgba(90,62,10,0.85)", lineHeight: 1.15 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>{a}</div>
        <div style={{ fontSize: 34, fontWeight: 700, fontFamily: FONT }}>{b}</div>
      </div>
      <div style={{ position: "absolute", top: -r, bottom: -r, width: r * 0.5, left: lerp(-r, r * 2.4, shine), transform: "rotate(25deg)", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)" }} />
    </div>
  </div>
);

export const DoorAndMedals: React.FC = () => {
  const t = useT();
  if (t < B(12.25) - 0.05 || t > B(16) + 0.05) return null;
  const keys: Key[] = [
    [B(12.25), { x: -120, y: 330, z: 2.3 }],
    [B(12.25) + 1.0, { x: -330, y: 70, z: 1.0 }, E.out],
    [B(14) - 0.18, { x: -310, y: 60, z: 1.04 }, E.lin],
    [B(14) + 0.16, { x: MX, y: -40, z: 1.0 }, E.expo],
    ...medals.flatMap((m): Key[] => [
      [m.at + 0.36, { z: 1.0 }, E.lin],
      [m.at + 0.42, { z: 1.03 }, E.out],
      [m.at + 0.9, { z: 1.0 }, E.out],
    ]),
    [B(16) - 0.32, { x: MX, y: -40, z: 1.02 }, E.lin],
    [B(16), { x: MX + 470, y: 145, z: 3.4 }, E.in],
  ];
  const grow = pr(t, B(12.25) + 0.1, 0.9);
  const mark = pr(t, MARK_AT, 0.35, E.inOut);
  const my = DOOR.floor - markY(4);
  const jx = DOOR.x - DOOR.w / 2;
  const mail = pr(t, MARK_AT + 0.35, 0.45, E.back);
  return (
    <Stage keys={keys} drift={0.035}>
      <Plane>
        {/* the door, cool light inside */}
        <div style={{ position: "absolute", left: -900, top: -600, width: 1800, height: 1400, background: "radial-gradient(ellipse at 50% 55%, rgba(77,212,255,0.16), transparent 60%)", opacity: grow }} />
        <Frame x={DOOR.x} floor={DOOR.floor} w={DOOR.w} h={DOOR.h} grow={grow} tone="cool" />
        <div style={{ position: "absolute", left: DOOR.x, top: DOOR.floor - DOOR.h - 58, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 28, color: CYAN, opacity: pr(t, B(12.25) + 0.6, 0.4), whiteSpace: "nowrap", letterSpacing: 3 }}>
          AI 能独自干完的活
        </div>
        {mark > 0 ? (
          <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
            <line x1={jx - 34} y1={my} x2={jx - 34 + 128 * mark} y2={my} stroke={CYAN} strokeWidth={6} strokeLinecap="round" />
            <line x1={jx - 190} y1={my} x2={jx - 50} y2={my} stroke="rgba(77,212,255,0.55)" strokeWidth={2} strokeDasharray="6 8" opacity={pr(t, MARK_AT + 0.3, 0.4)} />
          </svg>
        ) : null}
        {mark > 0 && mark < 1 ? (
          <div style={{ position: "absolute", left: jx - 34 + 128 * mark - 4, top: my - 52, transform: "rotate(28deg)", transformOrigin: "50% 100%" }}>
            <Pencil color={CYAN} />
          </div>
        ) : null}
        <At x={jx + 108} y={my - 90} s={mail} o={clamp01(mail)}>
          <Mail w={70} color="#b8b8b3" />
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: "#8a8a85", whiteSpace: "nowrap", marginTop: 6 }}>≈ 回一封邮件</div>
        </At>
        <Words at={B(12.25) + 0.25} lines={["那时它能独自干的，", "只是人干 4 分钟的活。"]} x={jx - 210} y={my - 168} size={74} align="right" kw={["4 分钟"]} kwColor={CYAN} kwAt={MARK_AT + 0.2} out={B(14) - 0.15} outStyle="fade" />
        {/* medals */}
        {medals.map((m, i) => {
          const p = spring(t, m.at, 1.7, 6);
          if (t < m.at - 0.3) return null;
          const fall = pr(t, m.at - 0.3, 0.3, E.in);
          const y = t < m.at ? lerp(-1300, -190, fall) : lerp(-220, -190, p);
          return (
            <React.Fragment key={i}>
              <At x={MX + m.dx - 105} y={y} r={t > m.at ? Math.sin((t - m.at) * 3.2 + i) * 3.2 * Math.exp(-(t - m.at) * 0.5) : 0} style={{ transformOrigin: "105px 0px" }}>
                <Medal r={105} ribbon={m.ribbon} a={m.a} b={m.b} shine={pr(t, m.at + 0.25, 0.8, E.inOut)} />
              </At>
              <At x={MX + m.dx} y={290}>
                <Tag at={m.at + 0.25} text={m.title} sub={m.sub} size={32} align="center" />
              </At>
            </React.Fragment>
          );
        })}
        <Words at={B(14) + 0.15} lines={["奥数金牌、诺贝尔奖，"]} x={MX} y={-430} size={72} align="center" cps={12} kw={["奥数金牌", "诺贝尔奖"]} kwAt={B(14) + 0.2 + 4 * BEAT} />
        <Words at={B(15) + 2 * BEAT} lines={["都跟 AI 有关了。"]} x={MX} y={-340} size={84} align="center" reveal="slam" kw={["AI"]} kwColor={CYAN} kwAt={B(15) + 2 * BEAT + 0.1} />
      </Plane>
      <Fine at={B(12.25) + 0.5} out={B(14) - 0.2}>
        METR（美国 AI 评测机构）：GPT-4，2023 年 3 月；AI 有一半把握独自做完的任务，按人类专家做同样任务的耗时算
      </Fine>
    </Stage>
  );
};

// ── S9 · exam week through the phone's camera (B16 → B18) ──
export const SHUTTER = B(16) + 2 * BEAT;
export const Exam4: React.FC = () => {
  const t = useT();
  if (t < B(16) - 0.05 || t > B(18) + 0.6) return null;
  const flashIn = bump(t, B(16), 0.02, 0.25);
  const flash = bump(t, SHUTTER, 0.02, 0.18);
  const modal = spring(t, SHUTTER + 0.3, 1.8, 8);
  const hx = Math.sin(t * 1.3) * 7;
  const hy = Math.cos(t * 1.1) * 5;
  const press = bump(t, SHUTTER, 0.06, 0.15);
  const shrink = pr(t, B(18) - 0.05, 0.6, E.inOut);
  const sx = lerp(1, 0.012, shrink);
  return (
    <AbsoluteFill style={{ transformOrigin: "960px 540px", transform: `scale(${sx})`, opacity: 1 - pr(t, B(18) + 0.35, 0.2) }}>
      <AbsoluteFill style={{ background: "#11161c" }} />
      <AbsoluteFill style={{ transform: `translate(${hx}px, ${hy}px) rotate(${Math.sin(t * 0.7) * 0.4}deg) scale(${1.03 + 0.05 * pr(t, B(16), BAR * 2, E.lin)})` }}>
        <div style={{ position: "absolute", left: 360, top: 250, width: 1200, height: 820, background: "#ece6da", transform: "rotate(-3.5deg)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)", padding: "44px 70px", boxSizing: "border-box", fontFamily: SERIF, color: "#19231f" }}>
          <div style={{ fontSize: 30, fontWeight: 700, textAlign: "center" }}>2025 年普通高等学校招生全国统一考试</div>
          <div style={{ fontSize: 56, fontWeight: 700, textAlign: "center", margin: "12px 0 24px", letterSpacing: 20 }}>数学</div>
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} style={{ height: 14, borderRadius: 7, background: "rgba(25,35,31,0.32)", width: `${[96, 88, 70, 92, 60, 94, 82, 74, 50, 86, 64][i]}%`, margin: "22px 0" }} />
          ))}
        </div>
      </AbsoluteFill>
      {/* camera UI */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 26%, transparent 40%)" }} />
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", left: 0, right: 0, top: 360 + k * 240, height: 1, background: "rgba(255,255,255,0.14)" }} />
      ))}
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", top: 0, bottom: 0, left: 640 + k * 640, width: 1, background: "rgba(255,255,255,0.14)" }} />
      ))}
      <div style={{ position: "absolute", left: 1780, top: 470, width: 112, height: 112, marginTop: -56, borderRadius: "50%", border: "7px solid #f1ecdf", boxSizing: "border-box", transform: `scale(${1 - 0.14 * press})` }}>
        <div style={{ position: "absolute", inset: 9, borderRadius: "50%", background: "#f1ecdf" }} />
      </div>
      <div style={{ position: "absolute", left: 1836, top: 548, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 800, color: "#f1ecdf", whiteSpace: "nowrap" }}>拍照搜题</div>
      <div style={{ position: "absolute", right: 60, top: 40, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: "rgba(241,236,223,0.8)" }}>2025 年 6 月 7 日 · 9:05</div>
      <AbsoluteFill style={{ background: "#fff", opacity: Math.max(flash * 0.9, flashIn) }} />
      {modal > 0 ? (
        <>
          <AbsoluteFill style={{ background: "rgba(0,0,0,0.5)", opacity: clamp01(modal) }} />
          <div
            style={{
              position: "absolute",
              left: 960,
              top: 640,
              width: 700,
              transform: `translate(-50%, -50%) scale(${lerp(0.6, 1, modal)})`,
              opacity: clamp01(modal * 2),
              borderRadius: 34,
              background: "#1c222a",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "40px 40px 34px",
              fontFamily: FONT,
              textAlign: "center",
              boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
            }}
          >
            <svg width="56" height="64" viewBox="0 0 48 56" style={{ display: "block", margin: "0 auto 18px" }}>
              <rect x="6" y="24" width="36" height="28" rx="6" fill="#ffd166" />
              <path d="M14,24 L14,16 Q14,6 24,6 Q34,6 34,16 L34,24" fill="none" stroke="#ffd166" strokeWidth="5" />
            </svg>
            <div style={{ fontSize: 34, fontWeight: 800, color: FG, lineHeight: 1.5 }}>为确保高考的公平性，</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: FG, lineHeight: 1.5 }}>此项功能在高考时段无法使用</div>
            <div style={{ margin: "28px auto 0", width: 220, height: 64, borderRadius: 32, background: "rgba(244,240,232,0.12)", color: FG, fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>知道了</div>
          </div>
        </>
      ) : null}
      <Words at={B(16) + 0.15} lines={["聪明到高考那几天，", "AI 得关掉拍照识题。"]} x={960} y={70} size={76} align="center" kw={["关掉"]} kwAt={SHUTTER + 0.55} />
      <Fine at={B(16) + 0.5} out={B(18) - 0.1}>
        2025 年高考期间，通义千问、豆包、Kimi、腾讯元宝暂停识图或拍题（IT 之家，2025-06-09）· 弹窗文字为平台原话
      </Fine>
    </AbsoluteFill>
  );
};

// ── S10 · the night Earth: one in seven lights up (B18 → B20) ──
type Feat = { id?: string | number; geometry: unknown };
const land = feature(land110Topo as never, (land110Topo as never as { objects: { land: never } }).objects.land) as unknown as Feat;
const countries = feature(world110Topo as never, (world110Topo as never as { objects: { countries: never } }).objects.countries) as unknown as { features: Feat[] };
const china = countries.features.find((f) => String(f.id) === "156")!;
const DOTS = (() => {
  const out: { lon: number; lat: number; cn: boolean; lit: boolean }[] = [];
  for (let lat = -56; lat <= 74; lat += 2.2)
    for (let lon = -180; lon < 180; lon += 2.2 / Math.max(0.35, Math.cos((lat * Math.PI) / 180))) {
      const p: [number, number] = [lon, lat];
      if (!geoContains(land as never, p)) continue;
      const cn = geoContains(china as never, p);
      out.push({ lon, lat, cn, lit: rnd(`gl${lon.toFixed(1)}${lat.toFixed(1)}`) < 1 / 7 });
    }
  return out;
})();
const R = 430;

export const Globe: React.FC = () => {
  const t = useT();
  if (t < B(18) - 0.1 || t > B(20) + 0.4) return null;
  const inn = pr(t, B(18), 0.9);
  const rot = lerp(36, 112, pr(t, B(18), BAR * 2.3, E.lin));
  const rise = pr(t, B(20) - 0.45, 0.9, E.in);
  const proj = geoOrthographic().scale(R).translate([0, 0]).rotate([-rot, -18]).clipAngle(90);
  const path = geoPath(proj);
  const keys: Key[] = [
    [B(18), { x: 317, y: -187, z: 3.2 }],
    [B(18) + 1.1, { x: -380, y: 0, z: 1.0 }, E.out],
    [B(20) - 0.45, { x: -360, y: -20, z: 1.06 }, E.lin],
    [B(20) + 0.3, { x: -100, y: -700, z: 0.9 }, E.in],
  ];
  const lightUp = (i: number) => pr(t, B(18) + 0.7 + (i % 37) * 0.025, 0.4);
  const cnGlow = pr(t, B(19) + 0.2, 0.8);
  const cnPt = proj([104, 35]);
  return (
    <Stage keys={keys}>
      <Plane>
        <div style={{ opacity: inn }}>
          <div style={{ position: "absolute", left: -R * 1.8, top: -R * 1.8, width: R * 3.6, height: R * 3.6, borderRadius: "50%", background: "radial-gradient(circle, rgba(77,212,255,0.14) 30%, transparent 62%)" }} />
          <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
            <defs>
              <radialGradient id="ocean" cx="40%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#10284a" />
                <stop offset="100%" stopColor="#050c1a" />
              </radialGradient>
            </defs>
            <path d={path({ type: "Sphere" } as never) ?? ""} fill="url(#ocean)" stroke="rgba(77,212,255,0.35)" strokeWidth={2} />
            <path d={path(geoGraticule10() as never) ?? ""} fill="none" stroke="rgba(166,236,255,0.07)" strokeWidth={1} />
            <path d={path(land as never) ?? ""} fill="rgba(166,190,220,0.06)" stroke="rgba(166,190,220,0.18)" strokeWidth={1} />
            <path d={path(china as never) ?? ""} fill={`rgba(255,209,102,${0.08 + 0.18 * cnGlow})`} stroke={`rgba(255,209,102,${0.3 + 0.5 * cnGlow})`} strokeWidth={1.5} />
            {DOTS.map((d, i) => {
              const p = proj([d.lon, d.lat]);
              if (!p) return null;
              const vis = geoVisible(d.lon, d.lat, rot);
              if (!vis) return null;
              const on = d.lit ? lightUp(i) : 0;
              const g = d.cn ? cnGlow * (d.lit ? 1 : 0.55) : 0;
              const col = g > 0.2 || (on > 0 && rise > 0.05) ? "#ffd166" : on > 0 ? CYAN : "rgba(166,190,220,0.25)";
              const r = 2.2 + 2.2 * Math.max(on, g);
              const up = on > 0 || g > 0 ? rise * (500 + (i % 13) * 60) : 0;
              return <circle key={i} cx={p[0]} cy={p[1] - up} r={r * (1 + rise)} fill={col} opacity={(0.5 + 0.5 * Math.max(on, g) * (0.75 + 0.25 * Math.sin(t * 3 + i))) * (1 - rise * 0.3)} />;
            })}
          </svg>
        </div>
        {cnPt ? (
          <At x={cnPt[0] + 30} y={cnPt[1] - 40}>
            <Tag at={B(19) + 0.5} text="中国：6 亿人用 AI" sub="大多用国产 AI · 占人口 43%" color="#ffd166" size={34} />
          </At>
        ) : null}
        <Words at={B(18) + 0.3} lines={["今天每 7 个人里，", "就有 1 个每周找它。"]} x={-1200} y={-150} size={74} kw={["1 个"]} kwColor={CYAN} kwAt={B(18) + 1.2} out={B(20) - 0.55} outStyle="fade" />
      </Plane>
      <Fine at={B(18) + 0.6} out={B(20) - 0.1}>
        只算 ChatGPT：每周 12 亿用户（OpenAI 自报，2026-09）÷ 世界人口约 83 亿 · 中国生成式 AI 用户 6.02 亿，占人口 42.8%（CNNIC，2025-12）
      </Fine>
    </Stage>
  );
};

// a point is on the visible hemisphere when its angular distance to the view centre is under 90°
const geoVisible = (lon: number, lat: number, rot: number) => {
  const toR = Math.PI / 180;
  const la1 = lat * toR;
  const la0 = 18 * toR;
  const dl = (lon - rot) * toR;
  return Math.sin(la0) * Math.sin(la1) + Math.cos(la0) * Math.cos(la1) * Math.cos(dl) > 0.02;
};
