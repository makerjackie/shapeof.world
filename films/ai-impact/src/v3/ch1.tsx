import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Odometer } from "../fx";
import { FONT, SERIF } from "../theme";
import { Mail, Person, Silhouette } from "../v2/art";
import { AI_MARKS, Frame, Marks } from "./door";
import { Backdrop, C, clamp01, EBACK, EIO, EO, lerp, Lines, pr, Src, useT } from "./kit";
import { BAR, BEAT, bar } from "./timing";

// 01 惊奇 · 片中 10–20. People rush in; it is tiny (4 minutes on the door frame); it grows fast (medals, the exam-week
// switch-off); today one person in seven talks to it every week.

export const CH1 = {
  s6: ["5 天，100 万人；", "2 个月，1 亿人。"],
  s7: ["那时它能独自干的，", "只是人干 4 分钟的活。"],
  s8: ["奥数金牌、诺贝尔奖，", "都跟 AI 有关了。"],
  s9: ["聪明到高考那几天，", "AI 得关掉拍照识题。"],
  s10: ["今天每 7 个人里，", "就有 1 个每周找它。"],
} as const;

// ── 6 · bars 10–12: chat bubbles multiply, then the race to 100 million users ──
export const RACE = { from: bar(11), dur: BAR * 0.86 };
export const raceMonthAt = (m: number) => RACE.from + (m / 9) * RACE.dur;
export const Rush: React.FC = () => {
  const t = useT();
  const b0 = bar(10);
  const g = pr(t, b0 + 0.1, BAR * 0.85, EIO);
  const n = Math.max(1, Math.round(lerp(1, 260, Math.pow(g, 2.4))));
  const bubblesOut = pr(t, bar(11) - 0.15, 0.4, EIO);
  const count = lerp(0, 1_000_000, pr(t, b0 + 0.2, BAR * 0.8, EIO));
  const day = Math.min(5, 1 + Math.floor(pr(t, b0 + 0.2, BAR * 0.8, (x) => x) * 5));
  const m = 9 * pr(t, RACE.from, RACE.dur, (x) => x);
  const raceIn = pr(t, bar(11) - 0.1, 0.4, EO);
  const gpt = clamp01(m / 2);
  const tik = clamp01(m / 9);
  const stamp = pr(t, raceMonthAt(2), 0.3, EBACK);
  const TX = 1000;
  const TW = 700;
  const lanes = [
    { y: 560, name: "ChatGPT", color: C.cyan, p: gpt, done: m >= 2, label: m >= 2 ? "2 个月" : `${Math.floor(m)} 个月` },
    { y: 720, name: "TikTok（抖音海外版）", color: "#8e96a3", p: tik, done: m >= 9, label: `${Math.min(9, Math.floor(m))} 个月` },
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[66, 58]} strength={0.14} />
      {/* bubbles */}
      <div style={{ position: "absolute", left: 0, top: 0, opacity: 1 - bubblesOut }}>
        {Array.from({ length: n }).map((_, i) => {
          const col = i % 26;
          const row = Math.floor(i / 26);
          const jx = random(`bx${i}`) * 14;
          const born = pr(t, b0 + 0.1 + Math.pow(i / 260, 1 / 2.4) * BAR * 0.85, 0.25, EBACK);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 640 + col * 46 + jx,
                top: 400 + row * 52 + (col % 2) * 14,
                width: 34,
                height: 22,
                borderRadius: 9,
                background: i % 5 === 0 ? "rgba(77,212,255,0.55)" : "rgba(244,240,232,0.16)",
                transform: `scale(${born})`,
                opacity: 0.9,
              }}
            />
          );
        })}
        <div style={{ position: "absolute", left: 120, top: 520, fontFamily: FONT }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.sub, opacity: day >= 5 && count >= 999_999 ? 1 : 0 }}>上线第 5 天</div>
          <Odometer value={count} size={110} color={C.fg} />
          <div style={{ fontSize: 34, fontWeight: 800, color: C.cyan, marginTop: 6 }}>个用户</div>
        </div>
      </div>
      {/* race to 100 million */}
      {raceIn > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: raceIn }}>
          <div style={{ position: "absolute", left: TX + TW, top: 470, width: 4, height: 360, background: C.gold, borderRadius: 2 }} />
          <div style={{ position: "absolute", left: TX + TW, top: 430, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: C.gold, whiteSpace: "nowrap" }}>1 亿用户</div>
          {lanes.map((l) => (
            <React.Fragment key={l.name}>
              <div style={{ position: "absolute", left: TX - 30, top: l.y + 6, transform: "translateX(-100%)", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: l.color, whiteSpace: "nowrap" }}>{l.name}</div>
              <div style={{ position: "absolute", left: TX, top: l.y, width: TW, height: 56, borderRadius: 28, background: "rgba(244,240,232,0.07)" }} />
              <div style={{ position: "absolute", left: TX, top: l.y, width: Math.max(56, TW * l.p), height: 56, borderRadius: 28, background: l.color, boxShadow: l.done ? `0 0 30px ${l.color}` : undefined }} />
              <div style={{ position: "absolute", left: TX + Math.max(56, TW * l.p) + 18, top: l.y + 6, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: C.fg, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {l.label}
              </div>
            </React.Fragment>
          ))}
          {Array.from({ length: 10 }).map((_, k) => (
            <div key={k} style={{ position: "absolute", left: TX + (k / 9) * TW, top: 830, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.muted }}>
              {k}
            </div>
          ))}
          <div style={{ position: "absolute", left: TX + TW / 2, top: 866, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>上线后第几个月</div>
          {stamp > 0 ? (
            <div
              style={{
                position: "absolute",
                left: TX + TW - 20,
                top: 632,
                transform: `translateX(-100%) rotate(-6deg) scale(${1 + (1 - stamp) * 1.2})`,
                opacity: Math.min(1, stamp * 2),
                padding: "2px 16px",
                border: `5px solid ${C.gold}`,
                borderRadius: 12,
                color: C.gold,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 40,
                background: "rgba(7,9,11,0.6)",
                whiteSpace: "nowrap",
              }}
            >
              史上最快
            </div>
          ) : null}
        </div>
      ) : null}
      <Lines at={b0} a={CH1.s6[0]} b={CH1.s6[1]} out={bar(12) - 0.05} />
      <Src at={b0 + 0.3}>5 天 100 万：OpenAI CEO Altman 2022-12-05 发帖（自报）· 2 个月 1 亿：UBS 引 Similarweb 估算的月活；TikTok 约 9 个月</Src>
    </AbsoluteFill>
  );
};

// ── 7 · bars 12–14: the door frame appears; the first mark, 4 minutes ──
export const DOOR = { x: 1200, floor: 1000, w: 400, h: 720 };
export const FirstMark: React.FC = () => {
  const t = useT();
  const b0 = bar(12);
  const grow = pr(t, b0, 0.9, EO);
  const markAt = b0 + 2 * BEAT;
  const mail = pr(t, markAt + 0.35, 0.4, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[70, 60]} strength={0.1} />
      <Frame x={DOOR.x} floor={DOOR.floor} w={DOOR.w} h={DOOR.h} grow={grow} />
      <div style={{ position: "absolute", left: DOOR.x, top: DOOR.floor - DOOR.h - 56, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 26, color: C.cyan, opacity: pr(t, b0 + 0.6, 0.4), whiteSpace: "nowrap", letterSpacing: 2 }}>
        AI 能独自干完的活
      </div>
      <Marks t={t} x={DOOR.x} floor={DOOR.floor} w={DOOR.w} labelSize={38} marks={[{ min: AI_MARKS.m4, label: "人干 4 分钟的活", sub: "≈ 回一封邮件", at: markAt }]} />
      {mail > 0 ? (
        <div style={{ position: "absolute", left: DOOR.x + DOOR.w / 2 + 62, top: DOOR.floor - 120 + 62, transform: `scale(${mail})`, transformOrigin: "0 0", opacity: Math.min(1, mail) }}>
          <Mail w={64} color={C.sub} />
        </div>
      ) : null}
      <Lines at={b0} a={CH1.s7[0]} b={CH1.s7[1]} out={bar(14) - 0.05} />
      <Src at={b0 + 0.3}>METR（美国 AI 评测机构）：GPT-4，2023 年 3 月；AI 有一半把握独自做完的任务，按人类专家做同样任务的耗时计</Src>
    </AbsoluteFill>
  );
};

// ── 8 · bars 14–16: one olympiad gold, two Nobel medals ──
const Medal: React.FC<{ r: number; ribbon: [string, string]; inner: React.ReactNode; shine: number }> = ({ r, ribbon, inner, shine }) => (
  <div style={{ position: "relative", width: r * 2, height: r * 2 + 260 }}>
    <svg width={r * 2} height={260} viewBox={`0 0 ${r * 2} 260`} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M${r - 70},0 L${r - 22},${260} L${r + 22},${260} L${r - 10},0 Z`} fill={ribbon[0]} />
      <path d={`M${r + 70},0 L${r + 22},${260} L${r - 22},${260} L${r + 10},0 Z`} fill={ribbon[1]} />
    </svg>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 240,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #fff4c2, #f2c44f 35%, #b98a22 75%, #7d5a12)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 6px rgba(255,240,190,0.35)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: r * 0.16, borderRadius: "50%", border: "3px solid rgba(110,78,14,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>{inner}</div>
      <div style={{ position: "absolute", top: -r, bottom: -r, width: r * 0.5, left: lerp(-r, r * 2.4, shine), transform: "rotate(25deg)", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }} />
    </div>
  </div>
);
const MedalText: React.FC<{ a: string; b: string }> = ({ a, b }) => (
  <div style={{ textAlign: "center", fontFamily: SERIF, color: "rgba(90,62,10,0.85)", lineHeight: 1.15 }}>
    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>{a}</div>
    <div style={{ fontSize: 34, fontWeight: 700, fontFamily: FONT }}>{b}</div>
  </div>
);
export const Medals: React.FC = () => {
  const t = useT();
  const b0 = bar(14);
  const items = [
    { at: b0 + 0.05, x: 700, ribbon: ["#2f6fb0", "#1d4f86"] as [string, string], inner: <MedalText a="IMO" b="35/42" />, title: "国际数学奥赛金牌线", sub: "谷歌 Gemini · 2025 · 官方认证" },
    { at: b0 + 2 * BEAT, x: 1100, ribbon: ["#26385a", "#c9a24a"] as [string, string], inner: <MedalText a="诺贝尔" b="2024" />, title: "诺贝尔物理学奖", sub: "神经网络的奠基人 · 2024" },
    { at: b0 + 4 * BEAT, x: 1500, ribbon: ["#26385a", "#c9a24a"] as [string, string], inner: <MedalText a="诺贝尔" b="2024" />, title: "诺贝尔化学奖", sub: "用 AI 预测蛋白质结构 · 2024" },
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[60, 55]} strength={0.1} />
      {items.map((it, i) => {
        const p = pr(t, it.at, 0.55, EBACK);
        if (p <= 0) return null;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: it.x - 115, top: lerp(-560, 330, p) }}>
              <Medal r={115} ribbon={it.ribbon} inner={it.inner} shine={pr(t, it.at + 0.5, 0.7, EIO)} />
            </div>
            <div style={{ position: "absolute", left: it.x, top: 830, transform: "translateX(-50%)", opacity: pr(t, it.at + 0.35, 0.4), textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.fg }}>{it.title}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.muted, marginTop: 6 }}>{it.sub}</div>
            </div>
          </React.Fragment>
        );
      })}
      <Lines at={b0} a={CH1.s8[0]} b={CH1.s8[1]} out={bar(16) - 0.05} />
      <Src at={b0 + 0.3}>2025 国际数学奥赛，谷歌 Gemini Deep Think 35/42，官方认证 · 2024 诺贝尔物理学奖 Hinton、Hopfield；化学奖 Hassabis、Jumper、Baker</Src>
    </AbsoluteFill>
  );
};

// ── 9 · bars 16–18: exam week, the photo-a-question feature is switched off ──
export const SHUTTER_AT = bar(16) + 3 * BEAT;
export const Exam: React.FC = () => {
  const t = useT();
  const b0 = bar(16);
  const phoneIn = pr(t, b0, 0.5, EO);
  const flash = Math.max(0, 1 - Math.abs(t - SHUTTER_AT - 0.05) / 0.12);
  const modal = pr(t, SHUTTER_AT + 0.35, 0.4, EBACK);
  const P = { x: 1180, y: 250, w: 380, h: 760 };
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[66, 55]} strength={0.1} />
      <div style={{ position: "absolute", left: P.x, top: P.y + (1 - phoneIn) * 80, width: P.w, height: P.h, opacity: phoneIn, borderRadius: 54, background: "#0f1318", border: "8px solid #2a313b", boxShadow: "0 50px 100px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 18, textAlign: "center", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.sub }}>2025 年 6 月 7 日 · 9:05</div>
        {/* viewfinder with the paper */}
        <div style={{ position: "absolute", left: 22, right: 22, top: 66, height: 500, borderRadius: 18, background: "#232a33", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 30, right: 30, top: 34, bottom: 30, background: "#ece6da", transform: "rotate(-3deg)", padding: 22, boxSizing: "border-box", fontFamily: SERIF, color: C.ink }}>
            <div style={{ fontSize: 17, fontWeight: 700, textAlign: "center" }}>普通高等学校招生全国统一考试</div>
            <div style={{ fontSize: 26, fontWeight: 700, textAlign: "center", margin: "8px 0 14px" }}>数 学</div>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ height: 8, borderRadius: 4, background: "rgba(25,35,31,0.35)", width: `${[96, 88, 70, 92, 60, 94, 82, 74, 50][i]}%`, margin: "12px 0" }} />
            ))}
          </div>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} style={{ position: "absolute", width: 34, height: 34, borderColor: C.fg, borderStyle: "solid", borderWidth: 0, ...(k === 0 ? { left: 16, top: 16, borderLeftWidth: 4, borderTopWidth: 4 } : k === 1 ? { right: 16, top: 16, borderRightWidth: 4, borderTopWidth: 4 } : k === 2 ? { left: 16, bottom: 16, borderLeftWidth: 4, borderBottomWidth: 4 } : { right: 16, bottom: 16, borderRightWidth: 4, borderBottomWidth: 4 }) }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: "50%", top: 610, width: 92, height: 92, marginLeft: -46, borderRadius: "50%", border: "6px solid #e9e4d9", boxSizing: "border-box", transform: `scale(${1 - 0.12 * Math.max(0, 1 - Math.abs(t - SHUTTER_AT) / 0.12)})` }}>
          <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "#e9e4d9" }} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 716, textAlign: "center", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.muted }}>拍照搜题</div>
        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash * 0.85 }} />
        {modal > 0 ? (
          <>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", opacity: Math.min(1, modal) }} />
            <div style={{ position: "absolute", left: 26, right: 26, top: 220, borderRadius: 26, background: "#1c222a", border: `1px solid ${C.glassLine}`, padding: "30px 26px", transform: `scale(${modal})`, opacity: Math.min(1, modal), fontFamily: FONT, textAlign: "center" }}>
              <svg width="48" height="56" viewBox="0 0 48 56" style={{ display: "block", margin: "0 auto 16px" }}>
                <rect x="6" y="24" width="36" height="28" rx="6" fill={C.gold} />
                <path d="M14,24 L14,16 Q14,6 24,6 Q34,6 34,16 L34,24" fill="none" stroke={C.gold} strokeWidth="5" />
              </svg>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.fg, lineHeight: 1.55, whiteSpace: "nowrap" }}>为确保高考的公平性，</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.fg, lineHeight: 1.55, whiteSpace: "nowrap" }}>此项功能在高考时段无法使用</div>
              <div style={{ margin: "24px auto 0", width: 180, height: 56, borderRadius: 28, background: "rgba(244,240,232,0.12)", color: C.fg, fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>知道了</div>
            </div>
          </>
        ) : null}
      </div>
      <Lines at={b0} a={CH1.s9[0]} b={CH1.s9[1]} out={bar(18) - 0.05} />
      <Src at={b0 + 0.3}>2025 年高考期间，通义千问、豆包、Kimi、腾讯元宝暂停识图或拍题（IT 之家，2025-06-09）· 弹窗文字为平台原话 · 画面为示意</Src>
    </AbsoluteFill>
  );
};

// ── 10 · bars 18–20: one in seven people talks to it every week; China lights up separately ──
export const Seven: React.FC = () => {
  const t = useT();
  const b0 = bar(18);
  const rows = 5;
  const shades = ["#4a5462", "#56606e", "#3f4855", "#5d6776"];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[50, 60]} strength={0.12} />
      {Array.from({ length: rows * 7 }).map((_, i) => {
        const r = Math.floor(i / 7);
        const c = i % 7;
        const lit = c === (r * 3 + 2) % 7;
        const on = lit ? pr(t, b0 + 0.4 + r * BEAT * 0.75, 0.35, EBACK) : 0;
        const x = 230 + c * 132;
        const y = 440 + r * 112;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, opacity: pr(t, b0 + r * 0.06, 0.35) }}>
            {on > 0 ? <div style={{ position: "absolute", left: -26, top: -14, width: 96, height: 110, borderRadius: 48, background: `radial-gradient(circle, rgba(77,212,255,${0.45 * on}), transparent 70%)` }} /> : null}
            <Person h={86} color={on > 0.5 ? C.cyan : shades[(i + r) % 4]} />
            {on > 0 ? (
              <div style={{ position: "absolute", left: 30, top: -20, width: 34, height: 24, borderRadius: 9, background: C.cyan, transform: `scale(${on})`, opacity: Math.min(1, on) }} />
            ) : null}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1290, top: 450, opacity: pr(t, b0 + 1.5, 0.5) }}>
        <div style={{ position: "relative", width: 460, height: 380 }}>
          <Silhouette id="156" w={460} h={380} fill={`rgba(255,209,102,${0.05 + 0.3 * pr(t, b0 + 1.7, 1.0, EIO)})`} stroke="rgba(255,209,102,0.6)" />
        </div>
        <div style={{ marginTop: 18, textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.gold }}>中国：6 亿人用 AI</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.muted, marginTop: 6 }}>大多用国产 AI · 占人口 43%</div>
        </div>
      </div>
      <Lines at={b0} a={CH1.s10[0]} b={CH1.s10[1]} out={bar(20) - 0.05} />
      <Src at={b0 + 0.3}>只算 ChatGPT：每周 12 亿用户（OpenAI 自报，2026-09）÷ 世界人口约 83 亿 · 中国生成式 AI 用户 6.02 亿，占人口 42.8%（CNNIC，2025-12）</Src>
    </AbsoluteFill>
  );
};
