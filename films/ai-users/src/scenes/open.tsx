import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Scribble, Seal, Section, Sheet, Tick, InkStamp, Print, Who } from "../art/paper";
import { CL, EBACK, EIO, In, progAt, Shockwave } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";

// "出题" / "阅卷" set on a slip of exam paper: the human half of the claim.
const Slip: React.FC<{ children: React.ReactNode; size: number }> = ({ children, size }) => (
  <span style={{ display: "inline-block", background: K.paper, color: K.ink, padding: `0 ${size * 0.12}px`, borderRadius: size * 0.06, lineHeight: 1.08, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
    {children}
  </span>
);

// ---------- S01 · the claim, whole, from the first frame ----------

export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const beat = frame / FPB;
  const written = interpolate(beat, [-1, 7.5], [3.2, 9], CL);
  const flood = progAt(frame, 5, 2.5, EIO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 232, fontFamily: FONT, color: K.fg, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 86, fontWeight: 900, lineHeight: 1.18 }}>最会用 AI 的人，</div>
        <div style={{ fontSize: 86, fontWeight: 900, lineHeight: 1.18 }}>只做两件事：</div>
        <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.2, marginTop: 18, letterSpacing: -4 }}>
          <Slip size={150}>出题</Slip>，<Slip size={150}>阅卷</Slip>。
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 30, color: K.aiHi }}>中间的答题，全交给 AI。</div>
      </div>
      <Shockwave at={0} x={1440} y={540} color={K.ai} size={1700} />
      <Sheet x={1090} y={104} w={700} h={872} rot={2.5}>
        <div style={{ position: "absolute", left: 70, top: 26, right: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 17, color: K.inkSoft }}>绝密★启用前</span>
          <span style={{ fontSize: 30, fontWeight: 900 }}>用 AI 做事 · 试卷</span>
          <span style={{ width: 92, height: 58, border: `2px solid ${K.ink}`, display: "flex", alignItems: "flex-start", justifyContent: "flex-start", padding: 4, boxSizing: "border-box", fontSize: 14 }}>得分</span>
        </div>
        <div style={{ position: "absolute", left: 70, right: 28, top: 92, borderTop: `3px double ${K.ink}` }} />
        <Section n="一" title="出题" who="人" style={{ position: "absolute", left: 70, top: 116 }} />
        <Print size={27} style={{ position: "absolute", left: 92, top: 168 }}>1. 要做成什么？</Print>
        <Print size={27} style={{ position: "absolute", left: 92, top: 210 }}>2. 怎样才算做好？</Print>
        <Section n="二" title="答题" who="AI" style={{ position: "absolute", left: 70, top: 282 }} />
        <div style={{ position: "absolute", left: 82, top: 336 }}>
          <Scribble w={570} lines={9} lineH={36} progress={written} seed="claim" />
        </div>
        <div
          style={{
            position: "absolute",
            left: 44,
            right: 0,
            top: 330,
            height: 330,
            background: `linear-gradient(180deg, transparent 0%, ${K.ai}22 100%)`,
            opacity: flood,
          }}
        />
        <Section n="三" title="阅卷" who="人" style={{ position: "absolute", left: 70, top: 690 }} />
        <Print size={27} style={{ position: "absolute", left: 92, top: 744 }}>对不对？好不好？</Print>
        <div style={{ position: "absolute", left: 470, top: 716, width: 180, height: 126, border: `2px solid ${K.ink}` }}>
          <Tick at={2} size={118} style={{ position: "absolute", left: 30, top: 2 }} />
        </div>
      </Sheet>
    </AbsoluteFill>
  );
};

// ---------- S02 · hook: an 80-year-old problem, answered by AI, graded by nine mathematicians ----------

const NINE = ["Alon", "Bloom", "Gowers", "Litt", "Sawin", "Shankar", "Tsimerman", "Wang", "Wood"];

export const ErdosSheet: React.FC<{ x: number; y: number; scale?: number; rot?: number; stampAt?: number; answerAt?: number; still?: boolean }> = ({
  x,
  y,
  scale = 1,
  rot = -1.2,
  stampAt = 8,
  answerAt = 4,
  still = false,
}) => {
  const frame = useBeatFrame();
  const writ = still ? 3 : interpolate(frame / FPB, [answerAt + 0.6, answerAt + 3.4], [0, 3], CL);
  const S = (b: number) => (still ? -9 : b);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 1000, height: 900, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
      <Sheet x={0} y={0} w={1000} h={900} rot={rot}>
        <div style={{ position: "absolute", left: 76, top: 30, right: 36, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 36, fontWeight: 900 }}>数学 · 第 90 题</span>
          <span style={{ fontSize: 24, color: K.inkSoft }}>出题人　Paul Erdős　1946</span>
        </div>
        <div style={{ position: "absolute", left: 76, right: 36, top: 92, borderTop: `3px double ${K.ink}` }} />
        <Section n="一" title="题目" who="人" style={{ position: "absolute", left: 76, top: 116 }} />
        <Print size={34} w={700} style={{ position: "absolute", left: 96, top: 170 }}>
          平面上放 n 个点，距离恰好为 1 的点对，
          <br />
          最多能有多少？
        </Print>
        <Print size={27} color={K.inkSoft} style={{ position: "absolute", left: 96, top: 278 }}>
          Erdős 的猜想：最多只比 n 多一点点。
        </Print>
        <Section n="二" title="答题" who="AI" style={{ position: "absolute", left: 76, top: 350 }} />
        <In at={S(answerAt)} from="left" dist={30}>
          <div style={{ position: "absolute", left: 96, top: 402, fontFamily: FONT, color: K.aiInk, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 40, fontWeight: 900 }}>反例：猜想不成立。</span>
            <span style={{ fontSize: 22, fontWeight: 700, marginLeft: 22 }}>OpenAI 的模型 · 2026 年 5 月</span>
          </div>
        </In>
        <div style={{ position: "absolute", left: 96, top: 470 }}>
          <Scribble w={820} lines={3} lineH={40} progress={writ} seed="erdos" />
        </div>
        <Section n="三" title="阅卷" who="人" style={{ position: "absolute", left: 76, top: 616 }} />
        <div style={{ position: "absolute", left: 92, top: 682, display: "flex", gap: 8 }}>
          {NINE.map((n, i) => (
            <Seal key={n} at={S(stampAt + i * 0.38)} name={n} size={88} rot={((i * 37) % 17) - 8} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 540, top: 790 }}>
          <InkStamp at={S(stampAt + 4)} size={40} rot={-7}>
            人工核验 ✓
          </InkStamp>
        </div>
        <div style={{ position: "absolute", left: 96, top: 852, fontFamily: FONT, fontSize: 17, color: K.inkFaint }}>arXiv 2605.20695 · 9 位作者 · 2026-05-20</div>
      </Sheet>
    </div>
  );
};

export const Hook: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 110, top: 300, display: "flex", flexDirection: "column", gap: 26 }}>
      <Head at={0} parts={["80 年前的题，"]} size={80} />
      <Head at={4} parts={[{ t: "AI", c: K.aiHi }, " 答，"]} size={80} />
      <Head at={8} parts={["9 位数学家", { t: "阅卷", c: K.ink, hl: K.paper }, "。"]} size={80} />
    </div>
    <ErdosSheet x={838} y={92} />
    <Src>arXiv 2605.20695（2026-05-20）· erdosproblems.com 第 90 题 · 猜想由 Erdős 于 1946 年提出</Src>
  </AbsoluteFill>
);

// ---------- S03 · the three questions the film answers ----------

const QS: [string, string][] = [
  ["AI 一天能答多少？", "第 1 章"],
  ["哪些行业，已经这样干了？", "第 2 章"],
  ["人，凭什么只剩两头？", "第 3 章"],
];

export const Questions: React.FC = () => (
  <AbsoluteFill>
    <Sheet x={420} y={96} w={1080} h={880} rot={0.8}>
      <div style={{ position: "absolute", left: 90, top: 46, fontSize: 40, fontWeight: 900 }}>四、思考题（共 3 题，每题 10 分）</div>
      <div style={{ position: "absolute", left: 90, right: 50, top: 116, borderTop: `3px double ${K.ink}` }} />
      {QS.map(([q, ch], i) => (
        <div key={q} style={{ position: "absolute", left: 96, top: 176 + i * 236 }}>
          <Print at={0.3 + i * 1.3} size={52} w={900}>
            {i + 1}. {q}
          </Print>
          <In at={0.7 + i * 1.3} from="fade">
            <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ display: "inline-block", width: 640, borderBottom: `2px solid ${K.ink}` }} />
              <span style={{ fontFamily: SERIF, fontSize: 24, color: K.inkSoft }}>（10 分）</span>
              <span style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.aiInk }}>答案见{ch}</span>
            </div>
          </In>
        </div>
      ))}
    </Sheet>
  </AbsoluteFill>
);

// ---------- S04 · title card, an exam cover ----------

const TITLE = ["最会用 AI 的人，", "在用 AI 干什么"];

export const Title: React.FC = () => {
  const frame = useBeatFrame();
  let idx = 0;
  return (
    <AbsoluteFill>
      <Sheet x={300} y={86} w={1320} h={908} rot={0}>
        <div style={{ position: "absolute", left: 92, top: 40, fontSize: 26, color: K.inkSoft }}>绝密★启用前</div>
        <div style={{ position: "absolute", right: 60, top: 34, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 20, color: K.inkSoft }}>考生号</span>
          <span style={{ display: "flex" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} style={{ width: 30, height: 38, border: `1.5px solid ${K.ink}`, marginLeft: -1.5 }} />
            ))}
          </span>
          <span style={{ width: 190, height: 56, border: `2px dashed ${K.inkFaint}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: K.inkSoft }}>条形码粘贴处</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 138, textAlign: "center", fontFamily: SERIF, fontSize: 32, fontWeight: 700, letterSpacing: 14, color: K.inkSoft }}>世界的形状</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, perspective: 1600 }}>
          {TITLE.map((line, li) => (
            <div key={li} style={{ display: "flex", alignItems: "baseline", fontFamily: FONT, fontWeight: 900, fontSize: li === 0 ? 96 : 128, color: K.ink, letterSpacing: -2, whiteSpace: "pre" }}>
              {Array.from(line).map((ch, ci) => {
                const k = idx++;
                const q = progAt(frame, k * 0.12, 0.7, EBACK);
                return (
                  <span key={ci} style={{ display: "inline-block", transform: `rotateX(${(1 - q) * -90}deg)`, opacity: Math.min(1, q * 2), transformOrigin: "50% 80%" }}>
                    {ch}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 240, right: 240, top: 600, border: `2px solid ${K.ink}`, padding: "22px 36px" }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>考生须知</div>
          {[
            ["1. 本卷考生：", "AI", "AI"],
            ["2. 出题、阅卷：", "人", "人"],
            ["3. 数据截至 2026 年 10 月，来源见卷末。", "", ""],
          ].map(([t, w], i) => (
            <In key={i} at={2.2 + i * 0.4} from="fade">
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: SERIF, fontSize: 26, lineHeight: 1.75 }}>
                {t}
                {w ? <Who who={w as "人" | "AI"} size={20} /> : null}
              </div>
            </In>
          ))}
        </div>
      </Sheet>
    </AbsoluteFill>
  );
};
