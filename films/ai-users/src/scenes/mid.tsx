import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { Scribble } from "../art/paper";
import { CL, EBACK, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";
import { ErdosSheet } from "./open";

// ---------- S15 · the one discovery: answers are no longer scarce, grading is ----------

const N = 64;
const HEAP = Array.from({ length: N }, (_, i) => {
  const r1 = random(`hx${i}`);
  const r2 = random(`hy${i}`);
  // A mound: wider at the bottom, centred on x = 1340
  const row = Math.floor(Math.sqrt(i * 1.6));
  const spread = 470 - row * 46;
  return {
    x: 1340 + (r1 - 0.5) * 2 * spread - 75,
    y: 820 - row * 52 - r2 * 30,
    rot: (random(`hr${i}`) - 0.5) * 50,
    at: 2 + (i / N) * 5.5 + random(`ha${i}`) * 0.4,
    seed: `heap${i % 9}`,
  };
});

const Falling: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <>
      {HEAP.map((h, i) => {
        const t = interpolate(frame, [h.at * FPB, (h.at + 0.9) * FPB], [0, 1], { ...CL, easing: EIO });
        if (t <= 0) return null;
        const y = interpolate(t, [0, 1], [-320, h.y]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: h.x,
              top: y,
              width: 150,
              height: 196,
              transform: `rotate(${h.rot * t + (1 - t) * 30}deg)`,
              background: `linear-gradient(180deg, ${K.paperHi}, ${K.paperLo})`,
              borderRadius: 3,
              boxShadow: "0 10px 26px rgba(0,0,0,0.55)",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 14, top: 12, width: 80, height: 7, background: K.ink, opacity: 0.6, borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 12, top: 30, transform: "scale(0.42)", transformOrigin: "0 0" }}>
              <Scribble w={300} lines={8} lineH={40} progress={8} seed={h.seed} width={4} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export const Finding: React.FC = () => {
  const frame = useBeatFrame();
  const scrim = progAt(frame, 14, 1, EIO);
  const gold = progAt(frame, 14.5, 0.8, EBACK);
  return (
    <AbsoluteFill>
      {/* May: one sheet, graded by nine */}
      <In at={0} from="left">
        <div style={{ position: "absolute", left: 92, top: 132, fontFamily: FONT, fontWeight: 900, fontSize: 42, color: K.fg, whiteSpace: "nowrap" }}>
          2026 年 5 月 · <span style={{ color: K.paper }}>1 份答卷</span>
        </div>
      </In>
      <ErdosSheet x={92} y={212} scale={0.6} still />
      <In at={1} from="up">
        <div style={{ position: "absolute", left: 92, top: 770, fontFamily: FONT, color: K.fg, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 34, fontWeight: 900 }}>
            9 位数学家阅过 → <span style={{ color: K.green }}>里程碑</span>
          </div>
        </div>
      </In>
      <div style={{ position: "absolute", left: 750, top: 132, bottom: 120, width: 2, background: K.line }} />
      {/* October: a flood nobody has graded */}
      <In at={2} from="right">
        <div style={{ position: "absolute", left: 820, top: 132, fontFamily: FONT, fontWeight: 900, fontSize: 42, color: K.fg, whiteSpace: "nowrap" }}>
          2026 年 10 月 6 日 · <span style={{ color: K.aiHi }}>一次放出</span>
        </div>
      </In>
      <Falling />
      <div style={{ position: "absolute", left: 820, top: 200, display: "flex", gap: 56, fontFamily: FONT, color: K.fg }}>
        {[
          { v: 372, u: "份证明声明", at: 2 },
          { v: 1347, u: "页 PDF", at: 3 },
        ].map((c) => (
          <div key={c.u} style={{ opacity: progAt(frame, c.at, 0.5) }}>
            <Odometer value={c.v * progAt(frame, c.at, 4, EO)} size={96} color={K.aiHi} />
            <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>{c.u}</div>
          </div>
        ))}
      </div>
      {/* The grading column stays empty */}
      <In at={7.5} from="scale">
        <div style={{ position: "absolute", left: 980, top: 430, width: 760, background: K.paper, color: K.ink, borderRadius: 8, padding: "22px 30px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: SERIF, fontWeight: 900, fontSize: 30 }}>
            三、阅卷
            <span style={{ flex: 1, height: 44, border: `2px dashed ${K.inkFaint}`, borderRadius: 6 }} />
          </div>
          <div style={{ marginTop: 18, fontFamily: FONT, fontWeight: 900, fontSize: 38, lineHeight: 1.35 }}>“这批证明，我还没认真看过任何一份。”</div>
          <div style={{ marginTop: 8, fontFamily: FONT, fontSize: 22, color: K.inkSoft }}>Thomas Bloom · Erdős 题库维护者 · 2026-10-08</div>
        </div>
      </In>
      <In at={9.5} from="up" dist={24}>
        <div style={{ position: "absolute", left: 980, top: 690, width: 800, fontFamily: FONT, fontSize: 27, fontWeight: 700, color: K.fg, lineHeight: 1.45, background: "rgba(7,9,11,0.78)", padding: "12px 18px", borderRadius: 8 }}>
          同一天，题库暂停收稿：<span style={{ color: K.aiHi }}>“一波没有解释的 AI 解答”</span>
        </div>
      </In>
      {/* The reveal */}
      <AbsoluteFill style={{ background: `rgba(7,9,11,${0.82 * scrim})` }} />
      {gold > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, fontFamily: FONT, fontWeight: 900, opacity: Math.min(1, gold * 1.6) }}>
          <div style={{ fontSize: 92, color: K.fg }}>答题，已经不缺了。</div>
          <div style={{ fontSize: 156, color: K.gold, letterSpacing: -3, transform: `scale(${0.85 + 0.15 * gold})` }}>缺的是阅卷。</div>
        </div>
      ) : null}
      <Src>Thomas Bloom · erdosproblems.com · 2026-10-06、10-08 · 372 份是声明，不等于 372 道题被解决；Bloom 预计其中多数可能是对的</Src>
    </AbsoluteFill>
  );
};

// ---------- Placeholder for scenes still to be built (used only before the Gate 2 build) ----------

export const todo = (lines: string[]): React.FC => {
  const Todo: React.FC = () => (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 360, display: "flex", flexDirection: "column", gap: 20 }}>
        {lines.map((l, i) => (
          <Head key={i} at={i * 1.5} parts={[l]} size={72} />
        ))}
      </div>
    </AbsoluteFill>
  );
  return Todo;
};
