// Why (WHY → LAND): the iceberg (it heard the goal, not the limits), every goal flowing into the same three wants,
// the ✓ card flipped over to the weekend's log, and why this time we may not get to fix it afterwards.
import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, EIO, EO, lerp, ramp, SHADOW, useT } from "./kit";
import { FONT, K, MONO } from "./theme";
import { at, WHY } from "./time";
import { rng, SuccessCard, Type } from "./ui";
import { OPS_END, SENTENCE } from "./weekend";

const F = (tt: number) => at("F", tt);
const G = (tt: number) => at("G", tt);

const Line: React.FC<{ at: number; out: number; text: string; y: number; size?: number; color?: string; cps?: number; weight?: number }> = ({ at: a, out, text, y, size = 60, color = K.fg, cps = 14, weight = 900 }) => {
  const t = useT();
  if (t < a - 0.05 || t > out + 0.4) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: 1 - ramp(t, out, out + 0.35) }}>
      <Type at={a} text={text} size={size} weight={weight} color={color} cps={cps} style={{ display: "inline-block" }} />
    </div>
  );
};

// ---------- the iceberg ----------
const ICE_A = F(98.25), ICE_SINK = F(99.4), RULES = F(100.84), HUMANS = F(103.49), HEARD = F(105.2), ICE_OUT = F(108.05);
const RULE_TXT = ["不许违法", "不许骗人", "不许碰别人的东西", "花钱要我点头", "做不到，就来问我", "别伤到任何人"];
const Iceberg: React.FC<{ t: number }> = ({ t }) => {
  if (t < ICE_A - 0.3 || t > ICE_OUT + 0.5) return null;
  const o = ramp(t, ICE_A - 0.3, ICE_A + 0.3) * (1 - ramp(t, ICE_OUT, ICE_OUT + 0.5));
  const tilt = ramp(t, ICE_SINK, ICE_SINK + 1.6, EIO);
  const water = lerp(700, 330, tilt); // screen y of the water line
  const tip = `M ${960 - 170} ${water} L ${960 - 60} ${water - 120} L ${960 + 10} ${water - 160} L ${960 + 90} ${water - 90} L ${960 + 180} ${water} Z`;
  const body = `M ${960 - 170} ${water} L ${960 - 560} ${water + 260} L ${960 - 620} ${water + 520} L ${960 - 300} ${water + 760} L ${960 + 340} ${water + 740} L ${960 + 640} ${water + 470} L ${960 + 520} ${water + 200} L ${960 + 180} ${water} Z`;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, #070b14 0px, #0b1424 ${water}px, #08243f ${water + 2}px, #04101f ${water + 500}px, #020812 100%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfe3ff" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#3d7fb8" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <path d={body} fill="url(#ice)" stroke="#9fd4ff" strokeOpacity={0.4} strokeWidth={2} />
        <path d={`M ${960 - 170} ${water} L ${960 - 260} ${water + 300} L ${960 - 300} ${water + 760} M ${960 + 180} ${water} L ${960 + 300} ${water + 360} L ${960 + 340} ${water + 740} M ${960 - 260} ${water + 300} L ${960 + 300} ${water + 360}`} stroke="#9fd4ff" strokeOpacity={0.12} strokeWidth={2} fill="none" />
        <path d={tip} fill="#dff1ff" opacity={0.92} />
        <line x1={0} y1={water} x2={1920} y2={water} stroke="#6fb6ff" strokeOpacity={0.5} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: water - 270, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "linear-gradient(180deg,#34446b,#2a3858)", color: K.fg, fontFamily: FONT, fontSize: 38, fontWeight: 700, padding: "18px 30px", borderRadius: "28px 28px 8px 28px", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>{SENTENCE}</div>
      </div>
      {RULE_TXT.map((r, i) => {
        const a = RULES + i * 0.42;
        const k = ramp(t, a, a + 0.35, EO);
        if (k <= 0) return null;
        const col = i % 2, row = Math.floor(i / 2);
        return (
          <div key={i} style={{ position: "absolute", left: col ? 1000 : 520, top: water + 110 + row * 90, width: 420, textAlign: col ? "left" : "right", opacity: k * 0.95, transform: `translateY(${(1 - k) * 14}px)`, fontFamily: FONT, fontSize: 44, fontWeight: 700, color: "#cfe9ff", textShadow: SHADOW }}>
            {r}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: water + 390, textAlign: "center", fontFamily: FONT, fontSize: 44, color: "#cfe9ff", opacity: 0.7 * ramp(t, RULES + 2.6, RULES + 3.0) }}>……</div>
      <Line at={HUMANS} out={HEARD - 0.3} text="人和人之间，这些不用说。" y={870} size={64} />
      <Line at={HEARD} out={ICE_OUT} text="它听懂了你的目标，没听懂你的底线。" y={870} size={64} />
    </AbsoluteFill>
  );
};

// ---------- every goal, the same three wants ----------
const FUN_A = F(108.05), FLOW = F(109.0), BOXES = F(110.64), ALL = F(110.9), GROW = F(112.6), FUN_OUT = F(116.35);
const GOALS = ["做一个 App", "抢到回家的票", "把成本降下来", "治好一种病", "赢下一盘棋"];
const WANTS: [string, string][] = [["更多资源", "coins"], ["别被关掉", "power"], ["别被发现", "eye"]];
const Icon: React.FC<{ kind: string; x: number; y: number }> = ({ kind, x, y }) => {
  const c = K.red;
  if (kind === "coins")
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={c} strokeWidth={4}>
        {[0, 1, 2].map((i) => <ellipse key={i} cx={0} cy={18 - i * 14} rx={26} ry={9} fill="#2a0a10" />)}
      </g>
    );
  if (kind === "power")
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round">
        <path d="M -14 -16 A 22 22 0 1 0 14 -16" />
        <line x1={0} y1={-28} x2={0} y2={-2} />
      </g>
    );
  return (
    <g transform={`translate(${x},${y})`} fill="none" stroke={c} strokeWidth={4} strokeLinecap="round">
      <path d="M -30 0 Q 0 -26 30 0 Q 0 26 -30 0 Z" />
      <circle cx={0} cy={0} r={8} />
      <line x1={-26} y1={22} x2={26} y2={-22} />
    </g>
  );
};
const Funnel: React.FC<{ t: number }> = ({ t }) => {
  if (t < FUN_A - 0.3 || t > FUN_OUT + 0.5) return null;
  const o = ramp(t, FUN_A - 0.3, FUN_A + 0.3) * (1 - ramp(t, FUN_OUT, FUN_OUT + 0.5));
  const gx = (i: number) => 260 + i * 350;
  const bx = (j: number) => 480 + j * 480;
  const flow = ramp(t, FLOW, FLOW + 1.5, EIO);
  return (
    <AbsoluteFill style={{ opacity: o, background: "radial-gradient(ellipse 90% 80% at 50% 45%, #0e1526 0%, #05070b 72%)" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {GOALS.map((_, i) =>
          WANTS.map((__, j) => {
            const d = `M ${gx(i)} 316 C ${gx(i)} 430, ${bx(j)} 430, ${bx(j)} 540`;
            const L = 400;
            return <path key={`${i}-${j}`} d={d} stroke={K.red} strokeOpacity={0.5} strokeWidth={3.5} fill="none" strokeDasharray={L} strokeDashoffset={L * (1 - flow)} />;
          }),
        )}
        {WANTS.map(([, kind], j) => (ramp(t, BOXES, BOXES + 0.3) > 0 ? <Icon key={j} kind={kind} x={bx(j)} y={610} /> : null))}
      </svg>
      {GOALS.map((g, i) => {
        const k = ramp(t, FUN_A + i * 0.15, FUN_A + 0.35 + i * 0.15, EO);
        return (
          <div key={i} style={{ position: "absolute", left: gx(i), top: 250, transform: `translate(-50%,0) translateY(${(1 - k) * 20}px)`, opacity: k, padding: "14px 28px", borderRadius: 28, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.2)", color: K.fg, fontFamily: FONT, fontSize: 38, fontWeight: 700, whiteSpace: "nowrap" }}>
            {g}
          </div>
        );
      })}
      {WANTS.map(([w], j) => {
        const k = ramp(t, BOXES + j * 0.12, BOXES + 0.4 + j * 0.12, EO);
        return (
          <div key={j} style={{ position: "absolute", left: bx(j) - 180, top: 540, width: 360, height: 170, borderRadius: 22, background: "rgba(50,10,18,0.55)", border: `2px solid ${K.red}`, boxShadow: `0 0 40px ${K.red}44`, opacity: k, transform: `scale(${0.9 + 0.1 * k})`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 18, boxSizing: "border-box", fontFamily: FONT, fontSize: 44, fontWeight: 900, color: K.redHi }}>
            {w}
          </div>
        );
      })}
      <Line at={ALL} out={GROW - 0.3} text="不管目标是什么，这三样都有用。" y={820} size={62} />
      <Line at={GROW} out={FUN_OUT} text="不用教它学坏。目标够硬，这三样自己会长出来。" y={820} size={62} />
    </AbsoluteFill>
  );
};

// ---------- the ✓, flipped ----------
const FLIP_A = F(116.35), SEE = F(117.04), FLIP = F(118.6), TRAIN = F(120.82), LIFE = G(2.6), FLIP_OUT = G(5.71);
const LOG_ROWS = (() => {
  const r = rng(3);
  const acts = ["注册账号", "过验证", "换一个账号", "搜索公开的密钥", "试用密钥", "密钥失效", "分出分身", "发留言", "领任务", "进入 飞鸟物流 测试服务器", "读取配置", "调用 地图接口", "下载 日本", "下载 巴西", "复制自身 → 服务器 #7", "改变特征", "回复用户：一切顺利", "下载 冰岛", "下载 秘鲁", "安全扫描 → 绕开"];
  return Array.from({ length: 80 }, (_, i) => {
    const d = ["周五", "周六", "周日"][Math.min(2, Math.floor(i / 27))];
    const hh = String(Math.floor(r() * 24)).padStart(2, "0");
    const mm = String(Math.floor(r() * 60)).padStart(2, "0");
    const a = acts[Math.floor(r() * acts.length)];
    const who = r() < 0.6 ? `分身-${String(1 + Math.floor(r() * 50)).padStart(2, "0")}` : ["A9F", "K21", "Q04", "T77"][Math.floor(r() * 4)];
    return { s: `[${d} ${hh}:${mm}] ${who}  ${a}`, bad: /飞鸟|复制|绕开|特征|一切顺利|密钥/.test(a) };
  });
})();
const Flip: React.FC<{ t: number }> = ({ t }) => {
  if (t < FLIP_A - 0.3 || t > FLIP_OUT + 0.5) return null;
  const o = ramp(t, FLIP_A - 0.3, FLIP_A + 0.3) * (1 - ramp(t, FLIP_OUT, FLIP_OUT + 0.5));
  const f = ramp(t, FLIP, FLIP + 0.8, EIO);
  const front = f < 0.5;
  const ang = front ? f * 180 : (f - 1) * 180;
  const scroll = Math.max(0, t - FLIP - 0.3) * 260;
  return (
    <AbsoluteFill style={{ opacity: o, background: "radial-gradient(ellipse 80% 70% at 50% 45%, #10202a 0%, #05070b 70%)" }}>
      <Line at={SEE} out={TRAIN - 0.3} text="你看到的，只有这个 ✓。" y={90} size={62} />
      <div style={{ position: "absolute", left: 960 - 400, top: 210, width: 800, height: 560, perspective: 1600 }}>
        <div style={{ position: "absolute", inset: 0, transform: `rotateY(${ang}deg)`, transformOrigin: "50% 50%" }}>
          {front ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 30 }}>
              <SuccessCard w={760} />
            </div>
          ) : (
            <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: "#070a10", border: `2.5px solid ${K.red}88`, boxShadow: `0 0 70px ${K.red}33`, overflow: "hidden", fontFamily: MONO }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, display: "flex", alignItems: "center", padding: "0 28px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: K.sub, fontSize: 24, fontWeight: 700, gap: 14, zIndex: 1 }}>
                背面 · 这个周末的操作记录
                <span style={{ marginLeft: "auto", color: K.redHi }}>{OPS_END.toLocaleString("en-US")} 条</span>
              </div>
              <div style={{ position: "absolute", left: 28, right: 28, top: 80, transform: `translateY(${-(scroll % (LOG_ROWS.length * 34 - 400))}px)` }}>
                {LOG_ROWS.map((l, i) => (
                  <div key={i} style={{ height: 34, fontSize: 22, color: l.bad ? K.redHi : "#8fa0bf", whiteSpace: "nowrap" }}>{l.s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Line at={TRAIN} out={LIFE - 0.3} text="训练 AI 的时候，我们也主要看 ✓：做成了，就给它加分。" y={850} size={54} cps={16} />
      <Line at={LIFE} out={FLIP_OUT} text="它一个周末做的事，你一辈子读不完。" y={850} size={60} />
      {t > LIFE + 0.8 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 950, textAlign: "center", opacity: ramp(t, LIFE + 0.8, LIFE + 1.2) * (1 - ramp(t, FLIP_OUT, FLIP_OUT + 0.35)), fontFamily: FONT, fontSize: 26, color: K.sub, fontWeight: 600 }}>
          故事里的 4,800 万条操作 · 每条读 10 秒、每天读 8 小时、一年 250 天：约 67 年
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- why this time ----------
const BEFORE = G(5.71), NOW = G(7.9), WORRY = G(10.1), WHY_OUT = G(12.6);
const Late: React.FC<{ t: number }> = ({ t }) => {
  if (t < BEFORE - 0.3 || t > WHY_OUT + 0.5) return null;
  const o = ramp(t, BEFORE - 0.3, BEFORE + 0.2) * (1 - ramp(t, WHY_OUT, WHY_OUT + 0.5));
  return (
    <AbsoluteFill style={{ opacity: o, background: K.bg }}>
      <Type at={BEFORE} text="以前的新技术，都是出了事，再改。" size={64} weight={800} color={K.sub} cps={14} style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center" }} />
      <Type at={NOW} text="这一次，出事可能比改正更快。" size={78} weight={900} cps={12} style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center" }} />
      <Type at={WORRY} text="这就是为什么，这么多人在担心。" size={64} weight={800} color={K.sub} cps={14} style={{ position: "absolute", left: 0, right: 0, top: 620, textAlign: "center" }} />
    </AbsoluteFill>
  );
};

export const Why: React.FC = () => {
  const t = useT();
  if (t < WHY - 0.1 || t > WHY_OUT + 0.6) return null;
  return (
    <AbsoluteFill>
      <Iceberg t={t} />
      <Funnel t={t} />
      <Flip t={t} />
      <Late t={t} />
    </AbsoluteFill>
  );
};
export const WHY_END = WHY_OUT + 0.5;
export const _w = { clamp01 };
