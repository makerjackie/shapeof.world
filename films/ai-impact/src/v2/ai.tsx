import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Odometer } from "../fx";
import { WAU, yr } from "../data";
import { FONT } from "../theme";
import { Mail, Person } from "./art";
import { Backdrop, C, Cam, EBACK, EIO, EO, Label, lerp, Line, pr, Src, useT } from "./kit";

// ── 0:42–0:50 · Task length: work days on a calendar. We start close on the first hour, where GPT-4's 4 minutes is a
// sliver (a reply to one email); the camera pulls out as the fill runs across two days and into a third. ──
const DAY = { x: 300, w: 1440, y0: 470, h: 84, gap: 46 };
const PX_H = DAY.w / 8; // pixels per hour
const STEPS: { at: number; m: number; who: string; when: string }[] = [
  { at: 42.08, m: 4, who: "GPT-4", when: "2023.03" },
  { at: 44.58, m: 203, who: "GPT-5", when: "2025.08" },
  { at: 45.08, m: 719, who: "Claude Opus 4.6", when: "2026.02" },
  { at: 46.08, m: 1045, who: "Claude Mythos Preview", when: "2026.04" },
];
export const TASK_STEPS = STEPS;
const minutesAt = (t: number) => {
  let m = STEPS[0].m;
  for (let i = 1; i < STEPS.length; i++) m = lerp(m, STEPS[i].m, pr(t, STEPS[i].at - 0.3, 0.45, EIO));
  return m;
};
const dayY = (d: number) => DAY.y0 + d * (DAY.h + DAY.gap);
const ZOOM = 4;
const FOCUS = { x: DAY.x + 30, y: dayY(0) + DAY.h / 2 }; // the first minutes of day 1
const ZOOM_KEY: [number, number, number, number] = [0, 700 - 960 - ZOOM * (FOCUS.x - 960), 650 - 540 - ZOOM * (FOCUS.y - 540), ZOOM];
const fmtLen = (m: number) => (m < 59.5 ? `${Math.round(m)} 分钟` : `${(m / 60).toFixed(1)} 小时`);

export const Task: React.FC = () => {
  const t = useT();
  const m = minutesAt(t);
  const zoomOut = pr(t, 44.08, 0.9, EIO);
  const close = 1 - zoomOut;
  const final = t >= 46.08 ? Math.max(0, 1 - (t - 46.08) / 0.35) : 0;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[50, 62]} strength={0.1 + 0.08 * zoomOut} />
      <Cam keys={[[42.08, ...ZOOM_KEY.slice(1)] as [number, number, number, number], [44.08, ...ZOOM_KEY.slice(1)] as [number, number, number, number], [44.98, 0, 0, 1]]}>
        {/* hour ticks */}
        {Array.from({ length: 9 }).map((_, h) => (
          <div key={h} style={{ position: "absolute", left: DAY.x + h * PX_H, top: dayY(0) - 44, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.muted, opacity: zoomOut }}>
            {9 + h}:00
          </div>
        ))}
        {[0, 1, 2].map((d) => {
          const filled = Math.max(0, Math.min(8, m / 60 - d * 8));
          return (
            <React.Fragment key={d}>
              <div style={{ position: "absolute", left: 160, top: dayY(d) + DAY.h / 2 - 18, fontFamily: FONT, fontSize: 28, fontWeight: 900, color: d === 2 ? C.muted : C.sub, opacity: zoomOut }}>第 {d + 1} 天</div>
              <div style={{ position: "absolute", left: DAY.x, top: dayY(d), width: d === 2 ? PX_H * 2 : DAY.w, height: DAY.h, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: `1px ${d === 2 ? "dashed" : "solid"} ${C.glassLine}`, overflow: "hidden" }}>
                {Array.from({ length: d === 2 ? 2 : 8 }).map((__, h) => (
                  <div key={h} style={{ position: "absolute", left: h * PX_H, top: 0, bottom: 0, width: 1, background: h ? C.line : "transparent" }} />
                ))}
                {d === 0
                  ? Array.from({ length: 11 }).map((__, k) => (
                      <div key={`m${k}`} style={{ position: "absolute", left: (k + 1) * (PX_H / 12), top: DAY.h - 10, width: 1, height: 10, background: C.line, opacity: close }} />
                    ))
                  : null}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: filled * PX_H,
                    background: `linear-gradient(90deg, ${C.cyan}cc, ${C.cyan})`,
                    boxShadow: `0 0 30px ${C.cyan}66`,
                    borderRadius: 10,
                  }}
                />
              </div>
            </React.Fragment>
          );
        })}
        {/* the 4-minute email, drawn in the zoomed world */}
        <div style={{ position: "absolute", left: DAY.x + 22, top: dayY(0) - 20, opacity: close * pr(t, 42.58, 0.3), transform: "scale(0.25)", transformOrigin: "0 0" }}>
          <Mail w={64} color={C.fg} />
        </div>
      </Cam>
      {/* close-up callouts in screen space */}
      <div style={{ position: "absolute", left: 780, top: 290, opacity: (1 - pr(t, 44.08, 0.3)) * pr(t, 42.58, 0.35), fontFamily: FONT, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: C.cyan, lineHeight: 1 }}>4 分钟</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: C.sub, marginTop: 14 }}>大约回一封邮件 · GPT-4，2023 年</div>
      </div>
      {/* readout */}
      <div style={{ position: "absolute", right: 120, top: 300, textAlign: "right", fontFamily: FONT, whiteSpace: "nowrap", opacity: pr(t, 44.75, 0.3) }}>
        <div style={{ fontSize: 110, fontWeight: 900, color: t >= 46.08 ? C.gold : C.fg, fontVariantNumeric: "tabular-nums", lineHeight: 1, transform: `scale(${1 + 0.08 * final})`, transformOrigin: "100% 50%" }}>{fmtLen(m)}</div>
      </div>
      {/* the models */}
      <div style={{ position: "absolute", left: 160, top: 900, display: "flex", gap: 16, opacity: pr(t, 44.75, 0.3) }}>
        {STEPS.map((s) => {
          const on = t >= s.at - 0.1;
          const cur = on && STEPS.filter((x) => t >= x.at - 0.1).slice(-1)[0] === s;
          return (
            <div
              key={s.who}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                fontFamily: FONT,
                fontSize: 22,
                fontWeight: 800,
                whiteSpace: "nowrap",
                background: cur ? `${C.cyan}2a` : "rgba(255,255,255,0.05)",
                border: `1px solid ${cur ? C.cyan : C.glassLine}`,
                color: on ? C.fg : C.dim,
              }}
            >
              {s.who} <span style={{ color: on ? C.sub : C.dim, fontWeight: 700 }}>· {s.when}</span>
            </div>
          );
        })}
      </div>
      <Line at={42.08} text="AI 独立干完的活，" />
      <Line at={46.08} y={262} text="从 4 分钟，长到两天。" kw="两天" kwAt={47.08} />
      <Src at={42.4}>METR（美国 AI 评测机构）：AI 有一半把握独立完成的任务，按人类专家所需时间计 · 一个工作日按 8 小时算 · 1,045 分钟 ≈ 17.4 小时</Src>
    </AbsoluteFill>
  );
};

// ── 0:50–0:56 · Usage: a crowd; one in every seven lights up. ChatGPT's weekly users climb to 12 亿. ──
const COLS = 14;
const ROWS = 6;
const PB = { x: 1180, y: 690, w: 600, h: 230 };
const W0 = yr(WAU[0][0]);
const W1 = yr(WAU[WAU.length - 1][0]);
const wx = (d: string) => PB.x + ((yr(d) - W0) / (W1 - W0)) * PB.w;
const wy = (v: number) => PB.y + PB.h - (v / 12) * PB.h;

export const Usage: React.FC = () => {
  const t = useT();
  const draw = pr(t, 50.58, 2, EIO);
  const n = Math.max(1, Math.ceil(draw * (WAU.length - 1)));
  const pts = WAU.slice(0, n + 1).map(([d, v]) => [wx(d), wy(v)] as [number, number]);
  const users = 1 + 11 * draw;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[35, 70]} strength={0.14} />
      {Array.from({ length: COLS * ROWS }).map((_, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        const lit = i % 7 === Math.floor(random(`grp${Math.floor(i / 7)}`) * 7);
        const pin = pr(t, 50.08 + (c + r) * 0.02, 0.35, EO);
        const on = lit ? pr(t, 51.08 + (Math.floor(i / 7) % 12) * 0.08, 0.3, EBACK) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 150 + c * 66, top: 440 + r * 86 + (1 - pin) * 20, opacity: pin * (lit ? 1 : lerp(0.9, 0.55, pr(t, 51.08, 0.5))) }}>
            <Person h={70} color={on > 0.5 ? C.cyan : "#4a5361"} head={on > 0.5 ? "#bfefff" : "#5a6472"} phone={on} />
          </div>
        );
      })}
      <Label x={PB.x} y={440} size={26} color={C.sub} at={50.33} weight={800}>
        ChatGPT 每周用户（OpenAI 自报）
      </Label>
      <div style={{ position: "absolute", left: PB.x - 6, top: 480, opacity: pr(t, 50.4, 0.3) }}>
        <Odometer value={users} size={130} suffix=" 亿人" color={draw >= 1 ? C.cyan : C.fg} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={PB.x} y1={PB.y + PB.h} x2={PB.x + PB.w} y2={PB.y + PB.h} stroke={C.line} strokeWidth={2} />
        {pts.length > 1 ? <path d={pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("")} fill="none" stroke={C.cyan} strokeWidth={5} strokeLinejoin="round" /> : null}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={6} fill={C.bg} stroke={C.cyan} strokeWidth={3} />
        ))}
      </svg>
      <Label x={PB.x} y={PB.y + PB.h + 12} size={20} color={C.muted} at={50.6}>
        2023.11
      </Label>
      <Label x={PB.x + PB.w} y={PB.y + PB.h + 12} anchor="right" size={20} color={C.muted} at={52.6}>
        2026.09
      </Label>
      <Label x={PB.x} y={PB.y + PB.h + 52} size={26} color={C.fg} at={53.08} weight={800}>
        ÷ 全世界约 83 亿人 ≈ 每 7 人 1 个
      </Label>
      <Line at={50.08} text="每 7 个人里，就有 1 个在用它。" kw="1 个" kwAt={51.58} />
      <Src at={50.4}>ChatGPT 每周活跃用户：OpenAI 自报，2026-09 约 12 亿 · 世界人口约 83 亿（联合国）· "每 7 人 1 个"为推算，只算 ChatGPT 一家</Src>
    </AbsoluteFill>
  );
};
