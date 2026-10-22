import React from "react";
import { AbsoluteFill } from "remotion";
import { Curve, Dot, GridY, lin, linePath, TimeTicks, toXY } from "../charts";
import { DDR4_SPOT, DDR5_SPOT, yr } from "../data";
import { Arc, ISO, proj, WorldMap } from "../geo";
import { EBACK, EIO, EO, Glass, In, progAt, Tag } from "../fx";
import { Stamp, useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Head, Src } from "../ui";
import { LaneZoom } from "../zoom";

const HEAD = { position: "absolute", left: 120, top: 128 } as const;

// ───────── 02-1 Memory: spot prices, a RAM-kit price tag, one quarter's profit ─────────

export const Memory: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 220, y: 330, w: 1000, h: 520 };
  const sx = lin(yr("2023-06"), yr("2026-11"), box.x, box.x + box.w);
  const sy = lin(0, 70, box.y + box.h, box.y);
  const d5 = toXY(DDR5_SPOT, sx, sy);
  const d4 = toXY(DDR4_SPOT, sx, sy);
  const draw4 = progAt(frame, 0.8, 3.2, EIO);
  const draw5 = progAt(frame, 1.6, 3.2, EIO);
  return (
    <AbsoluteFill>
      <LaneZoom lane="chip" to={box} />
      <div style={HEAD}>
        <Head at={0.5} size={76} parts={["内存，一年多", { t: "涨到 10 倍", c: K.red }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 232 }}>
        <In at={1.6} from="up">
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>AI 要的高带宽内存和服务器内存，吃掉了工厂的产能。</div>
        </In>
      </div>
      <GridY box={box} ticks={[0, 20, 40, 60]} sy={sy} fmt={(v) => `$${v}`} opacity={progAt(frame, 0.6, 1)} />
      <div style={{ position: "absolute", left: box.x - 140, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>美元 / 颗 · 现货价</div>
      <TimeTicks box={box} sx={sx} years={[2024, 2025, 2026]} />
      <Curve id="ddr4" box={box} d={linePath(d4)} color={`${K.chip}`} draw={draw4} width={3} dash="8 7" glow={0.2} opacity={0.7} />
      <Curve id="ddr5" box={box} d={linePath(d5)} color={K.chip} draw={draw5} width={5} />
      {d5.map(([x, y], i) => (
        <Dot key={i} x={x} y={y} color={K.chip} r={6} opacity={progAt(frame, 1.6 + 3.2 * ((x - box.x) / box.w), 0.4)} />
      ))}
      <div style={{ position: "absolute", left: d5[0][0] - 190, top: d5[0][1] - 92, fontFamily: FONT, opacity: progAt(frame, 2, 0.6) }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: K.fg }}>$6.01</div>
        <div style={{ fontSize: 19, color: K.muted, fontWeight: 600 }}>DDR5 16Gb · 2025-06-23</div>
      </div>
      <div style={{ position: "absolute", left: d5[3][0] - 230, top: d5[3][1] - 24, fontFamily: FONT, opacity: progAt(frame, 4.6, 0.6), textAlign: "right", width: 210 }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: K.red }}>$61.10</div>
        <div style={{ fontSize: 19, color: K.muted, fontWeight: 600 }}>2026-10-22</div>
      </div>
      <div style={{ position: "absolute", left: box.x + 30, top: box.y + 30, fontFamily: FONT, fontSize: 21, color: K.muted, fontWeight: 600, opacity: progAt(frame, 1, 0.6), lineHeight: 1.5 }}>
        <span style={{ color: K.chip }}>━</span> DDR5 16Gb　<span style={{ color: K.chip, opacity: 0.7 }}>┅</span> DDR4 8Gb（2023 年为 2666 规格，仅示意）
      </div>
      {/* cards */}
      {[
        {
          at: 5.4,
          title: "一根 32GB 内存条",
          body: (
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8 }}>
              <span style={{ fontSize: 44, fontWeight: 900, color: K.muted, textDecoration: "line-through", textDecorationColor: K.red }}>&lt;$100</span>
              <span style={{ fontSize: 30, color: K.muted }}>→</span>
              <span style={{ fontSize: 60, fontWeight: 900, color: K.red }}>$449</span>
            </div>
          ),
          note: "DDR5-6000 · 2025 年中 → 2026-10 美国最低价",
        },
        {
          at: 6.4,
          title: "SK 海力士，一个季度的利润",
          body: (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 54, fontWeight: 900, color: K.fg }}>60.5 万亿</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: K.muted }}> 韩元</span>
            </div>
          ),
          note: "2026 年二季度 · 超过它 2025 年全年（47.2 万亿）",
        },
        {
          at: 7.4,
          title: "内存合约价，单季涨幅",
          body: <div style={{ marginTop: 8, fontSize: 54, fontWeight: 900, color: K.red }}>+93% ~ +98%</div>,
          note: "通用 DRAM · 2026 年一季度",
        },
      ].map((c) => (
        <In key={c.title} at={c.at} from="flip" style={{ position: "absolute", left: 1310, top: 300 + [5.4, 6.4, 7.4].indexOf(c.at) * 190 }}>
          <Glass glow={K.chip} style={{ width: 500, height: 170, padding: "18px 26px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>{c.title}</div>
            {c.body}
            <div style={{ fontSize: 18, color: K.muted, fontWeight: 600, marginTop: 2 }}>{c.note}</div>
          </Glass>
        </In>
      ))}
      <Src>TrendForce / DRAMeXchange 现货价与合约价 · Tom's Hardware 内存价格追踪 · SK 海力士财报 2026-07-29 · "10 倍"= 61.10 ÷ 6.01</Src>
    </AbsoluteFill>
  );
};

// ───────── 02-2 The squeeze: memory's share of a PC's parts bill, Apple's price tags, PC shipments ─────────

const PARTS_BEFORE = [
  { n: "内存", v: 16.5, c: K.red },
  { n: "处理器", v: 30, c: "#5a6b80" },
  { n: "屏幕", v: 18, c: "#46546a" },
  { n: "其他", v: 35.5, c: "#2e3846" },
];

export const Squeeze: React.FC = () => {
  const frame = useBeatFrame();
  const g = progAt(frame, 2.4, 1.4, EIO);
  const mem = 16.5 + (35 - 16.5) * g;
  const rest = 100 - mem;
  const parts = PARTS_BEFORE.map((p, i) => (i === 0 ? { ...p, v: mem } : { ...p, v: (p.v / 83.5) * rest }));
  const tag = progAt(frame, 4.2, 0.9, EIO);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["AI 抢走的内存，", { t: "你买电脑时付账", c: K.red }, "。"]} />
      </div>
      {/* parts bill */}
      <div style={{ position: "absolute", left: 120, top: 300, fontFamily: FONT }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: K.fg }}>一台电脑的零件成本里，内存占多少</div>
        <div style={{ fontSize: 21, color: K.muted, marginTop: 4 }}>惠普财报会 · 上一季 15–18% → 2026 年 2 月 35%</div>
        <div style={{ display: "flex", width: 1000, height: 96, marginTop: 22, borderRadius: 14, overflow: "hidden", opacity: progAt(frame, 0.8, 0.8) }}>
          {parts.map((p) => (
            <div key={p.n} style={{ width: `${p.v}%`, background: p.c, display: "flex", alignItems: "center", justifyContent: "center", color: K.fg, fontSize: p.n === "内存" ? 34 : 24, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden" }}>
              {p.n === "内存" ? `内存 ${Math.round(p.v)}%` : p.n}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 18, color: K.muted, marginTop: 8 }}>除内存外的分块为示意，不按比例</div>
      </div>
      {/* Apple price tags */}
      <div style={{ position: "absolute", left: 120, top: 560, display: "flex", gap: 24, perspective: 1200 }}>
        {[
          { n: "MacBook Air 512GB", a: "$1,099", b: "$1,299" },
          { n: "MacBook Pro 1TB", a: "$1,699", b: "$1,999" },
          { n: "iPad Air", a: "$599", b: "$749" },
        ].map((t, i) => {
          const q = progAt(frame, 4.2 + i * 0.3, 0.9, EIO);
          const front = q < 0.5;
          return (
            <div key={t.n} style={{ width: 300, height: 170, transform: `rotateX(${front ? q * 180 : (q - 1) * 180}deg)`, opacity: progAt(frame, 3.6 + i * 0.2, 0.5) }}>
              <Glass style={{ width: 300, height: 170, padding: "18px 22px", boxSizing: "border-box", borderColor: front ? undefined : `${K.red}88` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: K.sub }}>{t.n}</div>
                <div style={{ fontSize: 60, fontWeight: 900, color: front ? K.fg : K.red, marginTop: 10 }}>{front ? t.a : t.b}</div>
              </Glass>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 120, top: 752 }}>
        <In at={5.4} from="up">
          <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: K.sub, maxWidth: 960, lineHeight: 1.4 }}>
            "我们从没见过零部件涨价这么多、这么快。"<span style={{ color: K.muted, fontSize: 22 }}>——苹果，2026-06-25 全线涨价</span>
          </div>
        </In>
      </div>
      {/* shipments */}
      <In at={1.2} from="flip" style={{ position: "absolute", left: 1220, top: 300 }}>
        <Glass glow={K.red} style={{ width: 580, height: 560, padding: "26px 32px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>全球电脑出货，同比</div>
          <div style={{ position: "absolute", left: 32, right: 32, top: 110, bottom: 120 }}>
            {[
              { q: "2026 Q3 实际", v: -21 },
              { q: "Q4 预计", v: -27 },
            ].map((b, i) => {
              const h = progAt(frame, 1.8 + i * 0.6, 1, EBACK);
              return (
                <div key={b.q} style={{ position: "absolute", left: 30 + i * 260, top: 0, width: 190, height: (Math.abs(b.v) / 30) * 300 * h, background: i ? `repeating-linear-gradient(135deg, ${K.red}cc 0 10px, ${K.red}66 10px 18px)` : K.red, borderRadius: "0 0 10px 10px" }}>
                  <div style={{ position: "absolute", bottom: -64, left: 0, right: 0, textAlign: "center", fontSize: 50, fontWeight: 900, color: K.red }}>{Math.round(b.v * h)}%</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: 32, right: 32, bottom: 26, display: "flex", justifyContent: "space-around", fontSize: 22, color: K.muted, fontWeight: 600 }}>
            <span>2026 Q3 · 5,700 万台</span>
            <span>Q4 · 预测</span>
          </div>
        </Glass>
      </In>
      <Src>Counterpoint 2026-10-22 · 惠普财报会 2026-02（经 Tom's Hardware）· CNBC 2026-06-25（价格以苹果官网为准）</Src>
    </AbsoluteFill>
  );
};

// ───────── 02-3 The chip wall: the supply chain on a real map, five rounds of US controls, China's counter ─────────

const RULES = [
  { d: "2022-10", t: "先进芯片与设备" },
  { d: "2023-10", t: "堵住 A800/H800" },
  { d: "2024-12", t: "高带宽内存、140 个实体" },
  { d: "2025-04", t: "H20 也要许可" },
  { d: "2026-01", t: "逐案审批，美国先检测" },
];

export const ChipWall: React.FC = () => {
  const frame = useBeatFrame();
  const lit = progAt(frame, 0.3, 0.8);
  const wall = progAt(frame, 4.2, 1.2, EO);
  const [cx, cy] = proj(104, 35);
  const fills = {
    [ISO.us]: `${K.chip}${lit > 0.5 ? "66" : "33"}`,
    [ISO.tw]: `${K.chip}aa`,
    [ISO.kr]: `${K.chip}88`,
    [ISO.nl]: `${K.chip}88`,
    [ISO.cn]: `${K.red}${wall > 0.5 ? "55" : "22"}`,
  };
  const lab = (lon: number, lat: number, at: number, name: string, fact: string, dx = 16, dy = -10) => {
    const [x, y] = proj(lon, lat);
    return (
      <div style={{ position: "absolute", left: x + dx, top: y + dy, fontFamily: FONT, opacity: progAt(frame, at, 0.6), whiteSpace: "nowrap", textShadow: "0 2px 12px #000" }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: K.fg }}>{name}</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: K.chip }}>{fact}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <WorldMap fills={fills} />
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["芯片，成了中美之间的", { t: "一堵墙", c: K.red }, "。"]} />
      </div>
      {/* supply chain */}
      <Arc from={[-100, 38]} to={[121, 24]} color={K.chip} p={progAt(frame, 1, 1.4, EIO)} lift={0.18} />
      <Arc from={[5.3, 52]} to={[121, 24]} color={K.chip} p={progAt(frame, 1.6, 1.4, EIO)} lift={0.2} />
      <Arc from={[128, 36.5]} to={[121, 24]} color={K.chip} p={progAt(frame, 2.2, 1, EIO)} lift={0.6} />
      {lab(-100, 40, 1.2, "美国：设计", "英伟达、AMD")}
      {lab(5.3, 52.2, 1.8, "荷兰：光刻机", "ASML", 14, -60)}
      {lab(121, 23.7, 2.4, "台湾：最先进的芯片", "全球 92%（10 纳米以下）", 22, 6)}
      {lab(128, 36.4, 2.8, "韩国：高带宽内存", "全球 83%", 20, -46)}
      {/* the wall: a ring around China, stamped with the rounds */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <ellipse cx={cx - 10} cy={cy + 6} rx={150 * wall + 1} ry={110 * wall + 1} fill="none" stroke={K.red} strokeWidth={6} strokeDasharray="18 10" opacity={wall} />
      </svg>
      <Glass style={{ position: "absolute", left: 90, top: 560, width: 560, padding: "16px 24px", boxSizing: "border-box", opacity: progAt(frame, 3.6, 0.6) }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: K.red }}>美国对华 AI 芯片管制</div>
        {RULES.map((r, i) => (
          <div key={r.d} style={{ display: "flex", gap: 14, alignItems: "baseline", marginTop: 6, opacity: progAt(frame, 3.8 + i * 0.35, 0.4) }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: K.fg, fontVariantNumeric: "tabular-nums", width: 116, whiteSpace: "nowrap" }}>{r.d}</span>
            <span style={{ fontSize: 23, fontWeight: 600, color: K.sub }}>{r.t}</span>
          </div>
        ))}
      </Glass>
      <Glass glow={K.red} style={{ position: "absolute", left: 1350, top: 690, width: 490, padding: "18px 24px", boxSizing: "border-box", opacity: progAt(frame, 6, 0.6) }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: K.fg }}>中国的反制：稀土</div>
        <div style={{ display: "flex", gap: 26, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, color: K.red }}>69%</div>
            <div style={{ fontSize: 20, color: K.muted, fontWeight: 600 }}>全球开采</div>
          </div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, color: K.red }}>91%</div>
            <div style={{ fontSize: 20, color: K.muted, fontWeight: 600 }}>全球精炼</div>
          </div>
        </div>
        <div style={{ fontSize: 20, color: K.sub, fontWeight: 600, marginTop: 6 }}>2025-04、2025-10 两轮出口管制（后者暂停至 2026-11）</div>
      </Glass>
      <div style={{ position: "absolute", left: cx - 120, top: cy - 160 }}>
        {wall > 0 ? (
          <Stamp at={4.4} color={K.red} size={34} rotate={-8}>
            五轮管制
          </Stamp>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 120, top: 232 }}>
        <In at={6.6} from="up">
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            英伟达来自中国的收入：<span style={{ color: K.fg, fontWeight: 900 }}>约 1/4 → 不到 1/10</span>
            <span style={{ fontSize: 20, color: K.muted }}>　26%（FY2022）→ 9%（FY2026，口径有变）</span>
          </div>
        </In>
      </div>
      <Src>美国联邦公报（BIS 2022–2026）· 商务部公告 2025 年第 18、61 号等 · 英伟达 10-K · SIA×BCG 2021 · Counterpoint 2026 · USGS 2026 · IEA</Src>
    </AbsoluteFill>
  );
};

// ───────── 02-4 China's answer: open weights, low prices, users ─────────

export const ChinaAnswer: React.FC = () => {
  const frame = useBeatFrame();
  const pie = progAt(frame, 1, 1.6, EIO);
  const r = 120;
  const a = pie * 0.41 * Math.PI * 2;
  const arc = `M${r},${r} L${r},0 A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${r + r * Math.sin(a)},${r - r * Math.cos(a)} Z`;
  const cards = [
    {
      at: 0.8,
      w: 820,
      body: (
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <svg width={240} height={240}>
            <circle cx={r} cy={r} r={r} fill="#232a33" />
            <path d={arc} fill={K.red} />
            <circle cx={r} cy={r} r={58} fill={K.panel} />
          </svg>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>Hugging Face 上的模型下载</div>
            <div style={{ fontSize: 96, fontWeight: 900, color: K.fg, lineHeight: 1 }}>41%</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>来自中国模型，最多</div>
            <div style={{ fontSize: 20, color: K.muted, marginTop: 6 }}>千问的衍生模型超过 11.3 万个</div>
          </div>
        </div>
      ),
    },
    {
      at: 2,
      w: 820,
      body: (
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>每百万输入 token 的价格（2025 年 1 月）</div>
          {[
            { n: "OpenAI o1", v: 15, c: "#5a6b80" },
            { n: "DeepSeek-R1", v: 0.55, c: K.green },
          ].map((b, i) => {
            const g = progAt(frame, 2.4 + i * 0.4, 1, EO);
            return (
              <div key={b.n} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
                <span style={{ width: 210, fontSize: 28, fontWeight: 800 }}>{b.n}</span>
                <div style={{ width: Math.max(8, (b.v / 15) * 440 * g), height: 40, background: b.c, borderRadius: 8 }} />
                <span style={{ fontSize: 36, fontWeight: 900, color: b.c === K.green ? K.green : K.fg }}>${b.v}</span>
              </div>
            );
          })}
          <div style={{ fontSize: 22, color: K.green, fontWeight: 800, marginTop: 10 }}>便宜约 27 倍</div>
        </div>
      ),
    },
    {
      at: 3.2,
      w: 820,
      body: (
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>美中最强模型的差距（大模型竞技场评分）</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
            <span style={{ fontSize: 96, fontWeight: 900, color: K.fg, lineHeight: 1 }}>2.7%</span>
            <span style={{ fontSize: 24, color: K.muted, fontWeight: 600 }}>2026 年 3 月 · 斯坦福 AI 指数</span>
          </div>
        </div>
      ),
    },
    {
      at: 4.4,
      w: 820,
      body: (
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>中国用过生成式 AI 的人</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
            <span style={{ fontSize: 60, fontWeight: 900, color: K.muted }}>2.49 亿</span>
            <span style={{ fontSize: 40, color: K.muted }}>→</span>
            <span style={{ fontSize: 96, fontWeight: 900, color: K.fg, lineHeight: 1 }}>6.02 亿</span>
          </div>
          <div style={{ fontSize: 21, color: K.muted, marginTop: 4 }}>2024-12 → 2025-12 · 豆包月活 3.82 亿（2026-05）</div>
        </div>
      ),
    },
  ];
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["墙那边，中国用", { t: "开源和低价", c: K.chip }, "追了上来。"]} />
      </div>
      {cards.map((c, i) => (
        <In key={i} at={c.at} from="flip" style={{ position: "absolute", left: 120 + (i % 2) * 850, top: 290 + Math.floor(i / 2) * 330 }}>
          <Glass glow={i === 0 ? K.red : K.chip} style={{ width: c.w, height: 300, padding: "26px 32px", boxSizing: "border-box" }}>
            {c.body}
          </Glass>
        </In>
      ))}
      <Src>Hugging Face 2026-03-17 · DeepSeek、OpenAI 官方价目 2025-01 · Stanford AI Index 2026 · CNNIC 第 57 次报告 · QuestMobile 2026-07</Src>
    </AbsoluteFill>
  );
};
