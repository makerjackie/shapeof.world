// Chapter 3 and the ending (story bars 43.5–64): the same "one piece missing" outside games; the coffee card (Kivetz
// et al. 2006: the closer to the free coffee, the faster people bought); life's goals, far out of sight (on the
// climax); back to the thumb at 01:47; the last line; sources (the end card is in film8).
import React from "react";
import { Box, clamp01, EO, lerp, Note, ramp, Say, useT, win } from "../kit";
import { FONT, HAN, K } from "../theme";
import { GameBack } from "./ch1";
import { PhoneShot } from "./phoneshot";
import { BEAT, S } from "./time";

const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });

type Every = { kind: "coins" | "cart" | "streak" | "group"; title: string; caption: string; c1: string };
const EVERY: Every[] = [
  { kind: "coins", title: "外卖满减", caption: "满 30 减 15，还差 3 元", c1: "#ff9a2a" },
  { kind: "cart", title: "购物车", caption: "再凑 1 件，包邮", c1: "#ff5d70" },
  { kind: "streak", title: "打卡", caption: "连续 29 天，别断", c1: "#3fbf5a" },
  { kind: "group", title: "拼团", caption: "还差 1 人成团", c1: "#3f7fff" },
];
export const EVERY_AT = (i: number) => S(43.6) + i * BEAT * 2;

const EveryPicto: React.FC<{ kind: Every["kind"]; p: number; show: number }> = ({ kind, p, show }) => {
  const miss = K.want;
  const glow = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} fill={miss} opacity={0.18 + 0.22 * p} />;
  if (kind === "coins")
    return (
      <g>
        {Array.from({ length: 10 }, (_, i) => {
          const x = 90 + (i % 5) * 85;
          const y = 70 + Math.floor(i / 5) * 90;
          const k = clamp01(show * 10 - i);
          const on = i < 9;
          return (
            <g key={i} opacity={k}>
              {!on ? glow(x, y, 40) : null}
              <circle cx={x} cy={y} r={32} fill={on ? "url(#ev-gold)" : "#0b1226"} stroke={on ? "#fff4c8" : miss} strokeWidth={on ? 2 : 4} strokeDasharray={on ? undefined : "7 6"} />
              {on ? <text x={x - 9} y={y + 10} fontSize={28} fontWeight={900} fill="#a05a00" fontFamily="Inter, sans-serif">¥</text> : null}
            </g>
          );
        })}
      </g>
    );
  if (kind === "cart")
    return (
      <g opacity={clamp01(show * 2)}>
        <path d="M 120 50 h 40 l 40 130 h 200 l 30 -100 h -250" fill="none" stroke="#fff" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={220} cy={205} r={14} fill="#fff" />
        <circle cx={380} cy={205} r={14} fill="#fff" />
        <rect x={190} y={100} width={64} height={64} rx={8} fill="#ff8a6a" stroke="#fff" strokeWidth={3} />
        <rect x={266} y={100} width={64} height={64} rx={8} fill="#ffc93a" stroke="#fff" strokeWidth={3} />
        {glow(374, 132, 46)}
        <rect x={342} y={100} width={64} height={64} rx={8} fill="#0b1226" stroke={miss} strokeWidth={4} strokeDasharray="8 6" />
        <path d="M 374 116 v 32 M 358 132 h 32" stroke={miss} strokeWidth={5} strokeLinecap="round" />
      </g>
    );
  if (kind === "streak")
    return (
      <g>
        {Array.from({ length: 30 }, (_, i) => {
          const x = 45 + (i % 10) * 45;
          const y = 50 + Math.floor(i / 10) * 55;
          const k = clamp01(show * 3 - i / 10);
          const on = i < 29;
          return (
            <g key={i} opacity={k}>
              {!on ? glow(x + 18, y + 18, 30) : null}
              <rect x={x} y={y} width={36} height={40} rx={7} fill={on ? "#1f6a3a" : "#0b1226"} stroke={on ? "#5df08a" : miss} strokeWidth={on ? 2 : 4} strokeDasharray={on ? undefined : "6 5"} />
              {on ? <path d={`M ${x + 9} ${y + 21} l 7 7 l 12 -14`} stroke="#5df08a" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </g>
          );
        })}
      </g>
    );
  return (
    <g>
      {Array.from({ length: 4 }, (_, i) => {
        const x = 90 + i * 115;
        const empty = i === 3;
        const k = clamp01(show * 4 - i);
        return (
          <g key={i} opacity={k}>
            {empty ? glow(x, 112, 52) : null}
            <circle cx={x} cy={112} r={44} fill={empty ? "#0b1226" : "url(#ev-blue)"} stroke={empty ? miss : "#d8ecff"} strokeWidth={empty ? 5 : 3} strokeDasharray={empty ? "9 7" : undefined} />
            {empty ? (
              <path d={`M ${x} 92 v 40 M ${x - 20} 112 h 40`} stroke={miss} strokeWidth={6} strokeLinecap="round" />
            ) : (
              <g fill="#fff">
                <circle cx={x} cy={98} r={13} />
                <path d={`M ${x - 24} 140 C ${x - 24} 116, ${x + 24} 116, ${x + 24} 140 Z`} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

const EvDefs: React.FC = () => (
  <defs>
    <linearGradient id="ev-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff0b8" />
      <stop offset="55%" stopColor="#ffc93a" />
      <stop offset="100%" stopColor="#e08a10" />
    </linearGradient>
    <linearGradient id="ev-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8fc4ff" />
      <stop offset="100%" stopColor="#2a5fd8" />
    </linearGradient>
  </defs>
);

const PW = 620;
const PH = 380;
const slot = (i: number): [number, number] => [650 + (i % 2) * 620, 300 + Math.floor(i / 2) * 330];

const Everyday: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(43.5) - 0.05, S(46.05), 0.2, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      {EVERY.map((g, i) => {
        const at = EVERY_AT(i);
        const d = t - at;
        if (d < 0) return null;
        const pop = EO(clamp01(d / 0.25));
        const toGrid = EO(clamp01((t - (i < EVERY.length - 1 ? EVERY_AT(i + 1) : S(45.4))) / 0.28));
        const [sx, sy] = slot(i);
        const cx = lerp(960, sx, toGrid);
        const cy = lerp(480, sy, toGrid);
        const s = lerp(1.05, 0.82, toGrid) * (0.5 + 0.5 * pop);
        const p = 0.5 + 0.5 * Math.sin(t * 8 + i);
        const flash = Math.exp(-d / 0.12);
        return (
          <div key={i} style={{ position: "absolute", left: cx - PW / 2, top: cy - PH / 2, width: PW, height: PH, transform: `scale(${s})`, opacity: Math.min(1, d / 0.1) }}>
            <div style={{ position: "absolute", inset: -4, borderRadius: 30, background: "linear-gradient(135deg, #f2f6ff 0%, #9fb2d8 40%, #4a5a80 60%, #dfe8ff 100%)", boxShadow: `0 16px 40px rgba(0,0,0,0.55), 0 0 ${40 * flash + 12}px ${g.c1}aa` }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "linear-gradient(180deg, #24304f 0%, #141b33 100%)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70, background: `linear-gradient(90deg, ${g.c1}66, ${g.c1}11)` }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 12, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#fff", letterSpacing: 4 }}>{g.title}</div>
              <svg width={520} height={230} style={{ position: "absolute", left: 50, top: 76 }}>
                <EvDefs />
                <EveryPicto kind={g.kind} p={p} show={clamp01(d / 0.5)} />
              </svg>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, textAlign: "center" }}>
                <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 32, color: "#fff", background: "rgba(255,79,154,0.32)", border: `2px solid ${K.want}`, borderRadius: 999, padding: "2px 22px" }}>{g.caption}</span>
              </div>
            </div>
            {flash > 0.02 ? <div style={{ position: "absolute", inset: -4, borderRadius: 30, background: "#fff", opacity: 0.45 * flash }} /> : null}
          </div>
        );
      })}
    </div>
  );
};

// ---------- the coffee card ----------
const Coffee: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(46), S(49.05), 0.25, 0.3);
  if (o <= 0) return null;
  const p = 0.5 + 0.5 * Math.sin(t * 8);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <div style={{ position: "absolute", left: 960 - 520, top: 330, width: 1040, height: 520, borderRadius: 36, background: "linear-gradient(160deg, #fbf3e4 0%, #efe0c4 100%)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", transform: `rotate(-2deg) scale(${0.9 + 0.1 * ramp(t, S(46), S(46.3), EO)})` }}>
        <div style={{ position: "absolute", left: 50, top: 34, fontFamily: HAN, fontWeight: 900, fontSize: 46, color: "#5a3a1e" }}>集点卡 · 买 10 杯，送 1 杯</div>
        <svg width={1040} height={420} style={{ position: "absolute", left: 0, top: 110 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const x = 120 + (i % 5) * 200;
            const y = 90 + Math.floor(i / 5) * 190;
            const on = i < 9;
            const k = clamp01((t - S(46.1) - i * 0.07) / 0.18);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={70} fill="none" stroke={on ? "#b08a5a" : K.want} strokeWidth={on ? 3 : 5} strokeDasharray={on ? "6 6" : "10 8"} />
                {!on ? <circle cx={x} cy={y} r={78} fill={K.want} opacity={0.12 + 0.16 * p} /> : null}
                {on ? (
                  <g opacity={k} transform={`rotate(${-12 + (i % 3) * 9} ${x} ${y})`}>
                    <circle cx={x} cy={y} r={58} fill="#8a4a2a" opacity={0.88} />
                    <path d={`M ${x - 26} ${y - 22} h 44 v 30 a 22 22 0 0 1 -44 0 Z M ${x + 18} ${y - 12} h 10 a 10 10 0 0 1 0 20 h -10`} fill="none" stroke="#fbf3e4" strokeWidth={6} strokeLinejoin="round" />
                  </g>
                ) : (
                  <text x={x - 44} y={y + 16} fontSize={44} fontWeight={900} fill={K.want} fontFamily={HAN}>
                    免费
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <Note at={S(46.2)} out={S(48.95)}>Kivetz, Urminsky, Zheng, Journal of Marketing Research 2006：咖啡店的集点卡，离免费那一杯越近，顾客来买得越勤</Note>
    </div>
  );
};

// ---------- life's goals, far out of sight ----------
// The reverse of the game's cards: there one piece is missing; here almost every piece is, and fog takes the rest.
type FarGoal = { title: string; sub: string; done: number; icon: "coin" | "check" | "cross"; c: string };
const FAR: FarGoal[] = [
  { title: "存钱", sub: "还差 30 万", done: 2, icon: "coin", c: "#d9b25a" },
  { title: "减重", sub: "还差 20 斤", done: 3, icon: "check", c: "#5fbf86" },
  { title: "考试", sub: "还有 400 天", done: 4, icon: "cross", c: "#7fa6e8" },
];
const FAR_COLS = 12;
const FAR_ROWS = 8;
const FAR_CELL = 40;
const FarSlot: React.FC<{ g: FarGoal; i: number; k: number }> = ({ g, i, k }) => {
  const x = (i % FAR_COLS) * FAR_CELL + FAR_CELL / 2;
  const y = Math.floor(i / FAR_COLS) * FAR_CELL + FAR_CELL / 2;
  const on = i < g.done;
  const empty = { fill: "none", stroke: "#8a93a6", strokeOpacity: 0.75, strokeWidth: 2.5, strokeDasharray: "4 4" };
  if (g.icon === "coin") return <circle cx={x} cy={y} r={13} opacity={k} {...(on ? { fill: g.c, stroke: "#f3dc9a", strokeWidth: 2 } : empty)} />;
  return (
    <g opacity={k}>
      <rect x={x - 13} y={y - 13} width={26} height={26} rx={5} {...(on ? { fill: `${g.c}55`, stroke: g.c, strokeWidth: 2 } : empty)} />
      {on && g.icon === "check" ? <path d={`M ${x - 7} ${y} l 5 5 l 9 -10`} stroke={g.c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {on && g.icon === "cross" ? <path d={`M ${x - 7} ${y - 7} l 14 14 M ${x + 7} ${y - 7} l -14 14`} stroke={g.c} strokeWidth={3} strokeLinecap="round" /> : null}
    </g>
  );
};
const Far: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(49), S(52.55), 0.3, 0.3);
  if (o <= 0) return null;
  const gw = FAR_COLS * FAR_CELL;
  const gh = FAR_ROWS * FAR_CELL;
  const fog = ramp(t, S(49.8), S(52.4), (u) => u);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, background: "linear-gradient(180deg, #0a0e1c 0%, #05070d 100%)" }}>
      {FAR.map((g, n) => {
        const at = S(49.1) + n * BEAT;
        const k = EO(clamp01((t - at) / 0.3));
        if (k <= 0) return null;
        const cx = 960 + (n - 1) * 600;
        return (
          <div key={n} style={{ position: "absolute", left: cx - 280, top: 320, width: 560, height: 460, opacity: k, transform: `translateY(${(1 - k) * 40}px)`, borderRadius: 26, background: "linear-gradient(180deg, #1a2034 0%, #0e1322 100%)", border: "2px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 30, top: 18, display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#dfe6f5" }}>{g.title}</span>
              <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 30, color: "#8a93a6" }}>{g.sub}</span>
            </div>
            <svg width={gw} height={gh} style={{ position: "absolute", left: (560 - gw) / 2, top: 100 }}>
              {Array.from({ length: FAR_COLS * FAR_ROWS }, (_, i) => (
                <FarSlot key={i} g={g} i={i} k={i < g.done ? k : clamp01((t - at - 0.15 - (i % FAR_COLS) * 0.025 - Math.floor(i / FAR_COLS) * 0.03) / 0.2)} />
              ))}
            </svg>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, rgba(14,19,34,0) ${lerp(70, 30, fog)}%, rgba(14,19,34,0.92) ${lerp(96, 62, fog)}%, rgba(14,19,34,1) 100%)` }} />
          </div>
        );
      })}
    </div>
  );
};

// ---------- back to 01:47, and the last line ----------
const Return: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(52.5), S(59.1), 0.3, 0.4);
  if (o <= 0) return null;
  const hover: [number, number] = [262, 108];
  const bob = Math.sin(t * 2.2) * 6;
  const dim = ramp(t, S(56.1), S(56.9));
  // Phone on the right half, clear of the lines on the left (they end near x = 960).
  const drift = ramp(t, S(52.5), S(59), (u) => u);
  const cam = { cx: -612 + 12 * drift, cy: -150, z: 0.78 + 0.02 * drift };
  const beatPhase = (((t - S(52.5)) / BEAT) % 1 + 1) % 1;
  return <PhoneShot t={t} o={o} cam={cam} screen="result" beatPhase={beatPhase} screenDim={0.62 * dim} thumb={{ x: hover[0], y: hover[1] + bob, s: 1.06, o: 1 }} />;
};

const Sources8: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(59), S(60.7), 0.3, 0.3);
  if (o <= 0) return null;
  const rows = [
    "老虎机实验：Clark, Lawrence, Astley-Jones, Gray, Neuron 2009（剑桥大学）",
    "想要与喜欢：Berridge & Robinson, American Psychologist 2016",
    "集点卡：Kivetz, Urminsky, Zheng, Journal of Marketing Research 2006",
    "习惯与目标：Lei 等, Journal of Behavioral Addictions 2025",
    "游戏画面、战绩、弹窗为自绘示意，不对应任何一款游戏；一夜的喜欢与想要、大脑的位置为示意",
    "配乐《千年之后（氛围版）》，和乐府；音效来自世界的形状自己的曲库",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: "#05060a", opacity: o }}>
      <div style={{ position: "absolute", left: 140, top: 170, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 34, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 28, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.9 }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Life8: React.FC = () => {
  const t = useT();
  if (t < S(43.5) - 0.2) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Everyday t={t} />
      <Coffee t={t} />
      <Far t={t} />
      <Return t={t} />
      <Life8Text />
      <Sources8 t={t} />
    </div>
  );
};

const Life8Text: React.FC = () => (
  <>
    <Box x={960} y={955} align="center">
      <Say at={S(43.6)} out={S(45.95)} size={56} weight={900} parts={["这种", want("“差一点”"), "，不只在游戏里。"]} />
    </Box>
    <Box x={960} y={90} align="center" gap={12}>
      <Say at={S(46.1)} out={S(47.6)} size={56} weight={900} parts={["集点卡上，离免费那一杯越近，"]} />
      <Say at={S(46.5)} out={S(47.6)} size={56} weight={900} parts={["人买得", want("越快"), "。"]} />
    </Box>
    <Box x={960} y={90} align="center">
      <Say at={S(47.7)} out={S(48.95)} size={60} weight={900} parts={["可免费的那一杯，并不", like("更好喝"), "。"]} />
    </Box>
    <Box x={960} y={110} align="center" gap={14}>
      <Say at={S(49.1)} out={S(52.4)} size={60} weight={900} parts={["生活里的目标，常常远得看不见。"]} />
      <Say at={S(50.5)} out={S(52.4)} size={60} weight={900} parts={["难怪，人总往", want("“差一点”"), "的地方去。"]} />
    </Box>
    <Box x={100} y={370} gap={18}>
      <Say at={S(52.6)} out={S(54.45)} size={56} weight={900} parts={["下一次，拇指停在这里，"]} />
      <Say at={S(53.1)} out={S(54.45)} size={56} weight={900} parts={["先等三秒，让", { t: "“知道”", c: K.know }, "赶上来。"]} />
    </Box>
    <Box x={100} y={370} gap={18}>
      <Say at={S(54.5)} out={S(55.95)} size={56} weight={900} parts={["再问自己："]} />
      <Say at={S(54.85)} out={S(55.95)} size={60} weight={900} parts={["我是还", like("喜欢"), "，还是只是还", want("想要"), "？"]} />
    </Box>
    <Box x={100} y={390} gap={32}>
      <Say at={S(56.2)} out={S(58.95)} serif size={76} weight={900} parts={[want("想要"), "，可以被设计。"]} />
      <Say at={S(57.3)} out={S(58.95)} serif size={76} weight={900} parts={["喜欢，", { t: "只有你自己知道。", mark: true }]} />
    </Box>
  </>
);
