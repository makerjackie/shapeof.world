import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { SeatedRight } from "../art/people";
import { Triad } from "../art/triad";
import { Cam, CL, EBACK, EIO, EO, fmt, progOf, Say, Sfx, useBeat } from "../kit";
import { K, MONO, NUM, SANS, SERIF } from "../theme";

const LINE = { stroke: K.ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// His corner: a desk and a laptop on the left, drawn like the consulting room (desk top at y = 800) and scaled
// up around the floor so he is as big as the doctor was.
const Desk: React.FC<{ b: number; look: number }> = ({ b, look }) => (
  <div style={{ position: "absolute", inset: 0, transform: "scale(1.15)", transformOrigin: "300px 1040px" }}>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <ellipse cx={420} cy={1018} rx={360} ry={34} fill="rgba(90,60,25,0.12)" />
      <rect x={330} y={800} width={440} height={24} rx={4} fill="#c49566" {...LINE} />
      <path d="M360 824 L360 1040 M740 824 L740 1040" stroke={K.ink} strokeWidth={10} strokeLinecap="round" />
      <rect x={350} y={786} width={200} height={14} rx={3} fill="#c8ced3" {...LINE} />
      <path d="M550 788 L578 612 L592 614 L566 790 Z" fill="#aab3ba" {...LINE} />
      <circle cx={576} cy={700} r={6} fill={K.aiHi} />
      {/* a mug and a stack of sticky notes */}
      <path d="M660 768 h40 l-4 32 h-32 z" fill="#f4efe6" {...LINE} />
      <path d="M700 776 a10 10 0 0 1 0 18" fill="none" {...LINE} />
      <rect x={612} y={790} width={34} height={10} fill={K.gold} {...LINE} />
    </svg>
    <SeatedRight style={{ position: "absolute", left: 100, top: 560 }} tilt={12 - 22 * look} arm={b > 33 && b < 41 ? 1 : 0} type={b < 9 || b > 41 ? Math.sin(b * Math.PI * 4) : 0} shirt="#e8d9b6" coat="#4f6f8f" hair="#3a2c25" />
  </div>
);

// The agent wall: 100 small windows, lighting up 1, 2, 4 … then all 100, each with lines scrolling.
const GX = 1040;
const GY = 440;
const CW = 72;
const CH = 46;
const GAP = 8;
const TASKS = ["写代码", "找错", "修补"];

const Agents: React.FC<{ b: number; lit: number; tasks: number }> = ({ b, lit, tasks }) => (
  <div style={{ position: "absolute", left: GX, top: GY, width: 10 * (CW + GAP), display: "flex", flexWrap: "wrap", gap: GAP }}>
    {Array.from({ length: 100 }, (_, i) => {
      const on = i < lit;
      const r = random(`ag${i}`);
      const pop = on ? progOf(b, 2 + Math.floor(Math.log2(i + 1)), 0.4, EBACK) : 0;
      const done = tasks > 0 && Math.floor(b * 2 + r * 9) % 9 === 0;
      return (
        <div key={i} style={{ width: CW, height: CH, borderRadius: 6, background: on ? "#f2eefe" : "rgba(25,35,31,0.05)", border: `2px solid ${on ? K.ai : "rgba(25,35,31,0.14)"}`, position: "relative", overflow: "hidden", transform: `scale(${on ? 0.6 + 0.4 * pop : 1})` }}>
          {on ? (
            <>
              <div style={{ height: 8, background: K.ai, opacity: 0.85 }} />
              {[0, 1, 2].map((l) => (
                <div key={l} style={{ position: "absolute", left: 6, top: 12 + ((l * 10 + b * (5 + r * 6)) % 30), width: 18 + random(`aw${i}${l}`) * 38, height: 3, background: K.ai, opacity: 0.5, borderRadius: 2 }} />
              ))}
              <div style={{ position: "absolute", right: 4, bottom: 4, width: 8, height: 8, borderRadius: "50%", background: done ? K.green : K.aiHi }} />
            </>
          ) : null}
        </div>
      );
    })}
    {tasks > 0
      ? TASKS.map((t, k) => (
          <span
            key={t}
            style={{
              position: "absolute",
              left: [40, 330, 560][k],
              top: -64,
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 30,
              color: K.ai,
              background: "#efeafd",
              border: `2px solid ${K.ai}`,
              borderRadius: 999,
              padding: "3px 20px",
              opacity: progOf(tasks, k * 0.25, 0.3),
              transform: `translateY(${(1 - progOf(tasks, k * 0.25, 0.3, EBACK)) * 16}px)`,
            }}
          >
            {t}
          </span>
        ))
      : null}
  </div>
);

// 46,232 copies of 《红楼梦》 a day, as thread-bound volumes lying in stacks: one volume = 100 copies.
const VOLS = 463;
const STACKS = 16;
const VW = 46;
const VH = 13.6;
const heights = (() => {
  const h = Array.from({ length: STACKS }, (_, i) => 22 + Math.floor(random(`h${i}`) * 13));
  let over = h.reduce((a, v) => a + v, 0) - VOLS;
  for (let i = 0; over !== 0; i = (i + 1) % STACKS) {
    h[i] += over > 0 ? -1 : 1;
    over += over > 0 ? -1 : 1;
  }
  return h;
})();
// Fill order: layer by layer across the stacks, so the whole pile rises.
const slots = (() => {
  const out: [number, number][] = [];
  for (let layer = 0; out.length < VOLS; layer++) for (let s = 0; s < STACKS; s++) if (layer < heights[s]) out.push([s, layer]);
  return out;
})();

const Volume: React.FC = () => (
  <svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block", overflow: "visible" }}>
    <rect x={0.75} y={0.75} width={VW - 1.5} height={VH - 1.5} rx={1.5} fill="#33507d" stroke={K.ink} strokeWidth={1.5} />
    <rect x={VW - 9} y={2.5} width={6} height={VH - 5} fill={K.paper} />
    <rect x={8} y={3.5} width={12} height={VH - 7} fill={K.paperHi} opacity={0.9} />
  </svg>
);

const Books: React.FC<{ p: number }> = ({ p }) => {
  const n = p * VOLS;
  return (
    <>
      {slots.map(([s, layer], k) => {
        if (k >= n) return null;
        const drop = Math.min(1, n - k);
        return (
          <div key={k} style={{ position: "absolute", left: 1040 + s * 52 + (random(`x${k}`) - 0.5) * 4, top: 990 - (layer + 1) * VH - (1 - drop) * 40, opacity: drop, transform: `rotate(${(random(`r${k}`) - 0.5) * 3}deg)` }}>
            <Volume />
          </div>
        );
      })}
    </>
  );
};

// One copy up close before the pile: what is being counted.
const OneBook: React.FC<{ p: number; out: number }> = ({ p, out }) => (
  <div style={{ position: "absolute", left: 1270, top: 520 - (1 - p) * 120, opacity: Math.min(1, p * 3) * (1 - out), transform: `rotate(${-4 + 4 * p}deg) scale(${1 - 0.5 * out})`, transformOrigin: "50% 100%" }}>
    <div style={{ width: 230, height: 300, background: "linear-gradient(160deg, #3d5d8c, #2b4570)", border: `3px solid ${K.ink}`, borderRadius: 6, position: "relative", boxShadow: "0 18px 30px rgba(60,40,15,0.25)" }}>
      <div style={{ position: "absolute", left: 30, top: 30, width: 54, height: 210, background: K.paperHi, border: `2px solid ${K.ink}`, display: "flex", alignItems: "center", justifyContent: "center", writingMode: "vertical-rl", fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: K.ink }}>红楼梦</div>
      {[60, 130, 200, 260].map((y) => (
        <div key={y} style={{ position: "absolute", left: -3, top: y, width: 12, height: 3, background: K.paperHi }} />
      ))}
    </div>
    <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: K.ink, textAlign: "center" }}>一部 · 72.5 万字</div>
  </div>
);

// The bill, printing out of a slot.
const Bill: React.FC<{ p: number }> = ({ p }) => (
  <>
    <div style={{ position: "absolute", left: 1290, top: 292, width: 440, height: 16, background: K.ink, borderRadius: 8 }} />
    <div style={{ position: "absolute", left: 1300, top: 300, width: 420, height: 336 * p, overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 0, width: 420, height: 336, background: K.paperHi, border: `3px solid ${K.ink}`, borderTop: "none", padding: "22px 28px 26px", boxSizing: "border-box", fontFamily: SANS, color: K.ink }}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 30 }}>AI 账单 · 30 天</div>
        <div style={{ borderTop: `2px dashed ${K.inkFaint}`, margin: "12px 0" }} />
        {[
          ["读写", "6,030 亿 token"],
          ["每天", "≈ 4.6 万部《红楼梦》"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 22, margin: "6px 0" }}>
            <span style={{ opacity: 0.7 }}>{k}</span>
            <span style={{ fontFamily: k === "读写" ? MONO : SANS }}>{v}</span>
          </div>
        ))}
        <div style={{ borderTop: `2px dashed ${K.inkFaint}`, margin: "12px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>合计</span>
          <span style={{ fontFamily: NUM, fontWeight: 300, fontSize: 56, color: K.signal }}>约 877 万元</span>
        </div>
        <div style={{ fontSize: 15, opacity: 0.6, marginTop: 6 }}>$1,305,088.81 · 按 2026-10-16 中间价 6.7220 换算</div>
      </div>
    </div>
  </>
);

// His own sheet: what counts as done.
const Checklist: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "absolute", left: 470, top: 420, width: 360, background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 8, padding: "16px 22px 18px", transform: `rotate(-3deg) translateY(${(1 - progOf(p, 0, 0.15, EO)) * 30}px)`, boxShadow: "0 12px 26px rgba(70,45,15,0.18)", opacity: progOf(p, 0, 0.12) }}>
    <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 28, color: K.ink }}>合格标准</div>
    {["测试全部通过", "只改该改的文件", "安全检查无问题"].map((t, i) => {
      const q = interpolate(p, [0.15 + i * 0.22, 0.35 + i * 0.22], [0, 1], CL);
      return (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: K.ink, opacity: Math.min(1, q * 2) }}>
          <span style={{ width: 22, height: 22, border: `2.5px solid ${K.ink}`, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", color: K.green, fontSize: 20, fontWeight: 900 }}>{q > 0.95 ? "✓" : ""}</span>
          {t}
        </div>
      );
    })}
  </div>
);

// ---------- S2 · the programmer (A film bars 17–29, 48 beats) ----------

export const Coder: React.FC = () => {
  const b = useBeat();
  const lit = b < 2 ? 0 : b >= 8 ? 100 : Math.pow(2, Math.floor(b - 2));
  const tasks = interpolate(b, [10.5, 12.5], [0, 1], CL);
  const toBooks = progOf(b, 17.2, 0.8, EIO);
  const one = progOf(b, 18, 1, EO);
  const oneOut = progOf(b, 21, 0.8, EIO);
  const books = interpolate(b, [21.4, 26.5], [0, 1], { ...CL, easing: EIO });
  const bill = progOf(b, 28, 3, EO);
  const billOut = progOf(b, 33.6, 0.6, EIO);
  const look = progOf(b, 34.6, 1, EIO);
  const lookBack = progOf(b, 40.6, 0.8, EIO);
  const check = interpolate(b, [41, 45], [0, 1], CL);
  const q = progOf(b, 35.6, 0.6, EBACK) * (1 - progOf(b, 40, 0.5));
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 960, y: 540, s: 1 },
          { b: 34.2, x: 960, y: 540, s: 1 },
          { b: 35.6, x: 1000, y: 580, s: 0.9 },
          { b: 39.8, x: 1006, y: 584, s: 0.9 },
          { b: 41, x: 960, y: 540, s: 1 },
        ]}
      >
        {/* dispatch lines from his laptop to the agents */}
        {b >= 2 && toBooks < 1 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - toBooks }}>
            {[0, 1, 2, 3, 4].map((k) => (
              <path key={k} d={`M650 690 C 820 ${640 - k * 20}, 900 ${520 + k * 80}, ${GX - 6} ${GY + 30 + k * 116}`} fill="none" stroke={K.ai} strokeWidth={3} strokeDasharray="8 10" strokeDashoffset={-b * 30} opacity={0.55} />
            ))}
          </svg>
        ) : null}
        <Desk b={b} look={look * (1 - lookBack)} />
        {toBooks < 1 ? (
          <div style={{ opacity: 1 - toBooks, transform: `scale(${1 - 0.08 * toBooks})`, transformOrigin: "1440px 700px" }}>
            <Agents b={b} lit={lit} tasks={tasks} />
          </div>
        ) : null}
        {one > 0 && oneOut < 1 ? <OneBook p={one} out={oneOut} /> : null}
        {books > 0 ? (
          <div style={{ opacity: 1 - 0.55 * bill * (1 - billOut) - 0.5 * lookBack }}>
            <Books p={books} />
            <div style={{ position: "absolute", left: 1040, top: 436, display: "flex", alignItems: "baseline", gap: 12, opacity: progOf(b, 21.4, 0.6) }}>
              <span style={{ fontFamily: NUM, fontWeight: 300, fontSize: 64, color: K.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(books * 46232)}</span>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: K.ink }}>部 / 天</span>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 20, color: K.ink, opacity: 0.6, marginLeft: 10 }}>每本 = 100 部</span>
            </div>
          </div>
        ) : null}
        {bill > 0 && billOut < 1 ? (
          <div style={{ opacity: 1 - billOut }}>
            <Bill p={bill} />
          </div>
        ) : null}
        {check > 0 ? <Checklist p={check} /> : null}
        {q > 0.01 ? (
          <div style={{ position: "absolute", left: 196, top: 330, fontFamily: SERIF, fontWeight: 900, fontSize: 150, color: K.ink, opacity: Math.min(1, q), transform: `scale(${q}) rotate(${Math.sin(b * Math.PI) * 4}deg)`, transformOrigin: "50% 100%" }}>？</div>
        ) : null}
      </Cam>
      <Triad at={44} x={1150} y={44} q="派活" a="写代码" g="定好什么算合格" scale={1.15} />

      <Say at={1} out={9} y={140} lines={[["一个程序员，"], ["身边约 ", { t: "100 个 AI", k: true }, " 在干活。"]]} src="Peter Steinberger，OpenClaw（开源 AI 助手）作者 · 2026-05" />
      <Say at={10} out={17} y={140} lines={[["写代码、找错、修补，"], [{ t: "都交给它们", k: true }, "。"]]} />
      <Say
        at={18}
        out={27}
        y={140}
        lines={[["它们每天读写的字，"], ["相当于 ", { t: "4.6 万部《红楼梦》", k: true }, "。"]]}
        src="30 天 6,030 亿 token（AI 读写文字的计数单位，1 个汉字约 0.6 个）· 推算：÷ 30 天 ÷（72.5 万字 × 0.6）"
      />
      <Say at={28} out={34} y={140} lines={[["30 天，AI 账单约 ", { t: "877 万元", k: true }, "。"]]} src="他现在是 OpenAI（ChatGPT 的公司）员工，账单由公司付 · 截图 2026-05-15" />
      <Say at={34.4} out={39.4} y={140} lines={[["这么多字，他", { t: "看得完吗", k: true }, "？"]]} />
      <Say at={39.8} out={47.2} y={140} lines={[["他只做两件事："], [{ t: "派活", k: true }, "，", { t: "定好什么算合格", k: true }, "。"]]} />

      {/* sound: windows doubling, the pile, the printer, the question, the pen */}
      {[2, 3, 4, 5, 6, 7, 8].map((t, i) => (
        <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.3} rate={0.9 + i * 0.08} />
      ))}
      <Sfx at={8} id="sfx-impact-06" vol={0.4} />
      {[10.5, 11, 11.5].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-02" vol={0.22} rate={1.1} />
      ))}
      <Sfx at={17.2} id="sfx-transition-03" vol={0.35} />
      <Sfx at={19} id="sfx-impact-01" vol={0.45} />
      {[21.5, 22.5, 23.5, 24.5, 25.5].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-16" vol={0.24} />
      ))}
      <Sfx at={26.5} id="sfx-impact-06" vol={0.5} />
      {[28, 28.5, 29, 29.5, 30, 30.5].map((t) => (
        <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.26} rate={1.25} />
      ))}
      <Sfx at={31} id="sfx-impact-03" vol={0.5} />
      <Sfx at={35.6} id="sfx-transition-02" vol={0.3} />
      {[41.6, 42.5, 43.4].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.4} />
      ))}
    </AbsoluteFill>
  );
};
