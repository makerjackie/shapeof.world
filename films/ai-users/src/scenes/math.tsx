import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { InkStamp, Print, Scribble, Section, Seal, Sheet, Tick } from "../art/paper";
import { Cam, CL, EBACK, EIO, EO, fmt, progOf, Say, Sfx, useBeat } from "../kit";
import { K, NUM, SANS, SERIF } from "../theme";
import { Answer } from "./panorama";

const LINE = { stroke: K.ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// ---------- S5 · the maths problem (B part 1, bars 0–19, then one bar of silence; 84 beats on B's grid) ----------
// One sheet told properly: an 80-year-old conjecture, the AI's counterexample, nine mathematicians checking it.
// Then 372 more arrive at once, nobody has graded them, and the gatekeeper stops taking papers.

// Points with unit-length links: the picture of the problem.
const Dots: React.FC<{ seed: string; n: number; color: string; w: number; h: number; links: number; p?: number }> = ({ seed, n, color, w, h, links, p = 1 }) => {
  const pts = Array.from({ length: n }, (_, i) => [12 + random(`${seed}x${i}`) * (w - 24), 12 + random(`${seed}y${i}`) * (h - 24)]);
  const ls = Array.from({ length: links }, (_, i) => [Math.floor(random(`${seed}a${i}`) * n), Math.floor(random(`${seed}b${i}`) * n)]).filter(([a, b]) => a !== b);
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {ls.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={color} strokeWidth={2.5} opacity={i / ls.length < p ? 0.7 : 0} />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={6} fill={K.paperHi} stroke={color} strokeWidth={3} opacity={i / n < p ? 1 : 0} />
      ))}
    </svg>
  );
};

const MX = 1010;
const MY = 60;

const MathSheet: React.FC<{ b: number }> = ({ b }) => {
  const written = interpolate(b, [11, 15], [0, 3], CL);
  const counter = progOf(b, 12.5, 2.5, EIO);
  return (
    <Sheet x={0} y={0} w={760} h={960}>
      <div style={{ position: "absolute", left: 72, right: 34, top: 30, display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `3px double ${K.ink}`, paddingBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 44 }}>数学 · 1946</span>
        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 20, color: K.inkSoft }}>出题：Erdős（匈牙利数学家）</span>
      </div>
      <Section n="一" title="出题" who="人" style={{ position: "absolute", left: 72, top: 128 }} />
      <Print size={30} w={700} style={{ position: "absolute", left: 94, top: 184 }}>单位距离猜想</Print>
      <Print size={22} style={{ position: "absolute", left: 94, top: 232, color: K.inkSoft, width: 300 }}>平面上的点，最多能连出多少条长度正好为 1 的线？</Print>
      <div style={{ position: "absolute", left: 440, top: 170 }}>
        <Dots seed="q" n={9} color={K.ink} w={250} h={190} links={12} />
      </div>
      <Section n="二" title="答题" who="AI" style={{ position: "absolute", left: 72, top: 392 }} />
      <div style={{ position: "absolute", left: 84, top: 448 }}>
        <Scribble w={360} lines={3} lineH={38} progress={written} seed="erdos" width={2.8} />
      </div>
      {counter > 0 ? (
        <div style={{ position: "absolute", left: 470, top: 438, border: `3px solid ${K.ai}`, borderRadius: 8, background: "#f2eefe", padding: 8 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 24, color: K.ai, marginBottom: 2 }}>反例</div>
          <Dots seed="c" n={14} color={K.ai} w={200} h={130} links={24} p={counter} />
        </div>
      ) : null}
      <InkStamp at={16} color={K.red} size={44} rot={-9} style={{ position: "absolute", left: 150, top: 590 }}>
        猜想不成立
      </InkStamp>
      <Section n="三" title="阅卷" who="人" style={{ position: "absolute", left: 72, top: 700 }} />
      <div style={{ position: "absolute", left: 92, top: 770, display: "flex", flexWrap: "wrap", width: 420, gap: 12 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <Seal key={i} at={20 + i * 0.5} name="阅" size={64} rot={(random(`sr${i}`) - 0.5) * 24} style={{ fontSize: 30 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 530, top: 760, width: 180, height: 150, border: `2px solid ${K.ink}` }}>
        <Tick at={24.6} size={130} style={{ position: "absolute", left: 24, top: 6 }} />
      </div>
    </Sheet>
  );
};

// The 372: answer sheets pouring in over everything, every grading box empty.
const POUR = 64;
const pour = Array.from({ length: POUR }, (_, i) => ({
  at: 29.6 + (i / POUR) * 7 + random(`ma${i}`) * 0.3,
  x: 960 + (random(`mx${i}`) - 0.45) * 2300,
  y: 560 + (random(`my${i}`) - 0.5) * 1300,
  r: (random(`mr${i}`) - 0.5) * 34,
  from: random(`mf${i}`) * Math.PI - Math.PI * 0.1,
}));
// The last to land, front and centre: the one the camera looks into.
const HERO = { x: 1240, y: 600, r: -3 };

// The submission tray of the problem site.
const Inbox: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "absolute", left: 160, top: 650, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 40}px)` }}>
    <svg width={520} height={300} style={{ overflow: "visible" }}>
      <path d="M20 90 L60 280 L460 280 L500 90 Z" fill="#c49566" {...LINE} />
      <rect x={10} y={70} width={500} height={30} rx={6} fill="#a97a4e" {...LINE} />
      <rect x={120} y={150} width={280} height={70} rx={6} fill={K.paperHi} {...LINE} />
    </svg>
    <div style={{ position: "absolute", left: 120, top: 160, width: 280, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: K.ink }}>题库 · 收卷</div>
    <InkStamp at={44} color={K.red} size={64} rot={-10} style={{ position: "absolute", left: 120, top: 40 }}>
      暂停
    </InkStamp>
  </div>
);

// Courts: filings with invented citations, flagged in red.
const Court: React.FC<{ b: number; p: number }> = ({ b, p }) => {
  const n = interpolate(b, [64, 70], [0, 2202], { ...CL, easing: EIO });
  return (
    <div style={{ position: "absolute", left: 1060, top: 470, width: 720, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 120}px) rotate(1.5deg)`, background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 10, padding: "24px 30px", boxShadow: "0 22px 44px rgba(70,45,15,0.26)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width={64} height={64} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
          <rect x={8} y={14} width={34} height={16} rx={4} transform="rotate(-35 25 22)" fill="#8a5a36" {...LINE} />
          <path d="M30 32 L52 56" stroke={K.ink} strokeWidth={6} strokeLinecap="round" />
          <rect x={4} y={54} width={36} height={8} rx={2} fill="#8a5a36" {...LINE} />
        </svg>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 38, color: K.ink }}>法庭查出：AI 编造</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 16 }}>
        <div style={{ position: "relative", width: 230, height: 150 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: i * 8, bottom: i * 12, width: 150, height: 96, background: K.paper, border: `2px solid ${K.ink}`, borderRadius: 3, transform: `rotate(${(random(`cd${i}`) - 0.5) * 8}deg)` }}>
              <div style={{ position: "absolute", left: 12, top: 14, width: 90, height: 5, background: K.inkFaint }} />
              <div style={{ position: "absolute", left: 12, top: 30, width: 110, height: 5, background: K.inkFaint }} />
              <div style={{ position: "absolute", right: 10, bottom: 10, padding: "0 6px", border: `2px solid ${K.red}`, color: K.red, fontFamily: SANS, fontWeight: 900, fontSize: 14 }}>编造</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: NUM, fontWeight: 300, fontSize: 96, color: K.red, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {fmt(n)}
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34 }}> 起</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 22, color: K.ink, opacity: 0.7, marginTop: 8 }}>其中 872 起出自律师</div>
        </div>
      </div>
    </div>
  );
};

export const MathS: React.FC = () => {
  const b = useBeat();
  const counter = progOf(b, 30, 6.5, EIO);
  const counterOut = progOf(b, 39.2, 0.6, EIO);
  const inbox = progOf(b, 40.2, 0.8, EBACK) * (1 - progOf(b, 50, 0.6, EIO));
  const court = progOf(b, 62.4, 0.8, EO) * (1 - progOf(b, 76, 0.8, EIO));
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 960, y: 540, s: 1 },
          { b: 28, x: 972, y: 548, s: 1 },
          { b: 32, x: 960, y: 580, s: 0.82 },
          { b: 50, x: 960, y: 586, s: 0.82 },
          { b: 52.4, x: 1205, y: 560, s: 1.65 },
          { b: 61, x: 1215, y: 566, s: 1.68 },
          { b: 63.4, x: 960, y: 590, s: 0.8 },
          { b: 84, x: 960, y: 600, s: 0.72 },
        ]}
      >
        <div style={{ position: "absolute", left: MX, top: MY, transform: "rotate(1deg)" }}>
          <MathSheet b={b} />
        </div>
        {pour.map((s, i) => {
          const p = progOf(b, s.at, 0.7, EO);
          if (p <= 0) return null;
          const d = 2200 * (1 - p);
          return (
            <div key={i} style={{ position: "absolute", left: s.x - 195 + Math.cos(s.from) * d, top: s.y - 130 - Math.sin(s.from) * d, transform: `rotate(${s.r * (1 - 0.4 * p)}deg) scale(1.3)` }}>
              <Answer i={i + 100} />
            </div>
          );
        })}
        {(() => {
          const p = progOf(b, 37, 0.8, EO);
          if (p <= 0) return null;
          return (
            <div style={{ position: "absolute", left: HERO.x - 195, top: HERO.y - 130 - 900 * (1 - p), transform: `rotate(${HERO.r}deg) scale(1.3)` }}>
              <Answer i={999} />
            </div>
          );
        })()}
      </Cam>

      {counter > 0 && counterOut < 1 ? (
        <div style={{ position: "absolute", left: 96, top: 820, opacity: Math.min(1, counter * 4) * (1 - counterOut), background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 10, padding: "14px 26px", boxShadow: "0 16px 30px rgba(70,45,15,0.2)", display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: NUM, fontWeight: 300, fontSize: 84, color: K.ai, fontVariantNumeric: "tabular-nums" }}>{Math.round(counter * 372)}</span>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: K.ink }}>份证明</span>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 26, color: K.ink, opacity: 0.7 }}>共 {fmt(Math.round(counter * 1347))} 页</span>
        </div>
      ) : null}
      {inbox > 0.01 ? (
        <div style={{ opacity: Math.min(1, inbox * 1.5) }}>
          <Inbox p={inbox} />
        </div>
      ) : null}
      {court > 0.01 ? <Court b={b} p={court} /> : null}

      <Say at={1.5} out={9} y={140} lines={[["一个数学猜想，"], ["悬了 ", { t: "80 年", k: true }, "。"]]} />
      <Say at={10.5} out={16.8} y={140} lines={[["今年 5 月，", { t: "AI 推翻了它", k: true }, "。"]]} src="Erdős（匈牙利数学家）1946 年提出的单位距离猜想 · 反例由 OpenAI（ChatGPT 的公司）的模型给出 · 2026-05" />
      <Say at={18.5} out={26.5} y={140} lines={[[{ t: "9 位数学家", k: true }, "逐行检查："], ["它是对的。"]]} src="arXiv 2605.20695 · 2026-05-20 · 9 位作者核验" />
      <Say at={28.5} out={38.5} y={140} lines={[["到了 10 月，AI 一口气"], ["交来 ", { t: "372 份证明", k: true }, "。"]]} src="OpenAI 2026-10-06 一次放出 · 涉及 25 道 Erdős 题 · PDF 共 1,347 页 · erdosproblems.com" />
      <Say at={40} out={49.5} y={140} lines={[["守题库的数学家，当天就宣布："], [{ t: "暂停收卷", k: true }, "。"]]} src="Thomas Bloom，Erdős 题库维护者 · 2026-10-06 · 理由：一波没有解释的 AI 解答" />
      <Say at={51} out={61} y={140} lines={[["两天后他说："], ["“我还", { t: "没认真看过", k: true }, "任何一份。”"]]} src="Thomas Bloom · 2026-10-08 · 原话：I have not yet looked at in any serious way any of the proofs in this release." />
      <Say at={62.5} out={76} y={140} lines={[["没人阅卷的答案，已经在出事："], ["法庭查出 ", { t: "2,202 起", k: true }, " AI 编造。"]]} src="Damien Charlotin 的法庭 AI 幻觉数据库 · 截至 2026-10-19" />

      {/* sound: the clock carried over from the turn, the counterexample, the stamp on the big entry, nine seals,
          the pour, the freeze, the push into an empty box, the courts */}
      {[0, 1, 2].map((t) => (
        <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.18 - t * 0.05} rate={0.8} />
      ))}
      {[11, 11.8, 12.6, 13.4, 14.2].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.3} />
      ))}
      <Sfx at={16} id="sfx-impact-01" vol={0.55} />
      {Array.from({ length: 9 }, (_, i) => (
        <Sfx key={i} at={20 + i * 0.5} id="sfx-impact-01" vol={0.22} rate={1.5 + i * 0.03} />
      ))}
      <Sfx at={24.6} id="sfx-foley-07" vol={0.4} />
      {[29.6, 30.6, 31.6, 32.6, 33.6, 34.6, 35.6].map((t, i) => (
        <Sfx key={t} at={t} id="sfx-foley-16" vol={0.22 + i * 0.02} />
      ))}
      <Sfx at={29.6} id="sfx-foley-01" vol={0.35} />
      <Sfx at={33.6} id="sfx-foley-01" vol={0.4} rate={1.1} />
      <Sfx at={36.6} id="sfx-impact-06" vol={0.45} />
      <Sfx at={44} id="sfx-impact-01" vol={0.6} rate={0.8} />
      <Sfx at={50.4} id="sfx-transition-02" vol={0.3} />
      {[64, 65, 66, 67, 68, 69].map((t, i) => (
        <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.24} rate={1 + i * 0.05} />
      ))}
      <Sfx at={70} id="sfx-impact-06" vol={0.45} />
    </AbsoluteFill>
  );
};

