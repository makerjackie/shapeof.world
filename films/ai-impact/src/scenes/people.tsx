import React from "react";
import { AbsoluteFill } from "remotion";
import { Curve, Dot, GridY, lin, linePath, TimeTicks } from "../charts";
import { DEEZER, METR, WAU, yr } from "../data";
import { EBACK, EIO, EO, Glass, In, progAt, Tag } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Head, Src } from "../ui";

const HEAD = { position: "absolute", left: 120, top: 128 } as const;

// ───────── 04-1 Capability: METR's 50% time horizon on a linear axis, plus three side facts ─────────

export const Capability: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 220, y: 330, w: 1000, h: 520 };
  const sx = lin(yr("2023-01"), yr("2026-07"), box.x, box.x + box.w);
  const sy = lin(0, 18, box.y + box.h, box.y);
  const pts: [number, number][] = METR.map((m) => [sx(yr(m.d)), sy(Math.min(m.v, 960) / 60)]);
  const draw = progAt(frame, 0.6, 4.2, EIO);
  const xNow = box.x + box.w * draw;
  const fmtH = (min: number) => (min < 60 ? `${Math.round(min)} 分钟` : `${(min / 60).toFixed(min < 600 ? 1 : 0)} 小时`);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.3} size={70} parts={["AI 能独立干完的活：", { t: "4 分钟 → 16 小时", c: K.theme }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 232 }}>
        <In at={5} from="up">
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>2023 年起，大约每 4 个多月翻一倍。<span style={{ fontSize: 24, color: K.muted, fontWeight: 600 }}>　METR：131 天</span></div>
        </In>
      </div>
      <GridY box={box} ticks={[0, 4, 8, 12, 16]} sy={sy} fmt={(v) => `${v} 小时`} />
      <TimeTicks box={box} sx={sx} years={[2024, 2025, 2026]} />
      <div style={{ position: "absolute", left: box.x, top: sy(16) - 2, width: box.w, borderTop: `2px dashed ${K.red}66` }} />
      <div style={{ position: "absolute", left: box.x + 10, top: sy(16) - 30, fontFamily: FONT, fontSize: 19, fontWeight: 700, color: K.red, opacity: 0.8 }}>16 小时以上，METR 说测不准</div>
      <Curve id="metr" box={box} d={linePath(pts)} color={K.theme} draw={draw} width={4} area={`${linePath(pts)}L${pts[pts.length - 1][0]},${box.y + box.h}L${pts[0][0]},${box.y + box.h}Z`} />
      {METR.map((m, i) => {
        const [x, y] = pts[i];
        if (x > xNow + 2) return null;
        const last = i === METR.length - 1;
        return (
          <React.Fragment key={m.m}>
            <Dot x={x} y={y} color={last ? K.gold : K.theme} r={m.show ? 7 : 4} ring={!!m.show} />
            {m.show ? (
              <div style={{ position: "absolute", left: x - (last ? 300 : i === METR.length - 2 ? 296 : 12), top: y - (last ? 46 : i === METR.length - 2 ? 10 : 66), width: last || i === METR.length - 2 ? 280 : undefined, textAlign: last || i === METR.length - 2 ? "right" : "left", fontFamily: FONT, whiteSpace: "nowrap" }}>
                <div style={{ fontSize: last ? 34 : 24, fontWeight: 900, color: last ? K.gold : K.fg }}>{last ? "16 小时以上" : fmtH(m.v)}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: K.muted }}>
                  {m.m} · {m.d.slice(0, 7)}
                </div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {[
        { at: 5.6, k: "国际数学奥林匹克", v: "金牌", note: "35/42 · 2025-07 · 官方认证（谷歌 DeepMind）" },
        { at: 6.6, k: "研究生级科学题", v: "35.7% → 96.4%", note: "人类专家约 65% · 2023 → 2026" },
        { at: 7.6, k: "GPT-4 级以上的价格", v: "$60 → $10", note: "每百万输出 token · 2023-03 → 2026-09" },
      ].map((c, i) => (
        <In key={c.k} at={c.at} from="flip" style={{ position: "absolute", left: 1310, top: 330 + i * 180 }}>
          <Glass glow={K.theme} style={{ width: 500, height: 160, padding: "16px 26px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: K.sub }}>{c.k}</div>
            <div style={{ fontSize: 50, fontWeight: 900, color: K.fg, marginTop: 2 }}>{c.v}</div>
            <div style={{ fontSize: 18, color: K.muted, fontWeight: 600 }}>{c.note}</div>
          </Glass>
        </In>
      ))}
      <Src>METR 时间跨度数据 2026；翻倍时间：METR《Time Horizon 1.1》2026-01-29（50% 成功率，按人类耗时折算；点估计区间很宽；Mythos 是 Anthropic 的模型，由 METR 测）· DeepMind 2025-07 · 各家价目</Src>
    </AbsoluteFill>
  );
};

// ───────── 04-2 Users: a dot matrix of 1.2 billion weekly users, plus Gemini, tokens and workers ─────────

export const Users: React.FC = () => {
  const frame = useBeatFrame();
  const N = 120;
  const lit = Math.round(progAt(frame, 0.6, 4.4, EO) * N);
  const cols = 15;
  const dot = 46;
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={76} parts={["每周 ", { t: "12 亿人", c: K.theme }, "在用 ChatGPT。"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 236 }}>
        <In at={1.2} from="scale">
          <Tag color={K.muted} size={26}>
            OpenAI 自报 · 2026-09-29
          </Tag>
        </In>
      </div>
      <div style={{ position: "absolute", left: 120, top: 320, width: cols * dot, display: "flex", flexWrap: "wrap" }}>
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} style={{ width: dot, height: dot, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: i < lit ? K.theme : "#1e2630", boxShadow: i < lit ? `0 0 14px ${K.theme}88` : undefined }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 120, top: 700, fontFamily: FONT, fontSize: 22, color: K.muted, fontWeight: 600 }}>一个点 = 1,000 万人 · 周活：1 亿（2023-11）→ 12 亿（2026-09）· OpenAI 自报</div>
      {/* WAU steps */}
      <div style={{ position: "absolute", left: 120, top: 760, width: cols * dot, height: 150 }}>
        {WAU.map(([d, v], i) => {
          const x = ((yr(d) - 2023.8) / (2026.8 - 2023.8)) * cols * dot;
          const q = progAt(frame, 0.6 + i * 0.45, 0.6, EBACK);
          return (
            <div key={d} style={{ position: "absolute", left: x, bottom: 0, width: 16, height: (v / 12) * 140 * q, background: K.theme, borderRadius: 4, opacity: 0.9 }}>
              {i === 0 || i === WAU.length - 1 ? <div style={{ position: "absolute", bottom: "100%", left: -20, width: 56, textAlign: "center", fontFamily: FONT, fontSize: 20, fontWeight: 900, color: K.fg, marginBottom: 4 }}>{v} 亿</div> : null}
            </div>
          );
        })}
      </div>
      {[
        { at: 3.6, k: "谷歌每月处理的 token", v: "约 330 倍", note: "9.7 万亿 → 3,200 万亿 · 2024 → 2026-05 · 含搜索里的 AI 摘要", self: true },
        { at: 4.6, k: "Gemini 应用月活", v: "9.5 亿", note: "2026-07", self: true },
        { at: 5.6, k: "美国上班族用 AI", v: "21% → 52%", note: "至少偶尔用 · 2023 → 2026-05 · Gallup 调查", self: false },
      ].map((c, i) => (
        <In key={c.k} at={c.at} from="flip" style={{ position: "absolute", left: 1000, top: 320 + i * 200 }}>
          <Glass glow={K.theme} style={{ width: 800, height: 176, padding: "18px 30px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>{c.k}</span>
              {c.self ? <span style={{ fontSize: 19, fontWeight: 800, color: K.bg, background: K.muted, borderRadius: 6, padding: "1px 8px" }}>自报</span> : null}
            </div>
            <div style={{ fontSize: 64, fontWeight: 900, color: K.fg, lineHeight: 1.1 }}>{c.v}</div>
            <div style={{ fontSize: 19, color: K.muted, fontWeight: 600 }}>{c.note}</div>
          </Glass>
        </In>
      ))}
      <Src>OpenAI 2023–2026（自报）· 谷歌 I/O 2026、财报致辞（自报）· Gallup 2026-05</Src>
    </AbsoluteFill>
  );
};

const pieArc = (c: number, r: number, f: number) => {
  const a = Math.max(0.001, f) * Math.PI * 2;
  return `M${c},${c} L${c},${c - r} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${c + r * Math.sin(a)},${c - r * Math.cos(a)} Z`;
};

// ───────── 04-3 Content: half of Deezer's daily uploads are AI-made, but few people listen ─────────

export const Content: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 200, y: 330, w: 920, h: 500 };
  const bw = box.w / DEEZER.length;
  const sy = lin(0, 60, box.y + box.h, box.y);
  const pie = progAt(frame, 3.6, 1, EIO);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["每天新上传的音乐，", { t: "一半是 AI 做的", c: K.theme }, "。"]} />
      </div>
      <GridY box={box} ticks={[0, 25, 50]} sy={sy} fmt={(v) => `${v}%`} />
      <div style={{ position: "absolute", left: box.x - 120, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>Deezer 每日新上传里，全 AI 生成的占比</div>
      {DEEZER.map(([d, v], i) => {
        const g = progAt(frame, 0.6 + i * 0.35, 0.9, EBACK);
        const x = box.x + i * bw + 16;
        return (
          <React.Fragment key={d}>
            <div style={{ position: "absolute", left: x, top: sy(v * g), width: bw - 32, height: box.y + box.h - sy(v * g), background: i === DEEZER.length - 1 ? K.theme : `${K.theme}88`, borderRadius: "8px 8px 0 0" }} />
            <div style={{ position: "absolute", left: x + (bw - 32) / 2, top: sy(v * g) - 42, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 28, fontWeight: 900, color: K.fg, whiteSpace: "nowrap", opacity: progAt(frame, 1 + i * 0.35, 0.4) }}>
              {i === DEEZER.length - 1 ? "> 50%" : `${v}%`}
            </div>
            <div style={{ position: "absolute", left: x + (bw - 32) / 2, top: box.y + box.h + 10, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>{d}</div>
          </React.Fragment>
        );
      })}
      <In at={3.4} from="flip" style={{ position: "absolute", left: 1200, top: 320 }}>
        <Glass glow={K.theme} style={{ width: 600, height: 260, padding: "22px 30px", boxSizing: "border-box", display: "flex", gap: 28, alignItems: "center" }}>
          <svg width={170} height={170}>
            <circle cx={85} cy={85} r={80} fill="#232a33" />
            <path d={pieArc(85, 80, pie * 0.03)} fill={K.theme} />
            <circle cx={85} cy={85} r={40} fill={K.panel} />
          </svg>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>可是播放量里</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: K.fg }}>1–3%</div>
            <div style={{ fontSize: 20, color: K.muted, fontWeight: 600 }}>其中多达 85% 是刷量</div>
          </div>
        </Glass>
      </In>
      {[
        { at: 5, k: "新写的英文网页文章", v: "约一半由 AI 写", note: "Graphite 2026（检测器有误差）" },
        { at: 6, k: "网络流量", v: "53% 来自机器人", note: "Imperva 2026 报告（2025 年数据）" },
      ].map((c, i) => (
        <In key={c.k} at={c.at} from="up" style={{ position: "absolute", left: 1200, top: 610 + i * 130 }}>
          <div style={{ fontFamily: FONT, borderLeft: `4px solid ${K.theme}`, paddingLeft: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: K.sub }}>{c.k}</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: K.fg }}>{c.v}</div>
            <div style={{ fontSize: 18, color: K.muted, fontWeight: 600 }}>{c.note}</div>
          </div>
        </In>
      ))}
      <Src>Deezer 新闻稿 2025-01 至 2026-07（平台自测，自报）· Graphite 2026-05 · Imperva / Thales Bad Bot Report 2026</Src>
    </AbsoluteFill>
  );
};

// ───────── 04-4 Science: a Nobel prize, weather in production, math, and no approved drug yet ─────────

const SCI = [
  { k: "蛋白质", v: "2 亿个结构", note: "AlphaFold · 2024 年诺贝尔化学奖", ok: true, icon: "helix" },
  { k: "天气", v: "AI 天天在报", note: "欧洲中期天气预报中心 2025-02 起业务运行 · 能耗约 1/1000", ok: true, icon: "globe" },
  { k: "数学", v: "解开一批 Erdős 难题", note: "陶哲轩：大多是\"低垂的果实\"", ok: true, icon: "sigma" },
  { k: "新药", v: "获批：0 颗", note: "AI 发现的第一颗药 2026-09 才进三期临床", ok: false, icon: "pill" },
];

const Icon: React.FC<{ kind: string; color: string; p: number }> = ({ kind, color, p }) => (
  <svg width={120} height={120} viewBox="0 0 120 120">
    {kind === "helix" ? (
      <>
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={30 + 30 * Math.sin(i * 0.8 + p * 3)} y1={12 + i * 12} x2={90 - 30 * Math.sin(i * 0.8 + p * 3)} y2={12 + i * 12} stroke={color} strokeWidth={3} opacity={0.6} />
        ))}
        <path d={Array.from({ length: 25 }).map((_, i) => `${i ? "L" : "M"}${60 + 30 * Math.sin(i * 0.3 + p * 3)},${10 + i * 4.2}`).join("")} stroke={color} strokeWidth={5} fill="none" />
        <path d={Array.from({ length: 25 }).map((_, i) => `${i ? "L" : "M"}${60 - 30 * Math.sin(i * 0.3 + p * 3)},${10 + i * 4.2}`).join("")} stroke={K.fg} strokeWidth={4} fill="none" opacity={0.7} />
      </>
    ) : kind === "globe" ? (
      <>
        <circle cx={60} cy={60} r={46} fill="none" stroke={color} strokeWidth={4} />
        <path d={`M24,${56 - 10 * p} C44,${36 + 6 * p} 76,${82 - 6 * p} 96,${60 + 8 * p}`} stroke={K.fg} strokeWidth={4} fill="none" />
        <path d="M60,14 C40,40 40,80 60,106 M60,14 C80,40 80,80 60,106" stroke={color} strokeWidth={2.5} fill="none" opacity={0.6} />
        <circle cx={60 + 24 * Math.cos(p * 6)} cy={60 + 24 * Math.sin(p * 6)} r={8} fill={color} />
      </>
    ) : kind === "sigma" ? (
      <>
        <path d="M86,22 H34 L62,60 L34,98 H86" stroke={color} strokeWidth={9} fill="none" strokeLinejoin="round" />
        <circle cx={96} cy={30 + 60 * p} r={5} fill={K.fg} />
      </>
    ) : (
      <>
        <rect x={20} y={40} width={80} height={40} rx={20} fill="none" stroke={K.muted} strokeWidth={4} transform={`rotate(-30 60 60)`} />
        <line x1={60} y1={22} x2={60} y2={98} stroke={K.muted} strokeWidth={4} transform={`rotate(-30 60 60)`} />
      </>
    )}
  </svg>
);

export const Science: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["科学：拿了诺奖，", { t: "还没有一颗获批的药", c: K.red }, "。"]} />
      </div>
      {SCI.map((s, i) => (
        <In key={s.k} at={0.8 + i * 0.6} from="flip" style={{ position: "absolute", left: 120 + i * 430, top: 320 }}>
          <Glass glow={s.ok ? K.theme : K.red} style={{ width: 400, height: 540, padding: "28px 30px", boxSizing: "border-box" }}>
            <Icon kind={s.icon} color={s.ok ? K.theme : K.red} p={progAt(frame, 0, 8, (t) => t)} />
            <div style={{ fontSize: 30, fontWeight: 700, color: K.sub, marginTop: 18 }}>{s.k}</div>
            <div style={{ fontSize: 46, fontWeight: 900, color: s.ok ? K.fg : K.red, lineHeight: 1.15, marginTop: 6 }}>{s.v}</div>
            <div style={{ fontSize: 21, color: K.muted, fontWeight: 600, lineHeight: 1.45, marginTop: 14 }}>{s.note}</div>
          </Glass>
        </In>
      ))}
      <Src>nobelprize.org 2024 · ECMWF 2025-02-25 · 陶哲轩 Erdős 问题账本（至 2026-06）· ClinicalTrials.gov NCT07687459 · Nature Medicine 2025-06</Src>
    </AbsoluteFill>
  );
};
