import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Who } from "../art/paper";
import { Cam, EIN, EO, progOf, Say, Sfx, useBeat } from "../kit";
import { K, NUM, SANS, SERIF } from "../theme";

// ---------- S3 · everywhere (A film bars 29–35, A's loudest phrase; 24 beats) ----------
// The two sheets we just read lie on a big desk; the camera cranes up while fifteen more land around them,
// one plain sentence each, not explained. Then answer sheets pour in from every edge.

type Card = { field: string; org: string; gloss?: string; line: React.ReactNode; src: string };

const N = (t: string) => <span style={{ fontFamily: NUM, fontWeight: 700 }}>{t}</span>;

// Order: the four words of the line first (银行、工厂、农田、学校), then the rest.
const CARDS: Card[] = [
  { field: "银行", org: "工商银行", line: <>AI 干的活，约等于 {N("5.5")} 万人干一年</>, src: "工商银行 2025 年报 · 自报" },
  { field: "工厂", org: "美的", line: <>员工自己造了 {N("1.35")} 万个 AI 助手</>, src: "美的集团 2025 年报 · 自报" },
  { field: "农田", org: "John Deere", gloss: "美国农机公司", line: <>AI 认杂草，除草剂少用近一半</>, src: "Deere 2025-11 · 公司称" },
  { field: "学校", org: "美国老师", line: <>用 AI 的老师，每周省下 {N("5.9")} 小时</>, src: "Gallup 2025-06 · 2,232 名教师自估" },
  { field: "保险", org: "中国平安", line: <>AI 客服一年接打 {N("17")} 亿次</>, src: "中国平安 2025 年报 · 自报" },
  { field: "银行", org: "摩根大通", gloss: "美国最大的银行", line: <>{N("6.5")} 万员工在用 AI</>, src: "JPMorgan 2025 年报致股东信 · 自报" },
  { field: "仲裁", org: "深圳福田", line: <>AI 起草仲裁书：{N("4")} 分钟（手工 {N("4")} 小时以上）</>, src: "新华社 2025-02-20" },
  { field: "科研", org: "Kosmos", gloss: "AI 科研助手", line: <>一次读完 {N("1,500")} 篇论文</>, src: "Edison Scientific · arXiv 2025-11 · 自报" },
  { field: "生物", org: "AlphaFold", gloss: "谷歌的蛋白质 AI", line: <>{N("300")} 万研究者在用</>, src: "Google DeepMind 2025-11 · 自报" },
  { field: "法律", org: "Harvey", gloss: "法律 AI", line: <>美国百强律所里 {N("8")} 成在用</>, src: "Harvey 2026-09 · 自报" },
  { field: "教育", org: "世界银行", line: <>{N("6")} 周 AI 补课，抵平常 {N("1.5–2")} 年</>, src: "World Bank 工作论文 2025-05 · 尼日利亚随机试验" },
  { field: "影视", org: "Netflix", gloss: "网飞", line: <>AI 特效镜头，快 {N("10")} 倍</>, src: "Netflix 财报电话会 2025-07 · 公司称" },
  { field: "游戏", org: "Pieter Levels", gloss: "独立开发者", line: <>AI 写的游戏，{N("17")} 天年化收入破 {N("670")} 万元</>, src: "levels.io 2025-02 · 本人自报 · 100 万美元按 6.7220 换算" },
  { field: "音乐", org: "Deezer", gloss: "法国音乐平台", line: <>每天收到 {N("9")} 万首 AI 写的歌</>, src: "Deezer 2026-07-21" },
  { field: "制造", org: "海尔", line: <>空调样机测试：{N("15")} 天 → {N("7")} 天</>, src: "海尔智家 2025 年报 · 自报" },
];

// Where each lands, in world px (the desk is bigger than the frame; the camera ends at 0.55).
const SPOTS: [number, number][] = [
  [1390, 300], [1560, 800], [300, 860], [-260, 470],
  [2180, 420], [2190, 1060], [850, 1240], [-280, 1080],
  [1980, -160], [-200, -60], [1500, 1330], [300, 1360],
  [2500, 760], [2450, 1360], [-560, 860],
];
const SW = 470;
const SH = 250;

const Sheet: React.FC<{ c: Card; p: number; rot: number }> = ({ c, p, rot }) => (
  <div
    style={{
      position: "absolute",
      width: SW,
      height: SH,
      left: -SW / 2,
      top: -SH / 2,
      background: `linear-gradient(180deg, ${K.paperHi}, ${K.paper})`,
      borderRadius: 6,
      boxShadow: `0 ${18 * (1 + (1 - p) * 3)}px ${40 * (1 + (1 - p) * 2)}px rgba(70,45,15,${0.26 * p + 0.05})`,
      transform: `scale(${1.25 + (1 - p) * 0.4}) rotate(${rot}deg)`,
      opacity: Math.min(1, p * 4),
      padding: "18px 24px",
      boxSizing: "border-box",
      color: K.ink,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, color: K.paper, background: K.ink, borderRadius: 4, padding: "2px 8px" }}>{c.field}</span>
      <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 32, whiteSpace: "nowrap" }}>{c.org}</span>
      {c.gloss ? <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 20, opacity: 0.7, whiteSpace: "nowrap" }}>（{c.gloss}）</span> : null}
    </div>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 31, lineHeight: 1.3, marginTop: 14, flex: 1 }}>{c.line}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {(["题", "答", "阅"] as const).map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: SERIF, fontWeight: 900, fontSize: 20, padding: "3px 8px", borderRadius: 5, border: `2px solid ${k === "答" ? K.ai : K.ink}`, background: k === "答" ? "#efeafd" : "transparent", color: k === "答" ? K.ai : K.ink }}>
          {k}
          <Who who={k === "答" ? "AI" : "人"} size={13} />
        </span>
      ))}
      <span style={{ marginLeft: "auto", fontFamily: SANS, fontSize: 14, opacity: 0.55, whiteSpace: "nowrap", maxWidth: 230, overflow: "hidden", textOverflow: "ellipsis" }}>{c.src}</span>
    </div>
  </div>
);

// The two stories we just told, as their 题 · 答 · 阅 strips on one sheet each.
const Story: React.FC<{ who: string; q: string; a: string; g: string; rot: number }> = ({ who, q, a, g, rot }) => (
  <div style={{ position: "absolute", width: 520, left: -260, top: -150, transform: `rotate(${rot}deg)`, background: `linear-gradient(180deg, ${K.paperHi}, ${K.paper})`, borderRadius: 6, boxShadow: "0 20px 44px rgba(70,45,15,0.26)", padding: "20px 26px 24px", boxSizing: "border-box", color: K.ink }}>
    <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 40 }}>{who}</div>
    {[
      ["题", "人", q],
      ["答", "AI", a],
      ["阅", "人", g],
    ].map(([k, w, t]) => (
      <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, padding: "6px 12px", borderRadius: 6, border: `2px solid ${w === "AI" ? K.ai : K.ink}`, background: w === "AI" ? "#efeafd" : "transparent" }}>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 30, color: w === "AI" ? K.ai : K.ink }}>{k}</span>
        <Who who={w as "人" | "AI"} size={17} />
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26 }}>{t}</span>
      </div>
    ))}
  </div>
);

// Generic answer sheets: AI-violet lines, and an empty grading box (also the math avalanche).
const FLOOD = 46;
export const Answer: React.FC<{ i: number }> = ({ i }) => (
  <div style={{ width: 300, height: 200, background: `linear-gradient(180deg, ${K.paperHi}, ${K.paper})`, borderRadius: 5, boxShadow: "0 14px 30px rgba(70,45,15,0.24)", padding: "16px 18px", boxSizing: "border-box", position: "relative" }}>
    <div style={{ width: 120, height: 8, background: K.ink, opacity: 0.6, borderRadius: 3 }} />
    {[0, 1, 2, 3, 4].map((l) => (
      <div key={l} style={{ marginTop: 13, height: 5, width: `${60 + random(`fl${i}-${l}`) * 38}%`, background: K.ai, opacity: 0.55, borderRadius: 3 }} />
    ))}
    <div style={{ position: "absolute", right: 14, bottom: 14, width: 70, height: 46, border: `2.5px dashed ${K.inkSoft}`, borderRadius: 5, fontFamily: SERIF, fontWeight: 900, fontSize: 22, color: K.inkSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>阅</div>
  </div>
);

export const Panorama: React.FC = () => {
  const b = useBeat();
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 980, y: 560, s: 1.12 },
          { b: 4.2, x: 980, y: 560, s: 0.98 },
          { b: 13.6, x: 960, y: 590, s: 0.6 },
          { b: 22.5, x: 960, y: 600, s: 0.5, r: -1.5 },
        ]}
      >
        {/* the desk's edge far out, so the crane has something to rise over */}
        <div style={{ position: "absolute", left: -1400, top: -900, width: 4720, height: 3000, border: `6px solid ${K.deskLo}`, borderRadius: 30 }} />
        <div style={{ position: "absolute", left: 700, top: 560 }}>
          <Story who="医生" q="看病" a="写病历" g="读完再签" rot={-3} />
        </div>
        <div style={{ position: "absolute", left: 1240, top: 610 }}>
          <Story who="程序员" q="派活" a="写代码" g="定好什么算合格" rot={2.5} />
        </div>
        {CARDS.map((c, i) => {
          const at = 5 + i * 0.6;
          const p = progOf(b, at, 0.45, EIN);
          if (p <= 0) return null;
          const [x, y] = SPOTS[i];
          return (
            <div key={c.org} style={{ position: "absolute", left: x, top: y }}>
              <Sheet c={c} p={p} rot={(random(`pr${i}`) - 0.5) * 9} />
            </div>
          );
        })}
        {Array.from({ length: FLOOD }, (_, i) => {
          const at = 14.6 + (i / FLOOD) * 7 + random(`fa${i}`) * 0.4;
          const p = progOf(b, at, 0.8, EO);
          if (p <= 0) return null;
          const ang = random(`fd${i}`) * Math.PI * 2;
          const tx = 960 + (random(`fx${i}`) - 0.5) * 3400;
          const ty = 600 + (random(`fy${i}`) - 0.5) * 2000;
          const fx = tx + Math.cos(ang) * 2600 * (1 - p);
          const fy = ty + Math.sin(ang) * 1800 * (1 - p);
          return (
            <div key={i} style={{ position: "absolute", left: fx - 150, top: fy - 100, transform: `rotate(${(random(`fr${i}`) - 0.5) * 30 * (1 - p * 0.6)}deg) scale(1.3)` }}>
              <Answer i={i} />
            </div>
          );
        })}
      </Cam>

      <Say at={1} out={4.6} y={140} lines={[["不只是", { t: "他们", k: true }, "。"]]} />
      <Say at={5} out={13.8} y={140} lines={[["银行、工厂、农田、学校……"], ["到处都在", { t: "这样分工", k: true }, "。"]]} />
      <Say at={14.6} out={22.8} y={140} lines={[[{ t: "答卷", k: true }, "，正从各个角落涌出来。"]]} />

      {/* sound: each sheet lands; then the flood */}
      {CARDS.map((c, i) => (
        <Sfx key={c.org} at={5.45 + i * 0.6} id="sfx-foley-02" vol={0.2} rate={0.9 + random(`ps${i}`) * 0.3} />
      ))}
      {[14.6, 15.6, 16.6, 17.6, 18.6, 19.6, 20.6].map((t, i) => (
        <Sfx key={t} at={t} id="sfx-foley-16" vol={0.22 + i * 0.03} rate={1 + i * 0.03} />
      ))}
      <Sfx at={14.6} id="sfx-foley-01" vol={0.35} />
      <Sfx at={18.6} id="sfx-foley-01" vol={0.4} rate={1.1} />
    </AbsoluteFill>
  );
};
