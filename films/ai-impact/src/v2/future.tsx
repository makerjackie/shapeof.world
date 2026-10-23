import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { RamKit } from "../samples/art";
import { FONT, SERIF } from "../theme";
import { Door, Person } from "./art";
import { Backdrop, C, Cam, EBACK, EIO, EO, Glass, Label, lerp, Line, pr, Src, useT } from "./kit";

const FLOOR = 930;

// ── 1:24–1:28 · For you, 1: the RAM in your cart stays dear; Micron says 2027 and 2028 are tighter still. ──
export const RamAgain: React.FC = () => {
  const t = useT();
  const card = pr(t, 84.08, 0.45, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.red} at={[30, 60]} strength={0.1} />
      <div style={{ position: "absolute", left: 180, top: 440, opacity: Math.min(1, card * 2), transform: `translateY(${(1 - card) * 30}px)` }}>
        <Glass x={0} y={0} w={640} h={420}>
          <div style={{ position: "absolute", left: 40, top: 34, fontSize: 28, fontWeight: 800, color: C.sub }}>你的下一台电脑</div>
          <div style={{ position: "absolute", left: 50, top: 110 }}>
            <RamKit w={300} id="v2again" />
          </div>
          <div style={{ position: "absolute", left: 40, top: 250, fontSize: 30, fontWeight: 800 }}>DDR5 内存条 32GB</div>
          <div style={{ position: "absolute", left: 36, top: 296, fontSize: 96, fontWeight: 900, color: C.red, lineHeight: 1 }}>¥3,800</div>
        </Glass>
      </div>
      {["2027", "2028"].map((y, i) => {
        const p = pr(t, 85.08 + i * 0.5, 0.5, EBACK);
        return (
          <div key={y} style={{ position: "absolute", left: 930 + i * 430, top: 440, width: 380, height: 300, perspective: 900 }}>
            <div style={{ position: "absolute", inset: 0, transform: `rotateY(${(1 - p) * 90}deg)`, opacity: p > 0 ? 1 : 0 }}>
              <Glass x={0} y={0} w={380} h={300} glow={C.red}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", fontSize: 110, fontWeight: 900, letterSpacing: -2 }}>{y}</div>
                <div style={{ position: "absolute", left: "50%", top: 190, transform: "translateX(-50%)", padding: "6px 22px", borderRadius: 10, background: "rgba(255,90,95,0.18)", color: C.red, fontSize: 34, fontWeight: 900, whiteSpace: "nowrap" }}>
                  ↑ 比今年更紧
                </div>
              </Glass>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 930, top: 790, width: 810, opacity: pr(t, 86.08, 0.4), fontFamily: FONT, fontSize: 28, lineHeight: 1.5, color: C.sub, fontWeight: 700 }}>
        "我们看不到供需什么时候能恢复平衡。"
        <div style={{ fontSize: 22, color: C.muted, fontWeight: 600 }}>—— 美光（美国内存大厂）管理层，2026 年 9 月</div>
      </div>
      <Line at={84.08} text="明后年装电脑，内存还会贵。" kw="还会贵" kwAt={85.58} />
      <Src at={84.4}>美光 2026 财年四季度财报讲稿：2027、2028 年供应比 2026 年"紧得多" · 公司自报，属预测</Src>
    </AbsoluteFill>
  );
};

// ── 1:28–1:32 · For you, 2: at this pace the door keeps narrowing. Three doors, each against the 2022 width: 2022,
// 2026 (−11%), 2028 (dashed: our straight-line extrapolation, about −16%). ──
const YEARS = [
  { y: "2022 年底", k: 1, tag: "", dashed: false },
  { y: "2026 年", k: 0.896, tag: "−11%", dashed: false },
  { y: "2028 年？", k: 0.838, tag: "约 −16%", dashed: true },
];
const NW = 380;
const NH = 430;
export const Narrower: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[70, 70]} strength={0.09} />
      <div style={{ position: "absolute", left: 0, right: 0, top: FLOOR, height: 2, background: C.line }} />
      {YEARS.map((d, i) => {
        const p = pr(t, 88.08 + i * 0.5, 0.45, EO);
        const left = 440 + i * 520 - NW / 2;
        const w = NW * (1 - (1 - d.k) * pr(t, 88.33 + i * 0.5, 0.4, EBACK));
        return (
          <React.Fragment key={d.y}>
            <div style={{ position: "absolute", left, top: FLOOR - NH, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
              {d.dashed ? (
                <div style={{ width: w, height: NH, border: `4px dashed ${C.gold}`, borderBottom: "none", borderRadius: "6px 6px 0 0", boxSizing: "border-box", background: "rgba(255,209,102,0.08)" }} />
              ) : (
                <Door w={w} h={NH} light={0.8} />
              )}
            </div>
            {d.k < 1 && NW - w > 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: left + w,
                  top: FLOOR - NH,
                  width: NW - w,
                  height: NH,
                  opacity: p,
                  background: `repeating-linear-gradient(135deg, ${C.red}aa 0 6px, transparent 6px 12px)`,
                  border: `2px dashed ${C.red}`,
                  boxSizing: "border-box",
                }}
              />
            ) : null}
            <div style={{ position: "absolute", left: left + NW / 2, top: FLOOR + 18, transform: "translateX(-50%)", opacity: p, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: d.dashed ? C.gold : C.fg, whiteSpace: "nowrap" }}>{d.y}</div>
            {d.tag ? (
              <div style={{ position: "absolute", left: left + NW / 2, top: FLOOR - NH - 80, transform: "translateX(-50%)", opacity: pr(t, 88.58 + i * 0.5, 0.35), fontFamily: FONT, fontSize: 48, fontWeight: 900, color: d.dashed ? C.gold : C.red, whiteSpace: "nowrap" }}>{d.tag}</div>
            ) : null}
          </React.Fragment>
        );
      })}
      <Line at={88.08} text="照这个速度，门还会更窄。" kw="更窄" kwAt={89.58} />
      <Src at={88.4}>22–25 岁、AI 最容易做的岗位的雇佣人数 · 2028 年为本片推算：按 2022-11 → 2026-06 的速度直线外推，不是预测</Src>
    </AbsoluteFill>
  );
};

// ── 1:32–1:36 · Quiet. B's near-silent bar: a graduate in front of the narrow door, dust in the light. ──
export const Quiet: React.FC = () => {
  const t = useT();
  const k = pr(t, 92.08, 4, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[50, 62]} strength={0.1} />
      <Cam keys={[[92.08, 0, 0, 1], [96.2, 0, -20, 1.07]]}>
        <div style={{ position: "absolute", left: 0, right: 0, top: FLOOR, height: 2, background: C.line }} />
        <div style={{ position: "absolute", left: 960 - 134, top: FLOOR - 420 }}>
          <Door w={268} h={420} light={0.9} />
        </div>
        {Array.from({ length: 26 }).map((_, i) => {
          const x0 = 960 + (random(`dq${i}`) - 0.5) * 360;
          const y0 = FLOOR - random(`dy${i}`) * 520;
          const drift = ((t - 92.08) * (8 + random(`dv${i}`) * 10)) % 120;
          return <div key={i} style={{ position: "absolute", left: x0 + Math.sin(t * 0.8 + i) * 10, top: y0 - drift, width: 4, height: 4, borderRadius: 2, background: C.gold, opacity: 0.35 * (1 - drift / 120) * pr(t, 92.3, 0.6) }} />;
        })}
        <div style={{ position: "absolute", left: 960 - 75, top: FLOOR + 40 - 300 }}>
          <Person h={300} color="#2a3038" head="#2a3038" cap={1} />
        </div>
      </Cam>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140, background: `linear-gradient(0deg, ${C.bg}, transparent)`, opacity: k }} />
    </AbsoluteFill>
  );
};

// ── 1:36–1:40 · Cohort: four years is one class of university students, and in their four years AI's task length went
// from 4 minutes to 17 hours. ──
const YEARS4 = [
  { n: "大一", y: "2022–23", who: "GPT-4", len: "4 分钟", m: 4 },
  { n: "大二", y: "2023–24", who: "GPT-4o", len: "7 分钟", m: 7 },
  { n: "大三", y: "2024–25", who: "o3", len: "2 小时", m: 120 },
  { n: "大四", y: "2025–26", who: "Claude Mythos", len: "17 小时", m: 1045 },
];
const TL = { x: 200, w: 1520, y: 560 };
export const Cohort: React.FC = () => {
  const t = useT();
  const seg = TL.w / 4;
  const prog = pr(t, 96.33, 2.25, EIO);
  const cap = pr(t, 98.58, 0.5, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[50, 60]} strength={0.1} />
      <div style={{ position: "absolute", left: TL.x, top: TL.y, width: TL.w, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: TL.x, top: TL.y, width: TL.w * prog, height: 14, borderRadius: 7, background: `linear-gradient(90deg, ${C.cyan}, ${C.gold})` }} />
      {YEARS4.map((s, i) => {
        const p = pr(t, 96.58 + i * 0.5, 0.4, EBACK);
        const x = TL.x + i * seg;
        const bar = (Math.log(s.m) / Math.log(1045)) * (seg - 60);
        return (
          <React.Fragment key={s.n}>
            <div style={{ position: "absolute", left: x, top: TL.y - 6, width: 2, height: 26, background: C.line }} />
            <div style={{ position: "absolute", left: x + 20, top: TL.y - 74, opacity: p, fontFamily: FONT, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: C.fg }}>{s.n}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: C.muted, marginLeft: 12 }}>{s.y}</span>
            </div>
            <div style={{ position: "absolute", left: x + 20, top: TL.y + 50, opacity: p, transform: `translateY(${(1 - p) * 20}px)`, fontFamily: FONT, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.sub }}>AI 能独立干的活</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: i === 3 ? C.gold : C.cyan, marginTop: 4 }}>{s.len}</div>
              <div style={{ width: Math.max(8, bar * p), height: 12, borderRadius: 6, background: i === 3 ? C.gold : C.cyan, marginTop: 10 }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: C.muted, marginTop: 10 }}>{s.who}</div>
            </div>
          </React.Fragment>
        );
      })}
      <Label x={TL.x} y={TL.y - 140} size={24} color={C.muted} at={96.33}>
        入学三个月，ChatGPT 发布
      </Label>
      <div style={{ position: "absolute", left: TL.x + TL.w, top: TL.y + 7, transform: `translate(-50%, -100%) scale(${cap})`, transformOrigin: "50% 100%", opacity: Math.min(1, cap * 2) }}>
        <Person h={120} color="#8b95a3" cap={1} />
      </div>
      <Label x={TL.x + TL.w} y={TL.y + 50} anchor="right" size={26} color={C.gold} at={98.83} weight={900}>
        毕业 · 2026
      </Label>
      <Line at={96.08} text="四年，正好是一届大学生。" kw="一届大学生" kwAt={97.58} />
      <Src at={96.4}>METR：各学年里当时最强模型能有一半把握独立完成的任务长度（GPT-4 2023-03、GPT-4o 2024-05、o3 2025-04、Claude Mythos Preview 2026-04）</Src>
    </AbsoluteFill>
  );
};

// ── 1:40–1:44 · Balance: the door narrowed, but the same AI hands the newcomer a two-day tool. ──
export const Balance: React.FC = () => {
  const t = useT();
  const fly = pr(t, 101.08, 0.7, EIO);
  const glow = pr(t, 101.58, 0.4, EO);
  const bx = lerp(1700, 1050, fly);
  const by = lerp(420, 700, fly);
  return (
    <AbsoluteFill>
      <Backdrop glow={glow > 0.5 ? C.cyan : C.gold} at={[55, 65]} strength={0.12} />
      <div style={{ position: "absolute", left: 0, right: 0, top: FLOOR, height: 2, background: C.line }} />
      <div style={{ position: "absolute", left: 560 - 134, top: FLOOR - 420, opacity: pr(t, 100.08, 0.3) }}>
        <Door w={268} h={420} light={0.8} />
      </div>
      <Label x={560} y={FLOOR - 490} anchor="center" size={30} color={C.red} at={100.33} weight={900}>
        门：−11%
      </Label>
      <div style={{ position: "absolute", left: 900, top: FLOOR - 300 }}>
        <Person h={300} color="#8b95a3" cap={1} tool={0} />
      </div>
      {/* the tool: the 17-hour bar from the task scene */}
      <div style={{ position: "absolute", left: bx, top: by, transform: `rotate(${(1 - fly) * -12}deg)`, opacity: pr(t, 100.58, 0.3) }}>
        <div style={{ width: 360, height: 54, borderRadius: 12, background: `linear-gradient(90deg, ${C.cyan}cc, ${C.cyan})`, boxShadow: `0 0 ${20 + 40 * glow}px ${C.cyan}`, display: "flex", alignItems: "center", paddingLeft: 18, fontFamily: FONT, fontSize: 26, fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>
          AI · 能独立干 17 小时的活
        </div>
      </div>
      <Label x={1240} y={FLOOR - 470} anchor="center" size={30} color={C.cyan} at={101.83} weight={900}>
        手里：一个能干两天活的帮手
      </Label>
      <Line at={100.08} text="门窄了，新人的工具也强了。" kw="工具也强了" kwAt={101.58} />
    </AbsoluteFill>
  );
};

// ── 1:44–1:48 · The last line, centred: AI changed the starting line first. A gold start line draws under the
// newcomer. ──
export const Final: React.FC = () => {
  const t = useT();
  const line = pr(t, 104.58, 0.9, EIO);
  const step = pr(t, 105.58, 0.5, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[50, 70]} strength={0.12 + 0.08 * line} />
      <div style={{ position: "absolute", left: 960 - 760, top: 860, width: 1520, height: 3, borderTop: `3px dashed ${C.dim}`, opacity: 1 - line }} />
      <div style={{ position: "absolute", left: 960 - 760, top: 820, width: 1520 * line, height: 6, borderRadius: 3, background: C.gold, boxShadow: `0 0 24px ${C.gold}88` }} />
      <div style={{ position: "absolute", left: 960 - 60, top: lerp(860, 820, step) - 240 }}>
        <Person h={240} color="#8b95a3" cap={1} tool={1} />
      </div>
      <Label x={960} y={840} anchor="center" size={26} color={C.gold} at={105.83} weight={900}>
        起点
      </Label>
      <Line at={104.08} center y={380} size={120} text="AI 先改变的，是起点。" kw="起点" kwAt={105.58} />
    </AbsoluteFill>
  );
};

// ── 1:48–1:52 · End card: the ball, 世界的形状, MakerJackie. ──
export const EndCard: React.FC = () => {
  const t = useT();
  const mark = pr(t, 108.08, 0.8, EBACK);
  const name = pr(t, 108.58, 0.7, EO);
  const by = pr(t, 109.33, 0.6, EO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} strength={0.08 * mark} />
      <div style={{ position: "absolute", left: 960 - 110, top: 290, width: 220, height: 220 }}>
        <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.2 * mark}) 0%, transparent 70%)` }} />
        <Img src={staticFile("brand/mark-disc.png")} style={{ width: 220, height: 220, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -40}px) scale(${0.7 + 0.3 * mark})` }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: SERIF, fontSize: 120, fontWeight: 700, color: C.fg, letterSpacing: 16, opacity: name, transform: `translateY(${(1 - name) * 24}px)` }}>世界的形状</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.muted, letterSpacing: 4, opacity: by }}>MakerJackie</div>
    </AbsoluteFill>
  );
};
