import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Cross, Drop, InkStamp, Scribble, Section, Sheet } from "../art/paper";
import { CL, EBACK, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";

// ---------- S13 · fair play: most work can't be handed over whole yet ----------

type Rej = { org: string; big: string; line: string; stamp: string; src: string; flag?: string };

const REJ: Rej[] = [
  { org: "Anthropic 自己的工程师", big: "0–20%", line: "多数人说，能完全交给 AI 的活只有这么多，其余都要盯着", stamp: "还交不出去", src: "Anthropic 2025-12", flag: "Anthropic 自己的数据" },
  { org: "Klarna 客服", big: "700 人", line: "2024 年说 AI 顶了 700 个客服；2025 年 CEO 承认质量下降，重新招真人", stamp: "质量下降", src: "Klarna 2024-02 · CNBC 2025-05" },
  { org: "AI 写病历 · 随机试验", big: "−9.5%", line: "238 名医生：最好的一款只省 9.5% 写病历的时间，另一款没有明显变化", stamp: "只省一点", src: "NEJM AI 2025-12" },
  { org: "法庭", big: "2,202 起", line: "AI 编造的内容被法庭发现，其中 872 起出自律师", stamp: "没人阅卷", src: "Charlotin 数据库 · 截至 2026-10-19" },
];

export const FairPlay: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 96, top: 120 }}>
      <Head at={0} parts={["说句公道话："]} size={70} />
    </div>
    {REJ.map((r, i) => {
      const at = 1 + i;
      return (
        <Drop key={r.org} land={at} x={96 + i * 440} y={238} w={400} h={500} rot={[-1.5, 1, -0.8, 1.3][i]} back="退回">
          <Sheet x={0} y={0} w={400} h={500} seal={false} shadow={0}>
            <div style={{ position: "absolute", left: 28, right: 24, top: 24, fontFamily: FONT, fontWeight: 900, fontSize: 25, color: K.ink }}>{r.org}</div>
            {r.flag ? <div style={{ position: "absolute", left: 28, top: 62, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: K.inkSoft, border: `1px solid ${K.inkFaint}`, borderRadius: 4, padding: "1px 6px" }}>{r.flag}</div> : null}
            <div style={{ position: "absolute", left: 28, top: 100, fontFamily: FONT, fontWeight: 900, fontSize: 82, letterSpacing: -2, color: K.ink, whiteSpace: "nowrap" }}>{r.big}</div>
            <div style={{ position: "absolute", left: 28, right: 26, top: 214, fontFamily: FONT, fontWeight: 500, fontSize: 25, lineHeight: 1.45, color: K.inkSoft }}>{r.line}</div>
            <div style={{ position: "absolute", left: 24, bottom: 92 }}>
              <InkStamp at={at + 0.9} size={30} color={K.redInk} rot={-9}>
                {r.stamp}
              </InkStamp>
            </div>
            <Cross at={at + 0.7} size={70} style={{ position: "absolute", right: 22, bottom: 70 }} />
            <div style={{ position: "absolute", left: 28, bottom: 18, fontFamily: FONT, fontSize: 15, color: K.inkFaint, whiteSpace: "nowrap" }}>{r.src}</div>
          </Sheet>
        </Drop>
      );
    })}
    <div style={{ position: "absolute", left: 96, top: 800 }}>
      <Head at={8.5} parts={["大多数活，", { t: "还不能整件交出去", c: K.red }, "。"]} size={72} />
    </div>
  </AbsoluteFill>
);

// ---------- S14 · the gap: most people ask; the best set exams ----------

const Person: React.FC<{ level: number }> = ({ level }) => {
  // level 0 = never, 1 = a few times a year, 2 = weekly, 3 = daily
  const c = level === 3 ? K.ai : level === 2 ? K.paper : level === 1 ? "rgba(241,236,223,0.45)" : "rgba(241,236,223,0.10)";
  return (
    <div style={{ width: 46, height: 58, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ width: 17, height: 17, borderRadius: "50%", background: c, boxShadow: level === 3 ? `0 0 14px ${K.ai}` : undefined }} />
      <div style={{ width: 30, height: 30, borderRadius: "14px 14px 5px 5px", background: c }} />
    </div>
  );
};

export const Gap: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const used = interpolate(b, [1, 2.2], [0, 52], CL);
  const weekly = interpolate(b, [3, 4.2], [0, 30], CL);
  const daily = interpolate(b, [5, 6.2], [0, 15], CL);
  const chat = progAt(frame, 8, 0.8, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 120 }}>
        <Head at={0} parts={["这样用 AI 的人，还很少。"]} size={64} />
      </div>
      {/* 100 US workers, Gallup May 2026 */}
      <div style={{ position: "absolute", left: 96, top: 236, width: 560, display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
        {Array.from({ length: 100 }, (_, i) => {
          const lv = i < daily ? 3 : i < weekly ? 2 : i < used ? 1 : 0;
          return <Person key={i} level={lv} />;
        })}
      </div>
      <div style={{ position: "absolute", left: 690, top: 250, display: "flex", flexDirection: "column", gap: 30, fontFamily: FONT }}>
        {[
          { at: 1.6, n: "52", t: "用过 AI", s: "一年几次以上", c: K.sub },
          { at: 3.6, n: "30", t: "每周用", s: "一周几次以上", c: K.paper },
          { at: 5.6, n: "15", t: "每天用", s: "", c: K.aiHi },
        ].map((r) => (
          <In key={r.n} at={r.at} from="left" dist={20}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: r.c }}>{r.n}</span>
              <span style={{ fontSize: 30, fontWeight: 900, color: K.fg }}>人 {r.t}</span>
              <span style={{ fontSize: 20, color: K.muted }}>{r.s}</span>
            </div>
          </In>
        ))}
        <In at={6.5} from="fade">
          <div style={{ fontSize: 20, color: K.muted, lineHeight: 1.5 }}>每 100 个美国在职者 · Gallup 2026-05</div>
        </In>
      </div>
      {/* China: 700 million users, three in four just ask */}
      <In at={7} from="right">
        <div style={{ position: "absolute", left: 1160, top: 236, width: 680, fontFamily: FONT }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>中国：7 亿多人用过生成式 AI</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: K.fg, marginTop: 6 }}>
            <span style={{ color: K.aiHi }}>76%</span> 拿它来回答问题
          </div>
          <div style={{ fontSize: 18, color: K.muted, marginTop: 4 }}>CNNIC · 2026 年上半年</div>
        </div>
      </In>
      {/* 问 vs 考 */}
      <div style={{ position: "absolute", left: 1160, top: 470, width: 680, height: 300, opacity: Math.min(1, chat * 2), transform: `translateY(${(1 - chat) * 30}px)` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 300, height: 270, borderRadius: 18, background: "rgba(36,38,46,0.95)", border: "1px solid rgba(255,255,255,0.12)", padding: 18, boxSizing: "border-box", fontFamily: FONT }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: K.sub, marginBottom: 12 }}>问</div>
          <div style={{ marginLeft: "auto", width: 200, background: "#3a3d48", color: K.fg, borderRadius: 14, padding: "10px 14px", fontSize: 20 }}>这个词什么意思？</div>
          <div style={{ marginTop: 12, width: 220, background: `${K.ai}33`, color: K.fg, borderRadius: 14, padding: "10px 14px", fontSize: 20 }}>它的意思是……</div>
        </div>
        <div style={{ position: "absolute", left: 340, top: 0, width: 340, height: 270 }}>
          <Sheet x={0} y={0} w={340} h={270} seal={false} shadow={0.6}>
            <div style={{ position: "absolute", left: 18, top: 14, fontFamily: FONT, fontSize: 22, fontWeight: 900, color: K.ink }}>考</div>
            <Section n="一" title="题" who="人" size={20} style={{ position: "absolute", left: 18, top: 52 }} />
            <Section n="二" title="答" who="AI" size={20} style={{ position: "absolute", left: 18, top: 96 }} />
            <div style={{ position: "absolute", left: 30, top: 134, transform: "scale(0.7)", transformOrigin: "0 0" }}>
              <Scribble w={400} lines={2} lineH={34} progress={interpolate(b, [8.5, 11], [0, 2], CL)} seed="gapexam" />
            </div>
            <Section n="三" title="阅" who="人" size={20} style={{ position: "absolute", left: 18, top: 196 }} />
          </Sheet>
        </div>
      </div>
      <div style={{ position: "absolute", left: 1160, top: 800, display: "flex", flexDirection: "column", gap: 8 }}>
        <Head at={9.5} parts={["大多数人在", { t: "“问”", c: K.sub }, " AI，"]} size={58} />
        <Head at={11} parts={["最会用的人，在", { t: "“考”", c: K.ink, hl: K.paper }, " AI。"]} size={58} />
      </div>
      <Src>Gallup 美国在职者调查 2026-05 · CNNIC《生成式人工智能应用发展报告（2026）》</Src>
    </AbsoluteFill>
  );
};
