// The film's set pieces that are not columns: the opening's free apps, the title, the token chips, the plan bill,
// the gym crowd, the relay arc, the check-and-rework demo, the two bills, the counters, sources and the end card.
// Times are film bars (bars.ts); positions on the map go through the same camera as the WebGL frame.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { bf } from "./bars";
import { Cam, toScreen } from "./camera";
import { FONT, K, MONO, SERIF } from "./theme";
import { clamp01, EIO, EO, SHADOW } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const useBar = () => {
  const f = useCurrentFrame();
  return f;
};
// 0→1 in, 1→0 out, over bars [a, b] with fades of `fi`/`fo` bars.
export const win = (frame: number, a: number, b: number, fi = 0.25, fo = 0.25) =>
  Math.min(interpolate(frame, [bf(a), bf(a + fi)], [0, 1], { ...CL, easing: EO }), interpolate(frame, [bf(b - fo), bf(b)], [1, 0], CL));

// ---------- opening: free apps lighting up over the cities ----------

export const FreeApps: React.FC<{ cam: Cam; a: number; b: number; apps: { name: string; at: [number, number]; dy: number }[] }> = ({ cam, a, b, apps }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <>
      {apps.map((p, i) => {
        const k = interpolate(frame, [bf(a + i * 0.12), bf(a + i * 0.12 + 0.3)], [0, 1], { ...CL, easing: EO });
        const [sx, sy, vis] = toScreen(cam, p.at[0], p.at[1], 0);
        if (!vis) return null;
        return (
          <div
            key={p.name}
            style={{
              position: "absolute",
              left: sx,
              top: sy + p.dy,
              transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * k})`,
              opacity: o * k,
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 800,
              color: K.fg,
              whiteSpace: "nowrap",
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(10,14,22,0.62)",
              border: "1.5px solid rgba(200,220,255,0.45)",
              boxShadow: "0 0 24px rgba(160,200,255,0.25)",
            }}
          >
            {p.name}
            <span style={{ fontSize: 20, fontWeight: 700, color: "#9fe6c4", marginLeft: 10 }}>免费</span>
          </div>
        );
      })}
    </>
  );
};

// ---------- title ----------

export const Title: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.35, 0.35);
  if (o <= 0) return null;
  const k = interpolate(frame, [bf(a), bf(a + 0.8)], [0, 1], { ...CL, easing: EO });
  const k2 = interpolate(frame, [bf(a + 0.4), bf(a + 1.1)], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 132, letterSpacing: 14, color: K.fg, textShadow: SHADOW, transform: `translateY(${(1 - k) * 22}px)`, opacity: k }}>AI 的真实价格</div>
      <div style={{ marginTop: 26, fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: 10, color: K.gold, textShadow: SHADOW, opacity: k2 }}>第 1 集 · 文字 AI</div>
      <div style={{ marginTop: 18, fontFamily: FONT, fontWeight: 500, fontSize: 26, letterSpacing: 4, color: K.sub, textShadow: SHADOW, opacity: k2 }}>数据截至 2026 年 10 月</div>
    </div>
  );
};

// ---------- what a token is ----------

export const TokenChips: React.FC<{ a: number; b: number; x: number; y: number }> = ({ a, b, x, y }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.25, 0.3);
  if (o <= 0) return null;
  const chars = Array.from("今天天气怎么样？");
  const split = interpolate(frame, [bf(a + 0.6), bf(a + 1.1)], [0, 1], { ...CL, easing: EIO });
  const count = interpolate(frame, [bf(a + 1.0), bf(a + 1.4)], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: o, display: "flex", alignItems: "center", gap: 26 }}>
      <div style={{ display: "flex", gap: 8 * split }}>
        {chars.map((c, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              color: K.fg,
              padding: `${4 + 6 * split}px ${2 + 10 * split}px`,
              borderRadius: 8,
              border: `2px solid rgba(255,209,102,${0.85 * split})`,
              background: `rgba(255,209,102,${0.1 * split})`,
              textShadow: SHADOW,
            }}
          >
            {c}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: K.gold, opacity: count, textShadow: SHADOW, whiteSpace: "nowrap" }}>≈ 8 个 token</div>
    </div>
  );
};

// ---------- the plan bill next to a column ----------

export const PlanBill: React.FC<{ a: number; b: number; left: number; top: number; rows: { at: number; left: string; right: React.ReactNode; gold?: boolean }[] }> = ({ a, b, left, top, rows }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        opacity: o,
        width: 560,
        padding: "22px 26px",
        borderRadius: 12,
        background: "rgba(12,15,22,0.82)",
        border: "1.5px solid rgba(255,255,255,0.16)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        fontFamily: FONT,
      }}
    >
      {rows.map((r, i) => {
        const k = interpolate(frame, [bf(r.at), bf(r.at + 0.3)], [0, 1], { ...CL, easing: EO });
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 18, opacity: k, transform: `translateY(${(1 - k) * 10}px)`, marginTop: i ? 12 : 0 }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: K.sub }}>{r.left}</span>
            <span style={{ fontSize: r.gold ? 52 : 40, fontWeight: 900, color: r.gold ? K.gold : K.fg }}>{r.right}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------- the gym: 100 members on the sea, most of them dark ----------

export const Gym: React.FC<{ cam: Cam; a: number; b: number; dimAt: number; pulseAt: number; center: [number, number]; gap: number }> = ({ cam, a, b, dimAt, pulseAt, center, gap }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.3, 0.4);
  if (o <= 0) return null;
  const heavy = new Set([7, 23, 48, 66, 91]); // the members who max out their plan
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const i = r * 10 + c;
      const x = center[0] + (c - 4.5) * gap;
      const y = center[1] - (r - 4.5) * gap;
      const [sx, sy, vis] = toScreen(cam, x, y, 0);
      if (!vis) continue;
      const [sx2] = toScreen(cam, x + gap * 0.5, y, 0);
      const size = Math.max(6, Math.abs(sx2 - sx) * 0.62);
      const appear = interpolate(frame, [bf(a + (i % 10) * 0.02 + r * 0.03), bf(a + 0.35 + (i % 10) * 0.02 + r * 0.03)], [0, 1], { ...CL, easing: EO });
      const isHeavy = heavy.has(i);
      const dim = isHeavy ? 0 : interpolate(frame, [bf(dimAt + (i % 7) * 0.05), bf(dimAt + 0.5 + (i % 7) * 0.05)], [0, 1], { ...CL, easing: EIO });
      const pulse = isHeavy ? 0.5 + 0.5 * Math.sin((frame - bf(pulseAt)) / 5) * clamp01((frame - bf(pulseAt)) / 10) : 0;
      const lit = 1 - dim * 0.82;
      const col = isHeavy ? `rgba(255,200,87,${0.95})` : `rgba(220,230,255,${0.85 * lit})`;
      dots.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: sx - size / 2,
            top: sy - size / 2,
            width: size,
            height: size,
            borderRadius: size,
            background: col,
            opacity: appear,
            boxShadow: isHeavy ? `0 0 ${10 + 14 * pulse}px rgba(255,200,87,0.9)` : `0 0 ${8 * lit}px rgba(200,220,255,${0.6 * lit})`,
          }}
        />,
      );
    }
  }
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{dots}</div>;
};

// ---------- the relay: an arc over the Pacific with three price tags ----------

export const RelayArc: React.FC<{ cam: Cam; a: number; b: number; from: [number, number]; to: [number, number]; peak: number; tags: { t: number; text: React.ReactNode; at: number; color: string }[] }> = ({
  cam,
  a,
  b,
  from,
  to,
  peak,
  tags,
}) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.2, 0.4);
  if (o <= 0) return null;
  const draw = interpolate(frame, [bf(a), bf(a + 1.0)], [0, 1], { ...CL, easing: EIO });
  const N = 72;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = from[0] + (to[0] - from[0]) * u;
    const y = from[1] + (to[1] - from[1]) * u;
    const h = Math.sin(Math.PI * u) * peak;
    const [sx, sy] = toScreen(cam, x, y, h);
    pts.push([sx, sy]);
  }
  const at = (u: number) => pts[Math.round(u * N)];
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="relay" x1="0" x2="1">
            <stop offset="0" stopColor="#ff9a5c" />
            <stop offset="1" stopColor="#ffd166" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={d} fill="none" stroke="url(#relay)" strokeWidth={4} strokeLinecap="round" filter="url(#glow)" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      </svg>
      {tags.map((g, i) => {
        const k = interpolate(frame, [bf(g.at), bf(g.at + 0.3)], [0, 1], { ...CL, easing: EO });
        const [px, py] = at(g.t);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py - 18,
              transform: `translate(-50%, -100%) translateY(${(1 - k) * 10}px)`,
              opacity: k,
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 800,
              color: g.color,
              whiteSpace: "nowrap",
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(10,13,20,0.78)",
              border: `1.5px solid ${g.color}88`,
              textShadow: SHADOW,
            }}
          >
            {g.text}
          </div>
        );
      })}
    </div>
  );
};

// ---------- your time: a piece of work, a check, a redo, a second check ----------

export const CheckRework: React.FC<{ a: number; b: number; x: number; y: number }> = ({ a, b, x, y }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.25, 0.35);
  if (o <= 0) return null;
  const cards = ["写方案", "查资料", "写代码"];
  const t = (bar: number) => interpolate(frame, [bf(bar), bf(bar + 0.35)], [0, 1], { ...CL, easing: EO });
  const fly = t(a);
  const clock1 = interpolate(frame, [bf(a + 0.4), bf(a + 1.05)], [0, 1], CL);
  const cross = t(a + 1.05);
  const back = interpolate(frame, [bf(a + 1.3), bf(a + 1.55)], [0, 1], { ...CL, easing: EIO });
  const clock2 = interpolate(frame, [bf(a + 1.65), bf(a + 2.2)], [0, 1], CL);
  const tick = t(a + 2.2);
  const minutes = Math.round(5 * clock1 + 5 * clock2);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: o, display: "flex", alignItems: "center", gap: 46, fontFamily: FONT }}>
      <div style={{ display: "flex", gap: 14, transform: `translateX(${(1 - fly) * -120 + back * -40 * (1 - clock2)}px)`, opacity: fly }}>
        {cards.map((c) => (
          <div key={c} style={{ width: 150, height: 190, borderRadius: 12, background: "rgba(244,240,232,0.95)", color: "#14171d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
            <div style={{ width: 90, height: 8, borderRadius: 4, background: "#c9c3b5" }} />
            <div style={{ width: 70, height: 8, borderRadius: 4, background: "#c9c3b5" }} />
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{c}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <svg width={150} height={150} viewBox="-75 -75 150 150">
          <circle r={64} fill="rgba(10,13,20,0.75)" stroke="rgba(244,240,232,0.6)" strokeWidth={4} />
          <path d={`M0,0 L0,-52 A52,52 0 ${clock1 + clock2 > 1 ? 1 : 0},1 ${(52 * Math.sin(Math.PI * (clock1 + clock2))).toFixed(1)},${(-52 * Math.cos(Math.PI * (clock1 + clock2))).toFixed(1)} Z`} fill="rgba(255,209,102,0.55)" />
          <line x1={0} y1={0} x2={(46 * Math.sin(2 * Math.PI * (clock1 + clock2))).toFixed(1)} y2={(-46 * Math.cos(2 * Math.PI * (clock1 + clock2))).toFixed(1)} stroke="#f4f0e8" strokeWidth={5} strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 40, fontWeight: 900, color: K.fg, textShadow: SHADOW }}>{minutes} 分钟</div>
      </div>
      <div style={{ width: 130, height: 130, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, fontWeight: 900, color: K.red, opacity: cross * (1 - back), transform: `scale(${0.6 + 0.4 * cross})` }}>✗</div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, fontWeight: 900, color: K.green, opacity: tick, transform: `scale(${0.6 + 0.4 * tick})` }}>✓</div>
        <div style={{ position: "absolute", top: 136, width: 260, left: -65, textAlign: "center", fontSize: 28, fontWeight: 800, color: K.red, opacity: back * (1 - tick) }}>返工，再查一遍</div>
      </div>
    </div>
  );
};

// ---------- the two bills: cheap per use vs. smart on a plan ----------

export const TwoBills: React.FC<{ a: number; b: number; x: number; y: number }> = ({ a, b, x, y }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.25, 0.35);
  if (o <= 0) return null;
  const PX = 300; // px per dollar
  const rows = [
    { name: "DeepSeek · 按量付钱", tries: "平均要做 2.9 次才做对", token: 0.76, mins: 15, time: 2.31, total: 3.07, color: "#7290ff", at: a + 0.3 },
    { name: "Claude · 包月用满", tries: "平均做 1.7 次", token: 0.17, mins: 8, time: 1.23, total: 1.4, color: "#ff9a5c", at: a + 1.1 },
  ];
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: o, fontFamily: FONT, width: 1560, textShadow: SHADOW }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: K.fg, marginBottom: 40, textAlign: "center" }}>做对一道难题，一共花多少？</div>
      {rows.map((r) => {
        const k1 = interpolate(frame, [bf(r.at), bf(r.at + 0.4)], [0, 1], { ...CL, easing: EO });
        const k2 = interpolate(frame, [bf(r.at + 0.35), bf(r.at + 0.85)], [0, 1], { ...CL, easing: EO });
        const k3 = interpolate(frame, [bf(r.at + 0.8), bf(r.at + 1.1)], [0, 1], { ...CL, easing: EO });
        return (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 46 }}>
            <div style={{ width: 380, textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: r.color, whiteSpace: "nowrap" }}>{r.name}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: K.sub, whiteSpace: "nowrap" }}>{r.tries}</div>
            </div>
            <div style={{ position: "relative", display: "flex", height: 80 }}>
              <div style={{ width: Math.max(8, r.token * PX) * k1, background: r.color, borderRadius: "8px 0 0 8px" }} />
              <div style={{ width: r.time * PX * k2, background: "rgba(244,240,232,0.9)", borderRadius: "0 8px 8px 0", color: "#14171d", display: "flex", alignItems: "center", paddingLeft: k2 > 0.2 ? 16 : 0, fontSize: 30, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textShadow: "none" }}>
                {k2 > 0.6 ? `你检查 ${r.mins} 分钟 · $${r.time.toFixed(2)}` : ""}
              </div>
              <div style={{ position: "absolute", left: 0, top: -38, fontSize: 26, fontWeight: 700, color: r.color, opacity: k1, whiteSpace: "nowrap" }}>token ${r.token.toFixed(2)}</div>
            </div>
            <div style={{ fontSize: 58, fontWeight: 900, color: K.fg, opacity: k3, whiteSpace: "nowrap" }}>= ${r.total.toFixed(2)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- counters ----------

export const BigCounter: React.FC<{ a: number; b: number; x: number; y: number; text: string; sub?: React.ReactNode; size?: number; color?: string }> = ({ a, b, x, y, text, sub, size = 120, color = K.fg }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.25, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: o, textAlign: "center", fontFamily: FONT, textShadow: SHADOW }}>
      <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 700, color, letterSpacing: 2 }}>{text}</div>
      {sub ? <div style={{ fontSize: 30, fontWeight: 700, color: K.sub, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
};

// ---------- next episode, sources, end card ----------

export const NextEp: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,8,${0.7 * o})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o, fontFamily: FONT }}>
      <div style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 700, color: K.fg, letterSpacing: 6 }}>AI 的真实价格 · 第 1 集 完</div>
      <div style={{ marginTop: 30, fontSize: 40, fontWeight: 700, color: K.gold }}>下一集：一张 AI 图，到底多少钱？</div>
    </div>
  );
};

export const Sources: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const frame = useBar();
  const o = win(frame, a, b, 0.25, 0.25);
  if (o <= 0) return null;
  const rows = [
    "价格：Anthropic、OpenAI、月之暗面、智谱、DeepSeek 官方定价（每百万输出 token，2026-10）；其他模型：OpenRouter",
    "做一道题：Artificial Analysis 智能指数，每道题平均花费，各模型最强档（2026-10）",
    "包月额度：SemiAnalysis（Claude Max、ChatGPT Pro，2026-10）；Kimi：科技博主实测（2026-10-24）；智谱 GLM Coding Plan",
    "Anthropic 每周上限说明（2025-07）；奥特曼谈 ChatGPT Pro 亏损（2025-01）；中转站倍率：社区报价",
    "做对比例：Artificial Analysis Terminal-Bench 4.0；时薪：国家统计局 2025 年城镇非私营单位平均工资",
    "Epoch AI《The plunging price of thought》（2026-09）；国家数据局 2026-03-24 发布会；OpenAI GPT-4 定价（2023-03）",
    "夜景：NASA Black Marble 2016 · 画面由代码逐帧生成 · 汇率 6.7195（2026-10-22）",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,8,${0.9 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 140, top: 150, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 30, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 27, fontWeight: 500, color: "rgba(244,240,232,0.82)", lineHeight: 1.9 }}>
            {r}
          </div>
        ))}
        <div style={{ fontSize: 22, color: "rgba(244,240,232,0.5)", marginTop: 26 }}>数据截至 2026 年 10 月 · 价格常变，不构成购买建议</div>
      </div>
    </div>
  );
};

export const EndCard: React.FC<{ at: number }> = ({ at }) => {
  const frame = useBar();
  const t = frame - bf(at);
  if (t < 0) return null;
  const k = interpolate(t, [0, 24], [0, 1], { ...CL, easing: EO });
  const k2 = interpolate(t, [14, 40], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: Math.min(1, t / 10) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 132, height: 132 }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: K.fg, letterSpacing: 10 }}>世界的形状</span>
      </div>
      <div style={{ marginTop: 34, fontFamily: SERIF, fontWeight: 600, fontSize: 40, letterSpacing: 18, color: "rgba(244,240,232,0.78)", opacity: k2, transform: `translateY(${(1 - k2) * 10}px)` }}>看见世界如何运行</div>
      <div style={{ position: "absolute", bottom: 120, fontFamily: FONT, fontSize: 30, fontWeight: 600, letterSpacing: 6, color: "rgba(244,240,232,0.7)", opacity: k2 }}>MakerJackie</div>
    </div>
  );
};
