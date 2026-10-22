import React from "react";
import { AbsoluteFill } from "remotion";
import { GridY, lin } from "../charts";
import { DC_TWH, PJM } from "../data";
import { PJM_STATES, UsMap, usProj } from "../geo";
import { EBACK, Glass, In, progAt, Tag } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Head, Src } from "../ui";
import { LaneZoom } from "../zoom";

const HEAD = { position: "absolute", left: 120, top: 128 } as const;

// ───────── 03-1 The grid: data-centre demand grows 6× faster than all demand; PJM's capacity price ×11 ─────────

export const Grid: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 820, y: 330, w: 980, h: 500 };
  const sy = lin(0, 400, box.y + box.h, box.y);
  const bw = box.w / PJM.length;
  return (
    <AbsoluteFill>
      <LaneZoom lane="power" to={box} />
      <div style={HEAD}>
        <Head at={0.5} size={72} parts={["美国最大电网的\"预订价\"，", { t: "涨到 11 倍", c: K.power }, "。"]} />
      </div>
      {/* left: growth comparison */}
      <In at={1} from="flip" style={{ position: "absolute", left: 120, top: 330 }}>
        <Glass glow={K.power} style={{ width: 560, height: 500, padding: "24px 30px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>2025 年用电增长</div>
          <div style={{ fontSize: 20, color: K.muted, marginTop: 4 }}>全球 · IEA</div>
          {[
            { n: "数据中心", v: DC_TWH.growth2025, c: K.power },
            { n: "全部用电", v: DC_TWH.world2025, c: "#5a6b80" },
          ].map((b, i) => {
            const g = progAt(frame, 1.6 + i * 0.5, 1.2, EBACK);
            return (
              <div key={b.n} style={{ position: "absolute", bottom: 90, left: 60 + i * 230, width: 160, height: (b.v / 18) * 230 * g, background: b.c, borderRadius: "10px 10px 0 0" }}>
                <div style={{ position: "absolute", top: -64, left: 0, right: 0, textAlign: "center", fontSize: 54, fontWeight: 900, color: i ? K.sub : K.power }}>+{Math.round(b.v * Math.min(1, g))}%</div>
                <div style={{ position: "absolute", bottom: -42, left: -20, right: -20, textAlign: "center", fontSize: 24, fontWeight: 700, color: K.sub }}>{b.n}</div>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 30, right: 30, bottom: 16, fontSize: 19, color: K.muted, fontWeight: 600 }}>数据中心 2024 年用电 415 TWh，约占全球 1.5%</div>
        </Glass>
      </In>
      {/* right: PJM capacity price by delivery year */}
      <GridY box={box} ticks={[0, 100, 200, 300, 400]} sy={sy} fmt={(v) => `$${v}`} side="right" opacity={progAt(frame, 1, 1)} />
      <div style={{ position: "absolute", left: box.x, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>PJM 电网容量价 · 美元 / 兆瓦 · 天 · 按交付年</div>
      {PJM.map((p, i) => {
        const g = progAt(frame, 2.4 + i * 0.6, 1, EBACK);
        const x = box.x + i * bw + 14;
        return (
          <React.Fragment key={p.dy}>
            <div style={{ position: "absolute", left: x, top: sy(p.v * g), width: bw - 28, height: box.y + box.h - sy(p.v * g), background: p.cap ? `repeating-linear-gradient(135deg, ${K.power} 0 12px, ${K.power}bb 12px 20px)` : i < 2 ? `${K.power}66` : K.power, borderRadius: "8px 8px 0 0" }} />
            <div style={{ position: "absolute", left: x + (bw - 28) / 2, top: sy(p.v * g) - 44, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 28, fontWeight: 900, color: K.fg, opacity: progAt(frame, 2.8 + i * 0.6, 0.4), whiteSpace: "nowrap" }}>{p.v.toFixed(p.v < 100 ? 2 : 0)}</div>
            <div style={{ position: "absolute", left: x + (bw - 28) / 2, top: box.y + box.h + 10, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 21, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>{p.dy}</div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: box.x + 3 * bw, top: sy(329.17) - 4, width: 3 * bw, borderTop: `3px dashed ${K.red}`, opacity: progAt(frame, 5, 0.6) }} />
      <div style={{ position: "absolute", left: box.x + 3 * bw + 6, top: sy(329.17) - 92, fontFamily: FONT, fontSize: 22, fontWeight: 900, color: K.red, opacity: progAt(frame, 5, 0.6), whiteSpace: "nowrap" }}>连续三次撞上价格上限</div>
      <div style={{ position: "absolute", left: box.x + 20, top: box.y + 30 }}>
        <In at={4.4} from="scale">
          <Tag color={K.power} size={34}>
            28.92 → 329.17 · 约 11 倍
          </Tag>
        </In>
      </div>
      <div style={{ position: "absolute", left: 120, top: 880 }}>
        <In at={6.4} from="up">
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>2027/28 年新增的用电负荷里，近 5,100 兆瓦来自数据中心。</div>
        </In>
      </div>
      <Src>IEA 新闻稿 2026-04-16、《Energy and AI》2025 · PJM 容量拍卖结果 2022–2026（2027/28 若无上限为 529.80）</Src>
    </AbsoluteFill>
  );
};

// ───────── 03-2 Nuclear plants switched back on, on a real US map ─────────

const PLANTS = [
  { n: "三里岛 1 号机组", who: "微软", mw: "835 MW", d: "2024-09-20", lon: -76.725, lat: 40.153, dx: -20, dy: 60 },
  { n: "Susquehanna", who: "亚马逊", mw: "1,920 MW", d: "2025-06", lon: -76.146, lat: 41.089, dx: -170, dy: -150 },
  { n: "Clinton", who: "Meta", mw: "1,121 MW", d: "2025-06-03", lon: -88.834, lat: 40.172, dx: -330, dy: 60 },
  { n: "Duane Arnold", who: "谷歌", mw: "615 MW", d: "2025-10", lon: -91.777, lat: 42.101, dx: -300, dy: -110 },
];

export const Nuclear: React.FC = () => {
  const frame = useBeatFrame();
  const fills = Object.fromEntries(PJM_STATES.map((s) => [s, `${K.power}${progAt(frame, 0.6, 0.8) > 0.5 ? "44" : "22"}`]));
  return (
    <AbsoluteFill>
      <UsMap fills={fills} />
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["为了 AI，", { t: "关掉的核电站", c: K.power }, "重新开机。"]} />
      </div>
      <div style={{ position: "absolute", left: usProj(-90.5, 35.2)[0] - 40, top: usProj(-90.5, 35.2)[1], fontFamily: FONT, fontSize: 20, fontWeight: 700, color: K.power, opacity: progAt(frame, 0.8, 0.6), whiteSpace: "nowrap" }}>PJM 电网（覆盖 13 个州和华盛顿特区）</div>
      {PLANTS.map((p, i) => {
        const [x, y] = usProj(p.lon, p.lat);
        const q = progAt(frame, 1.2 + i * 0.7, 0.8, EBACK);
        return (
          <div key={p.n} style={{ position: "absolute", inset: 0, opacity: Math.min(1, q * 1.4) }}>
            <Tower x={x} y={y} on={progAt(frame, 1.5 + i * 0.7, 0.6)} s={0.8 + 0.2 * q} />
            <div style={{ position: "absolute", left: x + p.dx, top: y + p.dy, fontFamily: FONT, padding: "8px 14px", borderRadius: 10, background: "rgba(13,17,22,0.9)", border: `1.5px solid ${K.power}88`, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: K.fg }}>{p.n}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: K.power }}>
                {p.who} · {p.mw} · {p.d}
              </div>
            </div>
          </div>
        );
      })}
      <In at={4.4} from="flip" style={{ position: "absolute", left: 1270, top: 330 }}>
        <Glass glow={K.power} style={{ width: 550, padding: "24px 30px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>三里岛，又开机了</div>
          <div style={{ fontSize: 23, color: K.sub, fontWeight: 600, lineHeight: 1.55, marginTop: 10 }}>
            1979 年出事故的是 2 号机组。这次重启的是 1 号机组：2019 年因为亏钱关掉，微软签下 20 年的电，改名 Crane，目标 2027 年发电。
          </div>
        </Glass>
      </In>
      <In at={6.4} from="up" style={{ position: "absolute", left: 1270, top: 700 }}>
        <Glass style={{ width: 550, padding: "20px 30px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 22, color: K.sub, fontWeight: 700 }}>美国定下的核电目标</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: K.muted }}>约 100 GW</span>
            <span style={{ fontSize: 28, color: K.muted }}>→</span>
            <span style={{ fontSize: 56, fontWeight: 900, color: K.power }}>400 GW</span>
          </div>
          <div style={{ fontSize: 18, color: K.muted }}>2024 → 2050 · 总统行政令 14300（2025-05）</div>
        </Glass>
      </In>
      <Src>Constellation 2024-09-20、2025-06-03 · Talen 2025-06 · NextEra 2025-10 · 白宫行政令 14300 · 美国人口普查局州界（us-atlas）</Src>
    </AbsoluteFill>
  );
};

// A small cooling tower that lights up.
const Tower: React.FC<{ x: number; y: number; on: number; s?: number }> = ({ x, y, on, s = 1 }) => (
  <svg width={80} height={80} style={{ position: "absolute", left: x - 40 * s, top: y - 66 * s, overflow: "visible" }}>
    <g transform={`scale(${s})`}>
      <path d="M22,70 C30,50 30,30 24,12 L56,12 C50,30 50,50 58,70 Z" fill={on > 0.5 ? K.power : "#3a3f4a"} stroke={K.bg} strokeWidth={2} />
      {[0, 1, 2].map((k) => (
        <circle key={k} cx={34 + k * 8} cy={4 - on * 10 - k * 3} r={6 + k * 2} fill={K.fg} opacity={on * (0.35 - k * 0.08)} />
      ))}
      <circle cx={40} cy={74} r={5} fill={K.power} opacity={0.5 + 0.5 * on} />
    </g>
  </svg>
);

