// v19 opening in the editorial-sheet look the user picked (style frames v18, B): the whole opening is printed on one
// large dark sheet laid in perspective, and a single camera glides from one block to the next. No cuts, no fades:
// type is printed in with a press wipe or slammed, conclusions are stamped in red (the camera takes the knock), the
// title is a proofreader's correction — "AI 的标价", 标价 struck in red marker, 真实价格 stamped in gold.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { bf, sec } from "../v10/bars";
import { FONT, MONO, SERIF } from "../v10/theme";
import { Id, M, PRICE } from "../v13/data";
import { clamp01, EIO, EO, Grain, lerp, ramp, rgba, useFonts } from "../v15/kit";

export const SHEET19_FRAMES = bf(10.9);

const BARS = { q1: -0.14, ds: 1.65, big: 2.8, gap: 4.0, plan: 5.2, said: 6.6, ask: 7.6, title: 8.6, strike: 9.0, swap: 9.3, sub: 9.7, end0: 10.5, end1: 10.9 } as const;
const S = Object.fromEntries(Object.entries(BARS).map(([k, v]) => [k, sec(v)])) as Record<keyof typeof BARS, number>;

const INK = "#efe6d4";
const MUTE = "rgba(239,230,212,0.62)";
const GOLD = "#f2c35c";
const RED = "#e5322d";
const SW = 8800;
const SH = 4400;

const YUAN: Record<Id, number> = { deepseek: 8, glm: 30, kimi: 68, claude: 134, chatgpt: 336 };
const ORDER = [...M].sort((a, b) => PRICE[a.id] - PRICE[b.id]);

// ---------- the camera: [t, cx, cy, scale, rotateX, rotateZ], sheet point (cx, cy) at screen centre ----------
type K = [number, number, number, number, number, number];
const CAM: K[] = [
  [0.0, 1050, 780, 1.2, 26, -9],
  [3.6, 1200, 850, 1.0, 24, -8],
  [4.25, 2420, 640, 1.75, 22, -6],
  [6.3, 2470, 655, 1.65, 22, -6],
  [7.2, 3020, 900, 0.9, 26, -9],
  [9.0, 3050, 890, 0.93, 26, -9],
  [9.7, 3080, 800, 1.0, 25, -10],
  [11.55, 3100, 830, 0.97, 25, -9],
  [12.25, 4850, 960, 1.0, 22, -7],
  [14.6, 4900, 980, 1.1, 22, -7],
  [16.7, 4920, 1000, 1.08, 22, -7],
  [17.4, 4940, 1680, 1.1, 18, -5],
  [18.85, 4950, 1690, 1.18, 18, -5],
  [19.6, 6300, 3090, 0.66, 18, -4],
  [24.5, 6300, 3090, 0.7, 18, -4],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const u = EIO(clamp01((t - a[0]) / (b[0] - a[0])));
  return { cx: lerp(a[1], b[1], u), cy: lerp(a[2], b[2], u), s: lerp(a[3], b[3], u), rx: lerp(a[4], b[4], u), rz: lerp(a[5], b[5], u) };
};

// stamps knock the camera
const STAMPS = { s88: S.q1 + 2.0, s42: S.gap + 0.35, sCheap: S.said + 0.6, sTrue: S.swap } as const;
const shake = (t: number) => {
  let x = 0;
  let y = 0;
  for (const a of Object.values(STAMPS)) {
    if (t < a) continue;
    const k = Math.exp(-(t - a) * 16);
    x += 7 * k * Math.sin((t - a) * 95);
    y += 5 * k * Math.cos((t - a) * 83);
  }
  return { x, y };
};

const TXT =
  "让 AI 写一整套《三体》要多少钱？第一部 三体第二部 黑暗森林第三部 死神永生88 万字写一整套《三体》· 各家 AI 的价格 · 单位：元差 42 倍" +
  "可就是这些贵的 AI，有人每个月花约 1,344 元还说：这是最便宜的 AI最便宜？他算错了吗？AI 的标价真实价格第 1 集 · 文字 AI/ 月" +
  "图 1 一整套《三体》约 88 万字，按 1 个 token 约 1 个字估算价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月智谱DeepSeekClaudeChatGPTKimi¥$0123456789.,—";

export const Sheet19: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  useFonts([`700 300px ${SERIF}`, `900 90px ${FONT}`, `700 40px ${FONT}`, `700 60px ${MONO}`, `500 24px ${FONT}`], TXT);

  const c = camAt(t);
  const p = camAt(Math.max(0, t - 1 / 30));
  const sh = shake(t);
  // motion blur from the camera's speed on screen
  const vx = Math.abs(c.cx - p.cx) * c.s;
  const vy = Math.abs(c.cy - p.cy) * c.s * 0.8;
  const bx = Math.min(36, vx * 0.42);
  const by = Math.min(24, vy * 0.42);
  const blurOn = bx + by > 0.6;
  // the light narrows on the question, then opens for the title
  const spot = ramp(t, S.ask - 0.2, S.ask + 0.8) * (1 - ramp(t, S.title - 0.3, S.title + 0.6));
  const fadeOut = ramp(t, S.end0, S.end1);

  return (
    <AbsoluteFill style={{ background: "#05070c", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.7} />
      {(
        [
          ["sfx/thump.wav", S.q1 + 0.25, 0.35],
          ["sfx/keypress.wav", S.q1 + 0.9, 0.2],
          ["sfx/keypress.wav", S.q1 + 1.15, 0.2],
          ["sfx/keypress.wav", S.q1 + 1.4, 0.2],
          ["sfx/punch.wav", STAMPS.s88, 0.55],
          ["sfx/swipe.wav", 3.65, 0.28],
          ["sfx/data.wav", S.ds + 0.1, 0.14],
          ["sfx/swipe.wav", 6.4, 0.18],
          ["sfx/data.wav", S.big, 0.14],
          ["sfx/punch.wav", STAMPS.s42, 0.6],
          ["sfx/swipe.wav", 11.6, 0.28],
          ["sfx/thump.wav", S.plan + 0.6, 0.4],
          ["sfx/punch.wav", STAMPS.sCheap, 0.6],
          ["sfx/swipe.wav", 16.75, 0.22],
          ["sfx/swipe.wav", 18.9, 0.3],
          ["sfx/thump.wav", S.title + 0.05, 0.4],
          ["sfx/brush.wav", S.strike, 0.6],
          ["sfx/punch.wav", STAMPS.sTrue, 0.55],
          ["sfx/keypress.wav", S.sub, 0.2],
        ] as [string, number, number][]
      ).map(([src, at, v], i) => (
        <Sequence key={i} from={Math.round(at * 30)} layout="none">
          <Audio src={staticFile(src)} volume={v} />
        </Sequence>
      ))}

      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="mblur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>

      <AbsoluteFill style={{ filter: blurOn ? "url(#mblur)" : undefined, opacity: 1 - fadeOut }}>
        <AbsoluteFill style={{ perspective: 1700 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: SW,
              height: SH,
              transformOrigin: "0 0",
              transform: `translate(${960 + sh.x}px, ${540 + sh.y}px) rotateX(${c.rx}deg) rotateZ(${c.rz}deg) scale(${c.s}) translate(${-c.cx}px, ${-c.cy}px)`,
              backgroundImage: `url(${staticFile("paper19.png")})`,
              backgroundSize: "1024px 1024px",
            }}
          >
            <Content t={t} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* a warm lamp over the paper, and a spotlight that narrows on the question */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 45% 40%, rgba(255,226,180,0.10), rgba(0,0,0,0) 70%)", mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse ${lerp(140, 52, spot)}% ${lerp(130, 48, spot)}% at 50% 50%, rgba(0,0,0,0) 40%, rgba(2,3,6,${0.55 + 0.4 * spot}) 100%)` }} />
      {/* depth of field: the far and near edges of the sheet go soft */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, backdropFilter: "blur(5px)", WebkitMaskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260, backdropFilter: "blur(4px)", WebkitMaskImage: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%)" }} />
      <Grain frame={frame} amount={0.05} />
    </AbsoluteFill>
  );
};

// ---------- printing ----------

const Print: React.FC<{ t: number; at: number; x: number; y: number; dur?: number; slam?: boolean; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, at, x, y, dur, slam, style, children }) => {
  const d = dur ?? (slam ? 0.22 : 0.38);
  const p = ramp(t, at, at + d, EO);
  if (p <= 0) return null;
  const base: React.CSSProperties = { position: "absolute", left: x, top: y, whiteSpace: "nowrap", color: INK, textShadow: "0 0 1px rgba(239,230,212,0.35)", ...style };
  if (slam) {
    return (
      <div style={{ ...base, opacity: Math.min(1, p * 2), transform: `scale(${lerp(1.22, 1, p)})`, transformOrigin: "left center", filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined }}>
        {children}
      </div>
    );
  }
  return <div style={{ ...base, clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)` }}>{children}</div>;
};

const Stamp: React.FC<{ t: number; at: number; x: number; y: number; rot: number; size: number; color?: string; children: React.ReactNode }> = ({ t, at, x, y, rot, size, color = RED, children }) => {
  const p = ramp(t, at, at + 0.13, EO);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `rotate(${rot + (1 - p) * 7}deg) scale(${lerp(1.75, 1, p)})`,
        opacity: Math.min(1, p * 1.6) * 0.93,
        border: `${size * 0.075}px solid ${color}`,
        borderRadius: size * 0.08,
        padding: `${size * 0.06}px ${size * 0.28}px`,
        color,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.12,
        whiteSpace: "nowrap",
        boxShadow: `0 0 ${size * 0.4}px ${rgba(color, 0.18)}`,
      }}
    >
      {children}
    </div>
  );
};

const Rule: React.FC<{ t: number; at: number; x: number; y: number; w: number }> = ({ t, at, x, y, w }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w * ramp(t, at, at + 0.5, EO), height: 2, background: "rgba(239,230,212,0.28)" }} />
);

// ---------- what is printed where ----------

const Content: React.FC<{ t: number }> = ({ t }) => (
  <>
    {/* block 1: the Three-Body trilogy */}
    <Print t={t} at={S.q1} x={560} y={540} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 66 }}>让 AI 写一整套</Print>
    <Print t={t} at={S.q1 + 0.25} x={510} y={610} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 310, lineHeight: "350px" }}>《三体》</Print>
    {["第一部 三体", "第二部 黑暗森林", "第三部 死神永生"].map((l, i) => (
      <Print key={l} t={t} at={S.q1 + 0.9 + i * 0.25} x={1650} y={690 + i * 56} dur={0.3} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: MUTE }}>
        {l}
      </Print>
    ))}
    <Print t={t} at={S.q1 + 1.25} x={560} y={1000} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, color: GOLD }}>要多少钱？</Print>
    <Stamp t={t} at={STAMPS.s88} x={1640} y={930} rot={-8} size={74}>88 万字</Stamp>
    <Print t={t} at={S.q1 + 2.3} x={560} y={1150} dur={0.6} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: "rgba(239,230,212,0.4)" }}>
      图 1 —— 一整套《三体》约 88 万字，按 1 个 token 约 1 个字估算
    </Print>

    {/* block 2: what each AI charges for it */}
    <Print t={t} at={S.ds - 0.25} x={2150} y={530} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: MUTE, letterSpacing: "0.04em" }}>
      写一整套《三体》· 各家 AI 的价格 · 单位：元
    </Print>
    <Rule t={t} at={S.ds - 0.2} x={2150} y={585} w={1700} />
    {ORDER.map((m, i) => {
      const at = m.id === "deepseek" ? S.ds : S.big + (i - 1) * 0.12;
      const y = 625 + i * 130;
      const g = ramp(t, at + 0.1, at + 1.0, EO);
      const L = Math.max(16, (YUAN[m.id] / 336) * 1300) * g;
      const hi = m.id === "deepseek" || m.id === "chatgpt";
      return (
        <React.Fragment key={m.id}>
          <Print t={t} at={at} x={2150} y={y + 6} dur={0.3} style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: m.name === "智谱" ? 900 : 700, fontSize: 38 }}>
            {m.name}
          </Print>
          {g > 0 && <div style={{ position: "absolute", left: 2420, top: y, width: L, height: 66, background: hi ? GOLD : "rgba(239,230,212,0.5)", boxShadow: hi ? `0 0 30px ${rgba(GOLD, 0.25)}` : undefined }} />}
          <Print t={t} at={at + 0.85} x={2420 + Math.max(16, (YUAN[m.id] / 336) * 1300) + 26} y={y - 6} dur={0.25} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 66, color: hi ? GOLD : INK }}>
            ¥{YUAN[m.id]}
          </Print>
        </React.Fragment>
      );
    })}
    <Stamp t={t} at={STAMPS.s42} x={3330} y={500} rot={-10} size={124}>差 42 倍</Stamp>
    <Print t={t} at={S.big + 1.2} x={2150} y={1290} dur={0.6} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: "rgba(239,230,212,0.4)" }}>
      价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月
    </Print>

    {/* block 3: $200 a month */}
    <Print t={t} at={S.plan} x={4250} y={620} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64 }}>可就是这些贵的 AI，</Print>
    <Print t={t} at={S.plan + 0.3} x={4250} y={705} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64 }}>有人每个月花</Print>
    <Print t={t} at={S.plan + 0.6} x={4225} y={770} slam style={{ fontFamily: MONO, fontWeight: 700, fontSize: 370, lineHeight: "400px", color: GOLD, textShadow: `0 0 40px ${rgba(GOLD, 0.25)}` }}>
      $200
    </Print>
    <Print t={t} at={S.plan + 0.8} x={5130} y={1000} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 110, color: GOLD }}>/ 月</Print>
    <Print t={t} at={S.plan + 1.05} x={4255} y={1170} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: MUTE }}>约 1,344 元</Print>
    <Print t={t} at={S.said} x={4250} y={1250} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 76 }}>还说：这是最便宜的 AI</Print>
    <Stamp t={t} at={STAMPS.sCheap} x={5200} y={760} rot={-12} size={124}>最便宜？</Stamp>

    {/* the question */}
    <Print t={t} at={S.ask + 0.2} x={4300} y={1560} slam style={{ fontFamily: FONT, fontWeight: 900, fontSize: 214, lineHeight: "250px" }}>
      他算错了吗？
    </Print>

    {/* the title: a proofreader's correction */}
    <Title t={t} />
  </>
);

const TCX = 6300;
const TY = 2950;
const TFS = 250;
const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t < S.title - 0.05) return null;
  const p = ramp(t, S.title, S.title + 0.22, EO);
  const strike = ramp(t, S.strike, S.strike + 0.3, EIO);
  const st = ramp(t, STAMPS.sTrue, STAMPS.sTrue + 0.13, EO);
  const sub = ramp(t, S.sub, S.sub + 0.6, EO);
  return (
    <>
      <div style={{ position: "absolute", left: TCX - 1700, top: TY, width: 3400, display: "flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap", fontFamily: FONT, fontWeight: 900, fontSize: TFS, lineHeight: `${TFS * 1.2}px`, color: INK }}>
        <span style={{ display: "inline-flex", opacity: Math.min(1, p * 2), transform: `scale(${lerp(1.22, 1, p)})`, filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined, textShadow: "0 0 1px rgba(239,230,212,0.35)" }}>
          <span>AI 的</span>
          <span style={{ position: "relative" }}>
            标价
            {/* the red marker stroke, drawn left to right */}
            <span
              style={{
                position: "absolute",
                left: "-7%",
                width: "114%",
                top: "47%",
                height: TFS * 0.12,
                borderRadius: TFS * 0.06,
                background: RED,
                opacity: 0.94,
                transform: `rotate(-2.5deg) scaleX(${strike})`,
                transformOrigin: "left center",
                boxShadow: `0 0 ${TFS * 0.12}px ${rgba(RED, 0.35)}`,
              }}
            />
          </span>
        </span>
        <span
          style={{
            display: "inline-block",
            marginLeft: TFS * 0.3,
            opacity: Math.min(1, st * 1.6) * 0.95,
            transform: `rotate(${-3 + (1 - st) * 7}deg) scale(${lerp(1.75, 1, st)})`,
            border: `${TFS * 0.075}px solid ${GOLD}`,
            borderRadius: TFS * 0.08,
            padding: `${TFS * 0.02}px ${TFS * 0.22}px`,
            color: GOLD,
            boxShadow: `0 0 ${TFS * 0.4}px ${rgba(GOLD, 0.18)}`,
          }}
        >
          真实价格
        </span>
      </div>
      <div style={{ position: "absolute", left: TCX - 1700, width: 3400, top: TY + TFS * 1.5, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 60, color: MUTE, letterSpacing: "0.12em", clipPath: `inset(-20% ${(1 - sub) * 100}% -20% 0)` }}>
        第 1 集 · 文字 AI
      </div>
    </>
  );
};

