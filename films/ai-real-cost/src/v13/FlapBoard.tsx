// Concept A: a split-flap price board, like an old exchange or airport board. Every change of the real price is a
// wave of flaps rattling over; a re-ranking is rows rewriting themselves in place.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT } from "../v10/theme";
import { Grain, useFonts, Vignette } from "../v12/noir";
import { byValue, clamp01, hash, Id, lerp, M, money, PRICE, ramp, rgba, TASK } from "./data";

const W = 56; // tile
const H = 80;
const GAP = 6;
const FS = 52;
const COLS = 23;
const FLIP = 0.055; // seconds per flap
const AMBER = "#ffb23e";
const INK = "#f1ede2";

const T = { sign: 0.3, names: 0.9, price1: 2.0, hi1: 3.7, msg1: 4.0, price2: 6.6, sort: 8.2, hi2: 9.5, msg2: 9.8 };

const ORDER1 = byValue(PRICE);
const ORDER2 = byValue(TASK);

const POOL_L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$.";
const POOL_C = "价格模型时间费用倍数单量包月你的真实一道题差距大到是";
const isCJK = (c: string) => /[　-鿿＀-￯]/.test(c);

const padLeft = (s: string[], n: number) => [...Array(Math.max(0, n - s.length)).fill(" "), ...s].slice(-n);
const padRight = (s: string[], n: number) => [...s, ...Array(Math.max(0, n - s.length)).fill(" ")].slice(0, n);
const center = (s: string[], n: number) => {
  const l = Math.floor((n - s.length) / 2);
  return padRight([...Array(Math.max(0, l)).fill(" "), ...s], n);
};

// the content of a row at each phase: [name 8][gap][price 6][gap][task 6], 22 tiles after the lamp
const rowTiles = (id: Id | null, withPrice: boolean, withTask: boolean) => {
  if (!id) return Array(22).fill(" ");
  const m = M.find((x) => x.id === id)!;
  return [
    ...padRight([...m.flap], 8),
    " ",
    ...padLeft(withPrice ? [...money(PRICE[id])] : [], 6),
    " ",
    ...padLeft(withTask ? [...money(TASK[id])] : [], 6),
  ];
};
const MSG1 = [..."CLAUDE", " ", "是", " ", ..."DEEPSEEK", " ", "的", " ", "1", "7", "倍"];
const MSG2 = center([..."差距拉大到", " ", "2", "3", " ", "倍"], COLS);

// every tile's list of changes (time, char)
type Change = { at: number; ch: string };
const rows: Change[][][] = Array.from({ length: 5 }, (_, r) =>
  Array.from({ length: 22 }, (_, c) => {
    const d = c * 0.022 + r * 0.06;
    const a = rowTiles(ORDER1[r].id, false, false);
    const b = rowTiles(ORDER1[r].id, true, false);
    const p = rowTiles(ORDER1[r].id, true, true);
    const s = rowTiles(ORDER2[r].id, true, true);
    return [
      { at: T.names + d, ch: a[c] },
      { at: T.price1 + d, ch: b[c] },
      { at: T.price2 + d, ch: p[c] },
      { at: T.sort + d, ch: s[c] },
    ];
  }),
);
const msg: Change[][] = Array.from({ length: COLS }, (_, c) => [
  { at: T.msg1 + c * 0.03, ch: padRight(MSG1, COLS)[c] },
  { at: T.msg2 + c * 0.03, ch: MSG2[c] },
]);

const charAt = (changes: Change[], t: number, seed: number) => {
  // returns [from, to, phase] while flipping, or [ch, ch, -1] at rest
  let prev = " ";
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const next = changes[i + 1];
    if (t < c.at) return [prev, prev, -1] as const;
    if (!next || t < next.at) {
      if (c.ch === prev) return [prev, prev, -1] as const;
      const n = 3 + Math.floor(hash(seed, i) * 5);
      const k = Math.floor((t - c.at) / FLIP);
      if (k >= n) return [c.ch, c.ch, -1] as const;
      const pool = isCJK(c.ch) || isCJK(prev) ? POOL_C : POOL_L;
      const mid = (j: number) => pool[Math.floor(hash(seed, i, j) * pool.length)];
      const from = k === 0 ? prev : mid(k - 1);
      const to = k === n - 1 ? c.ch : mid(k);
      return [from, to, ((t - c.at) % FLIP) / FLIP] as const;
    }
    prev = c.ch;
  }
  return [prev, prev, -1] as const;
};

const Half: React.FC<{ ch: string; top: boolean; color: string; style?: React.CSSProperties }> = ({ ch, top, color, style }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: top ? 0 : H / 2,
      width: W,
      height: H / 2,
      overflow: "hidden",
      borderRadius: top ? "5px 5px 0 0" : "0 0 5px 5px",
      background: top ? "linear-gradient(180deg, #2a2a2a, #222)" : "linear-gradient(180deg, #1c1c1c, #191919)",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : -H / 2,
        width: W,
        height: H,
        lineHeight: `${H}px`,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: isCJK(ch) ? 900 : 700,
        fontSize: isCJK(ch) ? FS - 6 : FS,
        color,
      }}
    >
      {ch === " " ? "" : ch}
    </div>
  </div>
);

export type { Change };
export const Tile: React.FC<{ x: number; y: number; changes: Change[]; t: number; seed: number; color: string }> = ({ x, y, changes, t, seed, color }) => {
  const [from, to, ph] = charAt(changes, t, seed);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, height: H, perspective: 420, boxShadow: "0 3px 6px rgba(0,0,0,0.6)", borderRadius: 5 }}>
      {/* static halves: the next top is already showing, the old bottom stays until the flap covers it */}
      <Half ch={ph < 0 ? to : to} top color={color} />
      <Half ch={ph < 0 ? to : from} top={false} color={color} />
      {ph >= 0 && ph < 0.5 && (
        <Half
          ch={from}
          top
          color={color}
          style={{ transformOrigin: "50% 100%", transform: `rotateX(${-180 * ph}deg)`, filter: `brightness(${1 - ph * 0.9})`, zIndex: 2 }}
        />
      )}
      {ph >= 0.5 && (
        <Half
          ch={to}
          top={false}
          color={color}
          style={{ transformOrigin: "50% 0%", transform: `rotateX(${180 * (1 - ph)}deg)`, filter: `brightness(${0.4 + (ph - 0.5) * 1.2})`, zIndex: 2 }}
        />
      )}
      {/* the hinge */}
      <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 - 1, height: 2, background: "#080808", zIndex: 3 }} />
    </div>
  );
};

const BOARD_W = COLS * (W + GAP) - GAP + 80;
const BX = (1920 - BOARD_W) / 2;
const ROW0 = 300;
const PITCH = H + 14;
const MSG_Y = ROW0 + 5 * PITCH + 34;
const colX = (c: number) => BX + 40 + c * (W + GAP);

export const FlapBoard: React.FC = () => {
  const frame = useCurrentFrame();
  useFonts([`700 52px ${FONT}`, `900 46px ${FONT}`, `900 66px ${FONT}`, `700 24px ${FONT}`, `500 19px ${FONT}`], POOL_C + POOL_L + "AI 的真实价格模型每百万 token做一道难题差距拉大到是的倍智谱价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月");
  const t = frame / 30;
  const sign = t < T.sign ? 0 : t < T.sign + 0.08 ? 0.6 : t < T.sign + 0.16 ? 0.1 : t < T.sign + 0.26 ? 0.9 : t < T.sign + 0.3 ? 0.3 : 1;
  const star = (id: Id) => id === "claude" || id === "deepseek";
  const hiOn = (t >= T.hi1 && t < T.price2) || t >= T.hi2;
  const order = t < T.sort + 0.3 ? ORDER1 : ORDER2;
  const head2 = ramp(t, T.price2 - 0.2, T.price2 + 0.3);
  const push = ramp(t, 0, 13.5, (v) => v);

  return (
    <AbsoluteFill style={{ background: "#0b0b0c", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.55} />
      {[T.names, T.price1, T.msg1, T.price2, T.sort, T.msg2].map((at, i) => (
        <Sequence key={i} from={Math.round(at * 30)} layout="none">
          <Audio src={staticFile("sfx/flaps.wav")} volume={0.75} />
        </Sequence>
      ))}
      <Sequence from={Math.round(T.sign * 30)} layout="none">
        <Audio src={staticFile("sfx/switch.wav")} volume={0.5} />
      </Sequence>

      {/* wall */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 40% 30%, #1d1b18 0%, #0d0d0e 60%, #070708 100%)" }} />

      <AbsoluteFill style={{ perspective: 2400 }}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `translateX(${lerp(50, -50, push)}px) rotateY(${lerp(-10, -6, push)}deg) rotateX(3deg) scale(${lerp(1.0, 1.07, push)})`,
          }}
        >
          {/* the sign */}
          <div
            style={{
              position: "absolute",
              left: 960,
              top: 150,
              transform: "translate(-50%, -50%)",
              padding: "18px 56px",
              borderRadius: 10,
              background: `rgba(30,28,24,${0.6 + 0.4 * sign})`,
              border: "2px solid #2c2a26",
              boxShadow: `0 0 ${60 * sign}px ${rgba("#fff3d6", 0.18 * sign)}, inset 0 0 30px rgba(0,0,0,0.6)`,
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 66, letterSpacing: "0.08em", color: rgba("#fff6e4", 0.15 + 0.85 * sign), textShadow: `0 0 ${24 * sign}px ${rgba("#ffe8b8", 0.7 * sign)}` }}>
              AI 的真实价格
            </div>
          </div>

          {/* the board */}
          <div
            style={{
              position: "absolute",
              left: BX,
              top: ROW0 - 70,
              width: BOARD_W,
              height: MSG_Y + H + 40 - (ROW0 - 70),
              borderRadius: 14,
              background: "linear-gradient(180deg, #151515, #0f0f0f)",
              border: "2px solid #242424",
              boxShadow: "0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          />
          {/* column heads, printed on the frame */}
          <Head x={colX(1)} label="模型" o={ramp(t, T.names - 0.3, T.names)} />
          <Head x={colX(10)} label="每百万 token" o={ramp(t, T.price1 - 0.3, T.price1)} />
          <Head x={colX(17)} label="做一道难题" o={head2} />
          <div style={{ position: "absolute", left: BX + 40, top: MSG_Y - 30, width: BOARD_W - 80, height: 1, background: "#262626" }} />

          {Array.from({ length: 5 }, (_, r) => {
            const id = order[r].id;
            const lit = hiOn && star(id);
            const y = ROW0 + r * PITCH;
            return (
              <React.Fragment key={r}>
                {/* lamp */}
                <div
                  style={{
                    position: "absolute",
                    left: colX(0) + W / 2 - 9,
                    top: y + H / 2 - 9,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: lit ? AMBER : "#2a2520",
                    boxShadow: lit ? `0 0 12px ${AMBER}, 0 0 34px ${rgba(AMBER, 0.6)}` : "inset 0 1px 2px rgba(0,0,0,0.8)",
                  }}
                />
                {rows[r].map((ch, c) => (
                  <Tile key={c} x={colX(c + 1)} y={y} changes={ch} t={t} seed={r * 100 + c} color={lit && c >= 9 ? AMBER : INK} />
                ))}
              </React.Fragment>
            );
          })}
          {msg.map((ch, c) => (
            <Tile key={c} x={colX(c)} y={MSG_Y} changes={ch} t={t} seed={900 + c} color={AMBER} />
          ))}

          {/* overhead light on the board */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 45% at 38% 30%, rgba(255,226,180,0.10), rgba(0,0,0,0) 70%)", mixBlendMode: "screen", pointerEvents: "none" }} />
        </AbsoluteFill>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 19, color: "#6f6c66", opacity: clamp01((t - 2.6) * 2) }}>
        价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月
      </div>
      <Vignette k={0.9} />
      <Grain frame={frame} amount={0.06} />
    </AbsoluteFill>
  );
};

const Head: React.FC<{ x: number; label: string; o: number }> = ({ x, label, o }) => (
  <div style={{ position: "absolute", left: x, top: ROW0 - 50, fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: "0.06em", color: "#9a958a", opacity: o, whiteSpace: "nowrap" }}>
    {label}
  </div>
);
