import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Scribble, Tick } from "../art/paper";
import { SeatedLeft, SeatedRight } from "../art/people";
import { Triad } from "../art/triad";
import { Cam, CL, EBACK, EIO, EO, fmt, progOf, Say, Sfx, useBeat } from "../kit";
import { K, NUM, SANS, SERIF } from "../theme";

const LINE = { stroke: K.ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// The consulting room as a spot illustration on the paper: desk top at y = 800.
const Room: React.FC<{ b: number }> = ({ b }) => {
  const typing = b < 9.2 ? Math.sin(b * Math.PI * 4) : 0;
  const lookUp = progOf(b, 9.2, 1.2, EIO);
  const smile = progOf(b, 33, 1.5, EO);
  const talk = (b > 0.5 && b < 14.6) || (b > 32 && b < 39) ? Math.max(0, Math.sin(b * Math.PI * 1.5)) : 0;
  const mic = progOf(b, 8.4, 0.6, EBACK);
  const pulse = (b * 1.5) % 1;
  return (
    <>
      {/* the wall: a window with a curtain, a framed eye chart */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect x={1390} y={330} width={250} height={210} rx={6} fill="#d7e6ea" {...LINE} />
        <path d="M1515 330 V540 M1390 435 H1640" stroke={K.ink} strokeWidth={3} />
        <path d="M1380 322 C 1400 420, 1392 500, 1380 552 L 1420 552 C 1410 470, 1418 400, 1410 322 Z" fill="#e7b7a0" {...LINE} />
        <rect x={1180} y={360} width={120} height={150} rx={4} fill={K.paperHi} {...LINE} />
        <path d="M1220 392 h40 M1214 420 h52 M1222 446 h36 M1228 470 h24" stroke={K.ink} strokeWidth={5} strokeLinecap="round" />
      </svg>
      {/* floor shadow and plant */}
      <ellipse cx={1330} cy={1018} rx={560} ry={40} fill="rgba(90,60,25,0.12)" />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* plant */}
        <path d="M1838 1000 L1828 900 L1892 900 L1882 1000 Z" fill="#c0714a" {...LINE} />
        <path d="M1860 900 C 1840 840, 1800 820, 1790 780 M1860 900 C 1866 830, 1900 800, 1910 760 M1860 900 C 1850 850, 1862 800, 1846 740" fill="none" stroke="#5f7d4f" strokeWidth={14} strokeLinecap="round" />
        {/* desk */}
        <rect x={1000} y={800} width={660} height={24} rx={4} fill="#c49566" {...LINE} />
        <path d="M1030 824 L1030 1040 M1630 824 L1630 1040" stroke={K.ink} strokeWidth={10} strokeLinecap="round" />
        {/* laptop: base and the back of its lid */}
        <rect x={950} y={786} width={200} height={14} rx={3} fill="#c8ced3" {...LINE} />
        <path d="M1150 788 L1178 612 L1192 614 L1166 790 Z" fill="#aab3ba" {...LINE} />
        <circle cx={1176} cy={700} r={6} fill="#e8ecef" />
        {/* cup */}
        <path d="M1500 770 h36 l-4 30 h-28 z" fill="#f4efe6" {...LINE} />
        <path d="M1536 778 a10 10 0 0 1 0 16" fill="none" {...LINE} />
      </svg>
      {/* the AI's ear on the desk */}
      {mic > 0 ? (
        <div style={{ position: "absolute", left: 1352, top: 712, transform: `scale(${mic})`, transformOrigin: "50% 100%" }}>
          {[0, 1].map((k) => {
            const q = (pulse + k * 0.5) % 1;
            return <div key={k} style={{ position: "absolute", left: 28 - 40 * q, top: 20 - 40 * q, width: 80 * q, height: 80 * q, borderRadius: "50%", border: `3px solid ${K.ai}`, opacity: (1 - q) * 0.8 }} />;
          })}
          <svg width={56} height={90} viewBox="0 0 56 90" style={{ position: "relative" }}>
            <rect x={16} y={4} width={24} height={44} rx={12} fill={K.ai} {...LINE} />
            <path d="M8 34 a20 20 0 0 0 40 0 M28 54 v22 M16 80 h24" fill="none" {...LINE} />
          </svg>
        </div>
      ) : null}
      {/* the patient talks */}
      {talk > 0.05 ? (
        <div style={{ position: "absolute", left: 1606, top: 470, width: 150, height: 74, borderRadius: 30, background: K.paperHi, border: `3px solid ${K.ink}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.4 + 0.6 * talk }}>
          {[0, 1, 2].map((d) => (
            <span key={d} style={{ width: 12, height: 12, borderRadius: "50%", background: K.ink, opacity: ((b * 3 + d) % 3) < 1.5 ? 1 : 0.3 }} />
          ))}
        </div>
      ) : null}
      <SeatedRight style={{ position: "absolute", left: 700, top: 560 }} tilt={18 - 22 * lookUp} arm={lookUp} type={typing} steth glasses smile={smile} shirt="#a9c2d6" />
      <SeatedLeft style={{ position: "absolute", left: 1560, top: 560 }} tilt={-2} arm={1} coat="#8fa98b" shirt="#e7dcc3" hair="#5a3b2b" smile={smile} />
    </>
  );
};

// The note on the doctor's screen, shown as a callout: AI ink writes it, then the doctor's pen edits and signs it.
const Note: React.FC<{ b: number; x: number; y: number; write: number; edit: number; sign: number; bars: number }> = ({ x, y, write, edit, sign, bars }) => {
  const strike = interpolate(edit, [0, 0.5], [0, 1], CL);
  const add = interpolate(edit, [0.5, 1], [0, 1], CL);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 470, background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 12, padding: "16px 22px 18px", boxShadow: "0 12px 30px rgba(70,45,15,0.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 28, color: K.ink }}>病历</span>
        <span style={{ fontFamily: SANS, fontSize: 16, color: K.ai, fontWeight: 700 }}>AI 起草</span>
      </div>
      <div style={{ position: "relative", marginTop: 10 }}>
        <Scribble w={420} lines={4} lineH={34} progress={write} seed="note" width={2.6} />
        {strike > 0 ? <div style={{ position: "absolute", left: 0, top: 50, width: 210 * strike, height: 4, background: K.ink, borderRadius: 2, transform: "rotate(-2deg)" }} /> : null}
        {add > 0 ? <div style={{ position: "absolute", left: 236, top: 30, fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.ink, opacity: add, transform: "rotate(-4deg)" }}>补一句</div> : null}
      </div>
      {bars > 0 ? (
        <div style={{ marginTop: 12, opacity: Math.min(1, bars * 2), fontFamily: SANS }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: K.ink, marginBottom: 6 }}>写病历的时间</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 280, height: 18, background: K.ink, borderRadius: 4 }} />
            <span style={{ fontSize: 19, color: K.ink, whiteSpace: "nowrap" }}>没有 AI</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <div style={{ width: 280 * (1 - 0.095 * bars), height: 18, background: K.ai, borderRadius: 4 }} />
            <span style={{ fontSize: 19, color: K.ai, fontWeight: 700, whiteSpace: "nowrap" }}>用 AI：最多少 9.5%</span>
          </div>
        </div>
      ) : null}
      {sign > 0 ? (
        <div style={{ position: "relative", height: 70, marginTop: 6 }}>
          <svg width={200} height={60} style={{ position: "absolute", left: 150, top: 4 }}>
            <path d="M6 40 C 20 10, 30 50, 44 26 S 70 10, 80 36 S 110 20, 124 30 S 150 44, 176 18" fill="none" stroke={K.ink} strokeWidth={3} strokeLinecap="round" strokeDasharray="330 330" strokeDashoffset={330 * (1 - Math.min(1, sign * 1.4))} />
          </svg>
          {sign > 0.75 ? <Tick at={-99} size={70} style={{ position: "absolute", left: 20, top: -6 }} /> : null}
        </div>
      ) : null}
    </div>
  );
};

// 2,576,627 visits, one note icon per 10,000.
const Visits: React.FC<{ p: number }> = ({ p }) => {
  const n = 258;
  const lit = p * n;
  return (
    <div style={{ position: "absolute", left: 1130, top: 60, width: 720, padding: "18px 22px", background: "rgba(248,244,236,0.92)", border: `3px solid ${K.ink}`, borderRadius: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {Array.from({ length: n }, (_, i) => (
          <div key={i} style={{ width: 18, height: 22, borderRadius: 3, background: i < lit ? K.paperHi : "transparent", border: `2px solid ${i < lit ? K.ink : "rgba(25,35,31,0.12)"}`, position: "relative" }}>
            {i < lit ? <div style={{ position: "absolute", left: 3, right: 3, top: 5, height: 3, background: K.ai, opacity: 0.8, boxShadow: `0 6px 0 ${K.aiHi}, 0 12px 0 ${K.aiHi}` }} /> : null}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: NUM, fontWeight: 300, fontSize: 72, color: K.ink, fontVariantNumeric: "tabular-nums", letterSpacing: -2 }}>{fmt(Math.min(1, p) * 2576627)}</span>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, color: K.ink }}>次就诊</span>
      </div>
      <div style={{ fontFamily: SANS, fontSize: 19, color: K.ink, opacity: 0.6 }}>每格 = 1 万份病历</div>
    </div>
  );
};

// ---------- S1 · the doctor (A bars 7–17) ----------

export const Doctor: React.FC = () => {
  const b = useBeat();
  const write = interpolate(b, [9, 12.5], [0, 4], CL);
  const note1 = progOf(b, 8.6, 0.6, EBACK) * (1 - progOf(b, 14.4, 0.5, EIO));
  const visits = interpolate(b, [15.5, 21.5], [0, 1], { ...CL, easing: EIO });
  const visitsOut = progOf(b, 22.4, 0.6, EIO);
  const note2 = progOf(b, 23.2, 0.6, EBACK) * (1 - progOf(b, 31.4, 0.5, EIO));
  const edit = progOf(b, 24.6, 2, EIO);
  const sign = progOf(b, 27, 1.6, EIO);
  const bars = progOf(b, 29, 1.2, EO);
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 960, y: 540, s: 1 },
          { b: 14, x: 990, y: 548, s: 1 },
          { b: 15.5, x: 990, y: 520, s: 1 },
          { b: 22, x: 1000, y: 520, s: 1 },
          { b: 23.5, x: 975, y: 545, s: 1 },
          { b: 40, x: 950, y: 540, s: 1 },
        ]}
      >
        <div style={{ position: "absolute", inset: 0, transform: "translateX(-95px) scale(1.22)", transformOrigin: "1330px 1040px" }}>
          <Room b={b} />
        </div>
        {note1 > 0.01 ? (
          <div style={{ opacity: Math.min(1, note1 * 2), transform: `translateY(${(1 - note1) * 30}px)` }}>
            <Note b={b} x={1180} y={210} write={write} edit={0} sign={0} bars={0} />
          </div>
        ) : null}
        {visitsOut < 1 && b > 15 ? (
          <div style={{ opacity: 1 - visitsOut }}>
            <Visits p={visits} />
          </div>
        ) : null}
        {note2 > 0.01 ? (
          <div style={{ opacity: Math.min(1, note2 * 2), transform: `translateY(${(1 - note2) * 30}px)` }}>
            <Note b={b} x={1040} y={420} write={4} edit={edit} sign={sign} bars={bars} />
          </div>
        ) : null}
        <Triad at={34} x={1150} y={44} q="看病" a="写病历" g="读完再签" scale={1.15} />
      </Cam>

      <Say at={1} out={7.3} y={140} lines={[["以前看病，"], ["眼睛盯着电脑", { t: "敲病历", k: true }, "。"]]} />
      <Say at={8} out={14.9} y={140} lines={[["现在 ", { t: "AI", k: true }, " 在旁边听，"], ["病历由它起草。"]]} />
      <Say
        at={15.6}
        out={22.9}
        y={140}
        lines={[["一家医疗集团，15 个月"], ["用了 ", { t: "257 万次", k: true }, "。"]]}
        src="Kaiser Permanente（美国大型医疗集团）· 7,260 名医生 · 2023-10 至 2024-12"
      />
      <Say
        at={23.6}
        out={31.8}
        y={140}
        lines={[["可省下的时间不多："], ["每份都得医生", { t: "读完再签", k: true }, "。"]]}
        src="随机试验：238 名医生，写病历的时间最多省 9.5% · NEJM AI 2025-12"
      />
      <Say at={32.4} out={39.6} y={140} lines={[["近九成医生说："], [{ t: "问诊变好了", k: true }, "。"]]} src="Kaiser Permanente 对 102 名医生的调查：88%" />

      {/* sound: keys, the AI's ear, the note writing itself, the wall of visits, the pen */}
      {[1.2, 1.7, 2.1, 2.6, 3.2, 3.6, 4.1, 4.7, 5.2, 5.6, 6.1, 6.7, 7.2, 7.6, 8.1].map((t) => (
        <Sfx key={t} at={t} id="sfx-ui-01" vol={0.12} rate={1.3} />
      ))}
      <Sfx at={8.4} id="sfx-impact-06" vol={0.45} />
      {[9, 9.4, 9.8, 10.2, 10.6, 11, 11.4, 11.8, 12.2].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.22} />
      ))}
      {[15.5, 16.5, 17.5, 18.5, 19.5, 20.5].map((t, i) => (
        <Sfx key={t} at={t} id="sfx-mechanical-13" vol={0.3} rate={1 + i * 0.05} />
      ))}
      <Sfx at={21.5} id="sfx-impact-06" vol={0.5} />
      {[24.7, 25.2, 26, 27.1, 27.6, 28.1].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.4} rate={0.85} />
      ))}
      <Sfx at={28.4} id="sfx-impact-06" vol={0.45} />
    </AbsoluteFill>
  );
};

