import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { GradingPen } from "../art/props";
import { SeatedLeft, SeatedRight } from "../art/people";
import { Cam, CL, EBACK, EIO, EO, progOf, Say, Sfx, useBeat } from "../kit";
import { K, NUM, SANS, SERIF } from "../theme";

const LINE = { stroke: K.ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// ---------- S4 · the turn (quiet: A rings out, then only the room and a clock; 32 beats on A's grid) ----------
// A pile of answers and one grading pen; the UK consultation: 5 万多份 sorted by AI in 2 hours, then experts
// spend 22 hours checking. The clock carries the rhythm the music has dropped.

// An envelope, for the public responses.
const Envelope: React.FC<{ w?: number }> = ({ w = 64 }) => (
  <svg width={w} height={w * 0.66} viewBox="0 0 64 42" style={{ display: "block", overflow: "visible" }}>
    <rect x={1.5} y={1.5} width={61} height={39} rx={3} fill={K.paperHi} stroke={K.ink} strokeWidth={2.5} />
    <path d="M2 3 L32 24 L62 3" fill="none" stroke={K.ink} strokeWidth={2.5} strokeLinejoin="round" />
  </svg>
);

// The pile, as a mound of envelopes: drawn back to front from a fixed seed.
const PILE = 150;
const pile = Array.from({ length: PILE }, (_, i) => {
  const row = Math.floor(Math.sqrt(i * 2));
  const width = 560 - row * 26;
  return { x: (random(`px${i}`) - 0.5) * width, y: -row * 18 - random(`py${i}`) * 10, r: (random(`pr${i}`) - 0.5) * 40 };
}).sort((a, b) => b.y - a.y);

// A small answer sheet, for the pile the question is about.
const Sheetlet: React.FC = () => (
  <svg width={64} height={42} viewBox="0 0 64 42" style={{ display: "block", overflow: "visible" }}>
    <rect x={1.5} y={1.5} width={61} height={39} rx={2} fill={K.paperHi} stroke={K.ink} strokeWidth={2} />
    <path d="M8 12 H48 M8 20 H54 M8 28 H40" stroke={K.ai} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
  </svg>
);

// The mound: answer sheets while the question is asked, the same mound as envelopes once it is the UK case
// (env 0 → 1). Envelopes leave from the top as they are sorted.
const Pile: React.FC<{ env: number; flown: number }> = ({ env, flown }) => (
  <div style={{ position: "absolute", left: 470, top: 930 }}>
    {pile.map((e, i) =>
      i >= PILE - flown ? null : (
        <div key={i} style={{ position: "absolute", left: e.x - 32, top: e.y - 21, transform: `rotate(${e.r}deg)` }}>
          {env < 1 ? <div style={{ position: "absolute", opacity: 1 - env }}><Sheetlet /></div> : null}
          {env > 0 ? <div style={{ position: "absolute", opacity: env }}><Envelope /></div> : null}
        </div>
      ),
    )}
  </div>
);

// Six trays the AI sorts into.
const TRAYS = 6;
const trayX = (k: number) => 960 + k * 150;
const Trays: React.FC<{ fill: number[] }> = ({ fill }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {Array.from({ length: TRAYS }, (_, k) => (
      <g key={k}>
        {Array.from({ length: Math.round(fill[k]) }, (_, j) => (
          <rect key={j} x={trayX(k) + 12} y={926 - j * 7} width={106} height={6} rx={1} fill={K.paperHi} stroke={K.ink} strokeWidth={1.5} />
        ))}
        <path d={`M${trayX(k)} 900 L${trayX(k) + 8} 950 L${trayX(k) + 122} 950 L${trayX(k) + 130} 900`} fill="rgba(107,87,224,0.10)" stroke={K.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
    ))}
  </svg>
);

// The wall clock: hour hand turns `hours`.
const Clock: React.FC<{ hours: number; size?: number; blur?: number }> = ({ hours, size = 250, blur = 0 }) => {
  const h = (10 + hours) * 30;
  const m = hours * 360;
  return (
    <svg width={size} height={size} viewBox="-130 -130 260 260" style={{ display: "block", overflow: "visible" }}>
      <circle r={118} fill={K.paperHi} stroke={K.ink} strokeWidth={6} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={0} y1={-100} x2={0} y2={i % 3 === 0 ? -80 : -88} stroke={K.ink} strokeWidth={i % 3 === 0 ? 6 : 3} transform={`rotate(${i * 30})`} strokeLinecap="round" />
      ))}
      <line x1={0} y1={12} x2={0} y2={-88} stroke={K.ink} strokeWidth={5} strokeLinecap="round" transform={`rotate(${m})`} opacity={1 - blur * 0.6} />
      {blur > 0 ? <circle r={80} fill="none" stroke={K.ink} strokeWidth={4} opacity={blur * 0.18} /> : null}
      <line x1={0} y1={10} x2={0} y2={-58} stroke={K.ink} strokeWidth={9} strokeLinecap="round" transform={`rotate(${h})`} />
      <circle r={9} fill={K.signal} stroke={K.ink} strokeWidth={3} />
    </svg>
  );
};

// A sheet being checked: moves from the 待复核 stack to the 已复核 stack.
const ExpertTable: React.FC<{ b: number; p: number }> = ({ b, p }) => {
  const done = Math.floor(p * 18);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 1920, top: 0, overflow: "visible" }}>
        <ellipse cx={960} cy={1018} rx={600} ry={40} fill="rgba(90,60,25,0.12)" />
        <rect x={560} y={800} width={800} height={24} rx={4} fill="#c49566" {...LINE} />
        <path d="M590 824 L590 1040 M1330 824 L1330 1040" stroke={K.ink} strokeWidth={10} strokeLinecap="round" />
        {/* 待复核: still tall; 已复核: grows slowly */}
        {Array.from({ length: 30 - done }, (_, j) => (
          <rect key={`t${j}`} x={700} y={786 - j * 9} width={170} height={8} rx={1} fill={K.paperHi} stroke={K.ink} strokeWidth={1.5} />
        ))}
        {Array.from({ length: done }, (_, j) => (
          <rect key={`d${j}`} x={1060} y={786 - j * 9} width={170} height={8} rx={1} fill={K.paperHi} stroke={K.ink} strokeWidth={1.5} />
        ))}
        <rect x={880} y={772} width={170} height={20} rx={2} fill={K.paperHi} stroke={K.ink} strokeWidth={2} transform={`rotate(${Math.sin(b * Math.PI) * 2} 965 782)`} />
      </svg>
      <div style={{ position: "absolute", left: 1920 + 700, top: 520, whiteSpace: "nowrap", fontFamily: SANS, fontWeight: 700, fontSize: 24, color: K.ink, opacity: 0.75 }}>待复核</div>
      <div style={{ position: "absolute", left: 1920 + 1070, top: 520, whiteSpace: "nowrap", fontFamily: SANS, fontWeight: 700, fontSize: 24, color: K.green, opacity: 0.85 }}>已复核</div>
      <SeatedRight style={{ position: "absolute", left: 1920 + 330, top: 560 }} tilt={22 + Math.sin(b * 0.9) * 4} arm={0} type={Math.sin(b * Math.PI * 2) * 0.5} coat="#7d6a8f" shirt="#e7dcc3" glasses />
      <SeatedLeft style={{ position: "absolute", left: 1920 + 1270, top: 560 }} tilt={20 + Math.sin(b * 0.7 + 1) * 4} arm={0} type={Math.sin(b * Math.PI * 2 + 1) * 0.5} coat="#6d8a7a" shirt="#e8d9b6" hair="#5a3b2b" />
    </>
  );
};

export const Turn: React.FC = () => {
  const b = useBeat();
  const pen = progOf(b, 2, 0.8, EBACK);
  const tag = progOf(b, 8, 0.6, EBACK);
  const sort = interpolate(b, [9.5, 16], [0, 1], { ...CL, easing: EIO });
  const flown = Math.floor(sort * 90);
  const fill = Array.from({ length: TRAYS }, (_, k) => Math.min(14, sort * (12 + random(`tf${k}`) * 4)));
  const aiHours = interpolate(b, [9.5, 16], [0, 2], CL);
  const check = interpolate(b, [19, 25], [0, 1], { ...CL, easing: EIO });
  const hours = aiHours + check * 22;
  const spin = interpolate(b, [19, 19.6, 24.4, 25], [0, 1, 1, 0], CL);
  const card = progOf(b, 25.6, 0.7, EO);
  const bar2 = interpolate(b, [26.4, 29], [0, 1], { ...CL, easing: EIO });
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 760, y: 640, s: 1.3 },
          { b: 7.2, x: 740, y: 650, s: 1.24 },
          { b: 8.4, x: 1000, y: 560, s: 1 },
          { b: 17.4, x: 1010, y: 556, s: 1 },
          { b: 19, x: 2880, y: 540, s: 1 },
          { b: 25.2, x: 2890, y: 548, s: 1 },
          { b: 26.4, x: 2880, y: 600, s: 0.92 },
          { b: 32, x: 2880, y: 604, s: 0.9 },
        ]}
      >
        <div style={{ position: "absolute", left: 120, top: 960, width: 1700, height: 60, borderRadius: "50%", background: "rgba(90,60,25,0.10)" }} />
        <Pile env={progOf(b, 7.6, 0.8, EIO)} flown={flown} />
        {/* the lone grading pen beside the pile */}
        <div style={{ position: "absolute", left: 790, top: 820, transform: `rotate(${-30 + 10 * pen}deg) scale(${0.6 + 0.4 * pen})`, opacity: Math.min(1, pen * 2) * (1 - progOf(b, 8, 0.6)) }}>
          <GradingPen />
        </div>
        {/* the AI sorter: a violet funnel between the pile and the trays */}
        {tag > 0 ? (
          <>
            <div style={{ position: "absolute", left: 230, top: 470, opacity: tag, transform: `translateY(${(1 - tag) * 20}px)`, background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 8, padding: "10px 18px", boxShadow: "0 10px 22px rgba(70,45,15,0.16)" }}>
              <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 32, color: K.ink }}>英国政府 · 公众意见</div>
              <div style={{ fontFamily: NUM, fontWeight: 300, fontSize: 56, color: K.ink }}>
                5 万多<span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28 }}> 份</span>
              </div>
            </div>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: tag }}>
              <path d="M1080 640 L1460 640 L1330 780 L1210 780 Z" fill="#efeafd" stroke={K.ai} strokeWidth={4} strokeLinejoin="round" />
            </svg>
            <div style={{ position: "absolute", left: 1150, top: 690, width: 240, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 30, color: K.ai, opacity: tag }}>AI 分类</div>
            <Trays fill={fill} />
          </>
        ) : null}
        {/* envelopes in flight: pile → funnel → trays */}
        {sort > 0 && sort < 1
          ? Array.from({ length: 10 }, (_, i) => {
              const ph = (sort * 18 + i / 10) % 1;
              const k = Math.floor(random(`fk${i}-${Math.floor(sort * 18 + i / 10)}`) * TRAYS);
              const x0 = 470;
              const y0 = 800;
              const x = ph < 0.5 ? x0 + (1270 - x0) * (ph * 2) : 1270 + (trayX(k) + 65 - 1270) * ((ph - 0.5) * 2);
              const y = ph < 0.5 ? y0 - Math.sin(ph * 2 * Math.PI) * 240 + (640 - y0) * ph * 2 : 780 + (900 - 780) * ((ph - 0.5) * 2);
              return (
                <div key={i} style={{ position: "absolute", left: x - 24, top: y - 16, transform: `rotate(${ph * 360}deg)` }}>
                  <Envelope w={48} />
                </div>
              );
            })
          : null}
        <ExpertTable b={b} p={check} />
      </Cam>

      {/* the clock, on the wall of whichever room we are in */}
      <div style={{ position: "absolute", left: 1560, top: 120, opacity: progOf(b, 7.6, 0.8) }}>
        <Clock hours={hours} size={260} blur={spin} />
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: b < 18 ? K.ai : K.ink }}>
          {b < 18 ? `AI：${aiHours >= 2 ? "2" : aiHours.toFixed(1)} 小时` : `复核：+${Math.round(check * 22)} 小时`}
        </div>
      </div>

      {/* the comparison card */}
      {card > 0 ? (
        <div style={{ position: "absolute", left: 420, top: 470, width: 1180, opacity: card, transform: `translateY(${(1 - card) * 40}px)`, background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 10, padding: "28px 36px", boxShadow: "0 20px 40px rgba(70,45,15,0.22)" }}>
          {[
            ["AI 分类", 2, K.ai, 1],
            ["专家复核", 22, K.ink, bar2],
          ].map(([label, h, c, p]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 18, margin: "12px 0" }}>
              <span style={{ width: 150, fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: c as string }}>{label as string}</span>
              <div style={{ width: ((h as number) / 22) * 760 * (p as number), height: 44, background: c as string, borderRadius: 6 }} />
              <span style={{ fontFamily: NUM, fontWeight: 700, fontSize: 40, color: c as string, opacity: (p as number) > 0.05 ? 1 : 0 }}>{Math.round((h as number) * (p as number))} 小时</span>
            </div>
          ))}
        </div>
      ) : null}

      <Say at={1.5} out={7.2} y={140} lines={[["可是，答卷多了，", { t: "谁来改", k: true }, "？"]]} />
      <Say at={8} out={17.8} y={140} lines={[["英国政府收到 5 万多份意见，"], ["AI ", { t: "2 小时", k: true }, "就分好了类。"]]} src="GOV.UK 2025-10-16 · 独立水务委员会的公众意见 · AI 工具 Consult，花费 £240" />
      <Say at={18.6} out={25.2} y={140} lines={[["专家复核，"], ["又花了 ", { t: "22 小时", k: true }, "。"]]} src="同上 · AI 的分类和专家约 83% 一致" />
      <Say at={26} out={31.6} y={140} lines={[[{ t: "阅卷", k: true }, "，比答题还久。"]]} />

      {/* sound: the clock is the only rhythm; envelopes; the hours spinning */}
      {Array.from({ length: 30 }, (_, i) => i + 1)
        .filter((t) => t < 19 || t > 25)
        .map((t) => (
          <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.2} rate={0.8} />
        ))}
      {Array.from({ length: 22 }, (_, i) => 19 + i * 0.27).map((t, i) => (
        <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.14 + 0.004 * i} rate={0.9 + i * 0.02} />
      ))}
      <Sfx at={2} id="sfx-impact-01" vol={0.3} />
      {[10, 11.5, 13, 14.5].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-16" vol={0.2} rate={1.2} />
      ))}
      <Sfx at={26.4} id="sfx-impact-06" vol={0.4} rate={0.9} />
    </AbsoluteFill>
  );
};
