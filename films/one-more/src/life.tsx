// Chapter C (1:57–2:56): the same machine everywhere, who it pulls hardest, what it gives, and back to 1:47.
import React from "react";
import { Cam } from "./cam";
import { Clock } from "./game";
import { arc, Box, clamp01, EIN, EIO, EO, Glow, lerp, Neon, Note, ramp, Say, Tag, useT, win } from "./kit";
import { PhoneHtml, PhoneSvg } from "./phone";
import { FONT, HAN, K, NUM } from "./theme";
import { C, sC } from "./timing";

const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });
const BEAT = C.bar / 4;

// ---------- apps ----------
type Icon = "game" | "video" | "shop" | "chat" | "feed" | "bell";
const APPS: { x: number; y: number; icon: Icon; badge: string; hi: number }[] = [
  { x: 1040, y: 440, icon: "game", badge: "1", hi: 0 },
  { x: 1260, y: 440, icon: "video", badge: "", hi: sC(2.7) },
  { x: 1480, y: 440, icon: "shop", badge: "限时", hi: sC(3.15) },
  { x: 1040, y: 680, icon: "chat", badge: "99+", hi: sC(3.6) },
  { x: 1260, y: 680, icon: "feed", badge: "12", hi: sC(3.6) },
  { x: 1480, y: 680, icon: "bell", badge: "3", hi: sC(3.6) },
];

const Glyph: React.FC<{ icon: Icon; x: number; y: number }> = ({ icon, x, y }) => {
  const c = K.fg;
  if (icon === "game")
    return (
      <g>
        <circle cx={x} cy={y} r={30} fill="#ffe3ef" />
        <circle cx={x} cy={y} r={36} fill="none" stroke={K.want} strokeWidth={4} />
      </g>
    );
  if (icon === "video") return <path d={`M ${x - 18} ${y - 26} L ${x + 26} ${y} L ${x - 18} ${y + 26} Z`} fill={c} />;
  if (icon === "shop")
    return (
      <g fill="none" stroke={c} strokeWidth={5} strokeLinejoin="round">
        <rect x={x - 28} y={y - 14} width={56} height={44} rx={6} />
        <path d={`M ${x - 14} ${y - 14} C ${x - 14} ${y - 38}, ${x + 14} ${y - 38}, ${x + 14} ${y - 14}`} />
      </g>
    );
  if (icon === "chat")
    return <path d={`M ${x - 32} ${y - 22} h 64 a 8 8 0 0 1 8 8 v 30 a 8 8 0 0 1 -8 8 h -34 l -18 16 v -16 h -12 a 8 8 0 0 1 -8 -8 v -30 a 8 8 0 0 1 8 -8 z`} fill="none" stroke={c} strokeWidth={5} strokeLinejoin="round" />;
  if (icon === "feed")
    return (
      <g stroke={c} strokeWidth={6} strokeLinecap="round">
        <line x1={x - 28} x2={x + 28} y1={y - 18} y2={y - 18} />
        <line x1={x - 28} x2={x + 28} y1={y} y2={y} />
        <line x1={x - 28} x2={x + 10} y1={y + 18} y2={y + 18} />
      </g>
    );
  return (
    <g fill="none" stroke={c} strokeWidth={5} strokeLinejoin="round">
      <path d={`M ${x - 24} ${y + 16} C ${x - 18} ${y + 6}, ${x - 22} ${y - 28}, ${x} ${y - 28} C ${x + 22} ${y - 28}, ${x + 18} ${y + 6}, ${x + 24} ${y + 16} Z`} />
      <path d={`M ${x - 7} ${y + 22} a 7 7 0 0 0 14 0`} />
    </g>
  );
};

const Apps: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sC(0.9), sC(4.5), 0.3, 0.4);
  if (o <= 0) return null;
  const ringK = ramp(t, sC(1.9), sC(2.6), EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {APPS.map((a, i) => {
          const k = i === 0 ? ramp(t, sC(1.0), sC(1.4), EO) : ramp(t, sC(1.15) + i * 0.16, sC(1.15) + i * 0.16 + 0.45, EO);
          if (k <= 0) return null;
          const hi = a.hi > 0 ? win(t, a.hi, sC(4.4), 0.15, 0.4) : 0;
          const rot = (t - sC(1.9)) * (i % 2 ? -26 : 22) + i * 47;
          return (
            <g key={i} opacity={k} transform={`translate(${a.x} ${a.y}) scale(${0.85 + 0.15 * k}) translate(${-a.x} ${-a.y})`}>
              {hi > 0 ? <Glow id={`app-hi-${i}`} x={a.x} y={a.y} r={150} color={K.want} o={0.6 * hi} /> : null}
              <rect x={a.x - 75} y={a.y - 75} width={150} height={150} rx={36} fill="#111a2e" stroke={hi > 0 ? K.want : "#2b3855"} strokeWidth={2.5 + 2 * hi} />
              <Glyph icon={a.icon} x={a.x} y={a.y} />
              {ringK > 0 ? (
                <g opacity={ringK}>
                  <path d={arc(a.x, a.y, 104, rot + 30, rot + 330)} stroke={K.cyan} strokeOpacity={0.45} strokeWidth={3} fill="none" strokeLinecap="round" />
                  <path d={arc(a.x, a.y, 104, rot - 26, rot + 26)} stroke={K.want} strokeWidth={5} fill="none" strokeLinecap="round" />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {APPS.map((a, i) => {
        if (!a.badge) return null;
        const at = i < 3 ? sC(2.7) + i * 0.35 : sC(3.6) + (i - 3) * 0.08;
        const k = ramp(t, at, at + 0.3, EO);
        if (k <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: a.x + 62, top: a.y - 66, transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * k})`, opacity: k, background: K.want, color: "#fff", fontFamily: FONT, fontWeight: 900, fontSize: 24, borderRadius: 999, padding: "4px 12px", minWidth: 22, textAlign: "center", boxShadow: `0 0 22px ${K.want}` }}>
            {a.badge}
          </div>
        );
      })}
    </div>
  );
};

// ---------- the three needs (Przybylski et al. 2009) ----------
const Person: React.FC<{ x: number; y: number; full: boolean; k: number; t: number; play: number; happy: number }> = ({ x, y, full, k, t, play, happy }) => {
  const needs: [string, number, number][] = [
    ["能做好", -150, -150],
    ["自己选", 0, -235],
    ["有人一起", 150, -150],
  ];
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: k }}>
        <circle cx={x} cy={y - 120} r={40} fill={full ? K.likeHi : "#9aa4b8"} opacity={0.9} />
        <path d={`M ${x - 70} ${y + 30} C ${x - 66} ${y - 50}, ${x + 66} ${y - 50}, ${x + 70} ${y + 30} Z`} fill={full ? K.likeHi : "#9aa4b8"} opacity={0.9} />
        {needs.map(([, dx, dy], i) => {
          const nk = ramp(t, sC(4.8) + i * 0.15, sC(5.2) + i * 0.15, EO);
          return (
            <circle key={i} cx={x + dx} cy={y - 120 + dy + 100} r={30 * nk} fill={full ? K.like : "none"} stroke={full ? K.like : "#8a93a6"} strokeWidth={3} strokeDasharray={full ? undefined : "6 6"} opacity={nk} />
          );
        })}
        {[
          [K.cyan, play],
          [K.like, happy],
        ].map(([c, v], i) => (
          <g key={i}>
            <rect x={x - 130} y={y + 90 + i * 60} width={280} height={22} rx={11} fill="#fff" opacity={0.07} />
            <rect x={x - 130} y={y + 90 + i * 60} width={280 * (v as number)} height={22} rx={11} fill={c as string} />
          </g>
        ))}
      </svg>
      {needs.map(([label, dx, dy], i) => (
        <Tag key={label} x={x + dx} y={y - 120 + dy + 100 + (dy < -200 ? -56 : 58)} at={sC(4.9) + i * 0.15} out={sC(8.45)} color={full ? K.likeHi : K.muted} size={27}>
          {label}
        </Tag>
      ))}
      <Tag x={x - 146} y={y + 101} at={sC(5.9)} out={sC(8.45)} color={K.cyan} size={26} anchor="right">
        玩得多
      </Tag>
      <Tag x={x - 146} y={y + 161} at={sC(6.6)} out={sC(8.45)} color={K.like} size={26} anchor="right">
        开心
      </Tag>
    </>
  );
};

const Needs: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sC(4.55), sC(8.5), 0.4, 0.4);
  if (o <= 0) return null;
  const play = ramp(t, sC(5.9), sC(6.4), EO);
  const happy = ramp(t, sC(6.6), sC(7.1), EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <Person x={1010} y={560} full k={ramp(t, sC(4.6), sC(5.0), EO)} t={t} play={0.5 * play} happy={0.84 * happy} />
      <Person x={1520} y={560} full={false} k={ramp(t, sC(4.75), sC(5.15), EO)} t={t} play={0.9 * play} happy={0.3 * happy} />
    </div>
  );
};

// ---------- life is quiet, the game answers ----------
// The game answers every tap, all the way through; life takes things in and says nothing back.
export const TAPS = Array.from({ length: 30 }, (_, i) => ({
  at: sC(8.75) + i * 0.3,
  x: 1130 + ((i * 397) % 640),
  y: 300 + ((i * 251) % 440),
  word: ["+25", "漂亮", "★", "+1", "连胜", "+50", "完美", "升级"][i % 8],
  c: i % 3 === 0 ? K.want : i % 3 === 1 ? K.cyan : K.gold,
}));
export const CARDS = ["投简历", "发消息", "交方案", "健身第 30 天", "背单词", "等回复"];
export const CARD_GAP = 1.15;

const Split: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sC(8.55), sC(13.0), 0.4, 0.45);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={960} x2={960} y1={150} y2={760} stroke={K.fg} strokeOpacity={0.15} strokeWidth={2} />
        <defs>
          <radialGradient id="well">
            <stop offset="0%" stopColor="#000" stopOpacity={1} />
            <stop offset="70%" stopColor="#05070b" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#1a2235" stopOpacity={0.6} />
          </radialGradient>
        </defs>
        <ellipse cx={480} cy={668} rx={300} ry={70} fill="url(#well)" stroke="#2b3855" strokeWidth={2} />
        {CARDS.map((_, i) => {
          const at = sC(8.75) + i * CARD_GAP;
          const r = ramp(t, at + 0.85, at + 1.9, EO);
          return r > 0 && r < 1 ? <ellipse key={i} cx={480} cy={668} rx={50 + 150 * r} ry={12 + 32 * r} fill="none" stroke={K.fg} strokeOpacity={0.22 * (1 - r)} strokeWidth={2} /> : null;
        })}
        {TAPS.map((tp, i) => {
          const age = t - tp.at;
          if (age < 0 || age > 1.3) return null;
          const k = EO(clamp01(age / 1.3));
          return (
            <g key={i} opacity={1 - k}>
              <circle cx={tp.x} cy={tp.y} r={18 + 120 * k} fill="none" stroke={tp.c} strokeWidth={5} />
              <circle cx={tp.x} cy={tp.y} r={10 + 60 * k} fill="none" stroke={tp.c} strokeWidth={2} opacity={0.6} />
              {Array.from({ length: 10 }, (_, j) => {
                const a = (j / 10) * Math.PI * 2 + i;
                return <line key={j} x1={tp.x + Math.cos(a) * (24 + 50 * k)} y1={tp.y + Math.sin(a) * (24 + 50 * k)} x2={tp.x + Math.cos(a) * (40 + 104 * k)} y2={tp.y + Math.sin(a) * (40 + 104 * k)} stroke={tp.c} strokeWidth={4} strokeLinecap="round" />;
              })}
              <circle cx={tp.x} cy={tp.y} r={14 * (1 - k)} fill="#fff" />
            </g>
          );
        })}
      </svg>
      <Tag x={480} y={190} at={sC(8.6)} out={sC(13)} color={K.sub} size={42}>
        生活里
      </Tag>
      <Tag x={1440} y={190} at={sC(8.6)} out={sC(13)} color={K.sub} size={42}>
        游戏里
      </Tag>
      {CARDS.map((c, i) => {
        const at = sC(8.75) + i * CARD_GAP;
        const k = ramp(t, at + 0.15, at + 1.0, EIN);
        const appear = ramp(t, at, at + 0.2, EO);
        if (t < at || k >= 1) return null;
        return (
          <div key={c} style={{ position: "absolute", left: 480, top: lerp(310, 668, k), transform: `translate(-50%, -50%) scale(${(0.9 + 0.1 * appear) * (1 - 0.7 * k)})`, opacity: appear * (1 - 0.85 * k), background: "#1a2235", border: "2px solid #4a5675", borderRadius: 16, padding: "16px 34px", fontFamily: HAN, fontWeight: 800, fontSize: 44, color: K.fg, whiteSpace: "nowrap" }}>
            {c}
          </div>
        );
      })}
      {TAPS.map((tp, i) => {
        const age = t - tp.at;
        if (age < 0 || age > 1.0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: tp.x + 46, top: tp.y - 46 - 60 * age, opacity: 1 - age, fontFamily: tp.word.startsWith("+") ? NUM : HAN, fontWeight: 900, fontSize: 42, color: tp.c, textShadow: `0 0 18px ${tp.c}` }}>
            {tp.word}
          </div>
        );
      })}
    </div>
  );
};

// ---------- back to 1:47 ----------
const PHONE_CAM: Cam = { cx: -318, cy: -150, z: 0.92 };

const Return: React.FC<{ t: number }> = ({ t }) => {
  const o = ramp(t, sC(12.9), sC(13.4), EO) * (1 - ramp(t, sC(21.2), sC(21.6), EIO));
  if (o <= 0) return null;
  const beat = (((t - C.start - C.first) / BEAT) % 1 + 1) % 1;
  const lift = ramp(t, sC(17.4), sC(18.1), EIN);
  const bob = Math.sin(t * 2.2) * 6;
  const ui = 1 - 0.85 * ramp(t, sC(17.6), sC(18.6), EIO);
  const lines = 0.4 * win(t, sC(13.4), sC(17.6), 0.6, 0.8);
  const cam: Cam = { ...PHONE_CAM, z: PHONE_CAM.z + 0.03 * ramp(t, sC(13), sC(21), EIO) };
  const s = { o, ui, stamp: 1, beat, lit: 4, touch: { x: 30, y: -70 + bob - 260 * lift, s: 1.1, o: 0.95 * (1 - lift) } };
  const scissor = (from: number, to: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= 1920; x += 24) pts.push(`${x},${(lerp(from, to, x / 1920) + 8 * Math.sin(x / 140 + t)).toFixed(1)}`);
    return `M ${pts.join(" L ")}`;
  };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {lines > 0 ? (
          <g opacity={lines}>
            <Neon d={scissor(880, 1010)} color={K.like} width={3} />
            <Neon d={scissor(1010, 880)} color={K.want} width={3} />
          </g>
        ) : null}
        <PhoneSvg cam={cam} s={s} />
      </svg>
      <PhoneHtml cam={cam} s={s} />
      <Clock o={o * win(t, sC(13), sC(17.8), 0.4, 0.6)} cam={cam} />
    </div>
  );
};

export const LifeWorld: React.FC = () => {
  const t = useT();
  if (t < C.start) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Apps t={t} />
      <Needs t={t} />
      <Split t={t} />
      <Return t={t} />
      <LifeText />
      <Note at={sC(4.6)} out={sC(8.4)}>Przybylski 等，CyberPsychology & Behavior 2009：日常生活中这三种需要越得不到满足，越容易强迫式地玩，玩得更多，也更不享受 · 条形为示意</Note>
    </div>
  );
};

const LifeText: React.FC = () => (
  <>
    <Box x={110} y={330} gap={14}>
      <Say at={sC(0.95)} out={sC(2.6)} size={60} parts={["这台制造", want("“想要”"), "的机器，"]} />
      <Say at={sC(1.45)} out={sC(2.6)} size={60} parts={["不只在游戏里。"]} />
    </Box>
    <Box x={110} y={330} gap={22}>
      <Say at={sC(2.7)} out={sC(4.45)} size={58} parts={["下一个视频。"]} />
      <Say at={sC(3.15)} out={sC(4.45)} size={58} parts={["限时优惠。"]} />
      <Say at={sC(3.6)} out={sC(4.45)} size={58} parts={["没点开的", want("小红点"), "。"]} />
    </Box>
    <Box x={110} y={300} gap={14}>
      <Say at={sC(4.65)} out={sC(8.4)} size={44} weight={700} color={K.sub} parts={["研究发现："]} />
      <Say at={sC(4.95)} out={sC(8.4)} size={54} parts={["生活里越缺这三样的人，"]} />
      <Say at={sC(5.9)} out={sC(8.4)} size={54} parts={["越容易", want("停不下来"), "，"]} style={{ marginTop: 18 }} />
      <Say at={sC(6.6)} out={sC(8.4)} size={54} parts={["也玩得越", like("不开心"), "。"]} />
    </Box>
    <Box x={960} y={820} gap={14} align="center">
      <Say at={sC(8.7)} out={sC(10.85)} size={58} parts={["游戏没有骗你。它给的回应，是真的。"]} />
    </Box>
    <Box x={960} y={820} gap={14} align="center">
      <Say at={sC(10.95)} out={sC(12.95)} size={58} parts={["只是它给的，常常是你在", like("别处没拿到"), "的。"]} />
    </Box>
    <Box x={110} y={330} gap={18}>
      <Say at={sC(13.4)} out={sC(17.4)} size={58} parts={["下一次，拇指停在这里，"]} />
      <Say at={sC(14.5)} out={sC(17.4)} size={58} parts={["问问自己："]} />
      <Say at={sC(15.2)} out={sC(17.4)} size={62} weight={900} parts={["我是还", like("喜欢"), "，"]} style={{ marginTop: 16 }} />
      <Say at={sC(15.75)} out={sC(17.4)} size={62} weight={900} parts={["还是只是还", want("想要"), "？"]} />
    </Box>
    <Box x={110} y={360} gap={30}>
      <Say at={sC(17.8)} out={sC(21.5)} serif size={78} weight={900} parts={[want("想要"), "，可以被设计。"]} />
      <Say at={sC(19.1)} out={sC(21.5)} serif size={78} weight={900} parts={["喜欢，", { t: "只有你自己知道。", mark: true }]} />
    </Box>
  </>
);
