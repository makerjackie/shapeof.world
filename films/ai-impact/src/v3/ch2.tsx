import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Odometer } from "../fx";
import { FONT, SERIF } from "../theme";
import { Silhouette } from "../v2/art";
import { Gpu, GpuHall } from "./art";
import { Backdrop, C, clamp01, EBACK, EIO, EO, lerp, Lines, pr, Src, useT } from "./kit";
import { BAR, BEAT, bar } from "./timing";

// 02 狂热 · 片中 20–36. The money pours in and turns into graphics cards; the card maker becomes the most valuable company;
// a wall goes up; DeepSeek tops both countries' charts; Nvidia loses 4 trillion yuan in a day, then sets a new high;
// a Chinese AI stock goes up 25× and down 80 %.

export const CH2 = {
  s11: ["钱来了。", "做 AI 要显卡，钱就涌向显卡。"],
  s12: ["卖显卡的英伟达，", "成了全球最值钱的公司。"],
  s13: ["最好的 AI 显卡，", "美国不让卖给中国了。"],
  s14: ["中国这边的 DeepSeek，", "用更少的显卡追了上来。"],
  s15: ["美国股市慌了：", "以后显卡要少买了？"],
  s16: ["英伟达这家公司，", "一天少值了 4 万多亿元。"],
  s17: ["可 AI 越便宜，用得越多，", "显卡更不够了。"],
  s18: ["国内一只 AI 股，", "半年涨 25 倍，又跌八成。"],
} as const;

const Coin: React.FC<{ s: number }> = ({ s }) => (
  <div style={{ width: s, height: s, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff1b8, #f1c34e 45%, #b1801c)", boxShadow: "0 4px 10px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,236,170,0.5)" }} />
);

// ── 11 · bars 20–22: four giants pour money in; on landing the coins turn into cards ──
export const Pour: React.FC = () => {
  const t = useT();
  const b0 = bar(20);
  const giants = ["微软", "谷歌", "亚马逊", "Meta（脸书母公司）"];
  const HALL = { x: 410, y: 740, w: 1100, h: 250 };
  const lit = Array.from({ length: 10 }, (_, i) => pr(t, b0 + 0.9 + i * 0.22, 0.4, EO));
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[55, 55]} strength={0.14} />
      {giants.map((g, k) => {
        const x = 560 + k * 300;
        const o = pr(t, b0 + k * 0.08, 0.4, EO);
        return (
          <React.Fragment key={g}>
            <div style={{ position: "absolute", left: x, top: 370, transform: "translateX(-50%)", opacity: o, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: C.fg, whiteSpace: "nowrap" }}>{g}</div>
            <div style={{ position: "absolute", left: x - 40, top: 420, width: 80, height: 26, borderRadius: "0 0 40px 40px", background: "rgba(255,209,102,0.25)", opacity: o }} />
            {Array.from({ length: 14 }).map((_, i) => {
              const start = b0 + 0.2 + k * 0.07 + i * 0.13;
              const p = pr(t, start, 0.55, (x) => x * x);
              if (p <= 0 || p >= 1) return null;
              const jx = (random(`cx${k}-${i}`) - 0.5) * 50;
              return (
                <div key={i} style={{ position: "absolute", left: x + jx - 13, top: lerp(440, HALL.y + 40, p), opacity: 1 - pr(p, 0.85, 0.15) }}>
                  <Coin s={26} />
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: HALL.x, top: HALL.y, opacity: pr(t, b0 + 0.3, 0.4) }}>
        <GpuHall w={HALL.w} h={HALL.h} t={t} lit={lit} />
      </div>
      <div style={{ position: "absolute", right: 110, top: 140, textAlign: "right", fontFamily: FONT, opacity: pr(t, b0 + 0.5, 0.4) }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.sub }}>四家大厂，每天投入约</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 8 }}>
          <Odometer value={lerp(0, 135, pr(t, b0 + 0.5, 1.6, EIO))} size={110} color={C.gold} />
          <span style={{ fontSize: 46, fontWeight: 900, color: C.gold }}>亿元</span>
        </div>
      </div>
      <Lines at={b0} a={CH2.s11[0]} b={CH2.s11[1]} out={bar(22) - 0.05} />
      <Src at={b0 + 0.3}>微软、谷歌、亚马逊、Meta 2026 年资本开支指引合计约 7,350 亿美元，约每天 135 亿元（推算），是 2022 年的约 5 倍；大头用于 AI 机房和显卡</Src>
    </AbsoluteFill>
  );
};

// ── 12 · bars 22–24: the card maker's tower outgrows the giants ──
export const TOWER = { x: 1300, floor: 900, w: 200 };
const towerH = (v: number) => 120 + v * 105; // v in trillions of US dollars (shape only; no figures on screen)
export const Tower: React.FC<{ v: number; crack?: number; glow?: number; label?: boolean }> = ({ v, crack = 0, glow = 1, label = true }) => {
  const h = towerH(v);
  return (
    <div style={{ position: "absolute", left: TOWER.x - TOWER.w / 2, top: TOWER.floor - h, width: TOWER.w, height: h }}>
      <div style={{ position: "absolute", inset: -40, borderRadius: 40, background: `radial-gradient(ellipse at 50% 60%, rgba(77,212,255,${0.25 * glow}), transparent 70%)` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "14px 14px 0 0", background: "linear-gradient(90deg, #1b2a36, #2a4153 45%, #1b2a36)", border: `2px solid rgba(77,212,255,${0.4 + 0.4 * glow})` }}>
        {Array.from({ length: Math.floor(h / 48) }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 22, right: 22, top: 24 + i * 48, height: 24, borderRadius: 4, background: `rgba(77,212,255,${0.12 + 0.12 * ((i + 1) % 2)})` }} />
        ))}
      </div>
      {crack > 0 ? (
        <svg width={TOWER.w + 40} height={h} style={{ position: "absolute", left: -20, top: 0, overflow: "visible" }}>
          <path d={`M0,${h * 0.42} L${TOWER.w * 0.3},${h * 0.38} L${TOWER.w * 0.45},${h * 0.47} L${TOWER.w * 0.7},${h * 0.4} L${TOWER.w + 40},${h * 0.45}`} stroke={C.red} strokeWidth={6} fill="none" strokeDasharray={600} strokeDashoffset={600 * (1 - crack)} />
        </svg>
      ) : null}
      {label ? (
        <div style={{ position: "absolute", left: "50%", top: h + 18, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: C.cyan, whiteSpace: "nowrap", textAlign: "center" }}>
          英伟达
          <div style={{ fontSize: 20, fontWeight: 700, color: C.muted }}>做显卡的公司</div>
        </div>
      ) : null}
    </div>
  );
};

const Peer: React.FC<{ x: number; v: number; name: string }> = ({ x, v, name }) => {
  const h = towerH(v);
  return (
    <div style={{ position: "absolute", left: x - 90, top: TOWER.floor - h, width: 180, height: h, borderRadius: "12px 12px 0 0", background: "linear-gradient(90deg, #1a1f27, #252c36 45%, #1a1f27)", border: "2px solid #39424f" }}>
      <div style={{ position: "absolute", left: "50%", top: h + 18, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 28, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>{name}</div>
    </div>
  );
};

export const Climb: React.FC = () => {
  const t = useT();
  const b0 = bar(22);
  const k = pr(t, b0 + 0.2, BAR * 1.1, EIO);
  // approximate market values (US$ trillions), 2022-11 → 2026-10: shape only
  const nv = lerp(0.42, 5.35, k);
  const ap = lerp(2.35, 4.3, k);
  const gg = lerp(1.3, 4.2, k);
  const crown = pr(t, b0 + 0.2 + BAR * 1.1, 0.4, EBACK);
  const card = pr(t, b0 + 2 * BEAT, 0.4, EBACK);
  const year = Math.round(lerp(2022, 2026, k));
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[66, 58]} strength={0.13} />
      <Peer x={900} v={ap} name="苹果" />
      <Peer x={1080} v={gg} name="谷歌" />
      <Tower v={nv} />
      {crown > 0 ? (
        <div style={{ position: "absolute", left: TOWER.x, top: TOWER.floor - towerH(nv) - 70, transform: `translateX(-50%) scale(${crown})`, padding: "6px 20px", borderRadius: 12, background: C.gold, color: C.ink, fontFamily: FONT, fontWeight: 900, fontSize: 34, whiteSpace: "nowrap" }}>全球第 1</div>
      ) : null}
      <div style={{ position: "absolute", left: 1520, top: TOWER.floor - 60, fontFamily: FONT, fontSize: 48, fontWeight: 900, color: C.sub, fontVariantNumeric: "tabular-nums" }}>{year}</div>
      {card > 0 ? (
        <div style={{ position: "absolute", left: 120, top: 520, transform: `scale(${card})`, transformOrigin: "0 50%", opacity: Math.min(1, card), padding: "26px 34px", borderRadius: 24, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassLine}`, fontFamily: FONT }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>四年前买 1 万元英伟达股票</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: C.sub }}>今天约</span>
            <Odometer value={lerp(1, 12, pr(t, b0 + 2 * BEAT + 0.2, 1.6, EIO))} size={96} color={C.green} />
            <span style={{ fontSize: 40, fontWeight: 900, color: C.green }}>万元</span>
          </div>
        </div>
      ) : null}
      <Lines at={b0} a={CH2.s12[0]} b={CH2.s12[1]} out={bar(24) - 0.05} />
      <Src at={b0 + 0.3}>按市值排名示意（2022-11 → 2026-10）· 英伟达 2025-07 成为第一家 4 万亿美元公司，2025-10 第一家 5 万亿 · 1 万元 → 约 12 万元为推算，不计分红和税费</Src>
    </AbsoluteFill>
  );
};

// ── 13 · bars 24–26: the wall, five bricks; a card bounces back ──
export const WALL = { x: 960, floor: 900 };
export const BRICKS = ["2022.10", "2023.10", "2024.12", "2025.04", "2026.01"];
export const WallScene: React.FC<{ b0: number; build?: boolean }> = ({ b0, build = true }) => {
  const t = useT();
  return (
    <>
      <div style={{ position: "absolute", left: 140, top: 430, opacity: pr(t, b0, 0.4) }}>
        <Silhouette id="840" w={600} h={380} fill="rgba(77,212,255,0.08)" stroke="rgba(77,212,255,0.55)" />
        <div style={{ position: "absolute", left: 300, top: 395, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 32, fontWeight: 900, color: C.cyan, whiteSpace: "nowrap" }}>美国</div>
      </div>
      <div style={{ position: "absolute", left: 1220, top: 420, opacity: pr(t, b0, 0.4) }}>
        <Silhouette id="156" w={560} h={420} fill="rgba(255,159,67,0.08)" stroke="rgba(255,159,67,0.55)" />
        <div style={{ position: "absolute", left: 280, top: 430, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 32, fontWeight: 900, color: C.orange, whiteSpace: "nowrap" }}>中国</div>
      </div>
      {BRICKS.map((d, i) => {
        const p = build ? pr(t, b0 + 0.3 + i * BEAT * 0.9, 0.35, EBACK) : 1;
        if (p <= 0) return null;
        const y = WALL.floor - (i + 1) * 92;
        return (
          <div key={d} style={{ position: "absolute", left: WALL.x - 90, top: lerp(y - 260, y, Math.min(1, p)), width: 180, height: 86, borderRadius: 8, background: "linear-gradient(180deg, #5a4a3e, #3d3029)", border: "2px solid #6e5b4c", boxShadow: "0 10px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 26, fontWeight: 900, color: "#e9d8c4", opacity: Math.min(1, p * 2) }}>
            {d}
          </div>
        );
      })}
    </>
  );
};
export const BOUNCE_AT = bar(24) + 0.3 + 5 * BEAT * 0.9 + 0.1;
export const Wall: React.FC = () => {
  const t = useT();
  const b0 = bar(24);
  const fly = pr(t, BOUNCE_AT - 0.45, 0.45, (x) => x);
  const back = pr(t, BOUNCE_AT, 0.6, EO);
  const gx = t < BOUNCE_AT ? lerp(560, WALL.x - 190, fly) : lerp(WALL.x - 190, 520, back);
  const rot = t < BOUNCE_AT ? 0 : -40 * back;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.orange} at={[50, 62]} strength={0.1} />
      <WallScene b0={b0} />
      {fly > 0 ? (
        <div style={{ position: "absolute", left: gx - 80, top: 620 - Math.sin(back * Math.PI) * 80, transform: `rotate(${rot}deg)`, opacity: 1 - pr(t, BOUNCE_AT + 0.4, 0.3) }}>
          <Gpu w={160} t={t} glow={1} id="wallgpu" />
        </div>
      ) : null}
      <Lines at={b0} a={CH2.s13[0]} b={CH2.s13[1]} out={bar(26) - 0.05} />
      <Src at={b0 + 0.3}>2022 年 10 月起，美国五轮对华先进芯片出口管制（美国联邦公报）</Src>
    </AbsoluteFill>
  );
};

// ── 14 · bars 26–28: DeepSeek climbs both app charts ──
const Chart: React.FC<{ x: number; y: number; title: string; color: string; rank: number; names: string[] }> = ({ x, y, title, color, rank, names }) => {
  const rows = 5;
  const rowH = 62;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 380, padding: "18px 20px", borderRadius: 22, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.glassLine}`, fontFamily: FONT }}>
      <div style={{ fontSize: 24, fontWeight: 900, color, marginBottom: 12 }}>{title}</div>
      <div style={{ position: "relative", height: rows * rowH }}>
        {names.map((n, i) => {
          const slot = i < rank - 1 ? i : i + 1;
          return (
            <div key={n} style={{ position: "absolute", left: 0, right: 0, top: slot * rowH, height: rowH - 10, display: "flex", alignItems: "center", gap: 14, color: C.sub, fontSize: 24, fontWeight: 700, opacity: slot >= rows ? 0 : 1 }}>
              <span style={{ width: 28, color: C.muted }}>{slot + 1}</span>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(244,240,232,0.12)" }} />
              {n}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: (rank - 1) * rowH, height: rowH - 10, display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 900, color: C.fg, background: rank === 1 ? "rgba(255,209,102,0.16)" : "transparent", borderRadius: 10 }}>
          <span style={{ width: 28, color: rank === 1 ? C.gold : C.muted }}>{rank}</span>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "#4d6bfe" }} />
          DeepSeek
        </div>
      </div>
    </div>
  );
};
export const Charts: React.FC = () => {
  const t = useT();
  const b0 = bar(26);
  const rankAt = (s: number) => Math.max(1, 6 - Math.floor(pr(t, s, 1.0, (x) => x) * 6));
  const cn = rankAt(b0 + 0.3);
  const usOn = pr(t, b0 + 1.6, 0.4, EO);
  const us = rankAt(b0 + 1.8);
  const hop = pr(t, b0 + 1.35, 0.5, EIO);
  const date = pr(t, b0 + 3.0, 0.4, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.orange} at={[60, 60]} strength={0.1} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        <WallScene b0={b0 - 1} build={false} />
      </div>
      <Chart x={1260} y={430} title="中国区 · 免费榜" color={C.orange} rank={cn} names={["应用 A", "应用 B", "应用 C", "应用 D", "应用 E"]} />
      {usOn > 0 ? (
        <div style={{ opacity: usOn }}>
          <Chart x={280} y={430} title="美国区 · 免费榜" color={C.cyan} rank={us} names={["ChatGPT", "Threads", "Gemini", "应用 F", "应用 G"]} />
        </div>
      ) : null}
      {hop > 0 && hop < 1 ? (
        <div style={{ position: "absolute", left: lerp(1300, 320, hop), top: 480 - Math.sin(hop * Math.PI) * 260, width: 44, height: 44, borderRadius: 12, background: "#4d6bfe", boxShadow: "0 0 30px #4d6bfe" }} />
      ) : null}
      {date > 0 ? (
        <div style={{ position: "absolute", left: 960, top: 840, transform: `translateX(-50%) scale(${date})`, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.gold, whiteSpace: "nowrap" }}>2025.01.27 · 中美同时第一</div>
      ) : null}
      <Lines at={b0} a={CH2.s14[0]} b={CH2.s14[1]} out={bar(28) - 0.05} />
      <Src at={b0 + 0.3}>DeepSeek（杭州）2025-01-27 同时登顶中国区、美国区 App Store 免费榜（界面新闻、TechNode）· 榜单其余应用为示意</Src>
    </AbsoluteFill>
  );
};

// ── 15 · bars 28–30: the market panics ──
export const Panic: React.FC = () => {
  const t = useT();
  const b0 = bar(28);
  const cells = 6 * 4;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.red} at={[60, 60]} strength={0.16} />
      {Array.from({ length: cells }).map((_, i) => {
        const c = i % 6;
        const r = Math.floor(i / 6);
        const p = pr(t, b0 + 0.2 + (c + r) * 0.06, 0.3, EO);
        const v = -(2 + random(`pv${i}`) * 15);
        return (
          <div key={i} style={{ position: "absolute", left: 560 + c * 210, top: 420 + r * 120, width: 190, height: 100, borderRadius: 14, background: `rgba(255,90,95,${0.08 + 0.1 * p})`, border: "1px solid rgba(255,90,95,0.35)", opacity: p, fontFamily: FONT, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 20 }}>
            <div style={{ width: 70 + (i % 3) * 20, height: 10, borderRadius: 5, background: "rgba(244,240,232,0.25)" }} />
            <div style={{ fontSize: 34, fontWeight: 900, color: C.red, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>▼ {Math.abs(v).toFixed(1)}%</div>
          </div>
        );
      })}
      <Lines at={b0} a={CH2.s15[0]} b={CH2.s15[1]} out={bar(30) - 0.05} />
      <Src at={b0 + 0.3}>2025-01-27：纳斯达克 −3.1%，费城半导体指数 −9.2%（路透）· 市场担心低成本模型会减少对芯片的需求 · 行情格为示意</Src>
    </AbsoluteFill>
  );
};

// ── 16 · bars 30–32: the tower cracks: about 4.3 trillion yuan in a day ──
export const CRACK_AT = bar(30) + 2 * BEAT;
export const Crack: React.FC = () => {
  const t = useT();
  const b0 = bar(30);
  const crack = pr(t, CRACK_AT, 0.3, EO);
  const drop = pr(t, CRACK_AT + 0.25, 0.6, EIO);
  const nv = 3.49 - (3.49 - 2.9) * drop;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.red} at={[66, 55]} strength={0.12 + 0.1 * crack} />
      <Tower v={nv} crack={crack} glow={1 - 0.6 * drop} />
      <div style={{ position: "absolute", left: 140, top: 520, fontFamily: FONT, opacity: pr(t, CRACK_AT + 0.2, 0.4) }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.sub }}>2025 年 1 月 27 日，一天</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 100, fontWeight: 900, color: C.red }}>−</span>
          <Odometer value={lerp(0, 4.3, pr(t, CRACK_AT + 0.2, 1.0, EIO))} size={110} decimals={1} color={C.red} />
          <span style={{ fontSize: 48, fontWeight: 900, color: C.red }}>万亿元</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.muted, marginTop: 6 }}>美股史上最大的单日跌幅</div>
      </div>
      <Lines at={b0} a={CH2.s16[0]} b={CH2.s16[1]} out={bar(32) - 0.05} />
      <Src at={b0 + 0.3}>英伟达 2025-01-27 市值一天跌掉约 5,890 亿美元（Bloomberg），按当时汇率约 4.3 万亿元，美股单日最大</Src>
    </AbsoluteFill>
  );
};

// ── 17 · bars 32–34: cheaper AI, more use, more cards: a new high ──
export const Rebound: React.FC = () => {
  const t = useT();
  const b0 = bar(32);
  const k = pr(t, b0 + 0.6, BAR * 0.9, EIO);
  const nv = lerp(2.9, 4.0, k);
  const flag = pr(t, b0 + 0.6 + BAR * 0.9, 0.4, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[66, 55]} strength={0.14} />
      {Array.from({ length: 40 }).map((_, i) => {
        const start = b0 + random(`rb${i}`) * BAR * 1.6;
        const p = pr(t, start, 0.9, (x) => x);
        if (p <= 0 || p >= 1) return null;
        return <div key={i} style={{ position: "absolute", left: 560 + random(`rx${i}`) * 560, top: lerp(260, 940, p), width: 30, height: 20, borderRadius: 8, background: i % 4 === 0 ? "rgba(77,212,255,0.6)" : "rgba(244,240,232,0.22)", opacity: 1 - p * 0.6 }} />;
      })}
      <div style={{ position: "absolute", left: 140, top: 520, fontFamily: FONT, opacity: pr(t, b0 + 0.4, 0.4) }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: C.green }}>价格 ↓</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: C.cyan, marginTop: 10 }}>用量 ↑</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.sub, marginTop: 20, lineHeight: 1.5 }}>谷歌每月处理的 AI 文字量<br />两年涨了约 330 倍</div>
      </div>
      <Tower v={nv} />
      {flag > 0 ? (
        <div style={{ position: "absolute", left: TOWER.x, top: TOWER.floor - towerH(nv) - 70, transform: `translateX(-50%) scale(${flag})`, padding: "6px 20px", borderRadius: 12, background: C.green, color: C.ink, fontFamily: FONT, fontWeight: 900, fontSize: 32, whiteSpace: "nowrap" }}>半年后 · 创新高</div>
      ) : null}
      <Lines at={b0} a={CH2.s17[0]} b={CH2.s17[1]} out={bar(34) - 0.05} />
      <Src at={b0 + 0.3}>谷歌每月处理的 token：约 9.7 万亿（2024）→ 3,200 万亿（2026-05，自报）· 英伟达 2025-07-09 成为第一家市值 4 万亿美元的公司</Src>
    </AbsoluteFill>
  );
};

// ── 18 · bars 34–36: one AI stock, 116 → 2,980 → 485 ──
const ZP: [number, number][] = [
  [0, 116],
  [0.08, 131],
  [0.2, 420],
  [0.33, 980],
  [0.45, 1650],
  [0.55, 2980],
  [0.62, 2130],
  [0.7, 1588],
  [0.78, 1136],
  [0.88, 720],
  [1, 485],
];
export const ZhipuChart: React.FC = () => {
  const t = useT();
  const b0 = bar(34);
  const draw = pr(t, b0 + 0.3, BAR * 1.3, (x) => x);
  const W = 1000;
  const H = 440;
  const X0 = 620;
  const Y0 = 400;
  const px = (u: number) => X0 + u * W;
  const py = (v: number) => Y0 + H - (v / 3000) * H;
  const pts = ZP.filter(([u]) => u <= draw);
  const last = pts[pts.length - 1];
  const nextI = ZP.findIndex(([u]) => u > draw);
  const tip = nextI > 0 ? [draw, lerp(ZP[nextI - 1][1], ZP[nextI][1], (draw - ZP[nextI - 1][0]) / (ZP[nextI][0] - ZP[nextI - 1][0]))] : last;
  const d = [...pts, tip].map(([u, v], i) => `${i === 0 ? "M" : "L"}${px(u)},${py(v)}`).join(" ");
  const ticker = ["寒武纪的股价一度超过茅台", "国内 1,112 款 AI 产品完成备案", "两家美国 AI 公司估值逼近 1 万亿美元"];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[60, 55]} strength={0.12} />
      <div style={{ position: "absolute", left: X0, top: Y0 - 60, fontFamily: FONT, fontSize: 30, fontWeight: 900, color: C.fg, opacity: pr(t, b0 + 0.2, 0.4) }}>
        智谱 <span style={{ fontSize: 22, color: C.muted, fontWeight: 700 }}>中国大模型公司 · 港股 · 港元</span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={X0} x2={X0 + W} y1={Y0 + H} y2={Y0 + H} stroke="rgba(244,240,232,0.2)" strokeWidth={2} />
        <path d={d} fill="none" stroke={C.gold} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {[
        [0, 116, "116 · 上市", 0.02],
        [0.55, 2980, "▲ 2,980 · 最高", 0.55],
        [1, 485, "▼ 485 · 10 月", 1],
      ].map(([u, v, label, at]) =>
        draw >= (at as number) ? (
          <div key={label as string} style={{ position: "absolute", left: px(u as number), top: py(v as number) - 52, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: (at as number) === 0 ? C.sub : C.fg, whiteSpace: "nowrap" }}>
            {label as string}
          </div>
        ) : null,
      )}
      {[
        ["2026.01", 0],
        ["2026.06", 0.55],
        ["2026.10", 1],
      ].map(([l, u]) => (
        <div key={l as string} style={{ position: "absolute", left: px(u as number), top: Y0 + H + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.muted }}>
          {l as string}
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 940, height: 50, overflow: "hidden", opacity: pr(t, b0 + 1.2, 0.5) }}>
        <div style={{ position: "absolute", left: 1920 - (t - b0) * 260, top: 8, whiteSpace: "nowrap", fontFamily: FONT, fontSize: 26, fontWeight: 800, color: C.gold }}>
          {ticker.map((s) => (
            <span key={s} style={{ marginRight: 120 }}>◆ {s}</span>
          ))}
        </div>
      </div>
      <Lines at={b0} a={CH2.s18[0]} b={CH2.s18[1]} out={bar(36) - 0.05} />
      <Src at={b0 + 0.3}>智谱（02513.HK）：发行价 116.2 港元（2026-01-08）→ 盘中最高 2,980（2026-06-22）→ 收盘 484.8（2026-10-20）；曲线中段为示意 · 寒武纪 2025-08 起多次超过茅台 · 国家网信办备案 1,112 款（2026-08）</Src>
    </AbsoluteFill>
  );
};
