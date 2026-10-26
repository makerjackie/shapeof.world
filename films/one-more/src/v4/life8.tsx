// Chapter 3 and the ending (track bars 64–84): the same "one piece missing" outside games; the coffee card (Kivetz et
// al. 2006: the closer to the free coffee, the faster people bought); life's goals, far out of sight; back to the
// thumb at 01:47; the last line; sources; the end card.
import React from "react";
import { Box, clamp01, EIN, EO, lerp, Note, ramp, Say, useT, win } from "../kit";
import { FONT, HAN, K } from "../theme";
import { GameBack } from "./ch1";
import { PhoneShot } from "./phoneshot";
import { BEAT, T } from "./time";

const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });

type Every = { kind: "coins" | "cart" | "swipe" | "streak" | "badge" | "group"; title: string; caption: string; c1: string };
const EVERY: Every[] = [
  { kind: "coins", title: "外卖满减", caption: "满 30 减 15，还差 3 元", c1: "#ff9a2a" },
  { kind: "cart", title: "购物车", caption: "再凑 1 件，包邮", c1: "#ff5d70" },
  { kind: "swipe", title: "短视频", caption: "下一个，再下一个", c1: "#8a4ff0" },
  { kind: "streak", title: "打卡", caption: "连续 29 天，别断", c1: "#3fbf5a" },
  { kind: "badge", title: "消息", caption: "没点开的小红点", c1: "#2a9fd8" },
  { kind: "group", title: "拼团", caption: "还差 1 人成团", c1: "#3f7fff" },
];
const EVERY_AT = (i: number) => T(64.3) + i * BEAT * 2;

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
  if (kind === "swipe")
    return (
      <g opacity={clamp01(show * 2)}>
        {[2, 1, 0].map((k) => {
          const up = k === 0 ? -30 * clamp01(show * 2 - 0.5) : 0;
          return (
            <g key={k} transform={`translate(${k * 14} ${k * 12 + up})`}>
              <rect x={190} y={20} width={130} height={200} rx={16} fill={k === 0 ? "#2a1f55" : k === 1 ? "#3a2a6a" : "#4a3a7a"} stroke="#fff" strokeWidth={3} />
              <path d={`M 243 98 l 30 22 l -30 22 Z`} fill="#fff" opacity={0.9} />
            </g>
          );
        })}
        {glow(390, 110, 40)}
        <path d="M 390 150 v -70 M 368 100 l 22 -24 l 22 24" stroke={miss} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
  if (kind === "badge")
    return (
      <g opacity={clamp01(show * 2)}>
        {["99+", "12", "3"].map((b, i) => {
          const x = 110 + i * 150;
          return (
            <g key={i}>
              <rect x={x - 50} y={70} width={100} height={100} rx={24} fill={["#2a9fd8", "#3fbf5a", "#ff9a2a"][i]} stroke="#fff" strokeWidth={3} />
              {glow(x + 46, 72, 30)}
              <rect x={x + 18} y={50} width={b.length > 2 ? 64 : 44} height={40} rx={20} fill={miss} stroke="#fff" strokeWidth={3} />
              <text x={x + 26} y={78} fontSize={24} fontWeight={900} fill="#fff" fontFamily="Inter, sans-serif">{b}</text>
            </g>
          );
        })}
      </g>
    );
  // group: three in, one seat empty
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
const slot = (i: number): [number, number] => [380 + (i % 3) * 580, 300 + Math.floor(i / 3) * 330];

const Everyday: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(64) - 0.05, T(68.05), 0.25, 0.35);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      {EVERY.map((g, i) => {
        const at = EVERY_AT(i);
        const d = t - at;
        if (d < 0) return null;
        const pop = EO(clamp01(d / 0.28));
        const toGrid = EO(clamp01((t - (i < EVERY.length - 1 ? EVERY_AT(i + 1) : T(67.3))) / 0.3));
        const [sx, sy] = slot(i);
        const cx = lerp(960, sx, toGrid);
        const cy = lerp(480, sy, toGrid);
        const s = lerp(1.05, 0.82, toGrid) * (0.5 + 0.5 * pop);
        const p = 0.5 + 0.5 * Math.sin(t * 8 + i);
        const flash = Math.exp(-d / 0.12);
        return (
          <div key={i} style={{ position: "absolute", left: cx - PW / 2, top: cy - PH / 2, width: PW, height: PH, transform: `scale(${s})`, opacity: Math.min(1, d / 0.12) }}>
            <div style={{ position: "absolute", inset: -4, borderRadius: 30, background: "linear-gradient(135deg, #f2f6ff 0%, #9fb2d8 40%, #4a5a80 60%, #dfe8ff 100%)", boxShadow: `0 16px 40px rgba(0,0,0,0.55), 0 0 ${40 * flash + 12}px ${g.c1}aa` }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "linear-gradient(180deg, #24304f 0%, #141b33 100%)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70, background: `linear-gradient(90deg, ${g.c1}66, ${g.c1}11)` }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 12, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#fff", letterSpacing: 4 }}>{g.title}</div>
              <svg width={520} height={230} style={{ position: "absolute", left: 50, top: 76 }}>
                <EvDefs />
                <EveryPicto kind={g.kind} p={p} show={clamp01(d / 0.6)} />
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
  const o = win(t, T(68), T(71.55), 0.3, 0.35);
  if (o <= 0) return null;
  const p = 0.5 + 0.5 * Math.sin(t * 8);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <div style={{ position: "absolute", left: 960 - 520, top: 330, width: 1040, height: 520, borderRadius: 36, background: "linear-gradient(160deg, #fbf3e4 0%, #efe0c4 100%)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", transform: `rotate(-2deg) scale(${0.9 + 0.1 * ramp(t, T(68), T(68.4), EO)})` }}>
        <div style={{ position: "absolute", left: 50, top: 34, fontFamily: HAN, fontWeight: 900, fontSize: 46, color: "#5a3a1e" }}>集点卡 · 买 10 杯，送 1 杯</div>
        <svg width={1040} height={420} style={{ position: "absolute", left: 0, top: 110 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const x = 120 + (i % 5) * 200;
            const y = 90 + Math.floor(i / 5) * 190;
            const on = i < 9;
            const k = clamp01((t - T(68.1) - i * 0.08) / 0.2);
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
      <Note at={T(68.3)} out={T(71.4)}>Kivetz, Urminsky, Zheng, Journal of Marketing Research 2006：咖啡店的集点卡，离免费那一杯越近，顾客来买得越勤</Note>
    </div>
  );
};

// ---------- life's goals, far out of sight ----------
const FAR = [
  { title: "存钱", sub: "还差 30 万", v: 0.06 },
  { title: "减重", sub: "还差 20 斤", v: 0.1 },
  { title: "考试", sub: "还有 400 天", v: 0.03 },
];
const Far: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(71.5), T(74.05), 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, background: "linear-gradient(180deg, #0a0e1c 0%, #05070d 100%)" }}>
      {FAR.map((f, i) => {
        const k = EO(clamp01((t - T(71.6) - i * BEAT) / 0.35));
        const y = 360 + i * 170;
        return (
          <div key={i} style={{ position: "absolute", left: 220, top: y, width: 1480, opacity: k, transform: `translateX(${(1 - k) * -60}px)` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginBottom: 14 }}>
              <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#dfe6f5" }}>{f.title}</span>
              <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 30, color: "#8a93a6" }}>{f.sub}</span>
            </div>
            <div style={{ position: "relative", height: 22, borderRadius: 11, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${f.v * 100}%`, borderRadius: 11, background: "#8a93a6" }} />
              <div style={{ position: "absolute", left: "30%", right: -20, top: -30, bottom: -30, background: "linear-gradient(90deg, rgba(5,7,13,0) 0%, rgba(5,7,13,0.85) 55%, rgba(5,7,13,0.97) 100%)" }} />
              <svg width={60} height={70} style={{ position: "absolute", right: -10, top: -56, opacity: 0.18 }}>
                <path d="M 12 66 V 8 L 50 20 L 12 32" fill="none" stroke="#8a93a6" strokeWidth={4} strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- back to 01:47, and the last line ----------
const Return: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(74), T(79.7), 0.35, 0.4);
  if (o <= 0) return null;
  const leave = ramp(t, T(76.6), T(77.3), EIN);
  const hover: [number, number] = [262, 108];
  const bob = Math.sin(t * 2.2) * 6;
  const dim = ramp(t, T(76.7), T(77.6));
  const cam = { cx: -330 - 14 * ramp(t, T(74), T(79.6), (u) => u), cy: -150, z: 0.93 + 0.08 * ramp(t, T(74), T(79.6), (u) => u) };
  const beatPhase = (((t - T(74)) / BEAT) % 1 + 1) % 1;
  return <PhoneShot t={t} o={o} cam={cam} screen="result" beatPhase={beatPhase} screenDim={0.62 * dim} thumb={{ x: hover[0] + 240 * leave, y: hover[1] + bob + 340 * leave, s: 1.06, o: 1 - leave }} />;
};

const Sources8: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(79.6), T(81.5), 0.35, 0.3);
  if (o <= 0) return null;
  const rows = [
    "老虎机实验：Clark, Lawrence, Astley-Jones, Gray, Neuron 2009（剑桥大学）",
    "想要与喜欢：Berridge & Robinson, American Psychologist 2016",
    "集点卡：Kivetz, Urminsky, Zheng, Journal of Marketing Research 2006",
    "习惯与目标：Lei 等, Journal of Behavioral Addictions 2025",
    "游戏画面、战绩、弹窗为自绘示意，不对应任何一款游戏；一夜的开心与想再来、大脑的位置为示意",
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
  if (t < T(64) - 0.2) return null;
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
      <Say at={T(64.25)} out={T(67.95)} size={56} weight={900} parts={["这种", want("“差一点”"), "，不只在游戏里。"]} />
    </Box>
    <Box x={960} y={90} align="center" gap={12}>
      <Say at={T(68.2)} out={T(70.1)} size={56} weight={900} parts={["研究发现：集点卡上，"]} />
      <Say at={T(68.7)} out={T(70.1)} size={56} weight={900} parts={["离免费那一杯越近，人买得", want("越快"), "。"]} />
    </Box>
    <Box x={960} y={90} align="center" gap={12}>
      <Say at={T(70.2)} out={T(71.45)} size={56} weight={900} parts={["到处都有人，把", want("“差一点”")]} />
      <Say at={T(70.55)} out={T(71.45)} size={56} weight={900} parts={["放在你够得着的地方。"]} />
    </Box>
    <Box x={220} y={150} gap={14}>
      <Say at={T(71.6)} out={T(73.95)} size={60} weight={900} parts={["生活里的目标，常常远得看不见。"]} />
      <Say at={T(72.6)} out={T(73.95)} size={60} weight={900} parts={["难怪，人总往", want("“差一点”"), "的地方去。"]} />
    </Box>
    <Box x={110} y={330} gap={18}>
      <Say at={T(74.1)} out={T(76.5)} size={60} weight={900} parts={["下一次，拇指停在这里，"]} />
      <Say at={T(74.7)} out={T(76.5)} size={60} weight={900} parts={["问问自己："]} />
      <Say at={T(75.1)} out={T(76.5)} size={66} weight={900} parts={["我是还", like("喜欢"), "，"]} style={{ marginTop: 16 }} />
      <Say at={T(75.5)} out={T(76.5)} size={66} weight={900} parts={["还是只是还", want("想要"), "？"]} />
    </Box>
    <Box x={110} y={380} gap={32}>
      <Say at={T(76.8)} out={T(79.55)} serif size={82} weight={900} parts={[want("想要"), "，可以被设计。"]} />
      <Say at={T(78.0)} out={T(79.55)} serif size={82} weight={900} parts={["喜欢，", { t: "只有你自己知道。", mark: true }]} />
    </Box>
  </>
);

