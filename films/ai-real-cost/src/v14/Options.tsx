// v14 options: every number gets a carrier whose length can be read at a glance, on a dark stage, and the carrier
// itself belongs to the topic of price. Five carriers: glass light columns, coin stacks, receipts, a flap board with
// LED level bars, and streams of light. Each composition holds lap 1 (list price) for frames 0–59 and lap 2 (one hard
// task) for 60–119, so stills can be compared; the morph between them comes after a pick.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONT, MONO } from "../v10/theme";
import { Grain, useFonts, Vignette } from "../v12/noir";
import { Change, Tile } from "../v13/FlapBoard";
import { hash, Id, M, money, PRICE, rgba, TASK } from "../v13/data";

const ORDER1 = [...M].sort((a, b) => PRICE[a.id] - PRICE[b.id]);
const ORDER2 = [...M].sort((a, b) => TASK[a.id] - TASK[b.id]);
const star = (id: Id) => id === "claude" || id === "deepseek";
const TXT =
  "每 100 万个 token 的价格（美元）做一道难题，实际花多少（美元）按单价，Claude 是 DeepSeek 的倍做一道难题，差距拉大到合计输出元智谱" +
  "价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月CLAUDECHATGPTKIMIDEEPSEEK$0123456789.";

type Lap = { lap2: boolean; order: typeof M; val: (id: Id) => number; norm: (id: Id) => number };
const useLap = (): Lap => {
  const f = useCurrentFrame();
  const lap2 = f >= 60;
  return {
    lap2,
    order: lap2 ? ORDER2 : ORDER1,
    val: (id) => (lap2 ? TASK[id] : PRICE[id]),
    norm: (id) => (lap2 ? TASK[id] / 5.98 : PRICE[id] / 50),
  };
};

const Captions: React.FC<{ lap: Lap; light?: boolean; top?: number }> = ({ lap, top = 70 }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#a9a59c", letterSpacing: "0.05em" }}>
      {lap.lap2 ? "做一道难题，实际花多少（美元）" : "每 100 万个 token 的价格（美元）"}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: top + 46, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 58, color: "#f4f1ea", whiteSpace: "nowrap" }}>
      {lap.lap2 ? "做一道难题，差距拉大到 " : "按单价，Claude 是 DeepSeek 的 "}
      <span style={{ color: "#ffb23e", fontSize: 76 }}>{lap.lap2 ? "23" : "17"}</span> 倍
    </div>
  </>
);
const Source: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 18, color: "#5d5b57" }}>
    价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月
  </div>
);
const Name: React.FC<{ m: (typeof M)[number]; size?: number; color?: string }> = ({ m, size = 30, color = "#f4f1ea" }) => (
  <span style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: m.name === "智谱" ? 900 : 700, fontSize: size, color }}>{m.name}</span>
);
const Shell: React.FC<{ children: React.ReactNode; bg: string }> = ({ children, bg }) => {
  const frame = useCurrentFrame();
  useFonts([`700 30px ${FONT}`, `900 58px ${FONT}`, `700 30px ${MONO}`, `500 18px ${FONT}`], TXT);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      {children}
      <Vignette k={0.85} />
      <Grain frame={frame} amount={0.05} />
    </AbsoluteFill>
  );
};

// ---------- 1. glass light columns on a mirror floor ----------
export const OptColumns: React.FC = () => {
  const lap = useLap();
  const FLOOR = 800;
  const MAXH = 470;
  const CW = 150;
  const GAP = 110;
  const X0 = (1920 - (5 * CW + 4 * GAP)) / 2;
  return (
    <Shell bg="radial-gradient(ellipse 90% 70% at 50% 35%, #12151c 0%, #07080b 70%)">
      {/* the floor */}
      <div style={{ position: "absolute", left: 0, right: 0, top: FLOOR, bottom: 0, background: "linear-gradient(180deg, #0d0f14 0%, #050608 70%)" }} />
      <div style={{ position: "absolute", left: 200, right: 200, top: FLOOR, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18), rgba(255,255,255,0))" }} />
      {lap.order.map((m, i) => {
        const h = Math.max(6, lap.norm(m.id) * MAXH);
        const x = X0 + i * (CW + GAP);
        const lv = star(m.id) ? 1 : 0.38;
        const body = `linear-gradient(90deg, ${rgba(m.color, 0.55)} 0%, ${rgba(m.color, 0.95)} 18%, ${rgba("#ffffff", 0.75)} 30%, ${rgba(m.color, 0.9)} 42%, ${rgba(m.color, 0.6)} 100%)`;
        return (
          <React.Fragment key={m.id}>
            {/* light pool on the floor */}
            <div style={{ position: "absolute", left: x - 90, top: FLOOR - 30, width: CW + 180, height: 120, background: `radial-gradient(ellipse 50% 40% at 50% 30%, ${rgba(m.color, 0.35 * lv)}, rgba(0,0,0,0) 70%)` }} />
            <div style={{ position: "absolute", left: x, top: FLOOR - h, width: CW, height: h, borderRadius: "8px 8px 2px 2px", background: body, opacity: lv, boxShadow: `0 0 40px ${rgba(m.color, 0.55 * lv)}, 0 0 120px ${rgba(m.color, 0.25 * lv)}` }} />
            {/* reflection */}
            <div style={{ position: "absolute", left: x, top: FLOOR + 2, width: CW, height: h * 0.6, background: body, opacity: 0.22 * lv, filter: "blur(3px)", WebkitMaskImage: "linear-gradient(180deg, #000, transparent)", maskImage: "linear-gradient(180deg, #000, transparent)" }} />
            <div style={{ position: "absolute", left: x - 40, width: CW + 80, top: FLOOR - h - 74, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 52, color: rgba("#ffffff", 0.35 + 0.65 * lv), textShadow: star(m.id) ? `0 0 20px ${rgba(m.color, 0.6)}` : undefined }}>
              {money(lap.val(m.id))}
            </div>
            <div style={{ position: "absolute", left: x - 60, width: CW + 120, top: FLOOR + 22, textAlign: "center", opacity: 0.4 + 0.6 * lv }}>
              <Name m={m} size={30} />
            </div>
          </React.Fragment>
        );
      })}
      <Captions lap={lap} />
      <Source />
    </Shell>
  );
};

// ---------- 2. coin stacks under a spotlight ----------
const Coins: React.FC<{ n: number; cx: number; base: number; lv: number; seed: number }> = ({ n, cx, base, lv, seed }) => {
  const RX = 70;
  const RY = 20;
  const TH = 9;
  const coins = Array.from({ length: n }, (_, i) => ({ dx: (hash(seed, i) - 0.5) * 5, y: base - i * TH }));
  const top = coins[coins.length - 1];
  const side = "linear-gradient(90deg, #5a3d0c 0%, #b8862b 18%, #ffe39a 34%, #c99632 52%, #8a611a 78%, #4d340a 100%)";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: lv }}>
      {coins.map((c, i) => (
        <div key={i} style={{ position: "absolute", left: cx - RX + c.dx, top: c.y - TH, width: RX * 2, height: TH + RY, borderRadius: `${RX}px / ${RY}px`, background: side, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.45)" }} />
      ))}
      {top && (
        <div style={{ position: "absolute", left: cx - RX + top.dx, top: top.y - TH - RY, width: RX * 2, height: RY * 2, borderRadius: "50%", background: "radial-gradient(ellipse 60% 60% at 40% 40%, #fff1c4 0%, #e8bd5c 40%, #a87822 100%)", boxShadow: "inset 0 0 0 4px rgba(120,80,20,0.6)" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: "rgba(110,72,14,0.8)", transform: "scaleY(0.6)" }}>$</div>
        </div>
      )}
    </div>
  );
};
export const OptCoins: React.FC = () => {
  const lap = useLap();
  const BASE = 820;
  const MAXN = 46;
  const GAPX = 300;
  const X0 = 960 - 2 * GAPX;
  return (
    <Shell bg="radial-gradient(ellipse 70% 60% at 50% 60%, #1b1610 0%, #0a0908 60%, #050505 100%)">
      <div style={{ position: "absolute", left: 0, right: 0, top: BASE - 10, bottom: 0, background: "linear-gradient(180deg, #120f0b, #060505)" }} />
      {lap.order.map((m, i) => {
        const n = Math.max(1, Math.round(lap.norm(m.id) * MAXN));
        const cx = X0 + i * GAPX;
        const lv = star(m.id) ? 1 : 0.42;
        const topY = BASE - n * 9 - 20;
        return (
          <React.Fragment key={m.id}>
            <div style={{ position: "absolute", left: cx - 160, top: BASE - 40, width: 320, height: 90, background: `radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,0,0,0.6), rgba(0,0,0,0) 70%)` }} />
            <div style={{ position: "absolute", left: cx - 150, top: 160, width: 300, height: BASE - 140, background: `radial-gradient(ellipse 45% 80% at 50% 100%, ${rgba("#ffd98a", 0.13 * lv)}, rgba(0,0,0,0) 70%)` }} />
            <Coins n={n} cx={cx} base={BASE} lv={lv} seed={i + 1} />
            <div style={{ position: "absolute", left: cx - 120, width: 240, top: topY - 82, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 52, color: rgba("#fff3d6", 0.35 + 0.65 * lv) }}>{money(lap.val(m.id))}</div>
            <div style={{ position: "absolute", left: cx - 120, width: 240, top: BASE + 40, textAlign: "center" }}>
              <span style={{ display: "inline-block", padding: "6px 18px", borderRadius: 6, background: star(m.id) ? rgba(m.color, 0.9) : "#2a2620", opacity: 0.5 + 0.5 * lv }}>
                <Name m={m} size={26} color="#fff" />
              </span>
            </div>
          </React.Fragment>
        );
      })}
      <Captions lap={lap} />
      <Source />
    </Shell>
  );
};

// ---------- 3. receipts hanging from a row of printers ----------
export const OptReceipts: React.FC = () => {
  const lap = useLap();
  const SLOT = 236;
  const MAXL = 560;
  const RW = 190;
  const GAPX = 320;
  const X0 = 960 - 2 * GAPX;
  return (
    <Shell bg="radial-gradient(ellipse 80% 70% at 50% 40%, #15130f 0%, #080807 70%)">
      {/* the printer bar */}
      <div style={{ position: "absolute", left: 120, right: 120, top: SLOT - 60, height: 60, borderRadius: 10, background: "linear-gradient(180deg, #2b2b2e, #18181a)", boxShadow: "0 12px 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)" }} />
      {lap.order.map((m, i) => {
        const L = Math.max(4, lap.norm(m.id) * MAXL);
        const cx = X0 + i * GAPX;
        const lv = star(m.id) ? 1 : 0.4;
        const teeth = Array.from({ length: 12 }, (_, k) => `${(k / 12) * 100 + 4}% ${k % 2 ? 100 : 94}%`).join(", ");
        const lines = Math.floor((L - 20) / 26);
        return (
          <React.Fragment key={m.id}>
            {/* spot */}
            <div style={{ position: "absolute", left: cx - 170, top: SLOT, width: 340, height: MAXL + 80, background: `radial-gradient(ellipse 50% 70% at 50% 20%, ${rgba("#fff2d6", 0.1 * lv)}, rgba(0,0,0,0) 70%)` }} />
            <div style={{ position: "absolute", left: cx - 72, top: SLOT - 44, width: 144, height: 28, borderRadius: 6, background: "#0b0b0c", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 + 0.4 * lv }}>
              <Name m={m} size={18} color={star(m.id) ? m.color : "#cfcac0"} />
            </div>
            <div style={{ position: "absolute", left: cx - RW / 2 - 6, top: SLOT - 8, width: RW + 12, height: 8, background: "#050505", borderRadius: 2 }} />
            <div
              style={{
                position: "absolute",
                left: cx - RW / 2,
                top: SLOT - 2,
                width: RW,
                height: L,
                background: "linear-gradient(90deg, #d9d3c6, #f4efe4 30%, #ece6da 70%, #cfc8ba)",
                clipPath: L > 30 ? `polygon(0 0, 100% 0, 100% 94%, ${teeth}, 0 94%)` : undefined,
                opacity: 0.35 + 0.65 * lv,
                boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
                padding: "12px 16px",
                overflow: "hidden",
              }}
            >
              {Array.from({ length: Math.max(0, lines) }, (_, k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 700, fontSize: 13, lineHeight: "26px", color: "rgba(40,36,30,0.55)" }}>
                  <span>{["输出 token", "推理 token", "工具调用", "缓存读取", "输入 token"][k % 5]}</span>
                  <span>{(hash(i, k) * 0.9 + 0.05).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", left: cx - 140, width: 280, top: SLOT + L + 16, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 50, color: rgba("#fff3e0", 0.35 + 0.65 * lv), textShadow: star(m.id) ? `0 0 18px ${rgba(m.color, 0.55)}` : undefined }}>
              {money(lap.val(m.id))}
            </div>
          </React.Fragment>
        );
      })}
      <Captions lap={lap} top={30} />
      <Source />
    </Shell>
  );
};

// ---------- 4. the flap board with LED level bars ----------
const still = (ch: string): Change[] => [{ at: -1, ch }];
export const OptBoard: React.FC = () => {
  const lap = useLap();
  const t = 99; // flaps at rest in these stills
  const W = 56;
  const G = 6;
  const SEGS = 34;
  const ROW0 = 330;
  const PITCH = 98;
  const BX = 150;
  return (
    <Shell bg="radial-gradient(ellipse 80% 70% at 40% 30%, #1d1b18 0%, #0d0d0e 60%, #070708 100%)">
      <div style={{ position: "absolute", left: BX - 40, top: ROW0 - 60, width: 1700, height: 5 * PITCH + 50, borderRadius: 14, background: "linear-gradient(180deg, #151515, #0f0f0f)", border: "2px solid #242424", boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }} />
      {lap.order.map((m, r) => {
        const y = ROW0 + r * PITCH;
        const name = [...m.flap, ...Array(8).fill(" ")].slice(0, 8);
        const v = [...Array(6).fill(" "), ...money(lap.val(m.id))].slice(-6);
        const lit = Math.max(1, Math.round(lap.norm(m.id) * SEGS));
        const on = star(m.id);
        const amber = on ? "#ffb23e" : "#c9b48c";
        return (
          <React.Fragment key={r}>
            {name.map((ch, c) => <Tile key={c} x={BX + c * (W + G)} y={y} changes={still(ch)} t={t} seed={r * 50 + c} color="#f1ede2" />)}
            {v.map((ch, c) => <Tile key={`v${c}`} x={BX + (9 + c) * (W + G)} y={y} changes={still(ch)} t={t} seed={r * 50 + 20 + c} color={on ? "#ffb23e" : "#f1ede2"} />)}
            {Array.from({ length: SEGS }, (_, k) => {
              const isOn = k < lit;
              return (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: BX + 15 * (W + G) + 30 + k * 18,
                    top: y + 18,
                    width: 13,
                    height: 44,
                    borderRadius: 2,
                    background: isOn ? amber : "#231d15",
                    opacity: isOn ? (on ? 1 : 0.55) : 1,
                    boxShadow: isOn && on ? `0 0 10px ${rgba(amber, 0.8)}, 0 0 24px ${rgba(amber, 0.35)}` : undefined,
                  }}
                />
              );
            })}
          </React.Fragment>
        );
      })}
      <Captions lap={lap} />
      <Source />
    </Shell>
  );
};

// ---------- 5. streams of light ----------
export const OptStreams: React.FC = () => {
  const lap = useLap();
  const f = useCurrentFrame();
  const X0 = 520;
  const MAXL = 1100;
  const ROW0 = 330;
  const PITCH = 112;
  return (
    <Shell bg="radial-gradient(ellipse 90% 80% at 30% 50%, #10131b 0%, #07080b 70%)">
      {/* faint axis ticks */}
      {Array.from({ length: 6 }, (_, k) => (
        <div key={k} style={{ position: "absolute", left: X0 + (k * MAXL) / 5, top: ROW0 - 40, width: 1, height: 5 * PITCH + 20, background: "rgba(255,255,255,0.05)" }} />
      ))}
      {lap.order.map((m, r) => {
        const y = ROW0 + r * PITCH;
        const L = Math.max(8, lap.norm(m.id) * MAXL);
        const lv = star(m.id) ? 1 : 0.35;
        return (
          <React.Fragment key={m.id}>
            <div style={{ position: "absolute", right: 1920 - X0 + 30, top: y + 2, textAlign: "right", opacity: 0.45 + 0.55 * lv }}>
              <Name m={m} size={34} />
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: "#7d8088" }}>{m.model}</div>
            </div>
            <div style={{ position: "absolute", left: X0 - 60, top: y - 40, width: L + 160, height: 130, background: `radial-gradient(ellipse 50% 50% at 70% 50%, ${rgba(m.color, 0.16 * lv)}, rgba(0,0,0,0) 70%)` }} />
            <div
              style={{
                position: "absolute",
                left: X0,
                top: y + 6,
                width: L,
                height: 40,
                borderRadius: 20,
                opacity: lv,
                background: `linear-gradient(90deg, ${rgba(m.color, 0.12)} 0%, ${rgba(m.color, 0.65)} 70%, ${rgba("#ffffff", 0.95)} 100%)`,
                boxShadow: `0 0 24px ${rgba(m.color, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
                overflow: "hidden",
              }}
            >
              {/* particles flowing along the bar */}
              {Array.from({ length: Math.floor(L / 14) }, (_, k) => {
                const x = ((hash(r, k) * L + f * (2 + hash(r, k, 2) * 4)) % L);
                return <div key={k} style={{ position: "absolute", left: x, top: 8 + hash(r, k, 3) * 22, width: 3, height: 3, borderRadius: 2, background: "#fff", opacity: 0.25 + 0.6 * (x / L) }} />;
              })}
            </div>
            <div style={{ position: "absolute", left: X0 + L + 26, top: y - 4, fontFamily: MONO, fontWeight: 700, fontSize: 50, color: rgba("#ffffff", 0.35 + 0.65 * lv), textShadow: star(m.id) ? `0 0 18px ${rgba(m.color, 0.6)}` : undefined }}>
              {money(lap.val(m.id))}
            </div>
          </React.Fragment>
        );
      })}
      <Captions lap={lap} />
      <Source />
    </Shell>
  );
};

export const OPTIONS: [string, React.FC][] = [
  ["Opt14-columns", OptColumns],
  ["Opt14-coins", OptCoins],
  ["Opt14-receipts", OptReceipts],
  ["Opt14-board", OptBoard],
  ["Opt14-streams", OptStreams],
];
